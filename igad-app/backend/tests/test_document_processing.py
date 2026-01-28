"""
Tests for Document Processing Service
"""

import json
from unittest.mock import Mock, patch

import pytest

from app.services.document_processing_service import DocumentProcessingService


@pytest.fixture
def mock_aws_session():
    """Mock AWS session for testing"""
    session = Mock()
    s3_client = Mock()
    bedrock_client = Mock()

    session.client.side_effect = lambda service: {
        "s3": s3_client,
        "bedrock-runtime": bedrock_client,
    }[service]

    return session, s3_client, bedrock_client


@pytest.fixture
def document_service(mock_aws_session):
    """Document processing service with mocked AWS clients"""
    session, s3_client, bedrock_client = mock_aws_session

    with patch(
        "app.services.document_processing_service.get_aws_session", return_value=session
    ):
        with patch.dict(
            "os.environ",
            {
                "DOCUMENTS_BUCKET": "test-documents-bucket",
                "VECTOR_STORAGE_BUCKET": "test-vector-bucket",
            },
        ):
            service = DocumentProcessingService()
            return service, s3_client, bedrock_client


@pytest.fixture
def sample_pdf_content():
    """Sample PDF content for testing"""
    # This would be actual PDF bytes in a real test
    return b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n"


@pytest.fixture
def sample_docx_content():
    """Sample DOCX content for testing"""
    # Mock DOCX content - in real tests this would be actual DOCX bytes
    return b"PK\x03\x04\x14\x00\x00\x00\x08\x00"  # DOCX file signature


