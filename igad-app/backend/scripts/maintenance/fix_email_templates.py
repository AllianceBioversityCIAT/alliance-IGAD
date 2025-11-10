#!/usr/bin/env python3
import boto3
from botocore.exceptions import ClientError

USER_POOL_ID = "us-east-1_EULeelICj"
REGION = "us-east-1"
PROFILE = "IBD-DEV"

def get_cognito_client():
    return boto3.Session(profile_name=PROFILE).client("cognito-idp", region_name=REGION)

def configure_simple_template(cognito_client):
    html_template = """<div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f8f9fa;">
<div style="background-color: white; padding: 30px; border-radius: 8px; max-width: 600px; margin: 0 auto;">
<h1 style="color: #2c5530; text-align: center;">IGAD Innovation Hub</h1>
<hr style="border: 1px solid #7cb342; margin: 20px 0;">
<p>¡Bienvenido al IGAD Innovation Hub!</p>
<p><strong>Usuario:</strong> {username}</p>
<p><strong>Contraseña temporal:</strong> {####}</p>
<p>Deberás cambiar tu contraseña en el primer inicio de sesión.</p>
<p style="text-align: center; margin-top: 30px;">
<a href="http://localhost:3000/login" style="background-color: #2c5530; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Iniciar Sesión</a>
</p>
<hr style="margin-top: 30px;">
<p style="color: #666; font-size: 12px; text-align: center;">IGAD Innovation Hub</p>
</div>
</div>"""
    try:
        cognito_client.update_user_pool(
            UserPoolId=USER_POOL_ID,
            AdminCreateUserConfig={
                "AllowAdminCreateUserOnly": False,
                "UnusedAccountValidityDays": 7,
                "InviteMessageTemplate": {
                    "EmailMessage": html_template,
                    "EmailSubject": "Bienvenido al IGAD Innovation Hub",
                },
            },
        )
        print("✅ Simple HTML template configured")
        return True
    except ClientError as e:
        print(f"❌ Error: {e}")
        return False

def main():
    try:
        cognito_client = get_cognito_client()
        configure_simple_template(cognito_client)
        print("✅ Email template fixed!")
    except Exception as e:
        print(f"❌ Failed: {e}")

if __name__ == "__main__":
    main()