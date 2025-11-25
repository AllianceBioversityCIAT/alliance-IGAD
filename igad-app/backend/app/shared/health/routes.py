"""
Health Check Router
"""

from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/")
async def root():
    return {"message": "IGAD Innovation Hub API is running"}


@router.get("/health")
async def health():
    return {"status": "healthy", "service": "igad-innovation-hub"}
