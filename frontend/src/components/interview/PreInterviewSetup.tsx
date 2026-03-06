/**
 * MockInterview.ai — Pre-Interview Setup Panel
 * Shown before connecting. Lets the user pick voice, language, and style.
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  Mic,
  Globe,
  Sparkles,
  Play,
  Loader2,
  ChevronDown,
  Clock,
} from 'lucide-react';
import {
  VOICES,
  INTERVIEW_LANGUAGES,
  INTERVIEW_STYLES,
  DURATION_OPTIONS,
  getSavedConfig,
  saveConfig,
  type InterviewConfig,
} from '../../utils/interview-config';

interface PreInterviewSetupProps {
  /** e.g. "Two Sum", "Design URL Shortener" */
  problemTitle: string;
  /** e.g. "coding", "system-design", "behavioral" */
  mode: string;
  /** Accent colour class (blue-500, purple-500, green-500) */
  accentColor?: string;
  isConnecting: boolean;
  onStart: (config: InterviewConfig) => void;
}

// Tailwind JIT needs literal classes — map accent colors to class strings
const accentMap: Record<string, { border: string; bg: string; text: string; shadow: string; btnBg: string }> = {
  'blue-500': {
    border: 'border-blue-500',
    bg: 'bg-blue-500/10',
    text: 'text-blue-500',
    shadow: 'shadow-blue-500/25',
    btnBg: 'bg-blue-500',
  },
  'purple-500': {
    border: 'border-purple-500',
    bg: 'bg-purple-500/10',
    text: 'text-purple-500',
    shadow: 'shadow-purple-500/25',
    btnBg: 'bg-purple-500',
  },
  'green-500': {
    border: 'border-green-500',
    bg: 'bg-green-500/10',
    text: 'text-green-500',
    shadow: 'shadow-green-500/25',
    btnBg: 'bg-green-500',
  },
};

