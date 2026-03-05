/**
 * MockInterview.ai — Main Application
 * Architecture ported from project-genesis:
 * - Dual AudioContext (16kHz input / 24kHz output)
 * - Function calling (AI can annotate code, highlight regions, suggest approaches, rate progress)
 * - Vision toggle (periodic editor snapshots sent to Gemini)
 * - Typed audio utilities
 * - Proper separation of concerns
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CodeEditor, CodeEditorHandle } from './components/CodeEditor';
import { ProblemPane } from './components/ProblemPane';
import { ControlBar } from './components/ControlBar';
import { problems, Problem } from './data/problems';
import { useGeminiLive } from './hooks/useGeminiLive';
import { motion } from 'motion/react';
import { Code2, Mic } from 'lucide-react';
import type { InterviewAction, AIOverlayItem } from './types/interview';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY as string;

export default function App() {
  const [selectedProblem, setSelectedProblem] = useState<Problem>(problems[0]);
  const [code, setCode] = useState<string>(problems[0].starterCode);
  const [overlayItems, setOverlayItems] = useState<AIOverlayItem[]>([]);

  const editorRef = useRef<CodeEditorHandle>(null);

  // ── Handle AI actions (function calls from genesis pattern) ──
  const handleActions = useCallback((actions: InterviewAction[]) => {
    const newItems: AIOverlayItem[] = actions.map((action) => {
      const id = `ai-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      switch (action.action) {
        case 'add_code_comment':
          return {
            type: 'comment' as const,
            data: {
              id,
              line: action.params.line || 1,
              text: action.params.text || '',
              severity: action.params.severity || 'info',
            },
          };
        case 'highlight_code_region':
          return {
            type: 'highlight' as const,
            data: {
              id,
              startLine: action.params.startLine || 1,
              endLine: action.params.endLine || 1,
              color: action.params.color || 'blue',
              label: action.params.label,
            },
          };
        case 'suggest_approach':
          return {
            type: 'suggestion' as const,
            data: {
              id,
              title: action.params.title || 'Hint',
              hint: action.params.hint || '',
              complexity: action.params.complexity,
            },
          };
        case 'rate_progress':
          return {
            type: 'rating' as const,
            data: {
              id,
              category: action.params.category || 'overall',
              score: action.params.score || 3,
              feedback: action.params.feedback || '',
            },
          };
        default:
          return {
            type: 'comment' as const,
            data: { id, line: 1, text: 'Unknown action', severity: 'info' as const },
          };
      }
    });

    setOverlayItems((prev) => [...prev, ...newItems]);

    // Auto-dismiss overlays after 15 seconds
    newItems.forEach((item) => {
      const itemId =
        item.type === 'comment' ? item.data.id :
        item.type === 'highlight' ? item.data.id :
        item.type === 'suggestion' ? item.data.id :
        item.data.id;
      setTimeout(() => {
        setOverlayItems((prev) => prev.filter((i) => {
          const iid = i.type === 'comment' ? i.data.id :
            i.type === 'highlight' ? i.data.id :
            i.type === 'suggestion' ? i.data.id :
            i.data.id;
          return iid !== itemId;
        }));
      }, 15000);
    });
  }, []);

  // ── Dismiss an overlay item ──
  const handleDismissOverlay = useCallback((id: string) => {
    setOverlayItems((prev) => prev.filter((item) => {
      const itemId = item.type === 'comment' ? item.data.id :
        item.type === 'highlight' ? item.data.id :
        item.type === 'suggestion' ? item.data.id :
        item.data.id;
      return itemId !== id;
    }));
  }, []);

  // ── Build system context for the AI ──
  const systemContext = `The candidate is solving: "${selectedProblem.title}" (${selectedProblem.difficulty})

Problem Description:
${selectedProblem.description}

Examples:
${selectedProblem.examples.map((e, i) => `${i + 1}. Input: ${e.input} → Output: ${e.output}${e.explanation ? ` (${e.explanation})` : ''}`).join('\n')}`;

  // ── Gemini Live hook (genesis architecture) ──
  const {
    connect,
    disconnect,
    isConnected,
    isConnecting,
    isSpeaking,
    isListening,
    isVisionActive,
    error,
    sendText,
    startVision,
    stopVision,
    toggleVision,
    toggleMic,
  } = useGeminiLive({
    apiKey: GEMINI_API_KEY,
    systemContext,
    onActions: handleActions,
  });

  // ── Capture callback for vision ──
  const captureEditor = useCallback(() => {
    return editorRef.current?.captureSnapshot() ?? null;
  }, []);

  // ── Auto-start vision when connected, auto-stop when disconnected ──
  // The AI sees the editor screenshot every 2s — no need to send code as text
  useEffect(() => {
    if (isConnected) {
      startVision(captureEditor);
    } else {
      stopVision();
    }
  }, [isConnected, startVision, stopVision, captureEditor]);

  // ── Notify AI when problem changes ──
  useEffect(() => {
    if (isConnected) {
      sendText(
        `[PROBLEM CHANGED] The candidate switched to: "${selectedProblem.title}" (${selectedProblem.difficulty}). Description: ${selectedProblem.description}. Please ask them to explain their approach.`
      );
      // Clear overlays on problem change
      setOverlayItems([]);
    }
  }, [selectedProblem, isConnected, sendText]);

  // ── Vision toggle handler (manual override) ──
  const handleToggleVision = useCallback(() => {
    toggleVision(captureEditor);
  }, [toggleVision, captureEditor]);

  return (
    <div className="flex h-screen w-full flex-col bg-[#0f1115] text-white overflow-hidden">
      {/* Header */}
      <header className="flex h-16 items-center justify-between border-b border-white/10 bg-[#161b22] px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
            <Code2 size={20} />
          </div>
          <h1 className="text-lg font-bold tracking-tight">MockInterview.ai</h1>
        </div>

        <div className="flex items-center gap-4">
          <select
            className="rounded-lg border border-white/10 bg-[#0d1117] px-3 py-1.5 text-sm text-gray-300 focus:border-blue-500 focus:outline-none"
            value={selectedProblem.id}
            onChange={(e) => {
              const p = problems.find((p) => p.id === e.target.value);
              if (p) {
                setSelectedProblem(p);
                setCode(p.starterCode);
              }
            }}
          >
            {problems.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2 rounded-full bg-black/20 px-3 py-1.5 border border-white/5">
            <div
              className={`h-2 w-2 rounded-full ${
                isConnected
                  ? 'bg-green-500 animate-pulse'
                  : isConnecting
                  ? 'bg-yellow-500 animate-pulse'
                  : 'bg-red-500'
              }`}
            />
            <span className="text-xs font-medium text-gray-400">
              {isConnected ? 'AI Connected' : isConnecting ? 'Connecting...' : 'AI Disconnected'}
            </span>
          </div>

          {isVisionActive && (
            <div className="flex items-center gap-2 rounded-full bg-blue-500/10 px-3 py-1.5 border border-blue-500/20">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-xs font-medium text-blue-400">Vision Active</span>
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

        {/* Right: Code Editor with AI Overlays */}
        <div className="flex-1 relative bg-[#1e1e1e]">
          <CodeEditor
            ref={editorRef}
            code={code}
            onChange={(val) => setCode(val || '')}
            language="javascript"
            overlayItems={overlayItems}
            onDismissOverlay={handleDismissOverlay}
          />

          {/* AI Visualizer Overlay */}
          {isConnected && (
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
                          transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.1 }}
                          className="w-1 rounded-full bg-blue-500"
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="h-4 w-20 rounded bg-white/5" />
                  )}
                </div>
              </div>

              <div className="h-8 w-px bg-white/10" />

              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">You</span>
                <div className="flex items-center gap-2">
                  <Mic size={16} className={isListening ? 'text-green-400' : 'text-gray-600'} />
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </main>

      {/* Footer Controls */}
      <footer className="h-20 border-t border-white/10 bg-[#161b22] flex items-center justify-center relative z-10">
        <ControlBar
          isConnected={isConnected}
          isConnecting={isConnecting}
          isListening={isListening}
          isVisionActive={isVisionActive}
          onConnect={connect}
          onDisconnect={disconnect}
          onToggleMic={toggleMic}
          onToggleVision={handleToggleVision}
        />

        {error && (
          <div className="absolute right-6 top-1/2 -translate-y-1/2 text-sm text-red-400 bg-red-900/20 px-3 py-1 rounded-lg border border-red-500/20">
            {error}
          </div>
        )}
      </footer>
    </div>
  );
}
