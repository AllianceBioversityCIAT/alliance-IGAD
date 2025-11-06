"""
Health check endpoints for IGAD Innovation Hub API
"""

import os
from datetime import datetime
from fastapi import APIRouter, Depends
from aws_lambda_powertools import Logger

from ..database.client import db_client
from ..models.base import APIResponse

logger = Logger()
router = APIRouter()

@router.get("/", response_model=APIResponse)
async def health_check():
    """Basic health check endpoint"""
    return APIResponse(
        success=True,
        message="IGAD Innovation Hub API is healthy",
        data={
            "timestamp": datetime.utcnow().isoformat(),
            "version": "1.0.0",
            "environment": os.getenv("ENVIRONMENT", "testing")
        }
    )

@router.get("/detailed", response_model=APIResponse)
async def detailed_health_check():
    """Detailed health check with dependency validation"""
    health_data = {
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0",
        "environment": os.getenv("ENVIRONMENT", "testing"),
        "services": {}
    }
    
    # Check DynamoDB connection
    try:
        # Simple table description to test connection
        table_info = db_client.table.table_status
        health_data["services"]["dynamodb"] = {
            "status": "healthy",
            "table_name": db_client.table_name,
            "table_status": table_info
        }
    except Exception as e:
        logger.error(f"DynamoDB health check failed: {e}")
        health_data["services"]["dynamodb"] = {
            "status": "unhealthy",
            "error": str(e)
        }
    
    # Check environment variables
    required_env_vars = ["TABLE_NAME", "USER_POOL_ID", "USER_POOL_CLIENT_ID"]
    env_status = {}
    
    for var in required_env_vars:
        env_status[var] = "set" if os.getenv(var) else "missing"
    
    health_data["services"]["environment"] = {
        "status": "healthy" if all(os.getenv(var) for var in required_env_vars) else "degraded",
        "variables": env_status
    }
    
    # Overall health status
    all_healthy = all(
        service.get("status") == "healthy" 
        for service in health_data["services"].values()
    )
    
    return APIResponse(
        success=all_healthy,
        message="Detailed health check completed",
        data=health_data
    )
