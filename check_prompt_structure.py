#!/usr/bin/env python3
"""
Script to check the structure of prompts in DynamoDB
"""
import boto3
import json
from boto3.dynamodb.conditions import Key

# Initialize DynamoDB
dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
table = dynamodb.Table('IGADPromptsTable')

print("🔍 Scanning DynamoDB for PROMPT items...\n")

# Scan for all items that start with PROMPT#
response = table.scan()

prompts_found = []
for item in response.get('Items', []):
    if item.get('PK', '').startswith('PROMPT#'):
        prompts_found.append(item)

print(f"📊 Found {len(prompts_found)} prompt(s)\n")

# Print details of each prompt
for i, prompt in enumerate(prompts_found, 1):
    print(f"{'='*80}")
    print(f"PROMPT #{i}")
    print(f"{'='*80}")
    print(f"PK: {prompt.get('PK')}")
    print(f"SK: {prompt.get('SK')}")
    print(f"\nMetadata:")
    print(f"  - Section: {prompt.get('section')}")
    print(f"  - Sub-section: {prompt.get('sub_section')}")
    print(f"  - Category: {prompt.get('category')}")
    print(f"  - Status: {prompt.get('status')}")
    
    print(f"\nAll Fields in this item:")
    for key, value in sorted(prompt.items()):
        if key not in ['PK', 'SK', 'section', 'sub_section', 'category', 'status']:
            if isinstance(value, str) and len(value) > 100:
                print(f"  - {key}: {len(value)} characters")
                print(f"    Preview: {value[:100]}...")
            else:
                print(f"  - {key}: {value}")
    
    print("\n")

if not prompts_found:
    print("❌ No prompts found in DynamoDB")
    print("\nTrying to list all items to see table structure...")
    response = table.scan(Limit=5)
    print(f"\nSample items in table:")
    for item in response.get('Items', []):
        print(f"\nPK: {item.get('PK')}")
        print(f"SK: {item.get('SK')}")
        print(f"Type: {item.get('PK', '').split('#')[0]}")
