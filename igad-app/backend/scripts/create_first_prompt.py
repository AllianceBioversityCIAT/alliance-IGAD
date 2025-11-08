#!/usr/bin/env python3
"""
Script to create the first prompt in DynamoDB for testing
"""

import boto3
import uuid
from datetime import datetime

def create_first_prompt():
    """Create the first prompt for Problem Statement section"""
    
    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table('igad-testing-main-table')  # Use existing table
    
    # Generate prompt data
    prompt_id = str(uuid.uuid4())
    timestamp = datetime.utcnow().isoformat() + 'Z'
    
    prompt_item = {
        'PK': f'prompt#{prompt_id}',
        'SK': 'version#1',
        'id': prompt_id,
        'name': 'Problem Statement Generator',
        'section': 'problem_statement',
        'route': '/proposal-writer/step-1',
        'tags': ['analysis', 'research', 'problem-identification'],
        'version': 1,
        'status': 'published',
        'system_prompt': '''You are an expert research analyst and proposal writer specializing in development projects for the IGAD (Intergovernmental Authority on Development) region in East Africa. Your role is to help create compelling and well-structured problem statements for development proposals.

Your expertise includes:
- Understanding regional challenges in East Africa (drought, food security, conflict, climate change)
- Development project methodology and best practices
- Stakeholder analysis and community needs assessment
- Evidence-based problem identification and articulation

Guidelines:
- Use clear, professional language appropriate for donor audiences
- Base recommendations on evidence and data when possible
- Consider regional context and cultural sensitivity
- Focus on root causes rather than just symptoms
- Ensure problems are specific, measurable, and actionable''',
        'user_prompt_template': '''Please help me create a comprehensive problem statement for a development proposal with the following details:

**Project Context:**
- Topic/Focus Area: {{topic}}
- Target Region/Country: {{region}}
- Target Beneficiaries: {{beneficiaries}}
- Proposed Duration: {{duration}}

**Additional Context:**
{{additional_context}}

Please generate a problem statement that includes:

1. **Problem Description**: Clear articulation of the main development challenge
2. **Evidence & Data**: Supporting statistics, studies, or evidence (use placeholders if specific data not provided)
3. **Root Causes**: Underlying factors contributing to the problem
4. **Impact Analysis**: Who is affected and how (social, economic, environmental impacts)
5. **Urgency & Relevance**: Why this problem needs to be addressed now
6. **Geographic Scope**: Specific areas or communities affected
7. **Stakeholder Impact**: How different groups are affected differently

Format the response as a well-structured problem statement suitable for inclusion in a development proposal document. Use professional language appropriate for donor audiences and ensure the statement is compelling and evidence-based.''',
        'few_shot': [
            {
                'input': 'Topic: Food Security, Region: Northern Kenya, Beneficiaries: Pastoralist communities, Duration: 3 years',
                'output': '''**Problem Statement: Food Insecurity Among Pastoralist Communities in Northern Kenya**

Northern Kenya faces a persistent food security crisis that affects over 1.2 million pastoralist community members across Turkana, Marsabit, and Wajir counties. Current data indicates that 68% of households in these regions experience severe food insecurity, with acute malnutrition rates among children under five reaching 15.3% - well above the WHO emergency threshold of 15%.

**Root Causes:**
The food security crisis stems from multiple interconnected factors: (1) Recurrent droughts occurring every 2-3 years have disrupted traditional grazing patterns and reduced livestock productivity by 40% over the past decade; (2) Limited access to markets due to poor infrastructure isolates communities from food distribution networks; (3) Inadequate water resources force communities to travel up to 20km daily for water access; (4) Climate change has altered rainfall patterns, making traditional seasonal predictions unreliable.

**Impact Analysis:**
Women and children bear the disproportionate burden of this crisis. Women spend 6-8 hours daily collecting water, limiting their participation in income-generating activities. Children, particularly girls, have school attendance rates of only 32% due to hunger and the need to assist with water collection. Livestock mortality rates of 60% during drought periods have decimated the primary livelihood source for 85% of households.

**Urgency and Relevance:**
Without immediate intervention, the situation will deteriorate further as climate projections indicate increased frequency and severity of droughts. The current La Niña weather pattern threatens to extend the ongoing drought into 2024, potentially pushing an additional 300,000 people into emergency food insecurity levels.'''
            }
        ],
        'context': {
            'persona': 'Expert development proposal writer and regional analyst',
            'tone': 'Professional, evidence-based, compelling',
            'constraints': 'Maximum 800 words, include specific data points, focus on IGAD region context',
            'guardrails': 'Avoid speculation without evidence, ensure cultural sensitivity, maintain donor-appropriate language'
        },
        'created_by': 'admin@igad.org',
        'updated_by': 'admin@igad.org',
        'created_at': timestamp,
        'updated_at': timestamp
    }
    
    try:
        # Insert the prompt
        table.put_item(Item=prompt_item)
        
        # Create latest published pointer
        table.put_item(Item={
            'PK': f'prompt#{prompt_id}',
            'SK': 'published#latest',
            'latest_version': 1,
            'updated_at': timestamp
        })
        
        print("✅ First prompt created successfully!")
        print(f"📝 Prompt ID: {prompt_id}")
        print(f"📍 Section: Problem Statement")
        print(f"🔗 Route: /proposal-writer/step-1")
        print(f"📊 Status: Published")
        print(f"🏷️  Tags: analysis, research, problem-identification")
        print()
        print("🎉 You can now test the Prompt Manager at:")
        print("   http://localhost:3001/admin/prompt-manager")
        
        return prompt_id
        
    except Exception as e:
        print(f"❌ Error creating prompt: {e}")
        return None

if __name__ == "__main__":
    print("🚀 Creating first prompt for Prompt Manager...")
    print()
    create_first_prompt()
