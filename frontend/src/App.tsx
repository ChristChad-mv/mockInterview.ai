/**
 * MockInterview.ai — Main Application
 * Uses agent-starter-pack audio/WS infrastructure with our interview UI.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import "./App.scss";
import { LiveAPIProvider, useLiveAPIContext } from "./contexts/LiveAPIContext";
import { AudioRecorder } from "./utils/audio-recorder";
import { CodeEditor, CodeEditorHandle } from "./components/interview/CodeEditor";
import { ProblemPane } from "./components/interview/ProblemPane";
import { ControlBar } from "./components/interview/ControlBar";
import { problems, Problem, LANGUAGES, Language } from "./data/problems";
import { motion } from "motion/react";
import { Code2, Mic } from "lucide-react";

// WebSocket URL: in production, same host. In dev, connect to backend on :8000.
const isDevelopment = window.location.port === "3000";
const defaultHost = isDevelopment
  ? `${window.location.hostname}:8000`
  : window.location.host;
const defaultUri = `${
  window.location.protocol === "https:" ? "wss:" : "ws:"
}//${defaultHost}/`;

function InterviewApp() {
  const { client, connected, connect, disconnect, volume } =
    useLiveAPIContext();

  const [selectedProblem, setSelectedProblem] = useState<Problem>(problems[0]);
  const [language, setLanguage] = useState<Language>("python");
  const [code, setCode] = useState<string>(problems[0].starterCode["python"]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMicActive, setIsMicActive] = useState(true);
  const [isVisionActive, setIsVisionActive] = useState(false);
  const [inputTranscription, setInputTranscription] = useState("");
  const [outputTranscription, setOutputTranscription] = useState("");

  const editorRef = useRef<CodeEditorHandle>(null);
  const [audioRecorder] = useState(() => new AudioRecorder());
  const visionIntervalRef = useRef<number | null>(null);

  // ── Connect / Disconnect handlers ──
  const handleConnect = useCallback(async () => {
    setIsConnecting(true);
    try {
      await connect();
    } catch (e) {
      console.error("Connection failed:", e);
    } finally {
      setIsConnecting(false);
    }
  }, [connect]);

  const handleDisconnect = useCallback(async () => {
    await disconnect();
    audioRecorder.stop();
    setIsMicActive(true);
    setIsVisionActive(false);
    if (visionIntervalRef.current) {
      clearInterval(visionIntervalRef.current);
      visionIntervalRef.current = null;
    }
  }, [disconnect, audioRecorder]);

  // ── Audio recording → send to backend via client ──
  useEffect(() => {
    const onData = (base64: string) => {
      client.sendRealtimeInput([
        { mimeType: "audio/pcm;rate=16000", data: base64 },
      ]);
    };

    if (connected && isMicActive) {
      audioRecorder.on("data", onData).start();
    } else {
      audioRecorder.stop();
    }

    return () => {
      audioRecorder.off("data", onData);
    };
  }, [connected, client, isMicActive, audioRecorder]);

  // ── Speaking detection from volume ──
  useEffect(() => {
    setIsSpeaking(volume > 0.01);
  }, [volume]);

  // ── Transcription events ──
  useEffect(() => {
    const onInput = (text: string) => setInputTranscription(text);
    const onOutput = (text: string) => setOutputTranscription(text);

    client.on("inputtranscription", onInput);
    client.on("outputtranscription", onOutput);

    return () => {
      client.off("inputtranscription", onInput);
      client.off("outputtranscription", onOutput);
    };
  }, [client]);

  // ── Vision: periodic editor screenshots sent as image/jpeg ──
  useEffect(() => {
    if (connected && isVisionActive) {
      const sendFrame = () => {
        const snapshot = editorRef.current?.captureSnapshot();
        if (snapshot) {
          // snapshot is data:image/jpeg;base64,... — strip the prefix
          const data = snapshot.slice(snapshot.indexOf(",") + 1);
          client.sendRealtimeInput([{ mimeType: "image/jpeg", data }]);
        }
      };
      // Send immediately, then every 2 seconds
      sendFrame();
      visionIntervalRef.current = window.setInterval(sendFrame, 2000);
    } else {
      if (visionIntervalRef.current) {
        clearInterval(visionIntervalRef.current);
        visionIntervalRef.current = null;
      }
    }
    return () => {
      if (visionIntervalRef.current) {
        clearInterval(visionIntervalRef.current);
        visionIntervalRef.current = null;
      }
    };
  }, [connected, isVisionActive, client]);

  // ── Auto-start vision when connected ──
  useEffect(() => {
    if (connected) {
      setIsVisionActive(true);
    }
  }, [connected]);

  // ── Notify AI when problem changes ──
  useEffect(() => {
    if (connected) {
      client.send([
        {
          text: `[PROBLEM CHANGED] The candidate switched to: "${selectedProblem.title}" (${selectedProblem.difficulty}) using ${language.charAt(0).toUpperCase() + language.slice(1)}. Description: ${selectedProblem.description}. Please ask them to explain their approach.`,
        },
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProblem]);

  // ── Toggle mic ──
  const handleToggleMic = useCallback(() => {
    setIsMicActive((prev) => !prev);
  }, []);

  // ── Toggle vision ──
  const handleToggleVision = useCallback(() => {
    setIsVisionActive((prev) => !prev);
  }, []);

  return (
    <div className="flex h-screen w-full flex-col bg-[#0f1115] text-white overflow-hidden">
      {/* Header */}
      <header className="flex h-16 items-center justify-between border-b border-white/10 bg-[#161b22] px-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
            <Code2 size={20} />
          </div>
          <h1 className="text-lg font-bold tracking-tight">
            MockInterview.ai
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <select
            className="rounded-lg border border-white/10 bg-[#0d1117] px-3 py-1.5 text-sm text-gray-300 focus:border-blue-500 focus:outline-none"
            value={selectedProblem.id}
            onChange={(e) => {
              const p = problems.find((prob) => prob.id === e.target.value);
              if (p) {
                setSelectedProblem(p);
                setCode(p.starterCode[language]);
              }
            }}
          >
            {problems.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>

          <select
            className="rounded-lg border border-white/10 bg-[#0d1117] px-3 py-1.5 text-sm text-gray-300 focus:border-blue-500 focus:outline-none"
            value={language}
            onChange={(e) => {
              const newLang = e.target.value as Language;
              setLanguage(newLang);
              setCode(selectedProblem.starterCode[newLang]);
            }}
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2 rounded-full bg-black/20 px-3 py-1.5 border border-white/5">
            <div
              className={`h-2 w-2 rounded-full ${
                connected
                  ? "bg-green-500 animate-pulse"
                  : isConnecting
                    ? "bg-yellow-500 animate-pulse"
                    : "bg-red-500"
              }`}
            />
            <span className="text-xs font-medium text-gray-400">
              {connected
                ? "AI Connected"
                : isConnecting
                  ? "Connecting..."
                  : "AI Disconnected"}
            </span>
          </div>

          {isVisionActive && connected && (
            <div className="flex items-center gap-2 rounded-full bg-blue-500/10 px-3 py-1.5 border border-blue-500/20">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-xs font-medium text-blue-400">
                Vision Active
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 overflow-hidden">
        {/* Left: Problem Description */}
        <div className="w-1/3 min-w-[300px] max-w-[600px] border-r border-white/10 bg-[#0d1117]">
          <ProblemPane problem={selectedProblem} />
        </div>

        {/* Right: Code Editor */}
        <div className="flex-1 relative bg-[#1e1e1e]">
          <CodeEditor
            ref={editorRef}
            code={code}
            onChange={(val) => setCode(val || "")}
            language={language}
          />

          {/* AI Interviewer Visualizer */}
          {connected && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute bottom-6 right-6 flex items-center gap-4 rounded-2xl border border-white/10 bg-black/80 p-4 shadow-2xl backdrop-blur-md z-40"
            >
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Interviewer
                </span>
                <div className="flex items-center gap-2">
                  {isSpeaking ? (
                    <div className="flex gap-1 h-4 items-center">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <motion.div
                          key={i}
                          animate={{ height: [4, 16, 4] }}
                          transition={{
                            repeat: Infinity,
                            duration: 0.5,
                            delay: i * 0.1,
                          }}
                          className="w-1 rounded-full bg-blue-500"
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="h-4 w-20 rounded bg-white/5" />
                  )}
                </div>
                {outputTranscription && (
                  <p className="text-[10px] text-gray-500 max-w-[200px] truncate mt-1">
                    {outputTranscription}
                  </p>
                )}
              </div>

              <div className="h-8 w-px bg-white/10" />

              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  You
                </span>
                <div className="flex items-center gap-2">
                  <Mic
                    size={16}
                    className={
                      isMicActive ? "text-green-400" : "text-gray-600"
                    }
                  />
                </div>
                {inputTranscription && (
                  <p className="text-[10px] text-gray-500 max-w-[200px] truncate mt-1">
                    {inputTranscription}
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </main>

      {/* Footer Controls */}
      <footer className="h-20 border-t border-white/10 bg-[#161b22] flex items-center justify-center relative z-10 shrink-0">
        <ControlBar
          isConnected={connected}
          isConnecting={isConnecting}
          isMicActive={isMicActive}
          isVisionActive={isVisionActive}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
          onToggleMic={handleToggleMic}
          onToggleVision={handleToggleVision}
        />
      </footer>
    </div>
  );
}

function App() {
  return (
    <LiveAPIProvider url={defaultUri} userId="user1">
      <InterviewApp />
    </LiveAPIProvider>
  );
}

export default App;
