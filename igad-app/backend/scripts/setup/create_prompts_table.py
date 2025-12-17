#!/usr/bin/env python3
import sys

import boto3
from botocore.exceptions import ClientError


def create_prompts_table():
    dynamodb = boto3.client("dynamodb")
    table_name = "igad-prompts"

    try:
        try:
            dynamodb.describe_table(TableName=table_name)
            print(f"✅ Table {table_name} already exists")
            return True
        except ClientError as e:
            if e.response["Error"]["Code"] != "ResourceNotFoundException":
                raise

        table_definition = {
            "TableName": table_name,
            "KeySchema": [
                {"AttributeName": "PK", "KeyType": "HASH"},  # Partition key
                {"AttributeName": "SK", "KeyType": "RANGE"},  # Sort key
            ],
            "AttributeDefinitions": [
                {"AttributeName": "PK", "AttributeType": "S"},
                {"AttributeName": "SK", "AttributeType": "S"},
                {"AttributeName": "section", "AttributeType": "S"},
                {"AttributeName": "updated_at", "AttributeType": "S"},
            ],
            "BillingMode": "PAY_PER_REQUEST",
            "GlobalSecondaryIndexes": [
                {
                    "IndexName": "GSI_Section_Status",
                    "KeySchema": [
                        {"AttributeName": "section", "KeyType": "HASH"},
                        {"AttributeName": "updated_at", "KeyType": "RANGE"},
                    ],
                    "Projection": {"ProjectionType": "ALL"},
                }
            ],
            "StreamSpecification": {"StreamEnabled": False},
            "SSESpecification": {"Enabled": True},
            "Tags": [
                {"Key": "Project", "Value": "igad-innovation-hub"},
                {"Key": "Component", "Value": "prompt-manager"},
                {"Key": "Environment", "Value": "testing"},
            ],
        }

        dynamodb.create_table(**table_definition)
        waiter = dynamodb.get_waiter("table_exists")
        waiter.wait(TableName=table_name, WaiterConfig={"Delay": 5, "MaxAttempts": 20})
        print(f"✅ Table {table_name} created successfully!")
        return True

    except ClientError as e:
        print(f"❌ Error creating table: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False


def create_audit_logs_table():
    dynamodb = boto3.client("dynamodb")
    table_name = "igad-audit-logs"

    try:
        try:
            dynamodb.describe_table(TableName=table_name)
            print(f"✅ Table {table_name} already exists")
            return True
        except ClientError as e:
            if e.response["Error"]["Code"] != "ResourceNotFoundException":
                raise

        table_definition = {
            "TableName": table_name,
            "KeySchema": [{"AttributeName": "PK", "KeyType": "HASH"}],
            "AttributeDefinitions": [{"AttributeName": "PK", "AttributeType": "S"}],
            "BillingMode": "PAY_PER_REQUEST",
            "Tags": [
                {"Key": "Project", "Value": "igad-innovation-hub"},
                {"Key": "Component", "Value": "audit-logs"},
                {"Key": "Environment", "Value": "testing"},
            ],
        }

        dynamodb.create_table(**table_definition)
        waiter = dynamodb.get_waiter("table_exists")
        waiter.wait(TableName=table_name)
        print(f"✅ Audit logs table {table_name} created")
        return True
    except ClientError as e:
        print(f"❌ Error creating audit logs table: {e}")
        return False


def main():
    if not create_prompts_table():
        sys.exit(1)
    create_audit_logs_table()
    print("✅ DynamoDB setup completed!")


if __name__ == "__main__":
    main()
