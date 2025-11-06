# IGAD Innovation Hub - Backend/AI Specification

## Serverless Architecture Overview

### Core Infrastructure
- **API Gateway (HTTP)**: Cost-effective REST API endpoints
- **AWS Lambda (Python 3.11)**: Serverless compute with auto-scaling
- **DynamoDB (On-Demand)**: NoSQL database with single-table design
- **S3**: Document storage and static assets
- **Cognito**: User authentication and authorization
- **Bedrock**: AI/ML services for content generation
- **CloudWatch/X-Ray**: Observability and distributed tracing

### Architecture Principles
- **Serverless-first**: Managed services, pay-per-use model
- **Single-table design**: DynamoDB optimization for cost and performance
- **Event-driven**: Asynchronous processing with EventBridge
- **Least privilege**: IAM roles with minimal required permissions

## Repository Layout

```
/
├── infra/                    # AWS CDK Infrastructure
│   ├── lib/
│   │   ├── api-stack.ts     # API Gateway + Lambda
│   │   ├── data-stack.ts    # DynamoDB + S3
│   │   ├── auth-stack.ts    # Cognito User Pool
│   │   └── monitoring-stack.ts # CloudWatch + X-Ray
│   ├── bin/
│   │   └── app.ts           # CDK App entry point
│   └── cdk.json
├── src/                     # Lambda source code
│   ├── handlers/            # API route handlers
│   │   ├── auth/
│   │   ├── proposals/
│   │   ├── newsletters/
│   │   └── prompts/
│   ├── services/            # Business logic services
│   │   ├── prompt_manager.py
│   │   ├── ai_service.py
│   │   ├── igad_kn_client.py
│   │   └── data_service.py
│   ├── models/              # Data models and DTOs
│   ├── utils/               # Shared utilities
│   └── config/              # Configuration management
├── tests/                   # Test suites
│   ├── unit/
│   ├── integration/
│   └── fixtures/
└── requirements.txt         # Python dependencies
```

## API Design

### Authentication & Authorization
```python
# JWT Token validation middleware
from functools import wraps
import jwt
from typing import Dict, Any

def require_auth(groups: list = None):
    def decorator(func):
        @wraps(func)
        def wrapper(event, context):
            try:
                token = extract_token(event['headers'])
                claims = validate_jwt_token(token)
                
                if groups and not any(g in claims.get('cognito:groups', []) for g in groups):
                    return error_response(403, 'Insufficient permissions')
                
                event['user'] = claims
                return func(event, context)
            except Exception as e:
                return error_response(401, 'Unauthorized')
        return wrapper
    return decorator
```

### API Endpoints Structure
```python
# src/handlers/proposals/handler.py
@require_auth(groups=['admin', 'editor', 'consumer'])
def list_proposals(event, context):
    """GET /proposals - List user proposals"""
    user_id = event['user']['sub']
    proposals = proposal_service.list_by_user(user_id)
    return success_response(proposals)

@require_auth(groups=['admin', 'editor'])
def create_proposal(event, context):
    """POST /proposals - Create new proposal"""
    data = json.loads(event['body'])
    user_id = event['user']['sub']
    
    # Validate request
    request = CreateProposalRequest(**data)
    
    # Create proposal
    proposal = proposal_service.create(user_id, request)
    return success_response(proposal, status_code=201)
```

### Request/Response DTOs
```python
# src/models/proposals.py
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class CreateProposalRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    template_id: str = Field(..., regex=r'^template-[a-zA-Z0-9-]+$')
    context: Dict[str, Any] = Field(default_factory=dict)
    collaborators: Optional[List[str]] = None

class ProposalResponse(BaseModel):
    id: str
    title: str
    status: str
    progress: float
    created_at: datetime
    updated_at: datetime
    sections: List[ProposalSection]
    
class ErrorResponse(BaseModel):
    error: str
    message: str
    details: Optional[Dict[str, Any]] = None
    request_id: str
```

## Data Models

