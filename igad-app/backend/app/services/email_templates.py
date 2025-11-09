"""
Email Templates Configuration for IGAD Innovation Hub

This module contains the HTML email templates used by AWS Cognito for user management.
All templates use professional HTML styling with IGAD branding colors.
Templates are configured directly in AWS Cognito User Pool settings.
"""

# Welcome Email Template (AdminCreateUser - HTML)
WELCOME_EMAIL_TEMPLATE = {
    "subject": "Bienvenido al IGAD Innovation Hub - Cuenta Creada",
    "type": "HTML",
    "colors": {
        "primary": "#2c5530",
        "accent": "#7cb342", 
        "warning": "#ff9800",
        "background": "#f8f9fa"
    },
    "features": [
        "Responsive design (max-width: 600px)",
        "IGAD branded colors and styling",
        "Professional layout with sections",
        "Call-to-action button",
        "Security notice",
        "Footer with organization info"
    ]
}

# Email Verification Template (HTML)
EMAIL_VERIFICATION_TEMPLATE = {
    "subject": "IGAD Innovation Hub - Verifica tu Email",
    "type": "HTML",
    "colors": {
        "primary": "#2c5530",
        "accent": "#7cb342",
        "info": "#2196f3",
        "background": "#f8f9fa"
    },
    "features": [
        "Large verification code display",
        "Blue info section for instructions",
        "Consistent IGAD branding",
        "Professional typography"
    ]
}

# Password Recovery Template (HTML)
PASSWORD_RECOVERY_TEMPLATE = {
    "subject": "IGAD Innovation Hub - Restablecimiento de Contraseña",
    "type": "HTML", 
    "colors": {
        "primary": "#2c5530",
        "accent": "#7cb342",
        "warning": "#ff9800",
        "background": "#f8f9fa"
    },
    "features": [
        "Security-focused messaging",
        "Prominent reset code display",
        "Warning section for security",
        "Direct link to reset page",
        "Support contact information"
    ]
}

# SES Configuration
SES_CONFIG = {
    "from_address": "IGAD Innovation Hub <j.cadavid@cgiar.org>",
    "reply_to": "j.cadavid@cgiar.org",
    "source_arn": "arn:aws:ses:us-east-1:569113802249:identity/j.cadavid@cgiar.org"
}

# Common HTML Styles
COMMON_STYLES = {
    "container": "font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;",
    "card": "background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);",
    "header": "text-align: center; margin-bottom: 30px;",
    "title": "color: #2c5530; margin: 0; font-size: 28px;",
    "accent_line": "width: 60px; height: 3px; background-color: #7cb342; margin: 15px auto;",
    "text": "color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;",
    "info_box": "background-color: #f1f8e9; padding: 20px; border-radius: 6px; margin: 20px 0;",
    "warning_box": "background-color: #fff3e0; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #ff9800;",
    "button": "background-color: #2c5530; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;",
    "footer": "border-top: 1px solid #e0e0e0; padding-top: 20px; margin-top: 30px;"
}

def get_template_info():
    """Return information about configured email templates"""
    return {
        "welcome_email": WELCOME_EMAIL_TEMPLATE,
        "email_verification": EMAIL_VERIFICATION_TEMPLATE,
        "password_recovery": PASSWORD_RECOVERY_TEMPLATE,
        "ses_config": SES_CONFIG,
        "common_styles": COMMON_STYLES,
        "notes": [
            "All templates use HTML with inline CSS",
            "Templates are configured in AWS Cognito User Pool",
            "Uses SES for better email deliverability", 
            "Spanish language for better user experience",
            "Branded with IGAD Innovation Hub identity",
            "Responsive design for mobile compatibility",
            "Professional color scheme: #2c5530 (green), #7cb342 (light green), #ff9800 (orange)"
        ]
    }

def get_cognito_configuration_commands():
    """Return AWS CLI commands to configure all email templates"""
    return {
        "welcome_email": "aws cognito-idp update-user-pool --user-pool-id us-east-1_EULeelICj --admin-create-user-config file://welcome-template.json",
        "verification_email": "aws cognito-idp update-user-pool --user-pool-id us-east-1_EULeelICj --verification-message-template file://verification-template.json", 
        "password_recovery": "aws cognito-idp update-user-pool --user-pool-id us-east-1_EULeelICj --email-verification-message file://recovery-template.html",
        "ses_config": "aws cognito-idp update-user-pool --user-pool-id us-east-1_EULeelICj --email-configuration file://ses-config.json"
    }
