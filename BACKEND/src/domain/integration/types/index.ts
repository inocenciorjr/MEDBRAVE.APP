import {
  DataJob,
  DataJobType,
  DataFormat,
  DataJobStatus,
  CreateDataJobDTO,
  UpdateDataJobStatusDTO,
  GetDataJobsOptions,
} from '../../../infra/integration/types';

export {
  DataJob,
  DataJobType,
  DataFormat,
  DataJobStatus,
  CreateDataJobDTO,
  UpdateDataJobStatusDTO,
  GetDataJobsOptions,
};

/**
 * Interface para respostas da API de jobs de dados
 */
export interface DataJobResponse {
  success: boolean;
  data: DataJob;
}

/**
 * Interface para respostas da API de listagem de jobs de dados
 */
export interface DataJobsListResponse {
  success: boolean;
  data: DataJob[];
  meta: {
    total: number;
  };
}

/**
 * Interface para respostas de erro da API
 */
export interface ErrorResponse {
  success: boolean;
  error: {
    code: string;
    message: string;
  };
}
