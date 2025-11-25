// Removed Firebase dependency - using ISO string dates
// FSRS Types and Enums - moved from SupabaseFSRSService
export enum FSRSState {
  NEW = 0,
  LEARNING = 1,
  REVIEW = 2,
  RELEARNING = 3,
}

export enum UnifiedContentType {
  FLASHCARD = 'FLASHCARD',
  QUESTION = 'QUESTION',
  ERROR_NOTEBOOK = 'ERROR_NOTEBOOK',
}

export interface UnifiedReviewItem {
  id: string;
  user_id: string;
  content_type: UnifiedContentType;
  content_id: string;

  // Dados FSRS (sincronizados com FSRSCard)
  due: Date;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: FSRSState;
  last_review: Date | null; // Data da última revisão
  last_grade?: number; // Grade da última revisão (1-4)

  // Metadados enriquecidos
  title: string;
  subtitle?: string;
  tags?: string[];
  
  // Conteúdo específico do tipo
  front_content?: string; // Para flashcards - frente do card
  back_content?: string; // Para flashcards - verso do card

  // Específicos por tipo
  deck_id?: string; // Para flashcards
  question_list_id?: string; // Para questões
  error_notebook_id?: string; // Para caderno de erros
  question_statement?: string; // Para questões
  error_description?: string; // Para caderno de erros

  created_at: string;
  updated_at: string;
}

export interface DailyReviewSummary {
  total_items: number;
  today_items: number;
  old_items: number;
  today_reviews?: UnifiedReviewItem[]; // Revisões de hoje para exibir no dashboard
  flashcards: number;
  questions: number;
  error_notes: number;
  estimated_time_minutes: number;
  breakdown: {
    by_deck: Array<{ deck_id: string; name: string; count: number }>;
    by_subject: Array<{ subject: string; count: number }>;
    by_difficulty: Array<{ difficulty: string; count: number }>;
  };
}

export interface CreateUnifiedReviewDTO {
  user_id: string;
  content_type: UnifiedContentType;
  content_id: string;
  metadata?: Record<string, any>;
}

export interface ReviewSessionProgress {
  session_id: string;
  total_items: number;
  current_index: number;
  completed_items: number;
  correct_items: number;
  session_type:
    | 'MIXED'
    | 'FLASHCARDS_ONLY'
    | 'QUESTIONS_ONLY'
    | 'ERROR_NOTES_ONLY';
  started_at: Date;
  estimated_end_time: Date;
}

export interface UnifiedReviewFilters {
  content_type?: UnifiedContentType;
  deck_id?: string;
  question_list_id?: string;
  error_notebook_id?: string;
  tags?: string[];
  due_only?: boolean;
  limit?: number;

  // ✅ NOVOS: Limites específicos por tipo
  max_questions?: number;
  max_flashcards?: number;
  max_error_notebook?: number;

  // ✅ NOVO: Flag para ignorar limites diários
  ignore_daily_limits?: boolean;

  // ✅ PAGINAÇÃO BASEADA EM CURSOR
  cursor?: string; // ID do último documento da página anterior
  page_size?: number; // Tamanho da página (padrão: 20)
}

export interface PaginatedReviewResult {
  items: UnifiedReviewItem[];
  next_cursor?: string; // Cursor para próxima página
  has_more: boolean; // Se há mais itens
  total_count?: number; // Total estimado (opcional)
}

export interface ReviewSummary {
  total_reviews: number;
  correct_reviews: number;
  accuracy_rate: number;
  average_time_per_review: number;
  total_time_spent: number;
  reviews_by_type: {
    flashcards: number;
    questions: number;
    error_notes: number;
  };
  reviews_by_grade: {
    again: number;
    hard: number;
    good: number;
    easy: number;
  };
}

export interface ReviewItemWithContent extends UnifiedReviewItem {
  content?: {
    question_statement?: string;
    options?: string[];
    correct_answer?: string;
    explanation?: string;
    front_content?: string;
    back_content?: string;
    error_description?: string;
    solution?: string;
  };
}

// Interface para o serviço de revisões unificadas
export interface UnifiedReviewService {
  getDueReviews(userId: string, limit?: number, contentTypes?: UnifiedContentType[]): Promise<UnifiedReviewItem[]>;
  getFutureReviews(userId: string, limit?: number, startDate?: string, endDate?: string): Promise<UnifiedReviewItem[]>;
  recordReview(userId: string, contentId: string, grade: number, reviewTimeMs?: number, isActiveReview?: boolean): Promise<void>;
  getTodayReviews(userId: string, limit?: number): Promise<UnifiedReviewItem[]>;
  getDailySummary(userId: string, date?: Date): Promise<DailyReviewSummary>;
  createReviewItem(userId: string, contentType: UnifiedContentType, contentId: string, metadata?: any): Promise<UnifiedReviewItem>;
  addQuestionToReviews(questionId: string, userId: string): Promise<void>;
  recordQuestionResponse(userId: string, questionId: string, isCorrect: boolean, timeSpent: number): Promise<void>;
  createErrorEntry(userId: string, questionId: string, errorDescription: string, solution?: string): Promise<string>;
  addErrorNoteToReview(entryId: string, userId: string): Promise<void>;
  recordErrorNotebookEntryReview(userId: string, entryId: string, grade: number, reviewTimeMs?: number, isActiveReview?: boolean): Promise<void>;
  recordEntryReview(userId: string, entryId: string, grade: number): Promise<void>;
  recordFlashcardReview(userId: string, flashcardId: string, grade: number, deckId?: string): Promise<void>;
  getQuestionFSRSStats(userId: string): Promise<any>;
  getErrorNotebookFSRSStats(userId: string): Promise<any>;
  getDueQuestions(userId: string, limit?: number): Promise<UnifiedReviewItem[]>;
  getDueErrorNotebookEntries(userId: string, limit?: number): Promise<UnifiedReviewItem[]>;
  getReviewHistory(userId: string, contentId: string): Promise<any[]>;
  getRecentReviews(userId: string, contentId: string, contentType: UnifiedContentType, limit: number): Promise<any[]>;
  deleteReview(userId: string, contentId: string, contentType: UnifiedContentType): Promise<void>;
  getCardScheduledDays(userId: string, contentId: string, contentType: UnifiedContentType): Promise<number>;
}
