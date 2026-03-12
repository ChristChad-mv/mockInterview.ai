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
# from .tools.get_entreprise_culture import get_entreprise_culture
# DISABLED: CV search tool was interfering with live conversations
# from .tools.cv_search import cv_search

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

# Mapping from common short codes to BCP-47 codes
LANGUAGE_MAPPING = {
    "en": "en-US",
    "fr": "fr-FR",
    "es": "es-ES",
    "pt": "pt-BR",
    "de": "de-DE",
    "ja": "ja-JP",
    "ko": "ko-KR",
    "zh": "zh-CN",
    "hi": "hi-IN",
    "ar": "ar-SA"
}

def create_agent(voice_name: str = DEFAULT_VOICE, user_id: str = None, language: str = 'en') -> Agent:
    """Create a new interviewer agent with core model and instructions."""
    # As per GitHub issue #4140, only gemini-live-* models on Vertex AI 
    # support session resumption beyond the 10-minute hard limit.
    model_id = "gemini-live-2.5-flash-native-audio"

    # Inject voice name into the system prompt
    instruction = INTERVIEWER_SYSTEM_INSTRUCTION.format(voice_name=voice_name)

    # Resolve language code
    language_code = LANGUAGE_MAPPING.get(language, "en-US")

    return Agent(
        name="mock_interviewer",
        model=Gemini(
            model=model_id,
            retry_options=types.HttpRetryOptions(attempts=3),
        ),
        instruction=instruction,
        generate_content_config=types.GenerateContentConfig(
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(
                        voice_name=voice_name,
                    )
                ),
                language_code=language_code,
            ),
            # Enable proactivity and affective dialog by default for a better experience
            # We can also add tools=[], here when ready
        )
    )


# Default agent (used if no voice specified)
root_agent = create_agent(DEFAULT_VOICE)

app = App(root_agent=root_agent, name="app")
