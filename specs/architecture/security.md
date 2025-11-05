# IGAD Innovation Hub - Security & Compliance

## Security Architecture Overview

The IGAD Innovation Hub implements a comprehensive security framework following AWS Well-Architected Security Pillar principles, ensuring data protection, identity management, and compliance with international standards.

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   AWS WAF       │    │   CloudFront     │    │   API Gateway   │
│   (DDoS/Filter) │───►│   (SSL/Cache)    │───►│   (Auth/Rate)   │
│                 │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                       │
         ▼                        ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   GuardDuty     │    │   AWS Cognito    │    │   Lambda        │
│   (Threat Det.) │    │   (Identity)     │    │   (VPC/IAM)     │
│                 │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                       │
         ▼                        ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   CloudTrail    │    │   Secrets Mgr    │    │   DynamoDB      │
│   (Audit Log)   │    │   (Keys/Creds)   │    │   (Encryption)  │
│                 │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Identity and Access Management (IAM)

### Cognito User Pool Configuration
```json
{
  "UserPoolName": "igad-innovation-hub-users",
  "Policies": {
    "PasswordPolicy": {
      "MinimumLength": 12,
      "RequireUppercase": true,
      "RequireLowercase": true,
      "RequireNumbers": true,
      "RequireSymbols": true,
      "TemporaryPasswordValidityDays": 7
    }
  },
  "MfaConfiguration": "OPTIONAL",
  "MfaConfigurationStatus": "ENABLED",
  "SmsConfiguration": {
    "SnsCallerArn": "arn:aws:iam::ACCOUNT:role/service-role/CognitoSNSRole",
    "ExternalId": "igad-cognito-external-id"
  },
  "AccountRecoverySetting": {
    "RecoveryMechanisms": [
      {
        "Name": "verified_email",
        "Priority": 1
      },
      {
        "Name": "verified_phone_number",
        "Priority": 2
      }
    ]
  },
  "UserPoolTags": {
    "Environment": "production",
    "Project": "igad-innovation-hub",
    "DataClassification": "sensitive"
  }
}
```

### Custom User Attributes Schema
```json
{
  "CustomAttributes": [
    {
      "Name": "organization",
      "AttributeDataType": "String",
      "Required": true,
      "Mutable": true
    },
    {
      "Name": "role",
      "AttributeDataType": "String",
      "Required": true,
      "Mutable": true
    },
    {
      "Name": "country",
      "AttributeDataType": "String",
      "Required": true,
      "Mutable": true
    },
    {
      "Name": "department",
      "AttributeDataType": "String",
      "Required": false,
      "Mutable": true
    },
    {
      "Name": "security_clearance",
      "AttributeDataType": "String",
      "Required": false,
      "Mutable": false
    }
  ]
}
```

### IAM Roles and Policies

#### Lambda Execution Role
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": [
        "arn:aws:dynamodb:*:*:table/igad-innovation-hub-data",
        "arn:aws:dynamodb:*:*:table/igad-innovation-hub-data/index/*"
      ],
      "Condition": {
        "ForAllValues:StringEquals": {
          "dynamodb:Attributes": [
            "PK",
            "SK",
            "GSI1PK",
            "GSI1SK",
            "userId",
            "proposalId",
            "newsletterId"
          ]
        }
      }
    },
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel"
      ],
      "Resource": [
        "arn:aws:bedrock:*::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0",
        "arn:aws:bedrock:*::foundation-model/anthropic.claude-3-haiku-20240307-v1:0"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": [
        "arn:aws:s3:::igad-innovation-hub-documents/*",
        "arn:aws:s3:::igad-innovation-hub-exports/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": [
        "arn:aws:secretsmanager:*:*:secret:igad/api-keys/*",
        "arn:aws:secretsmanager:*:*:secret:igad/database-credentials/*"
      ]
    }
  ]
}
```

#### API Gateway Resource Policy
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "execute-api:Invoke",
      "Resource": "arn:aws:execute-api:*:*:*/*/GET/*",
      "Condition": {
        "StringEquals": {
          "aws:SourceIp": [
            "IGAD_OFFICE_IP_RANGES"
          ]
        }
      }
    },
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "execute-api:Invoke",
      "Resource": "arn:aws:execute-api:*:*:*/*/POST/*",
      "Condition": {
        "StringLike": {
          "aws:userid": "COGNITO_USER_POOL:*"
        }
      }
    },
    {
      "Effect": "Deny",
      "Principal": "*",
      "Action": "execute-api:Invoke",
      "Resource": "*",
      "Condition": {
        "StringNotEquals": {
          "aws:RequestedRegion": [
            "us-east-1",
            "eu-west-1"
          ]
        }
      }
    }
  ]
}
```

## Data Encryption and Protection

