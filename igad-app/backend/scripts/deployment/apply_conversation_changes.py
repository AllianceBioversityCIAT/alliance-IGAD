#!/usr/bin/env python3
"""
Apply all changes from conversation summary:
1. Update Cognito token validity (24 hours for access/ID, 10 years for refresh)
2. Convert email templates from Spanish to English
3. Verify token management system is in place
"""
import sys

import boto3
from botocore.exceptions import ClientError

# Configuration
USER_POOL_ID = "us-east-1_IMi3kSuB8"
PROFILE = "IBD-DEV"
REGION = "us-east-1"

COLORS = {
    "primary": "#2c5530",
    "accent": "#7cb342",
    "background": "#f8f9fa",
    "text": "#333333",
    "light_green": "#f1f8e9",
}


def get_cognito_client():
    """Get Cognito client with specified profile and region."""
    return boto3.Session(profile_name=PROFILE).client("cognito-idp", region_name=REGION)


def create_base_template(content):
    """Create base HTML template for emails."""
    return f"""<div style="font-family: Arial, sans-serif; padding: 20px; background-color: {COLORS['background']};">
<div style="background-color: white; padding: 30px; border-radius: 8px; max-width: 600px; margin: 0 auto; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
<h1 style="color: {COLORS['primary']}; text-align: center; margin: 0 0 10px 0;">IGAD Innovation Hub</h1>
<hr style="border: 2px solid {COLORS['accent']}; margin: 20px 0; width: 60px; margin-left: auto; margin-right: auto;">
{content}
<hr style="margin-top: 30px; border: 1px solid #e0e0e0;">
<p style="color: #666; font-size: 12px; text-align: center; margin: 10px 0 0 0;">IGAD Innovation Hub - Driving innovation in agriculture</p>
</div>
</div>"""


