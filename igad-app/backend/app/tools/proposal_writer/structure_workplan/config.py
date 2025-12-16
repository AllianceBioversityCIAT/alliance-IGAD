"""
Structure and Workplan Analysis Configuration

This module contains configuration settings for Step 3 of the Proposal Writer,
which generates proposal structure and workplan based on RFP analysis and
concept evaluation.

The Structure Workplan analysis uses AI to:
- Analyze RFP requirements and concept evaluation
- Generate a tailored proposal structure with sections
- Provide guidance, questions, and HCD notes for each section
- Create a comprehensive workplan for proposal development

AI Parameters:
    model: AWS Bedrock model ID for Claude
    max_tokens: Maximum tokens for Bedrock response
    temperature: Sampling temperature (0.0-1.0)
        - 0.0 = Deterministic, consistent outputs
        - 0.2 = Low creativity, structured analysis (recommended)
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
    max_sections: Maximum number of sections in proposal outline

DynamoDB Prompt Lookup:
    section: Top-level section key
    sub_section: Step identifier
    category: Prompt category filter

Usage:
    from app.tools.proposal_writer.structure_workplan.config import STRUCTURE_WORKPLAN_SETTINGS

    model = STRUCTURE_WORKPLAN_SETTINGS["model"]
    temperature = STRUCTURE_WORKPLAN_SETTINGS["temperature"]
"""

STRUCTURE_WORKPLAN_SETTINGS = {
    # ==================== AI Model Configuration ====================
    "model": "us.anthropic.claude-sonnet-4-20250514-v1:0",  # Claude Sonnet 4
    "max_tokens": 16000,          # Maximum tokens for response (~12,000 words)
    "temperature": 0.2,           # Low temperature for consistent, structured output
    "top_p": 0.9,                 # Nucleus sampling (0.9 = consider top 90% probability mass)
    "top_k": 250,                 # Top-k sampling (consider top 250 tokens)

    # ==================== Processing Settings ====================
    "timeout": 300,               # Processing timeout (5 minutes)
    "max_sections": 30,           # Maximum proposal sections allowed

    # ==================== DynamoDB Prompt Lookup ====================
    "section": "proposal_writer",      # Top-level section
    "sub_section": "step-3",           # Step identifier
    "category": "Initial Proposal"     # Prompt category filter
}