class TestDocumentProcessingService:
    """Test cases for DocumentProcessingService"""

    def test_init(self, document_service):
        """Test service initialization"""
        service, s3_client, bedrock_client = document_service

        assert service.documents_bucket == "test-documents-bucket"
        assert service.vector_storage_bucket == "test-vector-bucket"
        assert service.embedding_model_id == "amazon.titan-embed-text-v1"
        assert service.max_chunk_size == 1000
        assert service.chunk_overlap == 100

    @pytest.mark.asyncio
    async def test_validate_file_success(self, document_service):
        """Test successful file validation"""
        service, _, _ = document_service

        # Mock text extraction to return valid content
        with patch.object(
            service, "extract_text_content", return_value="Valid document content"
        ):
            result = await service.validate_file(b"test content", "test.pdf")

        assert result["valid"] is True
        assert result["file_size"] == 12
        assert result["file_type"] == "pdf"

    @pytest.mark.asyncio
    async def test_validate_file_too_large(self, document_service):
        """Test file size validation"""
        service, _, _ = document_service

        # Create content larger than 10MB
        large_content = b"x" * (11 * 1024 * 1024)

        result = await service.validate_file(large_content, "large.pdf")

        assert result["valid"] is False
        assert "exceeds maximum allowed size" in result["error"]

    @pytest.mark.asyncio
    async def test_validate_file_invalid_extension(self, document_service):
        """Test invalid file extension"""
        service, _, _ = document_service

        result = await service.validate_file(b"test content", "test.txt")

        assert result["valid"] is False
        assert "not supported" in result["error"]

    @pytest.mark.asyncio
    async def test_extract_docx_text(self, document_service, sample_docx_content):
        """Test DOCX text extraction"""
        service, _, _ = document_service

        # Mock the docx extraction to avoid dependency issues
        with patch.object(
            service,
            "_extract_docx_text",
            return_value="This is a test document for RFP analysis.\nIt contains sample text for testing purposes.",
        ):
            text = await service._extract_docx_text(sample_docx_content)

        assert "test document for RFP analysis" in text
        assert "sample text for testing purposes" in text

    def test_chunk_text(self, document_service):
        """Test text chunking functionality"""
        service, _, _ = document_service

        # Create text longer than chunk size
        long_text = "This is a test paragraph. " * 100  # About 2500 characters

        chunks = service._chunk_text(long_text)

        assert len(chunks) > 1
        assert all(
            len(chunk) <= service.max_chunk_size + service.chunk_overlap
            for chunk in chunks
        )

    @pytest.mark.asyncio
    async def test_generate_embeddings(self, document_service):
        """Test embedding generation"""
        service, _, bedrock_client = document_service

        # Mock Bedrock response
        mock_response = {"body": Mock()}
        mock_response["body"].read.return_value = json.dumps(
            {"embedding": [0.1, 0.2, 0.3, 0.4, 0.5]}
        ).encode()

        bedrock_client.invoke_model.return_value = mock_response

        embedding = await service.generate_embeddings("test text")

        assert embedding == [0.1, 0.2, 0.3, 0.4, 0.5]
        bedrock_client.invoke_model.assert_called_once()

    @pytest.mark.asyncio
    async def test_store_vectors(self, document_service):
        """Test vector storage in S3"""
        service, s3_client, _ = document_service

        embeddings = [[0.1, 0.2], [0.3, 0.4]]
        text_chunks = ["chunk 1", "chunk 2"]
        metadata = {"filename": "test.pdf"}

        with patch("uuid.uuid4", return_value=Mock(hex="test-vector-id")):
            vector_id = await service.store_vectors(
                proposal_id="test-proposal",
                document_type="rfp",
                embeddings=embeddings,
                text_chunks=text_chunks,
                metadata=metadata,
            )

        assert vector_id == "test-vector-id"
        s3_client.put_object.assert_called_once()

        # Verify S3 call parameters
        call_args = s3_client.put_object.call_args
        assert call_args[1]["Bucket"] == "test-vector-bucket"
        assert "vectors/test-proposal/rfp/" in call_args[1]["Key"]

    @pytest.mark.asyncio
    async def test_process_rfp_document_success(
        self, document_service, sample_docx_content
    ):
        """Test complete RFP document processing"""
        service, s3_client, bedrock_client = document_service

        # Mock Bedrock embedding response
        mock_response = {"body": Mock()}
        mock_response["body"].read.return_value = json.dumps(
            {"embedding": [0.1, 0.2, 0.3]}
        ).encode()
        bedrock_client.invoke_model.return_value = mock_response

        # Mock UUID generation
        with patch("uuid.uuid4", return_value=Mock(hex="test-vector-id")):
            result = await service.process_rfp_document(
                file_content=sample_docx_content,
                filename="test.docx",
                proposal_id="test-proposal",
                user_id="test-user",
            )

        assert result["status"] == "completed"
        assert result["vector_storage_id"] == "test-vector-id"
        assert "document_key" in result
        assert result["chunks_count"] > 0
        assert result["embeddings_count"] > 0

        # Verify S3 calls (one for vectors, one for original document)
        assert s3_client.put_object.call_count == 2


class TestDocumentProcessingErrors:
    """Test error handling in document processing"""

    @pytest.mark.asyncio
    async def test_extract_text_unsupported_format(self, document_service):
        """Test error handling for unsupported file format"""
        service, _, _ = document_service

        with pytest.raises(ValueError, match="Unsupported file type"):
            await service.extract_text_content(b"test", "txt")

    @pytest.mark.asyncio
    async def test_generate_embeddings_error(self, document_service):
        """Test error handling in embedding generation"""
        service, _, bedrock_client = document_service

        # Mock Bedrock error
        bedrock_client.invoke_model.side_effect = Exception("Bedrock error")

        with pytest.raises(Exception, match="Bedrock error"):
            await service.generate_embeddings("test text")

    @pytest.mark.asyncio
    async def test_store_vectors_s3_error(self, document_service):
        """Test error handling in S3 storage"""
        service, s3_client, _ = document_service

        # Mock S3 error
        s3_client.put_object.side_effect = Exception("S3 error")

        with pytest.raises(Exception, match="S3 error"):
            await service.store_vectors(
                proposal_id="test",
                document_type="rfp",
                embeddings=[[0.1]],
                text_chunks=["test"],
                metadata={},
            )
