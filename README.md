# 🎙️ MockInterview.ai

> **AI-powered mock technical interviews with real-time voice, vision, and structured feedback.**

An AI interviewer that **talks to you**, **watches your screen in real time**, and **gives video-based feedback** — just like sitting across from a senior engineer at Google. Built with [Google ADK](https://google.github.io/adk-docs/) + [Gemini Live 2.5 Flash Native Audio](https://ai.google.dev/gemini-api/docs/live).

https://github.com/user-attachments/assets/demo.mp4

---

## ✨ What Makes This Special

| | Feature | Details |
|---|---------|---------|
| 🎤 | **Real-time voice conversation** | Talk naturally — near-zero latency via AudioWorklet (16kHz record / 24kHz playback) |
| 👁️ | **Live screen vision** | The AI watches your code editor / whiteboard in real time and comments on what it sees |
| 🗣️ | **5 AI voices** | Choose from Puck, Charon, Kore, Fenrir, or Aoede — each with a distinct personality |
| 🌍 | **10 languages** | Interview in English, French, Spanish, Portuguese, German, Japanese, Korean, Chinese, Hindi, or Arabic |
| 🎭 | **4 interview styles** | Friendly, Tough, FAANG-style, or Casual — adapts the AI's personality |
| 📹 | **AI video feedback** | Records your screen → Gemini 3.1 Flash Lite analyzes the full video → structured scores & tips |
| 📊 | **Dashboard & history** | Track your progress, scores, streaks, and revisit past sessions |
| ⏱️ | **Customizable duration** | Choose 15-60 min sessions; AI paces the interview to finish on time |
| 🔐 | **Passcode access gate** | Control access for hackathon demos / judges |
| 📐 | **Detailed Architecture** | Comprehensive diagrams and technical deep-dives in [ARCHITECTURE.md](./ARCHITECTURE.md) |

---

## 🗺️ Three Interview Modes

### 💻 Coding Interview (`/coding/:problem`)
Full-featured **Monaco code editor** with syntax highlighting (Python, JavaScript, Java). The AI watches your code in real time, asks Socratic questions, and never gives direct answers.

**3 problems included:**
- Two Sum (Easy) • Reverse Linked List (Medium) • Longest Substring Without Repeating Characters (Medium)

### 🏗️ System Design (`/system-design/:problem`)
Interactive **tldraw whiteboard** — draw architecture diagrams while the AI guides you through requirements → estimation → high-level design → deep dive → bottlenecks.

**6 problems included:**
- Design a URL Shortener • Design a Chat System • Design Twitter / News Feed • Design a Rate Limiter • Design YouTube / Video Streaming • Design a Parking Lot System

### 🎯 Behavioral (`/behavioral/:question`)
Voice-only mode with **STAR framework** coaching. The AI asks follow-ups, pushes for specifics, and evaluates your storytelling.

**9 questions included:**
- Tell Me About Yourself • Working with a Difficult Teammate • Leading Without Authority • A Project That Failed • Delivering Under a Tight Deadline • Disagreeing with Your Manager • Cross-Team Collaboration • Solving an Ambiguous Problem • Mentoring or Teaching Others

---

## 🎛️ Pre-Interview Setup

Before each session, a configuration screen lets you customize:

| Setting | Options |
|---------|---------|
| **Voice** | ⚡ Puck · 🎭 Charon · ☀️ Kore · 🐺 Fenrir · 🎵 Aoede |
| **Language** | 🇬🇧 EN · 🇫🇷 FR · 🇪🇸 ES · 🇧🇷 PT · 🇩🇪 DE · 🇯🇵 JA · 🇰🇷 KO · 🇨🇳 ZH · 🇮🇳 HI · 🇸🇦 AR |
| **Style** | 😊 Friendly · 💪 Tough · 🏢 FAANG · ☕ Casual |
| **Duration** | ⏱️ 15 min · 30 min · 45 min · 60 min |

Voice is configured **per-session** via ADK's `SpeechConfig`. The AI is aware of the chosen duration and receives periodic hidden time updates to help it pace the session.

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     Cloud Run (port 8080)                     │
│                                                               │
│  ┌───────────────────┐        ┌────────────────────────────┐ │
│  │   React SPA        │        │   FastAPI (Python)          │ │
│  │                    │  WS    │                            │ │
│  │ • Monaco Editor    │───────▶│ • Per-session ADK Agent     │ │
│  │ • tldraw Whiteboard│◀───────│ • Gemini Live 2.5 Flash    │ │
│  │ • AudioWorklet     │  JSON  │ • Voice selection (5 voices)│ │
│  │ • Tab Recorder     │        │ • Video upload → GCS        │ │
│  │ • Tailwind CSS v4  │        │ • Feedback via Gemini 3.1   │ │
│  └───────────────────┘        └────────────────────────────┘ │
│       GET /*                    WS /ws                        │
│                                 POST /api/feedback            │
│                                 POST /api/verify-passcode     │
└──────────────────────────────────────────────────────────────┘
```

### How a session works

```
User clicks "Start Interview"
        │
        ▼
┌─ Screen share prompt (getDisplayMedia) ──── user must accept first
        │
        ▼
┌─ WebSocket connect + voice selection ────── per-session ADK agent created
        │                                      with chosen voice via SpeechConfig
        ▼
┌─ setupComplete received ─────────────────── agent is ready
        │
        ▼
┌─ Full context sent immediately ──────────── config + problem + first screen frame
        │
        ▼
┌─ Agent speaks first ─────────────────────── greets candidate, confirms problem
        │
        ▼
┌─ Bidirectional audio stream ─────────────── 16kHz PCM up, 24kHz PCM down
│  + periodic screen captures (JPEG)           via base64 JSON over WebSocket
        │
        ▼
┌─ End Session → video uploaded to GCS ────── tab recording (WebM) via MediaRecorder
        │
        ▼
┌─ Gemini 3.1 Flash Lite analyzes video ───── returns structured JSON feedback
        │
        ▼
┌─ Feedback displayed ────────────────────── scores, strengths, improvements, next steps
```

### ⏱️ Smart Time Management

The platform includes a real-time "Time Manager" logic:
- **Dynamic Pacing**: The AI receives silent `[SYSTEM]` updates every few minutes with the remaining time. It will naturally transition you through the interview phases to ensure you finish within the limit.
- **Grace Period**: When the timer hits zero, the AI is notified to wrap up. It has a **10-second grace period** to say its goodbyes before the connection is automatically severed and feedback generation begins.
- **Extendable Sessions**: Need more time? Click the **"+" button** next to the timer to instantly add **5 minutes** to your current session. The AI is immediately notified of the extension.

### Key Technical Details

- **Audio pipeline**: AudioWorklet records at 16kHz → base64 PCM chunks → WebSocket → ADK LiveRequest. Gemini responds with 24kHz PCM → AudioStreamer with VU meter worklet

- **Vision**: `getDisplayMedia({ preferCurrentTab: true })` captures the browser tab. Periodic JPEG snapshots sent as `realtimeInput` so the AI sees code/diagrams

- **Video recording**: `MediaRecorder` records the tab's `MediaStream` → WebM blob → uploaded to GCS for Gemini 3.1 analysis

- **Voice switching**: Each WebSocket connection extracts the chosen voice from the setup message, creates a fresh `Agent` with `generate_content_config.speech_config.voice_config`, and a per-session `Runner`

- **Feedback model**: Uses `gemini-3.1-flash-lite-preview` via Google AI (not Vertex AI) with explicit endpoint URL to avoid the global `GOOGLE_GENAI_USE_VERTEXAI=True`

---

## 📁 Project Structure

```
mockInterview.ai/
├── app/                              # Python backend
│   ├── agent.py                      # ADK Agent factory — create_agent(voice) with SpeechConfig
│   ├── fast_api_app.py               # FastAPI — WS, feedback API, passcode auth, SPA serving
│   └── app_utils/                    # Telemetry (OpenTelemetry), GCS logging, Pydantic types
│
├── frontend/                         # React frontend (Vite + Tailwind v4)
│   ├── src/
│   │   ├── App.tsx                   # Routes: /, /login, /dashboard, /coding, /system-design, /behavioral
│   │   ├── pages/
│   │   │   ├── LandingPage.tsx       # Hero + features + CTA
│   │   │   ├── LoginPage.tsx         # Passcode gate
│   │   │   ├── DashboardPage.tsx     # Stats, history, problem grid with completion tracking
│   │   │   ├── CodingInterviewPage.tsx     # Monaco editor + voice + screen share
│   │   │   ├── SystemDesignPage.tsx        # tldraw whiteboard + voice + screen share
│   │   │   └── BehavioralPage.tsx          # Voice-only STAR coaching + conversation log
│   │   ├── components/
│   │   │   ├── interview/
│   │   │   │   ├── PreInterviewSetup.tsx   # Voice / language / style selector
│   │   │   │   ├── CodeEditor.tsx          # Monaco wrapper with snapshot capture
│   │   │   │   ├── ProblemPane.tsx         # Problem description panel
│   │   │   │   └── ControlBar.tsx          # Timer, mute, disconnect controls
│   │   │   ├── side-panel/                 # Debug side panel (logs, transcription)
│   │   │   └── transcription-preview/      # Live transcription overlay
│   │   ├── contexts/
│   │   │   ├── LiveAPIContext.tsx           # React context wrapping useLiveAPI
│   │   │   └── AuthContext.tsx             # Passcode auth state (sessionStorage)
│   │   ├── hooks/
│   │   │   ├── use-live-api.ts             # WebSocket + audio connect/disconnect
│   │   │   └── use-tab-recorder.ts         # MediaRecorder for screen capture → WebM
│   │   ├── utils/
│   │   │   ├── multimodal-live-client.ts   # WebSocket client — voice param in connect()
│   │   │   ├── audio-streamer.ts           # PCM 24kHz playback with VU meter
│   │   │   ├── audio-recorder.ts           # PCM 16kHz capture via AudioWorklet
│   │   │   ├── interview-config.ts         # Voices, languages, styles config
│   │   │   ├── interview-history.ts        # localStorage-based session history
│   │   │   └── feedback-api.ts             # Video upload + Gemini 3.1 feedback
│   │   └── data/
│   │       ├── problems.ts                 # 3 coding problems (Easy → Medium)
│   │       ├── systemDesignProblems.ts      # 6 system design problems
│   │       └── behavioralQuestions.ts       # 9 behavioral questions (6 categories)
│   ├── package.json                  # React 18, Monaco, tldraw, Tailwind v4, motion, lucide
│   └── vite.config.ts               # Vite + Tailwind CSS plugin
│
├── Dockerfile                        # Multi-stage: Python 3.11 + Node 20 → single container
├── Makefile                          # install, playground, deploy, test, lint
├── pyproject.toml                    # ADK, FastAPI, OpenTelemetry, Cloud Logging
├── deployment/terraform/             # Full IaC (Cloud Run, IAM, Cloud Build, GCS)
└── .cloudbuild/                      # CI/CD (PR checks, staging, prod)
```

---

## 🚀 Quick Start

### Prerequisites

- [uv](https://docs.astral.sh/uv/getting-started/installation/) — Python package manager
- [Node.js 20+](https://nodejs.org/) — For frontend build
- [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) — For Vertex AI + deployment
- A GCP project with **Vertex AI API** enabled
- A **Google AI API key** (for the feedback endpoint — `GOOGLE_AI_API_KEY` env var)

### Run locally

```bash
# 1. Clone
git clone https://github.com/ChristChad-mv/mockInterview.ai.git
cd mockInterview.ai

# 2. Authenticate with GCP (needed for Vertex AI / Gemini Live)
gcloud auth application-default login

# 3. Set your Google AI API key (for video feedback)
export GOOGLE_AI_API_KEY=your-key-here

# 4. Install everything & launch
make install && make playground
```

Open **http://localhost:8000** → Enter passcode → Pick a problem → Talk! 🎤

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ACCESS_PASSCODE` | `...` | Passcode to gate access (login + WS + feedback) |
| `GOOGLE_AI_API_KEY` | — | Google AI API key for Gemini 3.1 feedback analysis |
| `RECORDINGS_BUCKET` | `{project}-interview-recordings` | GCS bucket for video uploads |
| `LOGS_BUCKET_NAME` | — | GCS bucket for conversation logs (optional) |

### Run with Docker

```bash
docker build -t mockinterview .
docker run -p 8080:8080 \
  -e GOOGLE_AI_API_KEY=your-key \
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

- **Agent behavior** → edit `app/agent.py` (system instruction + voice config)
- **Interview problems** → edit files in `frontend/src/data/`
- **Frontend** → edit `frontend/src/` — auto-rebuilds with `make playground`

---

## 📊 Observability

Built-in telemetry (OpenTelemetry → Cloud Trace, Cloud Logging, BigQuery):
- Set `LOGS_BUCKET_NAME=gs://your-bucket` to save full conversation logs to GCS
- All agent sessions are traced end-to-end
- See the [observability guide](https://googlecloudplatform.github.io/agent-starter-pack/guide/observability)

---

## 🗓️ Roadmap

- [x] Real-time voice interview with Gemini Live 2.5 Flash Native Audio
- [x] Live vision — AI sees code editor & whiteboard in real time
- [x] 3 interview modes: Coding, System Design, Behavioral
- [x] Monaco code editor with multi-language support (Python, JS, Java)
- [x] tldraw interactive whiteboard for system design
- [x] Pre-interview setup: 5 voices, 10 languages, 4 styles
- [x] Per-session voice switching via ADK SpeechConfig
- [x] Video-based AI feedback with Gemini 3.1 Flash Lite
- [x] Dashboard with stats, streaks, and interview history
- [x] Proper session flow: screen share → connect → context → agent speaks
- [x] Customizable interview duration (15, 30, 45, 60 min)
- [x] Real-time AI time awareness and dynamic pacing
- [x] "Add time" (+5 min) extension button
- [x] Comprehensive Architecture Documentation with Mermaid diagrams
- [ ] More coding problems (15+ across Easy/Medium/Hard)
- [ ] Persistent user accounts with OAuth
- [ ] Resume upload → AI generates tailored behavioral questions

---

## 🧰 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Live Interview AI** | Gemini Live 2.5 Flash Native Audio via Google ADK |
| **Feedback AI** | Gemini 3.1 Flash Lite Preview (video analysis) |
| **Backend** | Python 3.11, FastAPI, uvicorn |
| **Frontend** | React 18, TypeScript, Vite |
| **Styling** | Tailwind CSS v4, motion/react, lucide-react |
| **Code Editor** | Monaco Editor (VS Code engine) |
| **Whiteboard** | tldraw |
| **Audio** | AudioWorklet (16kHz PCM record, 24kHz PCM playback) |
| **Video** | MediaRecorder (getDisplayMedia → WebM) |
| **Storage** | Google Cloud Storage |
| **Infra** | Cloud Run, Terraform, Cloud Build CI/CD |
| **Telemetry** | OpenTelemetry → Cloud Trace + Cloud Logging |

---

## 🙏 Acknowledgments

- Built on [Google Agent Starter Pack](https://github.com/GoogleCloudPlatform/agent-starter-pack) v0.38.0
- Powered by [Gemini Live 2.5 Flash Native Audio](https://ai.google.dev/gemini-api/docs/live) via [Google ADK](https://google.github.io/adk-docs/)
- Video feedback powered by [Gemini 3.1 Flash Lite](https://ai.google.dev/gemini-api)
- Frontend audio architecture from the starter-pack's AudioWorklet implementation

---

<p align="center">
  Built with ❤️ for the <strong>Gemini Live Agent Challenge 2026</strong>
</p>
