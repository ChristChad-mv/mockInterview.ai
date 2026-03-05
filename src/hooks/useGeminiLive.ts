import { useEffect, useState, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";

interface UseGeminiLiveProps {
  apiKey: string;
  systemInstruction?: string;
}

export function useGeminiLive({ apiKey, systemInstruction }: UseGeminiLiveProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false); // AI is speaking
  const [isListening, setIsListening] = useState(false); // User is speaking (mic active)
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);
  const nextPlayTimeRef = useRef(0);

  const connect = useCallback(async () => {
    if (!apiKey) {
      setError("API Key is missing");
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      
      // Initialize Audio Context
      // Do not force sampleRate, let the browser/OS decide (usually 44.1k or 48k)
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();

      const sessionPromise = ai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-09-2025",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: systemInstruction || "You are a helpful assistant.",
        },
        callbacks: {
          onopen: () => {
            console.log("Gemini Live Connected");
            setIsConnected(true);
            setError(null);
          },
          onmessage: (message: LiveServerMessage) => {
            // Handle Audio Output
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              const audioData = base64ToFloat32Array(base64Audio);
              enqueueAudio(audioData);
            }
            
            // Handle Interruption (User spoke while AI was speaking)
            if (message.serverContent?.interrupted) {
              clearAudioQueue();
            }
          },
          onclose: () => {
            console.log("Gemini Live Disconnected");
            setIsConnected(false);
          },
          onerror: (err) => {
            console.error("Gemini Live Error:", err);
            setError(err.message || "Unknown error");
            setIsConnected(false);
          },
        }
      });

      sessionRef.current = sessionPromise;
      
      // Start Microphone
      await startAudioInput(sessionPromise);

    } catch (err: any) {
      setError(err.message);
      setIsConnected(false);
    }
  }, [apiKey, systemInstruction]);

  const disconnect = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.then((s: any) => {
          if(s.close) s.close();
      }).catch((e: any) => console.error("Error closing session:", e));
      sessionRef.current = null;
    }
    
    // Stop Mic
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    setIsConnected(false);
    setIsListening(false);
    setIsSpeaking(false);
    isPlayingRef.current = false;
    audioQueueRef.current = [];
  }, []);

  const startAudioInput = async (sessionPromise: Promise<any>) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      setIsListening(true);

      const audioContext = audioContextRef.current!;
      const source = audioContext.createMediaStreamSource(stream);
      
      // Use ScriptProcessor for simplicity in this environment
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (isMuted) return; // Don't send audio if muted

        const inputData = e.inputBuffer.getChannelData(0);
        
        // Resample to 16kHz
        const downsampled = downsampleBuffer(inputData, audioContext.sampleRate, 16000);
        const base64Data = float32ArrayToBase64(downsampled);
        
        sessionPromise.then(session => {
            session.sendRealtimeInput({
                media: {
                    mimeType: "audio/pcm;rate=16000",
                    data: base64Data
                }
            }).catch((e: any) => {
                console.error("Error sending audio:", e);
            });
        });
      };

      source.connect(processor);
      // Connect to gain node with 0 gain to keep processor alive
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 0;
      processor.connect(gainNode);
      gainNode.connect(audioContext.destination);

    } catch (err) {
      console.error("Microphone error:", err);
      setError("Microphone access denied");
    }
  };

  const sendScreenFrame = useCallback((base64Image: string) => {
    if (sessionRef.current) {
        sessionRef.current.then((session: any) => {
            session.sendRealtimeInput({
                media: {
                    mimeType: "image/jpeg",
                    data: base64Image
                }
            }).catch((e: any) => console.error("Error sending screen frame:", e));
        });
    }
  }, []);

  const sendText = useCallback((text: string) => {
    if (sessionRef.current) {
        sessionRef.current.then((session: any) => {
            session.sendRealtimeInput({
                text: text
            }).catch((e: any) => console.error("Error sending text:", e));
        });
    }
  }, []);

  // --- Audio Output Helpers ---

  const enqueueAudio = (audioData: Float32Array) => {
    audioQueueRef.current.push(audioData);
    if (!isPlayingRef.current) {
      playNextChunk();
    }
  };

  const playNextChunk = () => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      setIsSpeaking(false);
      return;
    }

    setIsSpeaking(true);
    isPlayingRef.current = true;
    
    const audioData = audioQueueRef.current.shift()!;
    const audioContext = audioContextRef.current!;
    
    const buffer = audioContext.createBuffer(1, audioData.length, 24000); // Gemini output is 24kHz
    buffer.getChannelData(0).set(audioData);
    
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    
    // Schedule playback
    const currentTime = audioContext.currentTime;
    const startTime = Math.max(currentTime, nextPlayTimeRef.current);
    source.start(startTime);
    
    nextPlayTimeRef.current = startTime + buffer.duration;
    
    source.onended = () => {
      playNextChunk();
    };
  };

  const clearAudioQueue = () => {
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    setIsSpeaking(false);
    // Note: We can't easily stop currently playing nodes in this simple implementation 
    // without tracking the active source node. For a prototype, this is acceptable.
    // Ideally, we'd keep track of the current source and call source.stop().
  };

  const toggleMic = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  return {
    connect,
    disconnect,
    isConnected,
    isSpeaking,
    isListening: isListening && !isMuted,
    isMuted,
    toggleMic,
    error,
    sendScreenFrame,
    sendText,
  };
}

// --- Utils ---

function downsampleBuffer(buffer: Float32Array, sampleRate: number, outSampleRate: number) {
  if (outSampleRate === sampleRate) {
    return buffer;
  }
  if (outSampleRate > sampleRate) {
    throw new Error("downsampling rate show be smaller than original sample rate");
  }
  const sampleRateRatio = sampleRate / outSampleRate;
  const newLength = Math.round(buffer.length / sampleRateRatio);
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;
  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
    let accum = 0, count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i];
      count++;
    }
    result[offsetResult] = accum / count;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }
  return result;
}

function float32ArrayToBase64(buffer: Float32Array) {
  // Convert Float32 to Int16 PCM
  const pcmBuffer = new Int16Array(buffer.length);
  for (let i = 0; i < buffer.length; i++) {
    // Clamp to [-1, 1]
    const s = Math.max(-1, Math.min(1, buffer[i]));
    // Scale to 16-bit integer range
    pcmBuffer[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  
  // Convert Int16Array to binary string
  let binary = '';
  const bytes = new Uint8Array(pcmBuffer.buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToFloat32Array(base64: string) {
  const binary = window.atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const pcm16 = new Int16Array(bytes.buffer);
  const float32 = new Float32Array(pcm16.length);
  for (let i = 0; i < pcm16.length; i++) {
    float32[i] = pcm16[i] / 32768.0;
  }
  return float32;
}
