"""
MockInterview.ai — Database Utility
Handles Firestore initialization and core CRUD operations.
"""

import logging
import os
import firebase_admin
from firebase_admin import credentials, firestore
from app.app_utils.config import settings

logger = logging.getLogger(__name__)

class Database:
    _instance = None
    _db = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(Database, cls).__new__(cls)
            cls._instance._init_firebase()
        return cls._instance

    def _init_firebase(self):
        """Initializes Firebase Admin SDK."""
        try:
            # Check if an app is already initialized
            if not firebase_admin._apps:
                # In production/GCP, we use Application Default Credentials (ADC)
                # Locally, it will use the GOOGLE_APPLICATION_CREDENTIALS env var
                cred = credentials.ApplicationDefault()
                firebase_admin.initialize_app(cred, {
                    'projectId': settings.PROJECT_ID,
                })
                logger.info(f"Firebase initialized successfully for project: {settings.PROJECT_ID}")
            
            self._db = firestore.client()
            print(f"DEBUG: Firestore client initialized")
        except Exception as e:
            logger.error(f"Failed to initialize Firebase: {e}")
            self._db = None

    @property
    def db(self):
        if self._db is None:
            self._init_firebase()
        return self._db

# Singleton instance
db_service = Database()
