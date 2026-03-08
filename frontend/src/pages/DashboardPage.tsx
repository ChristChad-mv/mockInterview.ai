/**
 * MockInterview.ai — Dashboard Page
 *
 * The user's home base: stats overview, progress tracking,
 * problem selection with completion status, and recent sessions.
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Code2,
  Terminal,
  Brain,
  MessageSquare,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Trophy,
  Flame,
  Target,
  BarChart3,
  Clock,
  Play,
  Minus,
  User,
  Save,
  FileText,
  Upload,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { problems } from '../data/problems';
import { systemDesignProblems } from '../data/systemDesignProblems';
import { behavioralQuestions } from '../data/behavioralQuestions';
import { getHistory, getStats, getBestScore, type InterviewRecord } from '../utils/interview-history';
import { getSavedConfig, saveConfig, type InterviewConfig } from '../utils/interview-config';
import { FeedbackReport, type FeedbackData } from '../components/feedback/FeedbackReport';

/* ── Mode config ── */
const MODES = [
  { id: 'all', label: 'All', icon: BarChart3, color: 'white' },
  { id: 'coding', label: 'Coding', icon: Terminal, color: 'blue' },
  { id: 'system-design', label: 'System Design', icon: Brain, color: 'purple' },
  { id: 'behavioral', label: 'Behavioral', icon: MessageSquare, color: 'green' },
] as const;

type ModeFilter = (typeof MODES)[number]['id'];

/* ── Stat Card ── */
function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = 'blue',
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500/10 text-blue-400',
    green: 'bg-green-500/10 text-green-400',
    yellow: 'bg-yellow-500/10 text-yellow-400',
    purple: 'bg-purple-500/10 text-purple-400',
    orange: 'bg-orange-500/10 text-orange-400',
  };
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${colorMap[color]}`}>
          <Icon size={18} />
        </div>
        <span className="text-xs uppercase tracking-wider text-gray-500">{label}</span>
      </div>
      <p className="text-3xl font-black">{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-500">{sub}</p>}
    </div>
  );
}

/* ── Score Ring (small) ── */
function MiniScoreRing({ score, size = 36 }: { score: number; size?: number }) {
  const r = (size - 4) / 2;
  const circ = 2 * Math.PI * r;
  const pct = score / 10;
  const color =
    score >= 8 ? '#22c55e' : score >= 6 ? '#eab308' : score >= 4 ? '#f97316' : '#ef4444';
  return (
    <svg width={size} height={size} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={3} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
        strokeDasharray={`${pct * circ} ${circ}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central" fill="white" fontSize={11} fontWeight="bold">
        {score}
      </text>
    </svg>
  );
}