def update_token_validity(cognito_client):
    """Update Cognito token validity settings."""
    print("🔧 Updating token validity settings...")

    try:
        # Get user pool clients
        response = cognito_client.list_user_pool_clients(UserPoolId=USER_POOL_ID)
        if not response["UserPoolClients"]:
            print("❌ No user pool clients found")
            return False

        client_id = response["UserPoolClients"][0]["ClientId"]

        # Get current configuration
        current_config = cognito_client.describe_user_pool_client(
            UserPoolId=USER_POOL_ID, ClientId=client_id
        )

        client_config = current_config["UserPoolClient"]

        # Update token validity
        update_params = {
            "UserPoolId": USER_POOL_ID,
            "ClientId": client_id,
            "ClientName": client_config["ClientName"],
            "AccessTokenValidity": 24,  # 24 hours
            "IdTokenValidity": 24,  # 24 hours
            "RefreshTokenValidity": 3650,  # 10 years
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

        print("✅ Token validity updated:")
        print("  - AccessToken: 24 hours")
        print("  - IdToken: 24 hours")
        print("  - RefreshToken: 3650 days (10 years)")

        return True

    except ClientError as e:
        print(f"❌ Error updating token validity: {e}")
        return False


def update_email_templates(cognito_client):
    """Update email templates to English."""
    print("📧 Updating email templates to English...")

    success = True

    # Welcome email template
    try:
        welcome_content = f"""<p style="color: {COLORS['text']};">Welcome to IGAD Innovation Hub! Your account has been successfully created.</p>
<div style="background-color: {COLORS['light_green']}; padding: 20px; border-radius: 6px; margin: 20px 0;">
<p style="margin: 0; color: {COLORS['primary']}; font-weight: bold;">Your account information:</p>
<p style="margin: 10px 0 0 0; color: {COLORS['text']};"><strong>Username:</strong> {{username}}</p>
<p style="margin: 5px 0 0 0; color: {COLORS['text']};"><strong>Temporary password:</strong> {{####}}</p>
</div>
<p style="color: {COLORS['text']};">For security, you will need to change your password on first login.</p>
<p style="text-align: center; margin-top: 30px;">
<a href="http://localhost:3000/login" style="background-color: {COLORS['primary']}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Login</a>
</p>"""

        cognito_client.update_user_pool(
            UserPoolId=USER_POOL_ID,
            AdminCreateUserConfig={
                "AllowAdminCreateUserOnly": False,
                "UnusedAccountValidityDays": 7,
                "InviteMessageTemplate": {
                    "EmailMessage": create_base_template(welcome_content),
                    "EmailSubject": "Welcome to IGAD Innovation Hub - Account Created",
                },
            },
        )
        print("✅ Welcome email template updated")

    except ClientError as e:
        print(f"❌ Error updating welcome email: {e}")
        success = False

    # Verification email template
    try:
        verification_content = f"""<p style="color: {COLORS['text']};">To complete your email verification, use the following code:</p>
<div style="background-color: #e3f2fd; padding: 20px; border-radius: 6px; margin: 20px 0; text-align: center;">
<p style="margin: 0; color: #1976d2; font-size: 24px; font-weight: bold; letter-spacing: 2px;">{{####}}</p>
</div>
<p style="color: {COLORS['text']};">This code expires in 24 hours for security.</p>
<p style="color: #666; font-size: 14px;">If you didn't request this verification, you can ignore this message.</p>"""

        cognito_client.update_user_pool(
            UserPoolId=USER_POOL_ID,
            VerificationMessageTemplate={
                "EmailMessage": create_base_template(verification_content),
                "EmailSubject": "IGAD Innovation Hub - Verify Your Email",
            },
        )
        print("✅ Verification email template updated")

    except ClientError as e:
        print(f"❌ Error updating verification email: {e}")
        success = False

    return success


def verify_frontend_changes():
    """Verify that frontend token management changes are in place."""
    print("🔍 Verifying frontend token management system...")

    # Check if TokenManager exists
    token_manager_path = "/Users/jcadavid/Desktop/DEV/Desarrollos/alliance-IGAD/igad-app/frontend/src/services/tokenManager.ts"
    try:
        with open(token_manager_path, "r") as f:
            content = f.read()
            if "class TokenManager" in content and "refreshTokens" in content:
                print("✅ TokenManager class found and configured")
                return True
            else:
                print("❌ TokenManager class not properly configured")
                return False
    except FileNotFoundError:
        print("❌ TokenManager file not found")
        return False


def verify_backend_changes():
    """Verify that backend refresh endpoint exists."""
    print("🔍 Verifying backend refresh endpoint...")

    # Check if refresh endpoint exists in auth.py
    auth_path = "/Users/jcadavid/Desktop/DEV/Desarrollos/alliance-IGAD/igad-app/backend/app/routers/auth.py"
    try:
        with open(auth_path, "r") as f:
            content = f.read()
            if "/refresh-token" in content and "RefreshTokenRequest" in content:
                print("✅ Refresh token endpoint found and configured")
                return True
            else:
                print("❌ Refresh token endpoint not properly configured")
                return False
    except FileNotFoundError:
        print("❌ Auth router file not found")
        return False


def main():
    """Main function to apply all conversation changes."""
    print("🚀 Applying changes from conversation summary...")
    print("=" * 60)

    try:
        cognito_client = get_cognito_client()

        # Step 1: Update token validity
        token_success = update_token_validity(cognito_client)

        # Step 2: Update email templates
        email_success = update_email_templates(cognito_client)

        # Step 3: Verify frontend changes
        frontend_success = verify_frontend_changes()

        # Step 4: Verify backend changes
        backend_success = verify_backend_changes()

        print("=" * 60)
        print("📊 Summary of changes:")
        print(f"  Token validity: {'✅ Updated' if token_success else '❌ Failed'}")
        print(f"  Email templates: {'✅ Updated' if email_success else '❌ Failed'}")
        print(
            f"  Frontend TokenManager: {'✅ Verified' if frontend_success else '❌ Missing'}"
        )
        print(
            f"  Backend refresh endpoint: {'✅ Verified' if backend_success else '❌ Missing'}"
        )

        if all([token_success, email_success, frontend_success, backend_success]):
            print("\n🎉 All conversation changes applied successfully!")
            return True
        else:
            print(
                "\n⚠️  Some changes failed or are missing. Please review the output above."
            )
            return False

    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
