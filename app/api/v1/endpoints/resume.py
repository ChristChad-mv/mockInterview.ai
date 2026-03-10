"""
MockInterview.ai — Resume API
Endpoints for uploading and indexing candidate resumes.
"""

import logging
import os
import uuid
from pathlib import Path
from fastapi import APIRouter, File, Form, Depends, HTTPException, UploadFile

from app.app_utils.config import settings
from app.app_utils.file_search import upload_resume_to_store
from app.app_utils.auth import get_current_user

router = APIRouter()

# Temporary directory for resume uploads
UPLOAD_DIR = Path(__file__).parent.parent.parent.parent / "temp_uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

@router.post("/resume/upload")
async def upload_resume(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """Uploads a CV to the user's FileSearchStore and waits for indexing."""
    user_id = current_user.get("uid") 
    
    file_path = UPLOAD_DIR / f"{uuid.uuid4()}_{file.filename}"
    try:
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Blocking call: Indexing CV
        upload_resume_to_store(user_id, str(file_path), file.filename)
        
        return {
            "ok": True,
            "filename": file.filename
        }
    except Exception as e:
        logging.error(f"Resume upload/indexing failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if file_path.exists():
            os.remove(file_path)
