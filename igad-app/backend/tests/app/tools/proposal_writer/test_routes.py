from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException

from app.tools.proposal_writer.routes import (
    ProposalCreate,
    ProposalUpdate,
    create_proposal,
    delete_proposal,
    get_proposal,
    get_proposals,
    update_proposal,
)

# Mock user
MOCK_USER = {
    "user_id": "test-user-123",
    "email": "test@example.com",
    "name": "Test User",
}


@pytest.mark.asyncio
async def test_create_proposal_success():
    """Test creating a new proposal when no draft exists"""
    proposal_data = ProposalCreate(
        title="Test Proposal",
        description="Test Description",
        template_id="template-123",
    )

    with patch("app.tools.proposal_writer.routes.db_client") as mock_db:
        # Mock query_items to return empty list (no existing draft)
        mock_db.query_items = AsyncMock(return_value=[])
        # Mock put_item
        mock_db.put_item = AsyncMock(return_value=True)

        response = await create_proposal(proposal_data, MOCK_USER)

        assert "proposal" in response
        assert response["proposal"]["title"] == "Test Proposal"
        assert response["proposal"]["status"] == "draft"
        assert response["proposal"]["user_id"] == MOCK_USER["user_id"]

        # Verify db calls
        mock_db.query_items.assert_called_once()
        mock_db.put_item.assert_called_once()


@pytest.mark.asyncio
async def test_create_proposal_existing_draft():
    """Test that existing draft is returned if one exists"""
    proposal_data = ProposalCreate(title="New Proposal")

    existing_draft = {
        "PK": "PROPOSAL#PROP-123",
        "SK": "METADATA",
        "id": "existing-id",
        "title": "Existing Draft",
        "status": "draft",
        "user_id": MOCK_USER["user_id"],
    }

    with patch("app.tools.proposal_writer.routes.db_client") as mock_db:
        # Mock query_items to return existing draft
        mock_db.query_items = AsyncMock(return_value=[existing_draft])

        response = await create_proposal(proposal_data, MOCK_USER)

        assert response["message"] == "Returning existing draft proposal"
        assert response["proposal"]["title"] == "Existing Draft"
        assert response["proposal"]["id"] == "existing-id"

        # Verify put_item was NOT called
        mock_db.put_item = AsyncMock()
        await create_proposal(proposal_data, MOCK_USER)
        mock_db.put_item.assert_not_called()


@pytest.mark.asyncio
async def test_get_proposals():
    """Test getting all proposals for user"""
    mock_items = [
        {
            "PK": "PROPOSAL#1",
            "SK": "METADATA",
            "id": "1",
            "title": "P1",
            "GSI1PK": "USER#1",
        },
        {
            "PK": "PROPOSAL#2",
            "SK": "METADATA",
            "id": "2",
            "title": "P2",
            "GSI1PK": "USER#1",
        },
    ]

    with patch("app.tools.proposal_writer.routes.db_client") as mock_db:
        mock_db.query_items = AsyncMock(return_value=mock_items)

        response = await get_proposals(MOCK_USER)

        assert "proposals" in response
        assert len(response["proposals"]) == 2
        assert response["proposals"][0]["title"] == "P1"
        # Ensure internal keys are removed
        assert "PK" not in response["proposals"][0]


@pytest.mark.asyncio
async def test_get_proposal_by_id_success():
    """Test getting a proposal by UUID"""
    proposal_id = "test-uuid"
    mock_item = {
        "PK": "PROPOSAL#PROP-123",
        "SK": "METADATA",
        "id": proposal_id,
        "proposalCode": "PROP-123",
        "user_id": MOCK_USER["user_id"],
    }

    with patch("app.tools.proposal_writer.routes.db_client") as mock_db:
        # First query by GSI to find PK
        mock_db.query_items = AsyncMock(return_value=[mock_item])
        # Then get item by PK
        mock_db.get_item = AsyncMock(return_value=mock_item)

        response = await get_proposal(proposal_id, MOCK_USER)

        assert response["id"] == proposal_id
        assert "PK" not in response


