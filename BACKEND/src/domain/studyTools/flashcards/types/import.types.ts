export enum ImportStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

export interface ImportProgress {
  phase: string;
  percentage: number;
  currentItem: string;
  processed: number;
  total: number;
  errors: string[];
  warnings: string[];
  isPaused: boolean;
}

export interface ImportSession {
  id: string;
  user_id: string;
  file_name: string;
  file_size: number;
  status: ImportStatus;
  progress: ImportProgress;
  created_at: Date;
  updated_at: Date;
  completed_at?: Date;
  result_deck_id?: string;
  error_message?: string;
}

export interface CreateImportSessionDTO {
  user_id: string;
  file_name: string;
  file_size: number;
}

export interface UpdateImportStatusDTO {
  status: ImportStatus;
  progress?: ImportProgress;
  completed_at?: string;
  result_deck_id?: string;
  error_message?: string;
}