### Encryption at Rest
```python
# DynamoDB Encryption Configuration
class IGADEncryptionConfig:
    def __init__(self):
        self.kms_key_id = os.environ['IGAD_KMS_KEY_ID']
        
        self.encryption_config = {
            'dynamodb': {
                'SSESpecification': {
                    'Enabled': True,
                    'SSEType': 'KMS',
                    'KMSMasterKeyId': self.kms_key_id
                }
            },
            's3': {
                'ServerSideEncryptionConfiguration': {
                    'Rules': [
                        {
                            'ApplyServerSideEncryptionByDefault': {
                                'SSEAlgorithm': 'aws:kms',
                                'KMSMasterKeyID': self.kms_key_id
                            },
                            'BucketKeyEnabled': True
                        }
                    ]
                }
            },
            'lambda': {
                'KMSKeyArn': f"arn:aws:kms:us-east-1:ACCOUNT:{self.kms_key_id}",
                'Environment': {
                    'Variables': {
                        'KMS_KEY_ID': self.kms_key_id
                    }
                }
            }
        }
    
    def encrypt_sensitive_data(self, data: str, context: dict = None) -> str:
        """Encrypt sensitive data using AWS KMS"""
        kms_client = boto3.client('kms')
        
        encryption_context = {
            'service': 'igad-innovation-hub',
            'data_type': context.get('data_type', 'general'),
            'user_id': context.get('user_id', 'system')
        }
        
        response = kms_client.encrypt(
            KeyId=self.kms_key_id,
            Plaintext=data.encode('utf-8'),
            EncryptionContext=encryption_context
        )
        
        return base64.b64encode(response['CiphertextBlob']).decode('utf-8')
    
    def decrypt_sensitive_data(self, encrypted_data: str, context: dict = None) -> str:
        """Decrypt sensitive data using AWS KMS"""
        kms_client = boto3.client('kms')
        
        ciphertext_blob = base64.b64decode(encrypted_data.encode('utf-8'))
        
        response = kms_client.decrypt(
            CiphertextBlob=ciphertext_blob,
            EncryptionContext=context or {}
        )
        
        return response['Plaintext'].decode('utf-8')
```

### Encryption in Transit
```python
# TLS Configuration for API Gateway
class IGADTLSConfig:
    def __init__(self):
        self.tls_config = {
            'api_gateway': {
                'SecurityPolicy': 'TLS_1_2',
                'MinimumProtocolVersion': 'TLSv1.2',
                'CipherSuite': [
                    'TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384',
                    'TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256',
                    'TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA384',
                    'TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA256'
                ]
            },
            'cloudfront': {
                'ViewerProtocolPolicy': 'redirect-to-https',
                'MinimumProtocolVersion': 'TLSv1.2_2021',
                'SSLSupportMethod': 'sni-only'
            }
        }
    
    def validate_tls_connection(self, request_headers: dict) -> bool:
        """Validate TLS connection meets security requirements"""
        
        # Check for required security headers
        required_headers = [
            'x-forwarded-proto',
            'x-amzn-tls-version',
            'x-amzn-tls-cipher-suite'
        ]
        
        for header in required_headers:
            if header not in request_headers:
                logger.warning(f"Missing required security header: {header}")
                return False
        
        # Validate TLS version
        tls_version = request_headers.get('x-amzn-tls-version', '')
        if not tls_version.startswith('TLSv1.2') and not tls_version.startswith('TLSv1.3'):
            logger.warning(f"Unsupported TLS version: {tls_version}")
            return False
        
        return True
```

## Authentication and Authorization

### JWT Token Validation
```python
class IGADTokenValidator:
    def __init__(self):
        self.cognito_client = boto3.client('cognito-idp')
        self.user_pool_id = os.environ['COGNITO_USER_POOL_ID']
        self.app_client_id = os.environ['COGNITO_APP_CLIENT_ID']
        
        # Cache for JWT public keys
        self.jwks_cache = {}
        self.cache_expiry = 3600  # 1 hour
    
    async def validate_jwt_token(self, token: str) -> dict:
        """Validate JWT token and extract user claims"""
        try:
            # Decode token header to get key ID
            header = jwt.get_unverified_header(token)
            kid = header.get('kid')
            
            if not kid:
                raise AuthenticationError("Missing key ID in token header")
            
            # Get public key for verification
            public_key = await self.get_public_key(kid)
            
            # Verify and decode token
            payload = jwt.decode(
                token,
                public_key,
                algorithms=['RS256'],
                audience=self.app_client_id,
                issuer=f'https://cognito-idp.us-east-1.amazonaws.com/{self.user_pool_id}'
            )
            
            # Validate token claims
            self.validate_token_claims(payload)
            
            return {
                'valid': True,
                'user_id': payload.get('sub'),
                'email': payload.get('email'),
                'role': payload.get('custom:role'),
                'organization': payload.get('custom:organization'),
                'country': payload.get('custom:country'),
                'exp': payload.get('exp'),
                'iat': payload.get('iat')
            }
            
        except jwt.ExpiredSignatureError:
            raise AuthenticationError("Token has expired")
        except jwt.InvalidTokenError as e:
            raise AuthenticationError(f"Invalid token: {str(e)}")
    
    def validate_token_claims(self, payload: dict) -> None:
        """Validate JWT token claims"""
        required_claims = ['sub', 'email', 'custom:role', 'custom:organization']
        
        for claim in required_claims:
            if claim not in payload:
                raise AuthenticationError(f"Missing required claim: {claim}")
        
        # Validate token usage
        if payload.get('token_use') != 'access':
            raise AuthenticationError("Invalid token usage")
        
        # Validate audience
        if payload.get('aud') != self.app_client_id:
            raise AuthenticationError("Invalid token audience")
```

