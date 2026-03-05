"""FastAPI backend for MockInterview.ai — ADK Gemini Live API with WebSocket.

Adapted from google/adk-samples/bidi-demo.
"""

import asyncio
import base64
import json
import logging
import warnings
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from google.adk.agents.live_request_queue import LiveRequestQueue
from google.adk.agents.run_config import RunConfig, StreamingMode
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

# Load environment variables from backend/.env (project root)
load_dotenv(Path(__file__).parent.parent / ".env")

# Import agent after loading environment variables
# pylint: disable=wrong-import-position
from .interview_agent import root_agent  # noqa: E402

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Suppress Pydantic serialization warnings
warnings.filterwarnings("ignore", category=UserWarning, module="pydantic")

APP_NAME = "mock-interview-ai"

# ========================================
# App Initialization
# ========================================

app = FastAPI(title="MockInterview.ai Backend")

# CORS — allow the React frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Session service & Runner
session_service = InMemorySessionService()
runner = Runner(app_name=APP_NAME, agent=root_agent, session_service=session_service)


# ========================================
# Health endpoint
# ========================================


@app.get("/health")
async def health():
    return {"status": "ok", "app": APP_NAME}


# ========================================
# WebSocket endpoint — bidirectional audio/vision streaming
# ========================================


@app.websocket("/ws/{user_id}/{session_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    user_id: str,
    session_id: str,
    proactivity: bool = False,
    affective_dialog: bool = False,
) -> None:
    """WebSocket endpoint for bidirectional streaming with ADK.

    The React frontend connects here and sends:
      - Binary frames: raw PCM16 audio at 16 kHz
      - Text frames: JSON messages for text input or vision (images)

    The backend relays everything through ADK's run_live() and sends
    events back to the frontend as JSON.
    """
    logger.info(
        f"WS connect: user={user_id}, session={session_id}, "
        f"proactivity={proactivity}, affective={affective_dialog}"
    )
    await websocket.accept()

    # ── Session setup ──
    model_name = root_agent.model
    is_native_audio = "native-audio" in model_name.lower()

    if is_native_audio:
        run_config = RunConfig(
            streaming_mode=StreamingMode.BIDI,
            response_modalities=["AUDIO"],
            input_audio_transcription=types.AudioTranscriptionConfig(),
            output_audio_transcription=types.AudioTranscriptionConfig(),
            proactivity=(
                types.ProactivityConfig(proactive_audio=True) if proactivity else None
            ),
            enable_affective_dialog=affective_dialog if affective_dialog else None,
        )
        logger.info(f"Native audio model: {model_name}")
    else:
        run_config = RunConfig(
            streaming_mode=StreamingMode.BIDI,
            response_modalities=["AUDIO"],
            input_audio_transcription=None,
            output_audio_transcription=None,
        )
        logger.info(f"Half-cascade model: {model_name}")

    # Get or create session
    session = await session_service.get_session(
        app_name=APP_NAME, user_id=user_id, session_id=session_id
    )
    if not session:
        await session_service.create_session(
            app_name=APP_NAME, user_id=user_id, session_id=session_id
        )

    live_request_queue = LiveRequestQueue()

    # ── Upstream: WebSocket → ADK ──
    async def upstream_task() -> None:
        """Receives messages from the React frontend and forwards to Gemini."""
        while True:
            message = await websocket.receive()

            # Binary = raw PCM16 audio from the mic
            if "bytes" in message:
                audio_data = message["bytes"]
                audio_blob = types.Blob(
                    mime_type="audio/pcm;rate=16000", data=audio_data
                )
                live_request_queue.send_realtime(audio_blob)

            # Text = JSON messages (text input or vision frames)
            elif "text" in message:
                text_data = message["text"]
                json_message = json.loads(text_data)

                if json_message.get("type") == "text":
                    content = types.Content(
                        parts=[types.Part(text=json_message["text"])]
                    )
                    live_request_queue.send_content(content)

                elif json_message.get("type") == "image":
                    image_data = base64.b64decode(json_message["data"])
                    mime_type = json_message.get("mimeType", "image/png")
                    image_blob = types.Blob(mime_type=mime_type, data=image_data)
                    live_request_queue.send_realtime(image_blob)

    # ── Downstream: ADK → WebSocket ──
    async def downstream_task() -> None:
        """Receives ADK events and sends them back to the React frontend.

        Audio data is sent as raw binary WebSocket frames for efficiency
        (avoids base64 encoding issues). Everything else is sent as JSON text.
        """
        async for event in runner.run_live(
            user_id=user_id,
            session_id=session_id,
            live_request_queue=live_request_queue,
            run_config=run_config,
        ):
            # Convert event to dict for inspection
            event_dict = event.model_dump(exclude_none=True, by_alias=True)

            # Extract audio parts and send as binary frames
            audio_parts_found = False
            parts = (
                event_dict.get("content", {}).get("parts", [])
                or event_dict.get("serverContent", {}).get("modelTurn", {}).get("parts", [])
                or []
            )

            for part in parts:
                inline_data = part.get("inlineData") or part.get("inline_data")
                if inline_data and inline_data.get("data"):
                    data = inline_data["data"]
                    # data can be bytes or base64-encoded string
                    if isinstance(data, (bytes, bytearray)):
                        await websocket.send_bytes(data)
                        audio_parts_found = True
                    elif isinstance(data, str):
                        # Decode base64url string to raw bytes
                        try:
                            # Python's urlsafe_b64decode handles both padded and unpadded
                            padding = 4 - len(data) % 4
                            if padding != 4:
                                data += "=" * padding
                            raw_bytes = base64.urlsafe_b64decode(data)
                            await websocket.send_bytes(raw_bytes)
                            audio_parts_found = True
                        except Exception as decode_err:
                            logger.warning(f"Failed to decode audio data: {decode_err}")

            # Build a non-audio JSON event for transcriptions, interruptions, etc.
            # Remove audio inlineData from the event to avoid sending it twice
            event_json_dict = event_dict.copy()
            non_audio_parts = []
            for part in (
                event_json_dict.get("content", {}).get("parts", [])
                or event_json_dict.get("serverContent", {}).get("modelTurn", {}).get("parts", [])
                or []
            ):
                inline_data = part.get("inlineData") or part.get("inline_data")
                if not (inline_data and inline_data.get("data")):
                    non_audio_parts.append(part)

            # Always send the JSON event (even if empty parts) for transcriptions, interruptions, etc.
            # But strip audio data from it to keep it small
            if "content" in event_json_dict and "parts" in event_json_dict.get("content", {}):
                event_json_dict["content"]["parts"] = non_audio_parts
            if "serverContent" in event_json_dict:
                sc = event_json_dict["serverContent"]
                if "modelTurn" in sc and "parts" in sc.get("modelTurn", {}):
                    sc["modelTurn"]["parts"] = non_audio_parts

            # Only send JSON if there's meaningful non-audio content
            has_transcription = (
                event_json_dict.get("inputTranscription")
                or event_json_dict.get("outputTranscription")
            )
            has_interruption = event_json_dict.get("serverContent", {}).get("interrupted")
            has_function_calls = (
                event_json_dict.get("toolCall")
                or event_json_dict.get("actions", {}).get("functionCalls")
            )
            has_non_audio_parts = len(non_audio_parts) > 0

            if has_transcription or has_interruption or has_function_calls or has_non_audio_parts or not audio_parts_found:
                event_json = json.dumps(event_json_dict, default=str)
                logger.debug(f"[DOWN] JSON event: {event_json[:200]}")
                await websocket.send_text(event_json)

    # Run both concurrently
    try:
        await asyncio.gather(upstream_task(), downstream_task())
    except WebSocketDisconnect:
        logger.info(f"Client disconnected: user={user_id}, session={session_id}")
    except Exception as e:
        logger.error(f"WS error: {e}", exc_info=True)
    finally:
        live_request_queue.close()
