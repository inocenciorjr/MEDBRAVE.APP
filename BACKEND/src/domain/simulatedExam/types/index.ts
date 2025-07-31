import { Timestamp } from 'firebase-admin/firestore';

export enum SimulatedExamStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export enum SimulatedExamDifficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
  MIXED = 'mixed',
}

export interface SimulatedExamQuestion {
  id: string;
  questionId: string;
  order: number;
  points: number;
}

export interface SimulatedExam {
  id: string;
  title: string;
  description: string;
  instructions?: string;
  timeLimit: number; // em minutos
  questionIds: string[];
  questions: SimulatedExamQuestion[];
  totalQuestions: number;
  totalPoints: number;
  difficulty: SimulatedExamDifficulty;
  filterIds: string[];
  subFilterIds: string[];
  status: SimulatedExamStatus;
  isPublic: boolean;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  publishedAt?: Timestamp;
  tags: string[];
  startMessage?: string;
  endMessage?: string;
  randomize: boolean;
}

export interface SimulatedExamResult {
  id: string;
  examId: string;
  userId: string;
  startedAt: Timestamp;
  finishedAt?: Timestamp;
  score: number;
  totalPoints: number;
  correctAnswers: number;
  totalQuestions: number;
  percentageScore: number;
  timeSpent: number; // em segundos
  answers: SimulatedExamAnswer[];
  status: 'in_progress' | 'completed' | 'abandoned';
  ipAddress?: string;
  device?: string;
  browser?: string;
}

export interface SimulatedExamAnswer {
  questionId: string;
  answerId: string;
  isCorrect: boolean;
  points: number;
  timeSpent?: number; // em segundos
  answeredAt: Timestamp;
}

export interface CreateSimulatedExamPayload {
  title: string;
  description: string;
  instructions?: string;
  timeLimit: number;
  questions: Omit<SimulatedExamQuestion, 'id'>[];
  difficulty: SimulatedExamDifficulty;
  filterIds?: string[];
  subFilterIds?: string[];
  status?: SimulatedExamStatus;
  isPublic?: boolean;
  tags?: string[];
  startMessage?: string;
  endMessage?: string;
  randomize?: boolean;
  createdBy: string;
}

export interface UpdateSimulatedExamPayload {
  title?: string;
  description?: string;
  instructions?: string;
  timeLimit?: number;
  questions?: Omit<SimulatedExamQuestion, 'id'>[];
  difficulty?: SimulatedExamDifficulty;
  filterIds?: string[];
  subFilterIds?: string[];
  status?: SimulatedExamStatus;
  isPublic?: boolean;
  tags?: string[];
  startMessage?: string;
  endMessage?: string;
  randomize?: boolean;
}

export interface StartSimulatedExamPayload {
  examId: string;
  userId: string;
  ipAddress?: string;
  device?: string;
  browser?: string;
}

export interface SubmitSimulatedExamAnswerPayload {
  resultId: string;
  questionId: string;
  answerId: string;
  timeSpent?: number;
}

export interface FinishSimulatedExamPayload {
  resultId: string;
}

export interface ListSimulatedExamsOptions {
  limit?: number;
  page?: number;
  status?: SimulatedExamStatus;
  difficulty?: SimulatedExamDifficulty;
  createdBy?: string;
  filterIds?: string[];
  subFilterIds?: string[];
  tags?: string[];
  isPublic?: boolean;
  query?: string;
  startAfter?: string;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export interface PaginatedSimulatedExamsResult {
  exams: SimulatedExam[];
  totalCount: number;
  hasMore: boolean;
  nextStartAfter?: string;
}

export interface PaginatedSimulatedExamResultsResult {
  results: SimulatedExamResult[];
  totalCount: number;
  hasMore: boolean;
  nextStartAfter?: string;
}

export interface SimulatedExamStatistics {
  totalExams: number;
  completedExams: number;
  averageScore: number;
  bestScore: number;
  worstScore: number;
  averageTimeSpent: number;
  examsByDifficulty: {
    [key in SimulatedExamDifficulty]: number;
  };
  lastExamResult?: {
    examId: string;
    examTitle: string;
    score: number;
    completedAt: Timestamp;
  };
}
