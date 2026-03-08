/**
 * MockInterview.ai — ControlBar.tsx
 */

import { FC } from 'react';
import { Mic, MicOff, Play, Square, Eye, EyeOff, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

interface ControlBarProps {
  isConnected: boolean;
  isConnecting: boolean;
  isMicActive: boolean;
  isVisionActive: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onToggleMic: () => void;
  onToggleVision: () => void;
}

export const ControlBar: FC<ControlBarProps> = ({
  isConnected,
  isConnecting,
  isMicActive,
  isVisionActive,
  onConnect,
  onDisconnect,
  onToggleMic,
  onToggleVision,
}) => {
  return (
    <div className="flex items-center justify-center gap-4 rounded-2xl border border-white/10 bg-gray-900/80 p-4 shadow-xl backdrop-blur-md">
      {!isConnected && !isConnecting ? (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onConnect}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-500 cursor-pointer"
        >
          <Play size={20} fill="currentColor" />
          Start Interview
        </motion.button>
      ) : isConnecting ? (
        <div className="flex items-center gap-2 rounded-xl bg-blue-600/50 px-6 py-3 font-semibold text-white/70 cursor-wait">
          <Loader2 size={20} className="animate-spin" />
          Connecting...
        </div>
      ) : (
        <>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onDisconnect}
            className="flex items-center gap-2 rounded-xl bg-red-500/20 px-6 py-3 font-semibold text-red-400 hover:bg-red-500/30 cursor-pointer"
          >
            <Square size={20} fill="currentColor" />
            End Session
          </motion.button>

          <div className="h-8 w-px bg-white/10 mx-2" />

          {/* Mic toggle */}
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onToggleMic}
              className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors cursor-pointer ${
                isMicActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              }`}
            >
              {isMicActive ? <Mic size={20} /> : <MicOff size={20} />}
            </motion.button>
            <span className="text-sm font-medium text-gray-400">
              {isMicActive ? 'Listening...' : 'Mic Muted'}
            </span>
          </div>

          <div className="h-8 w-px bg-white/10 mx-2" />

          {/* Vision toggle */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onToggleVision}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 font-medium text-sm transition-all cursor-pointer ${
              isVisionActive
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-lg shadow-blue-500/10'
                : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 hover:text-white/70'
            }`}
          >
            {isVisionActive ? <Eye size={16} /> : <EyeOff size={16} />}
            {isVisionActive ? 'Vision ON' : 'Vision'}
          </motion.button>
        </>
      )}
    </div>
  );
};