### DynamoDB Single-Table Design
```python
# Primary Table: igad-innovation-hub-data
TABLE_SCHEMA = {
    'TableName': 'igad-innovation-hub-data',
    'KeySchema': [
        {'AttributeName': 'PK', 'KeyType': 'HASH'},
        {'AttributeName': 'SK', 'KeyType': 'RANGE'}
    ],
    'AttributeDefinitions': [
        {'AttributeName': 'PK', 'AttributeType': 'S'},
        {'AttributeName': 'SK', 'AttributeType': 'S'},
        {'AttributeName': 'GSI1PK', 'AttributeType': 'S'},
        {'AttributeName': 'GSI1SK', 'AttributeType': 'S'}
    ],
    'GlobalSecondaryIndexes': [
        {
            'IndexName': 'GSI1',
            'KeySchema': [
                {'AttributeName': 'GSI1PK', 'KeyType': 'HASH'},
                {'AttributeName': 'GSI1SK', 'KeyType': 'RANGE'}
            ]
        }
    ],
    'BillingMode': 'ON_DEMAND'
}
```

### Entity Patterns
```python
# Users: PK=user#<id>, SK=profile
USER_PATTERN = {
    'PK': 'user#{user_id}',
    'SK': 'profile',
    'GSI1PK': 'org#{organization_id}',
    'GSI1SK': 'user#{user_id}',
    'user_id': str,
    'email': str,
    'role': str,  # admin|editor|consumer
    'organization': str,
    'created_at': str,
    'updated_at': str
}

# Prompts: PK=prompt#<id>, SK=version#<n>
PROMPT_PATTERN = {
    'PK': 'prompt#{prompt_id}',
    'SK': 'version#{version}',
    'GSI1PK': 'prompt_type#{type}',
    'GSI1SK': 'prompt#{prompt_id}#version#{version}',
    'prompt_id': str,
    'version': int,
    'name': str,
    'content': str,
    'type': str,  # proposal|newsletter
    'tags': List[str],
    'created_by': str,
    'created_at': str,
    'is_active': bool
}

# Proposals: PK=proposal#<id>, SK=metadata
PROPOSAL_PATTERN = {
    'PK': 'proposal#{proposal_id}',
    'SK': 'metadata',
    'GSI1PK': 'user#{user_id}',
    'GSI1SK': 'proposal#{created_at}#{proposal_id}',
    'proposal_id': str,
    'title': str,
    'status': str,  # draft|in_review|completed
    'template_id': str,
    'created_by': str,
    'created_at': str,
    'updated_at': str,
    'sections': List[Dict]
}
```

## Prompt Manager Service

### Core Operations
```python
# src/services/prompt_manager.py
import boto3
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid

class PromptManagerService:
    def __init__(self):
        self.dynamodb = boto3.resource('dynamodb')
        self.table = self.dynamodb.Table('igad-innovation-hub-data')
        self.bedrock = boto3.client('bedrock-runtime')
        self.igad_kn_client = IGADKnowledgeNetworkClient()
    
    def create_template(self, user_id: str, template_data: Dict[str, Any]) -> Dict:
        """Create new prompt template"""
        prompt_id = f"prompt-{uuid.uuid4().hex[:8]}"
        version = 1
        
        item = {
            'PK': f'prompt#{prompt_id}',
            'SK': f'version#{version}',
            'GSI1PK': f'prompt_type#{template_data["type"]}',
            'GSI1SK': f'prompt#{prompt_id}#version#{version}',
            'prompt_id': prompt_id,
            'version': version,
            'name': template_data['name'],
            'content': template_data['content'],
            'type': template_data['type'],
            'tags': template_data.get('tags', []),
            'created_by': user_id,
            'created_at': datetime.utcnow().isoformat(),
            'is_active': True
        }
        
        self.table.put_item(Item=item)
        return item
    
    def get_template(self, prompt_id: str, version: str = 'latest') -> Optional[Dict]:
        """Retrieve prompt template by ID and version"""
        if version == 'latest':
            # Query for latest version
            response = self.table.query(
                KeyConditionExpression='PK = :pk',
                ExpressionAttributeValues={':pk': f'prompt#{prompt_id}'},
                ScanIndexForward=False,
                Limit=1
            )
        else:
            response = self.table.get_item(
                Key={
                    'PK': f'prompt#{prompt_id}',
                    'SK': f'version#{version}'
                }
            )
            
        return response.get('Item') if 'Item' in response else None
    
    def list_templates(self, prompt_type: str = None, tags: List[str] = None) -> List[Dict]:
        """List prompt templates with optional filtering"""
        if prompt_type:
            response = self.table.query(
                IndexName='GSI1',
                KeyConditionExpression='GSI1PK = :type',
                ExpressionAttributeValues={':type': f'prompt_type#{prompt_type}'},
                FilterExpression='is_active = :active',
                ExpressionAttributeValues={':active': True}
            )
        else:
            # Scan for all active templates
            response = self.table.scan(
                FilterExpression='begins_with(PK, :prefix) AND is_active = :active',
                ExpressionAttributeValues={
                    ':prefix': 'prompt#',
                    ':active': True
                }
            )
        
        templates = response.get('Items', [])
        
        # Filter by tags if provided
        if tags:
            templates = [t for t in templates if any(tag in t.get('tags', []) for tag in tags)]
        
        return templates
```

