<div align="center">

# 🎤 MockInterview.ai

**AI-powered mock coding interviews with real-time voice & vision**

Built with Google Gemini Live API + ADK for the [Gemini Live Agent Challenge](https://ai.google.dev/gemini-api/docs/live-agent-challenge)

</div>

## Architecture

```
mockInterview.ai/
├── frontend/          # React + Vite + TypeScript
│   ├── src/
│   │   ├── hooks/     # useGeminiLive — WebSocket to backend
│   │   ├── lib/       # Audio PCM utils, Gemini config
│   │   ├── components/# UI (Monaco editor, overlays, controls)
│   │   └── types/     # TypeScript types
│   └── ...
└── backend/           # Python FastAPI + Google ADK
    └── app/
        ├── main.py              # WebSocket relay (audio binary + JSON)
        └── interview_agent/     # ADK Agent definition
```

**Audio flow:** Browser mic → PCM16 binary frames → Backend WebSocket → ADK → Gemini Live API → ADK events → Binary PCM frames → Browser AudioContext (24kHz)

**Vision flow:** Monaco editor → Canvas screenshot → Base64 PNG → JSON frame → Backend → Gemini (every 2s)

## Run Locally

**Prerequisites:** Node.js 18+, Python 3.11+, uv

### 1. Backend

```bash
cd backend
cp .env.example .env   # Add your GOOGLE_API_KEY
uv sync
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Frontend

```bash
cd frontend
npm install
# Create .env.local with:
#   GEMINI_API_KEY=your-key
#   VITE_WS_URL=ws://localhost:8000
npm run dev
```

Open http://localhost:3000 — allow microphone access, and start your mock interview!
