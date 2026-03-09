"""
MockInterview.ai — agent.py
Auto-generated or generic module.
"""

# ruff: noqa

"""MockInterview.ai — ADK agent for live technical coding interviews."""

from google.adk.agents import Agent
from google.adk.apps import App
from google.adk.models import Gemini
from google.genai import types
from .tools.get_entreprise_culture import get_entreprise_culture
from .tools.cv_search import cv_search

from .app_utils.config import settings

# Initialize Vertex AI for the Live Agent
if settings.USE_VERTEXAI:
    import vertexai
    # Ensure environment variables are set for the underlying google-genai SDK
    import os
    os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "True"
    os.environ["GOOGLE_CLOUD_PROJECT"] = settings.PROJECT_ID
    os.environ["GOOGLE_CLOUD_LOCATION"] = settings.LOCATION
    
    vertexai.init(project=settings.PROJECT_ID, location=settings.LOCATION)

from .prompts.v1.system_prompt import INTERVIEWER_SYSTEM_INSTRUCTION


VALID_VOICES = {"Puck", "Charon", "Kore", "Fenrir", "Aoede"}
DEFAULT_VOICE = "Puck"

def create_agent(voice_name: str = DEFAULT_VOICE, user_id: str = None) -> Agent:
    """Create a new interviewer agent with specific voice and tools."""
    
    if voice_name not in VALID_VOICES:
        voice_name = DEFAULT_VOICE

    # Pre-configure the tools with user-specific context if available
    session_tools = [get_entreprise_culture]
    
    if user_id:
        # We create a wrapped version of cv_search that already knows the user_id
        async def search_candidate_cv(query: str) -> str:
            """Search the candidate's resume/CV for specific information."""
            return await cv_search(query, user_id)
        
        session_tools.append(search_candidate_cv)

    return Agent(
        name="mock_interviewer",
        model=Gemini(
            model="gemini-live-2.5-flash-native-audio",
            retry_options=types.HttpRetryOptions(attempts=3),
        ),
        instruction=INTERVIEWER_SYSTEM_INSTRUCTION,
        generate_content_config=types.GenerateContentConfig(
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(
                        voice_name=voice_name,
                    )
                )
            ),
        ),
        tools=session_tools,
    )


# Default agent (used if no voice specified)
root_agent = create_agent(DEFAULT_VOICE)

app = App(root_agent=root_agent, name="app")
