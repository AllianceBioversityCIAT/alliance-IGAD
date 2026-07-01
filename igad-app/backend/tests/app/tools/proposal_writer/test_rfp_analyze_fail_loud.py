"""Unit tests for SimpleRFPAnalyzer.analyze_rfp fail-loud behavior (T6 / REQ-5).

An unparseable AI response yields an empty semantic_query; analyze_rfp must
raise instead of completing with an empty query. A good parse must still
return status "completed" with a non-empty semantic_query.

Spec: bugfix/step1-semantic-query-required (Change 4, REQ-5).
"""

from unittest.mock import MagicMock, patch

import pytest

from app.tools.proposal_writer.rfp_analysis.service import SimpleRFPAnalyzer

_MODULE = "app.tools.proposal_writer.rfp_analysis.service"

_VALID_RFP_TEXT = "x" * 500  # passes the >= 100 char check

# A realistic analysis that yields a non-empty semantic query.
_GOOD_ANALYSIS = {
    "summary": {"donor": "World Bank", "key_focus": "climate resilience"},
    "extracted_data": {"geographic_scope": ["Kenya", "Ethiopia"]},
}

# Unparseable response -> error fallback that produces an empty query.
_ERROR_FALLBACK = {
    "summary": {"error": "Failed to parse response", "details": "Extra data"},
    "extracted_data": {"raw_response": "garbage"},
}


def _analyzer() -> SimpleRFPAnalyzer:
    """Build an analyzer without running __init__ (which needs AWS)."""
    analyzer = SimpleRFPAnalyzer.__new__(SimpleRFPAnalyzer)
    analyzer.bedrock = MagicMock()
    analyzer.bedrock.invoke_claude.return_value = "unused-mocked-response"
    return analyzer


def test_analyze_rfp_raises_when_semantic_query_empty():
    """Unparseable response -> empty query -> analyze_rfp raises."""
    analyzer = _analyzer()

    with patch(f"{_MODULE}.db_client") as mock_db, patch.object(
        SimpleRFPAnalyzer, "_get_rfp_text_from_s3", return_value=_VALID_RFP_TEXT
    ), patch.object(
        SimpleRFPAnalyzer,
        "_load_prompt",
        return_value={"system_prompt": "sys", "user_prompt": "user"},
    ), patch.object(
        SimpleRFPAnalyzer, "parse_response", return_value=_ERROR_FALLBACK
    ):
        mock_db.get_item_sync.return_value = {"proposalCode": "PROP-1"}

        with pytest.raises(Exception) as exc_info:
            analyzer.analyze_rfp("proposal-123")

    assert "no semantic_query" in str(exc_info.value)


def test_analyze_rfp_completes_on_good_parse():
    """Valid response -> non-empty query -> status completed."""
    analyzer = _analyzer()

    with patch(f"{_MODULE}.db_client") as mock_db, patch.object(
        SimpleRFPAnalyzer, "_get_rfp_text_from_s3", return_value=_VALID_RFP_TEXT
    ), patch.object(
        SimpleRFPAnalyzer,
        "_load_prompt",
        return_value={"system_prompt": "sys", "user_prompt": "user"},
    ), patch.object(
        SimpleRFPAnalyzer, "parse_response", return_value=dict(_GOOD_ANALYSIS)
    ):
        mock_db.get_item_sync.return_value = {"proposalCode": "PROP-1"}

        result = analyzer.analyze_rfp("proposal-123")

    assert result["status"] == "completed"
    assert result["rfp_analysis"]["semantic_query"]
