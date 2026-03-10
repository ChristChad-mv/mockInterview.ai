/**
 * MockInterview.ai — Pre-interview configuration
 * Voice, language, and interview style settings.
 */

// ── Voice Options ──
export interface VoiceOption {
  id: string;
  name: string;
  description: string;
  emoji: string;
}

export const VOICES: VoiceOption[] = [
  { id: 'Puck', name: 'Puck', description: 'Energetic & upbeat', emoji: '⚡' },
  { id: 'Charon', name: 'Charon', description: 'Deep & authoritative', emoji: '🎭' },
  { id: 'Kore', name: 'Kore', description: 'Bright & warm', emoji: '☀️' },
  { id: 'Fenrir', name: 'Fenrir', description: 'Deliberate & direct', emoji: '🐺' },
  { id: 'Aoede', name: 'Aoede', description: 'Melodic & calm', emoji: '🎵' },
];

// ── Language Options ──
export interface LanguageOption {
  id: string;
  label: string;
  flag: string;
}

export const INTERVIEW_LANGUAGES: LanguageOption[] = [
  { id: 'en', label: 'English', flag: '🇬🇧' },
  { id: 'fr', label: 'Français', flag: '🇫🇷' },
  { id: 'es', label: 'Español', flag: '🇪🇸' },
  { id: 'pt', label: 'Português', flag: '🇧🇷' },
  { id: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { id: 'ja', label: '日本語', flag: '🇯🇵' },
  { id: 'ko', label: '한국어', flag: '🇰🇷' },
  { id: 'zh', label: '中文', flag: '🇨🇳' },
  { id: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
  { id: 'ar', label: 'العربية', flag: '🇸🇦' },
];

// ── Interview Style Options ──
export interface StyleOption {
  id: string;
  name: string;
  description: string;
  emoji: string;
  systemPromptHint: string;
}

export const INTERVIEW_STYLES: StyleOption[] = [
  {
    id: 'friendly',
    name: 'Friendly & Supportive',
    description: 'Patient, encouraging — great for beginners',
    emoji: '😊',
    systemPromptHint:
      'Be extra encouraging and patient. Give generous hints when the candidate is stuck. Celebrate small wins.',
  },
  {
    id: 'tough',
    name: 'Tough & Challenging',
    description: 'Pushes hard, expects precision',
    emoji: '💪',
    systemPromptHint:
      'Be rigorous and demanding. Push back on vague answers. Ask hard follow-ups. Expect precise time/space complexity.',
  },
  {
    id: 'faang',
    name: 'FAANG-style',
    description: 'Structured, time-boxed, realistic',
    emoji: '🏢',
    systemPromptHint:
      'Run a realistic FAANG interview. Keep time pressure. Evaluate communication as much as correctness. Ask about trade-offs.',
  },
  {
    id: 'casual',
    name: 'Casual & Relaxed',
    description: 'Startup vibe, conversational',
    emoji: '☕',
    systemPromptHint:
      'Be casual and friendly, like a senior engineer at a startup. Focus on thought process over perfection. Chat naturally.',
  },
];

// ── Duration Options ──
export interface DurationOption {
  id: number;
  label: string;
  description: string;
}

export const DURATION_OPTIONS: DurationOption[] = [
  { id: 15, label: '15 min', description: 'Quick screening' },
  { id: 30, label: '30 min', description: 'Standard interview' },
  { id: 45, label: '45 min', description: 'Deep dive' },
  { id: 60, label: '60 min', description: 'Full session' },
];

// ── Combined Config ──
export interface InterviewConfig {
  voice: string;
  language: string;
  style: string;
  duration: number;
  candidateName?: string;
  resume?: string;
  jobDescription?: string;
  companyName?: string;
  sessionId?: string;
}

const STORAGE_KEY = 'mockinterview-config';

import { getSessionId } from './identity';

export function getDefaultConfig(): InterviewConfig {
  return { 
    voice: 'Puck', 
    language: 'en', 
    style: 'friendly',
    duration: 30,
    candidateName: '',
    sessionId: getSessionId()
  };
}

export function getSavedConfig(): InterviewConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...getDefaultConfig(), ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return getDefaultConfig();
}

export function saveConfig(config: InterviewConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

/**
 * Build the session-config message that gets sent to the AI at the start of
 * an interview session. This tells the AI which language and style to use.
 */
export function buildSessionConfigMessage(config: InterviewConfig): string {
  const lang = INTERVIEW_LANGUAGES.find((l) => l.id === config.language);
  const style = INTERVIEW_STYLES.find((s) => s.id === config.style);

  const parts: string[] = [];

  if (config.candidateName) {
    parts.push(`[CANDIDATE NAME] The candidate's name is "${config.candidateName}". Please greet them personally at the beginning of the interview.`);
  }

  if (config.sessionId) {
    parts.push(`[USER ID] ${config.sessionId}`);
  }

  if (lang && lang.id !== 'en') {
    parts.push(
      `[LANGUAGE] You MUST speak and respond in ${lang.label} for this entire interview session. All your questions, feedback, and comments must be in ${lang.label}.`,
    );
  }

  if (style) {
    parts.push(`[INTERVIEW STYLE] ${style.systemPromptHint}`);
  }

  if (config.duration) {
    parts.push(`[SESSION DURATION] This interview is scheduled for ${config.duration} minutes. You can see the remaining time on the candidate's screen. Use it to pace the interview naturally.`);
  }

  if (config.companyName) {
    parts.push(`[COMPANY: ${config.companyName}] The candidate is targeting a role at ${config.companyName}. Use the \`get_entreprise_culture\` tool to fetch their culture and values, and tailor your questions and feedback accordingly.`);
  }

  return parts.join('\n');
}