@pytest.mark.asyncio
async def test_get_proposal_by_code_success():
    """Test getting a proposal by PROPOSAL-CODE"""
    proposal_id = "PROP-20250101-ABCD"
    mock_item = {
        "PK": f"PROPOSAL#{proposal_id}",
        "SK": "METADATA",
        "id": "some-uuid",
        "proposalCode": proposal_id,
        "user_id": MOCK_USER["user_id"],
    }

    with patch("app.tools.proposal_writer.routes.db_client") as mock_db:
        mock_db.get_item = AsyncMock(return_value=mock_item)

        response = await get_proposal(proposal_id, MOCK_USER)

        assert response["proposalCode"] == proposal_id


@pytest.mark.asyncio
async def test_get_proposal_not_found():
    """Test getting a non-existent proposal"""
    with patch("app.tools.proposal_writer.routes.db_client") as mock_db:
        mock_db.query_items = AsyncMock(return_value=[])
        mock_db.scan_items = AsyncMock(return_value=[])  # Fallback scan

        with pytest.raises(HTTPException) as exc:
            await get_proposal("non-existent", MOCK_USER)

        assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_get_proposal_access_denied():
    """Test accessing another user's proposal"""
    proposal_id = "PROP-OTHER"
    mock_item = {
        "PK": f"PROPOSAL#{proposal_id}",
        "SK": "METADATA",
        "user_id": "other-user",
    }

    with patch("app.tools.proposal_writer.routes.db_client") as mock_db:
        mock_db.get_item = AsyncMock(return_value=mock_item)

        with pytest.raises(HTTPException) as exc:
            await get_proposal(proposal_id, MOCK_USER)

        assert exc.value.status_code == 403


@pytest.mark.asyncio
async def test_update_proposal_success():
    """Test updating a proposal"""
    proposal_id = "PROP-123"
    update_data = ProposalUpdate(title="Updated Title", status="active")

    existing_proposal = {
        "PK": f"PROPOSAL#{proposal_id}",
        "SK": "METADATA",
        "user_id": MOCK_USER["user_id"],
        "title": "Old Title",
    }

    updated_proposal_return = {
        **existing_proposal,
        "title": "Updated Title",
        "status": "active",
    }

    with patch("app.tools.proposal_writer.routes.db_client") as mock_db:
        mock_db.get_item = AsyncMock(return_value=existing_proposal)
        mock_db.update_item = AsyncMock(return_value=updated_proposal_return)

        response = await update_proposal(proposal_id, update_data, MOCK_USER)

        assert response["title"] == "Updated Title"
        mock_db.update_item.assert_called_once()


@pytest.mark.asyncio
async def test_delete_proposal_success():
    """Test deleting a proposal and its resources"""
    proposal_id = "PROP-DELETE"
    mock_item = {
        "PK": f"PROPOSAL#{proposal_id}",
        "SK": "METADATA",
        "user_id": MOCK_USER["user_id"],
        "proposalCode": proposal_id,
    }

    with patch("app.tools.proposal_writer.routes.db_client") as mock_db, patch(
        "app.shared.vectors.service.VectorEmbeddingsService"
    ) as MockVectorService, patch(
        "app.utils.aws_session.get_aws_session"
    ) as mock_get_session, patch.dict(
        "os.environ", {"PROPOSALS_BUCKET": "test-bucket"}
    ):
        # Mock DB
        mock_db.get_item = AsyncMock(return_value=mock_item)
        mock_db.delete_item = AsyncMock(return_value=True)

        # Mock Vector Service
        vector_service_instance = MockVectorService.return_value
        vector_service_instance.delete_proposal_vectors.return_value = True

        # Mock S3 via boto3 session
        mock_s3 = MagicMock()
        mock_session = MagicMock()
        mock_session.client.return_value = mock_s3
        mock_get_session.return_value = mock_session

        # Mock S3 list objects
        mock_s3.list_objects_v2.return_value = {
            "Contents": [{"Key": f"{proposal_id}/file1.txt"}]
        }

        response = await delete_proposal(proposal_id, MOCK_USER)

        assert response["message"] == "Proposal deleted successfully"
        mock_db.delete_item.assert_called_once()
        vector_service_instance.delete_proposal_vectors.assert_called_once_with(
            proposal_id
        )
        mock_s3.delete_objects.assert_called_once()

@pytest.mark.asyncio
async def test_generate_proposal_code():
    from app.tools.proposal_writer.routes import generate_proposal_code
    code = generate_proposal_code()
    assert code.startswith("PROP-")
    assert len(code.split("-")) == 3

