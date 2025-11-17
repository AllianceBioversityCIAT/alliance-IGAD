"""
Document Processing Service for RFP Vector Storage
Uses AWS Bedrock Titan for embeddings and S3 for vector storage
"""

import json
import os
from typing import List, Dict, Any
import boto3
from datetime import datetime
import hashlib

from ..utils.aws_session import get_aws_session


class DocumentService:
    def __init__(self):
        session = get_aws_session()
        self.s3 = session.client('s3')
        self.bedrock = session.client('bedrock-runtime')
        self.bucket_name = os.getenv('PROPOSALS_BUCKET', 'igad-proposal-documents')
        
        # Bedrock Titan Embeddings model
        self.embedding_model = "amazon.titan-embed-text-v1"
        
    def _chunk_text(self, text: str, chunk_size: int = 1000, overlap: int = 200) -> List[str]:
        """
        Split text into overlapping chunks for better context preservation
        """
        chunks = []
        start = 0
        text_length = len(text)
        
        while start < text_length:
            end = start + chunk_size
            
            # Try to break at sentence boundary
            if end < text_length:
                # Look for period, question mark, or exclamation within last 100 chars
                search_start = max(start, end - 100)
                last_period = text.rfind('.', search_start, end)
                last_question = text.rfind('?', search_start, end)
                last_exclaim = text.rfind('!', search_start, end)
                
                break_point = max(last_period, last_question, last_exclaim)
                if break_point > start:
                    end = break_point + 1
            
            chunk = text[start:end].strip()
            if chunk:
                chunks.append(chunk)
            
            start = end - overlap
            
        return chunks
    
    async def _generate_embedding(self, text: str) -> List[float]:
        """
        Generate vector embedding using Bedrock Titan
        """
        try:
            body = json.dumps({
                "inputText": text
            })
            
            response = self.bedrock.invoke_model(
                modelId=self.embedding_model,
                body=body,
                contentType='application/json',
                accept='application/json'
            )
            
            response_body = json.loads(response['body'].read())
            embedding = response_body.get('embedding', [])
            
            return embedding
            
        except Exception as e:
            print(f"Error generating embedding: {str(e)}")
            raise
    
    async def process_document(
        self, 
        proposal_code: str, 
        file_content: bytes,
        filename: str,
        user_id: str
    ) -> Dict[str, Any]:
        """
        Process uploaded document:
        1. Store original in S3
        2. Extract text
        3. Chunk text
        4. Generate embeddings
        5. Store vectors in S3
        """
        try:
            # 1. Store original document
            document_key = f"{proposal_code}/documents/{filename}"
            self.s3.put_object(
                Bucket=self.bucket_name,
                Key=document_key,
                Body=file_content,
                Metadata={
                    'proposal-code': proposal_code,
                    'uploaded-by': user_id,
                    'upload-date': datetime.utcnow().isoformat()
                }
            )
            
            # 2. Extract text from PDF
            # Note: You'll need to add PyPDF2 or pdfplumber to requirements.txt
            import PyPDF2
            from io import BytesIO
            
            pdf_reader = PyPDF2.PdfReader(BytesIO(file_content))
            full_text = ""
            for page in pdf_reader.pages:
                full_text += page.extract_text() + "\n"
            
            # 3. Chunk the text
            chunks = self._chunk_text(full_text)
            
            # 4 & 5. Generate embeddings and store vectors
            vector_chunks = []
            for idx, chunk_text in enumerate(chunks):
                # Generate embedding
                embedding = await self._generate_embedding(chunk_text)
                
                # Create chunk metadata
                chunk_id = hashlib.md5(chunk_text.encode()).hexdigest()[:12]
                chunk_data = {
                    "chunk_id": chunk_id,
                    "chunk_index": idx,
                    "text": chunk_text,
                    "embedding": embedding,
                    "embedding_model": self.embedding_model,
                    "source_document": filename,
                    "proposal_code": proposal_code,
                    "created_at": datetime.utcnow().isoformat()
                }
                
                # Store chunk with vector in S3
                vector_key = f"{proposal_code}/vectors/{chunk_id}.json"
                self.s3.put_object(
                    Bucket=self.bucket_name,
                    Key=vector_key,
                    Body=json.dumps(chunk_data),
                    ContentType='application/json',
                    Metadata={
                        'chunk-index': str(idx),
                        'proposal-code': proposal_code
                    }
                )
                
                vector_chunks.append({
                    "chunk_id": chunk_id,
                    "chunk_index": idx,
                    "vector_key": vector_key
                })
            
            # Store metadata summary
            metadata = {
                "proposal_code": proposal_code,
                "source_document": filename,
                "document_key": document_key,
                "total_chunks": len(chunks),
                "chunks": vector_chunks,
                "processed_at": datetime.utcnow().isoformat(),
                "processed_by": user_id,
                "embedding_model": self.embedding_model,
                "total_characters": len(full_text)
            }
            
            metadata_key = f"{proposal_code}/vectors/metadata.json"
            self.s3.put_object(
                Bucket=self.bucket_name,
                Key=metadata_key,
                Body=json.dumps(metadata, indent=2),
                ContentType='application/json'
            )
            
            return {
                "success": True,
                "document_key": document_key,
                "metadata_key": metadata_key,
                "total_chunks": len(chunks),
                "vector_keys": [chunk["vector_key"] for chunk in vector_chunks]
            }
            
        except Exception as e:
            print(f"Error processing document: {str(e)}")
            raise
    
    async def search_vectors(
        self, 
        proposal_code: str, 
        query_text: str,
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Search for relevant chunks using vector similarity
        1. Generate query embedding
        2. Retrieve all vectors for proposal
        3. Calculate cosine similarity
        4. Return top K matches
        """
        try:
            # 1. Generate query embedding
            query_embedding = await self._generate_embedding(query_text)
            
            # 2. List all vector files for this proposal
            prefix = f"{proposal_code}/vectors/"
            response = self.s3.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix=prefix
            )
            
            if 'Contents' not in response:
                return []
            
            # 3. Retrieve vectors and calculate similarity
            similarities = []
            for obj in response['Contents']:
                key = obj['Key']
                
                # Skip metadata file
                if key.endswith('metadata.json'):
                    continue
                
                # Get vector chunk
                chunk_response = self.s3.get_object(
                    Bucket=self.bucket_name,
                    Key=key
                )
                chunk_data = json.loads(chunk_response['Body'].read())
                
                # Calculate cosine similarity
                similarity = self._cosine_similarity(
                    query_embedding,
                    chunk_data['embedding']
                )
                
                similarities.append({
                    "chunk_id": chunk_data['chunk_id'],
                    "text": chunk_data['text'],
                    "similarity": similarity,
                    "chunk_index": chunk_data['chunk_index']
                })
            
            # 4. Sort by similarity and return top K
            similarities.sort(key=lambda x: x['similarity'], reverse=True)
            return similarities[:top_k]
            
        except Exception as e:
            print(f"Error searching vectors: {str(e)}")
            raise
    
    def _cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """
        Calculate cosine similarity between two vectors
        """
        import math
        
        dot_product = sum(a * b for a, b in zip(vec1, vec2))
        magnitude1 = math.sqrt(sum(a * a for a in vec1))
        magnitude2 = math.sqrt(sum(b * b for b in vec2))
        
        if magnitude1 == 0 or magnitude2 == 0:
            return 0.0
        
        return dot_product / (magnitude1 * magnitude2)
    
    async def get_document_context(
        self,
        proposal_code: str,
        query: str,
        max_chunks: int = 3
    ) -> str:
        """
        Get relevant context from document for AI analysis
        Returns concatenated text from top matching chunks
        """
        results = await self.search_vectors(proposal_code, query, top_k=max_chunks)
        
        if not results:
            return ""
        
        context_parts = []
        for idx, result in enumerate(results, 1):
            context_parts.append(
                f"[Relevant Section {idx}]:\n{result['text']}\n"
            )
        
        return "\n".join(context_parts)
    
    async def delete_proposal_documents(self, proposal_code: str) -> bool:
        """
        Delete all documents and vectors for a proposal
        """
        try:
            prefix = f"{proposal_code}/"
            
            # List all objects
            response = self.s3.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix=prefix
            )
            
            if 'Contents' not in response:
                return True
            
            # Delete all objects
            objects_to_delete = [{'Key': obj['Key']} for obj in response['Contents']]
            
            if objects_to_delete:
                self.s3.delete_objects(
                    Bucket=self.bucket_name,
                    Delete={'Objects': objects_to_delete}
                )
            
            return True
            
        except Exception as e:
            print(f"Error deleting documents: {str(e)}")
            raise
