#!/usr/bin/env python3
"""
Script para configurar todos los templates de email de Cognito
Configura templates HTML con branding de IGAD para todos los tipos de email
"""

import boto3
import json
import os
from typing import Dict, Any

# Configuración
PROFILE = "IBD-DEV"
REGION = "us-east-1"
USER_POOL_ID = "us-east-1_IMi3kSuB8"

# Colores y estilos de IGAD
COLORS = {
    "primary": "#2c5530",
    "secondary": "#7cb342", 
    "background": "#f8f9fa",
    "white": "#ffffff",
    "text": "#333333",
    "light_text": "#666666",
    "border": "#e0e0e0"
}

def get_cognito_client():
    """Create Cognito client"""
    session = boto3.Session(profile_name=PROFILE)
    return session.client("cognito-idp", region_name=REGION)

def get_base_template(content: str, title: str = "IGAD Innovation Hub") -> str:
    """Base HTML template for all emails"""
    return f"""
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: {COLORS['background']};">
    <div style="background-color: {COLORS['white']}; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: {COLORS['primary']}; margin: 0; font-size: 28px;">{title}</h1>
            <div style="width: 60px; height: 3px; background-color: {COLORS['secondary']}; margin: 15px auto;"></div>
        </div>
        
        <!-- Content -->
        {content}
        
        <!-- Footer -->
        <div style="border-top: 1px solid {COLORS['border']}; padding-top: 20px; margin-top: 30px;">
            <p style="color: {COLORS['light_text']}; font-size: 14px; text-align: center; margin: 0;">
                IGAD Innovation Hub - Empowering Innovation for Sustainable Development
            </p>
        </div>
    </div>
</div>
"""

def get_email_templates() -> Dict[str, Dict[str, str]]:
    """Define all email templates in English"""
    
    # 1. Template for admin-created users
    admin_create_content = f"""
<p style="color: {COLORS['text']}; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
    Welcome to IGAD Innovation Hub! Your account has been successfully created.
</p>

<div style="background-color: #f1f8e9; padding: 20px; border-radius: 6px; margin: 20px 0;">
    <p style="margin: 0; color: {COLORS['primary']}; font-weight: bold;">Your account information:</p>
    <p style="margin: 10px 0 0 0; color: {COLORS['text']};">
        <strong>Username:</strong> {{username}}<br>
        <strong>Temporary password:</strong> {{####}}
    </p>
</div>

<p style="color: {COLORS['text']}; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
    For security, you will need to change your password on first login.
</p>

<div style="text-align: center; margin: 30px 0;">
    <a href="https://igad-innovation-hub.com/login" 
       style="background-color: {COLORS['primary']}; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
        Sign In
    </a>
</div>
"""

    # 2. Template for email verification
    verification_content = f"""
<h2 style="color: {COLORS['primary']}; text-align: center; margin-bottom: 30px; font-size: 24px;">
    Welcome! 🚀
</h2>

<p style="font-size: 16px; line-height: 1.8; color: {COLORS['text']}; margin-bottom: 20px;">
    Dear Innovator,
</p>

<p style="font-size: 16px; line-height: 1.8; color: {COLORS['text']}; margin-bottom: 25px;">
    Welcome to <strong>IGAD Innovation Hub</strong>! We're excited to have you join our community of changemakers working towards sustainable development and innovation in the Horn of Africa region.
</p>

<div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 25px; border-radius: 12px; margin: 30px 0; border-left: 4px solid {COLORS['primary']};">
    <h3 style="color: {COLORS['primary']}; margin-top: 0; margin-bottom: 15px;">🎯 What you can do:</h3>
    <ul style="color: {COLORS['text']}; line-height: 1.6; margin: 0; padding-left: 20px;">
        <li>Generate AI-powered proposals for development projects</li>
        <li>Create compelling newsletters and communications</li>
        <li>Access innovative tools for sustainable development</li>
        <li>Connect with fellow innovators and experts</li>
    </ul>
</div>

<p style="font-size: 16px; line-height: 1.8; color: {COLORS['text']}; margin-bottom: 30px;">
    To get started, please verify your email address by clicking the button below:
</p>

<div style="text-align: center; margin: 40px 0;">
    <a href="{{##Verify Email##}}" 
       style="background: linear-gradient(135deg, {COLORS['primary']} 0%, #4a7c59 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 15px rgba(45, 80, 22, 0.3);">
        ✅ Verify Email
    </a>
</div>

<div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 30px 0;">
    <p style="margin: 0; color: #856404; font-size: 14px; line-height: 1.6;">
        <strong>🔗 Alternative:</strong> If the button doesn't work, copy and paste this link into your browser:<br>
        <span style="word-break: break-all; font-family: monospace; background-color: #f8f9fa; padding: 4px 8px; border-radius: 4px;">{{##Verify Email##}}</span>
    </p>
</div>
"""

    # 3. Template for password recovery
    forgot_password_content = f"""
<h2 style="color: {COLORS['primary']}; text-align: center; margin-bottom: 30px; font-size: 24px;">
    Password Recovery 🔐
</h2>

<p style="font-size: 16px; line-height: 1.8; color: {COLORS['text']}; margin-bottom: 20px;">
    Hello,
</p>

<p style="font-size: 16px; line-height: 1.8; color: {COLORS['text']}; margin-bottom: 25px;">
    We received a request to reset the password for your <strong>IGAD Innovation Hub</strong> account.
</p>

<div style="background-color: #e3f2fd; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #2196f3;">
    <p style="margin: 0; color: #1565c0; font-weight: bold;">Verification code:</p>
    <p style="margin: 10px 0 0 0; color: {COLORS['text']}; font-size: 24px; font-weight: bold; font-family: monospace;">
        {{####}}
    </p>
</div>

<p style="font-size: 16px; line-height: 1.8; color: {COLORS['text']}; margin-bottom: 20px;">
    Enter this code in the application to create a new password.
</p>

<div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 20px 0;">
    <p style="margin: 0; color: #856404; font-size: 14px;">
        <strong>⚠️ Important:</strong> This code expires in 24 hours. If you didn't request this change, please ignore this email.
    </p>
</div>
"""

    # 4. Template for resend confirmation
    resend_confirmation_content = f"""
<h2 style="color: {COLORS['primary']}; text-align: center; margin-bottom: 30px; font-size: 24px;">
    Confirm Your Email ✉️
</h2>

<p style="font-size: 16px; line-height: 1.8; color: {COLORS['text']}; margin-bottom: 25px;">
    We need to verify your email address to complete your <strong>IGAD Innovation Hub</strong> account setup.
</p>

<div style="background-color: #e8f5e8; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid {COLORS['secondary']};">
    <p style="margin: 0; color: {COLORS['primary']}; font-weight: bold;">Confirmation code:</p>
    <p style="margin: 10px 0 0 0; color: {COLORS['text']}; font-size: 24px; font-weight: bold; font-family: monospace;">
        {{####}}
    </p>
</div>

<p style="font-size: 16px; line-height: 1.8; color: {COLORS['text']}; margin-bottom: 20px;">
    Enter this code in the application to verify your email.
</p>
"""

    return {
        "admin_create_user": {
            "subject": "Welcome to IGAD Innovation Hub - Access Credentials",
            "content": get_base_template(admin_create_content)
        },
        "verification": {
            "subject": "Welcome to IGAD Innovation Hub - Verify Your Account",
            "content": get_base_template(verification_content)
        },
        "forgot_password": {
            "subject": "IGAD Innovation Hub - Password Recovery Code",
            "content": get_base_template(forgot_password_content)
        },
        "resend_confirmation": {
            "subject": "IGAD Innovation Hub - Confirm Your Email",
            "content": get_base_template(resend_confirmation_content)
        }
    }

