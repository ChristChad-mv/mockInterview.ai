"""
MockInterview.ai — File Search Utility
Handles Gemini FileSearchStore management and file ingestion.
"""

import os
import time
import logging
from google import genai
from google.genai import types
from .config import settings

logger = logging.getLogger(__name__)

def get_gemini_client():
    """Initializes the Gemini Client explicitly for AI Studio (File Search/Feedback)."""
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not set")
    
    # We FORCE AI Studio explicitly here
    return genai.Client(
        api_key=api_key,
        vertexai=False,
        http_options={"api_version": "v1beta"}
    )

async def ensure_global_store_exists_async(client):
    """
    Checks if the global store exists asynchronously. Returns the store object.
    Creates it if it doesn't exist.
    """
    global_display_name = settings.FILE_SEARCH_STORE_NAME
    
    try:
        # List stores and find the one with our target display name
        async for store in client.aio.file_search_stores.list():
            if store.display_name == global_display_name:
                return store
    except Exception as e:
        logger.warning(f"Error listing stores: {e}")

    # If not found, create it
    logger.info(f"Creating global FileSearchStore: {global_display_name}")
    return await client.aio.file_search_stores.create(
        config={
            'display_name': global_display_name
        }
    )

def ensure_global_store_exists(client):
    """
    Checks if the global store exists. Returns the store object.
    Creates it if it doesn't exist.
    """
    global_display_name = settings.FILE_SEARCH_STORE_NAME
    
    try:
        # List stores and find the one with our target display name
        for store in client.file_search_stores.list():
            if store.display_name == global_display_name:
                return store
    except Exception as e:
        logger.warning(f"Error listing stores: {e}")

    # If not found, create it
    logger.info(f"Creating global FileSearchStore: {global_display_name}")
    return client.file_search_stores.create(
        config={
            'display_name': global_display_name
        }
    )

def upload_resume_to_store(session_id: str, file_path: str, original_filename: str):
    """
    Uploads a resume file to the global store with session_id metadata.
    """
    client = get_gemini_client()
    store = ensure_global_store_exists(client)
    
    logger.info(f"Uploading {original_filename} (Session: {session_id}) to global store {store.name}")
    
    operation = client.file_search_stores.upload_to_file_search_store(
        file=file_path,
        file_search_store_name=store.name,
        config={
            'display_name': f"CV_{session_id[:8]}_{original_filename}",
            'custom_metadata': [
                {'key': 'session_id', 'string_value': session_id}
            ]
        }
    )
    
    # Wait for completion
    max_retries = 15 
    retries = 0
    while not operation.done and retries < max_retries:
        logger.info(f"Waiting for indexing of {original_filename}... ({retries+1}/{max_retries})")
        time.sleep(5)
        operation = client.operations.get(operation)
        retries += 1
    
    if not operation.done:
        raise TimeoutError(f"Indexing of {original_filename} timed out.")
        
    return operation.name

def check_operation_status(operation_name: str):
    """Checks if a long-running operation is complete."""
    client = get_gemini_client()
    operation = client.operations.get(operation_name)
    return operation.done, operation.error