### Role-Based Access Control (RBAC)
```python
class IGADAuthorizationManager:
    def __init__(self):
        self.role_permissions = {
            'Government': {
                'proposals': ['create', 'read', 'update', 'export', 'collaborate'],
                'newsletters': ['read', 'subscribe', 'customize'],
                'knowledge_base': ['read', 'search'],
                'analytics': ['read_own']
            },
            'NGO': {
                'proposals': ['create', 'read', 'update', 'export', 'collaborate'],
                'newsletters': ['read', 'subscribe', 'customize'],
                'knowledge_base': ['read', 'search'],
                'analytics': ['read_own']
            },
            'Research': {
                'proposals': ['create', 'read', 'update', 'export', 'collaborate'],
                'newsletters': ['read', 'subscribe', 'customize'],
                'knowledge_base': ['read', 'search', 'contribute'],
                'analytics': ['read_own', 'read_aggregated']
            },
            'IGAD_Staff': {
                'proposals': ['create', 'read', 'update', 'delete', 'export', 'collaborate', 'moderate'],
                'newsletters': ['create', 'read', 'update', 'delete', 'schedule', 'customize'],
                'knowledge_base': ['create', 'read', 'update', 'delete', 'search', 'moderate'],
                'analytics': ['read_all', 'export'],
                'administration': ['user_management', 'system_config']
            }
        }
    
    def check_permission(self, user_role: str, resource: str, action: str) -> bool:
        """Check if user role has permission for specific action on resource"""
        role_perms = self.role_permissions.get(user_role, {})
        resource_perms = role_perms.get(resource, [])
        
        return action in resource_perms
    
    def get_user_permissions(self, user_role: str) -> dict:
        """Get all permissions for a user role"""
        return self.role_permissions.get(user_role, {})
    
    async def authorize_request(self, user_claims: dict, resource: str, action: str, resource_id: str = None) -> bool:
        """Authorize user request for specific resource and action"""
        user_role = user_claims.get('role')
        user_id = user_claims.get('user_id')
        
        # Check basic role permissions
        if not self.check_permission(user_role, resource, action):
            return False
        
        # Additional checks for resource ownership
        if resource_id and action in ['update', 'delete']:
            resource_owner = await self.get_resource_owner(resource, resource_id)
            
            # Users can only modify their own resources (except IGAD_Staff)
            if user_role != 'IGAD_Staff' and resource_owner != user_id:
                return False
        
        return True
```

## Security Monitoring and Incident Response

### CloudTrail Configuration
```json
{
  "TrailName": "igad-innovation-hub-audit-trail",
  "S3BucketName": "igad-innovation-hub-audit-logs",
  "S3KeyPrefix": "cloudtrail-logs/",
  "IncludeGlobalServiceEvents": true,
  "IsMultiRegionTrail": true,
  "EnableLogFileValidation": true,
  "EventSelectors": [
    {
      "ReadWriteType": "All",
      "IncludeManagementEvents": true,
      "DataResources": [
        {
          "Type": "AWS::DynamoDB::Table",
          "Values": [
            "arn:aws:dynamodb:*:*:table/igad-innovation-hub-data"
          ]
        },
        {
          "Type": "AWS::S3::Object",
          "Values": [
            "arn:aws:s3:::igad-innovation-hub-documents/*",
            "arn:aws:s3:::igad-innovation-hub-exports/*"
          ]
        }
      ]
    }
  ],
  "InsightSelectors": [
    {
      "InsightType": "ApiCallRateInsight"
    }
  ]
}
```

