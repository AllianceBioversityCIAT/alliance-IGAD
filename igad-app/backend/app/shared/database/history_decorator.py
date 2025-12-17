"""
History Tracking Decorator

Automatically tracks DynamoDB operations with minimal code changes.
Usage:
    @track_history("PROMPT", get_resource_id=lambda args, kwargs: args[0])
    def create_prompt(prompt_id, data):
        # Your existing code
        pass
"""

import functools
from typing import Any, Callable, Dict, Optional

from app.shared.database.history_service import history_service


def track_history(
    resource_type: str,
    get_resource_id: Callable = None,
    get_user_id: Callable = None,
    operation_type: Optional[str] = None,
    capture_before: bool = True,
    capture_after: bool = True,
):
    """
    Decorator to automatically track DynamoDB operations.

    Args:
        resource_type: Type of resource (PROMPT, PROPOSAL, etc.)
        get_resource_id: Function to extract resource ID from function args
        get_user_id: Function to extract user ID from function args
        operation_type: Override operation type (auto-detected from function name)
        capture_before: Whether to capture state before operation
        capture_after: Whether to capture state after operation

    Example:
        @track_history("PROMPT", get_resource_id=lambda args, kwargs: args[0])
        def delete_prompt(prompt_id):
            # deletion logic
            pass
    """

    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # Extract resource ID
            resource_id = "unknown"
            if get_resource_id:
                try:
                    resource_id = get_resource_id(args, kwargs)
                except Exception as e:
                    print(f"⚠️  Failed to extract resource_id: {e}")

            # Extract user ID
            user_id = None
            if get_user_id:
                try:
                    user_id = get_user_id(args, kwargs)
                except Exception as e:
                    print(f"⚠️  Failed to extract user_id: {e}")

            # Determine operation type
            op_type = operation_type
            if not op_type:
                func_name = func.__name__.lower()
                if "create" in func_name or "add" in func_name:
                    op_type = "CREATE"
                elif "update" in func_name or "modify" in func_name:
                    op_type = "UPDATE"
                elif "delete" in func_name or "remove" in func_name:
                    op_type = "DELETE"
                else:
                    op_type = "READ"

            # Capture before state for UPDATE/DELETE operations
            before_state = None
            if capture_before and op_type in ["UPDATE", "DELETE"]:
                try:
                    # Try to get current state (this is application-specific)
                    before_state = _get_current_state(resource_type, resource_id)
                except Exception as e:
                    print(f"⚠️  Failed to capture before state: {e}")

            # Execute the original function
            try:
                result = func(*args, **kwargs)
            except Exception as e:
                # Log failed operation
                history_service.log_operation(
                    operation_type=f"{op_type}_FAILED",
                    resource_type=resource_type,
                    resource_id=resource_id,
                    user_id=user_id,
                    before_state=before_state,
                    metadata={"error": str(e), "function": func.__name__},
                )
                raise

            # Capture after state for CREATE/UPDATE operations
            after_state = None
            if capture_after and op_type in ["CREATE", "UPDATE"]:
                try:
                    after_state = _get_current_state(resource_type, resource_id)
                except Exception as e:
                    print(f"⚠️  Failed to capture after state: {e}")

            # Log successful operation
            history_service.log_operation(
                operation_type=op_type,
                resource_type=resource_type,
                resource_id=resource_id,
                user_id=user_id,
                before_state=before_state,
                after_state=after_state,
                metadata={
                    "function": func.__name__,
                    "success": True,
                },
            )

            return result

        return wrapper

    return decorator


def _get_current_state(
    resource_type: str, resource_id: str
) -> Optional[Dict[str, Any]]:
    """
    Get current state of a resource from DynamoDB.
    This is a helper function that needs to be customized per resource type.
    """
    from app.database.client import db_client

    try:
        if resource_type == "PROMPT":
            # For prompts, we need to find by scanning (since we don't know the exact SK)
            # This is a simplified version - you might need to adjust based on your schema
            return db_client.get_item_sync(pk=f"PROMPT#{resource_id}", sk="METADATA")
        elif resource_type == "PROPOSAL":
            return db_client.get_item_sync(pk=f"PROPOSAL#{resource_id}", sk="METADATA")
        else:
            return None
    except Exception:
        return None
