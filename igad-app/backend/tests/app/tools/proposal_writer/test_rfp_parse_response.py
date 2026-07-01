"""Unit tests for SimpleRFPAnalyzer.parse_response (T5 / REQ-4).

Covers the robust JSON extraction: tolerance of trailing prose ("Extra
data"), markdown code fences, nested objects, and the error fallback for
non-JSON input.

Spec: bugfix/step1-semantic-query-required (Change 3, REQ-4).
"""

from app.tools.proposal_writer.rfp_analysis.service import SimpleRFPAnalyzer


def _analyzer() -> SimpleRFPAnalyzer:
    """Build an analyzer without running __init__ (which needs AWS)."""
    return SimpleRFPAnalyzer.__new__(SimpleRFPAnalyzer)


def test_parse_response_ignores_trailing_extra_data():
    """A JSON object followed by prose returns the first object only."""
    response = (
        '{"summary": {"donor": "World Bank"}}\n\n'
        "Here are some additional notes that would cause 'Extra data'."
    )

    result = _analyzer().parse_response(response)

    assert result["summary"]["donor"] == "World Bank"
    assert "error" not in result["summary"]


def test_parse_response_handles_json_code_fence_with_prose():
    """A fenced ```json block surrounded by prose is parsed correctly."""
    response = (
        "Sure, here is the analysis you asked for:\n"
        "```json\n"
        '{"summary": {"donor": "USAID"}, "extracted_data": {}}\n'
        "```\n"
        "Let me know if you need anything else."
    )

    result = _analyzer().parse_response(response)

    assert result["summary"]["donor"] == "USAID"
    assert "error" not in result["summary"]


def test_parse_response_preserves_nested_objects():
    """Nested JSON objects are fully decoded, not truncated."""
    response = (
        '{"summary": {"donor": "X"}, '
        '"extracted_data": {"geographic_scope": ["A", "B"]}}'
    )

    result = _analyzer().parse_response(response)

    assert result["summary"]["donor"] == "X"
    assert result["extracted_data"]["geographic_scope"] == ["A", "B"]


def test_parse_response_non_json_returns_error_fallback():
    """Input with no JSON object returns the error-fallback structure."""
    response = "I could not analyze this document, sorry."

    result = _analyzer().parse_response(response)

    assert result["summary"]["error"] == "Failed to parse response"
    assert result["extracted_data"]["raw_response"] == response
