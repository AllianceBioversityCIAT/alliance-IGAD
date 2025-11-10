#!/usr/bin/env python3
import boto3
from botocore.exceptions import ClientError

PRODUCTION_CONFIG = {
    "user_pool_id": "us-east-1_XXXXXX",
    "profile": "production-profile",
    "region": "us-east-1",
    "domain": "https://igad-innovation-hub.com",
    "ses_email": "noreply@igad-innovation-hub.com",
}

COLORS = {"primary": "#2c5530", "accent": "#7cb342", "background": "#f8f9fa", "text": "#333333", "light_green": "#f1f8e9"}

def get_cognito_client():
    return boto3.Session(profile_name=PRODUCTION_CONFIG["profile"]).client("cognito-idp", region_name=PRODUCTION_CONFIG["region"])

def create_base_template(content):
    return f"""<div style="font-family: Arial, sans-serif; padding: 20px; background-color: {COLORS['background']};">
<div style="background-color: white; padding: 30px; border-radius: 8px; max-width: 600px; margin: 0 auto; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
<h1 style="color: {COLORS['primary']}; text-align: center; margin: 0 0 10px 0;">IGAD Innovation Hub</h1>
<hr style="border: 2px solid {COLORS['accent']}; margin: 20px 0; width: 60px; margin-left: auto; margin-right: auto;">
{content}
<hr style="margin-top: 30px; border: 1px solid #e0e0e0;">
<p style="color: #666; font-size: 12px; text-align: center; margin: 10px 0 0 0;">IGAD Innovation Hub - Impulsando la innovación en agricultura</p>
</div>
</div>"""


def deploy_production_templates():
    if "XXXXXX" in PRODUCTION_CONFIG["user_pool_id"]:
        print("❌ ERROR: Please update PRODUCTION_CONFIG with real User Pool ID")
        return False

    try:
        cognito_client = get_cognito_client()

        # Configure email settings
        cognito_client.update_user_pool(
            UserPoolId=PRODUCTION_CONFIG["user_pool_id"],
            EmailConfiguration={"EmailSendingAccount": "COGNITO_DEFAULT"},
        )

        # Welcome Email Template
        welcome_content = f"""<p style="color: {COLORS['text']};">Welcome to IGAD Innovation Hub! Your account has been created successfully.</p>
<div style="background-color: {COLORS['light_green']}; padding: 20px; border-radius: 6px; margin: 20px 0;">
<p style="margin: 0; color: {COLORS['primary']}; font-weight: bold;">Your account information:</p>
<p style="margin: 10px 0 0 0; color: {COLORS['text']};"><strong>Username:</strong> {{username}}</p>
<p style="margin: 5px 0 0 0; color: {COLORS['text']};"><strong>Temporary password:</strong> {{####}}</p>
</div>
<p style="color: {COLORS['text']};">For security, you will need to change your password on first login.</p>
<p style="text-align: center; margin-top: 30px;">
<a href="{PRODUCTION_CONFIG['domain']}/login" style="background-color: {COLORS['primary']}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Log In</a>
</p>"""

        cognito_client.update_user_pool(
            UserPoolId=PRODUCTION_CONFIG["user_pool_id"],
            AdminCreateUserConfig={
                "AllowAdminCreateUserOnly": False,
                "UnusedAccountValidityDays": 7,
                "InviteMessageTemplate": {
                    "EmailMessage": create_base_template(welcome_content),
                    "EmailSubject": "Welcome to IGAD Innovation Hub - Account Created",
                },
            },
        )

        # Email Verification Template
        verification_content = f"""<p style="color: {COLORS['text']};">To complete your email verification, use the following code:</p>
<div style="background-color: #e3f2fd; padding: 20px; border-radius: 6px; margin: 20px 0; text-align: center;">
<p style="margin: 0; color: #1976d2; font-size: 24px; font-weight: bold; letter-spacing: 2px;">{{####}}</p>
</div>
<p style="color: {COLORS['text']};">This code expires in 24 hours for security.</p>
<p style="color: #666; font-size: 14px;">If you did not request this verification, you can ignore this message.</p>"""

        cognito_client.update_user_pool(
            UserPoolId=PRODUCTION_CONFIG["user_pool_id"],
            VerificationMessageTemplate={
                "EmailMessage": create_base_template(verification_content),
                "EmailSubject": "IGAD Innovation Hub - Verify Your Email",
            },
        )

        print("✅ Production email templates deployed successfully!")
        return True

    except ClientError as e:
        print(f"❌ AWS Error: {e}")
        return False
    except Exception as e:
        print(f"❌ Deployment failed: {e}")
        return False


def main():
    return deploy_production_templates()

if __name__ == "__main__":
    main()
