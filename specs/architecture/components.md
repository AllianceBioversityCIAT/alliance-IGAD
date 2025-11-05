# IGAD Innovation Hub - Component Specifications

## Authentication Component

### AWS Cognito User Pool Configuration
```json
{
  "userPoolName": "igad-innovation-hub-users",
  "policies": {
    "passwordPolicy": {
      "minimumLength": 12,
      "requireUppercase": true,
      "requireLowercase": true,
      "requireNumbers": true,
      "requireSymbols": true
    }
  },
  "mfaConfiguration": "OPTIONAL",
  "accountRecoverySetting": {
    "recoveryMechanisms": [
      {"name": "verified_email", "priority": 1}
    ]
  }
}
```

### User Attributes Schema
```typescript
interface IGADUser {
  sub: string;                    // Cognito UUID
  email: string;                  // Primary identifier
  given_name: string;            // First name
  family_name: string;           // Last name
  'custom:organization': string;  // IGAD member organization
  'custom:role': UserRole;       // Government | NGO | Research | IGAD_Staff
  'custom:country': string;      // ISO country code
  'custom:department': string;   // Department/division
  email_verified: boolean;
  created_at: string;
  updated_at: string;
}

type UserRole = 'Government' | 'NGO' | 'Research' | 'IGAD_Staff';
```

### Authentication Flow
1. **Login**: Cognito hosted UI with organization-specific branding
2. **Token Management**: JWT tokens with 1-hour expiration
3. **Refresh Strategy**: Automatic token refresh via AWS SDK
4. **Session Management**: React Context for auth state

## Core Services Component

### Proposal Writer Service
```python
# Lambda Function: proposal-writer-service
class ProposalWriterService:
    def __init__(self):
        self.dynamodb = boto3.resource('dynamodb')
        self.s3 = boto3.client('s3')
        self.igad_kn_client = IGADKnowledgeNetworkClient()
    
    def create_proposal(self, user_id: str, template_id: str, context: dict) -> dict:
        """Generate AI-assisted proposal using IGAD-KN data"""
        # Validate user permissions
        # Fetch template structure
        # Query IGAD-KN for relevant data
        # Generate proposal content via AI
        # Store draft in DynamoDB
        # Return proposal ID and initial content
        
    def update_proposal(self, proposal_id: str, updates: dict) -> dict:
        """Update existing proposal with user modifications"""
        
    def export_proposal(self, proposal_id: str, format: str) -> str:
        """Export proposal to PDF/Word format"""
```

### Newsletter Generator Service
```python
# Lambda Function: newsletter-generator-service
class NewsletterService:
    def __init__(self):
        self.dynamodb = boto3.resource('dynamodb')
        self.ses = boto3.client('ses')
        self.eventbridge = boto3.client('events')
    
    def generate_newsletter(self, user_id: str, preferences: dict) -> dict:
        """Create personalized newsletter based on user role and interests"""
        
    def schedule_newsletter(self, newsletter_id: str, schedule: dict) -> dict:
        """Schedule newsletter for future delivery"""
        
    def send_newsletter(self, newsletter_id: str, recipients: list) -> dict:
        """Deliver newsletter via email/web"""
```

## Transversal UI Components

### Global Navigation Bar
```typescript
// React Component: GlobalNavBar
interface NavBarProps {
  user: IGADUser;
  currentModule: string;
  onModuleChange: (module: string) => void;
}

const GlobalNavBar: React.FC<NavBarProps> = ({ user, currentModule, onModuleChange }) => {
  const availableModules = getModulesForRole(user.role);
  
  return (
    <nav className="igad-navbar">
      <div className="nav-brand">
        <img src="/igad-logo.svg" alt="IGAD Innovation Hub" />
      </div>
      <div className="nav-modules">
        {availableModules.map(module => (
          <NavModule 
            key={module.id}
            module={module}
            active={currentModule === module.id}
            onClick={() => onModuleChange(module.id)}
          />
        ))}
      </div>
      <div className="nav-user">
        <UserProfile user={user} />
      </div>
    </nav>
  );
};
```

### Home Dashboard Component
```typescript
// React Component: HomeDashboard
interface DashboardProps {
  user: IGADUser;
  recentActivity: Activity[];
  quickActions: QuickAction[];
}

const HomeDashboard: React.FC<DashboardProps> = ({ user, recentActivity, quickActions }) => {
  return (
    <div className="dashboard-container">
      <WelcomeSection user={user} />
      <QuickActionsGrid actions={quickActions} />
      <RecentActivityFeed activities={recentActivity} />
      <UsageAnalytics userId={user.sub} />
    </div>
  );
};
```

