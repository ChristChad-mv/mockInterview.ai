"""
MockInterview.ai — Auth API
"""

import logging
from fastapi import APIRouter, HTTPException, Request
from app.app_utils.config import settings

router = APIRouter()

@router.post("/verify-passcode")
async def verify_passcode(request: Request) -> dict:
    """Verify demo passcode."""
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")
    
    if body.get("passcode") == settings.ACCESS_PASSCODE:
        return {"ok": True}
    raise HTTPException(status_code=401, detail="Invalid passcode")
