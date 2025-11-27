export interface OfficialExam {
  id: string;
  universityId: string;
  title: string;
  questionIds: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  examTypeFilterId?: string; // ID do filtro de tipo (Revalida, Residência Médica, R3, etc)
  // Campos adicionais
  isPublished?: boolean; // Se a prova está publicada
  examType?: string; // Tipo da prova (texto livre)
  examYear?: number; // Ano da prova
  examName?: string; // Nome alternativo da prova
  description?: string; // Descrição da prova
  instructions?: string; // Instruções para realizar a prova
  timeLimitMinutes?: number; // Tempo limite em minutos
}

export interface ExamInstitution {
  id: string;
  name: string;
  region?: string;
  exams: OfficialExam[];
  examCount: number;
}

export interface ExamFilters {
  search: string;
  region: string;
  institution: string;
  type: string;
}
