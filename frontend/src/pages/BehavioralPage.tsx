/**
 * MockInterview.ai — Behavioral Interview Page
 * Pure voice conversation with AI interviewer. No code editor or whiteboard.
 * Shows the question, STAR framework, and a conversation visualizer.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LiveAPIProvider, useLiveAPIContext } from '../contexts/LiveAPIContext';
import { AudioRecorder } from '../utils/audio-recorder';
import { QuestionPane } from '../components/behavioral/QuestionPane';
import { FeedbackReport, FeedbackData } from '../components/feedback/FeedbackReport';
import { useTabRecorder } from '../hooks/use-tab-recorder';
import { fetchAIFeedback } from '../utils/feedback-api';
import { addRecord } from '../utils/interview-history';
import { PreInterviewSetup } from '../components/interview/PreInterviewSetup';
import { type InterviewConfig, buildSessionConfigMessage, getSavedConfig } from '../utils/interview-config';
import { getJudgeId } from "../utils/identity";
import { Timer } from "../components/interview/Timer";
import {
  behavioralQuestions,
  BehavioralQuestion,
} from '../data/behavioralQuestions';
import { motion } from 'motion/react';
import {
  MessageSquare,
  Mic,
  MicOff,
  ArrowLeft,
  Play,
  Square,
  Loader2,
  Clock,
} from 'lucide-react';

// WebSocket URL
const isDevelopment = window.location.port === '3000';
const defaultHost = isDevelopment
  ? `${window.location.hostname}:8000`
  : window.location.host;
const defaultUri = `${
  window.location.protocol === 'https:' ? 'wss:' : 'ws:'
}//${defaultHost}/`;

function BehavioralSession() {
  const { questionId } = useParams<{ questionId: string }>();
  const navigate = useNavigate();
  const { client, connected, connect, disconnect, volume } =
    useLiveAPIContext();

  const initialQuestion =
    behavioralQuestions.find((q) => q.id === questionId) ||
    behavioralQuestions[0];

  const [selectedQuestion, setSelectedQuestion] =
    useState<BehavioralQuestion>(initialQuestion);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMicActive, setIsMicActive] = useState(true);
  const [inputTranscription, setInputTranscription] = useState('');
  const [outputTranscription, setOutputTranscription] = useState('');
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState('0:00');
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackData, setFeedbackData] = useState<FeedbackData | null>(null);
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [durationInMins, setDurationInMins] = useState<number>(30);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(30 * 60);

  const [audioRecorder] = useState(() => new AudioRecorder());
  const { startRecording, stopRecording } = useTabRecorder();

  // Conversation log for generating feedback
  const [conversationLog, setConversationLog] = useState<
    { role: 'user' | 'ai'; text: string; time: number }[]
  >([]);

  // ── Sync URL param → question ──
  useEffect(() => {
    if (questionId) {
      const q = behavioralQuestions.find((qu) => qu.id === questionId);
      if (q && q.id !== selectedQuestion.id) {
        setSelectedQuestion(q);
      }
    }
  }, [questionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Session Time Log ──
  useEffect(() => {
    if (!sessionStartTime) return;
    const interval = setInterval(() => {
      const diff = Math.floor((Date.now() - sessionStartTime) / 1000);
      const mins = Math.floor(diff / 60);
      const secs = diff % 60;
      setElapsed(`${mins}:${secs.toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionStartTime]);

  // ── Connect / Disconnect ──
  const hasInitializedRef = useRef(false);

  const handleStartWithConfig = useCallback(async (config: InterviewConfig) => {
    setIsConnecting(true);
    try {
      // 1) Screen share prompt FIRST — user must accept before AI starts
      const recordingOk = await startRecording();
      if (!recordingOk) {
        console.warn('Screen share denied — interview not started');
        setIsConnecting(false);
        return;
      }

      // 2) Now connect to the AI agent (waits for setupComplete)
      setInterviewStarted(true);
      await connect(config.voice);
      setDurationInMins(config.duration);
      setSecondsRemaining(config.duration * 60);
      setSessionStartTime(Date.now());
      setConversationLog([]);

      // 3) Send EVERYTHING before the agent speaks
      const configMsg = buildSessionConfigMessage(config);
      
      const jobContext = config.jobDescription 
        ? `[TARGET JOB DESCRIPTION]\n${config.jobDescription}\n\nUse this JD to tailor your questions and expectations.`
        : '';

      let questionContext = '';
      if (selectedQuestion.id === 'full-behavioral-mock') {
        questionContext = `[BEHAVIORAL INTERVIEW — FULL MOCK SESSION]
You are conducting a full mock behavioral interview. 
${jobContext}

1. Start by asking the candidate to introduce themselves.
2. Then, pick 3 distinct behavioral areas (relevant to the JD if provided) and ask one major question for each.
3. For each question, dig deep with follow-ups to ensure they use the STAR method.
4. Total duration should be around ${durationInMins} minutes.

You are in BEHAVIORAL INTERVIEW mode. Greet the candidate warmly and start the session.`;
      } else {
        questionContext = `[BEHAVIORAL INTERVIEW — SINGLE QUESTION]
${jobContext}

The candidate is practicing: "${selectedQuestion.title}" (${selectedQuestion.category}).

Question: ${selectedQuestion.description}

Possible follow-ups to ask later:
${selectedQuestion.followUps.map((q, i) => `${i + 1}. ${q}`).join('\n')}

You are in BEHAVIORAL INTERVIEW mode. Greet the candidate, read the question, and ask them to answer using the STAR method. Be warm and encouraging.`;
      }

      const fullContext = [configMsg, questionContext].filter(Boolean).join('\n\n');
      client.send([{ text: fullContext }]);

      hasInitializedRef.current = true;
    } catch (e) {
      console.error('Connection failed:', e);
      setInterviewStarted(false);
    } finally {
      setIsConnecting(false);
    }
  }, [connect, client, startRecording, selectedQuestion]);

  const handleDisconnect = useCallback(async () => {
    await disconnect();
    audioRecorder.stop();
    setIsMicActive(true);
    // NOTE: Do NOT set interviewStarted=false here — we need the interview
    // session DOM to stay mounted so the feedback overlay can render.

    const duration = sessionStartTime
      ? `${Math.floor((Date.now() - sessionStartTime) / 60000)} min`
      : '0 min';
    setSessionStartTime(null);

    const videoBlob = await stopRecording();
    if (videoBlob && videoBlob.size > 0) {
      setIsGeneratingFeedback(true);
      try {
        const feedback = await fetchAIFeedback({
          videoBlob,
          mode: 'behavioral',
          problemTitle: selectedQuestion.title,
          duration,
        });
        setFeedbackData(feedback);
        setShowFeedback(true);
        addRecord({
          mode: 'behavioral',
          problemId: selectedQuestion.id,
          problemTitle: selectedQuestion.title,
          overallScore: feedback.overallScore,
          categories: feedback.categories.map(c => ({ name: c.name, score: c.score, comment: c.comment })),
          duration,
          strengths: feedback.strengths,
          improvements: feedback.improvements,
          nextSteps: feedback.nextSteps,
        });
      } catch (e) {
        console.error('Failed to generate AI feedback:', e);
        // Only reset if feedback failed — let user go back to setup
        setInterviewStarted(false);
      } finally {
        setIsGeneratingFeedback(false);
      }
    } else {
      // No video blob — no feedback to show, go back to setup
      setInterviewStarted(false);
    }
  }, [disconnect, audioRecorder, sessionStartTime, selectedQuestion, stopRecording]);

  const handleTimeUp = useCallback(() => {
    if (connected) {
      console.log('[Timer] Time is up!');
      setTimeout(() => {
        handleDisconnect();
      }, 8000);
    }
  }, [connected, handleDisconnect]);

  const handleAddTime = useCallback(() => {
    if (connected) {
      setSecondsRemaining((prev) => prev + 5 * 60);
      setDurationInMins((prev) => prev + 5);
      console.log('[Timer] User added 5 minutes');
      client.send([{ text: `[[LOG]] The candidate has added 5 minutes to the interview. The timer on the screen has updated.` }]);
    }
  }, [connected, client]);

  // ── Countdown Timer ──
  useEffect(() => {
    if (!connected || !interviewStarted || secondsRemaining <= 0) return;

    const interval = window.setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [connected, interviewStarted, handleTimeUp]);

  // ── Audio recording ──
  useEffect(() => {
    const onData = (base64: string) => {
      client.sendRealtimeInput([
        { mimeType: 'audio/pcm;rate=16000', data: base64 },
      ]);
    };

    if (connected && isMicActive) {
      audioRecorder.on('data', onData).start();
    } else {
      audioRecorder.stop();
    }

    return () => {
      audioRecorder.off('data', onData);
    };
  }, [connected, client, isMicActive, audioRecorder]);


  // ── Speaking detection ──
  useEffect(() => {
    setIsSpeaking(volume > 0.01);
  }, [volume]);

  // ── Transcription events ──
  useEffect(() => {
    const onInput = (text: string) => {
      setInputTranscription(text);
      if (text.trim()) {
        setConversationLog((prev) => [
          ...prev,
          { role: 'user', text, time: Date.now() },
        ]);
      }
    };
    const onOutput = (text: string) => {
      setOutputTranscription(text);
      if (text.trim()) {
        setConversationLog((prev) => [
          ...prev,
          { role: 'ai', text, time: Date.now() },
        ]);
      }
    };

    client.on('inputtranscription', onInput);
    client.on('outputtranscription', onOutput);

    return () => {
      client.off('inputtranscription', onInput);
      client.off('outputtranscription', onOutput);
    };
  }, [client]);

  // ── Notify AI when question changes (mid-session only, not initial) ──
  const prevQuestionRef = useRef(selectedQuestion.id);
  useEffect(() => {
    if (connected && prevQuestionRef.current !== selectedQuestion.id) {
      client.send([
        {
          text: `[BEHAVIORAL INTERVIEW MODE — QUESTION CHANGED]
The candidate is now practicing: "${selectedQuestion.title}" (${selectedQuestion.category}).

Question: ${selectedQuestion.description}

Possible follow-ups to ask later:
${selectedQuestion.followUps.map((q, i) => `${i + 1}. ${q}`).join('\n')}

You are in BEHAVIORAL INTERVIEW mode. Ask the candidate to answer using the STAR method (Situation, Task, Action, Result). Listen carefully, then ask follow-up questions. Be warm but push for specifics.`,
        },
      ]);
    }
    prevQuestionRef.current = selectedQuestion.id;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedQuestion]);

  const handleToggleMic = useCallback(() => {
    setIsMicActive((prev) => !prev);
  }, []);

  if (!interviewStarted && !connected) {
    return (
      <div className="flex h-screen w-full flex-col bg-[#0f1115] text-white">
        <header className="flex h-14 items-center border-b border-white/10 bg-[#161b22] px-4 shrink-0">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span className="text-xs font-medium">Back</span>
          </button>
          <div className="h-5 w-px bg-white/10 mx-3" />
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-600">
            <MessageSquare size={16} />
          </div>
          <h1 className="text-sm font-bold tracking-tight ml-2">MockInterview.ai</h1>
        </header>
        <PreInterviewSetup
          problemTitle={selectedQuestion.title}
          mode="behavioral"
          accentColor="green-500"
          isConnecting={isConnecting}
          showJobDescription={true}
          onStart={handleStartWithConfig}
        />
      </div>
    );
  }

  return (
    <>
      <div className="flex h-screen w-full flex-col bg-[#0f1115] text-white overflow-hidden">
        {/* Header */}
        <header className="flex h-14 items-center justify-between border-b border-white/10 bg-[#161b22] px-4 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors mr-2 cursor-pointer"
            >
              <ArrowLeft size={16} />
              <span className="text-xs font-medium">Back</span>
            </button>
            <div className="h-5 w-px bg-white/10" />
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-600">
              <MessageSquare size={16} />
            </div>
            <h1 className="text-sm font-bold tracking-tight">
              MockInterview.ai
              <span className="text-green-400 ml-1.5 text-xs font-medium">
                Behavioral
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <select
              className="rounded-lg border border-white/10 bg-[#0d1117] px-3 py-1.5 text-sm text-gray-300 focus:border-green-500 focus:outline-none"
              value={selectedQuestion.id}
              onChange={(e) => {
                const q = behavioralQuestions.find(
                  (qu) => qu.id === e.target.value
                );
                if (q) {
                  setSelectedQuestion(q);
                  navigate(`/behavioral/${q.id}`, { replace: true });
                }
              }}
            >
              {behavioralQuestions.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.title}
                </option>
              ))}
            </select>

            {interviewStarted && (
               <Timer 
                secondsRemaining={secondsRemaining} 
                onAddTime={handleAddTime}
              />
            )}

            <div className="flex items-center gap-2 rounded-full bg-black/20 px-3 py-1.5 border border-white/5">
              <div
                className={`h-2 w-2 rounded-full ${
                  connected
                    ? 'bg-green-500 animate-pulse'
                    : isConnecting
                      ? 'bg-yellow-500 animate-pulse'
                      : 'bg-red-500'
                }`}
              />
              <span className="text-xs font-medium text-gray-400">
                {connected
                  ? 'AI Connected'
                  : isConnecting
                    ? 'Connecting...'
                    : 'AI Disconnected'}
              </span>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex flex-1 overflow-hidden">
          {/* Left: Question Details */}
          <div className="w-2/5 min-w-[350px] max-w-[550px] border-r border-white/10 bg-[#0d1117]">
            <QuestionPane question={selectedQuestion} />
          </div>

          {/* Right: Conversation Space */}
          <div className="flex-1 flex flex-col items-center justify-center bg-[#0a0a0f] relative">
            {!connected ? (
              <PreInterviewSetup
                problemTitle={selectedQuestion.title}
                mode="behavioral"
                accentColor="green-500"
                isConnecting={isConnecting}
                showJobDescription={selectedQuestion.id === 'full-behavioral-mock'}
                onStart={handleStartWithConfig}
              />
            ) : (
              /* Active session — Conversation visualizer */
              <div className="flex flex-col items-center justify-center h-full w-full max-w-lg px-8">
                {/* Large voice visualizer */}
                <motion.div
                  className="relative mb-12"
                  animate={{
                    scale: isSpeaking ? [1, 1.1, 1] : 1,
                  }}
                  transition={{
                    repeat: isSpeaking ? Infinity : 0,
                    duration: 0.8,
                  }}
                >
                  {/* Outer rings */}
                  {isSpeaking && (
                    <>
                      <motion.div
                        className="absolute inset-0 rounded-full bg-green-500/10"
                        animate={{ scale: [1, 1.5], opacity: [0.3, 0] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                        style={{ width: 160, height: 160, top: -20, left: -20 }}
                      />
                      <motion.div
                        className="absolute inset-0 rounded-full bg-green-500/10"
                        animate={{ scale: [1, 1.8], opacity: [0.2, 0] }}
                        transition={{
                          repeat: Infinity,
                          duration: 1.5,
                          delay: 0.3,
                        }}
                        style={{ width: 160, height: 160, top: -20, left: -20 }}
                      />
                    </>
                  )}

                  <div
                    className={`flex h-28 w-28 items-center justify-center rounded-full border-2 ${
                      isSpeaking
                        ? 'border-green-500 bg-green-500/10'
                        : 'border-white/10 bg-white/5'
                    } transition-colors`}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                        Interviewer
                      </span>
                      {isSpeaking ? (
                        <div className="flex gap-1 h-6 items-center">
                          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                            <motion.div
                              key={i}
                              animate={{ height: [4, 20, 4] }}
                              transition={{
                                repeat: Infinity,
                                duration: 0.5,
                                delay: i * 0.08,
                              }}
                              className="w-1 rounded-full bg-green-500"
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="h-6 flex items-center">
                          <span className="text-[10px] text-gray-600">
                            Listening...
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>

                {/* Transcription */}
                <div className="w-full space-y-4">
                  {outputTranscription && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl bg-green-500/5 border border-green-500/10 p-4"
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider text-green-500 block mb-1">
                        Interviewer
                      </span>
                      <p className="text-sm text-gray-300">
                        {outputTranscription}
                      </p>
                    </motion.div>
                  )}
                  {inputTranscription && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl bg-blue-500/5 border border-blue-500/10 p-4"
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500 block mb-1">
                        You
                      </span>
                      <p className="text-sm text-gray-300">
                        {inputTranscription}
                      </p>
                    </motion.div>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Footer Controls */}
        <footer className="h-20 border-t border-white/10 bg-[#161b22] flex items-center justify-center relative z-10 shrink-0">
          <div className="flex items-center justify-center gap-4 rounded-2xl border border-white/10 bg-gray-900/80 p-4 shadow-xl backdrop-blur-md">
            {!connected ? (
               <div className="text-xs text-gray-500 font-medium">
                 Configure your session above to start
               </div>
            ) : (
              <>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleDisconnect}
                  className="flex items-center gap-2 rounded-xl bg-red-500/20 px-6 py-3 font-semibold text-red-400 hover:bg-red-500/30 cursor-pointer"
                >
                  <Square size={20} fill="currentColor" />
                  End Session
                </motion.button>

                <div className="h-8 w-px bg-white/10 mx-2" />

                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleToggleMic}
                  className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors cursor-pointer ${
                    isMicActive
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}
                >
                  {isMicActive ? <Mic size={20} /> : <MicOff size={20} />}
                </motion.button>
                <span className="text-sm font-medium text-gray-400">
                  {isMicActive ? 'Listening...' : 'Mic Muted'}
                </span>
              </>
            )}
          </div>
        </footer>
      </div>

      {/* Generating Feedback Overlay */}
      {isGeneratingFeedback && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-[#161b22] p-10"
          >
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-green-500 border-t-transparent" />
            <p className="text-lg font-bold text-white">Analyzing your responses...</p>
            <p className="text-sm text-gray-400">Gemini is reviewing the full recording</p>
          </motion.div>
        </div>
      )}

      {/* Feedback Report Overlay */}
      {showFeedback && feedbackData && (
        <FeedbackReport
          feedback={feedbackData}
          onClose={() => {
            setShowFeedback(false);
            setFeedbackData(null);
            setInterviewStarted(false);
          }}
        />
      )}
    </>
  );
}

export default function BehavioralPage() {
  return (
    <LiveAPIProvider url={defaultUri} userId={getJudgeId()}>
      <BehavioralSession />
    </LiveAPIProvider>
  );
}
