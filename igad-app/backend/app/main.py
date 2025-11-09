"""
IGAD Innovation Hub - Main FastAPI Application
Refactored with clean architecture
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from .middleware.auth_middleware import AuthMiddleware
from .middleware.error_middleware import ErrorMiddleware
from .routers import auth, health, proposals, admin, prompts
from .handlers.admin_prompts import router as admin_prompts_router

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(
    title="IGAD Innovation Hub API",
    description="API for IGAD Innovation Hub platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add custom middleware
app.add_middleware(ErrorMiddleware)

# Include routers
app.include_router(health.router)
app.include_router(auth.router)
app.include_router(proposals.router)
app.include_router(admin.router)
app.include_router(prompts.router)
app.include_router(admin_prompts_router)

# Initialize services
auth_middleware = AuthMiddleware()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
