"""
MockInterview.ai — API v1 Router
"""

from fastapi import APIRouter
from app.api.v1.endpoints import feedback, resume, auth, misc

router = APIRouter()

router.include_router(auth.router, tags=["auth"])
router.include_router(feedback.router, tags=["feedback"])
router.include_router(resume.router, tags=["resume"])
router.include_router(misc.router, tags=["misc"])
