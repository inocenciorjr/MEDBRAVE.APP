// Removed Firebase dependency - using ISO string dates

/**
 * FASE 3: Sistema de Caderno de Erros - Types
 * Especificação exata conforme TODO.md
 */

// Adicionar ReviewQuality enum para compatibilidade
export enum ReviewQuality {
  AGAIN = 'AGAIN',
  HARD = 'HARD',
  GOOD = 'GOOD',
  EASY = 'EASY',
}

// Tipo para highlight de texto (marca-texto)
export type HighlightColor = 'yellow' | 'pink' | 'green' | 'blue' | 'orange';

export interface TextHighlight {
  id: string;
  startOffset: number;
  endOffset: number;
  text: string;
  type: 'highlight';
  color: HighlightColor;
}

export interface ErrorNotebookEntry {
  id: string;
  user_id: string;
  question_id: string;

  // Conteúdo da anotação
  user_note: string;
  user_explanation: string;
  key_points: string[];
  tags: string[];

  // Contexto da questão original
  question_statement: string;
  correct_answer: string;
  user_original_answer: string;
  question_subject: string;

  // Status de revisão
  is_in_review_system: boolean;
  last_reviewed_at?: string;

  // Metadados
  difficulty: ErrorNoteDifficulty;
  confidence: number; // 1-5, quão confiante está na explicação

  // Adicionar notebook_id para compatibilidade
  notebook_id?: string;
  alternative_comments?: Record<string, string>;
  
  // Marcações de texto (highlights/marca-texto)
  highlights?: TextHighlight[];

  created_at: string;
  updated_at: string;
}

export enum ErrorNoteDifficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
  VERY_HARD = 'VERY_HARD',
}

export interface CreateErrorNoteDTO {
  user_id: string;
  question_id: string;
  user_note: string;
  user_explanation: string;
  key_points?: string[];
  tags?: string[];
  difficulty?: ErrorNoteDifficulty;
  confidence?: number;
  alternative_comments?: Record<string, string>;
  folder_id?: string;
  highlights?: TextHighlight[];
}

// Adicionar aliases para compatibilidade com use-cases
export interface CreateErrorEntryPayload extends CreateErrorNoteDTO {}

export interface UpdateErrorNoteDTO {
  user_note?: string;
  user_explanation?: string;
  key_points?: string[];
  tags?: string[];
  difficulty?: ErrorNoteDifficulty;
  confidence?: number;
  alternative_comments?: Record<string, string>;
  highlights?: TextHighlight[];
}

// Adicionar alias para compatibilidade com use-cases
export interface UpdateErrorEntryPayload extends UpdateErrorNoteDTO {}

export interface ErrorNoteReviewData {
  entry_id: string;
  question_context: {
    statement: string;
    correct_answer: string;
    subject: string;
  };
  user_content: {
    note: string;
    explanation: string;
    key_points: string[];
  };
  review_prompt: string;
}

/**
 * Opções para listar anotações de erro
 */
export interface GetUserErrorNotesOptions {
  limit?: number;
  page?: number;
  tags?: string[];
  difficulty?: ErrorNoteDifficulty;
  is_in_review_system?: boolean;
}

/**
 * Resultado paginado de anotações de erro
 */
export interface GetUserErrorNotesResult {
  entries: ErrorNotebookEntry[];
  total: number;
  has_more: boolean;
}

/**
 * Estatísticas de anotações de erro do usuário
 */
export interface ErrorNotesStats {
  total_entries: number;
  entries_in_review_system: number;
  entries_by_difficulty: Record<ErrorNoteDifficulty, number>;
  entries_by_subject: Record<string, number>;
  average_confidence: number;
  last_entry_at?: string;
}

// Re-exportar tipos necessários para compatibilidade
export enum ErrorSourceType {
  QUESTION = 'QUESTION',
  FLASHCARD = 'FLASHCARD',
  CUSTOM = 'CUSTOM',
}

// Manter tipos antigos para compatibilidade (deprecated)
export interface ErrorNotebook {
  id: string;
  user_id: string;
  title: string;
  description: string;
  is_public: boolean;
  entry_count: number;
  last_entry_at: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface ErrorNotebookStats {
  total_entries: number;
  resolved_entries: number;
  unresolved_entries: number;
  entries_by_category: Record<string, number>;
  last_updated_at: string;
  average_resolution_time: number;
}

export interface CreateErrorNotebookPayload {
  user_id: string;
  title: string;
  description?: string;
  is_public?: boolean;
  tags?: string[];
}

export interface UpdateErrorNotebookPayload {
  title?: string;
  description?: string;
  is_public?: boolean;
  tags?: string[];
}

export interface ListErrorNotebooksOptions {
  limit?: number;
  page?: number;
  last_doc_id?: string;
  search?: string;
  tags?: string[];
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface PaginatedErrorNotebooksResult {
  items: ErrorNotebook[];
  total: number;
  has_more: boolean;
  last_doc_id?: string;
}

export interface ListErrorEntriesOptions {
  limit?: number;
  page?: number;
  is_resolved?: boolean;
  category?: string;
  tags?: string[];
  importance?: number;
  source_type?: ErrorSourceType;
}

export interface PaginatedErrorEntriesResult {
  entries: ErrorNotebookEntry[];
  total: number;
  hasMore: boolean;
}

export interface SearchEntriesOptions {
  limit?: number;
  page?: number;
  tags?: string[];
  category?: string;
  subcategory?: string;
  importance?: number;
  sourceType?: ErrorSourceType;
}
