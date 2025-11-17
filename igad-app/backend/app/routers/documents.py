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
    Upload RFP/Call for Proposals document
    - Stores original in S3
    - Extracts text
    - Generates vector embeddings
    - Stores vectors for AI analysis
    """
    try:
        # Verify proposal exists and user owns it
        if proposal_id.startswith("PROP-"):
            pk = f"PROPOSAL#{proposal_id}"
        else:
            # Query by ID
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
        
        # Validate file type
        if not file.filename.lower().endswith(('.pdf', '.doc', '.docx')):
            raise HTTPException(
                status_code=400,
                detail="Only PDF, DOC, and DOCX files are supported"
            )
        
        # Validate file size (10MB limit)
        content = await file.read()
        if len(content) > 10 * 1024 * 1024:  # 10MB
            raise HTTPException(
                status_code=400,
                detail="File size must be less than 10MB"
            )
        
        # Process document
        doc_service = DocumentService()
        result = await doc_service.process_document(
            proposal_code=proposal_id,
            file_content=content,
            filename=file.filename,
            user_id=user.get("user_id")
        )
        
        # Update proposal with document reference
        update_expression = "SET uploaded_files.#rfp = :files, updated_at = :updated"
        expression_attribute_names = {"#rfp": "rfp-document"}
        expression_attribute_values = {
            ":files": [file.filename],
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
            "message": "Document uploaded and processed successfully",
            "filename": file.filename,
            "total_chunks": result["total_chunks"],
            "document_key": result["document_key"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload document: {str(e)}"
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