export function PreInterviewSetup({
  problemTitle,
  mode,
  accentColor = 'blue-500',
  isConnecting,
  onStart,
}: PreInterviewSetupProps) {
  const [config, setConfig] = useState<InterviewConfig>(getSavedConfig);
  const [expandedSection, setExpandedSection] = useState<string | null>('style');
  const a = accentMap[accentColor] || accentMap['blue-500'];

  const handleStart = () => {
    saveConfig(config);
    onStart(config);
  };

  const modeLabel =
    mode === 'coding'
      ? 'Coding Interview'
      : mode === 'system-design'
        ? 'System Design'
        : 'Behavioral';

  const toggle = (section: string) =>
    setExpandedSection((prev) => (prev === section ? null : section));

  return (
    <div className="flex flex-col items-center justify-center h-full px-4 py-10 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-lg flex flex-col gap-6"
      >
        {/* Title */}
        <div className="text-center">
          <p className="text-xs uppercase tracking-widest text-gray-500 mb-2">
            {modeLabel}
          </p>
          <h2 className="text-2xl font-black tracking-tight">{problemTitle}</h2>
          <p className="text-sm text-gray-400 mt-2">
            Configure your interviewer before starting
          </p>
        </div>

        {/* ── Interview Style ── */}
        <Section
          icon={<Sparkles size={16} />}
          title="Interview style"
          isOpen={expandedSection === 'style'}
          onToggle={() => toggle('style')}
          accentText={a.text}
        >
          <div className="grid grid-cols-2 gap-2">
            {INTERVIEW_STYLES.map((s) => (
              <button
                key={s.id}
                onClick={() => setConfig((c) => ({ ...c, style: s.id }))}
                className={`flex flex-col items-start gap-1 rounded-xl border px-3 py-3 text-left transition-all cursor-pointer ${
                  config.style === s.id
                    ? `${a.border} ${a.bg} text-white`
                    : 'border-white/10 bg-white/[0.03] text-gray-400 hover:bg-white/[0.06]'
                }`}
              >
                <span className="text-lg">{s.emoji}</span>
                <span className="text-xs font-bold">{s.name}</span>
                <span className="text-[10px] text-gray-500 leading-tight">
                  {s.description}
                </span>
              </button>
            ))}
          </div>
        </Section>

        {/* ── Language ── */}
        <Section
          icon={<Globe size={16} />}
          title="Interview language"
          isOpen={expandedSection === 'language'}
          onToggle={() => toggle('language')}
          accentText={a.text}
        >
          <div className="grid grid-cols-2 gap-2">
            {INTERVIEW_LANGUAGES.map((l) => (
              <button
                key={l.id}
                onClick={() => setConfig((c) => ({ ...c, language: l.id }))}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all cursor-pointer ${
                  config.language === l.id
                    ? `${a.border} ${a.bg} text-white`
                    : 'border-white/10 bg-white/[0.03] text-gray-400 hover:bg-white/[0.06]'
                }`}
              >
                <span>{l.flag}</span>
                <span className="text-xs font-medium">{l.label}</span>
              </button>
            ))}
          </div>
        </Section>

        <Section
          icon={<Clock size={16} />}
          title="Interview duration"
          isOpen={expandedSection === 'duration'}
          onToggle={() => toggle('duration')}
          accentText={a.text}
        >
          <div className="grid grid-cols-2 gap-2">
            {DURATION_OPTIONS.map((d) => (
              <button
                key={d.id}
                onClick={() => setConfig((c) => ({ ...c, duration: d.id }))}
                className={`flex flex-col items-start gap-1 rounded-xl border px-3 py-2 text-left transition-all cursor-pointer ${
                  config.duration === d.id
                    ? `${a.border} ${a.bg} text-white`
                    : 'border-white/10 bg-white/[0.03] text-gray-400 hover:bg-white/[0.06]'
                }`}
              >
                <span className="text-xs font-bold">{d.label}</span>
                <span className="text-[10px] text-gray-500 leading-tight">
                  {d.description}
                </span>
              </button>
            ))}
          </div>
        </Section>

        {/* ── Voice ── */}
        <Section
          icon={<Mic size={16} />}
          title="Interviewer voice"
          isOpen={expandedSection === 'voice'}
          onToggle={() => toggle('voice')}
          accentText={a.text}
        >
          <div className="flex flex-wrap gap-2">
            {VOICES.map((v) => (
              <button
                key={v.id}
                onClick={() => setConfig((c) => ({ ...c, voice: v.id }))}
                className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-all cursor-pointer ${
                  config.voice === v.id
                    ? `${a.border} ${a.bg} text-white`
                    : 'border-white/10 bg-white/[0.03] text-gray-400 hover:bg-white/[0.06]'
                }`}
              >
                <span>{v.emoji}</span>
                <span className="text-xs font-bold">{v.name}</span>
                <span className="text-[10px] text-gray-500 hidden sm:inline">
                  {v.description}
                </span>
              </button>
            ))}
          </div>
        </Section>

        {/* ── Start Button ── */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleStart}
          disabled={isConnecting}
          className={`mt-2 flex items-center justify-center gap-3 rounded-2xl ${a.btnBg} px-8 py-4 text-lg font-black text-white shadow-lg ${a.shadow} transition-opacity disabled:opacity-50 cursor-pointer`}
        >
          {isConnecting ? (
            <>
              <Loader2 size={22} className="animate-spin" />
              Connecting…
            </>
          ) : (
            <>
              <Play size={22} fill="currentColor" />
              Start Interview
            </>
          )}
        </motion.button>

        <p className="text-center text-[10px] text-gray-600">
          You'll be asked to share your screen first — the AI interviewer needs
          to see your work. Recording also powers post-interview feedback.
        </p>
      </motion.div>
    </div>
  );
}

/* ── Collapsible section ── */
function Section({
  icon,
  title,
  isOpen,
  onToggle,
  accentText,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  accentText: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
      <button
        onClick={onToggle}
        className={`flex w-full items-center justify-between px-4 py-3 text-sm font-semibold transition-colors cursor-pointer ${
          isOpen ? 'text-white' : 'text-gray-400 hover:text-white'
        }`}
      >
        <span className="flex items-center gap-2">
          <span className={isOpen ? accentText : ''}>{icon}</span>
          {title}
        </span>
        <ChevronDown
          size={16}
          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="px-4 pb-4"
        >
          {children}
        </motion.div>
      )}
    </div>
  );
}
