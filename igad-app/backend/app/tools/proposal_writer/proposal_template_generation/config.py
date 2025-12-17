"""
Proposal Template Generation Configuration

This module contains configuration settings for generating full draft proposals
based on the structure workplan analysis and all previous analyses.

The Proposal Template Generation uses AI to:
- Generate a complete draft proposal document
- Incorporate selected sections from structure workplan
- Use concept document, RFP analysis, and reference proposals
- Maintain consistency with donor expectations

AI Parameters:
    model: AWS Bedrock model ID for Claude
    max_tokens: Maximum tokens for Bedrock response
    temperature: Sampling temperature (0.0-1.0)
        - 0.0 = Deterministic, consistent outputs
        - 0.2 = Low creativity for consistent document generation
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
    max_retries: Maximum retry attempts on failure

DynamoDB Prompt Lookup:
    section: Top-level section key
    sub_section: Step identifier
    category: Prompt category filter

Usage:
    from app.tools.proposal_writer.proposal_template_generation.config import PROPOSAL_TEMPLATE_GENERATION_SETTINGS

    model = PROPOSAL_TEMPLATE_GENERATION_SETTINGS["model"]
    temperature = PROPOSAL_TEMPLATE_GENERATION_SETTINGS["temperature"]
"""

PROPOSAL_TEMPLATE_GENERATION_SETTINGS = {
    # ==================== AI Model Configuration ====================
    "model": "us.anthropic.claude-sonnet-4-20250514-v1:0",  # Claude Sonnet 4
    "max_tokens": 32000,  # Maximum tokens for response (~24,000 words for full proposal)
    "temperature": 0.2,  # Low temperature for consistent document generation
    "top_p": 0.9,  # Nucleus sampling (0.9 = consider top 90% probability mass)
    "top_k": 250,  # Top-k sampling (consider top 250 tokens)
    # ==================== Processing Settings ====================
    "timeout": 600,  # Processing timeout (10 minutes for longer document)
    "max_retries": 3,  # Maximum retry attempts on failure
    # ==================== DynamoDB Prompt Lookup ====================
    "section": "proposal_writer",  # Top-level section
    "sub_section": "step-3",  # Step identifier
    "category": "Draft Proposal",  # Prompt category filter (Prompt 4.5)
}
