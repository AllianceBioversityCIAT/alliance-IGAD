"""Step 2 empty-corpus regression tests (REQ-2, REQ-3).

These service-level unit tests prove the RFP-only path is safe:

* REQ-2: when the vector corpus is empty, the reference-proposals and
  existing-work analyzers return ``status == "completed"`` with a skipped,
  empty result (they degrade gracefully instead of failing).
* REQ-3: when at least one document is present, the analyzers proceed down
  the prompt/Bedrock analysis path and return a non-skipped completed result.

Only tests are added here; no production code is modified. Each analyzer's
``__init__`` builds ``VectorEmbeddingsService``, ``BedrockService`` and a boto3
DynamoDB resource, so those are patched at module scope to keep the tests
hermetic (no AWS calls). ``db_client.get_item_sync`` is patched to return a
proposal whose ``rfp_analysis`` already carries a ``semantic_query``.
"""

from contextlib import contextmanager
from unittest.mock import MagicMock, patch

import pytest

REFERENCE_MODULE = (
    "app.tools.proposal_writer.reference_proposals_analysis.service"
)
EXISTING_WORK_MODULE = (
    "app.tools.proposal_writer.existing_work_analysis.service"
)

SEMANTIC_QUERY = "find relevant climate resilience proposals"


def _proposal_with_semantic_query():
    """Return a proposal dict with a completed RFP analysis + semantic_query."""
    return {
        "PK": "PROPOSAL#PROP-123",
        "SK": "METADATA",
        "proposalCode": "PROP-123",
        "analysis_status_rfp": "completed",
        "rfp_analysis": {"semantic_query": SEMANTIC_QUERY},
    }


@contextmanager
def _patched_analyzer(module_path, proposal):
    """Patch a service module's AWS collaborators and yield the analyzer class.

    Patches ``db_client`` (returns ``proposal``), ``VectorEmbeddingsService``,
    ``BedrockService`` and ``boto3`` inside ``module_path`` so the analyzer can
    be instantiated without touching AWS. Yields ``(module, db_client_mock)``.
    """
    with (
        patch(f"{module_path}.db_client") as mock_db,
        patch(f"{module_path}.VectorEmbeddingsService"),
        patch(f"{module_path}.BedrockService"),
        patch(f"{module_path}.boto3"),
    ):
        mock_db.get_item_sync = MagicMock(return_value=proposal)
        module = __import__(module_path, fromlist=["*"])
        yield module, mock_db


# A realistic single-document analysis response (narrative + fenced JSON).
BEDROCK_RESPONSE = (
    "This reference proposal follows a strong problem-solution structure.\n\n"
    "```json\n"
    '{"structure_map": {"sections": ["intro", "methodology"]}, '
    '"best_practices": ["clear logframe"]}\n'
    "```"
)


# ==================== REQ-2: empty corpus -> completed/skipped ====================


def test_reference_proposals_empty_corpus_returns_completed_skipped():
    """No reference docs -> completed status with a skipped, empty result."""
    with _patched_analyzer(
        REFERENCE_MODULE, _proposal_with_semantic_query()
    ) as (module, _):
        analyzer = module.ReferenceProposalsAnalyzer()
        analyzer.vector_service.get_documents_by_proposal.return_value = []

        result = analyzer.analyze_reference_proposals("PROP-123")

        assert result["status"] == "completed"
        assert result["documents_analyzed"] == 0
        structured = result["reference_proposal_analysis"]["structured_data"]
        assert structured["status"] == "skipped"
        assert structured["reason"] == "No reference documents uploaded"
        # Bedrock must never be reached when there are no documents.
        analyzer.bedrock.invoke_claude.assert_not_called()


