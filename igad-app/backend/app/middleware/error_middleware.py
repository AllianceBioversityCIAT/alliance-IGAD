"""
Error handling middleware with security logging
"""

import logging
from aws_lambda_powertools import Logger
from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

logger = Logger()
security_logger = logging.getLogger("security")


class ErrorMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        try:
            response = await call_next(request)
            
            # Security logging for unauthorized access
            if response.status_code == status.HTTP_401_UNAUTHORIZED:
                client_ip = request.client.host if request.client else "unknown"
                security_logger.warning(
                    f"Unauthorized access attempt: {request.method} {request.url.path} from {client_ip}",
                    extra={
                        "path": request.url.path,
                        "method": request.method,
                        "client_ip": client_ip,
                    },
                )
            
            # Security logging for rate limiting
            if response.status_code == status.HTTP_429_TOO_MANY_REQUESTS:
                client_ip = request.client.host if request.client else "unknown"
                security_logger.warning(
                    f"Rate limit exceeded: {client_ip} for {request.url.path}",
                    extra={"path": request.url.path, "client_ip": client_ip},
                )
            
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
            # SECURITY: Don't expose internal error details in production
            import os
            error_detail = str(e) if os.getenv("ENVIRONMENT") != "production" else "Internal server error"
            return JSONResponse(
                status_code=500, content={"error": error_detail}
            )