### Context Enrichment & AI Integration
```python
    def enrich_context(self, context: Dict[str, Any], prompt_type: str) -> Dict[str, Any]:
        """Enrich context with IGAD-KN data"""
        enriched_context = context.copy()
        
        # Fetch relevant IGAD-KN data based on context
        if 'region' in context:
            regional_data = self.igad_kn_client.get_regional_data(context['region'])
            enriched_context['regional_insights'] = regional_data
        
        if 'sector' in context:
            sector_data = self.igad_kn_client.get_sector_data(context['sector'])
            enriched_context['sector_analysis'] = sector_data
        
        # Add current date and metadata
        enriched_context['generated_at'] = datetime.utcnow().isoformat()
        enriched_context['prompt_type'] = prompt_type
        
        return enriched_context
    
    def execute_prompt(self, prompt_id: str, context: Dict[str, Any], 
                      model_config: Dict[str, Any] = None) -> Dict[str, Any]:
        """Execute prompt with Bedrock"""
        # Get template
        template = self.get_template(prompt_id)
        if not template:
            raise ValueError(f"Template {prompt_id} not found")
        
        # Enrich context
        enriched_context = self.enrich_context(context, template['type'])
        
        # Interpolate template
        prompt_content = self.interpolate_template(template['content'], enriched_context)
        
        # Apply guardrails
        if not self.validate_prompt_safety(prompt_content):
            raise ValueError("Prompt failed safety validation")
        
        # Configure model
        config = {
            'modelId': 'anthropic.claude-3-sonnet-20240229-v1:0',
            'maxTokens': 4000,
            'temperature': 0.3,
            'topP': 0.9,
            **(model_config or {})
        }
        
        # Execute with Bedrock
        response = self.bedrock.invoke_model(
            modelId=config['modelId'],
            body=json.dumps({
                'anthropic_version': 'bedrock-2023-05-31',
                'max_tokens': config['maxTokens'],
                'temperature': config['temperature'],
                'top_p': config['topP'],
                'messages': [{'role': 'user', 'content': prompt_content}]
            })
        )
        
        result = json.loads(response['body'].read())
        
        # Log usage
        self.log_prompt_usage(prompt_id, template['version'], context, result)
        
        return {
            'content': result['content'][0]['text'],
            'usage': result.get('usage', {}),
            'template_id': prompt_id,
            'template_version': template['version']
        }
```

