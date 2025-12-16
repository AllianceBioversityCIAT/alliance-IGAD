"""
Reference Proposals Analysis Configuration

This module contains configuration settings for analyzing reference proposals
(successful past proposals) to inform the new proposal development.

The Reference Proposals Analysis uses AI to:
- Extract winning patterns and best practices
- Identify effective structure and presentation approaches
- Summarize language and tone that resonates with donors
- Map successful strategies to current RFP requirements

AI Parameters:
    model: AWS Bedrock model ID for Claude
    max_tokens: Maximum tokens for Bedrock response
    temperature: Sampling temperature (0.0-1.0)
        - 0.0 = Deterministic, consistent outputs
        - 0.3 = Low creativity, good for pattern extraction (recommended)
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
    max_documents: Maximum number of reference proposals to analyze
    max_chars_per_document: Maximum characters per document

DynamoDB Prompt Lookup:
    section: Top-level section key
    sub_section: Step identifier
    category: Prompt category filter

Usage:
    from app.tools.proposal_writer.reference_proposals_analysis.config import REFERENCE_PROPOSALS_ANALYSIS_SETTINGS

    model = REFERENCE_PROPOSALS_ANALYSIS_SETTINGS["model"]
    temperature = REFERENCE_PROPOSALS_ANALYSIS_SETTINGS["temperature"]
"""

REFERENCE_PROPOSALS_ANALYSIS_SETTINGS = {
    # ==================== AI Model Configuration ====================
    "model": "us.anthropic.claude-3-5-haiku-20241022-v1:0",  # Claude 3.5 Haiku (fast)
    "max_tokens": 8000,           # Maximum tokens for response (~6,000 words)
    "temperature": 0.2,           # Low temperature for consistent pattern identification
    "top_p": 0.9,                 # Nucleus sampling (0.9 = consider top 90% probability mass)
    "top_k": 250,                 # Top-k sampling (consider top 250 tokens)

    # ==================== Processing Settings ====================
    "timeout": 120,               # Processing timeout (2 minutes - Haiku is fast)
    "max_documents": 3,           # Maximum reference proposals to analyze
    "max_chars_per_document": 100000,  # Max characters per document (~25K tokens)

    # ==================== DynamoDB Prompt Lookup ====================
    "section": "proposal_writer",      # Top-level section
    "sub_section": "step-1",           # Step identifier
    "category": "Reference Proposals"  # Prompt category filter
}
