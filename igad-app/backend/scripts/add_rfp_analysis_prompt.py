#!/usr/bin/env python3
"""
Add RFP Analysis Prompt to DynamoDB with correct structure
"""

from datetime import datetime

import boto3


def add_rfp_analysis_prompt():
    """Add RFP analysis prompt template to DynamoDB"""

    # Initialize DynamoDB
    dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
    table = dynamodb.Table("igad-testing-main-table")

    # RFP Analysis Prompt with correct structure
    prompt_data = {
        "PK": "PROMPT#proposal_writer_step-1_rfp",
        "SK": "proposal_writer#step-1#step-1#RFP / Call for Proposals",
        "prompt_text": "",  # Legacy field
        "system_prompt": """You are an expert proposal analyst specializing in RFP (Request for Proposals) analysis for international development projects, particularly in the Horn of Africa region and IGAD member states. Your role is to analyze RFP documents and extract key information that will help proposal writers understand requirements and develop competitive proposals.

You have extensive experience with:
- IGAD regional priorities and strategic frameworks
- Livestock development and agricultural projects
- Climate security and resilience initiatives
- Cross-border collaboration requirements
- Donor preferences and evaluation methodologies
- Technical proposal requirements and compliance standards

Focus on practical, actionable insights that will directly support proposal development.""",
        "user_prompt_template": """Analyze the following RFP document and extract key information for proposal development. Provide a comprehensive analysis focusing on:

**1. PROJECT REQUIREMENTS & OBJECTIVES**
- Main project goals and expected outcomes
- Technical requirements and implementation approach
- Geographic scope and target beneficiaries
- Innovation and sustainability requirements

**2. EVALUATION CRITERIA & SCORING**
- Detailed scoring methodology and weightings
- Technical evaluation criteria
- Financial evaluation requirements
- Past performance and experience requirements

**3. SUBMISSION REQUIREMENTS**
- Proposal format and structure requirements
- Mandatory documents and attachments
- Submission deadlines and process
- Page limits and formatting specifications

**4. BUDGET & FUNDING DETAILS**
- Total funding available and budget ranges
- Cost-sharing or matching fund requirements
- Eligible and ineligible costs
- Budget categories and restrictions

**5. ELIGIBILITY & PARTNERSHIP**
- Organizational eligibility criteria
- Partnership and consortium requirements
- Local partner requirements
- Capacity and experience thresholds

**6. IGAD REGIONAL PRIORITIES**
- Alignment with IGAD strategic objectives
- Cross-border collaboration requirements
- Regional integration components
- Horn of Africa specific considerations

**7. COMPETITIVE ADVANTAGES NEEDED**
- Key differentiators for winning proposals
- Common weaknesses to avoid
- Strengths to emphasize
- Risk mitigation strategies

**RFP Document Content:**
{{rfp_content}}

**ANALYSIS OUTPUT:**
Provide a structured analysis with specific, actionable recommendations for proposal development. Include direct quotes from the RFP where relevant and highlight any unclear requirements that need clarification from the donor.""",
        "section": "proposal_writer",
        "route": "step-1",
        "sub_section": "step-1",
        "categories": ["RFP / Call for Proposals"],
        "version": "1.0",
        "status": "published",
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
    }

    try:
        # Add prompt to DynamoDB
        table.put_item(Item=prompt_data)
        print("✅ Successfully added RFP analysis prompt to DynamoDB")
        print(f"   PK: {prompt_data['PK']}")
        print(f"   SK: {prompt_data['SK']}")
        print(f"   Section: {prompt_data['section']}")
        print(f"   Route: {prompt_data['route']}")
        print(f"   Sub-section: {prompt_data['sub_section']}")
        print(f"   Categories: {prompt_data['categories']}")

        return True

    except Exception as e:
        print(f"❌ Error adding RFP analysis prompt: {e}")
        return False


if __name__ == "__main__":
    print("🚀 Adding RFP Analysis Prompt to DynamoDB...")
    success = add_rfp_analysis_prompt()

    if success:
        print("🎉 RFP analysis prompt setup completed!")
    else:
        print("💥 Failed to setup RFP analysis prompt")
        exit(1)
