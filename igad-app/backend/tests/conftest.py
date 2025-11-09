import pytest
from unittest.mock import Mock, patch
from datetime import datetime
from app.models.prompt_model import Prompt, PromptCreate, ProposalSection

@pytest.fixture
def mock_dynamodb_table():
    """Mock DynamoDB table for testing"""
    table = Mock()
    table.put_item = Mock()
    table.get_item = Mock()
    table.query = Mock()
    table.scan = Mock()
    table.delete_item = Mock()
    return table

@pytest.fixture
def sample_prompt_create():
    """Sample PromptCreate data for testing"""
    return PromptCreate(
        name="Test Prompt",
        section=ProposalSection.PROBLEM_STATEMENT,
        route="/test/route",
        tags=["test", "sample"],
        system_prompt="You are a test assistant.",
        user_prompt_template="Help me with {{topic}}",
        context={
            "persona": "Test persona",
            "tone": "professional",
            "constraints": "Keep it brief",
            "guardrails": "No speculation"
        }
    )

@pytest.fixture
def sample_prompt():
    """Sample Prompt model for testing"""
    return Prompt(
        id="test-prompt-123",
        name="Test Prompt",
        section=ProposalSection.PROBLEM_STATEMENT,
        route="/test/route",
        tags=["test", "sample"],
        version=1,
        is_active=True,
        system_prompt="You are a test assistant.",
        user_prompt_template="Help me with {{topic}}",
        context={
            "persona": "Test persona",
            "tone": "professional",
            "constraints": "Keep it brief",
            "guardrails": "No speculation"
        },
        created_by="test-user",
        updated_by="test-user",
        created_at=datetime(2025, 1, 1, 12, 0, 0),
        updated_at=datetime(2025, 1, 1, 12, 0, 0)
    )

@pytest.fixture
def sample_dynamodb_item():
    """Sample DynamoDB item for testing"""
    return {
        'PK': 'prompt#test-prompt-123',
        'SK': 'version#1',
        'id': 'test-prompt-123',
        'name': 'Test Prompt',
        'section': 'problem_statement',
        'route': '/test/route',
        'tags': ['test', 'sample'],
        'version': 1,
        'status': 'draft',
        'system_prompt': 'You are a test assistant.',
        'user_prompt_template': 'Help me with {{topic}}',
        'context': {
            'persona': 'Test persona',
            'tone': 'professional',
            'constraints': 'Keep it brief',
            'guardrails': 'No speculation'
        },
        'created_by': 'test-user',
        'updated_by': 'test-user',
        'created_at': '2025-01-01T12:00:00Z',
        'updated_at': '2025-01-01T12:00:00Z'
    }

@pytest.fixture
def mock_bedrock_client():
    """Mock Bedrock client for testing"""
    client = Mock()
    client.invoke_model = Mock()
    return client
