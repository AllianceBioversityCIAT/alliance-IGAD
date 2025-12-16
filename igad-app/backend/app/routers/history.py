"""
History Management API

Endpoints for viewing and managing operation history.
"""

from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.shared.database.history_service import history_service

router = APIRouter(prefix="/api/history", tags=["history"])


class HistoryRecord(BaseModel):
    """History record response model."""

    history_id: str
    operation_type: str
    resource_type: str
    resource_id: str
    timestamp: str
    user_id: str
    before_state: Optional[dict] = None
    after_state: Optional[dict] = None
    metadata: Optional[dict] = None


class HistoryResponse(BaseModel):
    """History response model."""

    records: List[HistoryRecord]
    total: int


@router.get("/resource/{resource_type}/{resource_id}", response_model=HistoryResponse)
async def get_resource_history(
    resource_type: str,
    resource_id: str,
    limit: int = Query(50, ge=1, le=200, description="Maximum number of records"),
):
    """
    Get operation history for a specific resource.

    Args:
        resource_type: Type of resource (PROMPT, PROPOSAL, etc.)
        resource_id: Resource identifier
        limit: Maximum number of records to return

    Returns:
        History records for the resource
    """
    try:
        records = history_service.get_resource_history(
            resource_type=resource_type.upper(),
            resource_id=resource_id,
            limit=limit,
        )

        return HistoryResponse(
            records=[HistoryRecord(**record) for record in records],
            total=len(records),
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get history: {str(e)}")


@router.get("/recent", response_model=HistoryResponse)
async def get_recent_operations(
    resource_type: Optional[str] = Query(
        None, description="Filter by resource type (PROMPT, PROPOSAL, etc.)"
    ),
    limit: int = Query(100, ge=1, le=500, description="Maximum number of records"),
):
    """
    Get recent operations across all resources or specific type.

    Args:
        resource_type: Filter by resource type (optional)
        limit: Maximum number of records to return

    Returns:
        Recent history records
    """
    try:
        records = history_service.get_recent_operations(
            resource_type=resource_type.upper() if resource_type else None,
            limit=limit,
        )

        return HistoryResponse(
            records=[HistoryRecord(**record) for record in records],
            total=len(records),
        )

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get recent operations: {str(e)}"
        )


@router.post("/cleanup")
async def cleanup_old_history(
    days_to_keep: int = Query(90, ge=1, le=365, description="Days of history to keep")
):
    """
    Clean up old history records.

    Args:
        days_to_keep: Number of days to keep history

    Returns:
        Number of records deleted
    """
    try:
        deleted_count = history_service.cleanup_old_history(days_to_keep=days_to_keep)

        return {
            "message": f"Successfully cleaned up {deleted_count} old history records",
            "deleted_count": deleted_count,
            "days_kept": days_to_keep,
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to cleanup history: {str(e)}"
        )


@router.get("/stats")
async def get_history_stats():
    """
    Get history statistics.

    Returns:
        Statistics about history records
    """
    try:
        # Get recent operations to calculate stats
        recent_records = history_service.get_recent_operations(limit=1000)

        # Calculate statistics
        total_operations = len(recent_records)
        operation_types = {}
        resource_types = {}
        users = {}

        for record in recent_records:
            # Count operation types
            op_type = record.get("operation_type", "UNKNOWN")
            operation_types[op_type] = operation_types.get(op_type, 0) + 1

            # Count resource types
            res_type = record.get("resource_type", "UNKNOWN")
            resource_types[res_type] = resource_types.get(res_type, 0) + 1

            # Count users
            user = record.get("user_id", "unknown")
            users[user] = users.get(user, 0) + 1

        return {
            "total_operations": total_operations,
            "operation_types": operation_types,
            "resource_types": resource_types,
            "top_users": dict(sorted(users.items(), key=lambda x: x[1], reverse=True)[:10]),
            "sample_size": "Last 1000 operations",
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get history stats: {str(e)}"
        )
