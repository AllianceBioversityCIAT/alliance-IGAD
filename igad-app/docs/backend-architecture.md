# Backend Architecture Documentation

## Overview

The IGAD Innovation Hub backend is built with **FastAPI** following a modular and serverless-ready architecture. The application implements authentication with AWS Cognito, prompt management with DynamoDB, and AI services with Amazon Bedrock.

## Core Principle

> **"Simplicity is the ultimate sophistication."**

The entire architecture prioritizes simplicity, elegance, and maintainability.

## Project Structure

```
backend/
├── app/                          # Main application code
│   ├── main.py                   # FastAPI entry point (45 lines)
│   ├── routers/                  # Endpoints organized by domain
│   │   ├── auth.py              # Authentication and sessions
│   │   ├── admin.py             # User management and administration
│   │   ├── proposals.py         # Proposals CRUD + AI features
│   │   ├── prompts.py           # Prompt management by section
│   │   └── health.py            # Health checks
│   ├── services/                 # Business logic
│   │   ├── cognito_service.py   # Complete Cognito user management
│   │   ├── simple_cognito.py    # Simplified authentication
│   │   ├── prompt_service.py    # DynamoDB prompt management
│   │   ├── bedrock_service.py   # Amazon Bedrock AI integration
│   │   └── email_templates.py   # HTML email templates
│   ├── middleware/               # Custom middleware
│   │   ├── auth_middleware.py   # JWT validation and authorization
│   │   └── cors_middleware.py   # CORS configuration
│   ├── models/                   # Pydantic data models
│   │   └── user_models.py       # User and response models
│   ├── database/                 # Database configuration
│   │   └── dynamodb.py          # DynamoDB client
│   ├── handlers/                 # Specific handlers
│   │   └── lambda_handler.py    # AWS Lambda handler
│   └── utils/                    # Shared utilities
│       └── response_utils.py    # HTTP response utilities
├── scripts/                      # Scripts organized by purpose
│   ├── setup/                   # Initial configuration
│   ├── deployment/              # Production deployment
│   ├── maintenance/             # Maintenance and fixes
│   └── README.md               # Scripts documentation
├── tests/                       # Unit and integration tests
└── [configuration files]        # requirements.txt, .env, etc.
```

## Architecture Evolution

### Before: Monolithic (845 lines)
- Single `main.py` file with all endpoints
- Mixed logic without separation of concerns
- Difficult maintenance and testing

### After: Modular (45 lines main.py)
- **Routers**: Endpoints organized by functional domain
- **Services**: Separated and reusable business logic
- **Middleware**: Centralized authentication and CORS
- **Models**: Data validation with Pydantic

## Core Components

### 1. Authentication System (`auth.py`)
```python
# Main endpoints:
POST /auth/login              # Cognito login
POST /auth/complete-password  # Temporary password change
POST /auth/refresh-token      # Token renewal
GET  /auth/me                 # Current user information
```

**Features:**
- Real AWS Cognito integration (no mock)
- `NEW_PASSWORD_REQUIRED` challenge handling
- JWT session management
- Automatic token validation

### 2. Admin Management (`admin.py`)
```python
# Main endpoints:
GET    /admin/users           # List users
POST   /admin/users           # Create user
PUT    /admin/users/{username}/toggle  # Enable/disable
DELETE /admin/users/{username}         # Delete user
```

**Features:**
- Complete Cognito user management
- Custom email sending via SES
- Groups and permissions control
- Administrator role validation

### 3. Proposals System (`proposals.py`)
```python
# Main endpoints:
GET  /proposals              # List proposals
POST /proposals              # Create proposal
GET  /proposals/{id}         # Get specific proposal
```

**Features:**
- Complete CRUD for proposals
- Amazon Bedrock AI integration
- DynamoDB storage
- Pydantic data validation

### 4. Prompts Management (`prompts.py`)
```python
# Main endpoints:
GET /prompts/sections/{section_name}  # Get prompts by section
```

**Features:**
- Contextual prompt access by section
- Integration with proposals system
- Centralized AI prompt management

## Services Layer

### CognitoService (`cognito_service.py`)
- **Purpose**: Complete AWS Cognito user management
- **Functions**: Create, list, enable/disable, delete users
- **Email**: SES integration for custom sending

### SimpleCognitoService (`simple_cognito.py`)
- **Purpose**: Simplified authentication
- **Functions**: Login, token validation, challenge handling
- **Usage**: Authentication endpoints

### PromptService (`prompt_service.py`)
- **Purpose**: DynamoDB prompt management
- **Functions**: CRUD operations, search by section
- **Integration**: Proposals system and AI

