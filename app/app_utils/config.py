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
    # GCP Project Settings
    PROJECT_ID = os.environ.get("GOOGLE_CLOUD_PROJECT", "mockinterview-ia")
    LOCATION = os.environ.get("GOOGLE_CLOUD_LOCATION", "us-central1")
    
    # AI Engine Settings
    GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
    # For ADK/GenAI SDK compatibility
    GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY") or GEMINI_API_KEY
    
    # Force use of AI Studio (False) or Vertex AI (True)
    # Gemini Live 2.5 requires Vertex AI
    USE_VERTEXAI = os.environ.get("USE_VERTEXAI", "True").lower() == "true"
    
    # Security/Access Settings
    ACCESS_PASSCODE = os.environ.get("ACCESS_PASSCODE", "GEMINI2026")
    ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "*").split(",")
    
    # Storage Settings
    RECORDINGS_BUCKET = os.environ.get("RECORDINGS_BUCKET", f"{PROJECT_ID}-interview-recordings")
    LOGS_BUCKET_NAME = os.environ.get("LOGS_BUCKET_NAME")

    # File Search Settings
    FILE_SEARCH_STORE_NAME = os.environ.get("FILE_SEARCH_STORE_NAME", "mockinterview-global-store")

# DO NOT set GOOGLE_API_KEY globally here, or ADK will try to use AI Studio for the Live Agent
# which doesn't support Gemini 2.5 Live yet.

if Config.PROJECT_ID:
    os.environ["GOOGLE_CLOUD_PROJECT"] = Config.PROJECT_ID

settings = Config()
