"""
Documents Router - Simplified RFP upload
Upload documents to S3, vectorization happens during analysis
"""

import os
from datetime import datetime
from io import BytesIO

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.database.client import db_client
from app.middleware.auth_middleware import AuthMiddleware
from app.utils.aws_session import get_aws_session
from app.utils.document_extraction import chunk_text

router = APIRouter(prefix="/api/proposals/{proposal_id}/documents", tags=["documents"])
security = HTTPBearer()
auth_middleware = AuthMiddleware()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """Get current user from token"""
    return auth_middleware.verify_token(credentials)


@router.post("/upload")
async def upload_document(
    proposal_id: str, file: UploadFile = File(...), user=Depends(get_current_user)
):
    """
    Upload RFP document to S3 - Simple and fast
    Vectorization will happen during the "Analyze & Continue" step
    """
    try:
        # Validate file
        if not file.filename or not file.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Only PDF files are supported")

        # Read file
        file_bytes = await file.read()
        file_size = len(file_bytes)

        if file_size == 0:
            raise HTTPException(status_code=400, detail="File is empty")

        if file_size > 10 * 1024 * 1024:  # 10MB limit
            raise HTTPException(
                status_code=400, detail="File size must be less than 10MB"
            )

        # Validate PDF format
        if not file_bytes.startswith(b"%PDF"):
            raise HTTPException(
                status_code=400, detail="File doesn't appear to be a valid PDF"
            )

        # Get proposal by ID (query by user to find the right proposal)
        all_proposals = await db_client.query_items(
            pk=f"USER#{user.get('user_id')}", index_name="GSI1"
        )

        proposal = None
        for p in all_proposals:
            if p.get("id") == proposal_id:
                proposal = p
                break

        if not proposal:
            raise HTTPException(status_code=404, detail="Proposal not found")

        proposal_code = proposal.get("proposalCode")

        # Upload to S3
        session = get_aws_session()
        s3_client = session.client("s3")
        bucket = os.environ.get("PROPOSALS_BUCKET")

        if not bucket:
            raise HTTPException(status_code=500, detail="S3 bucket not configured")

        s3_key = f"{proposal_code}/documents/rfp/{file.filename}"

        s3_client.put_object(
            Bucket=bucket,
            Key=s3_key,
            Body=BytesIO(file_bytes),
            ContentType="application/pdf",
            Metadata={
                "proposal-id": proposal_id,
                "uploaded-by": user.get("user_id"),
                "original-size": str(file_size),
            },
        )

        # Verify upload
        response = s3_client.head_object(Bucket=bucket, Key=s3_key)
        if response["ContentLength"] != file_size:
            raise HTTPException(status_code=500, detail="Upload verification failed")

        # Update proposal metadata
        await db_client.update_item(
            pk=f"PROPOSAL#{proposal_code}",
            sk="METADATA",
            update_expression="SET uploaded_files.#rfp = :files, updated_at = :updated",
            expression_attribute_names={"#rfp": "rfp-document"},
            expression_attribute_values={
                ":files": [file.filename],
                ":updated": datetime.utcnow().isoformat(),
            },
        )

        return {
            "success": True,
            "message": "PDF uploaded successfully",
            "filename": file.filename,
            "document_key": s3_key,
            "size": file_size,
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Upload error: {str(e)}")
        import traceback

        traceback.print_exc()
        raise HTTPException(
            status_code=500, detail=f"Failed to upload document: {str(e)}"
        )


@router.delete("/{filename}")
async def delete_document(
    proposal_id: str, filename: str, user=Depends(get_current_user)
):
    """Delete an uploaded RFP document"""
    try:
        print("\n🗑️ DELETE REQUEST:")
        print(f"  - Proposal ID: {proposal_id}")
        print(f"  - Filename: {filename}")
        print(f"  - User ID: {user.get('user_id')}")

        # Get proposal by ID (query by user to find the right proposal)
        all_proposals = await db_client.query_items(
            pk=f"USER#{user.get('user_id')}", index_name="GSI1"
        )

        print(f"  - Found {len(all_proposals)} proposals for user")

        proposal = None
        for p in all_proposals:
            if p.get("id") == proposal_id:
                proposal = p
                break

        if not proposal:
            print(f"❌ Proposal not found: {proposal_id}")
            raise HTTPException(status_code=404, detail="Proposal not found")

        proposal_code = proposal.get("proposalCode")
        print(f"  - Proposal Code: {proposal_code}")

        # Delete from S3
        session = get_aws_session()
        s3_client = session.client("s3")
        bucket = os.environ.get("PROPOSALS_BUCKET")

        s3_key = f"{proposal_code}/documents/rfp/{filename}"
        print(f"  - S3 Bucket: {bucket}")
        print(f"  - S3 Key: {s3_key}")

        # Try to delete from S3
        try:
            s3_client.delete_object(Bucket=bucket, Key=s3_key)
            print(f"✅ Deleted from S3: {s3_key}")
        except Exception as s3_error:
            print(f"❌ S3 Delete Error: {str(s3_error)}")
            raise

        # Update proposal metadata - remove file AND clear RFP analysis
        print("  - Updating DynamoDB...")
        await db_client.update_item(
            pk=f"PROPOSAL#{proposal_code}",
            sk="METADATA",
            update_expression="REMOVE uploaded_files.#rfp, rfp_analysis, analysis_status_rfp, rfp_analysis_started_at, rfp_analysis_completed_at, rfp_analysis_error SET updated_at = :updated",
            expression_attribute_names={"#rfp": "rfp-document"},
            expression_attribute_values={":updated": datetime.utcnow().isoformat()},
        )
        print("✅ Updated DynamoDB")

        print("✅ DELETE SUCCESSFUL\n")

        return {"success": True, "message": "Document deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Delete error: {str(e)}")
        import traceback

        traceback.print_exc()
        raise HTTPException(
            status_code=500, detail=f"Failed to delete document: {str(e)}"
        )


@router.post("/upload-concept-file")
async def upload_concept_file(
    proposal_id: str, file: UploadFile = File(...), user=Depends(get_current_user)
):
    """Upload Initial Concept file (PDF/DOC/DOCX)"""
    try:
        # Validate file
        allowed_extensions = (".pdf", ".doc", ".docx")
        if not file.filename or not file.filename.lower().endswith(allowed_extensions):
            raise HTTPException(
                status_code=400, detail="Only PDF, DOC, and DOCX files are supported"
            )

        # Read file
        file_bytes = await file.read()
        file_size = len(file_bytes)

        if file_size == 0:
            raise HTTPException(status_code=400, detail="File is empty")

        if file_size > 10 * 1024 * 1024:  # 10MB limit
            raise HTTPException(
                status_code=400, detail="File size must be less than 10MB"
            )

        # Get proposal
        all_proposals = await db_client.query_items(
            pk=f"USER#{user.get('user_id')}", index_name="GSI1"
        )

        proposal = None
        for p in all_proposals:
            if p.get("id") == proposal_id:
                proposal = p
                break

        if not proposal:
            raise HTTPException(status_code=404, detail="Proposal not found")

        proposal_code = proposal.get("proposalCode")

        # Upload to S3
        session = get_aws_session()
        s3_client = session.client("s3")
        bucket = os.environ.get("PROPOSALS_BUCKET")

        if not bucket:
            raise HTTPException(status_code=500, detail="S3 bucket not configured")

        s3_key = f"{proposal_code}/documents/initial_concept/{file.filename}"

        s3_client.put_object(
            Bucket=bucket,
            Key=s3_key,
            Body=BytesIO(file_bytes),
            ContentType=file.content_type or "application/octet-stream",
            Metadata={
                "proposal-id": proposal_id,
                "uploaded-by": user.get("user_id"),
                "original-size": str(file_size),
            },
        )

        return {
            "success": True,
            "message": "Concept file uploaded successfully",
            "filename": file.filename,
            "document_key": s3_key,
            "size": file_size,
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Upload concept file error: {str(e)}")
        import traceback

        traceback.print_exc()
        raise HTTPException(
            status_code=500, detail=f"Failed to upload concept file: {str(e)}"
        )


@router.post("/save-concept-text")
async def save_concept_text(
    proposal_id: str, concept_text: str = Form(...), user=Depends(get_current_user)
):
    """Save Initial Concept as text"""
    try:
        if len(concept_text.strip()) < 50:
            raise HTTPException(
                status_code=400, detail="Concept text must be at least 50 characters"
            )

        # Get proposal
        all_proposals = await db_client.query_items(
            pk=f"USER#{user.get('user_id')}", index_name="GSI1"
        )

        proposal = None
        for p in all_proposals:
            if p.get("id") == proposal_id:
                proposal = p
                break

        if not proposal:
            raise HTTPException(status_code=404, detail="Proposal not found")

        proposal_code = proposal.get("proposalCode")

        # Save to S3
        session = get_aws_session()
        s3_client = session.client("s3")
        bucket = os.environ.get("PROPOSALS_BUCKET")

        if not bucket:
            raise HTTPException(status_code=500, detail="S3 bucket not configured")

        s3_key = f"{proposal_code}/documents/initial_concept/concept_text.txt"

        s3_client.put_object(
            Bucket=bucket,
            Key=s3_key,
            Body=concept_text.encode("utf-8"),
            ContentType="text/plain",
            Metadata={"proposal-id": proposal_id, "uploaded-by": user.get("user_id")},
        )

        return {
            "success": True,
            "message": "Concept text saved successfully",
            "text_length": len(concept_text),
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Save concept text error: {str(e)}")
        import traceback

        traceback.print_exc()
        raise HTTPException(
            status_code=500, detail=f"Failed to save concept text: {str(e)}"
        )


@router.get("")
async def get_uploaded_documents(proposal_id: str, user=Depends(get_current_user)):
    """Get list of all uploaded documents for a proposal"""
    try:
        # Get proposal
        all_proposals = await db_client.query_items(
            pk=f"USER#{user.get('user_id')}", index_name="GSI1"
        )

        proposal = None
        for p in all_proposals:
            if p.get("id") == proposal_id:
                proposal = p
                break

        if not proposal:
            raise HTTPException(status_code=404, detail="Proposal not found")

        proposal_code = proposal.get("proposalCode")

        # List documents from S3
        session = get_aws_session()
        s3_client = session.client("s3")
        bucket = os.environ.get("PROPOSALS_BUCKET")

        if not bucket:
            raise HTTPException(status_code=500, detail="S3 bucket not configured")

        # List documents in different folders
        folders = {
            "rfp_documents": f"{proposal_code}/documents/rfp/",
            "concept_documents": f"{proposal_code}/documents/initial_concept/",
            "reference_documents": f"{proposal_code}/documents/references/",
            "supporting_documents": f"{proposal_code}/documents/supporting/",
        }

        result = {
            "rfp_documents": [],
            "concept_documents": [],
            "reference_documents": [],
            "supporting_documents": [],
        }

        for doc_type, prefix in folders.items():
            try:
                response = s3_client.list_objects_v2(Bucket=bucket, Prefix=prefix)

                if "Contents" in response:
                    for obj in response["Contents"]:
                        # Extract filename from key
                        filename = obj["Key"].split("/")[-1]
                        if filename:  # Skip if it's just the folder
                            result[doc_type].append(filename)
            except Exception as e:
                print(f"Error listing {doc_type}: {str(e)}")
                # Continue with other folders even if one fails

        return result

    except HTTPException:
        raise
    except Exception as e:
        print(f"Get documents error: {str(e)}")
        import traceback

        traceback.print_exc()
        raise HTTPException(
            status_code=500, detail=f"Failed to get documents: {str(e)}"
        )


@router.delete("/concept-text")
async def delete_concept_text(proposal_id: str, user=Depends(get_current_user)):
    """Delete concept text file"""
    try:
        # Get proposal
        all_proposals = await db_client.query_items(
            pk=f"USER#{user.get('user_id')}", index_name="GSI1"
        )

        proposal = None
        for p in all_proposals:
            if p.get("id") == proposal_id:
                proposal = p
                break

        if not proposal:
            raise HTTPException(status_code=404, detail="Proposal not found")

        proposal_code = proposal.get("proposalCode")

        # Delete from S3
        session = get_aws_session()
        s3_client = session.client("s3")
        bucket = os.environ.get("PROPOSALS_BUCKET")

        s3_key = f"{proposal_code}/documents/initial_concept/concept_text.txt"

        try:
            s3_client.delete_object(Bucket=bucket, Key=s3_key)
        except Exception as s3_error:
            print(f"S3 Delete Error: {str(s3_error)}")
            raise

        return {"success": True, "message": "Concept text deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        print(f"Delete concept text error: {str(e)}")
        import traceback

        traceback.print_exc()
        raise HTTPException(
            status_code=500, detail=f"Failed to delete concept text: {str(e)}"
        )


@router.delete("/concept/{filename}")
async def delete_concept_file(
    proposal_id: str, filename: str, user=Depends(get_current_user)
):
    """Delete a concept file"""
    try:
        # Get proposal
        all_proposals = await db_client.query_items(
            pk=f"USER#{user.get('user_id')}", index_name="GSI1"
        )

        proposal = None
        for p in all_proposals:
            if p.get("id") == proposal_id:
                proposal = p
                break

        if not proposal:
            raise HTTPException(status_code=404, detail="Proposal not found")

        proposal_code = proposal.get("proposalCode")

        # Delete from S3
        session = get_aws_session()
        s3_client = session.client("s3")
        bucket = os.environ.get("PROPOSALS_BUCKET")

        s3_key = f"{proposal_code}/documents/initial_concept/{filename}"

        try:
            s3_client.delete_object(Bucket=bucket, Key=s3_key)
        except Exception as s3_error:
            print(f"S3 Delete Error: {str(s3_error)}")
            raise

        return {"success": True, "message": "Concept file deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        print(f"Delete concept file error: {str(e)}")
        import traceback

        traceback.print_exc()
        raise HTTPException(
            status_code=500, detail=f"Failed to delete concept file: {str(e)}"
        )


@router.post("/upload-reference-file")
async def upload_reference_file(
    proposal_id: str,
    file: UploadFile = File(...),
    donor: str = Form(default=""),
    sector: str = Form(default=""),
    year: str = Form(default=""),
    status: str = Form(default=""),
    user=Depends(get_current_user),
):
    """
    Upload reference proposal and trigger async vectorization.

    Process:
    1. Validate and upload file to S3 (fast)
    2. Update DynamoDB with file info and "vectorizing" status
    3. Trigger Lambda worker for async vectorization
    4. Return immediately - client polls for vectorization status
    """
    try:
        # Validate file
        allowed_extensions = (".pdf", ".docx")
        if not file.filename or not file.filename.lower().endswith(allowed_extensions):
            raise HTTPException(
                status_code=400, detail="Only PDF and DOCX files are supported"
            )

        # Read file
        file_bytes = await file.read()
        file_size = len(file_bytes)

        if file_size == 0:
            raise HTTPException(status_code=400, detail="File is empty")

        if file_size > 5 * 1024 * 1024:  # 5MB limit (increased from 2MB)
            raise HTTPException(
                status_code=400, detail="File size must be less than 5MB"
            )

        # Get proposal
        all_proposals = await db_client.query_items(
            pk=f"USER#{user.get('user_id')}", index_name="GSI1"
        )

        proposal = None
        for p in all_proposals:
            if p.get("id") == proposal_id:
                proposal = p
                break

        if not proposal:
            raise HTTPException(status_code=404, detail="Proposal not found")

        proposal_code = proposal.get("proposalCode")

        # Upload to S3 (fast operation)
        session = get_aws_session()
        s3_client = session.client("s3")
        bucket = os.environ.get("PROPOSALS_BUCKET")

        if not bucket:
            raise HTTPException(status_code=500, detail="S3 bucket not configured")

        s3_key = f"{proposal_code}/documents/references/{file.filename}"

        print(f"📤 Uploading {file.filename} to S3...")
        s3_client.put_object(
            Bucket=bucket,
            Key=s3_key,
            Body=BytesIO(file_bytes),
            ContentType=file.content_type or "application/octet-stream",
            Metadata={
                "proposal-id": proposal_id,
                "uploaded-by": user.get("user_id"),
                "original-size": str(file_size),
                "donor": donor,
                "sector": sector,
                "year": year,
                "status": status,
            },
        )
        print(f"✅ File uploaded to S3: {s3_key}")

        # Update DynamoDB with file info and vectorization status
        current_files = proposal.get("uploaded_files", {}).get(
            "reference-proposals", []
        )
        updated_files = current_files + [file.filename]

        # Initialize vectorization_status map if not exists
        vectorization_status = proposal.get("vectorization_status", {})
        vectorization_status[file.filename] = {
            "status": "pending",
            "started_at": datetime.utcnow().isoformat(),
            "chunks_processed": 0,
            "total_chunks": 0,
        }

        await db_client.update_item(
            pk=f"PROPOSAL#{proposal_code}",
            sk="METADATA",
            update_expression="SET uploaded_files.#ref = :files, vectorization_status = :vec_status, updated_at = :updated",
            expression_attribute_names={"#ref": "reference-proposals"},
            expression_attribute_values={
                ":files": updated_files,
                ":vec_status": vectorization_status,
                ":updated": datetime.utcnow().isoformat(),
            },
        )
        print("✅ DynamoDB updated with file info")

        # Trigger async vectorization via Lambda
        import json

        import boto3

        lambda_client = boto3.client("lambda")

        worker_event = {
            "proposal_id": proposal_id,
            "proposal_code": proposal_code,
            "analysis_type": "vectorize_document",
            "document_type": "reference",
            "filename": file.filename,
            "s3_key": s3_key,
            "metadata": {
                "donor": donor,
                "sector": sector,
                "year": year,
                "status": status,
            },
        }

        lambda_function_name = os.environ.get(
            "WORKER_FUNCTION_NAME", "proposal-writer-worker"
        )
        print(f"🚀 Triggering async vectorization: {lambda_function_name}")

        lambda_client.invoke(
            FunctionName=lambda_function_name,
            InvocationType="Event",  # Async invocation
            Payload=json.dumps(worker_event),
        )
        print("✅ Lambda invoked asynchronously for vectorization")

        return {
            "success": True,
            "message": "Reference proposal uploaded, vectorization in progress",
            "filename": file.filename,
            "document_key": s3_key,
            "size": file_size,
            "vectorization_status": "pending",
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Upload reference file error: {str(e)}")
        import traceback

        traceback.print_exc()
        raise HTTPException(
            status_code=500, detail=f"Failed to upload reference file: {str(e)}"
        )


@router.delete("/reference/{filename}")
async def delete_reference_file(
    proposal_id: str, filename: str, user=Depends(get_current_user)
):
    """Delete a reference proposal file"""
    try:
        # Get proposal
        all_proposals = await db_client.query_items(
            pk=f"USER#{user.get('user_id')}", index_name="GSI1"
        )

        proposal = None
        for p in all_proposals:
            if p.get("id") == proposal_id:
                proposal = p
                break

        if not proposal:
            raise HTTPException(status_code=404, detail="Proposal not found")

        proposal_code = proposal.get("proposalCode")

        # Delete from S3
        session = get_aws_session()
        s3_client = session.client("s3")
        bucket = os.environ.get("PROPOSALS_BUCKET")

        s3_key = f"{proposal_code}/documents/references/{filename}"

        try:
            s3_client.delete_object(Bucket=bucket, Key=s3_key)
        except Exception as s3_error:
            print(f"S3 Delete Error: {str(s3_error)}")
            raise

        # Delete from S3 Vectors
        print(f"Deleting vectors for document: {filename}")
        from app.shared.vectors.service import VectorEmbeddingsService

        vector_service = VectorEmbeddingsService()

        vector_deleted = vector_service.delete_vectors_by_document_name(
            document_name=filename, index_name="reference-proposals-index"
        )

        if not vector_deleted:
            print(f"Warning: Failed to delete vectors for {filename}")

        # Update DynamoDB
        current_files = proposal.get("uploaded_files", {}).get(
            "reference-proposals", []
        )
        updated_files = [f for f in current_files if f != filename]

        await db_client.update_item(
            pk=f"PROPOSAL#{proposal_code}",
            sk="METADATA",
            update_expression="SET uploaded_files.#ref = :files, updated_at = :updated",
            expression_attribute_names={"#ref": "reference-proposals"},
            expression_attribute_values={
                ":files": updated_files,
                ":updated": datetime.utcnow().isoformat(),
            },
        )

        return {"success": True, "message": "Reference file deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        print(f"Delete reference file error: {str(e)}")
        import traceback

        traceback.print_exc()
        raise HTTPException(
            status_code=500, detail=f"Failed to delete reference file: {str(e)}"
        )


@router.post("/upload-supporting-file")
async def upload_supporting_file(
    proposal_id: str,
    file: UploadFile = File(...),
    organization: str = Form(default=""),
    project_type: str = Form(default=""),
    region: str = Form(default=""),
    user=Depends(get_current_user),
):
    """
    Upload supporting document (existing work) and trigger async vectorization.

    Process:
    1. Validate and upload file to S3 (fast)
    2. Update DynamoDB with file info and "vectorizing" status
    3. Trigger Lambda worker for async vectorization
    4. Return immediately - client polls for vectorization status
    """
    try:
        # Validate file
        allowed_extensions = (".pdf", ".docx")
        if not file.filename or not file.filename.lower().endswith(allowed_extensions):
            raise HTTPException(
                status_code=400, detail="Only PDF and DOCX files are supported"
            )

        # Read file
        file_bytes = await file.read()
        file_size = len(file_bytes)

        if file_size == 0:
            raise HTTPException(status_code=400, detail="File is empty")

        if file_size > 5 * 1024 * 1024:  # 5MB limit (increased from 2MB)
            raise HTTPException(
                status_code=400, detail="File size must be less than 5MB"
            )

        # Get proposal
        all_proposals = await db_client.query_items(
            pk=f"USER#{user.get('user_id')}", index_name="GSI1"
        )

        proposal = None
        for p in all_proposals:
            if p.get("id") == proposal_id:
                proposal = p
                break

        if not proposal:
            raise HTTPException(status_code=404, detail="Proposal not found")

        proposal_code = proposal.get("proposalCode")

        # Upload to S3 (fast operation)
        session = get_aws_session()
        s3_client = session.client("s3")
        bucket = os.environ.get("PROPOSALS_BUCKET")

        if not bucket:
            raise HTTPException(status_code=500, detail="S3 bucket not configured")

        s3_key = f"{proposal_code}/documents/supporting/{file.filename}"

        print(f"📤 Uploading {file.filename} to S3...")
        s3_client.put_object(
            Bucket=bucket,
            Key=s3_key,
            Body=BytesIO(file_bytes),
            ContentType=file.content_type or "application/octet-stream",
            Metadata={
                "proposal-id": proposal_id,
                "uploaded-by": user.get("user_id"),
                "original-size": str(file_size),
                "organization": organization,
                "project-type": project_type,
                "region": region,
            },
        )
        print(f"✅ File uploaded to S3: {s3_key}")

        # Update DynamoDB with file info and vectorization status
        current_files = proposal.get("uploaded_files", {}).get("supporting-docs", [])
        updated_files = current_files + [file.filename]

        # Initialize vectorization_status map if not exists
        vectorization_status = proposal.get("vectorization_status", {})
        vectorization_status[file.filename] = {
            "status": "pending",
            "started_at": datetime.utcnow().isoformat(),
            "chunks_processed": 0,
            "total_chunks": 0,
        }

        await db_client.update_item(
            pk=f"PROPOSAL#{proposal_code}",
            sk="METADATA",
            update_expression="SET uploaded_files.#sup = :files, vectorization_status = :vec_status, updated_at = :updated",
            expression_attribute_names={"#sup": "supporting-docs"},
            expression_attribute_values={
                ":files": updated_files,
                ":vec_status": vectorization_status,
                ":updated": datetime.utcnow().isoformat(),
            },
        )
        print("✅ DynamoDB updated with file info")

        # Trigger async vectorization via Lambda
        import json

        import boto3

        lambda_client = boto3.client("lambda")

        worker_event = {
            "proposal_id": proposal_id,
            "proposal_code": proposal_code,
            "analysis_type": "vectorize_document",
            "document_type": "supporting",
            "filename": file.filename,
            "s3_key": s3_key,
            "metadata": {
                "organization": organization,
                "project_type": project_type,
                "region": region,
            },
        }

        lambda_function_name = os.environ.get(
            "WORKER_FUNCTION_NAME", "proposal-writer-worker"
        )
        print(f"🚀 Triggering async vectorization: {lambda_function_name}")

        lambda_client.invoke(
            FunctionName=lambda_function_name,
            InvocationType="Event",  # Async invocation
            Payload=json.dumps(worker_event),
        )
        print("✅ Lambda invoked asynchronously for vectorization")

        return {
            "success": True,
            "message": "Supporting document uploaded, vectorization in progress",
            "filename": file.filename,
            "document_key": s3_key,
            "size": file_size,
            "vectorization_status": "pending",
            "metadata": {
                "organization": organization,
                "project_type": project_type,
                "region": region,
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Upload supporting file error: {str(e)}")
        import traceback

        traceback.print_exc()
        raise HTTPException(
            status_code=500, detail=f"Failed to upload supporting file: {str(e)}"
        )


@router.delete("/supporting/{filename}")
async def delete_supporting_file(
    proposal_id: str, filename: str, user=Depends(get_current_user)
):
    """
    Delete a supporting document file and its vectors.

    Process:
    1. Delete from S3
    2. Delete all associated vectors from existing-work-index
    3. Update DynamoDB uploaded_files.supporting-docs
    """
    try:
        # Get proposal
        all_proposals = await db_client.query_items(
            pk=f"USER#{user.get('user_id')}", index_name="GSI1"
        )

        proposal = None
        for p in all_proposals:
            if p.get("id") == proposal_id:
                proposal = p
                break

        if not proposal:
            raise HTTPException(status_code=404, detail="Proposal not found")

        proposal_code = proposal.get("proposalCode")

        # Delete from S3
        session = get_aws_session()
        s3_client = session.client("s3")
        bucket = os.environ.get("PROPOSALS_BUCKET")

        s3_key = f"{proposal_code}/documents/supporting/{filename}"

        try:
            s3_client.delete_object(Bucket=bucket, Key=s3_key)
        except Exception as s3_error:
            print(f"S3 Delete Error: {str(s3_error)}")
            raise

        # Delete vectors from existing-work-index
        from app.shared.vectors.service import VectorEmbeddingsService

        vector_service = VectorEmbeddingsService()

        try:
            vector_success = vector_service.delete_vectors_by_document_name(
                document_name=filename, index_name="existing-work-index"
            )
            if vector_success:
                print(f"✅ Deleted vectors for {filename} from existing-work-index")
            else:
                print(f"⚠️  No vectors found for {filename}")
        except Exception as vector_error:
            print(f"⚠️  Vector deletion error (non-critical): {str(vector_error)}")

        # Update DynamoDB
        current_files = proposal.get("uploaded_files", {}).get("supporting-docs", [])
        updated_files = [f for f in current_files if f != filename]

        await db_client.update_item(
            pk=f"PROPOSAL#{proposal_code}",
            sk="METADATA",
            update_expression="SET uploaded_files.#sup = :files, updated_at = :updated",
            expression_attribute_names={"#sup": "supporting-docs"},
            expression_attribute_values={
                ":files": updated_files,
                ":updated": datetime.utcnow().isoformat(),
            },
        )

        return {
            "success": True,
            "message": "Supporting file and vectors deleted successfully",
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Delete supporting file error: {str(e)}")
        import traceback

        traceback.print_exc()
        raise HTTPException(
            status_code=500, detail=f"Failed to delete supporting file: {str(e)}"
        )


@router.get("/vectorization-status")
async def get_vectorization_status(proposal_id: str, user=Depends(get_current_user)):
    """
    Get vectorization status for all files in a proposal.

    Returns:
        {
            "vectorization_status": {
                "filename.pdf": {
                    "status": "completed" | "processing" | "failed" | "pending",
                    "chunks_processed": 10,
                    "total_chunks": 15,
                    "error": "..." (if failed)
                },
                ...
            },
            "all_completed": true | false,
            "has_pending": true | false
        }
    """
    try:
        # Get proposal
        all_proposals = await db_client.query_items(
            pk=f"USER#{user.get('user_id')}", index_name="GSI1"
        )

        proposal = None
        for p in all_proposals:
            if p.get("id") == proposal_id:
                proposal = p
                break

        if not proposal:
            raise HTTPException(status_code=404, detail="Proposal not found")

        vectorization_status = proposal.get("vectorization_status", {})

        # Calculate aggregate status
        all_completed = True
        has_pending = False
        has_failed = False

        for filename, file_status in vectorization_status.items():
            status = file_status.get("status", "unknown")
            if status in ["pending", "processing"]:
                all_completed = False
                has_pending = True
            elif status == "failed":
                has_failed = True

        return {
            "success": True,
            "vectorization_status": vectorization_status,
            "all_completed": all_completed,
            "has_pending": has_pending,
            "has_failed": has_failed,
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Get vectorization status error: {str(e)}")
        import traceback

        traceback.print_exc()
        raise HTTPException(
            status_code=500, detail=f"Failed to get vectorization status: {str(e)}"
        )


@router.get("/vectorization-status/{filename}")
async def get_file_vectorization_status(
    proposal_id: str, filename: str, user=Depends(get_current_user)
):
    """
    Get vectorization status for a specific file.

    Returns:
        {
            "filename": "document.pdf",
            "status": "completed" | "processing" | "failed" | "pending",
            "chunks_processed": 10,
            "total_chunks": 15,
            "error": "..." (if failed)
        }
    """
    try:
        # Get proposal
        all_proposals = await db_client.query_items(
            pk=f"USER#{user.get('user_id')}", index_name="GSI1"
        )

        proposal = None
        for p in all_proposals:
            if p.get("id") == proposal_id:
                proposal = p
                break

        if not proposal:
            raise HTTPException(status_code=404, detail="Proposal not found")

        vectorization_status = proposal.get("vectorization_status", {})
        file_status = vectorization_status.get(filename)

        if not file_status:
            return {
                "success": True,
                "filename": filename,
                "status": "unknown",
                "message": "No vectorization status found for this file",
            }

        return {"success": True, "filename": filename, **file_status}

    except HTTPException:
        raise
    except Exception as e:
        print(f"Get file vectorization status error: {str(e)}")
        import traceback

        traceback.print_exc()
        raise HTTPException(
            status_code=500, detail=f"Failed to get file vectorization status: {str(e)}"
        )


@router.post("/save-work-text")
async def save_work_text(
    proposal_id: str,
    work_text: str = Form(...),
    organization: str = Form(default=""),
    project_type: str = Form(default=""),
    region: str = Form(default=""),
    user=Depends(get_current_user),
):
    """Save existing work text and store as vectors"""
    try:
        if len(work_text.strip()) < 50:
            raise HTTPException(
                status_code=400, detail="Work text must be at least 50 characters"
            )

        # Get proposal
        all_proposals = await db_client.query_items(
            pk=f"USER#{user.get('user_id')}", index_name="GSI1"
        )

        proposal = None
        for p in all_proposals:
            if p.get("id") == proposal_id:
                proposal = p
                break

        if not proposal:
            raise HTTPException(status_code=404, detail="Proposal not found")

        proposal_code = proposal.get("proposalCode")

        # Save to S3 as text file
        session = get_aws_session()
        s3_client = session.client("s3")
        bucket = os.environ.get("PROPOSALS_BUCKET")

        if not bucket:
            raise HTTPException(status_code=500, detail="S3 bucket not configured")

        s3_key = f"{proposal_code}/documents/supporting/existing_work_text.txt"

        s3_client.put_object(
            Bucket=bucket,
            Key=s3_key,
            Body=work_text.encode("utf-8"),
            ContentType="text/plain",
            Metadata={
                "proposal-id": proposal_id,
                "uploaded-by": user.get("user_id"),
                "organization": organization,
                "project_type": project_type,
                "region": region,
            },
        )

        # Chunk text if it's too long (>1000 chars)
        text_chunks = chunk_text(work_text, chunk_size=1000, overlap=200)
        print(f"Created {len(text_chunks)} chunks for work text")

        # Store in S3 Vectors (each chunk as separate vector)
        from app.shared.vectors.service import VectorEmbeddingsService

        vector_service = VectorEmbeddingsService()

        vector_result = True
        for idx, chunk in enumerate(text_chunks):
            chunk_metadata = {
                "organization": organization,
                "project_type": project_type,
                "region": region,
                "document_name": "existing_work_text",
                "chunk_index": str(idx),
                "total_chunks": str(len(text_chunks)),
            }

            result = vector_service.insert_existing_work(
                proposal_id=f"{proposal_id}-work-chunk-{idx}",
                text=chunk,
                metadata=chunk_metadata,
            )

            if not result:
                vector_result = False
                print(f"Warning: Vector storage failed for work text chunk {idx}")

        if not vector_result:
            print("Warning: Vector storage failed for work text")

        # Update DynamoDB text_inputs
        await db_client.update_item(
            pk=f"PROPOSAL#{proposal_code}",
            sk="METADATA",
            update_expression="SET text_inputs.#work = :text, updated_at = :updated",
            expression_attribute_names={"#work": "existing-work"},
            expression_attribute_values={
                ":text": work_text,
                ":updated": datetime.utcnow().isoformat(),
            },
        )

        return {
            "success": True,
            "message": "Work text saved successfully",
            "text_length": len(work_text),
            "vectorized": vector_result,
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Save work text error: {str(e)}")
        import traceback

        traceback.print_exc()
        raise HTTPException(
            status_code=500, detail=f"Failed to save work text: {str(e)}"
        )


@router.delete("/work-text")
async def delete_work_text(proposal_id: str, user=Depends(get_current_user)):
    """Delete existing work text"""
    try:
        # Get proposal
        all_proposals = await db_client.query_items(
            pk=f"USER#{user.get('user_id')}", index_name="GSI1"
        )

        proposal = None
        for p in all_proposals:
            if p.get("id") == proposal_id:
                proposal = p
                break

        if not proposal:
            raise HTTPException(status_code=404, detail="Proposal not found")

        proposal_code = proposal.get("proposalCode")

        # Delete from S3
        session = get_aws_session()
        s3_client = session.client("s3")
        bucket = os.environ.get("PROPOSALS_BUCKET")

        s3_key = f"{proposal_code}/documents/supporting/existing_work_text.txt"

        try:
            s3_client.delete_object(Bucket=bucket, Key=s3_key)
        except Exception as s3_error:
            print(f"S3 Delete Error: {str(s3_error)}")
            # Continue even if S3 delete fails

        # Delete from S3 Vectors
        print("Deleting vectors for work text")
        from app.shared.vectors.service import VectorEmbeddingsService

        vector_service = VectorEmbeddingsService()

        vector_deleted = vector_service.delete_vectors_by_document_name(
            document_name="existing_work_text", index_name="existing-work-index"
        )

        if not vector_deleted:
            print("Warning: Failed to delete vectors for work text")

        # Update DynamoDB
        await db_client.update_item(
            pk=f"PROPOSAL#{proposal_code}",
            sk="METADATA",
            update_expression="REMOVE text_inputs.#work SET updated_at = :updated",
            expression_attribute_names={"#work": "existing-work"},
            expression_attribute_values={":updated": datetime.utcnow().isoformat()},
        )

        return {"success": True, "message": "Work text deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        print(f"Delete work text error: {str(e)}")
        import traceback

        traceback.print_exc()
        raise HTTPException(
            status_code=500, detail=f"Failed to delete work text: {str(e)}"
        )


@router.post("/upload-text")
async def upload_rfp_text(
    proposal_id: str, rfp_text: str = Form(...), user=Depends(get_current_user)
):
    """
    Upload RFP as plain text (fallback for scanned/image-based PDFs).

    NOTE: This endpoint is currently not implemented.
    """
    raise HTTPException(
        status_code=501,
        detail="This endpoint is not yet implemented. Please upload a PDF file instead.",
    )


@router.get("/")
async def list_documents(proposal_id: str, user=Depends(get_current_user)):
    """List all documents uploaded for a proposal"""
    try:
        # Get proposal
        all_proposals = await db_client.query_items(
            pk=f"USER#{user.get('user_id')}", index_name="GSI1"
        )

        proposal = None
        for p in all_proposals:
            if p.get("id") == proposal_id:
                proposal = p
                break

        if not proposal:
            raise HTTPException(status_code=404, detail="Proposal not found")

        proposal_code = proposal.get("proposalCode")

        # Get documents from S3
        session = get_aws_session()
        s3_client = session.client("s3")
        bucket = os.environ.get("PROPOSALS_BUCKET")

        if not bucket:
            raise HTTPException(status_code=500, detail="S3 bucket not configured")

        # List all documents
        response = s3_client.list_objects_v2(
            Bucket=bucket, Prefix=f"{proposal_code}/documents/"
        )

        documents = []
        if "Contents" in response:
            for obj in response["Contents"]:
                key = obj["Key"]

                # Skip folders (keys ending with /)
                if key.endswith("/"):
                    continue

                # Determine document type based on path
                doc_type = "unknown"
                if "/rfp/" in key:
                    doc_type = "rfp"
                elif "/initial_concept/" in key:
                    doc_type = "initial_concept"

                # Extract filename
                filename = key.split("/")[-1]

                # Use LastModified from S3
                uploaded_at = (
                    obj["LastModified"].isoformat() if "LastModified" in obj else ""
                )

                documents.append(
                    {
                        "filename": filename,
                        "size": obj["Size"],
                        "type": doc_type,
                        "uploaded_at": uploaded_at,
                        "key": key,
                    }
                )

        return {"documents": documents}

    except HTTPException:
        raise
    except Exception as e:
        print(f"List documents error: {str(e)}")
        import traceback

        traceback.print_exc()
        raise HTTPException(
            status_code=500, detail=f"Failed to list documents: {str(e)}"
        )


@router.post("/analyze")
async def analyze_with_context(
    proposal_id: str, query: str = Form(...), user=Depends(get_current_user)
):
    """
    Analyze proposal using vector search.

    NOTE: This endpoint is currently not implemented.
    """
    raise HTTPException(
        status_code=501,
        detail="This endpoint is not yet implemented.",
    )
