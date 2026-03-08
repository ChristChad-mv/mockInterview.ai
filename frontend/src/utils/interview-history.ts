/**
 * Interview history stored in localStorage.
 * Tracks completed sessions, scores, and progress per problem.
 */

export interface InterviewRecord {
  id: string;
  mode: 'coding' | 'system-design' | 'behavioral';
  problemId: string;
  problemTitle: string;
  overallScore: number;
  categories: { name: string; score: number; comment?: string }[];
  duration: string;
  date: string; // ISO string
  // Full feedback (optional — older records may not have these)
  strengths?: string[];
  improvements?: string[];
  nextSteps?: string[];
}

const STORAGE_KEY = 'mockinterview-history';

export function getHistory(): InterviewRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addRecord(record: Omit<InterviewRecord, 'id' | 'date'>): InterviewRecord {
  const full: InterviewRecord = {
    ...record,
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
  };
  const history = getHistory();
  history.unshift(full); // newest first
  // Keep last 100 sessions
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, 100)));
  return full;
}

export function clearHistory(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/** Get the best score for a specific problem */
export function getBestScore(problemId: string): number | null {
  const history = getHistory();
  const records = history.filter((r) => r.problemId === problemId);
  if (records.length === 0) return null;
  return Math.max(...records.map((r) => r.overallScore));
}

/** Get stats summary */
export function getStats() {
  const history = getHistory();
  const total = history.length;
  if (total === 0) return null;

  const avgScore = Math.round(
    history.reduce((sum, r) => sum + r.overallScore, 0) / total * 10
  ) / 10;

  const byMode = {
    coding: history.filter((r) => r.mode === 'coding'),
    'system-design': history.filter((r) => r.mode === 'system-design'),
    behavioral: history.filter((r) => r.mode === 'behavioral'),
  };

  // Streak: consecutive days with at least one interview
  const dates = [...new Set(history.map((r) => r.date.slice(0, 10)))].sort().reverse();
  let streak = 0;
  const today = new Date().toISOString().slice(0, 10);
  for (let i = 0; i < dates.length; i++) {
    const expected = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    if (dates[i] === expected) {
      streak++;
    } else {
      break;
    }
  }

  // Recent trend: average of last 5 vs previous 5
  const last5 = history.slice(0, 5);
  const prev5 = history.slice(5, 10);
  const last5Avg = last5.reduce((s, r) => s + r.overallScore, 0) / last5.length;
  const prev5Avg = prev5.length > 0
    ? prev5.reduce((s, r) => s + r.overallScore, 0) / prev5.length
    : last5Avg;
  const trend = last5Avg - prev5Avg; // positive = improving

  return {
    total,
    avgScore,
    streak,
    trend,
    byMode,
    uniqueProblems: new Set(history.map((r) => r.problemId)).size,
  };
}
