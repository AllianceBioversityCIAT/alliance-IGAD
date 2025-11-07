"""
IGAD Innovation Hub - Main Lambda Handler
FastAPI application for serverless deployment
"""

import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum
from aws_lambda_powertools import Logger, Tracer, Metrics
from aws_lambda_powertools.logging import correlation_paths
from aws_lambda_powertools.metrics import MetricUnit

from .middleware.auth_middleware import AuthMiddleware
from .middleware.error_middleware import ErrorMiddleware
from .routers import auth, users, proposals, newsletters, health

# Initialize AWS Lambda Powertools
logger = Logger()
tracer = Tracer()
metrics = Metrics()

# Create FastAPI app
app = FastAPI(
    title="IGAD Innovation Hub API",
    description="AI-powered platform for proposal writing and newsletter generation",
    version="1.0.0",
    docs_url="/docs" if os.getenv("ENVIRONMENT") == "testing" else None,
    redoc_url="/redoc" if os.getenv("ENVIRONMENT") == "testing" else None
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://localhost:3000",
        # Add CloudFront URLs from infrastructure
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom middleware
app.add_middleware(ErrorMiddleware)
# app.add_middleware(AuthMiddleware)  # Disable for testing

# Include routers
app.include_router(health.router, prefix="/health", tags=["health"])
app.include_router(auth.router, prefix="/auth", tags=["authentication"])
app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(proposals.router, prefix="/proposals", tags=["proposals"])
app.include_router(newsletters.router, prefix="/newsletters", tags=["newsletters"])

@app.middleware("http")
async def logging_middleware(request: Request, call_next):
    """Add request logging and metrics"""
    logger.info("Request received", extra={
        "method": request.method,
        "url": str(request.url),
        "headers": dict(request.headers)
    })
    
    # Add custom metrics
    metrics.add_metric(name="RequestCount", unit=MetricUnit.Count, value=1)
    
    response = await call_next(request)
    
    logger.info("Request completed", extra={
        "status_code": response.status_code,
        "method": request.method,
        "url": str(request.url)
    })
    
    return response

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "IGAD Innovation Hub API",
        "version": "1.0.0",
        "status": "operational"
    }

# Lambda handler
handler = Mangum(app, lifespan="off")
