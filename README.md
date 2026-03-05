# 🎙️ MockInterview.ai

**AI-powered mock technical interviews with real-time voice, vision, and code editing.**

An AI interviewer that talks to you, watches your code in real time, and gives feedback — just like a real interview at a top tech company. Built with [Google ADK](https://google.github.io/adk-docs/) + [Gemini Live](https://ai.google.dev/gemini-api/docs/live) native audio.

https://github.com/user-attachments/assets/demo.mp4

---

## ✨ Features

- **🎤 Real-time voice conversation** — Talk naturally with the AI interviewer (near-zero latency via AudioWorklet)
- **👁️ Vision** — The AI sees your code editor in real time and comments on what you write
- **💻 Monaco code editor** — Full-featured editor with syntax highlighting (Python, JavaScript, Java)
- **🧠 Socratic interviewing** — The AI asks guiding questions, never gives direct answers
- **🌐 Single container deployment** — Frontend + backend served from one Cloud Run URL

## 🗺️ Interview Modes

| Mode | Route | Status |
|------|-------|--------|
| **Coding Interview** | `/coding/:problem` | ✅ Live |
| **System Design** | `/system-design/:problem` | 🔜 Coming soon |
| **Behavioral** | `/behavioral/:question` | 🔜 Planned |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Cloud Run (port 8080)              │
│                                                      │
│  ┌──────────────┐     ┌───────────────────────────┐ │
│  │ React SPA    │     │  FastAPI (Python)          │ │
│  │              │────▶│                            │ │
│  │ Monaco Editor│ WS  │  ADK Agent                 │ │
│  │ AudioWorklet │◀────│  Gemini Live native audio  │ │
│  │ Tailwind CSS │     │  Vertex AI                 │ │
│  └──────────────┘     └───────────────────────────┘ │
│       GET /*              WS /ws                     │
└─────────────────────────────────────────────────────┘
```

**How it works:**
1. Frontend captures your microphone (16kHz PCM via AudioWorklet) and editor screenshots
2. Audio + images sent as base64 over WebSocket to FastAPI backend
3. Backend pipes everything to Gemini Live via ADK `LiveRequest` protocol
4. Gemini responds with audio (24kHz PCM) played back via AudioWorklet — near-zero latency
5. The AI interviewer sees your code, hears you talk, and responds naturally

## 📁 Project Structure

```
mockInterview.ai/
├── app/                          # Python backend
│   ├── agent.py                  # ADK Agent — interviewer system instruction + Gemini Live model
│   ├── fast_api_app.py           # FastAPI — WebSocket endpoint, serves static frontend
│   └── app_utils/                # Telemetry (OpenTelemetry), GCS logging, Pydantic types
├── frontend/                     # React frontend
│   ├── src/
│   │   ├── App.tsx               # Main app — wires LiveAPIContext with interview UI
│   │   ├── components/interview/ # CodeEditor (Monaco), ControlBar, ProblemPane
│   │   ├── data/problems.ts      # Coding problems with starter code (Python/JS/Java)
│   │   ├── contexts/             # LiveAPIContext — React context for audio/WS connection
│   │   ├── hooks/                # useLiveAPI, useScreenCapture, useWebcam
│   │   └── utils/                # AudioWorklet recorder/streamer, WebSocket client
│   ├── package.json              # React 18, Monaco, Tailwind v4, motion, lucide-react
│   └── vite.config.ts            # Vite + Tailwind plugin
├── Dockerfile                    # Single container: Python 3.11 + Node 20 multi-stage
├── Makefile                      # install, playground, deploy, test, lint
├── pyproject.toml                # Python deps (ADK, FastAPI, OpenTelemetry, Cloud Logging)
├── deployment/terraform/         # Full IaC for GCP (Cloud Run, IAM, Cloud Build, GCS)
└── .cloudbuild/                  # CI/CD pipelines (PR checks, staging, prod)
```

---

## 🚀 Quick Start

### Prerequisites

- [uv](https://docs.astral.sh/uv/getting-started/installation/) — Python package manager
- [Node.js 20+](https://nodejs.org/) — For frontend build
- [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) — For Vertex AI + deployment
- A GCP project with Vertex AI API enabled

### Run locally

```bash
# 1. Clone
git clone https://github.com/ChristChad-mv/mockInterview.ai.git
cd mockInterview.ai

# 2. Authenticate with GCP (needed for Vertex AI / Gemini)
gcloud auth application-default login

# 3. Install everything & launch
make install && make playground
```

Open **http://localhost:8000** → Click **Start Interview** → Talk! 🎤

### Run with Docker

```bash
docker build -t mockinterview .
docker run -p 8080:8080 \
  -v ~/.config/gcloud:/root/.config/gcloud \
  mockinterview
```

### Deploy to Cloud Run

```bash
gcloud config set project <your-project-id>
make deploy
```

---

## 🛠️ Development

| Command | Description |
|---------|-------------|
| `make install` | Install Python + Node dependencies |
| `make playground` | Launch local dev server (auto-reloads) |
| `make build-frontend` | Build React frontend for production |
| `make deploy` | Deploy to Cloud Run |
| `make test` | Run unit + integration tests |
| `make lint` | Code quality checks (ruff, codespell) |

Edit the agent behavior in `app/agent.py` — the system instruction defines the interviewer personality.
Edit the frontend in `frontend/src/` — changes auto-rebuild with `make playground`.

---

## 📊 Observability

Built-in telemetry (OpenTelemetry → Cloud Trace, Cloud Logging, BigQuery):
- Set `LOGS_BUCKET_NAME=gs://your-bucket` to save full conversation logs to GCS
- All agent sessions are traced end-to-end
- See the [observability guide](https://googlecloudplatform.github.io/agent-starter-pack/guide/observability)

---

## 🗓️ Roadmap

- [x] Real-time voice interview with Gemini Live
- [x] Vision — AI sees code editor
- [x] Multi-language support (Python, JavaScript, Java)
- [ ] URL routing: `/coding/:problem`, `/system-design/:problem`
- [ ] System Design mode with whiteboard
- [ ] Auth + user accounts
- [ ] Dashboard with session history & performance tracking
- [ ] Interview scoring & feedback report at end of session
- [ ] Behavioral interview mode

---

## 🙏 Acknowledgments

- Built on [Google Agent Starter Pack](https://github.com/GoogleCloudPlatform/agent-starter-pack) v0.38.0
- Powered by [Gemini Live 2.5 Flash Native Audio](https://ai.google.dev/gemini-api/docs/live) via [Google ADK](https://google.github.io/adk-docs/)
- Frontend audio architecture from the starter-pack's AudioWorklet implementation
