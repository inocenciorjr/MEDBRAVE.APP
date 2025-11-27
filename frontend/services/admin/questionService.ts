/**
 * Question service for admin management
 */

import { get, post, put, del, buildQueryString } from './baseService';
import type { Question, QuestionStatus, QuestionDifficulty } from '@/types/admin/question';
import type { ApiResponse, PaginationParams, SortDirection } from '@/types/admin/common';

export interface GetQuestionsParams extends PaginationParams {
  search?: string;
  status?: QuestionStatus | 'all';
  difficulty?: QuestionDifficulty | 'all';
  sortBy?: 'date' | 'status' | 'id';
  sortDirection?: SortDirection;
  filterIds?: string[];
  subFilterIds?: string[];
}

export interface CreateQuestionPayload {
  statement: string;
  description?: string;
  alternatives: Array<{
    text: string;
    isCorrect: boolean;
    explanation?: string;
    order: number;
  }>;
  tags: string[];
  filterIds: string[];
  subFilterIds: string[];
  difficulty: QuestionDifficulty;
  status: QuestionStatus;
  isAnnulled?: boolean;
  isOutdated?: boolean;
  annulmentReason?: string;
  source?: string;
  year?: number;
  institution?: string;
}

export type UpdateQuestionPayload = Partial<CreateQuestionPayload>;

export interface BulkEditFiltersPayload {
  questionIds: string[];
  addFilterIds?: string[];
  removeFilterIds?: string[];
  addSubFilterIds?: string[];
  removeSubFilterIds?: string[];
  removeAllFilters?: boolean;
}

/**
 * Get list of questions with filters
 */
export async function getQuestions(params: GetQuestionsParams = { page: 1, limit: 50 }): Promise<ApiResponse<Question[]>> {
  const queryString = buildQueryString(params);
  return get<ApiResponse<Question[]>>(`/api/questions${queryString}`);
}

/**
 * Get single question by ID
 */
export async function getQuestion(questionId: string): Promise<Question> {
  return get<Question>(`/api/questions/${questionId}`);
}

/**
 * Create new question
 */
export async function createQuestion(payload: CreateQuestionPayload): Promise<Question> {
  return post<Question>('/api/questions', payload);
}

/**
 * Update question
 */
export async function updateQuestion(questionId: string, payload: UpdateQuestionPayload): Promise<Question> {
  return put<Question>(`/api/questions/${questionId}`, payload);
}

/**
 * Delete question
 */
export async function deleteQuestion(questionId: string): Promise<void> {
  return del<void>(`/api/questions/${questionId}`);
}

/**
 * Bulk edit filters for multiple questions
 */
export async function bulkEditFilters(payload: BulkEditFiltersPayload): Promise<void> {
  return put<void>('/api/questions/bulk/filters', payload);
}

/**
 * Bulk delete questions
 */
export async function bulkDeleteQuestions(questionIds: string[]): Promise<void> {
  return del<void>(`/api/questions/bulk?ids=${questionIds.join(',')}`);
}

/**
 * Get question statistics
 */
export async function getQuestionStats(): Promise<{
  total: number;
  published: number;
  draft: number;
  archived: number;
}> {
  return get('/api/questions/stats');
}
