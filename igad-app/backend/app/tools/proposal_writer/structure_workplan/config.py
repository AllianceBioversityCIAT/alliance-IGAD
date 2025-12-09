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

Settings:
    max_sections: Maximum number of sections allowed in proposal outline
    timeout: Maximum processing time in seconds before timeout
    model: AWS Bedrock model ID for Claude Sonnet 4.5
    max_tokens: Maximum tokens for Bedrock response (~12k words)
    temperature: Sampling temperature (0.0-1.0, lower = more deterministic)
    section: DynamoDB section key for prompt lookup
    sub_section: DynamoDB sub-section key for prompt lookup
    category: DynamoDB category filter for prompt lookup

Usage:
    from app.tools.proposal_writer.structure_workplan.config import STRUCTURE_WORKPLAN_SETTINGS

    model = STRUCTURE_WORKPLAN_SETTINGS["model"]
    max_tokens = STRUCTURE_WORKPLAN_SETTINGS["max_tokens"]
"""

STRUCTURE_WORKPLAN_SETTINGS = {
    # Analysis constraints
    "max_sections": 30,           # Maximum proposal sections allowed
    "timeout": 300,               # Processing timeout (5 minutes)

    # Bedrock configuration
    "model": "us.anthropic.claude-sonnet-4-5-20250514-v1:0",  # Claude Sonnet 4.5
    "max_tokens": 16000,          # ~12,000 words of output
    "temperature": 0.3,           # Balanced creativity (0.0 = deterministic, 1.0 = creative)

    # DynamoDB prompt lookup keys
    "section": "proposal_writer",      # Top-level section
    "sub_section": "step-3",           # Step identifier
    "category": "Initial Proposal"     # Prompt category filter
}
