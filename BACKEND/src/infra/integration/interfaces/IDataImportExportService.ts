import {
  DataJob,
  CreateDataJobDTO,
  UpdateDataJobStatusDTO,
  GetDataJobsOptions,
  DataJobStatus,
} from '../types';

/**
 * Interface para o serviço de importação e exportação de dados
 */
export interface IDataImportExportService {
  /**
   * Cria um novo job de importação/exportação de dados
   * @param jobData Dados do job a ser criado
   * @returns O job criado
   */
  createDataJob(jobData: CreateDataJobDTO): Promise<DataJob>;

  /**
   * Busca um job pelo ID
   * @param jobId ID do job a ser buscado
   * @returns O job ou null se não encontrado
   */
  getDataJobById(jobId: string): Promise<DataJob | null>;

  /**
   * Lista jobs com filtros e paginação
   * @param options Opções de filtro e paginação
   * @returns Lista de jobs e total
   */
  getDataJobs(options?: GetDataJobsOptions): Promise<{ jobs: DataJob[]; total: number }>;

  /**
   * Atualiza o status de um job
   * @param jobId ID do job a ser atualizado
   * @param status Novo status do job
   * @param updates Atualizações adicionais
   * @returns O job atualizado ou null se não encontrado
   */
  updateDataJobStatus(
    jobId: string,
    status: DataJobStatus,
    updates?: UpdateDataJobStatusDTO,
  ): Promise<DataJob | null>;

  /**
   * Cancela um job em andamento
   * @param jobId ID do job a ser cancelado
   * @returns O job cancelado ou null se não encontrado
   */
  cancelDataJob(jobId: string): Promise<DataJob | null>;

  /**
   * Exclui um job
   * @param jobId ID do job a ser excluído
   */
  deleteDataJob(jobId: string): Promise<void>;

  /**
   * Executa um job de exportação
   * @param jobId ID do job de exportação a ser executado
   */
  executeExportJob(jobId: string): Promise<void>;

  /**
   * Executa um job de importação
   * @param jobId ID do job de importação a ser executado
   */
  executeImportJob(jobId: string): Promise<void>;
}
