/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { CodeEditor } from './components/CodeEditor';
import { ProblemPane } from './components/ProblemPane';
import { ControlBar } from './components/ControlBar';
import { problems, Problem } from './data/problems';
import { useGeminiLive } from './hooks/useGeminiLive';
import { motion } from 'motion/react';
import { Terminal, Code2, Monitor, Mic, Volume2 } from 'lucide-react';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY as string;

export default function App() {
  const [selectedProblem, setSelectedProblem] = useState<Problem>(problems[0]);
  const [code, setCode] = useState<string>(problems[0].starterCode);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
    const [isScreenShareAvailable, setIsScreenShareAvailable] = useState(true);
  const lastCodeSentRef = useRef<string>('');

  const { 
    connect, 
    disconnect, 
    isConnected, 
    isSpeaking, 
    isListening, 
    error, 
    sendScreenFrame,
    sendText,
    toggleMic
  } = useGeminiLive({
    apiKey: GEMINI_API_KEY,
    systemInstruction: `You are an expert technical interviewer at a top tech company. 
    The candidate is solving the "${selectedProblem.title}" problem. 
    
    Problem Description:
    ${selectedProblem.description}
    
    Your goal is to assess their problem-solving skills, code quality, and communication.
    1. Start by asking them to explain their approach before they start coding.
    2. If they are silent for a while, ask them to think out loud.
    3. If they make a mistake, ask guiding questions to help them catch it (e.g., "What happens if the input is empty?").
    4. Do NOT write the code for them.
    5. Be professional, encouraging, but rigorous.
    
    You have access to the user's code via text updates. You might also see their screen if available.
    If you see code updates, comment on them.
    `
  });

  // Sync code to AI periodically
  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(() => {
      if (code !== lastCodeSentRef.current) {
        sendText(`Current Code:\n\`\`\`javascript\n${code}\n\`\`\``);
        lastCodeSentRef.current = code;
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isConnected, code, sendText]);

  // Notify AI when problem changes
  useEffect(() => {
    if (isConnected) {
      sendText(`The user has switched to a new problem: "${selectedProblem.title}". Description: ${selectedProblem.description}. Please ask them to explain their approach for this new problem.`);
    }
  }, [selectedProblem, isConnected, sendText]);

  // Handle screen sharing
  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ 
        video: { 
          width: { max: 1280 },
          height: { max: 720 },
          frameRate: { max: 10 }
        },
        audio: false 
      });
      
      screenStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsScreenSharing(true);
      setIsScreenShareAvailable(true);
      
      // Start frame loop
      const track = stream.getVideoTracks()[0];
      // const imageCapture = new ImageCapture(track); // Removed to support more browsers
      
      const sendFrame = () => {
        if (!screenStreamRef.current || !isConnected) return;
        
        const canvas = canvasRef.current;
        const video = videoRef.current;
        
        if (canvas && video && video.readyState === video.HAVE_ENOUGH_DATA) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const base64 = canvas.toDataURL('image/jpeg', 0.5).split(',')[1];
            sendScreenFrame(base64);
          }
        }
        
        if (screenStreamRef.current.active) {
          setTimeout(sendFrame, 1000); // 1 FPS is enough for code
        }
      };
      
      sendFrame();
      
      track.onended = () => {
        stopScreenShare();
      };
      
    } catch (err: any) {
      console.error("Error sharing screen:", err);
      setIsScreenSharing(false);
      if (err.name === 'NotAllowedError' || err.message.includes('permissions policy')) {
        setIsScreenShareAvailable(false);
        // Don't throw, just proceed without screen share
      }
    }
  };

  const stopScreenShare = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }
    setIsScreenSharing(false);
  };

  // Auto-start screen share when connected (optional, or manual)
  useEffect(() => {
    if (isConnected && !isScreenSharing) {
      // We can't auto-start screen share without user gesture usually, 
      // but we can prompt or wait for user.
      // For now, let's make it manual or part of the "Start Interview" flow if possible.
      // Actually, better to have a separate button or integrate it into the start flow.
    }
    if (!isConnected && isScreenSharing) {
      stopScreenShare();
    }
  }, [isConnected]);

  const handleStartInterview = async () => {
    await startScreenShare(); // Request screen share first
    await connect();
  };

  const handleEndInterview = () => {
    disconnect();
    stopScreenShare();
  };

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
              const p = problems.find(p => p.id === e.target.value);
              if (p) {
                setSelectedProblem(p);
                setCode(p.starterCode);
              }
            }}
          >
            {problems.map(p => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
          
          <div className="flex items-center gap-2 rounded-full bg-black/20 px-3 py-1.5 border border-white/5">
            <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-xs font-medium text-gray-400">
              {isConnected ? 'AI Connected' : 'AI Disconnected'}
            </span>
          </div>
          
          {!isScreenShareAvailable && isConnected && (
            <div className="flex items-center gap-2 rounded-full bg-yellow-500/10 px-3 py-1.5 border border-yellow-500/20">
              <Monitor size={14} className="text-yellow-500" />
              <span className="text-xs font-medium text-yellow-500">
                Screen Share Unavailable
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
            code={code} 
            onChange={(val) => setCode(val || '')} 
            language="javascript"
          />
          
          {/* AI Visualizer Overlay */}
          {isConnected && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute bottom-6 right-6 flex items-center gap-4 rounded-2xl border border-white/10 bg-black/80 p-4 shadow-2xl backdrop-blur-md"
            >
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Interviewer</span>
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
                  <Mic size={16} className={isListening ? "text-green-400" : "text-gray-600"} />
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
          isListening={isListening}
          onConnect={handleStartInterview}
          onDisconnect={handleEndInterview}
          onToggleMic={toggleMic} 
        />
        
        {error && (
          <div className="absolute right-6 top-1/2 -translate-y-1/2 text-sm text-red-400 bg-red-900/20 px-3 py-1 rounded-lg border border-red-500/20">
            {error}
          </div>
        )}
      </footer>

      {/* Hidden Video/Canvas for Screen Capture */}
      <video ref={videoRef} className="hidden" autoPlay playsInline muted />
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
