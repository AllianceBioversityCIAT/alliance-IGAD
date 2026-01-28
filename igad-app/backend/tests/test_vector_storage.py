"""
Tests for Vector Storage Service
"""

import json
from unittest.mock import Mock, patch

import pytest

from app.services.vector_storage_service import VectorMatch, VectorStorageService


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
def vector_service(mock_aws_session):
    """Vector storage service with mocked AWS clients"""
    session, s3_client, bedrock_client = mock_aws_session

    with patch(
        "app.services.vector_storage_service.get_aws_session", return_value=session
    ):
        with patch.dict("os.environ", {"VECTOR_STORAGE_BUCKET": "test-vector-bucket"}):
            service = VectorStorageService()
            return service, s3_client, bedrock_client


@pytest.fixture
def sample_vector_data():
    """Sample vector data for testing"""
    return {
        "vector_id": "test-vector-123",
        "proposal_id": "test-proposal",
        "document_type": "rfp",
        "embeddings": [[0.1, 0.2, 0.3], [0.4, 0.5, 0.6], [0.7, 0.8, 0.9]],
        "text_chunks": [
            "This is the first chunk of text",
            "This is the second chunk of text",
            "This is the third chunk of text",
        ],
        "metadata": {"filename": "test.pdf", "created_at": "2024-01-01T00:00:00Z"},
    }


class TestVectorStorageService:
    """Test cases for VectorStorageService"""

    def test_init(self, vector_service):
        """Test service initialization"""
        service, s3_client, bedrock_client = vector_service

        assert service.vector_storage_bucket == "test-vector-bucket"
        assert service.embedding_model_id == "amazon.titan-embed-text-v1"
        assert service.default_top_k == 5
        assert service.similarity_threshold == 0.7

    def test_vector_match_creation(self):
        """Test VectorMatch object creation"""
        match = VectorMatch(
            chunk_text="test text",
            similarity_score=0.85,
            chunk_index=0,
            metadata={"test": "data"},
        )

        assert match.chunk_text == "test text"
        assert match.similarity_score == 0.85
        assert match.chunk_index == 0
        assert match.metadata == {"test": "data"}

    @pytest.mark.asyncio
    async def test_generate_query_embedding(self, vector_service):
        """Test query embedding generation"""
        service, _, bedrock_client = vector_service

        # Mock Bedrock response
        mock_response = {"body": Mock()}
        mock_response["body"].read.return_value = json.dumps(
            {"embedding": [0.1, 0.2, 0.3, 0.4, 0.5]}
        ).encode()

        bedrock_client.invoke_model.return_value = mock_response

        embedding = await service._generate_query_embedding("test query")

        assert embedding == [0.1, 0.2, 0.3, 0.4, 0.5]
        bedrock_client.invoke_model.assert_called_once()

    @pytest.mark.asyncio
    async def test_load_proposal_vectors(self, vector_service, sample_vector_data):
        """Test loading vectors for a proposal"""
        service, s3_client, _ = vector_service

        # Mock S3 list_objects_v2 response
        s3_client.list_objects_v2.return_value = {
            "Contents": [
                {"Key": "vectors/test-proposal/rfp/vector1.json"},
                {"Key": "vectors/test-proposal/rfp/vector2.json"},
            ]
        }

        # Mock S3 get_object response
        mock_response = {"Body": Mock()}
        mock_response["Body"].read.return_value = json.dumps(
            sample_vector_data
        ).encode()
        s3_client.get_object.return_value = mock_response

        vectors = await service._load_proposal_vectors("test-proposal")

        assert len(vectors) == 2
        assert all(v["vector_id"] == "test-vector-123" for v in vectors)

        # Verify S3 calls
        s3_client.list_objects_v2.assert_called_once_with(
            Bucket="test-vector-bucket", Prefix="vectors/test-proposal/"
        )
        assert s3_client.get_object.call_count == 2

    @pytest.mark.asyncio
    async def test_load_proposal_vectors_empty(self, vector_service):
        """Test loading vectors when none exist"""
        service, s3_client, _ = vector_service

        # Mock empty S3 response
        s3_client.list_objects_v2.return_value = {}

        vectors = await service._load_proposal_vectors("test-proposal")

        assert vectors == []

    def test_calculate_cosine_similarity(self, vector_service):
        """Test cosine similarity calculation"""
        service, _, _ = vector_service

        # Test identical vectors (should be 1.0)
        vec1 = [1.0, 0.0, 0.0]
        vec2 = [1.0, 0.0, 0.0]
        similarity = service._calculate_cosine_similarity(vec1, vec2)
        assert abs(similarity - 1.0) < 0.001

        # Test orthogonal vectors (should be 0.0)
        vec1 = [1.0, 0.0, 0.0]
        vec2 = [0.0, 1.0, 0.0]
        similarity = service._calculate_cosine_similarity(vec1, vec2)
        assert abs(similarity - 0.0) < 0.001

    @pytest.mark.asyncio
    async def test_query_similar_content(self, vector_service, sample_vector_data):
        """Test querying similar content"""
        service, s3_client, bedrock_client = vector_service

        # Mock query embedding generation
        mock_bedrock_response = {"body": Mock()}
        mock_bedrock_response["body"].read.return_value = json.dumps(
            {"embedding": [0.1, 0.2, 0.3]}  # Similar to first chunk
        ).encode()
        bedrock_client.invoke_model.return_value = mock_bedrock_response

        # Mock vector loading
        s3_client.list_objects_v2.return_value = {
            "Contents": [{"Key": "vectors/test-proposal/rfp/vector1.json"}]
        }

        mock_s3_response = {"Body": Mock()}
        mock_s3_response["Body"].read.return_value = json.dumps(
            sample_vector_data
        ).encode()
        s3_client.get_object.return_value = mock_s3_response

        matches = await service.query_similar_content(
            query_text="test query",
            proposal_id="test-proposal",
            top_k=3,
            similarity_threshold=0.5,
        )

        assert len(matches) <= 3
        assert all(isinstance(match, VectorMatch) for match in matches)
        assert all(match.similarity_score >= 0.5 for match in matches)

        # Verify matches are sorted by similarity (descending)
        if len(matches) > 1:
            for i in range(len(matches) - 1):
                assert matches[i].similarity_score >= matches[i + 1].similarity_score

    @pytest.mark.asyncio
    async def test_build_context_from_query(self, vector_service, sample_vector_data):
        """Test building context from query matches"""
        service, s3_client, bedrock_client = vector_service

        # Mock the query_similar_content method
        mock_matches = [
            VectorMatch(
                chunk_text="First relevant chunk",
                similarity_score=0.9,
                chunk_index=0,
                metadata={},
            ),
            VectorMatch(
                chunk_text="Second relevant chunk",
                similarity_score=0.8,
                chunk_index=1,
                metadata={},
            ),
        ]

        with patch.object(service, "query_similar_content", return_value=mock_matches):
            context = await service.build_context_from_query(
                query_text="test query",
                proposal_id="test-proposal",
                max_context_length=500,
            )

        assert "First relevant chunk" in context
        assert "Second relevant chunk" in context
        assert "[Relevance: 0.90]" in context
        assert "[Relevance: 0.80]" in context
        assert len(context) <= 500

    @pytest.mark.asyncio
    async def test_delete_proposal_vectors(self, vector_service):
        """Test deleting all vectors for a proposal"""
        service, s3_client, _ = vector_service

        # Mock S3 list response
        s3_client.list_objects_v2.return_value = {
            "Contents": [
                {"Key": "vectors/test-proposal/rfp/vector1.json"},
                {"Key": "vectors/test-proposal/rfp/vector2.json"},
            ]
        }

        result = await service.delete_proposal_vectors("test-proposal")

        assert result is True

        # Verify S3 calls
        s3_client.list_objects_v2.assert_called_once()
        s3_client.delete_objects.assert_called_once()

        # Check delete call parameters
        delete_call = s3_client.delete_objects.call_args
        assert len(delete_call[1]["Delete"]["Objects"]) == 2

    @pytest.mark.asyncio
    async def test_get_vector_statistics(self, vector_service, sample_vector_data):
        """Test getting vector statistics"""
        service, s3_client, _ = vector_service

        # Mock vector loading
        with patch.object(
            service, "_load_proposal_vectors", return_value=[sample_vector_data]
        ):
            stats = await service.get_vector_statistics("test-proposal")

        assert stats["total_vectors"] == 1
        assert stats["total_chunks"] == 3
        assert stats["total_embeddings"] == 3
        assert stats["total_documents"] == 1
        assert "rfp" in stats["document_types"]
        assert stats["storage_info"]["bucket"] == "test-vector-bucket"

    @pytest.mark.asyncio
    async def test_search_by_themes(self, vector_service):
        """Test searching by multiple themes"""
        service, _, _ = vector_service

        # Mock query_similar_content
        mock_matches = [VectorMatch("theme content", 0.8, 0, {})]

        with patch.object(service, "query_similar_content", return_value=mock_matches):
            results = await service.search_by_themes(
                themes=["climate", "livestock"], proposal_id="test-proposal", top_k=3
            )

        assert "climate" in results
        assert "livestock" in results
        assert len(results["climate"]) == 1
        assert len(results["livestock"]) == 1


