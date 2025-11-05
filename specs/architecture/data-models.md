# IGAD Innovation Hub - Data Models

## DynamoDB Table Design Strategy

### Single-Table Design Principles
The IGAD Innovation Hub uses a single-table design pattern for optimal performance and cost efficiency:

- **Primary Key Strategy**: Composite keys with meaningful prefixes
- **Access Patterns**: Designed around query requirements, not normalization
- **Hot Partitions**: Avoided through proper key distribution
- **GSI Usage**: Minimal secondary indexes for alternative access patterns

## Primary Table: igad-innovation-hub-data

### Table Configuration
```json
{
  "TableName": "igad-innovation-hub-data",
  "BillingMode": "ON_DEMAND",
  "AttributeDefinitions": [
    {
      "AttributeName": "PK",
      "AttributeType": "S"
    },
    {
      "AttributeName": "SK",
      "AttributeType": "S"
    },
    {
      "AttributeName": "GSI1PK",
      "AttributeType": "S"
    },
    {
      "AttributeName": "GSI1SK",
      "AttributeType": "S"
    },
    {
      "AttributeName": "GSI2PK",
      "AttributeType": "S"
    },
    {
      "AttributeName": "GSI2SK",
      "AttributeType": "S"
    }
  ],
  "KeySchema": [
    {
      "AttributeName": "PK",
      "KeyType": "HASH"
    },
    {
      "AttributeName": "SK",
      "KeyType": "RANGE"
    }
  ],
  "GlobalSecondaryIndexes": [
    {
      "IndexName": "GSI1",
      "KeySchema": [
        {
          "AttributeName": "GSI1PK",
          "KeyType": "HASH"
        },
        {
          "AttributeName": "GSI1SK",
          "KeyType": "RANGE"
        }
      ],
      "Projection": {
        "ProjectionType": "ALL"
      }
    },
    {
      "IndexName": "GSI2",
      "KeySchema": [
        {
          "AttributeName": "GSI2PK",
          "KeyType": "HASH"
        },
        {
          "AttributeName": "GSI2SK",
          "KeyType": "RANGE"
        }
      ],
      "Projection": {
        "ProjectionType": "ALL"
      }
    }
  ]
}
```

## Entity Definitions

### User Profile Entity
```typescript
interface UserProfile {
  PK: string;           // "USER#<user_id>"
  SK: string;           // "PROFILE"
  GSI1PK: string;       // "ORG#<organization_id>"
  GSI1SK: string;       // "USER#<user_id>"
  GSI2PK: string;       // "ROLE#<role>"
  GSI2SK: string;       // "USER#<user_id>"
  
  // User attributes
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'Government' | 'NGO' | 'Research' | 'IGAD_Staff';
  organization: string;
  organizationId: string;
  country: string;
  department?: string;
  phoneNumber?: string;
  
  // Preferences
  preferences: {
    language: string;
    timezone: string;
    newsletterFrequency: 'daily' | 'weekly' | 'monthly';
    notificationSettings: {
      email: boolean;
      inApp: boolean;
      proposals: boolean;
      newsletters: boolean;
    };
  };
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  isActive: boolean;
  emailVerified: boolean;
}
```

**Example Record:**
```json
{
  "PK": "USER#user-123e4567-e89b-12d3-a456-426614174000",
  "SK": "PROFILE",
  "GSI1PK": "ORG#ministry-agriculture-kenya",
  "GSI1SK": "USER#user-123e4567-e89b-12d3-a456-426614174000",
  "GSI2PK": "ROLE#Government",
  "GSI2SK": "USER#user-123e4567-e89b-12d3-a456-426614174000",
  "userId": "user-123e4567-e89b-12d3-a456-426614174000",
  "email": "john.doe@agriculture.go.ke",
  "firstName": "John",
  "lastName": "Doe",
  "role": "Government",
  "organization": "Ministry of Agriculture - Kenya",
  "organizationId": "ministry-agriculture-kenya",
  "country": "KE",
  "department": "Climate Resilience Division",
  "preferences": {
    "language": "en",
    "timezone": "Africa/Nairobi",
    "newsletterFrequency": "weekly",
    "notificationSettings": {
      "email": true,
      "inApp": true,
      "proposals": true,
      "newsletters": true
    }
  },
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z",
  "isActive": true,
  "emailVerified": true
}
```

