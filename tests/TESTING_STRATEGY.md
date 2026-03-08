# MockInterview.ai Testing Strategy

This document outlines the testing roadmap for ensuring the stability and quality of the AI-powered mock interview platform.

## 1. Backend Testing (Python)

### 🧩 Unit Tests
Focused on isolated logic in `app/app_utils/` and `app/tools/`.
- **Status**: ✅ `tests/unit/test_tools.py` implemented.
- **Next steps**:
    - `test_config.py`: Verify settings loading and fallback mechanisms.
    - `test_identity.py`: Verify JudgeID store name generation.
    - `test_system_prompts.py`: Ensure prompt versions load correctly.

### 🔗 Integration Tests
Verifying the interaction between the FastAPI app, the ADK agent, and external APIs.
- **Status**: ⚠️ `tests/integration/test_server_e2e.py` exists but needs verification of all session modes.
- **Next steps**:
    - Test Behavioral mode specifically.
    - Test System Design (Mocking tldraw state updates).

### 🧠 AI Eval (LLM-as-a-Judge)
Since the feedback quality is critical, we need a way to measure it.
- **Strategy**: Create a "Golden Set" of interview transcripts (Good/Bad/Average) and run them through `generate_video_feedback`. Check that the `overallScore` and `strengths/improvements` align with manual labels.

---

## 2. Frontend Testing (React + Vitest)

### ⚛️ Component Tests
- **Monaco Editor**: Verify that code changes trigger the state update sent to the AI.
- **Timer & Extension**: Test the `+5 min` logic and the grace period before disconnect.
- **Audio Worklet**: Test the PCM conversion logic (using mock audio buffers).

### 🧪 E2E Tests (Playwright/Cypress)
- **Session Flow**: 
    1. Select voice/language.
    2. Start interview (mock screen share).
    3. Verify WebSocket connection.
    4. Verify End Interview -> Analysis -> Dashboard flow.

---

## 3. Infrastructure & Performance

### 🚀 Load Testing (Locust)
- **Status**: ⚠️ `tests/load_test/load_test.py` exists.
- **Goal**: Verify that the backend can handle 50+ concurrent WebSocket sessions with audio streaming.
- **Note**: This is critical for evaluating Cloud Run scaling limits.

---

## 4. CI/CD Integration

1. **Pre-commit**: Run `ruff` (linting) and Python unit tests.
2. **Pull Request**: Run all backend unit and integration tests.
3. **Post-Deployment**: Run the E2E "Sanity Check" on the Cloud Run URL.
