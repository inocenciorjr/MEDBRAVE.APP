import { Timestamp } from 'firebase-admin/firestore';

export enum StudySessionType {
  FLASHCARDS = 'flashcards',
  QUESTIONS = 'questions',
  READING = 'reading',
  MIXED = 'mixed',
}

export enum StudySessionMood {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  NEUTRAL = 'neutral',
  BAD = 'bad',
  TERRIBLE = 'terrible',
}

export enum StudySessionDifficulty {
  VERY_EASY = 'very_easy',
  EASY = 'easy',
  MODERATE = 'moderate',
  HARD = 'hard',
  VERY_HARD = 'very_hard',
}

export interface StudySession {
  id: string;
  userId: string;
  startTime: Timestamp;
  endTime: Timestamp | null;
  duration: number | null; // em minutos
  questionsAnswered: number;
  correctAnswers: number;
  incorrectAnswers: number;
  accuracy: number | null;
  studyType: StudySessionType;
  filters: Record<string, unknown> | null;
  subFilters: Record<string, unknown> | null;
  notes: string | null;
  mood: StudySessionMood | null;
  difficulty: StudySessionDifficulty | null;
  focusScore: number | null;
  isCompleted: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CreateStudySessionDTO {
  userId: string;
  studyType: StudySessionType;
  startTime?: Timestamp;
  filters?: Record<string, unknown>;
  subFilters?: Record<string, unknown>;
}

export interface UpdateStudySessionDTO {
  endTime?: Timestamp;
  questionsAnswered?: number;
  correctAnswers?: number;
  incorrectAnswers?: number;
  notes?: string | null;
  mood?: StudySessionMood | null;
  difficulty?: StudySessionDifficulty | null;
  focusScore?: number | null;
  isCompleted?: boolean;
}

export interface StudySessionFilters {
  studyType?: StudySessionType;
  isCompleted?: boolean;
  startDate?: Date;
  endDate?: Date;
}

export interface PaginatedStudySessions {
  sessions: StudySession[];
  total: number;
  hasMore: boolean;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  lastDocId?: string;
}
