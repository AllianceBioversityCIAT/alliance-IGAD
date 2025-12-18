"""
Concept Document Generation Configuration

This module contains configuration settings for generating updated concept
documents based on the concept evaluation results.

The Concept Document Generation uses AI to:
- Elaborate on selected sections needing improvement
- Incorporate user feedback and comments
- Generate refined concept document content
- Maintain consistency with RFP requirements

AI Parameters:
    model: AWS Bedrock model ID for Claude
    max_tokens: Maximum tokens for Bedrock response
    temperature: Sampling temperature (0.0-1.0)
        - 0.0 = Deterministic, consistent outputs
        - 0.5 = Balanced creativity for document generation
        - 0.7 = Higher creativity, more varied outputs
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
    max_sections: Maximum sections to generate

DynamoDB Prompt Lookup:
    section: Top-level section key
    sub_section: Step identifier
    category: Prompt category filter

Usage:
    from app.tools.proposal_writer.concept_document_generation.config import CONCEPT_DOCUMENT_GENERATION_SETTINGS

    model = CONCEPT_DOCUMENT_GENERATION_SETTINGS["model"]
    temperature = CONCEPT_DOCUMENT_GENERATION_SETTINGS["temperature"]
"""

CONCEPT_DOCUMENT_GENERATION_SETTINGS = {
    # ==================== AI Model Configuration ====================
    "model": "us.anthropic.claude-sonnet-4-20250514-v1:0",  # Claude Sonnet 4
    "max_tokens": 16000,  # Maximum tokens for response (~12,000 words)
    "temperature": 0.1,  # Balanced temperature for creative document generation
    "top_p": 0.9,  # Nucleus sampling (0.9 = consider top 90% probability mass)
    "top_k": 250,  # Top-k sampling (consider top 250 tokens)
    # ==================== Processing Settings ====================
    "timeout": 300,  # Processing timeout (5 minutes)
    "max_retries": 3,  # Maximum retry attempts on failure
    "max_sections": 20,  # Maximum sections to generate
    # ==================== DynamoDB Prompt Lookup ====================
    "section": "proposal_writer",  # Top-level section
    "sub_section": "step-2",  # Step identifier
    "category": "Document Generation",  # Prompt category filter
}
