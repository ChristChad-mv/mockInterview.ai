"""
MockInterview.ai — Miscellaneous API
Common endpoints for health checks and status.
"""

from fastapi import APIRouter

router = APIRouter()

@router.get("/health")
async def health_check() -> dict:
    """Health check endpoint."""
    return {"status": "ok"}
