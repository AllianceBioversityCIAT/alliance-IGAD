#!/usr/bin/env python3
"""
Direct fix for Cognito template issue
"""

import boto3
import json
from botocore.exceptions import ClientError

USER_POOL_ID = "us-east-1_EULeelICj"
PROFILE = "IBD-DEV"

def fix_template():
    session = boto3.Session(profile_name=PROFILE)
    cognito_client = session.client('cognito-idp', region_name='us-east-1')
    
    # Very simple HTML template
    html_template = """<html><body style="font-family: Arial; padding: 20px; background: #f8f9fa;"><div style="background: white; padding: 30px; border-radius: 8px; max-width: 600px; margin: 0 auto;"><h1 style="color: #2c5530; text-align: center;">IGAD Innovation Hub</h1><hr style="border: 2px solid #7cb342; width: 60px; margin: 20px auto;"><p>¡Bienvenido al IGAD Innovation Hub!</p><div style="background: #f1f8e9; padding: 15px; border-radius: 5px; margin: 20px 0;"><p><strong>Usuario:</strong> {username}</p><p><strong>Contraseña temporal:</strong> {####}</p></div><p>Deberás cambiar tu contraseña en el primer inicio de sesión.</p><hr style="margin-top: 30px;"><p style="color: #666; font-size: 12px; text-align: center;">IGAD Innovation Hub</p></div></body></html>"""
    
    try:
        # First check current config
        current = cognito_client.describe_user_pool(UserPoolId=USER_POOL_ID)
        print("Current AdminCreateUserConfig:", current['UserPool'].get('AdminCreateUserConfig', {}))
        
        # Apply the template directly
        response = cognito_client.update_user_pool(
            UserPoolId=USER_POOL_ID,
            AdminCreateUserConfig={
                'AllowAdminCreateUserOnly': False,
                'UnusedAccountValidityDays': 7,
                'InviteMessageTemplate': {
                    'EmailMessage': html_template,
                    'EmailSubject': 'Bienvenido al IGAD Innovation Hub'
                }
            }
        )
        
        print("✅ Template applied successfully")
        
        # Verify it was applied
        updated = cognito_client.describe_user_pool(UserPoolId=USER_POOL_ID)
        config = updated['UserPool'].get('AdminCreateUserConfig', {})
        
        if 'InviteMessageTemplate' in config:
            print("✅ InviteMessageTemplate is now configured")
            print("Subject:", config['InviteMessageTemplate'].get('EmailSubject'))
        else:
            print("❌ InviteMessageTemplate still not found")
        
        return True
        
    except ClientError as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    print("🔧 Fixing Cognito template directly...")
    fix_template()
    print("✅ Done! Try creating a new user now.")
