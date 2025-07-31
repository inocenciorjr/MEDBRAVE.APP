import { Timestamp } from 'firebase-admin/firestore';
import { FSRSState } from '../../../srs/services/FSRSService';

export enum UnifiedContentType {
  FLASHCARD = 'FLASHCARD',
  QUESTION = 'QUESTION', 
  ERROR_NOTEBOOK = 'ERROR_NOTEBOOK'
}

export interface UnifiedReviewItem {
  id: string;
  userId: string;
  contentType: UnifiedContentType;
  contentId: string;
  
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
  
  // Metadados enriquecidos
  title: string;
  subtitle?: string;
  tags?: string[];
  
  // Específicos por tipo
  deckId?: string; // Para flashcards
  questionListId?: string; // Para questões
  errorNotebookId?: string; // Para caderno de erros
  questionStatement?: string; // Para questões
  errorDescription?: string; // Para caderno de erros
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface DailyReviewSummary {
  totalItems: number;
  todayItems: number;
  oldItems: number;
  todayReviews?: UnifiedReviewItem[]; // Revisões de hoje para exibir no dashboard
  flashcards: number;
  questions: number;
  errorNotes: number;
  estimatedTimeMinutes: number;
  breakdown: {
    byDeck: Array<{ deckId: string; name: string; count: number }>;
    bySubject: Array<{ subject: string; count: number }>;
    byDifficulty: Array<{ difficulty: string; count: number }>;
  };
}

export interface CreateUnifiedReviewDTO {
  userId: string;
  contentType: UnifiedContentType;
  contentId: string;
  metadata?: Record<string, any>;
}

export interface ReviewSessionProgress {
  sessionId: string;
  totalItems: number;
  currentIndex: number;
  completedItems: number;
  correctItems: number;
  sessionType: 'MIXED' | 'FLASHCARDS_ONLY' | 'QUESTIONS_ONLY' | 'ERROR_NOTES_ONLY';
  startedAt: Date;
  estimatedEndTime: Date;
}

export interface UnifiedReviewFilters {
  contentType?: UnifiedContentType;
  deckId?: string;
  questionListId?: string;
  errorNotebookId?: string;
  tags?: string[];
  dueOnly?: boolean;
  limit?: number;
  
  // ✅ NOVOS: Limites específicos por tipo
  maxQuestions?: number;
  maxFlashcards?: number;
  maxErrorNotebook?: number;
  
  // ✅ NOVO: Flag para ignorar limites diários
  ignoreDailyLimits?: boolean;
  
  // ✅ PAGINAÇÃO BASEADA EM CURSOR
  cursor?: string;        // ID do último documento da página anterior
  pageSize?: number;      // Tamanho da página (padrão: 20)
}

export interface PaginatedReviewResult {
  items: UnifiedReviewItem[];
  nextCursor?: string;    // Cursor para próxima página
  hasMore: boolean;       // Se há mais itens
  totalCount?: number;    // Total estimado (opcional)
}