"""
MockInterview.ai — CV Search Tool
This tool allows the AI Agent to query the candidate's CV during a live session.
"""

import os
import logging
from google import genai
from google.genai import types
from ..app_utils.file_search import get_gemini_client, ensure_global_store_exists_async

logger = logging.getLogger(__name__)

async def cv_search(query: str, user_id: str) -> str:
    """
    Search the candidate's resume/CV for specific information.
    
    Args:
        query: The specific question or information to find in the CV.
        user_id: The unique identifier of the user (JudgeID).
    """
    try:
        client = get_gemini_client()
        store = await ensure_global_store_exists_async(client)
        
        # Improvement: Be more explicit in the RAG prompt
        search_prompt = f"Using the provided File Search capabilities, please answer this question based ONLY on the candidate's CV: {query}"
        
        # Use Async API to avoid blocking the Live Session WebSocket
        response = await client.aio.models.generate_content(
            model="gemini-3.1-flash-lite-preview", 
            contents=search_prompt,
            config=types.GenerateContentConfig(
                tools=[
                    types.Tool(
                        file_search=types.FileSearch(
                            file_search_store_names=[store.name],
                            metadata_filter=f"user_id=\"{user_id}\""
                        )
                    )
                ],
                system_instruction="You are a helpful assistant extracting information from a resume. Provide a concise answer based ONLY on the CV content."
            )
        )
        
        return response.text
    except Exception as e:
        logger.error(f"CV Search failed: {e}")
        return f"Error searching CV: {str(e)}. The candidate might not have uploaded a CV yet."
