export type TaskSource = 'system' | 'user' | 'mentor' | 'admin';

export type TaskType = 
  | 'flashcard-review'      // Revisão de flashcards
  | 'question-review'       // Revisão de questões
  | 'error-notebook-review' // Revisão de caderno de erros
  | 'study-session'         // Sessão de estudo manual
  | 'mentor-activity'       // Atividade adicionada por mentor
  | 'admin-activity'        // Atividade adicionada por admin
  | 'custom';               // Outras atividades personalizadas

export interface TaskPermissions {
  canChangeDays: boolean;      // Pode arrastar para outros dias
  canChangeTime: boolean;      // Pode mudar horário no mesmo dia
  canChangeDuration: boolean;  // Pode redimensionar
  canDelete: boolean;          // Pode deletar
  canEdit: boolean;            // Pode editar detalhes
}

export interface PlannerTask {
  id: string;
  type: 'task';
  title: string;
  description?: string;
  time: string | null; // HH:mm format
  duration: number; // minutes
  color: string;
  completed: boolean;
  
  // Novos campos para controle extensível
  taskType: TaskType;
  source: TaskSource;
  permissions: TaskPermissions;
  
  // Dados específicos por tipo
  metadata?: {
    count?: number;              // Para revisões: quantidade de itens
    reviewIds?: string[];        // IDs dos itens a revisar
    createdBy?: string;          // ID do criador (mentor/admin)
    createdByName?: string;      // Nome do criador
    originalDate?: string;       // Data original (YYYY-MM-DD)
    [key: string]: any;          // Extensível para futuros campos
  };
}

export interface PlannerReview {
  id: string;
  type: 'review';
  content_type: 'QUESTION' | 'FLASHCARD' | 'ERROR_NOTEBOOK';
  title: string;
  subtitle?: string;
  time: string | null; // HH:mm format
  duration: number; // minutes
  color: string;
  
  // Novos campos para controle
  source: TaskSource;
  permissions: TaskPermissions;
  
  metadata?: {
    count?: number;
    reviewIds?: string[];
    originalDate?: string;
    [key: string]: any;
  };
}

export type PlannerItem = PlannerTask | PlannerReview;

// Helper para criar permissões padrão baseado na fonte
export const getDefaultPermissions = (source: TaskSource): TaskPermissions => {
  switch (source) {
    case 'system':
      return {
        canChangeDays: false,      // Revisões não podem mudar de dia
        canChangeTime: true,       // Mas podem mudar horário
        canChangeDuration: true,   // E duração
        canDelete: false,          // Não podem ser deletadas
        canEdit: false,            // Não podem editar detalhes
      };
    case 'user':
      return {
        canChangeDays: true,       // Total controle
        canChangeTime: true,
        canChangeDuration: true,
        canDelete: true,
        canEdit: true,
      };
    case 'mentor':
      return {
        canChangeDays: true,       // Usuário pode reorganizar
        canChangeTime: true,
        canChangeDuration: true,
        canDelete: false,          // Mas não deletar
        canEdit: false,            // Nem editar (só mentor pode)
      };
    case 'admin':
      return {
        canChangeDays: false,      // Admin define e usuário não move
        canChangeTime: true,       // Mas pode ajustar horário
        canChangeDuration: true,
        canDelete: false,
        canEdit: false,
      };
  }
};

// Helper para obter cor padrão por tipo de tarefa
export const getTaskTypeColor = (taskType: TaskType): string => {
  switch (taskType) {
    case 'flashcard-review':
      return 'bg-blue-500';
    case 'question-review':
      return 'bg-green-500';
    case 'error-notebook-review':
      return 'bg-red-500';
    case 'study-session':
      return 'bg-purple-500';
    case 'mentor-activity':
      return 'bg-orange-500';
    case 'admin-activity':
      return 'bg-pink-500';
    default:
      return 'bg-gray-500';
  }
};

// Helper para obter cor por content_type (reviews)
export const getReviewTypeColor = (contentType: 'QUESTION' | 'FLASHCARD' | 'ERROR_NOTEBOOK'): string => {
  switch (contentType) {
    case 'FLASHCARD':
      return 'bg-blue-500';
    case 'QUESTION':
      return 'bg-green-500';
    case 'ERROR_NOTEBOOK':
      return 'bg-red-500';
  }
};

// Helper para obter ícone por tipo
export const getTaskTypeIcon = (taskType: TaskType): string => {
  switch (taskType) {
    case 'flashcard-review':
      return '🎴';
    case 'question-review':
      return '❓';
    case 'error-notebook-review':
      return '📕';
    case 'study-session':
      return '📚';
    case 'mentor-activity':
      return '👨‍🏫';
    case 'admin-activity':
      return '⚙️';
    default:
      return '📝';
  }
};

// Helper para obter ícone por content_type (reviews)
export const getReviewTypeIcon = (contentType: 'QUESTION' | 'FLASHCARD' | 'ERROR_NOTEBOOK'): string => {
  switch (contentType) {
    case 'FLASHCARD':
      return '🎴';
    case 'QUESTION':
      return '❓';
    case 'ERROR_NOTEBOOK':
      return '📕';
  }
};
