"""Vector Embeddings Service for S3 Vectors"""
import boto3
import json
from typing import List, Dict, Any, Optional
from datetime import datetime

class VectorEmbeddingsService:
    def __init__(self):
        self.bedrock = boto3.client('bedrock-runtime', region_name='us-east-1')
        self.s3vectors = boto3.client('s3vectors', region_name='us-east-1')
        self.bucket_name = "igad-proposals-vectors-testing"
        self.model_id = "amazon.titan-embed-text-v2:0"
    
    def generate_embedding(self, text: str) -> List[float]:
        """Generate embedding using Bedrock Titan"""
        response = self.bedrock.invoke_model(
            modelId=self.model_id,
            body=json.dumps({"inputText": text})
        )
        return json.loads(response['body'].read())['embedding']
    
    def insert_reference_proposal(self, proposal_id: str, text: str, metadata: Dict[str, str]) -> bool:
        """Insert reference proposal vector"""
        try:
            embedding = self.generate_embedding(text)
            self.s3vectors.put_vectors(
                vectorBucketName=self.bucket_name,
                indexName="reference-proposals-index",
                vectors=[{
                    "key": f"ref-{proposal_id}-{int(datetime.utcnow().timestamp())}",
                    "data": {"float32": embedding},
                    "metadata": {
                        "proposal_id": proposal_id,
                        "donor": metadata.get("donor", ""),
                        "sector": metadata.get("sector", ""),
                        "year": metadata.get("year", ""),
                        "status": metadata.get("status", ""),
                        "source_text": text[:1000],
                        "document_name": metadata.get("document_name", ""),
                        "upload_date": datetime.utcnow().isoformat()
                    }
                }]
            )
            return True
        except Exception as e:
            print(f"Error: {e}")
            return False
    
    def insert_existing_work(self, proposal_id: str, text: str, metadata: Dict[str, str]) -> bool:
        """Insert existing work vector"""
        try:
            embedding = self.generate_embedding(text)
            self.s3vectors.put_vectors(
                vectorBucketName=self.bucket_name,
                indexName="existing-work-index",
                vectors=[{
                    "key": f"work-{proposal_id}-{int(datetime.utcnow().timestamp())}",
                    "data": {"float32": embedding},
                    "metadata": {
                        "proposal_id": proposal_id,
                        "organization": metadata.get("organization", ""),
                        "project_type": metadata.get("project_type", ""),
                        "region": metadata.get("region", ""),
                        "source_text": text[:1000],
                        "document_name": metadata.get("document_name", ""),
                        "upload_date": datetime.utcnow().isoformat()
                    }
                }]
            )
            return True
        except Exception as e:
            print(f"Error: {e}")
            return False
    
    def search_similar_proposals(self, query_text: str, top_k: int = 5, 
                                 filters: Optional[Dict[str, str]] = None) -> List[Dict[str, Any]]:
        """Search similar reference proposals"""
        try:
            query_embedding = self.generate_embedding(query_text)
            params = {
                "vectorBucketName": self.bucket_name,
                "indexName": "reference-proposals-index",
                "queryVector": {"float32": query_embedding},
                "topK": top_k,
                "returnDistance": True,
                "returnMetadata": True
            }
            if filters:
                params["filter"] = filters
            return self.s3vectors.query_vectors(**params).get('vectors', [])
        except Exception as e:
            print(f"Error: {e}")
            return []
    
    def search_similar_work(self, query_text: str, top_k: int = 5,
                           filters: Optional[Dict[str, str]] = None) -> List[Dict[str, Any]]:
        """Search similar existing work"""
        try:
            query_embedding = self.generate_embedding(query_text)
            params = {
                "vectorBucketName": self.bucket_name,
                "indexName": "existing-work-index",
                "queryVector": {"float32": query_embedding},
                "topK": top_k,
                "returnDistance": True,
                "returnMetadata": True
            }
            if filters:
                params["filter"] = filters
            return self.s3vectors.query_vectors(**params).get('vectors', [])
        except Exception as e:
            print(f"Error: {e}")
            return []
    
    def delete_proposal_vectors(self, proposal_id: str) -> bool:
        """Delete all vectors for a proposal"""
        try:
            for index in ["reference-proposals-index", "existing-work-index"]:
                response = self.s3vectors.list_vectors(
                    vectorBucketName=self.bucket_name,
                    indexName=index
                )
                keys = [v['key'] for v in response.get('vectors', [])
                       if v.get('metadata', {}).get('proposal_id') == proposal_id]
                if keys:
                    self.s3vectors.delete_vectors(
                        vectorBucketName=self.bucket_name,
                        indexName=index,
                        keys=keys
                    )
            return True
        except Exception as e:
            print(f"Error: {e}")
            return False

    def delete_vectors_by_document_name(self, document_name: str, index_name: str) -> bool:
        """
        Delete all vectors associated with a specific document name

        Args:
            document_name: The document filename to delete vectors for
            index_name: The index to delete from (reference-proposals-index or existing-work-index)

        Returns:
            True if successful, False otherwise
        """
        try:
            # List all vectors in the index
            response = self.s3vectors.list_vectors(
                vectorBucketName=self.bucket_name,
                indexName=index_name
            )

            # Filter vectors by document_name metadata
            keys_to_delete = []
            for vector in response.get('vectors', []):
                metadata = vector.get('metadata', {})
                if metadata.get('document_name') == document_name:
                    keys_to_delete.append(vector['key'])

            # Delete the vectors if any found
            if keys_to_delete:
                print(f"Deleting {len(keys_to_delete)} vectors for document {document_name}")
                self.s3vectors.delete_vectors(
                    vectorBucketName=self.bucket_name,
                    indexName=index_name,
                    keys=keys_to_delete
                )
                return True
            else:
                print(f"No vectors found for document {document_name}")
                return True  # Not an error, just no vectors to delete

        except Exception as e:
            print(f"Error deleting vectors by document name: {e}")
            import traceback
            traceback.print_exc()
            return False

