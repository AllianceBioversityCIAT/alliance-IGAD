"""Draft Feedback Analysis Configuration

Settings for Step 4 of the Proposal Writer - analyzing draft proposals
and providing section-by-section feedback.

DynamoDB Prompt Lookup:
    - section: "proposal_writer"
    - sub_section: "step-5"
    - category: "Draft Feedback"

Placeholders injected:
    - {{draft_proposal}} - Extracted text from uploaded document
    - {{rfp_analysis}} - JSON from Step 1
"""

DRAFT_FEEDBACK_SETTINGS = {
    # Analysis constraints
    "max_sections": 20,           # Maximum sections to analyze
    "timeout": 300,               # Processing timeout (5 minutes)

    # Bedrock configuration
    "model": "us.anthropic.claude-sonnet-4-20250514-v1:0",  # Claude Sonnet 4
    "max_tokens": 16000,          # ~12,000 words of output
    "temperature": 0.3,           # Balanced creativity

    # DynamoDB prompt lookup keys
    "section": "proposal_writer",
    "sub_section": "step-5",
    "category": "Draft Feedback"
}
