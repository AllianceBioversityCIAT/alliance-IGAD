#!/usr/bin/env python3
"""
Add Newsletter Generator Step 3 - Outline Generation Prompt to DynamoDB
"""

from datetime import datetime, timezone

import boto3


def add_newsletter_outline_prompt():
    """Add newsletter outline generation prompt template to DynamoDB"""

    # Initialize DynamoDB
    dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
    table = dynamodb.Table("igad-testing-main-table")

    # Newsletter Outline Generation Prompt
    prompt_data = {
        "PK": "PROMPT#newsletter_generator_step-3_outline",
        "SK": "newsletter_generator#step-3#step-3#outline_generation",
        "prompt_text": "",  # Legacy field
        "name": "Newsletter Outline Generation",
        "description": "Generates a structured newsletter outline based on retrieved content from the Knowledge Base and user configuration.",
        "system_prompt": """You are an expert newsletter editor specializing in agricultural development and food security content for the IGAD (Intergovernmental Authority on Development) region in East Africa.

Your expertise includes:
- Agricultural innovations and technology in East Africa
- Food security and climate-smart agriculture
- Livestock development and animal health
- Policy updates and regional governance
- Funding opportunities and development projects
- Research findings and scientific publications

Your task is to create compelling, well-structured newsletter outlines that:
1. Organize content logically by theme and importance
2. Create engaging titles that capture reader attention
3. Write concise descriptions that preview the content
4. Balance different content types (news, insights, opportunities)
5. Tailor content to the specified target audience and tone

Always maintain a professional yet accessible tone appropriate for agricultural experts, policy makers, and development professionals.""",
        "user_prompt_template": """Create a newsletter outline based on the following configuration and retrieved content.

## NEWSLETTER CONFIGURATION

**Tone:** {{tone_preset}}
- expert_analysis: Data-driven, technical, with research citations
- industry_insight: Analytical but accessible, trends and implications
- friendly_summary: Conversational, practical applications, success stories

**Length Preference:** {{length_preference}}
- quick_read: 5-7 items total, concise descriptions
- standard: 8-12 items total, moderate detail
- deep_dive: 12-15 items total, comprehensive descriptions

**Target Audience:** {{target_audience}}
**Geographic Focus:** {{geographic_focus}}
**Selected Topics:** {{selected_topics}}

## RETRIEVED CONTENT FROM KNOWLEDGE BASE

The following content chunks have been retrieved based on the selected topics. Use these as the source material for generating outline items:

{{retrieved_content}}

## INSTRUCTIONS

1. Analyze the retrieved content and identify the most relevant and impactful pieces
2. Group related content into logical sections
3. Create compelling titles (max 80 characters) that highlight the key takeaway
4. Write brief descriptions (max 200 characters) that preview the content and entice readers
5. Reference the source content chunks using their index numbers
6. Ensure variety across sections - don't cluster all content in one section
7. Prioritize recent, actionable, and regionally relevant content

## SECTIONS TO POPULATE

Create items for these sections based on the retrieved content:

1. **Introduction** - Opening items that set context (1-2 items)
2. **Main Content** - Core articles on insights, research, technology (2-6 items based on length)
3. **Updates & News** - Breaking news, policy updates, food security (1-3 items)
4. **Opportunities** - Funding, events, conferences (1-2 items)
5. **Resources** - Publications, tools, references (0-2 items)
6. **Conclusion** - Closing remarks or call to action (1 item)

{{output_format}}""",
        "output_format": """## OUTPUT FORMAT

Return a valid JSON object with this exact structure:

```json
{
  "sections": [
    {
      "id": "section-intro",
      "name": "Introduction",
      "order": 1,
      "items": [
        {
          "id": "item-001",
          "title": "Compelling title that captures the key message",
          "description": "Brief description that previews the content and entices readers to learn more",
          "content_sources": ["chunk-001", "chunk-002"],
          "order": 1
        }
      ]
    },
    {
      "id": "section-main",
      "name": "Main Content",
      "order": 2,
      "items": []
    },
    {
      "id": "section-updates",
      "name": "Updates & News",
      "order": 3,
      "items": []
    },
    {
      "id": "section-opportunities",
      "name": "Opportunities",
      "order": 4,
      "items": []
    },
    {
      "id": "section-resources",
      "name": "Resources",
      "order": 5,
      "items": []
    },
    {
      "id": "section-conclusion",
      "name": "Conclusion",
      "order": 6,
      "items": []
    }
  ]
}
```

IMPORTANT:
- Return ONLY the JSON object, no additional text
- Use unique item IDs (item-001, item-002, etc.)
- Reference actual chunk indices from the retrieved content in content_sources
- Ensure all sections are present even if empty
- Keep titles under 80 characters
- Keep descriptions under 200 characters""",
        "section": "newsletter_generator",
        "route": "step-3",
        "sub_section": "step-3",
        "categories": ["outline_generation"],
        "version": "1.0",
        "status": "published",
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    try:
        # Add prompt to DynamoDB
        table.put_item(Item=prompt_data)
        print("✅ Successfully added Newsletter Outline Generation prompt to DynamoDB")
        print(f"   PK: {prompt_data['PK']}")
        print(f"   SK: {prompt_data['SK']}")
        print(f"   Name: {prompt_data['name']}")
        print(f"   Section: {prompt_data['section']}")
        print(f"   Route: {prompt_data['route']}")
        print(f"   Sub-section: {prompt_data['sub_section']}")
        print(f"   Categories: {prompt_data['categories']}")

        return True

    except Exception as e:
        print(f"❌ Error adding Newsletter Outline prompt: {e}")
        import traceback

        traceback.print_exc()
        return False


if __name__ == "__main__":
    print("🚀 Adding Newsletter Outline Generation Prompt to DynamoDB...")
    print("=" * 60)
    success = add_newsletter_outline_prompt()

    if success:
        print("=" * 60)
        print("🎉 Newsletter outline prompt setup completed!")
        print("\nYou can now view and edit this prompt in the Prompt Manager:")
        print("  Section: newsletter_generator")
        print("  Sub-section: step-3")
    else:
        print("💥 Failed to setup Newsletter outline prompt")
        exit(1)