class TestVectorStorageErrors:
    """Test error handling in vector storage"""

    @pytest.mark.asyncio
    async def test_generate_query_embedding_error(self, vector_service):
        """Test error handling in query embedding generation"""
        service, _, bedrock_client = vector_service

        # Mock Bedrock error
        bedrock_client.invoke_model.side_effect = Exception("Bedrock error")

        with pytest.raises(Exception, match="Bedrock error"):
            await service._generate_query_embedding("test query")

    @pytest.mark.asyncio
    async def test_load_proposal_vectors_s3_error(self, vector_service):
        """Test error handling in S3 operations"""
        service, s3_client, _ = vector_service

        # Mock S3 error
        s3_client.list_objects_v2.side_effect = Exception("S3 error")

        with pytest.raises(Exception, match="S3 error"):
            await service._load_proposal_vectors("test-proposal")

    @pytest.mark.asyncio
    async def test_query_similar_content_no_vectors(self, vector_service):
        """Test querying when no vectors exist"""
        service, _, _ = vector_service

        # Mock empty vector loading
        with patch.object(service, "_load_proposal_vectors", return_value=[]):
            matches = await service.query_similar_content(
                query_text="test", proposal_id="test-proposal"
            )

        assert matches == []

    def test_calculate_cosine_similarity_error(self, vector_service):
        """Test error handling in similarity calculation"""
        service, _, _ = vector_service

        # Test with invalid vectors
        similarity = service._calculate_cosine_similarity([], [1, 2, 3])
        assert similarity == 0.0
