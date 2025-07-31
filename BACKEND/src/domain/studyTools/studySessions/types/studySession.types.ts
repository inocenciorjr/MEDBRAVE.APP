import { Timestamp } from 'firebase-admin/firestore';
import { ReviewQuality } from '../../flashcards/types/flashcard.types';

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
  startTime?: Date;
  filters?: Record<string, unknown>;
  subFilters?: Record<string, unknown>;
}

export interface UpdateStudySessionDTO {
  endTime?: Date;
  questionsAnswered?: number;
  correctAnswers?: number;
  incorrectAnswers?: number;
  notes?: string | null;
  mood?: StudySessionMood | null;
  difficulty?: StudySessionDifficulty | null;
  focusScore?: number | null;
  isCompleted?: boolean;
}

export interface CompleteStudySessionDTO {
  endTime?: Date;
  notes?: string;
  mood?: StudySessionMood;
  difficulty?: StudySessionDifficulty;
  focusScore?: number;
}

export interface RecordAnswerDTO {
  questionId: string;
  isCorrect: boolean;
  reviewQuality: ReviewQuality;
  selectedOptionId?: string;
  essayResponse?: string;
  responseTimeSeconds?: number;
  questionListId?: string;
}
