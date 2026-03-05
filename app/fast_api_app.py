# Copyright 2026 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import asyncio
import json
import logging
import os
import traceback
import uuid
from collections.abc import Callable
from pathlib import Path

import backoff
import google.auth
from fastapi import FastAPI, File, Form, Header, HTTPException, Request, UploadFile, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from google import genai
from google.adk.agents.live_request_queue import LiveRequest, LiveRequestQueue
from google.adk.apps import App
from google.adk.artifacts import GcsArtifactService, InMemoryArtifactService
from google.adk.memory.in_memory_memory_service import InMemoryMemoryService
from google.adk.runners import Runner
from google.adk.sessions.in_memory_session_service import InMemorySessionService
from google.cloud import logging as google_cloud_logging
from google.cloud import storage as gcs_storage
from vertexai.agent_engines import _utils
from websockets.exceptions import ConnectionClosedError

from .agent import app as adk_app, create_agent
from .app_utils.telemetry import setup_telemetry
from .app_utils.typing import Feedback

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Get the path to the frontend build directory
current_dir = Path(__file__).parent
frontend_build_dir = current_dir.parent / "frontend" / "build"

# Mount assets if build directory exists
if frontend_build_dir.exists():
    app.mount(
        "/assets",
        StaticFiles(directory=str(frontend_build_dir / "assets")),
        name="assets",
    )
logging_client = google_cloud_logging.Client()
logger = logging_client.logger(__name__)
logging.basicConfig(level=logging.INFO)

setup_telemetry()
_, project_id = google.auth.default()

# Access passcode for demo gating (judges get this code)
ACCESS_PASSCODE = os.environ.get("ACCESS_PASSCODE", "GEMINI2026")

# GCS bucket for interview recordings
RECORDINGS_BUCKET = os.environ.get("RECORDINGS_BUCKET", f"{project_id}-interview-recordings")
try:
    gcs_client = gcs_storage.Client(project=project_id)
except Exception:
    gcs_client = None
    logging.warning("GCS client not available — video uploads will be stored locally")


# Initialize ADK services
session_service = InMemorySessionService()
logs_bucket_name = os.environ.get("LOGS_BUCKET_NAME")
artifact_service = (
    GcsArtifactService(bucket_name=logs_bucket_name)
    if logs_bucket_name
    else InMemoryArtifactService()
)
memory_service = InMemoryMemoryService()

# Initialize ADK runner
runner = Runner(
    app=adk_app,
    session_service=session_service,
    artifact_service=artifact_service,
    memory_service=memory_service,
)