### Proposal Entity
```typescript
interface Proposal {
  PK: string;           // "PROPOSAL#<proposal_id>"
  SK: string;           // "METADATA"
  GSI1PK: string;       // "USER#<user_id>"
  GSI1SK: string;       // "PROPOSAL#<created_at>#<proposal_id>"
  GSI2PK: string;       // "TEMPLATE#<template_id>"
  GSI2SK: string;       // "PROPOSAL#<created_at>#<proposal_id>"
  
  // Proposal attributes
  proposalId: string;
  title: string;
  templateId: string;
  status: 'draft' | 'in_review' | 'completed' | 'archived';
  progress: number;     // 0.0 to 1.0
  
  // Content structure
  sections: ProposalSection[];
  
  // Collaboration
  createdBy: string;
  collaborators: Collaborator[];
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  version: number;
  
  // Analytics
  analytics: {
    timeSpent: number;          // seconds
    aiAssistanceUsed: number;   // 0.0 to 1.0
    completionScore: number;    // 0.0 to 1.0
    exportCount: number;
  };
  
  // Export history
  exports: ProposalExport[];
}

interface ProposalSection {
  id: string;
  title: string;
  content: string;
  status: 'empty' | 'ai_generated' | 'user_modified' | 'ai_enhanced' | 'completed';
  wordCount: number;
  lastModified: string;
  aiConfidence?: number;
}

interface Collaborator {
  userId: string;
  role: 'owner' | 'editor' | 'reviewer' | 'viewer';
  invitedAt: string;
  acceptedAt?: string;
  status: 'pending' | 'accepted' | 'declined';
}

interface ProposalExport {
  exportId: string;
  format: 'pdf' | 'docx' | 'html';
  generatedAt: string;
  downloadUrl: string;
  expiresAt: string;
}
```

### Proposal Section Entity (Separate Items)
```typescript
interface ProposalSectionEntity {
  PK: string;           // "PROPOSAL#<proposal_id>"
  SK: string;           // "SECTION#<section_id>"
  GSI1PK: string;       // "PROPOSAL#<proposal_id>"
  GSI1SK: string;       // "SECTION#<order_index>#<section_id>"
  
  proposalId: string;
  sectionId: string;
  title: string;
  content: string;
  orderIndex: number;
  status: 'empty' | 'ai_generated' | 'user_modified' | 'ai_enhanced' | 'completed';
  wordCount: number;
  lastModified: string;
  aiConfidence?: number;
  
  // Version history
  versions: SectionVersion[];
}

interface SectionVersion {
  version: number;
  content: string;
  modifiedBy: string;
  modifiedAt: string;
  changeType: 'user_edit' | 'ai_enhancement' | 'collaboration';
}
```

