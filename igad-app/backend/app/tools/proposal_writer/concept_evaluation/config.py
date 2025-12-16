"""
Concept Evaluation Configuration

This module contains configuration settings for Step 2 of the Proposal Writer,
which evaluates the initial concept against RFP requirements.

The Concept Evaluation analysis uses AI to:
- Assess thematic relevance to donor priorities
- Evaluate geographic and target population alignment
- Analyze methodological approach suitability
- Identify sections needing elaboration
- Provide strategic verdict and recommendations

AI Parameters:
    model: AWS Bedrock model ID for Claude
    max_tokens: Maximum tokens for Bedrock response
    temperature: Sampling temperature (0.0-1.0)
        - 0.0 = Deterministic, consistent outputs
        - 0.3 = Low creativity, factual analysis (recommended for evaluation)
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
    max_sections: Maximum sections to evaluate
    max_chars: Maximum characters from concept document

DynamoDB Prompt Lookup:
    section: Top-level section key
    sub_section: Step identifier
    category: Prompt category filter

Usage:
    from app.tools.proposal_writer.concept_evaluation.config import CONCEPT_EVALUATION_SETTINGS

    model = CONCEPT_EVALUATION_SETTINGS["model"]
    temperature = CONCEPT_EVALUATION_SETTINGS["temperature"]
"""

CONCEPT_EVALUATION_SETTINGS = {
    # ==================== AI Model Configuration ====================
    "model": "us.anthropic.claude-sonnet-4-20250514-v1:0",  # Claude Sonnet 4
    "max_tokens": 15000,          # Maximum tokens for response (~11,000 words)
    "temperature": 0.2,           # Low temperature for consistent evaluation
    "top_p": 0.9,                 # Nucleus sampling (0.9 = consider top 90% probability mass)
    "top_k": 250,                 # Top-k sampling (consider top 250 tokens)

    # ==================== Processing Settings ====================
    "timeout": 300,               # Processing timeout (5 minutes)
    "max_sections": 20,           # Maximum sections to evaluate
    "max_chars": 100000,          # Max characters from concept document (~25K tokens)

    # ==================== DynamoDB Prompt Lookup ====================
    "section": "proposal_writer",      # Top-level section
    "sub_section": "step-1",           # Step identifier (concept eval is part of step 1)
    "category": "Initial Concept"      # Prompt category filter
}
