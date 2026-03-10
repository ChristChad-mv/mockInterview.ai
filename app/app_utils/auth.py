"""
MockInterview.ai — Authentication Utility
Handles Firebase ID token verification.
"""

import logging
import firebase_admin
from firebase_admin import auth
from fastapi import Header, HTTPException, Depends
from .database import db_service # Ensures Firebase is initialized

logger = logging.getLogger(__name__)

async def get_current_user(authorization: str = Header(None)):
    """
    FastAPI dependency to verify the Firebase ID token in the Authorization header.
    Expects format: "Bearer <token>"
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Missing or invalid Authorization header"
        )
    
    token = authorization.split("Bearer ")[1]
    try:
        # Verify the ID token
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        logger.error(f"Auth verification failed: {e}")
        raise HTTPException(
            status_code=401,
            detail=f"Invalid authentication token: {str(e)}"
        )
import os

async def get_admin_user(current_user: dict = Depends(get_current_user)):
    """
    Dependency to ensure the current user is an admin.
    """
    admin_email = os.getenv("VITE_ADMIN_EMAIL")
    if current_user.get("email") != admin_email:
        logger.warning(f"Unauthorized admin access attempt by {current_user.get('email')}")
        raise HTTPException(
            status_code=403,
            detail="Forbidden: Admin access required"
        )
    return current_user
