"""
MockInterview.ai Server
FastAPI backend for managing WebSocket connections, screen sharing, and AI-generated feedback.
"""

import asyncio
import json
import logging
import os
from pathlib import Path
from collections.abc import Callable

import backoff
from fastapi import FastAPI, HTTPException, Request, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from google.adk.agents.live_request_queue import LiveRequest, LiveRequestQueue
from google.adk.apps import App
from google.adk.artifacts import GcsArtifactService, InMemoryArtifactService
from google.adk.memory.in_memory_memory_service import InMemoryMemoryService
from google.adk.runners import Runner
from google.adk.agents.run_config import RunConfig, StreamingMode
from google.adk.sessions.database_session_service import DatabaseSessionService
from google.cloud import logging as google_cloud_logging
from google.genai import types
from vertexai.agent_engines import _utils
from websockets.exceptions import ConnectionClosedError

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
# Change the session service to DatabaseSessionService to support persistence across Cloud Run instances
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
        self.resumption_handle: str | None = None
        self.setup_received = asyncio.Event()

    async def receive_from_client(self) -> None:
        """Listens for and processes incoming messages from the WebSocket client."""
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
                            self.resumption_handle = data.get("resumption_handle")
                            logging.info(f"🎙️ Setup: voice={self.voice_name}, language={self.language}, user_id={self.user_id}, resumed={bool(self.resumption_handle)}")
                            self.setup_received.set()
                            continue
                        await self.input_queue.put(data)
                elif "bytes" in message:
                    await self.input_queue.put({"binary_data": message["bytes"]})
            except ConnectionClosedError:
                break
            except RuntimeError as e:
                if "disconnect" in str(e).lower():
                    break
                logging.error(f"WebSocket Runtime error: {e}")
                break
            except Exception as e:
                logging.error(f"WebSocket receive error: {e}")
                break

    async def run_agent(self) -> None:
        """Initializes and runs the ADK agent for the current session."""
        try:
            await self.setup_received.wait()
            await self.websocket.send_json({"setupComplete": {}})
            
            first_request = await self.input_queue.get()
            self.session_id = first_request.get("session_id")
            
            if not self.session_id:
                session = await session_service.create_session(app_name=adk_app.name, user_id=self.user_id)
                self.session_id = session.id

            # Create the agent + runner
            # speech_config is now handled inside create_agent's Agent definition
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
            first_live_request = first_request.get("live_request")
            if first_live_request:
                live_request_queue.send(LiveRequest.model_validate(first_live_request))

            async def _forward_requests():
                while True:
                    request = await self.input_queue.get()
                    live_request_queue.send(LiveRequest.model_validate(request))

            async def _forward_events() -> None:
                """Forwards events from the agent to the websocket using ADK's native transparency."""
                try:
                    # ONE single call to run_live. ADK handles internal reconnections transparently.
                    events_async = per_session_runner.run_live(
                        user_id=self.user_id,
                        session_id=self.session_id,
                        live_request_queue=live_request_queue,
                        run_config=RunConfig(
                            streaming_mode=StreamingMode.BIDI,
                            response_modalities=["AUDIO"],
                            # Resumption enabled: ADK manages handles, caching, and reconnects internally.
                            # Application code does NOT need to manage handles.
                            session_resumption=types.SessionResumptionConfig(transparent=True),
                            # Compression extended the session infinitely.
                            context_window_compression=types.ContextWindowCompressionConfig(
                                trigger_tokens=15000,
                                sliding_window=types.SlidingWindow(target_tokens=10000),
                            ),
                        )
                    )
                    async for event in events_async:
                        # Don't send internal ADK resumption updates to the client
                        if event.live_session_resumption_update:
                            continue
                            
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


def get_connect_and_run_callable(websocket: WebSocket) -> Callable:
    """Create a callable that handles agent connection with retry logic."""

    async def on_backoff(details: backoff._typing.Details) -> None:
        await websocket.send_json(
            {
                "status": f"Model connection error, retrying in {details['wait']} seconds..."
            }
        )

    @backoff.on_exception(
        backoff.expo, ConnectionClosedError, max_tries=10, on_backoff=on_backoff
    )
    async def connect_and_run() -> None:
        session = AgentSession(websocket)
        await asyncio.gather(
            session.receive_from_client(),
            session.run_agent(),
        )

    return connect_and_run


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """Main WebSocket endpoint with passcode check and retry logic."""
    passcode = websocket.query_params.get("passcode", "")
    if passcode != settings.ACCESS_PASSCODE:
        await websocket.close(code=4001, reason="Invalid passcode")
        return
    await websocket.accept()
    connect_and_run = get_connect_and_run_callable(websocket)
    try:
        await connect_and_run()
    finally:
        logging.info("🎙️ Session disconnected")

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