def test_existing_work_empty_corpus_returns_completed_skipped():
    """No existing-work docs -> completed status with a skipped, empty result."""
    with _patched_analyzer(
        EXISTING_WORK_MODULE, _proposal_with_semantic_query()
    ) as (module, _):
        analyzer = module.ExistingWorkAnalyzer()
        analyzer.vector_service.get_documents_by_proposal.return_value = []

        result = analyzer.analyze_existing_work("PROP-123")

        assert result["status"] == "completed"
        assert result["documents_analyzed"] == 0
        structured = result["existing_work_analysis"]["structured_data"]
        assert structured["status"] == "skipped"
        assert structured["reason"] == "No existing work documents uploaded"
        analyzer.bedrock.invoke_claude.assert_not_called()


def test_reference_proposals_requires_semantic_query():
    """Missing semantic_query -> raises before touching the vector corpus."""
    proposal = {
        "PK": "PROPOSAL#PROP-123",
        "SK": "METADATA",
        "proposalCode": "PROP-123",
        "analysis_status_rfp": "completed",
        "rfp_analysis": {},  # no semantic_query
    }
    with _patched_analyzer(REFERENCE_MODULE, proposal) as (module, _):
        analyzer = module.ReferenceProposalsAnalyzer()

        with pytest.raises(Exception) as exc_info:
            analyzer.analyze_reference_proposals("PROP-123")

        assert "semantic_query" in str(exc_info.value)
        # Gate fails before the corpus is queried.
        analyzer.vector_service.get_documents_by_proposal.assert_not_called()


# ==================== REQ-3: documents present -> real analysis ====================


def test_reference_proposals_with_documents_takes_analysis_path():
    """With >=1 document, the analyzer runs the prompt/Bedrock path (not skipped)."""
    with _patched_analyzer(
        REFERENCE_MODULE, _proposal_with_semantic_query()
    ) as (module, _):
        analyzer = module.ReferenceProposalsAnalyzer()
        analyzer.vector_service.get_documents_by_proposal.return_value = [
            {
                "document_name": "past_proposal.pdf",
                "full_text": "A detailed past proposal about climate resilience.",
            }
        ]
        analyzer.bedrock.invoke_claude.return_value = BEDROCK_RESPONSE

        with patch.object(
            module.ReferenceProposalsAnalyzer,
            "_load_prompt",
            return_value={
                "system_prompt": "system",
                "user_prompt": "Analyze {{reference_proposal_text}}",
                "output_format": "",
            },
        ):
            result = analyzer.analyze_reference_proposals("PROP-123")

        assert result["status"] == "completed"
        assert result["documents_analyzed"] == 1
        # Real analysis path was taken: Bedrock was invoked once...
        analyzer.bedrock.invoke_claude.assert_called_once()
        # ...and the result is NOT the skipped/empty branch.
        structured = result["reference_proposal_analysis"]["structured_data"]
        assert structured.get("status") != "skipped"
        assert "structure_map" in structured


def test_existing_work_with_documents_takes_analysis_path():
    """With >=1 document, the analyzer runs the prompt/Bedrock path (not skipped)."""
    with _patched_analyzer(
        EXISTING_WORK_MODULE, _proposal_with_semantic_query()
    ) as (module, _):
        analyzer = module.ExistingWorkAnalyzer()
        analyzer.vector_service.get_documents_by_proposal.return_value = [
            {
                "document_name": "prior_project.docx",
                "full_text": "A prior project delivering water infrastructure.",
            }
        ]
        analyzer.bedrock.invoke_claude.return_value = BEDROCK_RESPONSE

        with patch.object(
            module.ExistingWorkAnalyzer,
            "_load_prompt",
            return_value={
                "system_prompt": "system",
                "user_prompt": "Analyze {{existing_work_text}}",
                "output_format": "",
            },
        ):
            result = analyzer.analyze_existing_work("PROP-123")

        assert result["status"] == "completed"
        assert result["documents_analyzed"] == 1
        analyzer.bedrock.invoke_claude.assert_called_once()
        structured = result["existing_work_analysis"]["structured_data"]
        assert structured.get("status") != "skipped"
        assert "structure_map" in structured
