"""
MockInterview.ai — Data Models
Defines the structure for Firestore documents.
"""

from typing import List, Optional, Any
from pydantic import BaseModel, Field, EmailStr
from datetime import datetime

class WaitlistEntry(BaseModel):
    """Schema for the waiting list."""
    email: EmailStr
    full_name: Optional[str] = None
    source: str = "landing_page"
    joined_at: datetime = Field(default_factory=datetime.utcnow)
    status: str = "pending" # pending, invited, active

class CategoryScore(BaseModel):
    name: str
    score: int
    comment: str

class InterviewSession(BaseModel):
    """Schema for interview recording and feedback history."""
    user_id: str # Link to the user (JudgeID or Auth UID)
    session_id: str
    mode: str
    problem_title: str
    duration: str
    overall_score: int
    categories: List[CategoryScore]
    strengths: List[str]
    improvements: List[str]
    next_steps: List[str]
    recording_url: Optional[str] = None
    tokens_used: Optional[int] = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserProfile(BaseModel):
    """Extended user profile once authenticated."""
    uid: str
    email: EmailStr
    display_name: Optional[str] = None
    photo_url: Optional[str] = None
    plan: str = "free"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_login: datetime = Field(default_factory=datetime.utcnow)
