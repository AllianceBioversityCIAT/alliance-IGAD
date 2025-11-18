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
        
        # Get bucket name from environment or construct default
        bucket_name = os.getenv('PROPOSALS_BUCKET')
        if not bucket_name:
            # Get account ID for default bucket name
            sts = session.client('sts')
            account_id = sts.get_caller_identity()['Account']
            bucket_name = f'igad-proposal-documents-{account_id}'
        
        self.bucket_name = bucket_name
        
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
    
    def _generate_embedding(self, text: str) -> List[float]:
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
            
            # 2. Extract text from PDF - try multiple methods
            from io import BytesIO
            
            full_text = ""
            
            # Try 1: pdfplumber (best for text-based PDFs)
            try:
                import pdfplumber
                
                print("Attempting text extraction with pdfplumber...")
                with pdfplumber.open(BytesIO(file_content)) as pdf:
                    page_count = len(pdf.pages)
                    print(f"PDF has {page_count} pages")
                    
                    for page_num, page in enumerate(pdf.pages):
                        page_text = page.extract_text() or ""
                        print(f"Page {page_num + 1}: extracted {len(page_text)} characters")
                        full_text += page_text + "\n"
                
                print(f"pdfplumber: Total text extracted: {len(full_text)} characters")
                
            except Exception as e:
                print(f"pdfplumber failed: {str(e)}, trying PyPDF2...")
                
                # Try 2: PyPDF2 (fallback)
                try:
                    import PyPDF2
                    
                    pdf_reader = PyPDF2.PdfReader(BytesIO(file_content))
                    page_count = len(pdf_reader.pages)
                    print(f"PDF has {page_count} pages")
                    
                    for page_num, page in enumerate(pdf_reader.pages):
                        page_text = page.extract_text() or ""
                        print(f"Page {page_num + 1}: extracted {len(page_text)} characters")
                        full_text += page_text + "\n"
                    
                    print(f"PyPDF2: Total text extracted: {len(full_text)} characters")
                    
                except Exception as e2:
                    print(f"PyPDF2 also failed: {str(e2)}")
            
            # Final validation
            if len(full_text.strip()) < 100:
                raise Exception(
                    "Failed to extract text from PDF. The document appears to be image-based (scanned). "
                    "Please use the manual text input option to paste the RFP content."
                )
            
            # 3. Chunk the text
            chunks = self._chunk_text(full_text)
            print(f"Created {len(chunks)} chunks from text")
            
            if len(chunks) == 0:
                raise Exception("No text chunks created. The document may be empty or unreadable.")
            
            # 4 & 5. Generate embeddings and store vectors
            vector_chunks = []
            for idx, chunk_text in enumerate(chunks):
                print(f"Processing chunk {idx + 1}/{len(chunks)}")
                
                # Generate embedding
                embedding = self._generate_embedding(chunk_text)
                
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
                vector_key = f"{proposal_code}/documents/vectors/{chunk_id}.json"
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
            
            metadata_key = f"{proposal_code}/documents/vectors/metadata.json"
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
    
    def process_text_as_document(
        self,
        text: str,
        proposal_code: str,
        user_id: str,
        filename: str = "rfp-manual-input.txt"
    ) -> Dict[str, Any]:
        """
        Process plain text directly (no file upload)
        Used when PDF extraction fails
        """
        try:
            print(f"Processing manual text input for {proposal_code}")
            print(f"Text length: {len(text)} characters")
            
            # 1. Chunk the text
            chunks = self._chunk_text(text)
            print(f"Created {len(chunks)} chunks from text")
            
            if len(chunks) == 0:
                raise Exception("No text chunks created from input")
            
            # 2. Generate embeddings and store vectors
            vector_chunks = []
            for idx, chunk_text in enumerate(chunks):
                print(f"Processing chunk {idx + 1}/{len(chunks)}")
                
                # Generate embedding
                embedding = self._generate_embedding(chunk_text)
                
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
                vector_key = f"{proposal_code}/documents/vectors/{chunk_id}.json"
                self.s3.put_object(
                    Bucket=self.bucket_name,
                    Key=vector_key,
                    Body=json.dumps(chunk_data, indent=2),
                    ContentType='application/json',
                    Metadata={
                        'proposal-code': proposal_code,
                        'chunk-index': str(idx),
                        'source': 'manual-text-input'
                    }
                )
                
                vector_chunks.append({
                    "chunk_id": chunk_id,
                    "vector_key": vector_key
                })
                
                print(f"Stored chunk {idx + 1} in S3")
            
            # 3. Store metadata
            metadata = {
                "proposal_code": proposal_code,
                "source_type": "manual_text_input",
                "processed_at": datetime.utcnow().isoformat(),
                "user_id": user_id,
                "total_chunks": len(chunks),
                "total_characters": len(text)
            }
            
            metadata_key = f"{proposal_code}/vectors/metadata.json"
            self.s3.put_object(
                Bucket=self.bucket_name,
                Key=metadata_key,
                Body=json.dumps(metadata, indent=2),
                ContentType='application/json'
            )
            
            print(f"Successfully processed manual text: {len(chunks)} chunks created")
            
            return {
                "success": True,
                "total_chunks": len(chunks),
                "vector_keys": [chunk["vector_key"] for chunk in vector_chunks],
                "processed_at": metadata["processed_at"]
            }
            
        except Exception as e:
            print(f"Error processing manual text: {str(e)}")
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
            query_embedding = self._generate_embedding(query_text)
            
            # 2. List all vector files for this proposal
            prefix = f"{proposal_code}/documents/vectors/"
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
    
    def delete_proposal_folder(self, proposal_code: str) -> Dict[str, Any]:
        """
        Delete entire S3 folder for a proposal (documents + vectors)
        Called when deleting a draft proposal
        """
        try:
            print(f"Deleting S3 folder for proposal: {proposal_code}")
            
            # List all objects in the proposal folder
            prefix = f"{proposal_code}/"
            objects_to_delete = []
            
            # Use paginator to handle large number of objects
            paginator = self.s3.get_paginator('list_objects_v2')
            pages = paginator.paginate(Bucket=self.bucket_name, Prefix=prefix)
            
            for page in pages:
                if 'Contents' in page:
                    for obj in page['Contents']:
                        objects_to_delete.append({'Key': obj['Key']})
            
            if not objects_to_delete:
                print(f"No objects found for proposal {proposal_code}")
                return {
                    "success": True,
                    "deleted_count": 0,
                    "message": "No files to delete"
                }
            
            # Delete objects in batches of 1000 (S3 limit)
            total_deleted = 0
            batch_size = 1000
            
            for i in range(0, len(objects_to_delete), batch_size):
                batch = objects_to_delete[i:i + batch_size]
                
                response = self.s3.delete_objects(
                    Bucket=self.bucket_name,
                    Delete={'Objects': batch}
                )
                
                deleted = len(response.get('Deleted', []))
                total_deleted += deleted
                
                if 'Errors' in response and response['Errors']:
                    print(f"Errors deleting some objects: {response['Errors']}")
            
            print(f"Successfully deleted {total_deleted} objects for proposal {proposal_code}")
            
            return {
                "success": True,
                "deleted_count": total_deleted,
                "proposal_code": proposal_code
            }
            
        except Exception as e:
            print(f"Error deleting S3 folder for {proposal_code}: {str(e)}")
            raise Exception(f"Failed to delete S3 folder: {str(e)}")
    
    def process_document_sync(
        self,
        proposal_code: str,
        file_content: bytes,
        filename: str,
        user_id: str
    ) -> Dict[str, Any]:
        """
        Synchronous version of process_document for use in analyze_rfp
        Process uploaded PDF: extract text, create vectors
        """
        try:
            print(f"Processing document {filename} for proposal {proposal_code}")
            
            # 1. Store original PDF in S3
            document_key = f"{proposal_code}/documents/{filename}"
            self.s3.put_object(
                Bucket=self.bucket_name,
                Key=document_key,
                Body=file_content,
                ContentType='application/pdf',
                Metadata={
                    'proposal-code': proposal_code,
                    'uploaded-by': user_id,
                    'upload-date': datetime.utcnow().isoformat()
                }
            )
            
            # 2. Extract text from PDF - try multiple methods
            from io import BytesIO
            
            full_text = ""
            
            # Try 1: pdfplumber (best for text-based PDFs)
            try:
                import pdfplumber
                
                print("Attempting text extraction with pdfplumber...")
                with pdfplumber.open(BytesIO(file_content)) as pdf:
                    page_count = len(pdf.pages)
                    print(f"PDF has {page_count} pages")
                    
                    for page_num, page in enumerate(pdf.pages):
                        page_text = page.extract_text() or ""
                        print(f"Page {page_num + 1}: extracted {len(page_text)} characters")
                        full_text += page_text + "\n"
                
                print(f"pdfplumber: Total text extracted: {len(full_text)} characters")
                
            except Exception as e:
                print(f"pdfplumber failed: {str(e)}, trying PyPDF2...")
                
                # Try 2: PyPDF2 (fallback)
                try:
                    import PyPDF2
                    
                    pdf_reader = PyPDF2.PdfReader(BytesIO(file_content))
                    page_count = len(pdf_reader.pages)
                    print(f"PDF has {page_count} pages")
                    
                    for page_num, page in enumerate(pdf_reader.pages):
                        page_text = page.extract_text() or ""
                        print(f"Page {page_num + 1}: extracted {len(page_text)} characters")
                        full_text += page_text + "\n"
                    
                    print(f"PyPDF2: Total text extracted: {len(full_text)} characters")
                    
                except Exception as e2:
                    print(f"PyPDF2 also failed: {str(e2)}")
            
            # Final validation
            if len(full_text.strip()) < 100:
                raise Exception(
                    "Failed to extract text from PDF. The document appears to be image-based (scanned). "
                    "Please use the manual text input option to paste the RFP content."
                )
            
            # 3. Chunk the text
            chunks = self._chunk_text(full_text)
            print(f"Created {len(chunks)} chunks from text")
            
            if len(chunks) == 0:
                raise Exception("No text chunks created. The document may be empty or unreadable.")
            
            # 4 & 5. Generate embeddings and store vectors
            vector_chunks = []
            for idx, chunk_text in enumerate(chunks):
                print(f"Processing chunk {idx + 1}/{len(chunks)}")
                
                # Generate embedding
                embedding = self._generate_embedding(chunk_text)
                
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
                    Body=json.dumps(chunk_data, indent=2),
                    ContentType='application/json',
                    Metadata={
                        'proposal-code': proposal_code,
                        'chunk-index': str(idx),
                        'source': filename
                    }
                )
                
                vector_chunks.append({
                    "chunk_id": chunk_id,
                    "vector_key": vector_key
                })
                
                print(f"Stored chunk {idx + 1} in S3")
            
            # 6. Store summary metadata
            metadata = {
                "proposal_code": proposal_code,
                "source_document": filename,
                "processed_at": datetime.utcnow().isoformat(),
                "user_id": user_id,
                "total_chunks": len(chunks),
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
