# MockInterview.ai Architecture & Design

This document details the technical implementation and user workflows of **MockInterview.ai**, built for the **Gemini Live Agent Challenge**.

## 1. High-Level System Architecture

This diagram illustrates the core components and how they communicate.

```mermaid
graph TD
    User((Candidate))
    
    subgraph "Frontend (React + Vite)"
        UI["UI Components / Monaco Editor"]
        Audio["AudioWorklet / MediaStream"]
        Vision["Screen Capture Stream"]
        Client["WebSocket Client / Gemini Live Client"]
    end

    subgraph "Backend (FastAPI / ADK Agent)"
        WS_Handler["WebSocket Handler"]
        ADK["ADK Agent (Sequential)"]
        CV_Search["CV Search Tool (RAG)"]
        Culture_Tool["Company Culture Tool"]
    end

    subgraph "External AI Services (Google Cloud)"
        GeminiLive["Gemini 2.5 Live API"]
        GeminiFlash["Gemini 3.1 Flash-Lite (Analysis)"]
        FileSearch["Gemini File Search (CV Data)"]
    end

    subgraph "Persistence & Storage"
        GCS["Google Cloud Storage (Recordings)"]
    end

    User <--> UI
    UI <--> Client
    Audio <--> Client
    Vision <--> Client
    
    Client <--> WS_Handler
    WS_Handler <--> ADK
    ADK <--> GeminiLive
    
    ADK --> CV_Search
    CV_Search --> FileSearch
    ADK --> Culture_Tool
    
    ADK --> GCS
    GCS --> GeminiFlash
    GeminiFlash --> WS_Handler

    classDef tech fill:#3b82f6,stroke:#fff,stroke-width:2px,color:#fff;
    classDef internal fill:#1e1e2e,stroke:#3b82f6,stroke-width:2px,color:#fff;
    classDef cloud fill:#4285F4,stroke:#fff,stroke-width:1px,color:#fff;
    
    class Client,WS_Handler,ADK internal;
    class GeminiLive,GeminiFlash,FileSearch cloud;
    class UI,Audio,Vision tech;
```

---

## 2. Sequence Diagram: Live Session & Feedback

This diagram shows the real-time flow of multimodal data followed by the asynchronous feedback generation.

```mermaid
sequenceDiagram
    participant U as Candidate
    participant C as Frontend (Client)
    participant S as Backend (FastAPI / ADK)
    participant GL as Gemini Live API
    participant CV as File Search (CV)
    participant G3 as Gemini 3.1 Flash-Lite

    U->>C: Starts Interview
    C->>S: WebSocket Connection Request
    S-->>C: Connection Established
    
    Note over S,CV: Pre-Interview RAG Initialization
    S->>CV: cv_search(User Profile)
    CV-->>S: Contextual Data (History/Skills)
    
    loop Real-time Interview
        U->>C: Speaks (Audio Input)
        C->>GL: Send Audio Binary (Bidi-stream)
        
        Note over C,GL: Continuous Vision Stream
        C->>GL: Send Screen Snapshot (JPEG)
        
        GL-->>C: Millisecond Native Audio Response
        C-->>U: Play Audio (Real-time)
    end

    U->>C: Ends Session
    C->>S: Request Final Analysis
    S->>S: Upload Recording to GCS
    S->>G3: Analyze Video Metadata + Content
    G3-->>S: Return Structured JSON Feedback
    S-->>C: Display Feedback Dashboard
```

---

## 3. Use Case Diagram

How the candidate interacts with the platform.

```mermaid
graph TD
    Actor((Candidate))
    
    subgraph "MockInterview.ai"
        UC1(Select Interview Mode)
        UC2(Upload Resume & Personalize)
        UC3(Conduct Live Interview)
        UC3a(Real-time Coding/Vision) 
        UC3b(Whiteboarding)
        UC4(Review AI Coaching Feedback)
        UC5(Manage Interview History)
    end
    
    Actor --> UC1
    Actor --> UC2
    Actor --> UC3
    UC3 --> UC3a
    UC3 --> UC3b
    Actor --> UC4
    Actor --> UC5
    
    style Actor fill:#3b82f6,stroke:#fff,stroke-width:2px
    style UC3 fill:#1e1e2e,stroke:#3b82f6,stroke-width:2px
```

---

## 4. Multimodal Data Engineering

| Data Type | Frequency | Tech Stack | Role |
| :--- | :--- | :--- | :--- |
| **User Audio** | Continuous | `AudioWorklet` (16kHz) | Direct Voice communication |
| **AI Audio** | Real-time | `Native Audio` (Bidi) | Zero-latency human-like response |
| **Code Vision** | Every 2s | `MediaStream` -> `JPEG` | Real-time code analysis & advice |
| **CV Context** | Once/Session | `Gemini File Search` | Personalizing questions to candidate's background |
| **Whiteboard** | Change-based | `tldraw` Snapshot | Visualizing architectural patterns |
| **Session State** | Event-based | `FastAPI WebSockets` | Live orchestration & state sync |

---

## 5. Deployment Strategy

* **Frontend**: Hosted on **Cloud Run** or **Vercel** with global CDN.
* **Backend**: Pre-authenticated **Cloud Run** containers for low-latency scaling.
* **Storage**: **Google Cloud Storage** for interview recordings (WebM) and AI feedback persistence.
* **Environment**: Uses `GOOGLE_API_KEY` for ADK authentication and Google Application Credentials for GCS.