### Security Monitoring Lambda
```python
class IGADSecurityMonitor:
    def __init__(self):
        self.cloudwatch = boto3.client('cloudwatch')
        self.sns = boto3.client('sns')
        self.security_topic_arn = os.environ['SECURITY_ALERTS_TOPIC_ARN']
        
        self.alert_thresholds = {
            'failed_logins': 5,          # per 5 minutes
            'api_rate_limit': 1000,      # per minute
            'unusual_access_pattern': 3,  # standard deviations
            'data_export_volume': 100    # MB per hour
        }
    
    async def process_security_event(self, event: dict) -> None:
        """Process CloudTrail security events"""
        
        event_name = event.get('eventName', '')
        source_ip = event.get('sourceIPAddress', '')
        user_identity = event.get('userIdentity', {})
        
        # Check for suspicious activities
        alerts = []
        
        # Failed authentication attempts
        if event_name in ['SignIn', 'InitiateAuth'] and event.get('errorCode'):
            alerts.append(await self.check_failed_logins(source_ip, user_identity))
        
        # Unusual access patterns
        if event_name in ['GetItem', 'Query', 'Scan']:
            alerts.append(await self.check_access_patterns(source_ip, user_identity))
        
        # Large data exports
        if event_name in ['GetObject', 'ExportProposal']:
            alerts.append(await self.check_data_export_volume(user_identity))
        
        # Send alerts for any detected issues
        for alert in alerts:
            if alert and alert['severity'] >= 3:  # Medium or higher
                await self.send_security_alert(alert)
    
    async def send_security_alert(self, alert: dict) -> None:
        """Send security alert notification"""
        
        message = {
            'alert_type': alert['type'],
            'severity': alert['severity'],
            'description': alert['description'],
            'timestamp': datetime.utcnow().isoformat(),
            'affected_resources': alert.get('resources', []),
            'recommended_actions': alert.get('actions', [])
        }
        
        await self.sns.publish(
            TopicArn=self.security_topic_arn,
            Subject=f"IGAD Security Alert: {alert['type']}",
            Message=json.dumps(message, indent=2)
        )
        
        # Log to CloudWatch for further analysis
        await self.cloudwatch.put_metric_data(
            Namespace='IGAD/Security',
            MetricData=[
                {
                    'MetricName': 'SecurityAlert',
                    'Dimensions': [
                        {'Name': 'AlertType', 'Value': alert['type']},
                        {'Name': 'Severity', 'Value': str(alert['severity'])}
                    ],
                    'Value': 1,
                    'Unit': 'Count'
                }
            ]
        )
```

## Compliance and Audit

### Data Retention Policy
```python
class IGADDataRetentionManager:
    def __init__(self):
        self.retention_policies = {
            'user_profiles': 2555,      # 7 years (days)
            'proposals': 1825,          # 5 years
            'newsletters': 1095,        # 3 years
            'audit_logs': 2555,         # 7 years
            'ai_interactions': 365,     # 1 year
            'temporary_exports': 7      # 7 days
        }
    
    async def apply_retention_policy(self, data_type: str) -> dict:
        """Apply data retention policy for specified data type"""
        
        retention_days = self.retention_policies.get(data_type)
        if not retention_days:
            raise ValueError(f"No retention policy defined for: {data_type}")
        
        cutoff_date = datetime.utcnow() - timedelta(days=retention_days)
        
        # Query expired records
        expired_records = await self.find_expired_records(data_type, cutoff_date)
        
        # Archive or delete based on data type
        if data_type in ['user_profiles', 'proposals', 'audit_logs']:
            archived_count = await self.archive_records(expired_records)
            deleted_count = 0
        else:
            deleted_count = await self.delete_records(expired_records)
            archived_count = 0
        
        return {
            'data_type': data_type,
            'retention_days': retention_days,
            'cutoff_date': cutoff_date.isoformat(),
            'records_processed': len(expired_records),
            'archived': archived_count,
            'deleted': deleted_count
        }
```

### Compliance Reporting
```python
class IGADComplianceReporter:
    def __init__(self):
        self.compliance_frameworks = [
            'ISO_27001',
            'GDPR',
            'AU_Data_Protection',  # African Union Data Protection
            'IGAD_Data_Governance'
        ]
    
    async def generate_compliance_report(self, framework: str, period: str) -> dict:
        """Generate compliance report for specified framework and period"""
        
        if framework not in self.compliance_frameworks:
            raise ValueError(f"Unsupported compliance framework: {framework}")
        
        report_data = {
            'framework': framework,
            'reporting_period': period,
            'generated_at': datetime.utcnow().isoformat(),
            'compliance_status': 'COMPLIANT',
            'findings': [],
            'recommendations': []
        }
        
        # Framework-specific checks
        if framework == 'GDPR':
            report_data.update(await self.check_gdpr_compliance())
        elif framework == 'ISO_27001':
            report_data.update(await self.check_iso27001_compliance())
        elif framework == 'AU_Data_Protection':
            report_data.update(await self.check_au_data_protection())
        
        return report_data
```

This comprehensive security specification ensures the IGAD Innovation Hub meets international security standards while maintaining usability and performance for regional collaboration.
