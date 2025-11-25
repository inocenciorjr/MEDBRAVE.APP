// Removed Firebase dependency - using ISO string dates

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
  VERY_HARD = 'VERY_HARD',
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
  correct_alternative_id?: string;
  explanation?: string | null;
  professorComment?: string | null;
  difficulty: QuestionDifficulty;
  difficulty_level?: number;
  filter_ids: string[];
  sub_filter_ids: string[];
  tags: string[];
  source?: string | null;
  year?: number | null;
  status: QuestionStatus;
  is_annulled: boolean;
  is_outdated: boolean;
  is_active: boolean;
  review_count: number;
  average_rating: number;
  rating: number;
  created_by: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
  comments_allowed?: boolean;
  last_reviewed_at?: string | null;
  review_status?: ReviewStatus;
  reviewer_id?: string | null;
  review_notes?: string | null;
  version?: number;
  related_question_ids?: string[];
  image_urls?: string[];
  video_urls?: string[];
  audio_urls?: string[];
  metadata?: Record<string, any>;
}

/**
 * Payload para criação de questão
 */
export type CreateQuestionPayload = Omit<
  Question,
  'id' | 'created_at' | 'updated_at' | 'review_count' | 'average_rating'
>;

/**
 * Payload para atualização de questão
 */
export type UpdateQuestionPayload = Partial<
  Omit<Question, 'id' | 'created_at' | 'updated_at'>
>;

/**
 * Opções para listagem de questões
 */
export interface ListQuestionsOptions {
  query?: string;
  user_id?: string;
  limit?: number;
  page?: number;
  start_after?: string;
  status?: QuestionStatus;
  difficulty?: QuestionDifficulty;
  tags?: string[];
  filter_ids?: string[];
  sub_filter_ids?: string[];
  is_annulled?: boolean;
  is_active?: boolean;
  source?: string;
  year?: number;
  order_by?: string;
  order_direction?: 'asc' | 'desc';
  exclude_tags?: string[];
  exclude_anuladas?: boolean;
  exclude_desatualizadas?: boolean;
  search?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
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
  question_list_id: string;
  question_id: string;
  order: number;
  personal_notes: string | null;
  status: QuestionListItemStatus;
  is_completed: boolean;
  added_at: string;
  last_attempted_at: string | null;
  correct_attempts: number;
  incorrect_attempts: number;
  created_at: string;
  updated_at: string;
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
  user_id: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  parent_folder_id: string | null;
  list_count: number;
  status: QuestionListFolderStatus;
  order: number;
  created_at: string;
  updated_at: string;
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
  lastStudyDate: string | null;
  completionPercentage: number;
  lastAddedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Interface para favoritar lista de questões
 */
export interface UserFavoriteQuestionList {
  id: string;
  userId: string;
  questionListId: string;
  favoritedAt: string;
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
  lastAttemptedAt?: string;
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
  answeredAt: string;
  responseTimeSeconds: number;

  createdAt: string;
  updatedAt: string;
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
  answeredAt: string;
  difficulty: string;
  topic: string;
  timeSpentMs: number;
  accuracy: number;
  createdAt: string;
  updatedAt: string;
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
  completedAt: string;
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
// NOVA ARQUITETURA DE DADOS - FASE 3 REFATORAÇÃO
// =============================================================================

// ===== ENUMS COMUNS =====
export * from './common';

// ===== ESTATÍSTICAS DE LISTA =====
export * from './statistics';

// ===== PREDIÇÃO DE PERFORMANCE =====
export * from './prediction';

// ===== DASHBOARD =====
export * from './dashboard';
