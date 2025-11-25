/**
 * Question types for admin management
 */

export enum QuestionStatus {
  PUBLISHED = 'PUBLISHED',
  DRAFT = 'DRAFT',
  ARCHIVED = 'ARCHIVED',
}

export enum QuestionDifficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
}

export interface Alternative {
  id: string;
  text: string;
  isCorrect: boolean;
  explanation?: string;
  order: number;
}

export interface Question {
  id: string;
  statement: string;
  description?: string;
  alternatives: Alternative[];
  correctAlternativeId?: string;
  tags: string[];
  filterIds: string[];
  subFilterIds: string[];
  educationalFilters?: string[];
  difficulty: QuestionDifficulty;
  status: QuestionStatus;
  isAnnulled: boolean;
  isOutdated: boolean;
  annulmentReason?: string;
  source?: string;
  year?: number;
  institution?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export type QuestionSortField = 'createdAt' | 'status' | 'id' | 'difficulty';
