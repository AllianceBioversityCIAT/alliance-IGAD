#!/bin/bash
set -e

# Get absolute paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Resolve commands to absolute paths
AWS="$(command -v aws)"

# Setup Cognito User Pool for testing
echo "🚀 Setting up Cognito User Pool for IGAD Innovation Hub"

# Validate AWS profile and region
if [ "$("$AWS" configure get profile)" != "IBD-DEV" ]; then
    echo "❌ ERROR: Must use IBD-DEV profile"
    echo "Run: aws configure set profile IBD-DEV"
    exit 1
fi

if [ "$("$AWS" configure get region)" != "us-east-1" ]; then
    echo "❌ ERROR: Must deploy to us-east-1 region"
    echo "Run: aws configure set region us-east-1"
    exit 1
fi

echo "✅ AWS profile and region validated"

# Create User Pool
echo "📝 Creating Cognito User Pool..."
USER_POOL_ID=$("$AWS" cognito-idp create-user-pool \
    --pool-name "igad-testing-user-pool" \
    --policies '{
        "PasswordPolicy": {
            "MinimumLength": 8,
            "RequireUppercase": true,
            "RequireLowercase": true,
            "RequireNumbers": true,
            "RequireSymbols": false
        }
    }' \
    --auto-verified-attributes email \
    --username-attributes email \
    --tags Project=igad-innovation-hub,Environment=testing,Component=auth \
    --query 'UserPool.Id' \
    --output text)

echo "✅ User Pool created: $USER_POOL_ID"

# Create User Pool Client
echo "📱 Creating User Pool Client..."
CLIENT_ID=$("$AWS" cognito-idp create-user-pool-client \
    --user-pool-id "$USER_POOL_ID" \
    --client-name "igad-testing-client" \
    --explicit-auth-flows ADMIN_NO_SRP_AUTH ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH \
    --generate-secret false \
    --query 'UserPoolClient.ClientId' \
    --output text)

echo "✅ User Pool Client created: $CLIENT_ID"

# Create .env file
echo "📄 Creating .env file..."
cat > "$PROJECT_ROOT/backend/.env" << EOF
# AWS Configuration
AWS_REGION=us-east-1
AWS_PROFILE=IBD-DEV

# Cognito Configuration
COGNITO_USER_POOL_ID=$USER_POOL_ID
COGNITO_CLIENT_ID=$CLIENT_ID

# Application Configuration
ENVIRONMENT=testing
LOG_LEVEL=INFO
EOF

echo "✅ Environment file created at $PROJECT_ROOT/backend/.env"

echo ""
echo "🎉 Cognito setup complete!"
echo ""
echo "📋 Configuration:"
echo "   User Pool ID: $USER_POOL_ID"
echo "   Client ID: $CLIENT_ID"
echo ""
echo "🧪 Next steps:"
echo "   1. cd $PROJECT_ROOT/backend"
echo "   2. python test_cognito.py"
echo "   3. Test authentication in your app"