def test_compute_completed_steps():
    from app.tools.proposal_writer.routes import _compute_completed_steps
    proposal = {"metadata": {"rfp_analysis": {"test": "ok"}, "concept_analysis": {"test": "ok"}, "structure_workplan": {"test": "ok"}, "rfp_analysis_status": "completed", "concept_analysis_status": "completed", "structure_workplan_status": "completed", "proposal_template_status": "completed", "proposal_template": {"content": "ok"}}}
    steps = _compute_completed_steps(proposal)
    assert 1 in steps
    assert 2 in steps
    assert 3 in steps
    assert 4 not in steps

def test_compute_step_completion():
    from app.tools.proposal_writer.routes import _compute_step_completion
    proposal = {"metadata": {"rfp_analysis": {"test": "ok"}, "concept_analysis": {"test": "ok"}, "structure_workplan": {"test": "ok"}, "rfp_analysis_status": "completed", "concept_analysis_status": "completed", "structure_workplan_status": "completed", "proposal_template_status": "completed", "proposal_template": {"content": "ok"}}}
    status = _compute_step_completion(proposal)
    assert status["step_1"]["completed"] is True
    assert status["step_2"]["completed"] is True
    assert status["step_3"]["completed"] is True
    assert status["step_4"]["completed"] is False

@pytest.mark.asyncio
async def test_analyze_rfp_success():
    from app.tools.proposal_writer.routes import analyze_rfp
    proposal_id = "PROP-123"
    with patch("app.tools.proposal_writer.routes.get_proposal") as mock_get_proposal, \
         patch("app.tools.proposal_writer.routes.db_client") as mock_db, \
         patch("app.tools.proposal_writer.routes.lambda_client") as mock_lambda, \
         patch.dict("os.environ", {"WORKER_FUNCTION_NAME": "test-worker"}):
         
         mock_get_proposal.return_value = {"PK": "PROPOSAL#PROP-123", "SK": "METADATA", "proposalCode": "PROP-123"}
         mock_db.update_item = AsyncMock()
         mock_db.get_item = AsyncMock(return_value={"user_id": MOCK_USER["user_id"], "proposalCode": "PROP-123"})
         mock_lambda.invoke.return_value = {"StatusCode": 202}
         
         response = await analyze_rfp(proposal_id, MOCK_USER)
         assert response["status"] == "processing"
         assert "RFP analysis started" in response["message"]
         mock_db.update_item.assert_called_once()
         mock_lambda.invoke.assert_called_once()

@pytest.mark.asyncio
async def test_get_analysis_status_processing():
    from app.tools.proposal_writer.routes import get_analysis_status
    proposal_id = "PROP-123"
    with patch("app.tools.proposal_writer.routes.get_proposal") as mock_get_proposal, \
         patch("app.tools.proposal_writer.routes.db_client") as mock_db:
         
         mock_db.get_item = AsyncMock(return_value={"PK": "PROPOSAL#PROP-123", "SK": "METADATA", "analysis_status_rfp": "processing", "user_id": MOCK_USER["user_id"]})
         response = await get_analysis_status(proposal_id, MOCK_USER)
         assert response["status"] == "processing"

@pytest.mark.asyncio
async def test_get_analysis_status_completed():
    from app.tools.proposal_writer.routes import get_analysis_status
    proposal_id = "PROP-123"
    with patch("app.tools.proposal_writer.routes.get_proposal") as mock_get_proposal, \
         patch("app.tools.proposal_writer.routes.db_client") as mock_db:
         
         mock_db.get_item = AsyncMock(return_value={"PK": "PROPOSAL#PROP-123", "SK": "METADATA", "analysis_status_rfp": "completed", "rfp_analysis": {"result": "success"}, "user_id": MOCK_USER["user_id"]})
         response = await get_analysis_status(proposal_id, MOCK_USER)
         assert response["status"] == "completed"
         assert response["rfp_analysis"] == {"result": "success"}


