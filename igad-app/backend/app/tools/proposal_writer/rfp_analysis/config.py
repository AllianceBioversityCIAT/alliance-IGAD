"""
RFP Analysis Configuration

This module contains configuration settings for Step 1 of the Proposal Writer,
which analyzes the Request for Proposals (RFP) document.

The RFP Analysis uses AI to:
- Extract key requirements and criteria
- Identify evaluation metrics and scoring
- Analyze submission requirements
- Summarize donor priorities and objectives
- Parse budget and timeline constraints

AI Parameters:
    model: AWS Bedrock model ID for Claude
    max_tokens: Maximum tokens for Bedrock response
    temperature: Sampling temperature (0.0-1.0)
        - 0.0 = Deterministic, consistent outputs
        - 0.2 = Low creativity, factual extraction (recommended for RFP analysis)
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
    max_pages: Maximum pages to process from RFP
    max_chars: Maximum characters to extract before truncation

DynamoDB Prompt Lookup:
    section: Top-level section key
    sub_section: Step identifier
    category: Prompt category filter

Usage:
    from app.tools.proposal_writer.rfp_analysis.config import RFP_ANALYSIS_SETTINGS

    model = RFP_ANALYSIS_SETTINGS["model"]
    temperature = RFP_ANALYSIS_SETTINGS["temperature"]
"""

RFP_ANALYSIS_SETTINGS = {
    # ==================== AI Model Configuration ====================
    "model": "us.anthropic.claude-sonnet-4-20250514-v1:0",  # Claude Sonnet 4
    "max_tokens": 12000,  # Maximum tokens for response (~9,000 words)
    "temperature": 0.2,  # Low temperature for consistent, factual analysis
    "top_p": 0.9,  # Nucleus sampling (0.9 = consider top 90% probability mass)
    "top_k": 250,  # Top-k sampling (consider top 250 tokens)
    # ==================== Processing Settings ====================
    "timeout": 300,  # Processing timeout (5 minutes)
    "max_pages": 100,  # Maximum pages to process from RFP
    "max_chars": 50000,  # Max characters from RFP before truncation (~12K tokens)
    # ==================== DynamoDB Prompt Lookup ====================
    "section": "proposal_writer",  # Top-level section
    "sub_section": "step-1",  # Step identifier
    "category": "RFP Analysis",  # Prompt category filter
}
