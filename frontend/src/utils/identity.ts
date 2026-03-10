/**
 * MockInterview.ai — Identity Utility
 * Handles persistent JudgeID generation and retrieval using localStorage.
 */

const SESSION_ID_KEY = 'mockinterview-session-id';

/**
 * Gets the persistent JudgeID for this browser.
 * Generates a new one if it doesn't exist.
 */
export function getSessionId(): string {
  let id = localStorage.getItem(SESSION_ID_KEY);
  
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_ID_KEY, id);
  }
  
  return id;
}

/**
 * Formats a name to be used for Google Cloud / Gemini resources.
 * Ensures it follows naming conventions (lowercase, alphanumeric, etc).
 */
export function getResourcePrefix(): string {
  const id = getSessionId();
  // We use the first 8 chars + some entropy or just the clean ID
  // Gemini store names must start with a letter and contain only letters, numbers, hyphens
  const cleanId = id.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  return `mock-interview-store-${cleanId.slice(0, 12)}`;
}
