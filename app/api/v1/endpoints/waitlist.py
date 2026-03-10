"""
MockInterview.ai — Waitlist Endpoint
"""

import logging
from fastapi import APIRouter, HTTPException
from app.models.v1.schemas import WaitlistEntry
from app.app_utils.database import db_service

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/join")
async def join_waitlist(entry: WaitlistEntry):
    """Adds a new email to the Firestore waitlist."""
    try:
        db = db_service.db
        if db is None:
            raise HTTPException(status_code=500, detail="Database connection failed")

        # Check if already exists
        docs = db.collection("waitlist").where("email", "==", entry.email).get()
        if len(docs) > 0:
            return {"status": "already_joined", "message": "You're already on the waitlist! We'll be in touch soon."}

        # Add to Firestore
        db.collection("waitlist").add(entry.model_dump())
        
        logger.info(f"New waitlist signup: {entry.email}")
        return {"status": "success", "message": "Welcome to the adventure! We'll send you an invite very soon."}
    
    except Exception as e:
        logger.error(f"Waitlist signup error: {e}")
        raise HTTPException(status_code=500, detail="Something went wrong. Please try again later.")
from app.app_utils.auth import get_admin_user
from fastapi import Depends

@router.post("/invite/{doc_id}")
async def invite_user(doc_id: str, admin: dict = Depends(get_admin_user)):
    """Updates a waitlist entry status to 'invited'."""
    try:
        db = db_service.db
        user_ref = db.collection("waitlist").document(doc_id)
        user_ref.update({"status": "invited"})
        
        logger.info(f"User {doc_id} was invited by admin {admin.get('email')}")
        return {"status": "success", "message": "User invited successfully"}
    except Exception as e:
        logger.error(f"Invite error: {e}")
        raise HTTPException(status_code=500, detail="Failed to invite user")
