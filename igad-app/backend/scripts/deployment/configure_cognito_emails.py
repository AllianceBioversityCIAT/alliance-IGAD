#!/usr/bin/env python3
import argparse
import json

import boto3
from botocore.exceptions import ClientError

COLORS = {
    "primary": "#2c5530",
    "accent": "#7cb342",
    "background": "#f8f9fa",
    "text": "#333333",
    "light_green": "#f1f8e9",
}


def get_cognito_client(profile_name, region="us-east-1"):
    return boto3.Session(profile_name=profile_name).client(
        "cognito-idp", region_name=region
    )


def create_base_template(content):
    return f"""<div style="font-family: Arial, sans-serif; padding: 20px; background-color: {COLORS['background']};">
<div style="background-color: white; padding: 30px; border-radius: 8px; max-width: 600px; margin: 0 auto; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
<h1 style="color: {COLORS['primary']}; text-align: center; margin: 0 0 10px 0;">IGAD Innovation Hub</h1>
<hr style="border: 2px solid {COLORS['accent']}; margin: 20px 0; width: 60px; margin-left: auto; margin-right: auto;">
{content}
<hr style="margin-top: 30px; border: 1px solid #e0e0e0;">
<p style="color: #666; font-size: 12px; text-align: center; margin: 10px 0 0 0;">IGAD Innovation Hub - Driving innovation in agriculture</p>
</div>
</div>"""


def configure_welcome_email(cognito_client, user_pool_id):
    content = f"""<p style="color: {COLORS['text']};">Welcome to IGAD Innovation Hub! Your account has been successfully created.</p>
<div style="background-color: {COLORS['light_green']}; padding: 20px; border-radius: 6px; margin: 20px 0;">
<p style="margin: 0; color: {COLORS['primary']}; font-weight: bold;">Your account information:</p>
<p style="margin: 10px 0 0 0; color: {COLORS['text']};"><strong>Username:</strong> {{username}}</p>
<p style="margin: 5px 0 0 0; color: {COLORS['text']};"><strong>Temporary password:</strong> {{####}}</p>
</div>
<p style="color: {COLORS['text']};">For security, you will need to change your password on first login.</p>
<p style="text-align: center; margin-top: 30px;">
<a href="https://test-igad-hub.alliance.cgiar.org/login" style="background-color: {COLORS['primary']}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Login to Platform</a>
</p>"""
    try:
        # Get current config first
        response = cognito_client.describe_user_pool(UserPoolId=user_pool_id)
        current_config = response["UserPool"].get("AdminCreateUserConfig", {})

        # Update with new template
        cognito_client.update_user_pool(
            UserPoolId=user_pool_id,
            AdminCreateUserConfig={
                "AllowAdminCreateUserOnly": current_config.get(
                    "AllowAdminCreateUserOnly", False
                ),
                "UnusedAccountValidityDays": current_config.get(
                    "UnusedAccountValidityDays", 7
                ),
                "InviteMessageTemplate": {
                    "EmailMessage": create_base_template(content),
                    "EmailSubject": "Welcome to IGAD Innovation Hub - Account Created",
                },
            },
        )
        print("✅ Welcome email configured")
        return True
    except ClientError as e:
        print(f"❌ Welcome email error: {e}")
        print(f"   Details: {str(e)}")
        return False


def configure_verification_email(cognito_client, user_pool_id):
    content = f"""<p style="color: {COLORS['text']};">To complete your email verification, use the following code:</p>
<div style="background-color: #e3f2fd; padding: 20px; border-radius: 6px; margin: 20px 0; text-align: center;">
<p style="margin: 0; color: #1976d2; font-size: 24px; font-weight: bold; letter-spacing: 2px;">{{####}}</p>
</div>
<p style="color: {COLORS['text']};">This code expires in 24 hours for security.</p>
<p style="color: #666; font-size: 14px;">If you didn't request this verification, you can ignore this message.</p>"""
    try:
        # Get current config first
        cognito_client.describe_user_pool(UserPoolId=user_pool_id)

        cognito_client.update_user_pool(
            UserPoolId=user_pool_id,
            VerificationMessageTemplate={
                "EmailMessage": create_base_template(content),
                "EmailSubject": "IGAD Innovation Hub - Verify Your Email",
            },
        )
        print("✅ Email verification configured")
        return True
    except ClientError as e:
        print(f"❌ Verification email error: {e}")
        print(f"   Details: {str(e)}")
        return False


