/**
 * MockInterview.ai — Timer.tsx
 */

import { Clock, AlertTriangle, Plus } from "lucide-react";
import { motion } from "motion/react";

interface TimerProps {
  secondsRemaining: number;
  onAddTime?: () => void;
}

export function Timer({ secondsRemaining, onAddTime }: TimerProps) {
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  
  const isLowTime = secondsRemaining < 300; // Less than 5 mins

  return (
    <div className="flex items-center gap-2">
      <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all duration-500 ${
        isLowTime 
          ? "bg-red-500/10 border-red-500/30 text-red-400 animate-pulse" 
          : "bg-white/5 border-white/10 text-gray-300"
      }`}>
        {isLowTime ? <AlertTriangle size={16} /> : <Clock size={16} />}
        <span className="font-mono text-sm font-bold tracking-wider">
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </span>
      </div>
      
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={onAddTime}
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
        title="Add 5 minutes"
      >
        <Plus size={18} />
      </motion.button>
    </div>
  );
}
