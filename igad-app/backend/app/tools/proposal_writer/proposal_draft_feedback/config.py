"""
Proposal Draft Feedback Analysis Configuration

This module contains configuration settings for Step 4 of the Proposal Writer,
which analyzes draft proposals and provides section-by-section feedback.

The Proposal Draft Feedback analysis uses AI to:
- Evaluate draft proposal content against RFP requirements
- Provide detailed feedback for each section
- Identify gaps, weaknesses, and improvement opportunities
- Suggest specific enhancements to strengthen the proposal

AI Parameters:
    model: AWS Bedrock model ID for Claude
    max_tokens: Maximum tokens for Bedrock response
    temperature: Sampling temperature (0.0-1.0)
        - 0.0 = Deterministic, consistent outputs
        - 0.3 = Low creativity, constructive feedback (recommended)
        - 0.5 = Balanced creativity
        - 1.0 = Maximum creativity
    top_p: Nucleus sampling parameter (0.0-1.0)
        - Controls diversity of token selection
        - Lower values = more focused responses
    top_k: Top-k sampling parameter
        - Limits token selection to top k tokens
        - Lower values = more deterministic

Processing Settings:
    timeout: Maximum processing time in seconds
    max_sections: Maximum number of sections to analyze

DynamoDB Prompt Lookup:
    section: Top-level section key
    sub_section: Step identifier
    category: Prompt category filter

Placeholders injected:
    - {{draft_proposal}} - Extracted text from uploaded document
    - {{rfp_analysis}} - JSON from Step 1

Usage:
    from app.tools.proposal_writer.proposal_draft_feedback.config import PROPOSAL_DRAFT_FEEDBACK_SETTINGS

    model = PROPOSAL_DRAFT_FEEDBACK_SETTINGS["model"]
    temperature = PROPOSAL_DRAFT_FEEDBACK_SETTINGS["temperature"]
"""

PROPOSAL_DRAFT_FEEDBACK_SETTINGS = {
    # ==================== AI Model Configuration ====================
    "model": "us.anthropic.claude-sonnet-4-20250514-v1:0",  # Claude Sonnet 4
    "max_tokens": 16000,          # Maximum tokens for response (~12,000 words)
    "temperature": 0.3,           # Low temperature for constructive, consistent feedback
    "top_p": 0.9,                 # Nucleus sampling (0.9 = consider top 90% probability mass)
    "top_k": 250,                 # Top-k sampling (consider top 250 tokens)

    # ==================== Processing Settings ====================
    "timeout": 300,               # Processing timeout (5 minutes)
    "max_sections": 20,           # Maximum sections to analyze

    # ==================== DynamoDB Prompt Lookup ====================
    "section": "proposal_writer",      # Top-level section
    "sub_section": "step-4",           # Step identifier
    "category": "Proposal Review"      # Prompt category filter
}
