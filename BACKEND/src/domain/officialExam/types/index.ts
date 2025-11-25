// Types for Official Exams feature

export interface OfficialExam {
  id: string;
  title: string;
  universityId?: string; // ID do subfiltro de universidade
  examTypeFilterId?: string; // ID do filtro de tipo de prova (Revalida, Residência Médica, R3, etc)
  questionIds: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  // Novas colunas adicionadas
  isPublished?: boolean; // Se a prova está publicada
  examType?: string; // Tipo da prova (texto livre)
  examYear?: number; // Ano da prova
  examName?: string; // Nome alternativo da prova
  description?: string; // Descrição da prova
  instructions?: string; // Instruções para realizar a prova
  timeLimitMinutes?: number; // Tempo limite em minutos
}

export interface CreateOfficialExamPayload {
  title: string;
  universityId?: string; // ID do subfiltro de universidade
  examTypeFilterId?: string; // ID do filtro de tipo de prova
  questionIds: string[];
  tags?: string[];
  createdBy: string;
  // Campos opcionais
  isPublished?: boolean;
  examType?: string;
  examYear?: number;
  examName?: string;
  description?: string;
  instructions?: string;
  timeLimitMinutes?: number;
}

export interface BulkCreateQuestionsWithOfficialExamPayload {
  questions: any[]; // Will use CreateQuestionPayload from questions domain
  officialExam: Omit<CreateOfficialExamPayload, 'questionIds' | 'createdBy'>;
}

export interface ListOfficialExamsOptions {
  limit?: number;
  page?: number;
  examType?: string;
  examYear?: number;
  isPublished?: boolean;
  tags?: string[];
  query?: string;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export interface PaginatedOfficialExamsResult {
  exams: OfficialExam[];
  totalCount: number;
  hasMore: boolean;
  page: number;
  limit: number;
}

export interface UpdateOfficialExamPayload {
  title?: string;
  universityId?: string;
  examTypeFilterId?: string;
  questionIds?: string[];
  tags?: string[];
  isPublished?: boolean;
  examType?: string;
  examYear?: number;
  examName?: string;
  description?: string;
  instructions?: string;
  timeLimitMinutes?: number;
}
