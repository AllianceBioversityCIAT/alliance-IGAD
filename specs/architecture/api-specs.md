# IGAD Innovation Hub - API Specifications

## Base Configuration

### API Gateway Setup
- **Base URL**: `https://api.igad-innovation-hub.org/v1`
- **Protocol**: HTTPS only (TLS 1.2+)
- **Rate Limiting**: 1000 requests/minute per user
- **Timeout**: 30 seconds for all endpoints
- **CORS**: Enabled for web application domains

### Authentication Headers
```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
X-API-Version: 1.0
X-Request-ID: <UUID>
```

## Authentication Endpoints

### POST /auth/login
Initiate user authentication via Cognito.

**Request:**
```json
{
  "email": "user@example.org",
  "password": "securePassword123!",
  "mfaCode": "123456"  // Optional, if MFA enabled
}
```

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "idToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600,
    "tokenType": "Bearer",
    "user": {
      "id": "uuid-string",
      "email": "user@example.org",
      "name": "John Doe",
      "role": "Government",
      "organization": "Ministry of Agriculture",
      "country": "KE"
    }
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### POST /auth/refresh
Refresh expired access token.

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600,
    "tokenType": "Bearer"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### POST /auth/logout
Invalidate user session.

**Request:**
```json
{
  "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**
```json
{
  "status": "success",
  "message": "Successfully logged out",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Proposal Writer Endpoints

### GET /proposals/templates
Retrieve available proposal templates.

**Query Parameters:**
- `role` (optional): Filter by user role
- `category` (optional): Filter by proposal category
- `limit` (optional): Number of results (default: 20)
- `offset` (optional): Pagination offset (default: 0)

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "templates": [
      {
        "id": "template-001",
        "name": "Agricultural Development Proposal",
        "description": "Template for agricultural development funding proposals",
        "category": "Agriculture",
        "requiredRole": ["Government", "NGO"],
        "estimatedTime": "45 minutes",
        "sections": [
          {
            "id": "executive-summary",
            "name": "Executive Summary",
            "required": true,
            "aiAssisted": true
          },
          {
            "id": "project-description",
            "name": "Project Description",
            "required": true,
            "aiAssisted": true
          }
        ],
        "dataRequirements": [
          "regional_climate_data",
          "agricultural_statistics",
          "economic_indicators"
        ]
      }
    ],
    "pagination": {
      "total": 15,
      "limit": 20,
      "offset": 0,
      "hasMore": false
    }
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### POST /proposals
Create a new proposal.

**Request:**
```json
{
  "templateId": "template-001",
  "title": "Drought Resilience Initiative for Northern Kenya",
  "inputs": {
    "projectRegion": "Northern Kenya",
    "targetBeneficiaries": 50000,
    "requestedAmount": 2500000,
    "projectDuration": 36,
    "focusAreas": ["water_management", "crop_diversification"]
  },
  "collaborators": [
    {
      "email": "colleague@ministry.ke",
      "role": "reviewer"
    }
  ]
}
```

**Response (201):**
```json
{
  "status": "success",
  "data": {
    "proposalId": "prop-uuid-123",
    "title": "Drought Resilience Initiative for Northern Kenya",
    "status": "draft",
    "progress": 0.15,
    "sections": [
      {
        "id": "executive-summary",
        "title": "Executive Summary",
        "content": "AI-generated initial content based on inputs...",
        "status": "ai_generated",
        "lastModified": "2024-01-15T10:30:00Z"
      }
    ],
    "createdAt": "2024-01-15T10:30:00Z",
    "estimatedCompletion": "2024-01-15T11:15:00Z"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### GET /proposals/{proposalId}
Retrieve specific proposal details.

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "id": "prop-uuid-123",
    "title": "Drought Resilience Initiative for Northern Kenya",
    "templateId": "template-001",
    "status": "draft",
    "progress": 0.75,
    "sections": [
      {
        "id": "executive-summary",
        "title": "Executive Summary",
        "content": "Comprehensive executive summary content...",
        "status": "user_modified",
        "wordCount": 450,
        "lastModified": "2024-01-15T10:45:00Z"
      }
    ],
    "metadata": {
      "createdBy": "user-uuid-456",
      "createdAt": "2024-01-15T10:30:00Z",
      "lastModified": "2024-01-15T10:45:00Z",
      "version": 3,
      "collaborators": [
        {
          "userId": "user-uuid-789",
          "role": "reviewer",
          "status": "pending"
        }
      ]
    },
    "analytics": {
      "timeSpent": 900,
      "aiAssistanceUsed": 0.6,
      "completionScore": 0.85
    }
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### PUT /proposals/{proposalId}/sections/{sectionId}
Update specific proposal section.

**Request:**
```json
{
  "content": "Updated section content with user modifications...",
  "aiEnhancement": true,
  "preserveUserEdits": true
}
```

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "sectionId": "executive-summary",
    "content": "Enhanced content combining user input with AI improvements...",
    "status": "ai_enhanced",
    "wordCount": 520,
    "lastModified": "2024-01-15T10:50:00Z",
    "changes": [
      {
        "type": "ai_enhancement",
        "description": "Improved clarity and structure",
        "confidence": 0.92
      }
    ]
  },
  "timestamp": "2024-01-15T10:50:00Z"
}
```

### POST /proposals/{proposalId}/export
Export proposal to specified format.

**Request:**
```json
{
  "format": "pdf",  // pdf, docx, html
  "includeMetadata": true,
  "template": "standard",  // standard, formal, branded
  "sections": ["all"]  // or specific section IDs
}
```

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "exportId": "export-uuid-789",
    "downloadUrl": "https://s3.amazonaws.com/igad-exports/prop-uuid-123.pdf",
    "expiresAt": "2024-01-15T18:30:00Z",
    "format": "pdf",
    "fileSize": 2048576,
    "generatedAt": "2024-01-15T10:55:00Z"
  },
  "timestamp": "2024-01-15T10:55:00Z"
}
```

## Newsletter Generator Endpoints

### POST /newsletters/generate
Generate personalized newsletter.

**Request:**
```json
{
  "preferences": {
    "contentDays": 7,
    "maxArticles": 8,
    "sources": ["ICPAC", "CEWARN", "IDDRSI"],
    "topics": ["climate", "security", "agriculture"],
    "format": "html",
    "layout": "standard"
  },
  "deliveryOptions": {
    "schedule": "immediate",  // immediate, scheduled
    "scheduledFor": "2024-01-16T09:00:00Z",
    "recipients": ["self"]  // self, team, custom
  }
}
```

**Response (201):**
```json
{
  "status": "success",
  "data": {
    "newsletterId": "newsletter-uuid-456",
    "title": "IGAD Weekly Digest - January 15, 2024",
    "generatedAt": "2024-01-15T11:00:00Z",
    "sections": [
      {
        "id": "climate-updates",
        "title": "Climate & Weather Updates",
        "articles": [
          {
            "title": "Seasonal Rainfall Forecast for East Africa",
            "source": "ICPAC",
            "relevanceScore": 0.95,
            "summary": "AI-generated summary of the article...",
            "url": "https://icpac.net/article/123"
          }
        ]
      }
    ],
    "personalizationScore": 0.87,
    "estimatedReadTime": "12 minutes",
    "previewUrl": "https://newsletters.igad-hub.org/preview/newsletter-uuid-456"
  },
  "timestamp": "2024-01-15T11:00:00Z"
}
```

### GET /newsletters/{newsletterId}
Retrieve newsletter details.

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "id": "newsletter-uuid-456",
    "title": "IGAD Weekly Digest - January 15, 2024",
    "status": "generated",
    "sections": [
      {
        "id": "climate-updates",
        "title": "Climate & Weather Updates",
        "articles": [
          {
            "id": "article-001",
            "title": "Seasonal Rainfall Forecast for East Africa",
            "source": "ICPAC",
            "publishedAt": "2024-01-14T15:30:00Z",
            "relevanceScore": 0.95,
            "summary": "Comprehensive summary...",
            "content": "Full article content...",
            "url": "https://icpac.net/article/123",
            "tags": ["climate", "rainfall", "forecast"]
          }
        ]
      }
    ],
    "metadata": {
      "generatedAt": "2024-01-15T11:00:00Z",
      "personalizationScore": 0.87,
      "totalArticles": 8,
      "estimatedReadTime": "12 minutes"
    }
  },
  "timestamp": "2024-01-15T11:00:00Z"
}
```

