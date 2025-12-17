#!/usr/bin/env python3
"""
Configure HTML email templates for AWS Cognito User Pool
This script sets up professional HTML email templates with IGAD branding
"""

import boto3
from botocore.exceptions import ClientError

# Configuration
USER_POOL_ID = "us-east-1_EULeelICj"
REGION = "us-east-1"
PROFILE = "IBD-DEV"


def get_cognito_client():
    """Initialize Cognito client with profile"""
    session = boto3.Session(profile_name=PROFILE)
    return session.client("cognito-idp", region_name=REGION)


def configure_welcome_email_template(cognito_client):
    """Configure AdminCreateUser email template (HTML)"""

    html_template = """<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;"><div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"><div style="text-align: center; margin-bottom: 30px;"><h1 style="color: #2c5530; margin: 0; font-size: 28px;">IGAD Innovation Hub</h1><div style="width: 60px; height: 3px; background-color: #7cb342; margin: 15px auto;"></div></div><p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">¡Bienvenido al IGAD Innovation Hub! Tu cuenta ha sido creada exitosamente.</p><div style="background-color: #f1f8e9; padding: 20px; border-radius: 6px; margin: 20px 0;"><p style="margin: 0; color: #2c5530; font-weight: bold;">Información de tu cuenta:</p><p style="margin: 10px 0 0 0; color: #333;"><strong>Usuario:</strong> {username}<br><strong>Contraseña temporal:</strong> {####}</p></div><p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">Por seguridad, deberás cambiar tu contraseña en el primer inicio de sesión.</p><div style="text-align: center; margin: 30px 0;"><a href="https://igad-innovation-hub.com/login" style="background-color: #2c5530; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Iniciar Sesión</a></div><div style="border-top: 1px solid #e0e0e0; padding-top: 20px; margin-top: 30px;"><p style="color: #666; font-size: 14px; text-align: center; margin: 0;">IGAD Innovation Hub - Impulsando la innovación en agricultura</p></div></div></div>"""

    try:
        cognito_client.update_user_pool(
            UserPoolId=USER_POOL_ID,
            AdminCreateUserConfig={
                "AllowAdminCreateUserOnly": False,
                "UnusedAccountValidityDays": 7,
                "InviteMessageTemplate": {
                    "EmailMessage": html_template,
                    "EmailSubject": "Bienvenido al IGAD Innovation Hub - Cuenta Creada",
                },
            },
        )

        print("✅ Welcome email template configured successfully")
        return True

    except ClientError as e:
        print(f"❌ Error configuring welcome email: {e}")
        return False


def configure_verification_template(cognito_client):
    """Configure email verification template"""

    html_template = """<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;"><div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"><div style="text-align: center; margin-bottom: 30px;"><h1 style="color: #2c5530; margin: 0; font-size: 28px;">IGAD Innovation Hub</h1><div style="width: 60px; height: 3px; background-color: #7cb342; margin: 15px auto;"></div></div><p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">Para completar la verificación de tu email, usa el siguiente código:</p><div style="background-color: #e3f2fd; padding: 20px; border-radius: 6px; margin: 20px 0; text-align: center;"><p style="margin: 0; color: #1976d2; font-size: 24px; font-weight: bold; letter-spacing: 2px;">{####}</p></div><p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">Este código expira en 24 horas por seguridad.</p></div></div>"""

    try:
        cognito_client.update_user_pool(
            UserPoolId=USER_POOL_ID,
            VerificationMessageTemplate={
                "EmailMessage": html_template,
                "EmailSubject": "IGAD Innovation Hub - Verifica tu Email",
            },
        )

        print("✅ Email verification template configured successfully")
        return True

    except ClientError as e:
        print(f"❌ Error configuring verification template: {e}")
        return False


def configure_ses_settings(cognito_client):
    """Configure SES settings for better email delivery"""

    try:
        cognito_client.update_user_pool(
            UserPoolId=USER_POOL_ID,
            EmailConfiguration={"EmailSendingAccount": "COGNITO_DEFAULT"},
        )

        print("✅ SES configuration updated to COGNITO_DEFAULT successfully")
        return True

    except ClientError as e:
        print(f"❌ Error configuring SES: {e}")
        return False


def main():
    """Main configuration function"""
    print("🚀 Configuring IGAD Innovation Hub email templates...")
    print(f"User Pool ID: {USER_POOL_ID}")
    print(f"Region: {REGION}")
    print(f"Profile: {PROFILE}")
    print("-" * 50)

    try:
        cognito_client = get_cognito_client()

        # Configure SES settings first
        configure_ses_settings(cognito_client)

        # Configure email templates
        configure_welcome_email_template(cognito_client)
        configure_verification_template(cognito_client)

        print("-" * 50)
        print("✅ All email templates configured successfully!")
        print("📧 Emails will now be sent with HTML formatting and IGAD branding")

    except Exception as e:
        print(f"❌ Configuration failed: {e}")
        return False

    return True


if __name__ == "__main__":
    main()