class AgentSession:
    """Manages bidirectional communication between a client and the agent."""

    def __init__(self, websocket: WebSocket) -> None:
        """Initialize the agent session.

        Args:
            websocket: The client websocket connection
        """
        self.websocket = websocket
        self.input_queue: asyncio.Queue[dict] = asyncio.Queue()
        self.user_id: str | None = None
        self.session_id: str | None = None
        # Voice selection — populated from the initial setup message
        self.voice_name: str = "Puck"
        self.setup_received = asyncio.Event()

    async def receive_from_client(self) -> None:
        """Listen for messages from the client and put them in the queue."""
        while True:
            try:
                message = await self.websocket.receive()

                if "text" in message:
                    data = json.loads(message["text"])

                    if isinstance(data, dict):
                        # Extract voice from setup messages, then skip them
                        if "setup" in data:
                            self.voice_name = data.get("voice", "Puck")
                            logger.log_struct(
                                {**data["setup"], "type": "setup", "voice": self.voice_name},
                                severity="INFO",
                            )
                            logging.info(
                                f"Received setup message — voice={self.voice_name}"
                            )
                            self.setup_received.set()
                            continue

                        # Forward message to agent engine
                        await self.input_queue.put(data)
                    else:
                        logging.warning(
                            f"Received unexpected JSON structure from client: {data}"
                        )

                elif "bytes" in message:
                    # Handle binary data
                    await self.input_queue.put({"binary_data": message["bytes"]})

                else:
                    logging.warning(
                        f"Received unexpected message type from client: {message}"
                    )

            except ConnectionClosedError as e:
                logging.warning(f"Client closed connection: {e}")
                break
            except json.JSONDecodeError as e:
                logging.error(f"Error parsing JSON from client: {e}")
                break
            except Exception as e:
                logging.error(f"Error receiving from client: {e!s}")
                break

    async def run_agent(self) -> None:
        """Run the agent with the input queue using bidi_stream_query protocol."""
        try:
            # ── Wait for the setup message so we know which voice to use ──
            await self.setup_received.wait()
            logging.info(f"Creating per-session agent with voice={self.voice_name}")

            # Build a per-session agent + runner with the chosen voice
            agent = create_agent(self.voice_name)
            per_session_app = App(root_agent=agent, name="app")
            per_session_runner = Runner(
                app=per_session_app,
                session_service=session_service,
                artifact_service=artifact_service,
                memory_service=memory_service,
            )

            # NOW send setupComplete — the frontend is waiting for this
            setup_complete_response: dict = {"setupComplete": {}}
            await self.websocket.send_json(setup_complete_response)

            # Wait for first request with user_id
            first_request = await self.input_queue.get()
            self.user_id = first_request.get("user_id")
            if not self.user_id:
                raise ValueError("The first request must have a user_id.")

            self.session_id = first_request.get("session_id")
            first_live_request = first_request.get("live_request")

            # Create session if needed
            if not self.session_id:
                session = await session_service.create_session(
                    app_name=adk_app.name,
                    user_id=self.user_id,
                )
                self.session_id = session.id

            # Create LiveRequestQueue
            live_request_queue = LiveRequestQueue()

            # Add first live request if present
            if first_live_request and isinstance(first_live_request, dict):
                live_request_queue.send(LiveRequest.model_validate(first_live_request))

            # Forward requests from input_queue to live_request_queue
            async def _forward_requests() -> None:
                while True:
                    request = await self.input_queue.get()
                    live_request = LiveRequest.model_validate(request)
                    live_request_queue.send(live_request)

            # Forward events from agent to websocket
            async def _forward_events() -> None:
                events_async = per_session_runner.run_live(
                    user_id=self.user_id,
                    session_id=self.session_id,
                    live_request_queue=live_request_queue,
                )
                async for event in events_async:
                    event_dict = _utils.dump_event_for_json(event)
                    await self.websocket.send_json(event_dict)

                    # Check for error responses
                    if isinstance(event_dict, dict) and "error" in event_dict:
                        logging.error(f"Agent error: {event_dict['error']}")
                        break

            # Run both tasks
            requests_task = asyncio.create_task(_forward_requests())

            try:
                await _forward_events()
            finally:
                requests_task.cancel()
                try:
                    await requests_task
                except asyncio.CancelledError:
                    pass

        except Exception as e:
            logging.error(f"Error in agent: {e}")
            await self.websocket.send_json({"error": str(e)})


def get_connect_and_run_callable(websocket: WebSocket) -> Callable:
    """Create a callable that handles agent connection with retry logic.

    Args:
        websocket: The client websocket connection

    Returns:
        Callable: An async function that establishes and manages the agent connection
    """

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
        logging.info("Starting ADK agent")
        session = AgentSession(websocket)

        logging.info("Starting bidirectional communication with agent")
        await asyncio.gather(
            session.receive_from_client(),
            session.run_agent(),
        )

    return connect_and_run


