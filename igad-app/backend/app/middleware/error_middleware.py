"""
Error handling middleware
"""

from aws_lambda_powertools import Logger
from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

logger = Logger()


class ErrorMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        try:
            response = await call_next(request)
            return response
        except HTTPException as e:
            logger.error(
                f"HTTP Exception: {e.detail}",
                extra={"status_code": e.status_code, "path": request.url.path},
            )
            return JSONResponse(status_code=e.status_code, content={"error": e.detail})
        except Exception as e:
            logger.error(
                f"Unexpected error: {str(e)}",
                extra={"path": request.url.path, "method": request.method},
            )
            return JSONResponse(
                status_code=500, content={"error": "Internal server error"}
            )