## IGAD Knowledge Network Endpoints

### GET /knowledge/search
Search IGAD Knowledge Network.

**Query Parameters:**
- `q`: Search query (required)
- `sources`: Comma-separated list of sources
- `dateFrom`: ISO date string
- `dateTo`: ISO date string
- `limit`: Results limit (default: 10, max: 50)
- `offset`: Pagination offset

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "results": [
      {
        "id": "doc-uuid-789",
        "title": "Climate Resilience Assessment for Horn of Africa",
        "source": "ICPAC",
        "publishedAt": "2024-01-10T14:20:00Z",
        "relevanceScore": 0.94,
        "summary": "AI-generated summary of the document...",
        "url": "https://icpac.net/documents/doc-789",
        "topics": ["climate", "resilience", "assessment"],
        "documentType": "report",
        "language": "en"
      }
    ],
    "pagination": {
      "total": 156,
      "limit": 10,
      "offset": 0,
      "hasMore": true
    },
    "searchMetadata": {
      "query": "climate resilience",
      "executionTime": 0.245,
      "sources": ["ICPAC", "CEWARN", "IDDRSI"]
    }
  },
  "timestamp": "2024-01-15T11:05:00Z"
}
```

## Error Response Format

### Standard Error Response
```json
{
  "status": "error",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": [
      {
        "field": "templateId",
        "message": "Template ID is required",
        "code": "REQUIRED_FIELD"
      }
    ],
    "requestId": "req-uuid-123"
  },
  "timestamp": "2024-01-15T11:10:00Z"
}
```

## HTTP Status Codes

### Success Codes
- `200 OK`: Request successful
- `201 Created`: Resource created successfully
- `202 Accepted`: Request accepted for processing
- `204 No Content`: Successful request with no response body

### Client Error Codes
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Authentication required or invalid
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource conflict (e.g., duplicate)
- `422 Unprocessable Entity`: Valid request but semantic errors
- `429 Too Many Requests`: Rate limit exceeded

### Server Error Codes
- `500 Internal Server Error`: Unexpected server error
- `502 Bad Gateway`: Upstream service error
- `503 Service Unavailable`: Service temporarily unavailable
- `504 Gateway Timeout`: Upstream service timeout

## Rate Limiting and Throttling

### Rate Limit Headers
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642248600
X-RateLimit-Window: 60
```

### Throttling Response (429)
```json
{
  "status": "error",
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "retryAfter": 60
  },
  "timestamp": "2024-01-15T11:15:00Z"
}
```

This API specification provides a comprehensive foundation for all client-server interactions in the IGAD Innovation Hub platform.
