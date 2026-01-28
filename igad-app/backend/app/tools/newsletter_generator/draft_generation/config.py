"""
Draft Generation Configuration

Settings for Step 4 newsletter draft generation.

The draft generation uses AI to:
- Transform outline items into full newsletter sections
- Generate complete, publication-ready content
- Maintain consistent tone and style across sections
- Include proper formatting for email/HTML output

AI Parameters:
    model: AWS Bedrock model ID for Claude Sonnet 4
    max_tokens: Maximum tokens for response (higher for full content)
    temperature: Moderate for creative but coherent content

DynamoDB Prompt Lookup:
    section: newsletter_generator
    sub_section: step-4
    category: draft_generation
"""

DRAFT_GENERATION_SETTINGS = {
    # AI Model Configuration
    "model": "us.anthropic.claude-sonnet-4-20250514-v1:0",
    "max_tokens": 16000,  # Higher for full newsletter content
    "temperature": 0.5,  # Moderate for creative but coherent output
    # Processing Settings
    "timeout": 180,  # 3 minutes for longer content
    # DynamoDB Prompt Lookup
    "section": "newsletter_generator",
    "sub_section": "step-4",
    "category": "draft_generation",
}

# AI Autocomplete Settings (for inline editing)
AI_COMPLETE_SETTINGS = {
    "model": "us.anthropic.claude-sonnet-4-20250514-v1:0",
    "max_tokens": 500,
    "temperature": 0.7,  # Slightly higher for creative suggestions
}

# Word count targets by length preference
LENGTH_WORD_TARGETS = {
    "quick_read": {
        "total": (400, 600),
        "section-intro": (50, 100),
        "section-main": (200, 350),
        "section-updates": (75, 100),
        "section-opportunities": (50, 75),
        "section-resources": (0, 50),
        "section-conclusion": (30, 50),
    },
    "standard": {
        "total": (1000, 1500),
        "section-intro": (75, 150),
        "section-main": (500, 800),
        "section-updates": (150, 250),
        "section-opportunities": (100, 150),
        "section-resources": (50, 100),
        "section-conclusion": (50, 75),
    },
    "deep_dive": {
        "total": (2500, 3500),
        "section-intro": (150, 250),
        "section-main": (1500, 2000),
        "section-updates": (400, 600),
        "section-opportunities": (200, 300),
        "section-resources": (150, 200),
        "section-conclusion": (100, 150),
    },
}

# Export format configurations
EXPORT_FORMATS = {
    "html": {
        "extension": ".html",
        "mime_type": "text/html",
        "template": "email_newsletter",
    },
    "markdown": {
        "extension": ".md",
        "mime_type": "text/markdown",
        "template": None,
    },
    "text": {
        "extension": ".txt",
        "mime_type": "text/plain",
        "template": None,
    },
}
