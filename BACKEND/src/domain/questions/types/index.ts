import { Timestamp } from 'firebase-admin/firestore';

// =============================================================================
// CORE QUESTION TYPES
// =============================================================================

/**
 * Níveis de dificuldade de uma questão
 */
export enum QuestionDifficulty {
  VERY_EASY = 'VERY_EASY',
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
  VERY_HARD = 'VERY_HARD'
}

/**
 * Status de uma questão
 */
export enum QuestionStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

/**
 * Status de revisão de uma questão
 */
export enum ReviewStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ARCHIVED = 'ARCHIVED',
}

/**
 * Alternativa de uma questão
 */
export interface QuestionAlternative {
  id: string;
  text: string;
  isCorrect: boolean;
  explanation?: string | null;
  order: number;
}

/**
 * Interface para uma questão
 */
export interface Question {
  id: string;
  title?: string;
  statement: string;
  alternatives: QuestionAlternative[];
  correctAlternativeId?: string;
  explanation?: string | null;
  difficulty: QuestionDifficulty;
  difficultyLevel?: number;
  filterIds: string[];
  subFilterIds: string[];
  tags: string[];
  source?: string | null;
  year?: number | null;
  status: QuestionStatus;
  isAnnulled: boolean;
  isActive: boolean;
  reviewCount: number;
  averageRating: number;
  createdBy: string;
  updatedBy?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  commentsAllowed?: boolean;
  lastReviewedAt?: Timestamp | null;
  reviewStatus?: ReviewStatus;
  reviewerId?: string | null;
  reviewNotes?: string | null;
  version?: number;
  relatedQuestionIds?: string[];
  imageUrls?: string[];
  videoUrls?: string[];
  audioUrls?: string[];
  metadata?: Record<string, any>;
}

/**
 * Payload para criação de questão
 */
export type CreateQuestionPayload = Omit<
  Question,
  'id' | 'createdAt' | 'updatedAt' | 'reviewCount' | 'averageRating'
>;

/**
 * Payload para atualização de questão
 */
export type UpdateQuestionPayload = Partial<Omit<Question, 'id' | 'createdAt' | 'updatedAt'>>;

/**
 * Opções para listagem de questões
 */
export interface ListQuestionsOptions {
  query?: string;
  userId?: string;
  limit?: number;
  page?: number;
  startAfter?: string;
  status?: QuestionStatus;
  difficulty?: QuestionDifficulty;
  tags?: string[];
  filterIds?: string[];
  subFilterIds?: string[];
  isAnnulled?: boolean;
  isActive?: boolean;
  source?: string;
  year?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  excludeTags?: string[];
}

/**
 * Resultado paginado de questões
 */
export interface PaginatedQuestionsResult {
  items: Question[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  nextPageStartAfter?: string;
}

// =============================================================================
// QUESTION LISTS TYPES
// =============================================================================

/**
 * Enumeração dos status de um item em uma lista de questões
 */
export enum QuestionListItemStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  REVIEWING = 'REVIEWING',
}

/**
 * Enumeração dos status de uma lista de questões
 */
export enum QuestionListStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
  DELETED = 'DELETED',
}

/**
 * Interface para um item de lista de questões
 */
export interface QuestionListItem {
  id: string;
  questionListId: string;
  questionId: string;
  order: number;
  personalNotes: string | null;
  status: QuestionListItemStatus;
  isCompleted: boolean;
  addedAt: Timestamp;
  lastAttemptedAt: Timestamp | null;
  correctAttempts: number;
  incorrectAttempts: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Enumeração de status de pastas
 */
export enum QuestionListFolderStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
  DELETED = 'DELETED',
}

/**
 * Interface para uma pasta de listas de questões
 */
