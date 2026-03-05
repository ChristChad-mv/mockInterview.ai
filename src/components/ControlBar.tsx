import React from 'react';
import { Mic, MicOff, Play, Square, Video, VideoOff } from 'lucide-react';
import { motion } from 'motion/react';

interface ControlBarProps {
  isConnected: boolean;
  isListening: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onToggleMic: () => void; // Not implemented in hook yet, but good for UI
}

export const ControlBar: React.FC<ControlBarProps> = ({
  isConnected,
  isListening,
  onConnect,
  onDisconnect,
  onToggleMic,
}) => {
  return (
    <div className="flex items-center justify-center gap-4 rounded-2xl border border-white/10 bg-gray-900/80 p-4 shadow-xl backdrop-blur-md">
      {!isConnected ? (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onConnect}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-500"
        >
          <Play size={20} fill="currentColor" />
          Start Interview
        </motion.button>
      ) : (
        <>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onDisconnect}
            className="flex items-center gap-2 rounded-xl bg-red-500/20 px-6 py-3 font-semibold text-red-400 hover:bg-red-500/30"
          >
            <Square size={20} fill="currentColor" />
            End Session
          </motion.button>

          <div className="h-8 w-px bg-white/10 mx-2" />

          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onToggleMic}
              className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
                isListening ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              }`}
            >
              {isListening ? <Mic size={20} /> : <MicOff size={20} />}
            </motion.button>
            <span className="text-sm font-medium text-gray-400">
              {isListening ? 'Listening...' : 'Mic Muted'}
            </span>
          </div>
        </>
      )}
    </div>
  );
};