### Newsletter Entity
```typescript
interface Newsletter {
  PK: string;           // "NEWSLETTER#<newsletter_id>"
  SK: string;           // "METADATA"
  GSI1PK: string;       // "USER#<user_id>"
  GSI1SK: string;       // "NEWSLETTER#<generated_at>#<newsletter_id>"
  GSI2PK: string;       // "STATUS#<status>"
  GSI2SK: string;       // "NEWSLETTER#<scheduled_for>#<newsletter_id>"
  
  // Newsletter attributes
  newsletterId: string;
  title: string;
  status: 'generated' | 'scheduled' | 'sent' | 'failed';
  
  // Content
  sections: NewsletterSection[];
  
  // Personalization
  generatedFor: string;         // user_id
  personalizationScore: number; // 0.0 to 1.0
  preferences: NewsletterPreferences;
  
  // Scheduling
  generatedAt: string;
  scheduledFor?: string;
  sentAt?: string;
  
  // Analytics
  analytics: {
    totalArticles: number;
    estimatedReadTime: number;  // minutes
    engagementScore?: number;   // post-delivery
    clickThroughRate?: number;  // post-delivery
  };
  
  // Delivery
  deliveryOptions: {
    method: 'email' | 'web' | 'both';
    recipients: string[];       // user_ids or email addresses
    template: string;
  };
}

interface NewsletterSection {
  id: string;
  title: string;
  articles: NewsletterArticle[];
  orderIndex: number;
}

interface NewsletterArticle {
  id: string;
  title: string;
  source: string;
  publishedAt: string;
  relevanceScore: number;
  summary: string;
  content?: string;
  url: string;
  tags: string[];
  imageUrl?: string;
}

interface NewsletterPreferences {
  contentDays: number;
  maxArticles: number;
  sources: string[];
  topics: string[];
  format: 'html' | 'text';
  layout: 'standard' | 'compact' | 'detailed';
}
```

### Template Entity
```typescript
interface Template {
  PK: string;           // "TEMPLATE#<template_id>"
  SK: string;           // "METADATA"
  GSI1PK: string;       // "CATEGORY#<category>"
  GSI1SK: string;       // "TEMPLATE#<template_id>"
  GSI2PK: string;       // "ROLE#<required_role>"
  GSI2SK: string;       // "TEMPLATE#<template_id>"
  
  // Template attributes
  templateId: string;
  name: string;
  description: string;
  category: string;
  version: string;
  
  // Access control
  requiredRole: string[];
  isActive: boolean;
  
  // Structure
  sections: TemplateSection[];
  dataRequirements: DataRequirement[];
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  
  // Usage analytics
  analytics: {
    usageCount: number;
    averageCompletionTime: number;  // minutes
    successRate: number;            // 0.0 to 1.0
    userRating: number;             // 1.0 to 5.0
  };
}

interface TemplateSection {
  id: string;
  name: string;
  description: string;
  orderIndex: number;
  required: boolean;
  aiAssisted: boolean;
  estimatedWords: number;
  prompts: string[];
}

interface DataRequirement {
  key: string;
  source: 'igad_kn' | 'user_input' | 'external_api';
  query?: string;
  required: boolean;
  description: string;
}
```

### Knowledge Base Entity
```typescript
interface KnowledgeDocument {
  PK: string;           // "KNOWLEDGE#<document_id>"
  SK: string;           // "METADATA"
  GSI1PK: string;       // "SOURCE#<source>"
  GSI1SK: string;       // "KNOWLEDGE#<published_at>#<document_id>"
  GSI2PK: string;       // "TOPIC#<primary_topic>"
  GSI2SK: string;       // "KNOWLEDGE#<relevance_score>#<document_id>"
  
  // Document attributes
  documentId: string;
  title: string;
  source: 'ICPAC' | 'CEWARN' | 'IDDRSI' | 'IGAD_SECRETARIAT' | 'EXTERNAL';
  documentType: 'report' | 'policy' | 'news' | 'research' | 'data';
  
  // Content
  summary: string;
  content?: string;       // Full text for smaller documents
  url: string;
  s3Key?: string;         // For large documents stored in S3
  
  // Classification
  topics: string[];
  tags: string[];
  language: string;
  
  // Metadata
  publishedAt: string;
  ingestedAt: string;
  lastUpdated: string;
  
  // Search optimization
  searchKeywords: string[];
  relevanceScore: number;
  
  // Usage analytics
  analytics: {
    viewCount: number;
    citationCount: number;
    lastAccessed: string;
  };
}
```

## Access Patterns and Queries

### User Management Queries
```typescript
// Get user profile
const getUserProfile = (userId: string) => ({
  PK: `USER#${userId}`,
  SK: 'PROFILE'
});

