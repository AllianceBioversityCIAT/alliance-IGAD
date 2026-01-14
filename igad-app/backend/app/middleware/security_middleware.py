"""
Security Middleware for IGAD Innovation Hub API

Provides:
- Security headers (CSP, X-Frame-Options, etc.)
- Rate limiting
- Request size limits
- IP whitelisting (optional)
"""

import time
from collections import defaultdict
from typing import Callable

from fastapi import Request, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

# Rate limiting storage (in-memory, consider Redis for production)
_rate_limit_store: dict[str, list[float]] = defaultdict(list)


class SecurityMiddleware(BaseHTTPMiddleware):
    """
    Security middleware that adds security headers and basic rate limiting.
    """

    def __init__(
        self,
        app,
        max_requests_per_minute: int = 60,
        max_requests_per_hour: int = 1000,
        max_request_size: int = 10 * 1024 * 1024,  # 10MB
    ):
        super().__init__(app)
        self.max_requests_per_minute = max_requests_per_minute
        self.max_requests_per_hour = max_requests_per_hour
        self.max_request_size = max_request_size

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Get client IP
        client_ip = self._get_client_ip(request)

        # Rate limiting
        if not self._check_rate_limit(client_ip):
            return Response(
                content='{"error": "Rate limit exceeded. Please try again later."}',
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                media_type="application/json",
                headers=self._get_security_headers(),
            )

        # Check request size
        content_length = request.headers.get("content-length")
        if content_length:
            try:
                size = int(content_length)
                if size > self.max_request_size:
                    return Response(
                        content='{"error": "Request too large"}',
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        media_type="application/json",
                        headers=self._get_security_headers(),
                    )
            except ValueError:
                pass

        # Process request
        response = await call_next(request)

        # Add security headers to response
        for header, value in self._get_security_headers().items():
            response.headers[header] = value

        return response

    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP from request, considering proxies."""
        # Check for forwarded IP (from load balancer/proxy)
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            # Take the first IP in the chain
            return forwarded_for.split(",")[0].strip()

        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip

        # Fallback to direct client
        if request.client:
            return request.client.host

        return "unknown"

    def _check_rate_limit(self, client_ip: str) -> bool:
        """Check if client has exceeded rate limits."""
        now = time.time()
        client_requests = _rate_limit_store[client_ip]

        # Clean old requests (older than 1 hour)
        client_requests[:] = [
            req_time for req_time in client_requests if now - req_time < 3600
        ]

        # Check per-minute limit
        recent_requests = [
            req_time for req_time in client_requests if now - req_time < 60
        ]
        if len(recent_requests) >= self.max_requests_per_minute:
            return False

        # Check per-hour limit
        if len(client_requests) >= self.max_requests_per_hour:
            return False

        # Record this request
        client_requests.append(now)
        return True

    def _get_security_headers(self) -> dict[str, str]:
        """Get security headers to add to responses."""
        # Build Content-Security-Policy
        csp = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "  # Allow inline for Swagger UI
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self' data:; "
            "connect-src 'self' https://*.amazonaws.com; "
            "frame-ancestors 'none';"
        )

        return {
            # Prevent clickjacking
            "X-Frame-Options": "DENY",
            # Prevent MIME type sniffing
            "X-Content-Type-Options": "nosniff",
            # XSS protection (legacy but still useful)
            "X-XSS-Protection": "1; mode=block",
            # Content Security Policy
            "Content-Security-Policy": csp,
            # Referrer policy
            "Referrer-Policy": "strict-origin-when-cross-origin",
            # Permissions policy (formerly Feature-Policy)
            "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
            # Strict Transport Security (only if using HTTPS)
            "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
            # Remove server information
            "Server": "",  # Remove server header
        }
