import {
  StudySession,
  CreateStudySessionDTO,
  UpdateStudySessionDTO,
  StudySessionType,
} from '../types/studySession.types';
import { ReviewQuality } from '../../flashcards/types/flashcard.types';

export interface StudySessionFilters {
  studyType?: StudySessionType;
  isCompleted?: boolean;
  startDate?: Date;
  endDate?: Date;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  lastDocId?: string;
}

export interface PaginatedStudySessions {
  items: StudySession[];
  total: number;
  hasMore: boolean;
  lastDocId?: string;
}

export interface IStudySessionRepository {
  create(data: CreateStudySessionDTO): Promise<StudySession>;
  findById(id: string, userId: string): Promise<StudySession | null>;
  findByUser(
    userId: string,
    filters: StudySessionFilters,
    pagination: PaginationOptions,
  ): Promise<PaginatedStudySessions>;
  update(id: string, userId: string, data: UpdateStudySessionDTO): Promise<StudySession>;
  delete(id: string, userId: string): Promise<void>;
  complete(id: string, userId: string, finalUpdates?: UpdateStudySessionDTO): Promise<StudySession>;
  recordAnswer(
    sessionId: string,
    userId: string,
    questionId: string,
    isCorrect: boolean,
    quality: ReviewQuality,
    selectedOptionId?: string | null,
    essayResponse?: string | null,
    responseTimeSeconds?: number,
    questionListId?: string | null,
  ): Promise<void>;
}
