"""
IGAD Innovation Hub - Main FastAPI Application.

Refactored with clean architecture
"""

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .handlers.admin_prompts import router as admin_prompts_router
from .middleware.auth_middleware import AuthMiddleware
from .middleware.error_middleware import ErrorMiddleware
from .tools.admin.settings import routes as admin_routes
from .tools.auth import routes as auth_routes
from .shared.health import routes as health_routes
from .tools.admin.prompts_manager import routes as prompts_routes
from .shared.documents import routes as documents_routes
from .tools.proposal_writer import routes as proposal_writer_routes
from .shared.vectors import routes as vectors_router
from .routers import history

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(
    title="IGAD Innovation Hub API",
    description="API for IGAD Innovation Hub platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
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
