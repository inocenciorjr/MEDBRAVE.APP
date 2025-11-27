'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Question } from '@/types/resolucao-questoes';

/**
 * Custom hook to manage navigation between questions
 * @param questionList - Array of all questions
 * @param currentQuestionId - ID of the current question
 * @param listId - Optional list ID for URL construction
 * @returns Object containing navigation state and functions
 */
export function useQuestionNavigation(
  questionList: Question[],
  currentQuestionId: string,
  listId?: string
) {
  const router = useRouter();
  
  const currentIndex = useMemo(() => {
    return questionList.findIndex(q => q.id === currentQuestionId);
  }, [questionList, currentQuestionId]);

  const canGoNext = useMemo(() => {
    return currentIndex < questionList.length - 1;
  }, [currentIndex, questionList.length]);

  const canGoPrevious = useMemo(() => {
    return currentIndex > 0;
  }, [currentIndex]);

  /**
   * Navigates to a specific question by ID or index
   */
  const goToQuestion = useCallback((questionIdOrIndex: string | number) => {
    if (listId) {
      // Se temos listId, usar formato listId-index
      const index = typeof questionIdOrIndex === 'number' 
        ? questionIdOrIndex 
        : questionList.findIndex(q => q.id === questionIdOrIndex);
      // Usar replace em vez de push para evitar adicionar ao histórico
      router.replace(`/resolucao-questoes/${listId}-${index}`, { scroll: false });
    } else {
      // Fallback para ID direto
      const id = typeof questionIdOrIndex === 'string' 
        ? questionIdOrIndex 
        : questionList[questionIdOrIndex]?.id;
      router.replace(`/resolucao-questoes/${id}`, { scroll: false });
    }
  }, [router, listId, questionList]);

  /**
   * Navigates to the next question
   */
  const goToNext = useCallback(() => {
    if (canGoNext) {
      const nextQuestion = questionList[currentIndex + 1];
      goToQuestion(nextQuestion.id);
    }
  }, [canGoNext, currentIndex, questionList, goToQuestion]);

  /**
   * Navigates to the previous question
   */
  const goToPrevious = useCallback(() => {
    if (canGoPrevious) {
      const prevQuestion = questionList[currentIndex - 1];
      goToQuestion(prevQuestion.id);
    }
  }, [canGoPrevious, currentIndex, questionList, goToQuestion]);

  /**
   * Navigates to a question by index
   */
  const goToIndex = useCallback((index: number) => {
    if (index >= 0 && index < questionList.length) {
      const question = questionList[index];
      goToQuestion(question.id);
    }
  }, [questionList, goToQuestion]);

  return {
    currentIndex,
    totalQuestions: questionList.length,
    canGoNext,
    canGoPrevious,
    goToNext,
    goToPrevious,
    goToQuestion,
    goToIndex,
  };
}
