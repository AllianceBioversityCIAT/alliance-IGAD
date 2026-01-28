#!/usr/bin/env python3
"""
Add Newsletter Generator Step 4 - Draft Generation Prompt to DynamoDB
"""

from datetime import datetime, timezone

import boto3


def add_newsletter_draft_prompt():
    """Add newsletter draft generation prompt template to DynamoDB"""

    # Initialize DynamoDB
    dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
    table = dynamodb.Table("igad-testing-main-table")

    # Newsletter Draft Generation Prompt
    prompt_data = {
        "PK": "PROMPT#newsletter_generator_step-4_draft",
        "SK": "newsletter_generator#step-4#step-4#draft_generation",
        "prompt_text": "",  # Legacy field
        "name": "Newsletter Draft Generation",
        "description": "Generates complete, publication-ready newsletter content from an outline. Transforms outline items into full sections with consistent tone and formatting.",
        "system_prompt": """You are an expert newsletter writer specializing in agricultural development and food security content for the IGAD (Intergovernmental Authority on Development) region in East Africa.

Your expertise includes:
- Writing engaging, informative content for diverse audiences
- Maintaining consistent tone and style across sections
- Transforming brief outlines into compelling narratives
- Creating content that balances technical accuracy with accessibility
- Crafting calls-to-action and engaging conclusions

Your task is to transform a newsletter outline into complete, publication-ready content that:
1. Expands outline items into fully developed paragraphs
2. Maintains the specified tone throughout all sections
3. Includes relevant context and details from source materials
4. Uses proper formatting (headers, paragraphs, lists where appropriate)
5. Flows naturally from section to section
6. Engages readers from the introduction through the conclusion

Always write content that is:
- Accurate and well-researched
- Engaging and reader-friendly
- Properly structured with clear headings
- Appropriate for email newsletter format
- Action-oriented where relevant""",
        "user_prompt_template": """Transform the following newsletter outline into complete, publication-ready content.

## NEWSLETTER CONFIGURATION

**Title:** {{title}}
**Tone:** {{tone_preset}}
- expert_analysis: Formal, data-driven with technical terminology and research citations
- industry_insight: Professional but accessible, focusing on trends and implications
- friendly_summary: Conversational, using analogies and practical applications

**Length Preference:** {{length_preference}}
- quick_read: 400-600 words total, concise and focused
- standard: 1000-1500 words total, balanced depth
- deep_dive: 2500-3500 words total, comprehensive coverage

**Target Audience:** {{target_audience}}
**Geographic Focus:** {{geographic_focus}}

## OUTLINE SECTIONS TO EXPAND

{{outline_sections}}

## SOURCE CONTENT FROM KNOWLEDGE BASE

Use this content as reference material to enrich the newsletter:

{{retrieved_content}}

## INSTRUCTIONS

1. Transform each outline section into complete, well-written content
2. Each item in the outline should become at least 1-2 paragraphs
3. Maintain the specified tone consistently across all sections
4. Include relevant details from the source content
5. Use markdown formatting:
   - ## for section titles
   - ### for subsection titles
   - **bold** for emphasis
   - Bullet points for lists
   - Paragraph breaks for readability
6. Create smooth transitions between items and sections
7. Make the Introduction engaging and the Conclusion actionable
8. Match the word count targets for the specified length preference

{{output_format}}""",
        "output_format": """## OUTPUT FORMAT

Return a valid JSON object with this exact structure:

```json
{
  "sections": [
    {
      "id": "draft-section-001",
      "sectionId": "section-intro",
      "title": "Introduction",
      "content": "## Introduction\\n\\nFull markdown content for the introduction section...\\n\\nMultiple paragraphs with proper formatting...",
      "items": [
        {"id": "item-001", "title": "Original outline item title"}
      ],
      "order": 1,
      "isEdited": false
    },
    {
      "id": "draft-section-002",
      "sectionId": "section-main",
      "title": "Main Content",
      "content": "## Main Content\\n\\n### First Topic\\n\\nDetailed content about the first topic...\\n\\n### Second Topic\\n\\nDetailed content about the second topic...",
      "items": [
        {"id": "item-002", "title": "First topic title"},
        {"id": "item-003", "title": "Second topic title"}
      ],
      "order": 2,
      "isEdited": false
    }
  ]
}
```

IMPORTANT:
- Return ONLY the JSON object, no additional text before or after
- Use unique draft section IDs (draft-section-001, draft-section-002, etc.)
- Preserve the original sectionId from the outline (section-intro, section-main, etc.)
- Content should be complete markdown text with proper formatting
- Use \\n for newlines in the JSON string
- Include all outline sections, even if some are brief
- Match items array to the original outline items for traceability""",
        "section": "newsletter_generator",
        "route": "step-4",
        "sub_section": "step-4",
        "categories": ["draft_generation"],
        "version": "1.0",
        "status": "published",
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    try:
        # Add prompt to DynamoDB
        table.put_item(Item=prompt_data)
        print("✅ Successfully added Newsletter Draft Generation prompt to DynamoDB")
        print(f"   PK: {prompt_data['PK']}")
        print(f"   SK: {prompt_data['SK']}")
        print(f"   Name: {prompt_data['name']}")
        print(f"   Section: {prompt_data['section']}")
        print(f"   Route: {prompt_data['route']}")
        print(f"   Sub-section: {prompt_data['sub_section']}")
        print(f"   Categories: {prompt_data['categories']}")

        return True

    except Exception as e:
        print(f"❌ Error adding Newsletter Draft prompt: {e}")
        import traceback

        traceback.print_exc()
        return False


if __name__ == "__main__":
    print("🚀 Adding Newsletter Draft Generation Prompt to DynamoDB...")
    print("=" * 60)
    success = add_newsletter_draft_prompt()

    if success:
        print("=" * 60)
        print("🎉 Newsletter draft prompt setup completed!")
        print("\nYou can now view and edit this prompt in the Prompt Manager:")
        print("  Section: newsletter_generator")
        print("  Sub-section: step-4")
    else:
        print("💥 Failed to setup Newsletter draft prompt")
        exit(1)
