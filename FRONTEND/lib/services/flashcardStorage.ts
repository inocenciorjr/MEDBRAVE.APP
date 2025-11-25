// Local Storage Service for Flashcard Sessions

import { StudySession, CardReview } from '@/types/flashcards';

const SESSION_KEY_PREFIX = 'flashcard_session_';
const PREFERENCES_KEY = 'flashcard_preferences';

/**
 * Save study session progress to localStorage
 */
export function saveSession(deckId: string, session: Partial<StudySession>): void {
  try {
    const key = `${SESSION_KEY_PREFIX}${deckId}`;
    localStorage.setItem(key, JSON.stringify(session));
  } catch (error) {
    console.error('Error saving session:', error);
  }
}

/**
 * Load study session from localStorage
 */
export function loadSession(deckId: string): Partial<StudySession> | null {
  try {
    const key = `${SESSION_KEY_PREFIX}${deckId}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error loading session:', error);
    return null;
  }
}

/**
 * Clear session data for a specific deck
 */
export function clearSession(deckId: string): void {
  try {
    const key = `${SESSION_KEY_PREFIX}${deckId}`;
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Error clearing session:', error);
  }
}

/**
 * Save user preferences
 */
export function savePreferences(preferences: Record<string, any>): void {
  try {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.error('Error saving preferences:', error);
  }
}

/**
 * Load user preferences
 */
export function loadPreferences(): Record<string, any> | null {
  try {
    const data = localStorage.getItem(PREFERENCES_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error loading preferences:', error);
    return null;
  }
}

/**
 * Clean up old session data (older than 7 days)
 */
export function cleanupOldSessions(): void {
  try {
    const now = Date.now();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(SESSION_KEY_PREFIX)) {
        const data = localStorage.getItem(key);
        if (data) {
          const session = JSON.parse(data);
          const sessionDate = new Date(session.startedAt).getTime();
          
          if (now - sessionDate > maxAge) {
            localStorage.removeItem(key);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error cleaning up sessions:', error);
  }
}
