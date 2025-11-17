"""
Documents Router - Handle RFP upload and vector processing
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from ..middleware.auth_middleware import AuthMiddleware
from ..services.document_service import DocumentService
from ..database.client import db_client

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
    proposal_id: str,
    file: UploadFile = File(...),
    user=Depends(get_current_user)
):
    """
    Upload RFP document - stores PDF in S3
    """
    from ..utils.aws_session import get_aws_session
    import os
    from datetime import datetime
    
    try:
        print(f"=== UPLOAD START ===")
        print(f"Proposal ID: {proposal_id}")
        print(f"Filename: {file.filename}")
        print(f"Content-Type: {file.content_type}")
        
        # Validate file type
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Only PDF files are supported")
        
        # Read file content
        file_bytes = await file.read()
        file_size = len(file_bytes)
        
        print(f"File size read: {file_size} bytes")
        
        if file_size == 0:
            raise HTTPException(status_code=400, detail="File is empty")
        
        if file_size > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File size must be less than 10MB")
        
        # Check if it's actually a PDF
        if not file_bytes.startswith(b'%PDF'):
            print(f"WARNING: File doesn't start with PDF header. First 20 bytes: {file_bytes[:20]}")
            raise HTTPException(status_code=400, detail="File doesn't appear to be a valid PDF")
        
        print(f"PDF validation passed. First 20 bytes: {file_bytes[:20]}")
        
        # Get proposal
        if proposal_id.startswith("PROP-"):
            pk = f"PROPOSAL#{proposal_id}"
            proposal_code = proposal_id
        else:
            items = await db_client.query_items(
                pk=f"USER#{user.get('user_id')}",
                index_name="GSI1"
            )
            
            proposal_item = None
            for item in items:
                if item.get("id") == proposal_id:
                    proposal_item = item
                    break
            
            if not proposal_item:
                raise HTTPException(status_code=404, detail="Proposal not found")
            
            pk = proposal_item["PK"]
            proposal_code = proposal_item.get("proposalCode", proposal_id)
        
        # Verify ownership
        proposal = await db_client.get_item(pk=pk, sk="METADATA")
        if not proposal:
            raise HTTPException(status_code=404, detail="Proposal not found")
        
        if proposal.get("user_id") != user.get("user_id"):
            raise HTTPException(status_code=403, detail="Access denied")
        
        print(f"Proposal code: {proposal_code}")
        
        # Upload to S3 using proper session
        session = get_aws_session()
        s3_client = session.client('s3')
        bucket = os.environ.get('PROPOSALS_BUCKET')
        
        if not bucket:
            raise HTTPException(status_code=500, detail="S3 bucket not configured")
        
        s3_key = f"{proposal_code}/documents/{file.filename}"
        
        print(f"Uploading to S3...")
        print(f"  Bucket: {bucket}")
        print(f"  Key: {s3_key}")
        print(f"  Size: {file_size} bytes")
        
        # Upload with explicit parameters using BytesIO to ensure binary mode
        from io import BytesIO
        
        s3_client.put_object(
            Bucket=bucket,
            Key=s3_key,
            Body=BytesIO(file_bytes),
            ContentType='application/pdf'
        )
        
        print("S3 upload completed")
        
        # Verify the upload
        response = s3_client.head_object(Bucket=bucket, Key=s3_key)
        uploaded_size = response['ContentLength']
        
        print(f"S3 verification:")
        print(f"  Uploaded size: {uploaded_size} bytes")
        print(f"  Expected size: {file_size} bytes")
        
        if uploaded_size != file_size:
            print(f"ERROR: Size mismatch! Uploaded {uploaded_size} but expected {file_size}")
            raise HTTPException(
                status_code=500,
                detail=f"Upload verification failed: size mismatch ({uploaded_size} vs {file_size})"
            )
        
        print("Size verification PASSED")
        
        # Update proposal metadata
        update_expression = "SET uploaded_files.#rfp = :files, updated_at = :updated"
        expression_attribute_names = {"#rfp": "rfp-document"}
        expression_attribute_values = {
            ":files": [file.filename],
            ":updated": datetime.utcnow().isoformat()
        }
        
        await db_client.update_item(
            pk=pk,
            sk="METADATA",
            update_expression=update_expression,
            expression_attribute_values=expression_attribute_values,
            expression_attribute_names=expression_attribute_names
        )
        
        print("=== UPLOAD SUCCESS ===")
        
        return {
            "success": True,
            "message": "PDF uploaded successfully",
            "filename": file.filename,
            "document_key": s3_key,
            "size": file_size,
            "verified": True
        }
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"=== UPLOAD ERROR ===")
        print(f"Error: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to upload document: {str(e)}")


@router.post("/upload-text")
async def upload_rfp_text(
    proposal_id: str,
    rfp_text: str = Form(...),
    user=Depends(get_current_user)
):
    """
    Upload RFP as plain text (fallback for scanned/image-based PDFs)
    """
    try:
        # Verify proposal ownership
        if proposal_id.startswith("PROP-"):
            pk = f"PROPOSAL#{proposal_id}"
            proposal_code = proposal_id
        else:
            items = await db_client.query_items(
                pk=f"USER#{user.get('user_id')}",
                index_name="GSI1"
            )
            
            proposal_item = None
            for item in items:
                if item.get("id") == proposal_id:
                    proposal_item = item
                    break
            
            if not proposal_item:
                raise HTTPException(status_code=404, detail="Proposal not found")
            
            pk = proposal_item["PK"]
            proposal_code = proposal_item.get("proposalCode", proposal_id)
        
        proposal = await db_client.get_item(pk=pk, sk="METADATA")
        
        if not proposal:
            raise HTTPException(status_code=404, detail="Proposal not found")
        
        if proposal.get("user_id") != user.get("user_id"):
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Validate text length
        if len(rfp_text.strip()) < 100:
            raise HTTPException(
                status_code=400, 
                detail="RFP text must be at least 100 characters"
            )
        
        # Process text directly (no file upload needed)
        doc_service = DocumentService()
        result = doc_service.process_text_as_document(
            text=rfp_text,
            proposal_code=proposal_code,
            user_id=user.get("user_id"),
            filename="rfp-manual-input.txt"
        )
        
        # Update proposal with document reference
        update_expression = "SET uploaded_files.#rfp = :files, updated_at = :updated"
        expression_attribute_names = {"#rfp": "rfp-document"}
        expression_attribute_values = {
            ":files": ["RFP (Manual Input)"],
            ":updated": result.get("processed_at", "")
        }
        
        await db_client.update_item(
            pk=pk,
            sk="METADATA",
            update_expression=update_expression,
            expression_attribute_values=expression_attribute_values,
            expression_attribute_names=expression_attribute_names
        )
        
        return {
            "success": True,
            "message": "RFP text processed successfully",
            "total_chunks": result["total_chunks"],
            "text_length": len(rfp_text)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process RFP text: {str(e)}"
        )


@router.get("/")
async def list_documents(
    proposal_id: str,
    user=Depends(get_current_user)
):
    """List all documents uploaded for a proposal"""
    try:
        # Verify proposal ownership
        if proposal_id.startswith("PROP-"):
            pk = f"PROPOSAL#{proposal_id}"
        else:
            items = await db_client.query_items(
                pk=f"USER#{user.get('user_id')}",
                index_name="GSI1"
            )
            
            proposal_item = None
            for item in items:
                if item.get("id") == proposal_id:
                    proposal_item = item
                    break
            
            if not proposal_item:
                raise HTTPException(status_code=404, detail="Proposal not found")
            
            pk = proposal_item["PK"]
            proposal_id = proposal_item.get("proposalCode", proposal_id)
        
        proposal = await db_client.get_item(pk=pk, sk="METADATA")
        
        if not proposal:
            raise HTTPException(status_code=404, detail="Proposal not found")
        
        if proposal.get("user_id") != user.get("user_id"):
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get documents from S3
        doc_service = DocumentService()
        import boto3
        
        s3 = doc_service.s3
        bucket = doc_service.bucket_name
        
        # List documents
        response = s3.list_objects_v2(
            Bucket=bucket,
            Prefix=f"{proposal_id}/documents/"
        )
        
        documents = []
        if 'Contents' in response:
            for obj in response['Contents']:
                # Get metadata
                head = s3.head_object(Bucket=bucket, Key=obj['Key'])
                
                documents.append({
                    "filename": obj['Key'].split('/')[-1],
                    "size": obj['Size'],
                    "uploaded_at": head['Metadata'].get('upload-date', ''),
                    "key": obj['Key']
                })
        
        return {"documents": documents}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list documents: {str(e)}"
        )


@router.post("/analyze")
async def analyze_with_context(
    proposal_id: str,
    query: str = Form(...),
    user=Depends(get_current_user)
):
    """
    Analyze proposal using vector search
    Retrieves relevant RFP context based on query
    """
    try:
        # Verify proposal ownership
        if proposal_id.startswith("PROP-"):
            proposal_code = proposal_id
        else:
            items = await db_client.query_items(
                pk=f"USER#{user.get('user_id')}",
                index_name="GSI1"
            )
            
            proposal_item = None
            for item in items:
                if item.get("id") == proposal_id:
                    proposal_item = item
                    break
            
            if not proposal_item:
                raise HTTPException(status_code=404, detail="Proposal not found")
            
            proposal_code = proposal_item.get("proposalCode", proposal_id)
        
        # Search vectors for relevant context
        doc_service = DocumentService()
        context = await doc_service.get_document_context(
            proposal_code=proposal_code,
            query=query,
            max_chunks=3
        )
        
        if not context:
            return {
                "success": False,
                "message": "No documents found for this proposal"
            }
        
        return {
            "success": True,
            "context": context,
            "message": "Retrieved relevant context from RFP document"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to analyze: {str(e)}"
        )