@app.post("/api/verify-passcode")
async def verify_passcode(request: Request) -> dict:
    """Verify the demo access passcode."""
    body = await request.json()
    code = body.get("passcode", "")
    if code == ACCESS_PASSCODE:
        logging.info("🔓 Passcode verified")
        return {"ok": True}
    logging.warning(f"🔒 Invalid passcode attempt")
    raise HTTPException(status_code=401, detail="Invalid passcode")


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    """Handle new websocket connections."""
    # Check passcode from query params
    passcode = websocket.query_params.get("passcode", "")
    if passcode != ACCESS_PASSCODE:
        await websocket.close(code=4001, reason="Invalid passcode")
        logging.warning("🔒 WebSocket rejected — invalid passcode")
        return
    await websocket.accept()
    logging.info("🎙️  New interview session connected")
    connect_and_run = get_connect_and_run_callable(websocket)
    try:
        await connect_and_run()
    finally:
        logging.info("🎙️  Interview session disconnected")


# ── Video-based AI Feedback ──

FEEDBACK_PROMPT = """You are an expert technical interview evaluator. You just watched a complete recording of a mock interview.

Analyze the ENTIRE video carefully, including:
- What the candidate said (explanations, reasoning, questions asked)
- How they communicated (clarity, confidence, pace, verbal fillers, pauses)
- Their technical approach (problem-solving process, code quality, design decisions)
- Their interaction with the AI interviewer (how they responded to hints and follow-ups)
- Visual cues: how they wrote code, drew diagrams, their editing patterns

IMPORTANT: Base your scores ONLY on what you actually observe in the video. Be honest, specific, and constructive.

Interview Mode: {mode}
Problem: {problem_title}
Duration: {duration}

Respond with ONLY valid JSON in this exact format (no markdown, no code fences):
{{
  "overallScore": <number 1-10>,
  "categories": [
    {{"name": "<category name>", "score": <number 1-10>, "comment": "<1-2 sentence specific feedback referencing what you saw>"}}
  ],
  "strengths": ["<specific strength from the video>", "<specific strength>", "<specific strength>"],
  "improvements": ["<specific improvement with example from video>", "<specific improvement>", "<specific improvement>"],
  "nextSteps": ["<actionable step 1>", "<actionable step 2>", "<actionable step 3>", "<actionable step 4>"]
}}

For CODING interviews, use categories: Problem Understanding, Approach & Algorithm, Code Quality, Communication, Testing & Edge Cases.
For SYSTEM DESIGN interviews, use categories: Requirements Gathering, High-Level Design, Deep Dive & Scalability, Trade-offs, Communication.
For BEHAVIORAL interviews, use categories: STAR Structure, Specificity & Detail, Communication Clarity, Self-Awareness, Relevance.
"""


