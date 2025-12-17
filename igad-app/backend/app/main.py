"""
IGAD Innovation Hub - Main FastAPI Application.

Refactored with clean architecture
"""

import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .handlers.admin_prompts import router as admin_prompts_router
from .middleware.auth_middleware import AuthMiddleware
from .middleware.error_middleware import ErrorMiddleware
from .routers import history
from .shared.documents import routes as documents_routes
from .shared.health import routes as health_routes
from .shared.vectors import routes as vectors_router
from .tools.admin.prompts_manager import routes as prompts_routes
from .tools.admin.settings import routes as admin_routes
from .tools.auth import routes as auth_routes
from .tools.proposal_writer import routes as proposal_writer_routes

# Load environment variables
load_dotenv()

# Get environment
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

# Initialize FastAPI app
app = FastAPI(
    title="IGAD Innovation Hub API",
    description="API for IGAD Innovation Hub platform",
    version="1.0.0",
    # Deshabilitar documentación en producción por seguridad
    docs_url="/docs" if ENVIRONMENT != "production" else None,
    redoc_url="/redoc" if ENVIRONMENT != "production" else None,
    openapi_url="/openapi.json" if ENVIRONMENT != "production" else None,
)

# CORS configuration - SECURITY: Restrict origins based on environment
if ENVIRONMENT in ["production", "testing"]:
    # En producción/testing, usar dominios específicos desde variable de entorno
    # Incluir dominios de producción y testing por defecto
    default_origins = "https://igad-innovation-hub.com,https://www.igad-innovation-hub.com,https://test-igad-hub.alliance.cgiar.org"
    allowed_origins_str = os.getenv("CORS_ALLOWED_ORIGINS", default_origins)
    # Limpiar espacios y dividir por comas
    allowed_origins = [origin.strip() for origin in allowed_origins_str.split(",") if origin.strip()]
else:
    # En desarrollo, permitir localhost
    allowed_origins = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ]

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Content-Type", "Authorization", "X-Request-ID"],
    expose_headers=["X-Request-ID"],
)

# Add custom middleware
app.add_middleware(ErrorMiddleware)

# Include routers
app.include_router(health_routes.router)
app.include_router(auth_routes.router)
app.include_router(proposal_writer_routes.router)
app.include_router(documents_routes.router)
app.include_router(admin_routes.router)
app.include_router(prompts_routes.router)
app.include_router(admin_prompts_router)
app.include_router(vectors_router.router)
app.include_router(history.router)

# Initialize services
auth_middleware = AuthMiddleware()

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
