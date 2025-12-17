"""
DynamoDB History Service

Tracks all operations on prompts and other critical data with:
- Operation type (CREATE, UPDATE, DELETE, READ)
- Timestamp and user information
- Before/after states for changes
- Automatic cleanup of old history records
"""

import os
from datetime import datetime, timezone
from typing import Any, Dict, Optional

import boto3
from boto3.dynamodb.conditions import Key


class HistoryService:
    """Service for tracking DynamoDB operations history."""

    def __init__(self):
        """Initialize the history service."""
        self.table_name = os.environ.get("TABLE_NAME", "igad-testing-main-table")
        self.dynamodb = boto3.resource("dynamodb")
        self.table = self.dynamodb.Table(self.table_name)

    def log_operation(
        self,
        operation_type: str,
        resource_type: str,
        resource_id: str,
        user_id: Optional[str] = None,
        before_state: Optional[Dict[str, Any]] = None,
        after_state: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> str:
        """
        Log a DynamoDB operation to history.

        Args:
            operation_type: CREATE, UPDATE, DELETE, READ
            resource_type: PROMPT, PROPOSAL, etc.
            resource_id: Unique identifier of the resource
            user_id: User who performed the operation
            before_state: State before the operation (for UPDATE/DELETE)
            after_state: State after the operation (for CREATE/UPDATE)
            metadata: Additional operation metadata

        Returns:
            History record ID
        """
        timestamp = datetime.now(timezone.utc).isoformat()
        history_id = f"{timestamp}#{operation_type}#{resource_id}"

        # Create history record
        history_record = {
            "PK": f"HISTORY#{resource_type}#{resource_id}",
            "SK": f"OPERATION#{timestamp}#{operation_type}",
            "history_id": history_id,
            "operation_type": operation_type,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "timestamp": timestamp,
            "user_id": user_id or "system",
            "metadata": metadata or {},
        }

        # Add states if provided
        if before_state:
            history_record["before_state"] = self._sanitize_state(before_state)
        if after_state:
            history_record["after_state"] = self._sanitize_state(after_state)

        # Store in DynamoDB
        try:
            self.table.put_item(Item=history_record)
            print(
                f"📝 History logged: {operation_type} on {resource_type}#{resource_id}"
            )
            return history_id
        except Exception as e:
            print(f"❌ Failed to log history: {str(e)}")
            # Don't fail the main operation if history logging fails
            return ""

    def get_resource_history(
        self, resource_type: str, resource_id: str, limit: int = 50
    ) -> list:
        """
        Get operation history for a specific resource.

        Args:
            resource_type: Type of resource (PROMPT, PROPOSAL, etc.)
            resource_id: Resource identifier
            limit: Maximum number of records to return

        Returns:
            List of history records, newest first
        """
        try:
            response = self.table.query(
                KeyConditionExpression=Key("PK").eq(
                    f"HISTORY#{resource_type}#{resource_id}"
                ),
                ScanIndexForward=False,  # Newest first
                Limit=limit,
            )
            return response.get("Items", [])
        except Exception as e:
            print(f"❌ Failed to get history: {str(e)}")
            return []

    def get_recent_operations(
        self, resource_type: Optional[str] = None, limit: int = 100
    ) -> list:
        """
        Get recent operations across all resources or specific type.

        Args:
            resource_type: Filter by resource type (optional)
            limit: Maximum number of records to return

        Returns:
            List of recent history records
        """
        try:
            if resource_type:
                # Query by resource type using GSI (would need to be created)
                # For now, scan with filter
                response = self.table.scan(
                    FilterExpression=Key("resource_type").eq(resource_type),
                    Limit=limit,
                )
            else:
                # Scan all history records
                response = self.table.scan(
                    FilterExpression=Key("PK").begins_with("HISTORY#"),
                    Limit=limit,
                )

            items = response.get("Items", [])
            # Sort by timestamp (newest first)
            return sorted(items, key=lambda x: x.get("timestamp", ""), reverse=True)
        except Exception as e:
            print(f"❌ Failed to get recent operations: {str(e)}")
            return []

    def cleanup_old_history(self, days_to_keep: int = 90) -> int:
        """
        Clean up history records older than specified days.

        Args:
            days_to_keep: Number of days to keep history

        Returns:
            Number of records deleted
        """
        from datetime import timedelta

        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days_to_keep)
        cutoff_iso = cutoff_date.isoformat()

        try:
            # Scan for old records
            response = self.table.scan(
                FilterExpression=Key("PK").begins_with("HISTORY#")
                & Key("timestamp").lt(cutoff_iso)
            )

            items = response.get("Items", [])
            deleted_count = 0

            # Delete old records in batches
            with self.table.batch_writer() as batch:
                for item in items:
                    batch.delete_item(Key={"PK": item["PK"], "SK": item["SK"]})
                    deleted_count += 1

            print(f"🧹 Cleaned up {deleted_count} old history records")
            return deleted_count

        except Exception as e:
            print(f"❌ Failed to cleanup history: {str(e)}")
            return 0

    def _sanitize_state(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """
        Sanitize state data for storage (remove sensitive info, limit size).

        Args:
            state: Raw state data

        Returns:
            Sanitized state data
        """
        # Create a copy to avoid modifying original
        sanitized = {}

        for key, value in state.items():
            # Skip sensitive fields
            if key.lower() in ["password", "secret", "token", "key"]:
                sanitized[key] = "[REDACTED]"
                continue

            # Limit string length
            if isinstance(value, str) and len(value) > 1000:
                sanitized[key] = value[:1000] + "... [TRUNCATED]"
            else:
                sanitized[key] = value

        return sanitized


# Global instance
history_service = HistoryService()
