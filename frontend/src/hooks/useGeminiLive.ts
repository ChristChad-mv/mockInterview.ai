import { useState, useRef, useCallback } from "react";
import { createPcmBlob, decodeAudioData } from "../lib/audioUtils";
import type { InterviewAction } from "../types/interview";

// Extend Window for webkit AudioContext
declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

// ── Backend WebSocket URL ──
const WS_BASE_URL = (import.meta as any).env?.VITE_WS_URL || "ws://localhost:8000";

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
  const wsRef = useRef<WebSocket | null>(null);
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

  // ── Handle incoming ADK events from the backend WebSocket ──
  // NOTE: Audio is handled separately as binary WebSocket frames (see ws.onmessage).
  // This function only handles JSON events: transcriptions, interruptions, function calls.
  const handleADKEvent = useCallback((eventData: any) => {
    // DEBUG: log event structure
    console.log("[ADK Event]", Object.keys(eventData), JSON.stringify(eventData).slice(0, 200));

    // 1. Interruption
    if (eventData?.serverContent?.interrupted) {
      clearAudioQueue();
    }

    // 3. Function calls (tool use)
    const functionCalls = eventData?.toolCall?.functionCalls
      || eventData?.actions?.functionCalls
      || [];

    if (functionCalls.length > 0) {
      const actions: InterviewAction[] = functionCalls.map((fc: any) => ({
        action: fc.name,
        params: fc.args,
      }));
      onActionsRef.current?.(actions);
    }

    // 4. Transcriptions (for logging/debug)
    if (eventData?.inputTranscription?.text) {
      console.log("[User]", eventData.inputTranscription.text);
    }
    if (eventData?.outputTranscription?.text) {
      console.log("[AI]", eventData.outputTranscription.text);
    }
  }, [clearAudioQueue]);

  // ── Cleanup everything ──
  const cleanupAll = useCallback(() => {
    if (visionIntervalRef.current) {
      clearInterval(visionIntervalRef.current);
      visionIntervalRef.current = null;
    }
    setIsVisionActive(false);

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }

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

  // ── Connect to the backend WebSocket ──
  const connect = useCallback(async () => {
    if (!apiKey) {
      setError("API Key is missing");
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // Dual AudioContext — the genesis pattern
      inputAudioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000,
      });
      outputAudioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 24000,
      });

      // Get mic access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // Generate unique user/session IDs
      const userId = `user-${Date.now()}`;
      const sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      // Connect to the backend WebSocket
      const wsUrl = `${WS_BASE_URL}/ws/${userId}/${sessionId}?proactivity=true&affective_dialog=true`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.binaryType = "arraybuffer";

      ws.onopen = () => {
        console.log("[MockInterview] Backend WebSocket connected");
        setIsConnected(true);
        setIsConnecting(false);

        // Send the system context so the AI knows the problem
        if (systemContext) {
          ws.send(JSON.stringify({
            type: "text",
            text: `[INTERVIEW CONTEXT]\n${systemContext}\n\nPlease greet the candidate and ask them to explain their approach.`,
          }));
        }
      };

      ws.onmessage = (event) => {
        // Binary frames = raw PCM audio from the model
        if (event.data instanceof ArrayBuffer) {
          playAudioChunk(event.data);
          return;
        }
        // Text frames = JSON (transcriptions, interruptions, function calls)
        try {
          const eventData = JSON.parse(event.data);
          handleADKEvent(eventData);
        } catch (err) {
          console.warn("[MockInterview] Failed to parse event:", err);
        }
      };

      ws.onerror = () => {
        console.error("[MockInterview] WebSocket error");
        setError("Connection error — is the backend running?");
        setIsConnected(false);
        setIsConnecting(false);
      };

      ws.onclose = () => {
        console.log("[MockInterview] WebSocket closed");
        setIsConnected(false);
        cleanupAll();
      };

      // ── Start sending mic audio as binary PCM frames ──
      if (inputAudioCtxRef.current && stream) {
        const source = inputAudioCtxRef.current.createMediaStreamSource(stream);
        const processor = inputAudioCtxRef.current.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (e) => {
          if (isMutedRef.current || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
          const inputData = e.inputBuffer.getChannelData(0);
          const pcmBlob = createPcmBlob(inputData);
          if (!pcmBlob.data) return;
          // Convert base64 PCM to raw bytes and send as binary frame
          const binaryStr = atob(pcmBlob.data);
          const bytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }
          wsRef.current.send(bytes.buffer);
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
  }, [apiKey, systemContext, handleADKEvent, cleanupAll]);

  // ── Send text to the backend ──
  const sendText = useCallback((text: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "text", text }));
    }
  }, []);

  // ── Send a vision frame (code editor screenshot) ──
  const sendVisionFrame = useCallback((base64Image: string, mimeType: string = "image/png") => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "image",
        data: base64Image,
        mimeType,
      }));
    }
  }, []);

  // ── Vision control (periodic editor screenshots — genesis pattern) ──
  const captureCallbackRef = useRef<(() => string | null) | null>(null);

  const startVision = useCallback((captureCallback: () => string | null) => {
    if (visionIntervalRef.current) return;
    captureCallbackRef.current = captureCallback;
    setIsVisionActive(true);
    try {
      const dataUrl = captureCallback();
      if (dataUrl && wsRef.current?.readyState === WebSocket.OPEN) {
        const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, "");
        sendVisionFrame(base64, "image/png");
      }
    } catch {}
    visionIntervalRef.current = setInterval(() => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !captureCallbackRef.current) return;
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

  // ── Disconnect ──
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    cleanupAll();
    setIsConnected(false);
  }, [cleanupAll]);

  return {
    isConnected,
    isConnecting,
    isSpeaking,
    isListening: isListening && !isMuted,
    isMuted,
    isVisionActive,
    error,
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