@app.post("/api/feedback")
async def generate_video_feedback(
    video: UploadFile = File(...),
    mode: str = Form(...),
    problem_title: str = Form(...),
    duration: str = Form("0 min"),
    x_passcode: str | None = Header(None, alias="X-Passcode"),
) -> dict:
    """Analyze an interview recording with Gemini 3.0 Flash and return structured feedback."""
    if x_passcode != ACCESS_PASSCODE:
        raise HTTPException(status_code=401, detail="Invalid passcode")
    try:
        video_bytes = await video.read()
        video_size_mb = len(video_bytes) / (1024 * 1024)
        logging.info(
            f"Received {video_size_mb:.1f}MB video for {mode} interview: {problem_title}"
        )

        # Upload to GCS for Gemini to read directly
        video_uri = None
        if gcs_client:
            try:
                bucket = gcs_client.bucket(RECORDINGS_BUCKET)
                if not bucket.exists():
                    bucket = gcs_client.create_bucket(RECORDINGS_BUCKET, location="us-central1")

                blob_name = f"recordings/{uuid.uuid4()}.webm"
                blob = bucket.blob(blob_name)
                blob.upload_from_string(video_bytes, content_type="video/webm")
                video_uri = f"gs://{RECORDINGS_BUCKET}/{blob_name}"
                logging.info(f"Uploaded recording to {video_uri}")
            except Exception as e:
                logging.warning(f"GCS upload failed, using inline upload: {e}")

        # Build the Gemini request
        prompt = FEEDBACK_PROMPT.format(
            mode=mode,
            problem_title=problem_title,
            duration=duration,
        )

        # Use the Gemini API (API key) for 3.x models — not available on Vertex AI yet
        # IMPORTANT: agent.py sets GOOGLE_GENAI_USE_VERTEXAI=True globally, which
        # makes genai.Client route to Vertex AI even with api_key=. We must
        # explicitly force the Google AI endpoint via http_options.
        gemini_api_key = os.environ.get("GEMINI_API_KEY", "")
        if not gemini_api_key:
            raise ValueError("GEMINI_API_KEY environment variable is required for feedback analysis")

        client = genai.Client(
            api_key=gemini_api_key,
            http_options={"api_version": "v1beta", "url": "https://generativelanguage.googleapis.com"},
        )

        # Always use inline bytes (GCS URIs only work with Vertex AI)
        video_part = genai.types.Part.from_bytes(
            data=video_bytes,
            mime_type="video/webm",
        )

        feedback_model = "gemini-3.1-flash-lite-preview"
        logging.info(f"🧠 Sending {video_size_mb:.1f}MB video to {feedback_model} for analysis...")
        import time as _time
        t0 = _time.time()

        response = client.models.generate_content(
            model=feedback_model,
            contents=[
                genai.types.Content(
                    parts=[video_part, genai.types.Part.from_text(text=prompt)]
                )
            ],
            config=genai.types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.3,
            ),
        )

        elapsed = _time.time() - t0
        logging.info(f"✅ Gemini responded in {elapsed:.1f}s")

        # Parse the JSON response
        feedback_json = json.loads(response.text)

        # Add metadata
        feedback_json["mode"] = mode
        feedback_json["problemTitle"] = problem_title
        feedback_json["duration"] = duration

        # Log detailed results for Cloud Logging
        categories_summary = ", ".join(
            f"{c['name']}={c['score']}/10" for c in feedback_json.get("categories", [])
        )
        logging.info(
            f"📊 Feedback for [{mode}] '{problem_title}': "
            f"overall={feedback_json.get('overallScore')}/10 | {categories_summary}"
        )
        return feedback_json

    except json.JSONDecodeError as e:
        logging.error(f"Failed to parse AI feedback JSON: {e}")
        raise HTTPException(status_code=500, detail="Failed to parse AI feedback")
    except Exception as e:
        logging.error(f"Feedback generation failed: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health_check() -> dict:
    """Health check endpoint."""
    return {"status": "ok"}


@app.get("/", response_model=None)
async def serve_frontend_root() -> FileResponse | dict:
    """Serve the frontend index.html at the root path."""
    index_file = frontend_build_dir / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file))
    logging.warning(
        "Frontend not built. Run 'npm run build' in the frontend directory."
    )
    return {"status": "ok", "message": "Backend running. Frontend not built."}


@app.get("/{full_path:path}", response_model=None)
async def serve_frontend_spa(full_path: str) -> FileResponse | dict:
    """Catch-all route to serve the frontend for SPA routing.

    This ensures that client-side routes are handled by the React app.
    Excludes API routes (ws, feedback) and assets.
    """
    # Don't intercept API routes
    if full_path.startswith(("ws", "feedback", "assets", "api")):
        raise HTTPException(status_code=404, detail="Not found")

    # Serve index.html for all other routes (SPA routing)
    index_file = frontend_build_dir / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file))
    logging.warning(
        "Frontend not built. Run 'npm run build' in the frontend directory."
    )
    return {"status": "ok", "message": "Backend running. Frontend not built."}


@app.post("/feedback")
def collect_feedback(feedback: Feedback) -> dict[str, str]:
    """Collect and log feedback.

    Args:
        feedback: The feedback data to log

    Returns:
        Success message
    """
    logger.log_struct(feedback.model_dump(), severity="INFO")
    return {"status": "success"}


# Main execution
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
