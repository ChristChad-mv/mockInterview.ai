"""
MockInterview.ai — config.py
Auto-generated or generic module.
"""

import os
from pathlib import Path
import logging

# Load .env file manually if it exists to support local development without complex libraries
env_path = Path(__file__).parent.parent.parent / ".env"
if env_path.exists():
    with open(env_path) as f:
        for line in f:
            if line.strip() and not line.startswith("#"):
                key, value = line.strip().split("=", 1)
                os.environ.setdefault(key, value)

class Config:
    def __init__(self):
        # GCP Project Settings
        self.PROJECT_ID = os.environ.get("GOOGLE_CLOUD_PROJECT", "mockinterview-ia")
        self.LOCATION = os.environ.get("GOOGLE_CLOUD_LOCATION", "us-central1")
        
        # AI Engine Settings
        self.GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
        # For ADK/GenAI SDK compatibility
        self.GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY") or self.GEMINI_API_KEY
        
        # Force use of AI Studio (False) or Vertex AI (True)
        # Gemini Live 2.5 requires Vertex AI
        self.USE_VERTEXAI = os.environ.get("USE_VERTEXAI", "True").lower() == "true"
        
        # Security/Access Settings
        self.ACCESS_PASSCODE = os.environ.get("ACCESS_PASSCODE", "GEMINI2026")
        self.ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "*").split(",")
        
        # Storage Settings
        self.RECORDINGS_BUCKET = os.environ.get("RECORDINGS_BUCKET", f"{self.PROJECT_ID}-interview-recordings")
        self.LOGS_BUCKET_NAME = os.environ.get("LOGS_BUCKET_NAME")

        # File Search Settings
        self.FILE_SEARCH_STORE_NAME = os.environ.get("FILE_SEARCH_STORE_NAME", "mockinterview-global-store")

        # Feedback Model Settings
        self.FEEDBACK_MODEL = os.environ.get("FEEDBACK_MODEL", "gemini-3.1-flash-lite-preview")

settings = Config()

if settings.PROJECT_ID:
    os.environ["GOOGLE_CLOUD_PROJECT"] = settings.PROJECT_ID

