"""
AWS Cognito Authentication Service
"""

import boto3
import json
from typing import Dict, Optional
from botocore.exceptions import ClientError
from aws_lambda_powertools import Logger

logger = Logger()

class CognitoService:
    def __init__(self, user_pool_id: str, client_id: str, region: str = "us-east-1"):
        self.user_pool_id = user_pool_id
        self.client_id = client_id
        self.region = region
        self.cognito_client = boto3.client('cognito-idp', region_name=region)
    
    async def authenticate_user(self, username: str, password: str) -> Dict:
        """Authenticate user with Cognito"""
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
            
            return {
                'success': True,
                'access_token': response['AuthenticationResult']['AccessToken'],
                'id_token': response['AuthenticationResult']['IdToken'],
                'refresh_token': response['AuthenticationResult']['RefreshToken'],
                'expires_in': response['AuthenticationResult']['ExpiresIn']
            }
            
        except ClientError as e:
            logger.error(f"Authentication failed: {e}")
            return {
                'success': False,
                'error': e.response['Error']['Code'],
                'message': e.response['Error']['Message']
            }
    
    async def verify_token(self, access_token: str) -> Optional[Dict]:
        """Verify JWT token with Cognito"""
        try:
            response = self.cognito_client.get_user(AccessToken=access_token)
            
            user_attributes = {}
            for attr in response['UserAttributes']:
                user_attributes[attr['Name']] = attr['Value']
            
            return {
                'username': response['Username'],
                'attributes': user_attributes,
                'user_status': response.get('UserStatus')
            }
            
        except ClientError as e:
            logger.error(f"Token verification failed: {e}")
            return None
    
    async def create_user(self, username: str, password: str, email: str, 
                         temporary_password: bool = True) -> Dict:
        """Create new user in Cognito"""
        try:
            response = self.cognito_client.admin_create_user(
                UserPoolId=self.user_pool_id,
                Username=username,
                UserAttributes=[
                    {'Name': 'email', 'Value': email},
                    {'Name': 'email_verified', 'Value': 'true'}
                ],
                TemporaryPassword=password if temporary_password else None,
                MessageAction='SUPPRESS'  # Don't send welcome email
            )
            
            if not temporary_password:
                # Set permanent password
                self.cognito_client.admin_set_user_password(
                    UserPoolId=self.user_pool_id,
                    Username=username,
                    Password=password,
                    Permanent=True
                )
            
            return {
                'success': True,
                'username': response['User']['Username'],
                'user_status': response['User']['UserStatus']
            }
            
        except ClientError as e:
            logger.error(f"User creation failed: {e}")
            return {
                'success': False,
                'error': e.response['Error']['Code'],
                'message': e.response['Error']['Message']
            }
