# Cognito Authentication Testing Guide

## Setup Instructions

### 1. Create Cognito User Pool

Run the setup script to create a Cognito User Pool:

```bash
cd scripts
./setup-cognito.sh
```

This will:
- Create a Cognito User Pool named `igad-testing-user-pool`
- Create a User Pool Client
- Generate a `.env` file with the configuration

### 2. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 3. Test Cognito Service

Run the test script to verify Cognito integration:

```bash
cd backend
python test_cognito.py
```

This will:
- Create a test user
- Authenticate the user
- Verify the JWT token

### 4. Start Backend Server

```bash
cd backend
python -m uvicorn src.main:app --reload --port 8000
```

### 5. Test Frontend Integration

Add the CognitoTest component to your React app:

```tsx
import CognitoTest from './components/CognitoTest';

// Add to your App.tsx or create a test route
<CognitoTest />
```

## Testing Scenarios

### 1. User Creation
- Use the `/auth/create-user` endpoint
- Provide username, email, and password
- User will be created in Cognito

### 2. Authentication
- Use the `/auth/login` endpoint
- Provide username/email and password
- Receive JWT access token

### 3. Token Verification
- Use the `/auth/verify` endpoint
- Pass the access token
- Receive user information

### 4. Protected Endpoints
- Add `Authorization: Bearer <token>` header
- Access protected routes
- User info available in `request.state.user`

## API Endpoints

### POST /auth/login
```json
{
  "username": "testuser",
  "password": "TempPass123!"
}
```

Response:
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

### POST /auth/verify
```
GET /auth/verify?token=eyJ...
```

Response:
```json
{
  "valid": true,
  "user": {
    "username": "testuser",
    "attributes": {
      "email": "test@example.com",
      "email_verified": "true"
    }
  }
}
```

### POST /auth/create-user
```json
{
  "username": "newuser",
  "email": "newuser@example.com",
  "password": "SecurePass123!"
}
```

## Environment Variables

Required in `.env` file:

```env
AWS_REGION=us-east-1
AWS_PROFILE=IBD-DEV
COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
ENVIRONMENT=testing
LOG_LEVEL=INFO
```

## Troubleshooting

### Common Issues

1. **Missing AWS credentials**
   - Ensure AWS profile `IBD-DEV` is configured
   - Check `aws configure list`

2. **Invalid User Pool ID**
   - Verify the User Pool exists in AWS Console
   - Check the region (must be us-east-1)

3. **Authentication failures**
   - Check password policy requirements
   - Ensure user exists and is confirmed

4. **Token verification fails**
   - Check token expiration
   - Verify User Pool configuration

### AWS Console Verification

1. Go to AWS Cognito Console
2. Select User Pools
3. Find `igad-testing-user-pool`
4. Check users in "Users and groups" tab
5. Verify app client settings

## Security Notes

- Tokens expire after 1 hour by default
- Use HTTPS in production
- Store tokens securely in frontend
- Implement token refresh logic
- Never expose User Pool credentials
