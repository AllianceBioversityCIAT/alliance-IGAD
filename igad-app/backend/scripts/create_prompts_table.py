#!/usr/bin/env python3
"""
Script to create DynamoDB table for Prompt Manager
Run this script to set up the prompts table in your AWS account
"""

import boto3
import sys
from botocore.exceptions import ClientError

def create_prompts_table():
    """Create the igad-prompts DynamoDB table"""
    
    dynamodb = boto3.client('dynamodb')
    table_name = 'igad-prompts'
    
    try:
        # Check if table already exists
        try:
            response = dynamodb.describe_table(TableName=table_name)
            print(f"✅ Table {table_name} already exists")
            return True
        except ClientError as e:
            if e.response['Error']['Code'] != 'ResourceNotFoundException':
                raise
        
        # Create table
        print(f"🔄 Creating table {table_name}...")
        
        table_definition = {
            'TableName': table_name,
            'KeySchema': [
                {
                    'AttributeName': 'PK',
                    'KeyType': 'HASH'  # Partition key
                },
                {
                    'AttributeName': 'SK',
                    'KeyType': 'RANGE'  # Sort key
                }
            ],
            'AttributeDefinitions': [
                {
                    'AttributeName': 'PK',
                    'AttributeType': 'S'
                },
                {
                    'AttributeName': 'SK',
                    'AttributeType': 'S'
                },
                {
                    'AttributeName': 'section',
                    'AttributeType': 'S'
                },
                {
                    'AttributeName': 'status',
                    'AttributeType': 'S'
                },
                {
                    'AttributeName': 'updated_at',
                    'AttributeType': 'S'
                }
            ],
            'BillingMode': 'ON_DEMAND',
            'GlobalSecondaryIndexes': [
                {
                    'IndexName': 'GSI_Section_Status',
                    'KeySchema': [
                        {
                            'AttributeName': 'section',
                            'KeyType': 'HASH'
                        },
                        {
                            'AttributeName': 'updated_at',
                            'KeyType': 'RANGE'
                        }
                    ],
                    'Projection': {
                        'ProjectionType': 'ALL'
                    }
                }
            ],
            'StreamSpecification': {
                'StreamEnabled': False
            },
            'SSESpecification': {
                'Enabled': True
            },
            'PointInTimeRecoverySpecification': {
                'PointInTimeRecoveryEnabled': True
            },
            'Tags': [
                {
                    'Key': 'Project',
                    'Value': 'igad-innovation-hub'
                },
                {
                    'Key': 'Component',
                    'Value': 'prompt-manager'
                },
                {
                    'Key': 'Environment',
                    'Value': 'testing'
                }
            ]
        }
        
        response = dynamodb.create_table(**table_definition)
        
        print(f"🔄 Waiting for table {table_name} to be created...")
        
        # Wait for table to be created
        waiter = dynamodb.get_waiter('table_exists')
        waiter.wait(
            TableName=table_name,
            WaiterConfig={
                'Delay': 5,
                'MaxAttempts': 20
            }
        )
        
        print(f"✅ Table {table_name} created successfully!")
        print(f"📊 Table ARN: {response['TableDescription']['TableArn']}")
        
        return True
        
    except ClientError as e:
        print(f"❌ Error creating table: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

def create_audit_logs_table():
    """Create the igad-audit-logs DynamoDB table (optional)"""
    
    dynamodb = boto3.client('dynamodb')
    table_name = 'igad-audit-logs'
    
    try:
        # Check if table already exists
        try:
            response = dynamodb.describe_table(TableName=table_name)
            print(f"✅ Table {table_name} already exists")
            return True
        except ClientError as e:
            if e.response['Error']['Code'] != 'ResourceNotFoundException':
                raise
        
        print(f"🔄 Creating audit logs table {table_name}...")
        
        table_definition = {
            'TableName': table_name,
            'KeySchema': [
                {
                    'AttributeName': 'PK',
                    'KeyType': 'HASH'  # Partition key: log#{timestamp}
                }
            ],
            'AttributeDefinitions': [
                {
                    'AttributeName': 'PK',
                    'AttributeType': 'S'
                }
            ],
            'BillingMode': 'ON_DEMAND',
            'TimeToLiveSpecification': {
                'AttributeName': 'ttl',
                'Enabled': True
            },
            'Tags': [
                {
                    'Key': 'Project',
                    'Value': 'igad-innovation-hub'
                },
                {
                    'Key': 'Component',
                    'Value': 'audit-logs'
                },
                {
                    'Key': 'Environment',
                    'Value': 'testing'
                }
            ]
        }
        
        response = dynamodb.create_table(**table_definition)
        
        # Wait for table to be created
        waiter = dynamodb.get_waiter('table_exists')
        waiter.wait(TableName=table_name)
        
        print(f"✅ Audit logs table {table_name} created successfully!")
        
        return True
        
    except ClientError as e:
        print(f"❌ Error creating audit logs table: {e}")
        return False

def main():
    """Main function"""
    print("🚀 Setting up DynamoDB tables for Prompt Manager...")
    print("📍 Region: us-east-1")
    print("👤 Profile: IBD-DEV")
    print()
    
    # Create main prompts table
    if not create_prompts_table():
        sys.exit(1)
    
    print()
    
    # Create audit logs table (optional)
    create_audit_logs_table()
    
    print()
    print("🎉 DynamoDB setup completed!")
    print()
    print("Next steps:")
    print("1. Start the backend server: uvicorn app.main:app --reload")
    print("2. Test the admin endpoints at http://localhost:8000/docs")
    print("3. Access Prompt Manager at http://localhost:3001/admin/prompt-manager")

if __name__ == "__main__":
    main()
