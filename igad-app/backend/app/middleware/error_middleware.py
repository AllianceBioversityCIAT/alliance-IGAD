"""
Error handling middleware with security logging
"""

import logging
import os

from aws_lambda_powertools import Logger
from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

logger = Logger()
security_logger = logging.getLogger("security")


def _add_cors_headers(response: Response, request: Request) -> Response:
    """Add CORS headers to response to ensure they're always present, even on errors."""
    origin = request.headers.get("origin")
    if origin:
        # Get allowed origins from environment
        env = os.getenv("ENVIRONMENT", "development")
        if env in ["production", "testing"]:
            allowed_origins_str = os.getenv(
                "CORS_ALLOWED_ORIGINS",
                "https://igad-innovation-hub.com,https://www.igad-innovation-hub.com,https://test-igad-hub.alliance.cgiar.org",
            )
            allowed_origins = [
                o.strip() for o in allowed_origins_str.split(",") if o.strip()
            ]
            if env == "testing":
                allowed_origins.extend(
                    [
                        "http://localhost:3000",
                        "http://localhost:5173",
                        "http://127.0.0.1:3000",
                        "http://127.0.0.1:5173",
                    ]
                )
        else:
            allowed_origins = [
                "http://localhost:3000",
                "http://localhost:5173",
                "http://127.0.0.1:3000",
                "http://127.0.0.1:5173",
            ]

        # Check if origin is allowed
        if origin in allowed_origins or "*" in allowed_origins:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers[
                "Access-Control-Allow-Methods"
            ] = "GET,POST,PUT,DELETE,OPTIONS,PATCH"
            response.headers[
                "Access-Control-Allow-Headers"
            ] = "Content-Type,Authorization,X-Request-ID"
            response.headers["Access-Control-Expose-Headers"] = "X-Request-ID"
    return response


class ErrorMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        try:
            response = await call_next(request)

            # Always add CORS headers to successful responses
            response = _add_cors_headers(response, request)

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
            error_response = JSONResponse(
                status_code=e.status_code, content={"error": e.detail}
            )
            # Add CORS headers even to error responses
            return _add_cors_headers(error_response, request)
        except Exception as e:
            logger.error(
                f"Unexpected error: {str(e)}",
                extra={"path": request.url.path, "method": request.method},
            )
            # SECURITY: Don't expose internal error details in production
            error_detail = (
                str(e)
                if os.getenv("ENVIRONMENT") != "production"
                else "Internal server error"
            )
            error_response = JSONResponse(
                status_code=500, content={"error": error_detail}
            )
            # Add CORS headers even to error responses
            return _add_cors_headers(error_response, request)
