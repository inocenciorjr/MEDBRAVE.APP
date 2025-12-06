'use client';

import { useState, useCallback, useEffect } from 'react';
import { Question, QuestionState, TextHighlight } from '@/types/resolucao-questoes';

const STORAGE_KEY_PREFIX = 'question_state_';

/**
 * Custom hook to manage question state including selection, answers, highlights, and tags
 * @param question - The question object
 * @param listId - Optional list ID to scope the state to a specific list
 * @returns Object containing state and state management functions
 */
export function useQuestionState(question: Question, listId?: string) {
  // Create a unique key that includes both question ID and list ID
  const storageKey = listId 
    ? `${STORAGE_KEY_PREFIX}${listId}_${question.id}`
    : `${STORAGE_KEY_PREFIX}${question.id}`;
  
  const [state, setState] = useState<QuestionState>(() => {
    // Try to load saved state from localStorage
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          return {
            ...parsed,
            highlights: parsed.highlights || [],
            userTags: parsed.userTags || [],
          };
        }
      } catch (error) {
        console.error('Error loading saved question state:', error);
      }
    }
    
    return {
      selectedAlternative: null,
      isAnswered: false,
      isCorrect: null,
      highlights: [],
      userTags: [],
    };
  });

  // Reset state when question or list changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          setState({
            ...parsed,
            highlights: parsed.highlights || [],
            userTags: parsed.userTags || [],
          });
        } else {
          setState({
            selectedAlternative: null,
            isAnswered: false,
            isCorrect: null,
            highlights: [],
            userTags: [],
          });
        }
      } catch (error) {
        console.error('Error loading saved question state:', error);
      }
    }
  }, [storageKey]);

  // Save state to localStorage when there are changes worth persisting
  // (answered, selection, highlights, or tags)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasDataToSave = state.isAnswered || 
                           state.selectedAlternative || 
                           state.highlights.length > 0 || 
                           state.userTags.length > 0;
      
      if (hasDataToSave) {
        try {
          localStorage.setItem(storageKey, JSON.stringify(state));
        } catch (error) {
          console.error('Error saving question state:', error);
        }
      }
    }
  }, [state, storageKey]);

  /**
   * Selects an alternative (or deselects if clicking the same one)
   */
  const selectAlternative = useCallback((alternativeId: string) => {
    setState(prev => ({
      ...prev,
      selectedAlternative: prev.selectedAlternative === alternativeId ? null : alternativeId,
    }));
  }, []);

  /**
   * Confirms the answer and checks if it's correct
   */
  const confirmAnswer = useCallback(() => {
    if (!state.selectedAlternative) return;
    
    const isCorrect = state.selectedAlternative === question.correctAlternative;
    
    setState(prev => ({
      ...prev,
      isAnswered: true,
      isCorrect,
    }));
  }, [state.selectedAlternative, question.correctAlternative]);

  /**
   * Adds a text highlight to the question
   */
  const addHighlight = useCallback((highlight: TextHighlight) => {
    setState(prev => ({
      ...prev,
      highlights: [...prev.highlights, highlight],
    }));
  }, []);

  /**
   * Removes a highlight by ID
   */
  const removeHighlight = useCallback((highlightId: string) => {
    setState(prev => ({
      ...prev,
      highlights: prev.highlights.filter(h => h.id !== highlightId),
    }));
  }, []);

  /**
   * Clears all highlights
   */
  const clearHighlights = useCallback(() => {
    setState(prev => ({
      ...prev,
      highlights: [],
    }));
  }, []);

  /**
   * Adds a tag to the question
   */
  const addTag = useCallback((tag: string) => {
    setState(prev => {
      if (prev.userTags.includes(tag)) {
        return prev;
      }
      return {
        ...prev,
        userTags: [...prev.userTags, tag],
      };
    });
  }, []);

  /**
   * Removes a tag from the question
   */
  const removeTag = useCallback((tag: string) => {
    setState(prev => ({
      ...prev,
      userTags: prev.userTags.filter(t => t !== tag),
    }));
  }, []);

  /**
   * Resets the question state
   */
  const resetState = useCallback(() => {
    setState({
      selectedAlternative: null,
      isAnswered: false,
      isCorrect: null,
      highlights: [],
      userTags: [],
    });
  }, []);

  return {
    state,
    selectAlternative,
    confirmAnswer,
    addHighlight,
    removeHighlight,
    clearHighlights,
    addTag,
    removeTag,
    resetState,
  };
}
