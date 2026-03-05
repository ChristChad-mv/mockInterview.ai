import { useState, useRef, useCallback } from "react";
import { GoogleGenAI, Modality, Session } from "@google/genai";
import { createPcmBlob, decodeAudioData, base64ToUint8Array } from "../lib/audioUtils";
import { LIVE_AUDIO_MODEL, LIVE_SESSION_CONFIG } from "../lib/gemini";
import type { InterviewAction } from "../types/interview";

// Extend Window for webkit AudioContext
declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

interface UseGeminiLiveProps {
  apiKey: string;
  /** Extra context appended to the system instruction (e.g. problem description) */
  systemContext?: string;
  /** Callback when AI issues function-call actions (annotations, highlights, etc.) */
  onActions?: (actions: InterviewAction[]) => void;
}

export function useGeminiLive({ apiKey, systemContext, onActions }: UseGeminiLiveProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVisionActive, setIsVisionActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const sessionRef = useRef<Session | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextPlayTimeRef = useRef<number>(0);
  const isPlayingRef = useRef(false);
  const visionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMutedRef = useRef(false);
  const onActionsRef = useRef(onActions);
  onActionsRef.current = onActions;

  // ── Connect to Gemini Live ──
  const connect = useCallback(async () => {
    if (!apiKey) {
      setError("API Key is missing");
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey });

      // Dual AudioContext — the genesis pattern:
      // Input at 16kHz (what Gemini expects for mic audio)
      // Output at 24kHz (what Gemini sends back)
      inputAudioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000,
      });
      outputAudioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 24000,
      });

      // Get mic access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // Build config — append problem context if provided
      const config = {
        ...LIVE_SESSION_CONFIG,
        systemInstruction: systemContext
          ? LIVE_SESSION_CONFIG.systemInstruction +
            `\n\n--- CURRENT INTERVIEW CONTEXT ---\n${systemContext}`
          : LIVE_SESSION_CONFIG.systemInstruction,
      };

      // Connect to Gemini Live
      const session = await ai.live.connect({
        model: LIVE_AUDIO_MODEL,
        config,
        callbacks: {
          onopen: () => {
            console.log("[MockInterview] Gemini Live connected");
            setIsConnected(true);
            setIsConnecting(false);
          },
          onmessage: (msg: any) => {
            handleLiveMessage(msg);
          },
          onerror: (err: any) => {
            console.error("[MockInterview] Gemini Live error:", err);
            setError(err.message || "Connection error");
            setIsConnected(false);
            setIsConnecting(false);
          },
          onclose: () => {
            console.log("[MockInterview] Gemini Live closed");
            setIsConnected(false);
            cleanupAll();
          },
        },
      });

      sessionRef.current = session;

      // ── Start sending mic audio ──
      if (inputAudioCtxRef.current && stream) {
        const source = inputAudioCtxRef.current.createMediaStreamSource(stream);
        const processor = inputAudioCtxRef.current.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (e) => {
          if (isMutedRef.current || !sessionRef.current) return;
          const inputData = e.inputBuffer.getChannelData(0);
          const pcmBlob = createPcmBlob(inputData);
          sessionRef.current.sendRealtimeInput({ media: pcmBlob });
        };

        source.connect(processor);
        processor.connect(inputAudioCtxRef.current.destination);
      }

      setIsListening(true);
    } catch (err: any) {
      console.error("[MockInterview] Connection failed:", err);
      setError(err.message || "Failed to connect");
      setIsConnecting(false);
      cleanupAll();
    }
  }, [apiKey, systemContext]);

  // ── Handle incoming Live messages ──
  const handleLiveMessage = useCallback((msg: any) => {
    // Handle server content (audio + text)
    if (msg.serverContent) {
      const parts = msg.serverContent.modelTurn?.parts || [];
      for (const part of parts) {
        // Audio data from model
        if (part.inlineData?.mimeType?.startsWith("audio/")) {
          const audioBytes = base64ToUint8Array(part.inlineData.data);
          playAudioChunk(audioBytes.buffer as ArrayBuffer);
        }
        // Also handle raw base64 audio (older format)
        if (part.inlineData?.data && !part.inlineData?.mimeType) {
          const audioBytes = base64ToUint8Array(part.inlineData.data);
          playAudioChunk(audioBytes.buffer as ArrayBuffer);
        }
      }

      // Handle interruption (user spoke while AI was speaking)
      if (msg.serverContent.interrupted) {
        clearAudioQueue();
      }
    }

    // Handle function calls (the genesis pattern — tool use)
    if (msg.toolCall) {
      const functionCalls = msg.toolCall.functionCalls || [];
      const actions: InterviewAction[] = functionCalls.map((fc: any) => ({
        action: fc.name,
        params: fc.args,
      }));

      if (actions.length > 0) {
        onActionsRef.current?.(actions);

        // Send tool response back to acknowledge
        if (sessionRef.current) {
          const functionResponses = functionCalls.map((fc: any) => ({
            id: fc.id,
            name: fc.name,
            response: { success: true },
          }));
          sessionRef.current.sendToolResponse({ functionResponses });
        }
      }
    }
  }, []);

  // ── Play audio chunk (genesis pattern: proper 24kHz output) ──
  const playAudioChunk = useCallback(async (audioData: ArrayBuffer) => {
    const ctx = outputAudioCtxRef.current;
    if (!ctx) return;

    try {
      setIsSpeaking(true);
      isPlayingRef.current = true;

      const audioBytes = new Uint8Array(audioData);
      const buffer = await decodeAudioData(audioBytes, ctx, 24000, 1);

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);

      // Schedule playback to avoid gaps between chunks
      const currentTime = ctx.currentTime;
      const startTime = Math.max(currentTime, nextPlayTimeRef.current);
      source.start(startTime);
      nextPlayTimeRef.current = startTime + buffer.duration;

      source.onended = () => {
        // Check if more audio is coming — small delay to detect
        setTimeout(() => {
          if (nextPlayTimeRef.current <= (outputAudioCtxRef.current?.currentTime ?? 0) + 0.05) {
            setIsSpeaking(false);
            isPlayingRef.current = false;
          }
        }, 100);
      };
    } catch (err) {
      console.warn("[MockInterview] Audio decode error:", err);
    }
  }, []);

  // ── Clear audio queue on interruption ──
  const clearAudioQueue = useCallback(() => {
    nextPlayTimeRef.current = 0;
    isPlayingRef.current = false;
    setIsSpeaking(false);
  }, []);

  // ── Send text to the session (e.g. code updates) ──
  const sendText = useCallback((text: string) => {
    if (sessionRef.current) {
      try {
        sessionRef.current.sendRealtimeInput({ text });
      } catch (e) {
        console.error("[MockInterview] Error sending text:", e);
      }
    }
  }, []);

  // ── Send a vision frame (code editor screenshot) ──
  const sendVisionFrame = useCallback((base64Image: string, mimeType: string = "image/jpeg") => {
    if (sessionRef.current) {
      try {
        sessionRef.current.sendRealtimeInput({
          media: {
            data: base64Image,
            mimeType,
          },
        });
      } catch (e) {
        console.error("[MockInterview] Error sending vision frame:", e);
      }
    }
  }, []);

  // ── Vision control (periodic editor screenshots — genesis pattern) ──
  const captureCallbackRef = useRef<(() => string | null) | null>(null);

  const startVision = useCallback((captureCallback: () => string | null) => {
    if (visionIntervalRef.current) return; // already running
    captureCallbackRef.current = captureCallback;
    setIsVisionActive(true);
    // Send first frame immediately
    try {
      const dataUrl = captureCallback();
      if (dataUrl && sessionRef.current) {
        const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, "");
        sendVisionFrame(base64, "image/png");
      }
    } catch {}
    // Then every 2 seconds
    visionIntervalRef.current = setInterval(() => {
      if (!sessionRef.current || !captureCallbackRef.current) return;
      try {
        const dataUrl = captureCallbackRef.current();
        if (dataUrl) {
          const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, "");
          sendVisionFrame(base64, "image/png");
        }
      } catch (err) {
        console.warn("[MockInterview] Vision frame error:", err);
      }
    }, 2000);
  }, [sendVisionFrame]);

  const stopVision = useCallback(() => {
    if (visionIntervalRef.current) {
      clearInterval(visionIntervalRef.current);
      visionIntervalRef.current = null;
    }
    captureCallbackRef.current = null;
    setIsVisionActive(false);
  }, []);

  const toggleVision = useCallback(
    (captureCallback: () => string | null) => {
      if (isVisionActive) {
        stopVision();
      } else {
        startVision(captureCallback);
      }
    },
    [isVisionActive, startVision, stopVision]
  );

  // ── Toggle mic ──
  const toggleMic = useCallback(() => {
    setIsMuted((prev) => {
      const newVal = !prev;
      isMutedRef.current = newVal;
      return newVal;
    });
  }, []);

  // ── Cleanup everything ──
  const cleanupAll = useCallback(() => {
    // Stop vision
    if (visionIntervalRef.current) {
      clearInterval(visionIntervalRef.current);
      visionIntervalRef.current = null;
    }
    setIsVisionActive(false);

    // Stop processor
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    // Stop media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }

    // Close audio contexts (genesis pattern: check state before closing)
    if (inputAudioCtxRef.current?.state !== "closed") {
      inputAudioCtxRef.current?.close();
    }
    if (outputAudioCtxRef.current?.state !== "closed") {
      outputAudioCtxRef.current?.close();
    }

    inputAudioCtxRef.current = null;
    outputAudioCtxRef.current = null;
    nextPlayTimeRef.current = 0;
    isPlayingRef.current = false;
    setIsListening(false);
    setIsSpeaking(false);
  }, []);

  // ── Disconnect ──
  const disconnect = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    cleanupAll();
    setIsConnected(false);
  }, [cleanupAll]);

  return {
    // State
    isConnected,
    isConnecting,
    isSpeaking,
    isListening: isListening && !isMuted,
    isMuted,
    isVisionActive,
    error,
    // Actions
    connect,
    disconnect,
    sendText,
    sendVisionFrame,
    startVision,
    stopVision,
    toggleVision,
    toggleMic,
  };
}
