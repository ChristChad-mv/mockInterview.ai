import { db, auth } from './firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp
} from 'firebase/firestore';

export interface InterviewRecord {
  id: string;
  mode: 'coding' | 'system-design' | 'behavioral';
  problemId: string;
  problemTitle: string;
  overallScore: number;
  categories: { name: string; score: number; comment?: string }[];
  duration: string;
  date: string; // ISO string
  userId: string;
  strengths?: string[];
  improvements?: string[];
  nextSteps?: string[];
}

const COLLECTION_NAME = 'interview_history';

/** 
 * Gets the current memory cached history. 
 * Note: To keep the app snappy, we now treat this mostly as an async fetch from Firebase.
 */
let cachedHistory: InterviewRecord[] = [];

export async function fetchHistoryFromFirebase(): Promise<InterviewRecord[]> {
  const user = auth.currentUser;
  if (!user) return [];

  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', user.uid),
      orderBy('date', 'desc'),
      limit(50)
    );
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as InterviewRecord[];
    cachedHistory = data;
    return data;
  } catch (err) {
    console.error('Error fetching history:', err);
    return [];
  }
}

/** Synchronous fallback for UI that needs rapid renders */
export function getHistory(): InterviewRecord[] {
  return cachedHistory;
}

export async function addRecord(record: Omit<InterviewRecord, 'id' | 'date' | 'userId'>): Promise<InterviewRecord> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('You must be logged in to save history');
  }

  const fullRecord = {
    ...record,
    userId: user.uid,
    date: new Date().toISOString(),
    createdAt: serverTimestamp()
  };

  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), fullRecord);
    const result = { id: docRef.id, ...fullRecord } as InterviewRecord;
    cachedHistory.unshift(result);
    return result;
  } catch (err) {
    console.error('Error adding record:', err);
    throw err;
  }
}

export function clearHistory(): void {
  // We don't usually clear cloud history on a whim, but we can clear local cache
  cachedHistory = [];
}

/** Get the best score for a specific problem - uses cache for speed */
export function getBestScore(problemId: string): number | null {
  const records = cachedHistory.filter((r) => r.problemId === problemId);
  if (records.length === 0) return null;
  return Math.max(...records.map((r) => r.overallScore));
}

/** Get stats summary from cached history */
export function getStats() {
  const history = cachedHistory;
  const total = history.length;
  if (total === 0) return null;

  const avgScore = Math.round(
    history.reduce((sum, r) => sum + r.overallScore, 0) / total * 10
  ) / 10;

  // Streak calculation (simplified from cloud timestamps)
  const dates = [...new Set(history.map((r) => r.date.slice(0, 10)))].sort().reverse();
  let streak = 0;
  for (let i = 0; i < dates.length; i++) {
    const expected = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    if (dates[i] === expected) streak++;
    else break;
  }

  const last5 = history.slice(0, 5);
  const prev5 = history.slice(5, 10);
  const last5Avg = last5.reduce((s, r) => s + r.overallScore, 0) / (last5.length || 1);
  const prev5Avg = prev5.length > 0
    ? prev5.reduce((s, r) => s + r.overallScore, 0) / prev5.length
    : last5Avg;
  const trend = last5Avg - prev5Avg;

  return {
    total,
    avgScore,
    streak,
    trend,
    uniqueProblems: new Set(history.map((r) => r.problemId)).size,
  };
}