/* ── Problem Card with progress ── */
function ProblemCard({
  id,
  title,
  difficulty,
  description,
  mode,
  category,
}: {
  id: string;
  title: string;
  difficulty?: string;
  description: string;
  mode: string;
  category?: string;
}) {
  const navigate = useNavigate();
  const bestScore = getBestScore(id);
  const attempts = getHistory().filter((r) => r.problemId === id).length;

  const diffColor =
    difficulty === 'Easy'
      ? 'bg-green-500/15 text-green-400'
      : difficulty === 'Medium'
        ? 'bg-yellow-500/15 text-yellow-400'
        : difficulty === 'Hard'
          ? 'bg-red-500/15 text-red-400'
          : 'bg-purple-500/15 text-purple-400';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => navigate(`/${mode}/${id}`)}
      className="group relative flex items-center gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-4 hover:bg-white/[0.05] hover:border-blue-500/20 transition-all cursor-pointer"
    >
      {/* Score or empty state */}
      <div className="shrink-0">
        {bestScore !== null ? (
          <MiniScoreRing score={bestScore} />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-dashed border-white/10">
            <Play size={14} className="text-gray-600" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-sm group-hover:text-blue-400 transition-colors truncate">
            {title}
          </h3>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${diffColor}`}>
            {difficulty || category || ''}
          </span>
        </div>
        <p className="text-xs text-gray-500 truncate mt-0.5">{description}</p>
      </div>

      {/* Attempts badge */}
      <div className="shrink-0 text-right">
        {attempts > 0 ? (
          <div className="flex items-center gap-1 text-[10px] text-gray-500">
            <CheckCircle2 size={10} className="text-green-500" />
            {attempts}×
          </div>
        ) : (
          <span className="text-[10px] text-gray-600">New</span>
        )}
      </div>

      <ArrowRight size={14} className="shrink-0 text-gray-700 group-hover:text-blue-400 transition-colors" />
    </motion.div>
  );
}

/* ── Main Dashboard ── */
export default function DashboardPage() {
  const navigate = useNavigate();
  const [modeFilter, setModeFilter] = useState<ModeFilter>('all');
  const stats = useMemo(() => getStats(), []);
  const history = useMemo(() => getHistory(), []);
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackData | null>(null);
  
  const [config, setConfig] = useState<InterviewConfig>(getSavedConfig());
  const [displayName, setDisplayName] = useState(getSavedConfig().candidateName || '');
  const [inputName, setInputName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Resume state
  const [resumeStatus, setResumeStatus] = useState<'empty' | 'uploading' | 'ready' | 'error'>('empty');
  const [resumeName, setResumeName] = useState<string | null>(null);

  const handleSaveName = () => {
    if (!inputName.trim()) return;
    setIsSaving(true);
    const updatedConfig = { ...getSavedConfig(), candidateName: inputName.trim() };
    saveConfig(updatedConfig);
    setDisplayName(inputName.trim());
    setInputName('');
    setTimeout(() => setIsSaving(false), 800);
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setResumeStatus('uploading');
    setResumeName(file.name);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('judge_id', config.judgeId || '');

    try {
      // Security: Get passcode from storage (no hardcoded fallback)
      const passcode = sessionStorage.getItem('mockinterview-passcode') || localStorage.getItem('access_passcode');
      
      if (!passcode) {
        throw new Error('No access passcode found. Please log in again.');
      }

      const response = await fetch('/api/resume/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'X-Passcode': passcode,
        },
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || 'Upload and indexing failed');
      }
      
      // If we are here, indexing is complete (synchronous backend)
      setResumeStatus('ready');
      const updated = { ...config, resume: file.name };
      saveConfig(updated);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Upload failed');
      setResumeStatus('error');
    }
  };


  // On mount, check if there's already a resume in config
  useEffect(() => {
    if (config.resume) {
      setResumeStatus('ready');
      setResumeName(config.resume);
    }
  }, []);

  // Build the unified problem list
  const allProblems = useMemo(() => {
    const list: {
      id: string;
      title: string;
      difficulty?: string;
      description: string;
      mode: string;
      category?: string;
    }[] = [];
    problems.forEach((p) =>
      list.push({ id: p.id, title: p.title, difficulty: p.difficulty, description: p.description, mode: 'coding' }),
    );
    systemDesignProblems.forEach((p) =>
      list.push({ id: p.id, title: p.title, difficulty: p.difficulty, description: p.description, mode: 'system-design', category: p.category }),
    );
    behavioralQuestions.forEach((p) =>
      list.push({ id: p.id, title: p.title, description: p.description, mode: 'behavioral', category: p.category }),
    );
    return list;
  }, []);

  const filteredProblems =
    modeFilter === 'all' ? allProblems : allProblems.filter((p) => p.mode === modeFilter);

  const trendIcon =
    stats && stats.trend > 0 ? TrendingUp : stats && stats.trend < 0 ? TrendingDown : Minus;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-white/5">
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => navigate('/')}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-500/20">
            <Code2 size={20} />
          </div>
          <span className="text-xl font-bold tracking-tight">
            MockInterview<span className="text-blue-400">.ai</span>
          </span>
        </div>
        <button
          onClick={() => navigate('/')}
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          Landing Page
        </button>
      </nav>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-10">
        {/* Header & Profiling */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl font-black tracking-tight">
              {(inputName || displayName) ? `Welcome back, ${inputName || displayName}` : 'Your Dashboard'}
            </h1>
            <p className="mt-2 text-gray-400">
              Track your progress, revisit problems, and keep improving.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            {/* Profile Name Input */}
            <div className="flex items-center gap-2 rounded-2xl border border-white/5 bg-white/[0.02] p-2 pl-4 w-full sm:w-auto">
              <User size={16} className="text-gray-500" />
              <input 
                type="text"
                placeholder="Update your name"
                className="bg-transparent border-none focus:outline-none text-sm text-white w-32 md:w-40 placeholder:text-gray-600"
                value={inputName}
                onChange={(e) => setInputName(e.target.value)}
              />
              <button
                onClick={handleSaveName}
                disabled={isSaving || !inputName.trim()}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold hover:bg-blue-500 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? 'Saved!' : (
                  <>
                    <Save size={14} />
                    Save
                  </>
                )}
              </button>
            </div>

            {/* Resume Upload */}
            <div className="relative group flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.02] p-2 pl-4 pr-3 w-full sm:w-auto overflow-hidden">
               <div className="flex items-center gap-2 text-sm">
                  <FileText size={16} className={resumeStatus === 'ready' ? 'text-green-500' : 'text-gray-500'} />
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-gray-600 leading-none mb-1">Resume (CV)</span>
                    <span className="text-xs font-semibold truncate max-w-[120px]">
                      {resumeStatus === 'empty' ? 'Not uploaded' : resumeName}
                    </span>
                  </div>
               </div>

               <label className="flex items-center justify-center h-9 w-9 rounded-xl bg-white/[0.05] hover:bg-white/10 transition-colors cursor-pointer">
                  <input type="file" className="hidden" accept=".pdf,.doc,.docx,.txt" onChange={handleResumeUpload} />
                  {resumeStatus === 'uploading' ? (
                    <Loader2 size={16} className="animate-spin text-blue-500" />
                  ) : resumeStatus === 'ready' ? (
                    <CheckCircle2 size={16} className="text-green-500" />
                  ) : (
                    <Upload size={16} className="text-gray-400 group-hover:text-white" />
                  )}
               </label>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          <StatCard
            icon={Target}
            label="Interviews"
            value={stats?.total ?? 0}
            sub={`${stats?.uniqueProblems ?? 0} unique problems`}
            color="blue"
          />
          <StatCard
            icon={Trophy}
            label="Avg Score"
            value={stats?.avgScore ?? '—'}
            sub={
              stats && stats.trend !== 0
                ? `${stats.trend > 0 ? '+' : ''}${stats.trend.toFixed(1)} trend`
                : 'Complete an interview to start'
            }
            color={stats && stats.avgScore >= 7 ? 'green' : 'yellow'}
          />
          <StatCard
            icon={Flame}
            label="Streak"
            value={stats?.streak ?? 0}
            sub="consecutive days"
            color="orange"
          />
          <StatCard
            icon={trendIcon}
            label="Trend"
            value={
              stats
                ? stats.trend > 0
                  ? '↑ Improving'
                  : stats.trend < 0
                    ? '↓ Declining'
                    : '→ Steady'
                : '—'
            }
            sub="Last 5 vs previous 5"
            color={stats && stats.trend > 0 ? 'green' : stats && stats.trend < 0 ? 'orange' : 'purple'}
          />
        </div>

        {/* Recent Sessions */}
        {history.length > 0 && (
          <div className="mb-10">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Clock size={18} className="text-gray-500" />
              Recent Sessions
            </h2>
            <div className="space-y-2">
              {history.slice(0, 5).map((record) => (
                <div
                  key={record.id}
                  onClick={() => {
                    setSelectedFeedback({
                      overallScore: record.overallScore,
                      duration: record.duration,
                      mode: record.mode,
                      problemTitle: record.problemTitle,
                      categories: record.categories.map(c => ({ name: c.name, score: c.score, comment: c.comment || '' })),
                      strengths: record.strengths ?? [],
                      improvements: record.improvements ?? [],
                      nextSteps: record.nextSteps ?? [],
                    });
                  }}
                  className="flex items-center gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-3 hover:bg-white/[0.04] transition-all cursor-pointer"
                >
                  <MiniScoreRing score={record.overallScore} size={32} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{record.problemTitle}</p>
                    <p className="text-[10px] text-gray-500">
                      {record.mode} · {record.duration} ·{' '}
                      {new Date(record.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {record.categories.slice(0, 3).map((cat) => (
                      <span
                        key={cat.name}
                        className="hidden sm:inline rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-gray-400"
                      >
                        {cat.name.split(' ')[0]} {cat.score}/10
                      </span>
                    ))}
                  </div>
                  <ArrowRight size={14} className="shrink-0 text-gray-600" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Problem Selection */}
        <div>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <BarChart3 size={18} className="text-gray-500" />
            All Problems
          </h2>

          {/* Mode filter tabs */}
          <div className="flex gap-2 mb-6">
            {MODES.map((mode) => {
              const modeColor: Record<string, string> = {
                all: 'bg-white/10 text-white',
                coding: 'bg-blue-500/15 text-blue-400',
                'system-design': 'bg-purple-500/15 text-purple-400',
                behavioral: 'bg-green-500/15 text-green-400',
              };
              return (
                <button
                  key={mode.id}
                  onClick={() => setModeFilter(mode.id)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    modeFilter === mode.id
                      ? modeColor[mode.id]
                      : 'bg-white/[0.03] text-gray-500 hover:text-gray-300'
                  }`}
                >
                  <mode.icon size={14} />
                  {mode.label}
                  <span className="text-[10px] opacity-60">
                    {mode.id === 'all'
                      ? allProblems.length
                      : allProblems.filter((p) => p.mode === mode.id).length}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Problem list */}
          <div className="space-y-2">
            {filteredProblems.map((p, i) => (
              <ProblemCard key={p.id} {...p} />
            ))}
          </div>
        </div>

        {/* Empty state */}
        {history.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-10 flex flex-col items-center text-center py-12 rounded-2xl border border-dashed border-white/10 bg-white/[0.01]"
          >
            <Target size={48} className="text-gray-700 mb-4" />
            <h3 className="text-lg font-bold text-gray-400">No interviews yet</h3>
            <p className="text-sm text-gray-600 mt-1 max-w-sm">
              Pick a problem above and complete your first interview.
              Your scores and progress will appear here.
            </p>
          </motion.div>
        )}

        {/* Judge ID (Phase 1) */}
        <div className="mt-20 pt-8 border-t border-white/5 flex justify-center">
           <p className="text-[10px] text-gray-700 font-mono tracking-tighter uppercase">
             Session ID: {config.judgeId}
           </p>
        </div>
      </div>

    {/* Feedback Report Overlay */}
    {selectedFeedback && (
      <FeedbackReport
        feedback={selectedFeedback}
        onClose={() => setSelectedFeedback(null)}
      />
    )}
  </div>
  );
}