This specification provides the foundation for a robust, scalable backend system that integrates AI capabilities with the IGAD Innovation Hub's requirements while maintaining simplicity and cost-effectiveness.
### Feedback & Analytics
```python
    def submit_feedback(self, prompt_id: str, version: int, user_id: str, 
                       feedback_data: Dict[str, Any]) -> Dict[str, Any]:
        """Submit feedback for prompt template"""
        feedback_id = f"feedback-{uuid.uuid4().hex[:8]}"
        
        feedback_item = {
            'PK': f'prompt#{prompt_id}',
            'SK': f'feedback#{feedback_id}',
            'GSI1PK': f'user#{user_id}',
            'GSI1SK': f'feedback#{datetime.utcnow().isoformat()}',
            'feedback_id': feedback_id,
            'prompt_id': prompt_id,
            'version': version,
            'user_id': user_id,
            'rating': feedback_data['rating'],  # 1-5
            'comment': feedback_data.get('comment', ''),
            'context': feedback_data.get('context', {}),
            'created_at': datetime.utcnow().isoformat()
        }
        
        self.table.put_item(Item=feedback_item)
        return feedback_item
    
    def log_prompt_usage(self, prompt_id: str, version: int, context: Dict, result: Dict):
        """Log prompt usage for analytics"""
        log_id = f"usage-{uuid.uuid4().hex[:8]}"
        
        usage_log = {
            'PK': f'log#{datetime.utcnow().strftime("%Y-%m-%d")}',
            'SK': f'usage#{log_id}',
            'GSI1PK': f'prompt#{prompt_id}',
            'GSI1SK': f'usage#{datetime.utcnow().isoformat()}',
            'log_id': log_id,
            'prompt_id': prompt_id,
            'version': version,
            'tokens_used': result.get('usage', {}).get('total_tokens', 0),
            'execution_time': result.get('execution_time', 0),
            'context_size': len(json.dumps(context)),
            'timestamp': datetime.utcnow().isoformat()
        }
        
        self.table.put_item(Item=usage_log)
```

## IGAD Knowledge Network Integration

### External Data Client
```python
# src/services/igad_kn_client.py
import httpx
import asyncio
from typing import Dict, List, Optional
from datetime import datetime, timedelta

class IGADKnowledgeNetworkClient:
    def __init__(self):
        self.base_urls = {
            'ICPAC': 'https://api.icpac.net/v1',
            'CEWARN': 'https://api.cewarn.org/v1', 
            'IDDRSI': 'https://api.iddrsi.org/v1'
        }
        self.cache_ttl = 3600  # 1 hour cache
        self.s3_cache = boto3.client('s3')
        self.cache_bucket = 'igad-kn-cache'
    
    async def get_regional_data(self, region: str) -> Dict[str, Any]:
        """Fetch regional data from multiple IGAD sources"""
        cache_key = f"regional/{region}/{datetime.utcnow().strftime('%Y-%m-%d-%H')}"
        
        # Check cache first
        cached_data = await self.get_cached_data(cache_key)
        if cached_data:
            return cached_data
        
        # Fetch from multiple sources concurrently
        tasks = [
            self.fetch_icpac_data(region),
            self.fetch_cewarn_data(region),
            self.fetch_iddrsi_data(region)
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Combine results
        regional_data = {
            'region': region,
            'climate_data': results[0] if not isinstance(results[0], Exception) else None,
            'security_data': results[1] if not isinstance(results[1], Exception) else None,
            'resilience_data': results[2] if not isinstance(results[2], Exception) else None,
            'last_updated': datetime.utcnow().isoformat()
        }
        
        # Cache result
        await self.cache_data(cache_key, regional_data)
        
        return regional_data
    
    async def fetch_icpac_data(self, region: str) -> Dict:
        """Fetch climate data from ICPAC"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_urls['ICPAC']}/climate/regional",
                params={'region': region, 'period': '30d'},
                timeout=10.0
            )
            response.raise_for_status()
            return response.json()
```

## Observability & Monitoring

