import { Timestamp } from 'firebase-admin/firestore';

/**
 * Enum para tipos de jobs de dados
 */
export enum DataJobType {
  IMPORT = 'import',
  EXPORT = 'export',
}

/**
 * Enum para formatos de dados suportados
 */
export enum DataFormat {
  JSON = 'json',
  CSV = 'csv',
  EXCEL = 'excel',
}

/**
 * Enum para status de jobs de dados
 */
export enum DataJobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * Interface para um job de importação/exportação de dados
 */
export interface DataJob {
  id: string;
  type: DataJobType;
  name: string;
  description?: string | null;
  collection: string;
  format: DataFormat;
  query?: Record<string, any> | null;
  mappings?: Record<string, string> | null;
  status: DataJobStatus;
  progress?: number | null;
  totalRecords?: number | null;
  processedRecords?: number | null;
  startedAt?: Timestamp | null;
  completedAt?: Timestamp | null;
  sourceUrl?: string | null;
  resultUrl?: string | null;
  error?: string | null;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Interface para criar um novo job de dados
 */
export type CreateDataJobDTO = Omit<
  DataJob,
  | 'id'
  | 'status'
  | 'progress'
  | 'totalRecords'
  | 'processedRecords'
  | 'startedAt'
  | 'completedAt'
  | 'resultUrl'
  | 'error'
  | 'createdAt'
  | 'updatedAt'
>;

/**
 * Interface para atualização de status de um job
 */
export interface UpdateDataJobStatusDTO {
  progress?: number;
  totalRecords?: number;
  processedRecords?: number;
  resultUrl?: string;
  error?: string;
}

/**
 * Interface para opções de listagem de jobs
 */
export interface GetDataJobsOptions {
  type?: DataJobType;
  status?: DataJobStatus;
  collection?: string;
  createdBy?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
  orderByCreatedAt?: 'asc' | 'desc';
}
