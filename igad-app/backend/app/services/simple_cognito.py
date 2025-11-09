import boto3
import os
from botocore.exceptions import ClientError

class SimpleCognitoService:
    def __init__(self, user_pool_id: str, client_id: str, region: str = "us-east-1"):
        self.user_pool_id = user_pool_id
        self.client_id = client_id
        self.cognito_client = boto3.client('cognito-idp', region_name=region)
    
    def authenticate_user(self, username: str, password: str):
        """Authenticate user with Cognito (sync version)"""
        try:
            response = self.cognito_client.admin_initiate_auth(
                UserPoolId=self.user_pool_id,
                ClientId=self.client_id,
                AuthFlow='ADMIN_NO_SRP_AUTH',
                AuthParameters={
                    'USERNAME': username,
                    'PASSWORD': password
                }
            )
            
            # Check if password change is required
            if 'ChallengeName' in response:
                if response['ChallengeName'] == 'NEW_PASSWORD_REQUIRED':
                    return {
                        'success': False,
                        'challenge': 'NEW_PASSWORD_REQUIRED',
                        'session': response['Session'],
                        'message': 'Password change required'
                    }
            
            return {
                'success': True,
                'access_token': response['AuthenticationResult']['AccessToken'],
                'expires_in': response['AuthenticationResult']['ExpiresIn']
            }
            
        except ClientError as e:
            return {
                'success': False,
                'error': e.response['Error']['Code'],
                'message': e.response['Error']['Message']
            }
        except Exception as e:
            return {
                'success': False,
                'error': 'UnknownError',
                'message': str(e)
            }
    
    def respond_to_auth_challenge(self, username: str, session: str, new_password: str):
        """Respond to NEW_PASSWORD_REQUIRED challenge"""
        try:
            response = self.cognito_client.admin_respond_to_auth_challenge(
                UserPoolId=self.user_pool_id,
                ClientId=self.client_id,
                ChallengeName='NEW_PASSWORD_REQUIRED',
                Session=session,
                ChallengeResponses={
                    'USERNAME': username,
                    'NEW_PASSWORD': new_password
                }
            )
            
            return {
                'success': True,
                'access_token': response['AuthenticationResult']['AccessToken'],
                'expires_in': response['AuthenticationResult']['ExpiresIn']
            }
            
        except ClientError as e:
            return {
                'success': False,
                'error': e.response['Error']['Code'],
                'message': e.response['Error']['Message']
            }
    def forgot_password(self, username: str):
        """Initiate forgot password flow"""
        try:
            response = self.cognito_client.forgot_password(
                ClientId=self.client_id,
                Username=username
            )
            
            return {
                'success': True,
                'message': 'Password reset code sent to your email'
            }
            
        except ClientError as e:
            return {
                'success': False,
                'error': e.response['Error']['Code'],
                'message': e.response['Error']['Message']
            }
        except Exception as e:
            return {
                'success': False,
                'error': 'UnknownError',
                'message': str(e)
            }
    
    def confirm_forgot_password(self, username: str, confirmation_code: str, new_password: str):
        """Confirm forgot password with code"""
        try:
            response = self.cognito_client.confirm_forgot_password(
                ClientId=self.client_id,
                Username=username,
                ConfirmationCode=confirmation_code,
                Password=new_password
            )
            
            return {
                'success': True,
                'message': 'Password reset successfully'
            }
            
        except ClientError as e:
            return {
                'success': False,
                'error': e.response['Error']['Code'],
                'message': e.response['Error']['Message']
            }
        except Exception as e:
            return {
                'success': False,
                'error': 'UnknownError',
                'message': str(e)
            }
