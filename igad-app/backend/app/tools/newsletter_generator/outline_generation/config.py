"""
Outline Generation Configuration

Settings for Step 3 newsletter outline generation.

The outline generation uses AI to:
- Analyze retrieved content from Knowledge Base
- Map content to appropriate newsletter sections
- Generate structured outline items with titles and descriptions
- Consider newsletter configuration (tone, audience, length)

AI Parameters:
    model: AWS Bedrock model ID for Claude Sonnet 4
    max_tokens: Maximum tokens for response
    temperature: Lower for structured, consistent output

DynamoDB Prompt Lookup:
    section: newsletter_generator
    sub_section: step-3
    category: outline_generation
"""

OUTLINE_GENERATION_SETTINGS = {
    # AI Model Configuration
    "model": "us.anthropic.claude-sonnet-4-20250514-v1:0",
    "max_tokens": 8000,
    "temperature": 0.3,
    # Processing Settings
    "timeout": 120,  # 2 minutes
    # DynamoDB Prompt Lookup
    "section": "newsletter_generator",
    "sub_section": "step-3",
    "category": "outline_generation",
}

# Section definitions for newsletter outline
NEWSLETTER_SECTIONS = [
    {
        "id": "section-intro",
        "name": "Introduction",
        "order": 1,
        "topic_categories": [],  # All topics can contribute
    },
    {
        "id": "section-main",
        "name": "Main Content",
        "order": 2,
        "topic_categories": [
            "research_findings",
            "technology_innovation",
            "climate_smart",
            "market_access",
            "project_updates",
            "livestock",
        ],
    },
    {
        "id": "section-updates",
        "name": "Updates & News",
        "order": 3,
        "topic_categories": [
            "breaking_news",
            "policy_updates",
            "food_security",
        ],
    },
    {
        "id": "section-opportunities",
        "name": "Opportunities",
        "order": 4,
        "topic_categories": [
            "funding",
            "events",
        ],
    },
    {
        "id": "section-resources",
        "name": "Resources",
        "order": 5,
        "topic_categories": [
            "publications",
        ],
    },
    {
        "id": "section-conclusion",
        "name": "Conclusion",
        "order": 6,
        "topic_categories": [],  # Generated content
    },
]

# Length-based item counts per section
LENGTH_ITEM_COUNTS = {
    "quick_read": {
        "section-intro": 1,
        "section-main": 2,
        "section-updates": 1,
        "section-opportunities": 1,
        "section-resources": 0,
        "section-conclusion": 1,
    },
    "standard": {
        "section-intro": 1,
        "section-main": 4,
        "section-updates": 2,
        "section-opportunities": 2,
        "section-resources": 1,
        "section-conclusion": 1,
    },
    "deep_dive": {
        "section-intro": 1,
        "section-main": 6,
        "section-updates": 3,
        "section-opportunities": 2,
        "section-resources": 2,
        "section-conclusion": 1,
    },
}