export interface QuestionListFolder {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  parentFolderId: string | null;
  listCount: number;
  status: QuestionListFolderStatus;
  order: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Interface para uma lista de questões
 */
export interface QuestionList {
  id: string;
  userId: string;
  folderId: string | null;
  title: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  tags: string[];
  questionCount: number;
  status: QuestionListStatus;
  viewCount: number;
  favoriteCount: number;
  lastStudyDate: Timestamp | null;
  completionPercentage: number;
  lastAddedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Interface para favoritar lista de questões
 */
export interface UserFavoriteQuestionList {
  id: string;
  userId: string;
  questionListId: string;
  favoritedAt: Timestamp;
}

// =============================================================================
// PAYLOADS AND OPTIONS
// =============================================================================

export interface ListQuestionListsOptions {
  limit?: number;
  page?: number;
  status?: QuestionListStatus;
  userId?: string;
  isPublic?: boolean;
  searchTerm?: string;
  tags?: string[];
}

export interface CreateQuestionListFolderPayload {
  userId: string;
  name: string;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
  parentFolderId?: string | null;
  status?: QuestionListFolderStatus;
  order?: number;
}

export interface UpdateQuestionListFolderPayload {
  name?: string;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
  parentFolderId?: string | null;
  status?: QuestionListFolderStatus;
  order?: number;
}

export interface ListQuestionListFoldersOptions {
  limit?: number;
  page?: number;
  status?: QuestionListFolderStatus;
  userId?: string;
  parentFolderId?: string | null;
  searchTerm?: string;
}

export interface PaginatedQuestionListFoldersResult {
  folders: QuestionListFolder[];
  total: number;
  page: number;
  totalPages: number;
}

export interface CreateQuestionListPayload {
  userId: string;
  folderId?: string | null;
  title: string;
  name?: string;
  description?: string | null;
  isPublic?: boolean;
  tags?: string[];
  status?: QuestionListStatus;
  questions?: string[];
}

export interface UpdateQuestionListPayload {
  folderId?: string | null;
  title?: string;
  name?: string;
  description?: string | null;
  isPublic?: boolean;
  tags?: string[];
  status?: QuestionListStatus;
}

export interface PaginatedQuestionListsResult {
  lists: QuestionList[];
  total: number;
  page: number;
  totalPages: number;
}

export interface CreateQuestionListItemPayload {
  questionListId: string;
  questionId: string;
  order: number;
  personalNotes?: string | null;
}

export interface UpdateQuestionListItemPayload {
  order?: number;
  personalNotes?: string | null;
  status?: QuestionListItemStatus;
  isCompleted?: boolean;
  lastAttemptedAt?: Timestamp;
  correctAttempts?: number;
  incorrectAttempts?: number;
}

export interface PaginatedQuestionListItemsResult {
  items: QuestionListItem[];
  total: number;
  page: number;
  totalPages: number;
}

// =============================================================================
// LEGACY RESPONSE TYPES (mantidos para compatibilidade)
// =============================================================================

/**
 * Enumeração de qualidade de revisão (FSRS - versão numérica legacy)
 * @deprecated Use ReviewQuality from enhanced.ts
 */
export enum LegacyReviewQuality {
  AGAIN = 0,
  HARD = 1,
  GOOD = 2,
  EASY = 3,
}

/**
 * @deprecated Use EnhancedQuestionResponse ao invés de QuestionResponse
 */
export interface QuestionResponse {
  id: string;
  userId: string;
  questionId: string;
  questionListId?: string | null;
  selectedOptionId: string | null;
  selectedAlternativeId: string | null;
  isCorrectOnFirstAttempt: boolean;
  answeredAt: Timestamp;
  responseTimeSeconds: number;
  isInReviewSystem: boolean;
  fsrsCardId: string | null;
  lastReviewQuality: LegacyReviewQuality;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * @deprecated Use CreateEnhancedResponsePayload
 */
export interface CreateQuestionResponsePayload {
  userId: string;
  questionId: string;
  questionListId?: string | null;
  selectedOptionId?: string | null;
  selectedAlternativeId?: string | null;
  isCorrectOnFirstAttempt: boolean;
  reviewQuality?: LegacyReviewQuality;
  responseTimeSeconds?: number;
}

/**
 * @deprecated Use EnhancedQuestionResponse ao invés de UserQuestionHistory
 */
export interface UserQuestionHistory {
  id: string;
  userId: string;
  questionId: string;
  isCorrect: boolean;
  answeredAt: Timestamp;
  difficulty: string;
  topic: string;
  timeSpentMs: number;
  accuracy: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// =============================================================================
// PERFORMANCE AND STATISTICS (legacy)
// =============================================================================

export interface SpecialtyPerformance {
  filterId: string;
  filterName: string;
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  accuracy: number;
  averageResponseTime: number;
  lastAttempt?: Date;
}

export interface UserPerformanceBySpecialty {
  userId: string;
  specialties: SpecialtyPerformance[];
  weakSpecialties: SpecialtyPerformance[];
  totalQuestions: number;
  overallAccuracy: number;
}

export interface ListCompletionSummary {
  listId: string;
  questionsAnswered: number;
  correctAnswers: number;
  accuracy: number;
  totalTimeMs: number;
  completedAt: Timestamp;
}

export interface QuestionWithReviewStatus extends QuestionListItem {
  isReviewMode: boolean;
}

export interface SelectionSummary {
  totalSelected: number;
  selectedCorrect: number;
  selectedIncorrect: number;
  avgAccuracy: number;
  selectedQuestions: string[];
}

export interface GranularReviewOptions {
  addOnlyIncorrect: boolean;
  addOnlyCorrect: boolean;
  addAll: boolean;
  customSelection: string[];
  reviewInterval?: 'IMMEDIATE' | 'TOMORROW' | 'CUSTOM';
  customDays?: number;
}

// =============================================================================
// NOVA ARQUITETURA DE DADOS - FASE 3 REFATORAÇÃO FSRS/SRS
// =============================================================================

// ===== ENUMS COMUNS =====
export * from './common';

// ===== ENHANCED QUESTION RESPONSE =====
export * from './enhanced';

// ===== SISTEMA DE RETENÇÃO =====
export * from './retention';

// ===== ESTATÍSTICAS DE LISTA =====
export * from './statistics';

// ===== PREDIÇÃO DE PERFORMANCE =====
export * from './prediction';

// ===== DASHBOARD =====
export * from './dashboard';