@pytest.mark.asyncio
async def test_analyze_step_2_semantic_query_present_first_read():
    """semantic_query available on the first consistent read -> 200/processing."""
    from app.tools.proposal_writer.routes import analyze_step_2

    proposal_id = "PROP-123"
    proposal = {
        "PK": "PROPOSAL#PROP-123",
        "SK": "METADATA",
        "proposalCode": "PROP-123",
        "user_id": MOCK_USER["user_id"],
        "analysis_status_rfp": "completed",
        "rfp_analysis": {"semantic_query": "find relevant reference proposals"},
    }

    with (
        patch("app.tools.proposal_writer.routes.db_client") as mock_db,
        patch("app.tools.proposal_writer.routes.lambda_client") as mock_lambda,
        patch(
            "app.tools.proposal_writer.routes.asyncio.sleep", new=AsyncMock()
        ) as mock_sleep,
        patch.dict("os.environ", {"WORKER_FUNCTION_NAME": "test-worker"}),
    ):
        mock_db.get_item = AsyncMock(return_value=proposal)
        mock_db.update_item = AsyncMock()
        mock_lambda.invoke.return_value = {"StatusCode": 202}

        response = await analyze_step_2(proposal_id, MOCK_USER)

        assert response["status"] == "processing"
        assert len(response["analyses"]) == 2
        # Single consistent read was enough; no retry sleep happened.
        mock_db.get_item.assert_called_once_with(
            pk="PROPOSAL#PROP-123", sk="METADATA", consistent=True
        )
        mock_sleep.assert_not_called()


@pytest.mark.asyncio
async def test_analyze_step_2_semantic_query_visible_on_retry():
    """Blob missing on first read (status completed), present on retry -> 200."""
    from app.tools.proposal_writer.routes import analyze_step_2

    proposal_id = "PROP-123"
    stale_proposal = {
        "PK": "PROPOSAL#PROP-123",
        "SK": "METADATA",
        "proposalCode": "PROP-123",
        "user_id": MOCK_USER["user_id"],
        "analysis_status_rfp": "completed",
        # rfp_analysis blob not yet visible on this stale replica read
    }
    fresh_proposal = {
        **stale_proposal,
        "rfp_analysis": {"semantic_query": "find relevant reference proposals"},
    }

    with (
        patch("app.tools.proposal_writer.routes.db_client") as mock_db,
        patch("app.tools.proposal_writer.routes.lambda_client") as mock_lambda,
        patch(
            "app.tools.proposal_writer.routes.asyncio.sleep", new=AsyncMock()
        ) as mock_sleep,
        patch.dict("os.environ", {"WORKER_FUNCTION_NAME": "test-worker"}),
    ):
        mock_db.get_item = AsyncMock(side_effect=[stale_proposal, fresh_proposal])
        mock_db.update_item = AsyncMock()
        mock_lambda.invoke.return_value = {"StatusCode": 202}

        response = await analyze_step_2(proposal_id, MOCK_USER)

        assert response["status"] == "processing"
        assert mock_db.get_item.call_count == 2
        # Retried once (slept once) before the blob became visible.
        mock_sleep.assert_awaited_once()


@pytest.mark.asyncio
async def test_analyze_step_2_missing_prereq_no_retry():
    """rfp_analysis absent and status != completed -> 400, exits fast (no loop)."""
    from app.tools.proposal_writer.routes import analyze_step_2

    proposal_id = "PROP-123"
    proposal = {
        "PK": "PROPOSAL#PROP-123",
        "SK": "METADATA",
        "proposalCode": "PROP-123",
        "user_id": MOCK_USER["user_id"],
        "analysis_status_rfp": "processing",
        # no rfp_analysis blob and RFP is not completed
    }

    with (
        patch("app.tools.proposal_writer.routes.db_client") as mock_db,
        patch("app.tools.proposal_writer.routes.lambda_client"),
        patch(
            "app.tools.proposal_writer.routes.asyncio.sleep", new=AsyncMock()
        ) as mock_sleep,
        patch.dict("os.environ", {"WORKER_FUNCTION_NAME": "test-worker"}),
    ):
        mock_db.get_item = AsyncMock(return_value=proposal)
        mock_db.update_item = AsyncMock()

        with pytest.raises(HTTPException) as exc_info:
            await analyze_step_2(proposal_id, MOCK_USER)

        assert exc_info.value.status_code == 400
        assert "must be completed before Step 2" in exc_info.value.detail
        # Genuinely-missing prerequisite must not loop/retry.
        mock_db.get_item.assert_called_once()
        mock_sleep.assert_not_called()
