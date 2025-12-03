"""
Vector embeddings endpoints for testing S3 Vectors
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, List
from app.shared.vectors.service import VectorEmbeddingsService

router = APIRouter(prefix="/api/vectors", tags=["vectors"])

class VectorInsertRequest(BaseModel):
    proposal_id: str
    text: str
    index_type: str  # "reference" or "work"
    metadata: Dict[str, str]

class VectorSearchRequest(BaseModel):
    query_text: str
    index_type: str  # "reference" or "work"
    top_k: Optional[int] = 5
    filters: Optional[Dict[str, str]] = None

@router.post("/test-insert")
async def test_insert_vector(request: VectorInsertRequest):
    """Test inserting a vector into S3 Vectors"""
    try:
        service = VectorEmbeddingsService()
        
        if request.index_type == "reference":
            success = service.insert_reference_proposal(
                request.proposal_id,
                request.text,
                request.metadata
            )
        elif request.index_type == "work":
            success = service.insert_existing_work(
                request.proposal_id,
                request.text,
                request.metadata
            )
        else:
            raise HTTPException(400, "Invalid index_type")
        
        if success:
            return {"status": "success", "message": "Vector inserted"}
        else:
            raise HTTPException(500, "Failed to insert vector")
    
    except Exception as e:
        raise HTTPException(500, f"Error: {str(e)}")

@router.post("/test-search")
async def test_search_vectors(request: VectorSearchRequest):
    """Test searching vectors in S3 Vectors"""
    try:
        service = VectorEmbeddingsService()
        
        if request.index_type == "reference":
            results = service.search_similar_proposals(
                request.query_text,
                request.top_k,
                request.filters
            )
        elif request.index_type == "work":
            results = service.search_similar_work(
                request.query_text,
                request.top_k,
                request.filters
            )
        else:
            raise HTTPException(400, "Invalid index_type")
        
        return {
            "status": "success",
            "count": len(results),
            "results": results
        }
    
    except Exception as e:
        raise HTTPException(500, f"Error: {str(e)}")

@router.get("/health")
async def vectors_health():
    """Check if S3 Vectors is accessible"""
    try:
        service = VectorEmbeddingsService()
        # Try to list indexes as a health check
        import boto3
        s3vectors = boto3.client('s3vectors', region_name='us-east-1')
        response = s3vectors.list_indexes(
            vectorBucketName="igad-proposals-vectors-testing"
        )
        return {
            "status": "healthy",
            "bucket": "igad-proposals-vectors-testing",
            "indexes": response.get('indexes', [])
        }
    except Exception as e:
        return {
            "status": "unavailable",
            "error": str(e)
        }
