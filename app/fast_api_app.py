"""
MockInterview.ai Server
FastAPI backend for managing WebSocket connections, screen sharing, and AI-generated feedback.
"""

import asyncio
import json
import logging
import os
from pathlib import Path

import backoff
from fastapi import FastAPI, Header, HTTPException, Request, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from google.adk.agents.live_request_queue import LiveRequest, LiveRequestQueue
from google.adk.apps import App
from google.adk.artifacts import GcsArtifactService, InMemoryArtifactService
from google.adk.memory.in_memory_memory_service import InMemoryMemoryService
from google.adk.runners import Runner
from google.adk.agents.run_config import RunConfig, StreamingMode
from google.adk.sessions import DatabaseSessionService
from google.cloud import logging as google_cloud_logging
from google.genai import types
from vertexai.agent_engines import _utils
from websockets.exceptions import ConnectionClosedError
from firebase_admin import auth as firebase_auth

from .agent import app as adk_app, create_agent, LANGUAGE_MAPPING
from .app_utils.telemetry import setup_telemetry
from .app_utils.config import settings
from .api.v1.router import router as api_router

# Initialize FastAPI app
app = FastAPI(title="MockInterview.ai API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
    allow_credentials=True,
)

# ── Static File Mounting ──
current_dir = Path(__file__).parent
frontend_build_dir = current_dir.parent / "frontend" / "build"

if frontend_build_dir.exists():
    app.mount(
        "/assets",
        StaticFiles(directory=str(frontend_build_dir / "assets")),
        name="assets",
    )

# ── Logging & Telemetry ──
try:
    logging_client = google_cloud_logging.Client()
    logger = logging_client.logger(__name__)
except Exception:
    logger = logging.getLogger(__name__)

logging.basicConfig(level=logging.INFO)
setup_telemetry()

# ── ADK Services ──
session_service = DatabaseSessionService(db_url="sqlite+aiosqlite:///./sessions.db")
logs_bucket_name = settings.LOGS_BUCKET_NAME
artifact_service = (
    GcsArtifactService(bucket_name=logs_bucket_name)
    if logs_bucket_name
    else InMemoryArtifactService()
)
memory_service = InMemoryMemoryService()

# ── API Routes (v1) ──
app.include_router(api_router, prefix="/api")

# ── WebSocket & Agent Logic ──

