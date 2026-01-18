"""
Proposal Document Generation Configuration

This module contains configuration settings for generating refined proposal
documents based on AI feedback and user comments.

The Proposal Document Generation uses AI to:
- Apply section-by-section AI feedback
- Incorporate user comments and guidance
- Preserve structure while improving content
- Maintain consistency with RFP requirements

AI Parameters:
    model: AWS Bedrock model ID for Claude
    max_tokens: Maximum tokens for Bedrock response (16000 for full proposal)
    temperature: Sampling temperature (0.2 for consistent outputs)
    top_p: Nucleus sampling parameter
    top_k: Top-k sampling parameter

Processing Settings:
    timeout: Maximum processing time in seconds
    max_retries: Maximum retry attempts on failure

DynamoDB Prompt Lookup:
    section: Top-level section key ("proposal_writer")
    sub_section: Step identifier ("step-4")
    category: Prompt category filter ("Proposal Regeneration")

Usage:
    from app.tools.proposal_writer.proposal_document_generation.config import (
        PROPOSAL_DOCUMENT_GENERATION_SETTINGS
    )
"""

PROPOSAL_DOCUMENT_GENERATION_SETTINGS = {
    # ==================== AI Model Configuration ====================
    "model": "us.anthropic.claude-sonnet-4-20250514-v1:0",  # Claude Sonnet 4
    "max_tokens": 16000,  # Maximum tokens for response (~12,000 words)
    "temperature": 0.2,  # Low temperature for consistent, conservative refinement
    "top_p": 0.9,  # Nucleus sampling
    "top_k": 250,  # Top-k sampling
    # ==================== Processing Settings ====================
    "timeout": 600,  # Processing timeout (10 minutes for full proposal)
    "max_retries": 3,  # Maximum retry attempts on failure
    # ==================== DynamoDB Prompt Lookup ====================
    "section": "proposal_writer",  # Top-level section
    "sub_section": "step-4",  # Step identifier
    "category": "Proposal Regeneration",  # Prompt category filter
}
