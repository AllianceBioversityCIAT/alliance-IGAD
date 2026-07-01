"""Unit tests for the DynamoDBClient.get_item consistent-read option."""

from unittest.mock import Mock

import pytest

from app.database.client import DynamoDBClient


@pytest.fixture
def db_client(mock_dynamodb_table):
    """Build a client instance with a mocked boto3 table (no real AWS calls)."""
    client = DynamoDBClient.__new__(DynamoDBClient)
    client.table_name = "test-table"
    client.region = "us-east-1"
    client.dynamodb = Mock()
    client.table = mock_dynamodb_table
    return client


@pytest.mark.asyncio
async def test_get_item_default_omits_consistent_read(db_client, mock_dynamodb_table):
    """Default call must not pass ConsistentRead (preserves existing behavior)."""
    mock_dynamodb_table.get_item.return_value = {"Item": {"PK": "p", "SK": "s"}}

    result = await db_client.get_item("p", "s")

    assert result == {"PK": "p", "SK": "s"}
    mock_dynamodb_table.get_item.assert_called_once_with(Key={"PK": "p", "SK": "s"})
    _, kwargs = mock_dynamodb_table.get_item.call_args
    assert "ConsistentRead" not in kwargs


@pytest.mark.asyncio
async def test_get_item_consistent_passes_consistent_read(
    db_client, mock_dynamodb_table
):
    """consistent=True must pass ConsistentRead=True to the boto3 table."""
    mock_dynamodb_table.get_item.return_value = {"Item": {"PK": "p", "SK": "s"}}

    result = await db_client.get_item("p", "s", consistent=True)

    assert result == {"PK": "p", "SK": "s"}
    mock_dynamodb_table.get_item.assert_called_once_with(
        Key={"PK": "p", "SK": "s"}, ConsistentRead=True
    )
