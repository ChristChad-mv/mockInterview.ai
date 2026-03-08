"""
MockInterview.ai — Feedback API
"""

import json
import logging
import traceback
import uuid
import time as _time
from fastapi import APIRouter, File, Form, Header, HTTPException, UploadFile
from google import genai
from google.cloud import storage as gcs_storage

from app.app_utils.config import settings
from app.app_utils.typing import Feedback
from app.prompts.v1.feedback_prompt import FEEDBACK_PROMPT

router = APIRouter()

# Global client
try:
    gcs_client = gcs_storage.Client(project=settings.PROJECT_ID)
except Exception:
    gcs_client = None

@router.post("/feedback") # This will be /api/feedback or /api/v1/feedback
async def generate_video_feedback(
    video: UploadFile = File(...),
    mode: str = Form(...),
    problem_title: str = Form(...),
    duration: str = Form("0 min"),
    x_passcode: str | None = Header(None, alias="X-Passcode"),
) -> dict:
    """Analyze interview recording."""
    if x_passcode != settings.ACCESS_PASSCODE:
        raise HTTPException(status_code=401, detail="Invalid passcode")
    try:
        video_bytes = await video.read()
        video_size_mb = len(video_bytes) / (1024 * 1024)
        
        # Upload to GCS
        video_uri = None
        if gcs_client:
            try:
                bucket = gcs_client.bucket(settings.RECORDINGS_BUCKET)
                if not bucket.exists():
                    bucket = gcs_client.create_bucket(settings.RECORDINGS_BUCKET, location="us-central1")
                blob_name = f"recordings/{uuid.uuid4()}.webm"
                blob = bucket.blob(blob_name)
                blob.upload_from_string(video_bytes, content_type="video/webm")
                video_uri = f"gs://{settings.RECORDINGS_BUCKET}/{blob_name}"
            except Exception as e:
                logging.warning(f"GCS upload failed: {e}")

        # Gemini Analysis
        prompt = FEEDBACK_PROMPT.format(mode=mode, problem_title=problem_title, duration=duration)
        client = genai.Client(api_key=settings.GEMINI_API_KEY, vertexai=False, http_options={"api_version": "v1beta"})
        
        video_part = genai.types.Part.from_bytes(data=video_bytes, mime_type="video/webm")
        
        response = client.models.generate_content(
            model=settings.FEEDBACK_MODEL,
            contents=[genai.types.Content(parts=[video_part, genai.types.Part.from_text(text=prompt)])],
            config=genai.types.GenerateContentConfig(response_mime_type="application/json", temperature=0.3),
        )

        feedback_json = json.loads(response.text)
        feedback_json.update({"mode": mode, "problemTitle": problem_title, "duration": duration})
        return feedback_json

    except Exception as e:
        logging.error(f"Feedback error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/feedback/collect")
def collect_feedback(feedback: Feedback) -> dict[str, str]:
    """Collect user feedback."""
    logging.info(f"Feedback collected: {feedback.model_dump()}")
    return {"status": "success"}