def configure_admin_create_user_template(cognito_client, templates: Dict):
    """Configure template for admin-created users"""
    template = templates["admin_create_user"]
    
    try:
        cognito_client.update_user_pool(
            UserPoolId=USER_POOL_ID,
            AdminCreateUserConfig={
                "InviteMessageTemplate": {
                    "EmailSubject": template["subject"],
                    "EmailMessage": template["content"]
                },
                "UnusedAccountValidityDays": 7,
                "AllowAdminCreateUserOnly": False
            }
        )
        print("✅ AdminCreateUser template configured")
    except Exception as e:
        print(f"❌ Error configuring AdminCreateUser: {e}")

def configure_verification_template(cognito_client, templates: Dict):
    """Configure template for email verification"""
    template = templates["verification"]
    
    try:
        cognito_client.update_user_pool(
            UserPoolId=USER_POOL_ID,
            VerificationMessageTemplate={
                "EmailSubjectByLink": template["subject"],
                "EmailMessageByLink": template["content"],
                "DefaultEmailOption": "CONFIRM_WITH_LINK"
            }
        )
        print("✅ Verification template configured")
    except Exception as e:
        print(f"❌ Error configuring verification: {e}")

def configure_custom_message_lambda(cognito_client, templates: Dict):
    """
    Note: For forgot_password and resend_confirmation we need a Lambda trigger
    This method prepares the configuration but requires creating the Lambda first
    """
    print("📝 Note: forgot_password and resend_confirmation require Lambda trigger")
    print("   Templates prepared in this script for future implementation")

def main():
    """Configurar todos los templates de email"""
    print("🚀 Configuring Cognito email templates...")
    print(f"📧 User Pool: {USER_POOL_ID}")
    print(f"🌍 Region: {REGION}")
    print()
    
    # Get client and templates
    cognito_client = get_cognito_client()
    templates = get_email_templates()
    
    # Configure each template type
    configure_admin_create_user_template(cognito_client, templates)
    configure_verification_template(cognito_client, templates)
    configure_custom_message_lambda(cognito_client, templates)
    
    print()
    print("✅ Email template configuration completed!")
    print()
    print("📋 Templates configured:")
    print("   • AdminCreateUser: HTML email with credentials")
    print("   • Verification: HTML welcome email with verification")
    print("   • ForgotPassword: Ready for Lambda trigger")
    print("   • ResendConfirmation: Ready for Lambda trigger")
    print()
    print("🔗 Next steps:")
    print("   1. Create Lambda function for custom messages")
    print("   2. Configure triggers in Cognito")
    print("   3. Test all email flows")

if __name__ == "__main__":
    main()
