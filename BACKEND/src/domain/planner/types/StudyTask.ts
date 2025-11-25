export interface StudyTask {
  id: string;
  userId: string;
  type:
    | 'FSRS_REVIEW'
    | 'LIST_REVIEW'
    | 'SIMULADO'
    | 'MANUAL'
    | 'RECOMMENDATION';
  title: string;
  description?: string;
  scheduledDate: string; // ISO date
  status: 'PENDING' | 'COMPLETED' | 'SKIPPED' | 'POSTPONED';
  relatedQuestionIds?: string[];
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  createdAt: string;
  updatedAt: string;
  source?: 'UNIFIED_REVIEW' | 'ANALYTICS' | 'USER';
  // Campos para tarefas manuais
  manualType?:
    | 'LISTA_QUESTOES'
    | 'SIMULADO'
    | 'PROVA_INTEGRA'
    | 'FLASHCARDS'
    | 'OUTRO';
  targetUrl?: string; // Link para página da atividade
  metadata?: Record<string, any>; // Dados extras (ex: id da lista, tema, etc)
}
