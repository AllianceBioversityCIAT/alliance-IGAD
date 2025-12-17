#!/usr/bin/env python3
import os

import boto3
from dotenv import load_dotenv

load_dotenv()


def setup_cognito_groups():
    user_pool_id = os.getenv("COGNITO_USER_POOL_ID")
    region = os.getenv("AWS_REGION", "us-east-1")

    if not user_pool_id:
        print("❌ COGNITO_USER_POOL_ID not found in environment variables")
        return

    cognito_client = boto3.client("cognito-idp", region_name=region)

    groups = [
        {
            "GroupName": "admin",
            "Description": "Administrator group with full access",
            "Precedence": 1,
        },
        {
            "GroupName": "editor",
            "Description": "Editor group with limited access",
            "Precedence": 2,
        },
        {"GroupName": "user", "Description": "Standard user group", "Precedence": 3},
    ]

    for group in groups:
        try:
            cognito_client.create_group(UserPoolId=user_pool_id, **group)
            print(f"✅ Created group: {group['GroupName']}")
        except cognito_client.exceptions.GroupExistsException:
            print(f"ℹ️  Group already exists: {group['GroupName']}")
        except Exception as e:
            print(f"❌ Error creating group {group['GroupName']}: {str(e)}")

    # Add test user to admin group
    try:
        users_response = cognito_client.list_users(UserPoolId=user_pool_id)
        for user in users_response.get("Users", []):
            email = None
            for attr in user.get("Attributes", []):
                if attr["Name"] == "email":
                    email = attr["Value"]
                    break
            if email == "test@example.com":
                try:
                    cognito_client.admin_add_user_to_group(
                        UserPoolId=user_pool_id,
                        Username=user["Username"],
                        GroupName="admin",
                    )
                    print(f"✅ Added {email} to admin group")
                except Exception:
                    print(f"ℹ️  User {email} may already be in admin group")
                break
    except Exception as e:
        print(f"❌ Error adding user to admin group: {str(e)}")

    print("✅ Cognito groups setup completed!")


if __name__ == "__main__":
    setup_cognito_groups()
