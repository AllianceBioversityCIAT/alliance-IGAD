#!/usr/bin/env python3
"""
Update Cognito email templates to English
"""

import boto3
from botocore.exceptions import ClientError

USER_POOL_ID = "us-east-1_EULeelICj"
PROFILE = "IBD-DEV"

def fix_english_templates():
    session = boto3.Session(profile_name=PROFILE)
    cognito_client = session.client('cognito-idp', region_name='us-east-1')
    
    # English HTML template
    html_template = """<html><body style="font-family: Arial; padding: 20px; background: #f8f9fa;"><div style="background: white; padding: 30px; border-radius: 8px; max-width: 600px; margin: 0 auto;"><h1 style="color: #2c5530; text-align: center;">IGAD Innovation Hub</h1><hr style="border: 2px solid #7cb342; width: 60px; margin: 20px auto;"><p>Welcome to IGAD Innovation Hub!</p><div style="background: #f1f8e9; padding: 15px; border-radius: 5px; margin: 20px 0;"><p><strong>Username:</strong> {username}</p><p><strong>Temporary password:</strong> {####}</p></div><p>You will need to change your password on first login for security.</p><hr style="margin-top: 30px;"><p style="color: #666; font-size: 12px; text-align: center;">IGAD Innovation Hub</p></div></body></html>"""
    
    try:
        # Update welcome email template
        response = cognito_client.update_user_pool(
            UserPoolId=USER_POOL_ID,
            AdminCreateUserConfig={
                'AllowAdminCreateUserOnly': False,
                'UnusedAccountValidityDays': 7,
                'InviteMessageTemplate': {
                    'EmailMessage': html_template,
                    'EmailSubject': 'Welcome to IGAD Innovation Hub - Account Created'
                }
            }
        )
        
        print("✅ Welcome email template updated to English")
        
        # Update verification email template
        verification_template = """<html><body style="font-family: Arial; padding: 20px; background: #f8f9fa;"><div style="background: white; padding: 30px; border-radius: 8px; max-width: 600px; margin: 0 auto;"><h1 style="color: #2c5530; text-align: center;">IGAD Innovation Hub</h1><hr style="border: 2px solid #7cb342; width: 60px; margin: 20px auto;"><p>To complete your email verification, use the following code:</p><div style="background: #e3f2fd; padding: 20px; border-radius: 6px; margin: 20px 0; text-align: center;"><p style="margin: 0; color: #1976d2; font-size: 24px; font-weight: bold; letter-spacing: 2px;">{####}</p></div><p>This code expires in 24 hours for security.</p><hr style="margin-top: 30px;"><p style="color: #666; font-size: 12px; text-align: center;">IGAD Innovation Hub</p></div></body></html>"""
        
        cognito_client.update_user_pool(
            UserPoolId=USER_POOL_ID,
            VerificationMessageTemplate={
                'EmailMessage': verification_template,
                'EmailSubject': 'IGAD Innovation Hub - Verify Your Email'
            }
        )
        
        print("✅ Email verification template updated to English")
        return True
        
    except ClientError as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    print("🔧 Updating Cognito templates to English...")
    fix_english_templates()
    print("✅ All templates updated to English!")