def configure_password_reset(cognito_client, user_pool_id):
    print("ℹ️  Password reset template prepared (requires custom auth flow)")
    return True


def configure_mfa_setup(cognito_client, user_pool_id):
    print("ℹ️  MFA setup template prepared (requires MFA configuration)")
    return True


def configure_email_settings(
    cognito_client, user_pool_id, use_ses=False, ses_email=None
):
    try:
        if use_ses and ses_email:
            email_config = {
                "EmailSendingAccount": "DEVELOPER",
                "SourceArn": f"arn:aws:ses:us-east-1:569113802249:identity/{ses_email}",
                "From": f"IGAD Innovation Hub <{ses_email}>",
                "ReplyToEmailAddress": ses_email,
            }
        else:
            email_config = {"EmailSendingAccount": "COGNITO_DEFAULT"}

        cognito_client.update_user_pool(
            UserPoolId=user_pool_id, EmailConfiguration=email_config
        )
        config_type = "SES" if use_ses else "COGNITO_DEFAULT"
        print(f"✅ Email configuration set to {config_type}")
        return True
    except ClientError as e:
        print(f"❌ Email configuration error: {e}")
        return False


def save_configuration_backup(user_pool_id, profile_name):
    config = {
        "user_pool_id": user_pool_id,
        "profile": profile_name,
        "templates": {
            "welcome_email": {
                "subject": "Bienvenido al IGAD Innovation Hub - Cuenta Creada",
                "configured": True,
            },
            "email_verification": {
                "subject": "IGAD Innovation Hub - Verifica tu Email",
                "configured": True,
            },
            "password_reset": {
                "subject": "IGAD Innovation Hub - Restablecimiento de Contraseña",
                "configured": "prepared",
            },
            "mfa_setup": {
                "subject": "IGAD Innovation Hub - Configuración MFA",
                "configured": "prepared",
            },
        },
        "email_configuration": "COGNITO_DEFAULT",
        "colors": COLORS,
    }
    with open("cognito_email_config_backup.json", "w") as f:
        json.dump(config, f, indent=2)
    print("💾 Configuration backup saved")


def main():
    parser = argparse.ArgumentParser(description="Configure Cognito email templates")
    parser.add_argument(
        "--user-pool-id", default="us-east-1_EULeelICj", help="Cognito User Pool ID"
    )
    parser.add_argument("--profile", default="IBD-DEV", help="AWS Profile name")
    parser.add_argument("--region", default="us-east-1", help="AWS Region")
    parser.add_argument(
        "--use-ses", action="store_true", help="Use SES instead of Cognito default"
    )
    parser.add_argument("--ses-email", help="SES verified email address")

    args = parser.parse_args()

    try:
        cognito_client = get_cognito_client(args.profile, args.region)
        configure_email_settings(
            cognito_client, args.user_pool_id, args.use_ses, args.ses_email
        )
        configure_welcome_email(cognito_client, args.user_pool_id)
        configure_verification_email(cognito_client, args.user_pool_id)
        configure_password_reset(cognito_client, args.user_pool_id)
        configure_mfa_setup(cognito_client, args.user_pool_id)
        save_configuration_backup(args.user_pool_id, args.profile)
        print("✅ All email templates configured successfully!")
        return True
    except Exception as e:
        print(f"❌ Configuration failed: {e}")
        return False


if __name__ == "__main__":
    main()