### BedrockService (`bedrock_service.py`)
- **Purpose**: Amazon Bedrock AI integration
- **Functions**: Content generation, prompt processing
- **Models**: Claude, Titan, and other available models

## Security Implementation

### Authentication Flow
1. **Login**: User sends credentials to `/auth/login`
2. **Cognito**: Validation with AWS Cognito User Pool
3. **Challenge**: Handle `NEW_PASSWORD_REQUIRED` if needed
4. **JWT**: Generate JWT token for sessions
5. **Middleware**: Automatic validation on protected endpoints

### Authorization Levels
- **Public**: Health checks, login
- **Authenticated**: Proposals, prompts
- **Admin**: User management, configuration

### Security Features
- JWT token validation in middleware
- Role-based access control (RBAC)
- CORS configured for specific frontend
- Input validation with Pydantic
- Automatic data sanitization

## Database Design

### DynamoDB Tables

#### Users Table (Cognito)
- **Management**: AWS Cognito User Pool
- **Attributes**: username, email, groups, status
- **Integration**: CognitoService for operations

#### Prompts Table
- **Structure**: section_name (PK), prompt_id (SK)
- **Attributes**: title, content, context, metadata
- **Access**: PromptService for CRUD operations

#### Proposals Table
- **Structure**: proposal_id (PK)
- **Attributes**: title, content, status, created_at, user_id
- **Features**: Versioning, metadata, AI integration

## Email System

### SES Integration
- **Templates**: HTML with IGAD branding
- **Personalization**: Dynamic variables per user
- **Delivery**: DEVELOPER mode to bypass Cognito limits
- **Backup**: Configurations backed up in JSON

### Email Templates
```html
<!-- Base structure -->
<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%)">
  <div style="max-width: 600px; margin: 0 auto; background: white;">
    <!-- Header with IGAD logo -->
    <!-- Personalized content -->
    <!-- Footer with contact information -->
  </div>
</div>
```

## API Documentation

### FastAPI Features
- **Swagger UI**: Automatic documentation at `/docs`
- **ReDoc**: Alternative documentation at `/redoc`
- **OpenAPI**: Complete schema for integration
- **Validation**: Automatic with Pydantic models

### Response Format
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { /* response data */ },
  "error": null
}
```

## Development Workflow

### Local Development
```bash
# Install dependencies
pip install -r requirements.txt

# Environment variables
cp .env.example .env

# Run server
python start_server.py
# or
uvicorn app.main:app --reload
```

### Testing
```bash
# Run tests
python scripts/run_tests.py
# or
pytest tests/
```

### Deployment
- **AWS Lambda**: Handler configured in `handlers/lambda_handler.py`
- **API Gateway**: Automatic integration with FastAPI
- **Environment**: Variables in AWS Parameter Store

## Performance Considerations

### Lambda Optimization
- **Cold Start**: Minimized with optimized imports
- **Memory**: Configuration based on real usage
- **Timeout**: Adjusted per endpoint (30s default)

### DynamoDB Optimization
- **Partition Keys**: Designed for uniform distribution
- **Indexes**: GSI for frequent queries
- **Batch Operations**: For multiple operations

## Monitoring & Logging

### CloudWatch Integration
- **Logs**: Structured in JSON for parsing
- **Metrics**: Custom metrics for business logic
- **Alarms**: Configured for critical errors

### Error Handling
```python
# Standard pattern
try:
    result = await service_operation()
    return {"success": True, "data": result}
except SpecificException as e:
    logger.error(f"Operation failed: {e}")
    return {"success": False, "error": str(e)}
```

## Future Enhancements

### Planned Features
- [ ] Rate limiting with Redis
- [ ] Caching layer for frequent prompts
- [ ] WebSocket support for real-time updates
- [ ] Advanced AI features with Bedrock

### Scalability Considerations
- **Horizontal**: Lambda auto-scaling
- **Database**: DynamoDB on-demand scaling
- **Caching**: ElastiCache for session storage
- **CDN**: CloudFront for static assets

## Troubleshooting

### Common Issues
1. **Import Errors**: Verify folder structure and `__init__.py`
2. **Cognito Errors**: Validate User Pool ID and region
3. **DynamoDB Errors**: Verify IAM permissions and table names
4. **CORS Issues**: Verify middleware configuration

### Debug Mode
```python
# Enable detailed logs
import logging
logging.basicConfig(level=logging.DEBUG)
```

---

**Last Updated**: November 2025  
**Version**: 2.0 (Post-modular refactoring)  
**Maintained by**: IGAD Innovation Hub Team
