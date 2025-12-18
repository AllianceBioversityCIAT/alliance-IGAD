#!/usr/bin/env python3

import boto3
import json
from datetime import datetime
import os

def backup_all_prompts_paginated():
    # Initialize DynamoDB client
    dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
    table = dynamodb.Table('igad-testing-main-table')
    
    all_items = []
    
    # Scan with pagination
    scan_kwargs = {
        'FilterExpression': boto3.dynamodb.conditions.Attr('SK').begins_with('version#')
    }
    
    print("🔍 Escaneando DynamoDB con paginación...")
    
    while True:
        response = table.scan(**scan_kwargs)
        items = response['Items']
        all_items.extend(items)
        
        print(f"   Página procesada: {len(items)} items")
        
        # Check if there are more items to scan
        if 'LastEvaluatedKey' not in response:
            break
            
        # Set the starting point for the next scan
        scan_kwargs['ExclusiveStartKey'] = response['LastEvaluatedKey']
    
    # Create backup filename with timestamp
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_dir = 'igad-app/backend/backups'
    os.makedirs(backup_dir, exist_ok=True)
    
    backup_file = f'{backup_dir}/prompts_backup_paginated_{timestamp}.json'
    
    # Save to file
    with open(backup_file, 'w', encoding='utf-8') as f:
        json.dump(all_items, f, indent=2, ensure_ascii=False, default=str)
    
    print(f"\n✅ Backup paginado creado: {backup_file}")
    print(f"📊 Total prompts respaldados: {len(all_items)}")
    
    # Show summary by section and name
    sections = {}
    names = []
    for prompt in all_items:
        section = prompt.get('section', 'unknown')
        sections[section] = sections.get(section, 0) + 1
        names.append(prompt.get('name', 'Sin nombre'))
    
    print("\n📋 Prompts por sección:")
    for section, count in sections.items():
        print(f"  - {section}: {count}")
    
    print(f"\n📝 Lista de prompts ({len(names)} total):")
    for i, name in enumerate(sorted(names), 1):
        print(f"  {i:2d}. {name}")
    
    return len(all_items)

if __name__ == "__main__":
    total = backup_all_prompts_paginated()
    print(f"\n🎉 Backup completado exitosamente con {total} prompts")