### Structured Logging
```python
# src/utils/logger.py
import json
import logging
from datetime import datetime
from typing import Dict, Any

class StructuredLogger:
    def __init__(self, service_name: str):
        self.service_name = service_name
        self.logger = logging.getLogger(service_name)
        self.logger.setLevel(logging.INFO)
        
        # JSON formatter
        handler = logging.StreamHandler()
        handler.setFormatter(self.JSONFormatter())
        self.logger.addHandler(handler)
    
    class JSONFormatter(logging.Formatter):
        def format(self, record):
            log_entry = {
                'timestamp': datetime.utcnow().isoformat(),
                'level': record.levelname,
                'service': record.name,
                'message': record.getMessage(),
                'request_id': getattr(record, 'request_id', None),
                'user_id': getattr(record, 'user_id', None),
                'execution_time': getattr(record, 'execution_time', None)
            }
            
            if record.exc_info:
                log_entry['exception'] = self.formatException(record.exc_info)
            
            return json.dumps(log_entry)
    
    def info(self, message: str, **kwargs):
        extra = {k: v for k, v in kwargs.items()}
        self.logger.info(message, extra=extra)
    
    def error(self, message: str, **kwargs):
        extra = {k: v for k, v in kwargs.items()}
        self.logger.error(message, extra=extra)

# Usage in handlers
logger = StructuredLogger('prompt-manager')

def lambda_handler(event, context):
    request_id = context.aws_request_id
    start_time = time.time()
    
    try:
        logger.info("Processing request", 
                   request_id=request_id, 
                   path=event.get('path'))
        
        result = process_request(event)
        
        logger.info("Request completed", 
                   request_id=request_id,
                   execution_time=time.time() - start_time)
        
        return result
        
    except Exception as e:
        logger.error("Request failed", 
                    request_id=request_id,
                    error=str(e),
                    execution_time=time.time() - start_time)
        raise
```

### CloudWatch Metrics
```python
# src/utils/metrics.py
import boto3
from typing import Dict, List

class MetricsCollector:
    def __init__(self):
        self.cloudwatch = boto3.client('cloudwatch')
        self.namespace = 'IGAD/InnovationHub'
    
    def put_metric(self, metric_name: str, value: float, 
                   dimensions: Dict[str, str] = None, unit: str = 'Count'):
        """Put custom metric to CloudWatch"""
        metric_data = {
            'MetricName': metric_name,
            'Value': value,
            'Unit': unit,
            'Timestamp': datetime.utcnow()
        }
        
        if dimensions:
            metric_data['Dimensions'] = [
                {'Name': k, 'Value': v} for k, v in dimensions.items()
            ]
        
        self.cloudwatch.put_metric_data(
            Namespace=self.namespace,
            MetricData=[metric_data]
        )
    
    def track_prompt_execution(self, prompt_id: str, execution_time: float, 
                              tokens_used: int, success: bool):
        """Track prompt execution metrics"""
        dimensions = {'PromptId': prompt_id}
        
        self.put_metric('PromptExecutionTime', execution_time, dimensions, 'Milliseconds')
        self.put_metric('TokensUsed', tokens_used, dimensions, 'Count')
        self.put_metric('PromptExecutions', 1, dimensions, 'Count')
        
        if success:
            self.put_metric('SuccessfulExecutions', 1, dimensions, 'Count')
        else:
            self.put_metric('FailedExecutions', 1, dimensions, 'Count')

# Usage in services
metrics = MetricsCollector()

def execute_prompt(prompt_id: str, context: Dict) -> Dict:
    start_time = time.time()
    success = False
    tokens_used = 0
    
    try:
        result = bedrock_client.invoke_model(...)
        tokens_used = result.get('usage', {}).get('total_tokens', 0)
        success = True
        return result
    finally:
        execution_time = (time.time() - start_time) * 1000
        metrics.track_prompt_execution(prompt_id, execution_time, tokens_used, success)
```

## Performance & Cost Optimization

### Lambda Configuration
```python
# infra/lib/api-stack.ts
const promptManagerFunction = new Function(this, 'PromptManagerFunction', {
  runtime: Runtime.PYTHON_3_11,
  handler: 'handlers.prompts.handler.main',
  code: Code.fromAsset('src'),
  memorySize: 1024,  // Optimized for AI workloads
  timeout: Duration.seconds(60),
  reservedConcurrentExecutions: 10,  // Cost control
  environment: {
    DYNAMODB_TABLE: table.tableName,
    BEDROCK_REGION: 'us-east-1',
    LOG_LEVEL: 'INFO'
  },
  layers: [
    LayerVersion.fromLayerVersionArn(this, 'PowertoolsLayer', 
      'arn:aws:lambda:us-east-1:017000801446:layer:AWSLambdaPowertoolsPythonV2:59')
  ]
});
```