// Get users by organization
const getUsersByOrganization = (organizationId: string) => ({
  IndexName: 'GSI1',
  KeyConditionExpression: 'GSI1PK = :orgId',
  ExpressionAttributeValues: {
    ':orgId': `ORG#${organizationId}`
  }
});

// Get users by role
const getUsersByRole = (role: string) => ({
  IndexName: 'GSI2',
  KeyConditionExpression: 'GSI2PK = :role',
  ExpressionAttributeValues: {
    ':role': `ROLE#${role}`
  }
});
```

### Proposal Management Queries
```typescript
// Get proposal metadata
const getProposal = (proposalId: string) => ({
  PK: `PROPOSAL#${proposalId}`,
  SK: 'METADATA'
});

// Get user's proposals
const getUserProposals = (userId: string) => ({
  IndexName: 'GSI1',
  KeyConditionExpression: 'GSI1PK = :userId',
  ExpressionAttributeValues: {
    ':userId': `USER#${userId}`
  }
});

// Get proposals by template
const getProposalsByTemplate = (templateId: string) => ({
  IndexName: 'GSI2',
  KeyConditionExpression: 'GSI2PK = :templateId',
  ExpressionAttributeValues: {
    ':templateId': `TEMPLATE#${templateId}`
  }
});

// Get proposal sections
const getProposalSections = (proposalId: string) => ({
  KeyConditionExpression: 'PK = :proposalId AND begins_with(SK, :sectionPrefix)',
  ExpressionAttributeValues: {
    ':proposalId': `PROPOSAL#${proposalId}`,
    ':sectionPrefix': 'SECTION#'
  }
});
```

### Knowledge Base Queries
```typescript
// Search by source
const getDocumentsBySource = (source: string, limit?: number) => ({
  IndexName: 'GSI1',
  KeyConditionExpression: 'GSI1PK = :source',
  ExpressionAttributeValues: {
    ':source': `SOURCE#${source}`
  },
  ScanIndexForward: false,  // Most recent first
  Limit: limit || 20
});

// Search by topic
const getDocumentsByTopic = (topic: string, minRelevance?: number) => ({
  IndexName: 'GSI2',
  KeyConditionExpression: 'GSI2PK = :topic',
  FilterExpression: minRelevance ? 'relevanceScore >= :minRelevance' : undefined,
  ExpressionAttributeValues: {
    ':topic': `TOPIC#${topic}`,
    ...(minRelevance && { ':minRelevance': minRelevance })
  },
  ScanIndexForward: false   // Highest relevance first
});
```

## Data Consistency and Transactions

### Transactional Operations
```typescript
// Create proposal with initial sections
const createProposalTransaction = (proposal: Proposal, sections: ProposalSection[]) => {
  const transactItems = [
    {
      Put: {
        TableName: 'igad-innovation-hub-data',
        Item: {
          PK: `PROPOSAL#${proposal.proposalId}`,
          SK: 'METADATA',
          ...proposal
        }
      }
    },
    ...sections.map(section => ({
      Put: {
        TableName: 'igad-innovation-hub-data',
        Item: {
          PK: `PROPOSAL#${proposal.proposalId}`,
          SK: `SECTION#${section.id}`,
          ...section
        }
      }
    }))
  ];
  
  return { TransactItems: transactItems };
};
```

### Data Validation Rules
```typescript
const validateProposal = (proposal: Proposal): ValidationResult => {
  const errors: string[] = [];
  
  if (!proposal.title || proposal.title.length < 10) {
    errors.push('Title must be at least 10 characters');
  }
  
  if (!proposal.templateId) {
    errors.push('Template ID is required');
  }
  
  if (proposal.progress < 0 || proposal.progress > 1) {
    errors.push('Progress must be between 0 and 1');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};
```

This data model design ensures efficient querying, proper data organization, and scalability for the IGAD Innovation Hub platform while maintaining consistency with DynamoDB best practices.