### Login Interface Component
```typescript
// React Component: LoginInterface
const LoginInterface: React.FC = () => {
  const { signIn } = useAuth();
  
  return (
    <div className="login-container">
      <div className="login-header">
        <img src="/igad-logo-large.svg" alt="IGAD Innovation Hub" />
        <h1>Welcome to IGAD Innovation Hub</h1>
        <p>Empowering collaboration across the Horn of Africa</p>
      </div>
      <div className="login-form">
        <CognitoHostedUI
          onSuccess={handleLoginSuccess}
          onError={handleLoginError}
          customization={{
            primaryColor: '#1B4F72',
            logoUrl: '/igad-logo.svg'
          }}
        />
      </div>
    </div>
  );
};
```

## Internal Dependencies and Communication

### Service Communication Matrix
```
┌─────────────────┬─────────────┬─────────────┬─────────────┐
│ Component       │ Auth        │ Proposal    │ Newsletter  │
├─────────────────┼─────────────┼─────────────┼─────────────┤
│ Auth Service    │ -           │ Required    │ Required    │
│ Proposal Writer │ JWT Token   │ -           │ Optional    │
│ Newsletter      │ JWT Token   │ Content Ref │ -           │
│ IGAD-KN Client  │ API Key     │ Required    │ Required    │
└─────────────────┴─────────────┴─────────────┴─────────────┘
```

### Event-Driven Communication
```python
# EventBridge Event Schemas
class IGADEvents:
    PROPOSAL_CREATED = {
        "source": "igad.proposal-writer",
        "detail-type": "Proposal Created",
        "detail": {
            "proposalId": "string",
            "userId": "string",
            "templateId": "string",
            "timestamp": "ISO-8601"
        }
    }
    
    NEWSLETTER_SCHEDULED = {
        "source": "igad.newsletter",
        "detail-type": "Newsletter Scheduled",
        "detail": {
            "newsletterId": "string",
            "scheduledFor": "ISO-8601",
            "recipientCount": "number"
        }
    }
    
    USER_ACTION_AUDIT = {
        "source": "igad.audit",
        "detail-type": "User Action",
        "detail": {
            "userId": "string",
            "action": "string",
            "resource": "string",
            "timestamp": "ISO-8601"
        }
    }
```

### Shared Utilities and Libraries

#### Lambda Layer: igad-common-utils
```python
# Common utilities shared across Lambda functions
class IGADCommonUtils:
    @staticmethod
    def validate_user_permissions(user_id: str, resource: str, action: str) -> bool:
        """Validate user permissions for resource access"""
        
    @staticmethod
    def audit_user_action(user_id: str, action: str, resource: str) -> None:
        """Log user action for audit trail"""
        
    @staticmethod
    def format_igad_response(data: dict, status: str = "success") -> dict:
        """Standardize API response format"""
        return {
            "status": status,
            "timestamp": datetime.utcnow().isoformat(),
            "data": data
        }
```

#### Frontend Shared Components
```typescript
// Shared React components and hooks
export const useIGADAuth = () => {
  // Authentication hook with token management
};

export const useIGADAPI = () => {
  // API client hook with error handling
};

export const IGADLoadingSpinner: React.FC = () => {
  // Consistent loading indicator
};

export const IGADErrorBoundary: React.FC = ({ children }) => {
  // Error boundary with IGAD branding
};
```

## Component Deployment Strategy

### Lambda Function Organization
```
igad-innovation-hub/
├── functions/
│   ├── auth-service/           # User management
│   ├── proposal-writer/        # Proposal generation
│   ├── newsletter-service/     # Newsletter creation
│   ├── igad-kn-client/        # Knowledge network integration
│   └── common-utils/          # Shared utilities (Layer)
├── frontend/
│   ├── src/components/        # React components
│   ├── src/services/          # API clients
│   └── src/utils/             # Frontend utilities
└── infrastructure/
    ├── cdk/                   # AWS CDK definitions
    └── templates/             # CloudFormation templates
```

### Dependency Management
- **Python**: requirements.txt per Lambda function
- **Node.js**: package.json for frontend and CDK
- **Shared Dependencies**: Lambda Layers for common libraries
- **Version Control**: Semantic versioning for all components

This component specification ensures clear separation of concerns while maintaining efficient communication patterns between all system components.