### DynamoDB Optimization
```python
# Batch operations for efficiency
def batch_write_items(items: List[Dict]) -> None:
    """Batch write items to DynamoDB"""
    with table.batch_writer() as batch:
        for item in items:
            batch.put_item(Item=item)

# Efficient queries with proper key design
def get_user_proposals(user_id: str, limit: int = 20) -> List[Dict]:
    """Get user proposals with pagination"""
    response = table.query(
        IndexName='GSI1',
        KeyConditionExpression='GSI1PK = :user_id',
        ExpressionAttributeValues={':user_id': f'user#{user_id}'},
        ScanIndexForward=False,  # Latest first
        Limit=limit
    )
    return response['Items']
```

## Testing Strategy

### Unit Tests
```python
# tests/unit/test_prompt_manager.py
import pytest
from moto import mock_dynamodb
from src.services.prompt_manager import PromptManagerService

@mock_dynamodb
def test_create_template():
    # Setup
    service = PromptManagerService()
    template_data = {
        'name': 'Test Template',
        'content': 'Hello {name}',
        'type': 'proposal',
        'tags': ['test']
    }
    
    # Execute
    result = service.create_template('user-123', template_data)
    
    # Assert
    assert result['name'] == 'Test Template'
    assert result['version'] == 1
    assert result['created_by'] == 'user-123'

@pytest.mark.asyncio
async def test_execute_prompt_with_context():
    service = PromptManagerService()
    
    # Mock Bedrock response
    with patch.object(service.bedrock, 'invoke_model') as mock_bedrock:
        mock_bedrock.return_value = {
            'body': MagicMock(read=lambda: json.dumps({
                'content': [{'text': 'Generated content'}],
                'usage': {'total_tokens': 100}
            }))
        }
        
        result = service.execute_prompt('prompt-123', {'name': 'Test'})
        
        assert result['content'] == 'Generated content'
        assert result['usage']['total_tokens'] == 100
```

### Integration Tests
```python
# tests/integration/test_api_endpoints.py
import json
import boto3
from moto import mock_dynamodb, mock_cognitoidp

@mock_dynamodb
@mock_cognitoidp
def test_create_proposal_endpoint():
    # Setup test environment
    setup_test_dynamodb()
    setup_test_cognito()
    
    # Create test event
    event = {
        'httpMethod': 'POST',
        'path': '/proposals',
        'headers': {'Authorization': 'Bearer test-token'},
        'body': json.dumps({
            'title': 'Test Proposal',
            'template_id': 'template-123',
            'context': {'region': 'East Africa'}
        })
    }
    
    # Execute handler
    from src.handlers.proposals.handler import create_proposal
    response = create_proposal(event, {})
    
    # Assert
    assert response['statusCode'] == 201
    body = json.loads(response['body'])
    assert body['title'] == 'Test Proposal'
```

## Deployment Configuration

### CDK Stacks
```typescript
// infra/bin/app.ts
import { App } from 'aws-cdk-lib';
import { IGADInnovationHubStack } from '../lib/igad-stack';

const app = new App();

// Testing environment
new IGADInnovationHubStack(app, 'IGADInnovationHub-Testing', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: 'us-east-1'
  },
  stage: 'testing',
  domainName: 'testing.igad-innovation-hub.org'
});

// Production environment
new IGADInnovationHubStack(app, 'IGADInnovationHub-Production', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: 'us-east-1'
  },
  stage: 'production',
  domainName: 'igad-innovation-hub.org'
});
```

### CI/CD Pipeline
```yaml
# .github/workflows/backend-deploy.yml
name: Deploy Backend
on:
  push:
    branches: [main, develop]
    paths: ['src/**', 'infra/**']

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - run: pip install -r requirements.txt -r requirements-dev.txt
      - run: pytest tests/ --cov=src --cov-report=xml
      - run: flake8 src/
      - run: mypy src/

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npx cdk deploy --all --require-approval never
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

This comprehensive backend specification provides a complete, production-ready foundation for the IGAD Innovation Hub MVP, emphasizing serverless architecture, cost optimization, and robust AI integration through the Prompt Manager service.
