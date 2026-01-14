#!/usr/bin/env python3
import boto3

COLORS = {
    "primary": "#2c5530",
    "accent": "#7cb342",
    "background": "#f8f9fa",
    "text": "#333333",
    "light_green": "#f1f8e9",
}


def create_base_template(content):
    return """<div style="font-family: Arial, sans-serif; padding: 20px; background-color: {COLORS['background']};">
<div style="background-color: white; padding: 30px; border-radius: 8px; max-width: 600px; margin: 0 auto; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
<h1 style="color: {COLORS['primary']}; text-align: center; margin: 0 0 10px 0;">IGAD Innovation Hub</h1>
<hr style="border: 2px solid {COLORS['accent']}; margin: 20px 0; width: 60px; margin-left: auto; margin-right: auto;">
{content}
<hr style="margin-top: 30px; border: 1px solid #e0e0e0;">
<p style="color: #666; font-size: 12px; text-align: center; margin: 10px 0 0 0;">IGAD Innovation Hub - Driving innovation in agriculture</p>
</div>
</div>"""


user_pool_id = "us-east-1_IMi3kSuB8"
profile = "IBD-DEV"

client = boto3.Session(profile_name=profile).client(
    "cognito-idp", region_name="us-east-1"
)

content = """<p style="color: {COLORS['text']};">Welcome to IGAD Innovation Hub! Your account has been successfully created.</p>
<div style="background-color: {COLORS['light_green']}; padding: 20px; border-radius: 6px; margin: 20px 0;">
<p style="margin: 0; color: {COLORS['primary']}; font-weight: bold;">Your account information:</p>
<p style="margin: 10px 0 0 0; color: {COLORS['text']};"><strong>Username:</strong> {{username}}</p>
<p style="margin: 5px 0 0 0; color: {COLORS['text']};"><strong>Temporary password:</strong> {{####}}</p>
</div>
<p style="color: {COLORS['text']};">For security, you will need to change your password on first login.</p>
<p style="text-align: center; margin-top: 30px;">
<a href="https://test-igad-hub.alliance.cgiar.org/login" style="background-color: {COLORS['primary']}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Login to Platform</a>
</p>"""

email_message = create_base_template(content)
email_subject = "Welcome to IGAD Innovation Hub - Account Created"

try:
    response = client.update_user_pool(
        UserPoolId=user_pool_id,
        AdminCreateUserConfig={
            "AllowAdminCreateUserOnly": False,
            "UnusedAccountValidityDays": 7,
            "InviteMessageTemplate": {
                "EmailMessage": email_message,
                "EmailSubject": email_subject,
            },
        },
    )
    print("✅ Invite template updated successfully!")
    print("   URL: https://test-igad-hub.alliance.cgiar.org/login")
except Exception as e:
    print(f"❌ Error: {e}")
