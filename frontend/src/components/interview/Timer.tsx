/**
 * MockInterview.ai — Timer.tsx
 */

import { useState, useEffect } from "react";
import { Clock, AlertTriangle, Plus } from "lucide-react";
import { motion } from "motion/react";

interface TimerProps {
  initialMinutes: number;
  onTimeUp?: () => void;
  onAddTime?: (newTotalSeconds: number) => void;
  isActive: boolean;
}

export function Timer({ initialMinutes, onTimeUp, onAddTime, isActive }: TimerProps) {
  const [secondsRemaining, setSecondsRemaining] = useState(initialMinutes * 60);

  useEffect(() => {
    let interval: number | null = null;

    if (isActive && secondsRemaining > 0) {
      interval = window.setInterval(() => {
        setSecondsRemaining((prev) => prev - 1);
      }, 1000);
    } else if (secondsRemaining === 0) {
      if (interval) clearInterval(interval);
      onTimeUp?.();
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, secondsRemaining, onTimeUp]);

  const handleAddTime = () => {
    const additionalSeconds = 5 * 60; // Add 5 minutes
    const newTotal = secondsRemaining + additionalSeconds;
    setSecondsRemaining(newTotal);
    onAddTime?.(newTotal);
  };

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
        onClick={handleAddTime}
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
        title="Add 5 minutes"
      >
        <Plus size={18} />
      </motion.button>
    </div>
  );
}