class AgentSession:
    """Manages bidirectional communication between a client and the agent."""

    def __init__(self, websocket: WebSocket) -> None:
        self.websocket = websocket
        self.input_queue: asyncio.Queue[dict] = asyncio.Queue()
        self.user_id: str | None = None
        self.session_id: str | None = None
        self.voice_name: str = "Puck"
        self.language: str = "en"
        self.setup_received = asyncio.Event()

    async def receive_from_client(self) -> None:
        """Listens for and processes incoming messages from the WebSocket client.

        This method runs in a loop, receiving text or binary data from the client.
        'setup' messages are used to configure the session (voice, user_id).
        Other messages are forwarded to the agent's input queue for processing.
        """
        while True:
            try:
                message = await self.websocket.receive()
                if "text" in message:
                    data = json.loads(message["text"])
                    if isinstance(data, dict):
                        if "setup" in data:
                            self.voice_name = data.get("voice", "Puck")
                            self.user_id = data.get("user_id")
                            self.language = data.get("language", "en")
                            logging.info(f"🎙️ Setup: voice={self.voice_name}, language={self.language}, user_id={self.user_id}")
                            self.setup_received.set()
                            continue
                        if "text" in data:
                            txt = data["text"]
                            if "[LOG]" in txt or "METADATA" in txt:
                                logging.info(f"⚙️  METADATA: {txt}")
                        await self.input_queue.put(data)
                elif "bytes" in message:
                    await self.input_queue.put({"binary_data": message["bytes"]})
            except ConnectionClosedError:
                break
            except RuntimeError as e:
                # Catch "Cannot call receive once a disconnect message has been received"
                if "disconnect" in str(e).lower():
                    break
                logging.error(f"WebSocket Runtime error: {e}")
                break
            except Exception as e:
                logging.error(f"WebSocket receive error: {e}")
                break

    async def run_agent(self) -> None:
        """Initializes and runs the ADK agent for the current session.

        This method:
        1. Waits for the 'setup' configuration from the client.
        2. Creates a dedicated ADK Agent and Runner.
        3. Establishes a live connection to the Gemini model.
        4. Manages bidirectional forwarding of requests (client -> model) 
           and events (model -> client).
        5. Tracks token usage metadata during the session.
        """
        try:
            await self.setup_received.wait()
            await self.websocket.send_json({"setupComplete": {}})
            
            first_request = await self.input_queue.get()
            self.session_id = first_request.get("session_id")
            
            if not self.session_id:
                session = await session_service.create_session(app_name=adk_app.name, user_id=self.user_id)
                self.session_id = session.id

            # Resolve language code and modalities
            language_code = LANGUAGE_MAPPING.get(self.language, "en-US")
            response_modalities = ["AUDIO"]
            first_live_request = first_request.get("live_request")

            # Create the agent + runner
            agent = create_agent(self.voice_name, user_id=self.user_id, language=self.language)
            per_session_app = App(root_agent=agent, name="app")
            per_session_runner = Runner(
                app=per_session_app,
                session_service=session_service,
                artifact_service=artifact_service,
                memory_service=memory_service,
            )

            live_request_queue = LiveRequestQueue()
            
            # Send initial configuration if present
            if first_live_request:
                live_request_queue.send(LiveRequest.model_validate(first_live_request))

            async def _forward_requests():
                while True:
                    request = await self.input_queue.get()
                    live_request_queue.send(LiveRequest.model_validate(request))

            async def _forward_events():
                try:
                    events_async = per_session_runner.run_live(
                        user_id=self.user_id,
                        session_id=self.session_id,
                        live_request_queue=live_request_queue,
                        run_config=RunConfig(
                            streaming_mode=StreamingMode.BIDI,
                            response_modalities=response_modalities,
                            session_resumption=types.SessionResumptionConfig(transparent=True),
                            context_window_compression=types.ContextWindowCompressionConfig(
                                trigger_tokens=100000,
                                sliding_window=types.SlidingWindow(target_tokens=80000)
                            ),
                            speech_config=types.SpeechConfig(
                                voice_config=types.VoiceConfig(
                                    prebuilt_voice_config=types.PrebuiltVoiceConfig(
                                        voice_name=self.voice_name,
                                    )
                                ),
                                language_code=language_code,
                            ),
                            proactivity=types.ProactivityConfig(proactive_audio=True),
                            enable_affective_dialog=True,
                        )
                    )
                    async for event in events_async:
                        event_dict = _utils.dump_event_for_json(event)
                        await self.websocket.send_json(event_dict)
                        
                except Exception as e:
                    logging.error(f"❌ Fatal agent error: {e}")
                    raise e

            requests_task = asyncio.create_task(_forward_requests())
            try:
                await _forward_events()
            except Exception as e:
                try:
                    await self.websocket.send_json({"error": str(e)})
                except Exception:
                    pass
            finally:
                requests_task.cancel()

        except Exception as e:
            logging.error(f"Agent session setup error: {e}")
            try:
                await self.websocket.send_json({"error": str(e)})
            except Exception:
                pass


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """Handles the main real-time interview WebSocket connection.

    This endpoint authenticates the client via a passcode, establishes the
    WebSocket connection, and manages the AgentSession lifecycle, including
    cleanup and final token usage logging upon disconnection.

    Args:
        websocket: The incoming FastAPI WebSocket connection.
    """
    token = websocket.query_params.get("token", "")
    if not token:
        await websocket.close(code=4001, reason="Missing auth token")
        return
    
    try:
        # Verify Firebase token
        decoded_token = firebase_auth.verify_id_token(token)
        user_id = decoded_token.get("uid")
    except Exception as e:
        logging.error(f"WS Auth failed: {e}")
        await websocket.close(code=4001, reason="Invalid auth token")
        return

    await websocket.accept()
    session = None
    try:
        session = AgentSession(websocket)
        await asyncio.gather(session.receive_from_client(), session.run_agent())
    finally:
        logging.info(f"🎙️ Session disconnected | user={session.user_id if session else 'unknown'}")

# ── SPA / Frontend Serving ──

@app.get("/", response_model=None)
async def serve_frontend_root():
    index_file = frontend_build_dir / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file))
    return {"status": "ok", "message": "Backend running. Frontend not built."}

@app.get("/{full_path:path}", response_model=None)
async def serve_frontend_spa(full_path: str):
    if full_path.startswith(("api", "ws", "assets")):
        raise HTTPException(status_code=404)
    
    requested_file = frontend_build_dir / full_path
    if requested_file.is_file():
        return FileResponse(str(requested_file))

    index_file = frontend_build_dir / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file))
    return {"status": "ok", "message": "Backend running. Frontend not built."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
