/**
 * MockInterview.ai — Coding Interview Page
 * Uses agent-starter-pack audio/WS infrastructure with our interview UI.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { LiveAPIProvider, useLiveAPIContext } from "../contexts/LiveAPIContext";
import { AudioRecorder } from "../utils/audio-recorder";
import {
  CodeEditor,
  CodeEditorHandle,
} from "../components/interview/CodeEditor";
import { ProblemPane } from "../components/interview/ProblemPane";
import { ControlBar } from "../components/interview/ControlBar";
import { problems, Problem, LANGUAGES, Language } from "../data/problems";
import { motion } from "motion/react";
import { Code2, Mic, ArrowLeft } from "lucide-react";
import { FeedbackReport, FeedbackData } from "../components/feedback/FeedbackReport";

// WebSocket URL: in production, same host. In dev, connect to backend on :8000.
const isDevelopment = window.location.port === "3000";
const defaultHost = isDevelopment
  ? `${window.location.hostname}:8000`
  : window.location.host;
const defaultUri = `${
  window.location.protocol === "https:" ? "wss:" : "ws:"
}//${defaultHost}/`;

function InterviewSession() {
  const { problemId } = useParams<{ problemId: string }>();
  const navigate = useNavigate();
  const { client, connected, connect, disconnect, volume } =
    useLiveAPIContext();

  // Resolve problem from URL param, fallback to first
  const initialProblem =
    problems.find((p) => p.id === problemId) || problems[0];

  const [selectedProblem, setSelectedProblem] =
    useState<Problem>(initialProblem);
  const [language, setLanguage] = useState<Language>("python");
  const [code, setCode] = useState<string>(
    initialProblem.starterCode["python"]
  );
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMicActive, setIsMicActive] = useState(true);
  const [isVisionActive, setIsVisionActive] = useState(false);
  const [inputTranscription, setInputTranscription] = useState("");
  const [outputTranscription, setOutputTranscription] = useState("");
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackData, setFeedbackData] = useState<FeedbackData | null>(null);

  const editorRef = useRef<CodeEditorHandle>(null);
  const [audioRecorder] = useState(() => new AudioRecorder());
  const visionIntervalRef = useRef<number | null>(null);

  // ── Sync URL param → problem ──
  useEffect(() => {
    if (problemId) {
      const p = problems.find((prob) => prob.id === problemId);
      if (p && p.id !== selectedProblem.id) {
        setSelectedProblem(p);
        setCode(p.starterCode[language]);
      }
    }
  }, [problemId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Connect / Disconnect handlers ──
  const handleConnect = useCallback(async () => {
    setIsConnecting(true);
    try {
      await connect();
      setSessionStartTime(Date.now());
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

    const duration = sessionStartTime
      ? `${Math.floor((Date.now() - sessionStartTime) / 60000)} min`
      : '0 min';

    const feedback: FeedbackData = {
      overallScore: 7,
      duration,
      mode: 'coding',
      problemTitle: selectedProblem.title,
      categories: [
        { name: 'Problem Understanding', score: 7, comment: 'Good initial analysis of the problem constraints.' },
        { name: 'Approach & Algorithm', score: 7, comment: 'Solid approach. Consider discussing trade-offs between solutions.' },
        { name: 'Code Quality', score: 6, comment: 'Clean code structure. Watch for edge cases and naming conventions.' },
        { name: 'Communication', score: 8, comment: 'Great job thinking out loud and explaining your reasoning.' },
        { name: 'Testing & Edge Cases', score: 6, comment: 'Remember to walk through test cases before submitting.' },
      ],
      strengths: [
        'Communicated thought process clearly while coding',
        'Good understanding of the problem requirements',
        'Clean and readable code structure',
      ],
      improvements: [
        'Discuss time and space complexity before and after coding',
        'Consider more edge cases (empty input, single element, duplicates)',
        'Practice optimizing from brute force to optimal solution',
      ],
      nextSteps: [
        'Solve 2 more problems of similar difficulty',
        'Practice explaining Big-O complexity for every solution',
        'Review common patterns: sliding window, two pointers, hash maps',
        'Time yourself — aim for 25 minutes per medium problem',
      ],
    };

    setFeedbackData(feedback);
    setShowFeedback(true);
    setSessionStartTime(null);
  }, [disconnect, audioRecorder, sessionStartTime, selectedProblem]);

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
          const data = snapshot.slice(snapshot.indexOf(",") + 1);
          client.sendRealtimeInput([{ mimeType: "image/jpeg", data }]);
        }
      };
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

  const handleToggleMic = useCallback(() => {
    setIsMicActive((prev) => !prev);
  }, []);

  const handleToggleVision = useCallback(() => {
    setIsVisionActive((prev) => !prev);
  }, []);

  return (
    <>
    <div className="flex h-screen w-full flex-col bg-[#0f1115] text-white overflow-hidden">
      {/* Header */}
      <header className="flex h-14 items-center justify-between border-b border-white/10 bg-[#161b22] px-4 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors mr-2 cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span className="text-xs font-medium">Back</span>
          </button>
          <div className="h-5 w-px bg-white/10" />
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600">
            <Code2 size={16} />
          </div>
          <h1 className="text-sm font-bold tracking-tight">
            MockInterview.ai
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <select
            className="rounded-lg border border-white/10 bg-[#0d1117] px-3 py-1.5 text-sm text-gray-300 focus:border-blue-500 focus:outline-none"
            value={selectedProblem.id}
            onChange={(e) => {
              const p = problems.find((prob) => prob.id === e.target.value);
              if (p) {
                setSelectedProblem(p);
                setCode(p.starterCode[language]);
                navigate(`/coding/${p.id}`, { replace: true });
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

    {showFeedback && feedbackData && (
      <FeedbackReport
        feedback={feedbackData}
        onClose={() => {
          setShowFeedback(false);
          setFeedbackData(null);
        }}
      />
    )}
    </>
  );
}

export default function CodingInterviewPage() {
  return (
    <LiveAPIProvider url={defaultUri} userId="user1">
      <InterviewSession />
    </LiveAPIProvider>
  );
}
