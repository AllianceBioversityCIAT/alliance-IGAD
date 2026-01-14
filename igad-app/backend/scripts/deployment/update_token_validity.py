#!/usr/bin/env python3
"""
Update Cognito User Pool Client token validity settings.
Based on conversation summary: extend tokens from 1 hour to 24 hours for access/ID tokens
and 10 years for refresh tokens.
"""
import boto3
from botocore.exceptions import ClientError

# Configuration
USER_POOL_ID = "us-east-1_IMi3kSuB8"
PROFILE = "IBD-DEV"
REGION = "us-east-1"


def get_cognito_client():
    """Get Cognito client with specified profile and region."""
    return boto3.Session(profile_name=PROFILE).client("cognito-idp", region_name=REGION)


def get_user_pool_client_id(cognito_client, user_pool_id):
    """Get the first user pool client ID."""
    try:
        response = cognito_client.list_user_pool_clients(UserPoolId=user_pool_id)
        if response["UserPoolClients"]:
            return response["UserPoolClients"][0]["ClientId"]
        else:
            print("❌ No user pool clients found")
            return None
    except ClientError as e:
        print(f"❌ Error getting user pool clients: {e}")
        return None


def update_token_validity(cognito_client, user_pool_id, client_id):
    """Update token validity settings."""
    try:
        # Get current client configuration
        current_config = cognito_client.describe_user_pool_client(
            UserPoolId=user_pool_id, ClientId=client_id
        )

        client_config = current_config["UserPoolClient"]
        print("Current token settings:")
        print(
            f"  AccessTokenValidity: {client_config.get('AccessTokenValidity', 'Not set')}"
        )
        print(f"  IdTokenValidity: {client_config.get('IdTokenValidity', 'Not set')}")
        print(
            f"  RefreshTokenValidity: {client_config.get('RefreshTokenValidity', 'Not set')}"
        )

        # Update with new token validity settings
        update_params = {
            "UserPoolId": user_pool_id,
            "ClientId": client_id,
            "ClientName": client_config["ClientName"],
            "AccessTokenValidity": 24,  # 24 hours
            "IdTokenValidity": 24,  # 24 hours
            "RefreshTokenValidity": 3650,  # 10 years (365 * 10)
            "TokenValidityUnits": {
                "AccessToken": "hours",
                "IdToken": "hours",
                "RefreshToken": "days",
            },
        }

        # Preserve existing settings
        for key in [
            "ExplicitAuthFlows",
            "SupportedIdentityProviders",
            "CallbackURLs",
            "LogoutURLs",
            "AllowedOAuthFlows",
            "AllowedOAuthScopes",
            "AllowedOAuthFlowsUserPoolClient",
        ]:
            if key in client_config:
                update_params[key] = client_config[key]

        cognito_client.update_user_pool_client(**update_params)

        print("✅ Token validity updated successfully:")
        print("  AccessToken: 24 hours")
        print("  IdToken: 24 hours")
        print("  RefreshToken: 3650 days (10 years)")

        return True

    except ClientError as e:
        print(f"❌ Error updating token validity: {e}")
        return False


def main():
    """Main function to update token validity."""
    print("🔧 Updating Cognito token validity settings...")

    try:
        cognito_client = get_cognito_client()

        # Get user pool client ID
        client_id = get_user_pool_client_id(cognito_client, USER_POOL_ID)
        if not client_id:
            return False

        print(f"📋 User Pool ID: {USER_POOL_ID}")
        print(f"📋 Client ID: {client_id}")

        # Update token validity
        success = update_token_validity(cognito_client, USER_POOL_ID, client_id)

        if success:
            print("✅ Token validity configuration completed successfully!")
        else:
            print("❌ Token validity configuration failed!")

        return success

    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False


if __name__ == "__main__":
    main()
