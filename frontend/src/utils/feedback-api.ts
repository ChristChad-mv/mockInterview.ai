/**
 * Upload interview recording to the backend for AI-powered feedback.
 * The backend stores the video in GCS, then sends it to Gemini 3.0 Flash
 * for comprehensive video analysis. Returns structured feedback.
 */

import type { FeedbackData } from '../components/feedback/FeedbackReport';

interface FeedbackRequestParams {
  videoBlob: Blob;
  mode: 'coding' | 'system-design' | 'behavioral';
  problemTitle: string;
  duration: string;
}

export async function fetchAIFeedback(
  params: FeedbackRequestParams,
): Promise<FeedbackData> {
  const formData = new FormData();
  formData.append('video', params.videoBlob, `interview-${Date.now()}.webm`);
  formData.append('mode', params.mode);
  formData.append('problem_title', params.problemTitle);
  formData.append('duration', params.duration);

  const response = await fetch('/api/feedback', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ detail: 'Unknown error' }));
    throw new Error(
      error.detail || `Feedback request failed: ${response.status}`,
    );
  }

  const data = await response.json();

  return {
    overallScore: data.overallScore ?? 5,
    duration: data.duration ?? params.duration,
    mode: params.mode,
    problemTitle: data.problemTitle ?? params.problemTitle,
    categories: data.categories ?? [],
    strengths: data.strengths ?? [],
    improvements: data.improvements ?? [],
    nextSteps: data.nextSteps ?? [],
  };
}
