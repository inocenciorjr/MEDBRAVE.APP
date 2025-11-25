import { supabase } from '../../../config/supabase';
import { IDataImportExportService } from '../interfaces/IDataImportExportService';
import {
  DataJob,
  CreateDataJobDTO,
  UpdateDataJobStatusDTO,
  GetDataJobsOptions,
  DataJobStatus,
  DataJobType,
  DataFormat,
} from '../types';
import logger from '../../../utils/logger';

/**
 * Tabela para armazenar jobs de importação/exportação
 */
const DATA_JOBS_TABLE = 'data_jobs';

/**
 * Implementação do serviço de importação e exportação usando Supabase
 */
export class SupabaseDataImportExportService
implements IDataImportExportService {
  /**
   * Cria um novo job de importação/exportação de dados
   */
  async createDataJob(jobData: CreateDataJobDTO): Promise<DataJob> {
    const now = new Date();

    const newJob = {
      ...jobData,
      status: DataJobStatus.PENDING,
      progress: 0,
      total_records: null,
      processed_records: 0,
      started_at: null,
      completed_at: null,
      result_url: null,
      error: null,
      created_at: now,
      updated_at: now,
    };

    try {
      const { data, error } = await supabase
        .from(DATA_JOBS_TABLE)
        .insert([newJob])
        .select()
        .single();

      if (error) {
        throw error;
      }

      const job: DataJob = {
        id: data.id,
        type: data.type,
        name: data.name,
        description: data.description,
        collection: data.collection,
        format: data.format,
        query: data.query,
        mappings: data.mappings,
        sourceUrl: data.source_url,
        createdBy: data.created_by,
        status: data.status,
        progress: data.progress,
        totalRecords: data.total_records,
        processedRecords: data.processed_records,
        startedAt: data.started_at ? new Date(data.started_at) : null,
        completedAt: data.completed_at ? new Date(data.completed_at) : null,
        resultUrl: data.result_url,
        error: data.error,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      };

      logger.info(
        `Job de ${jobData.type === DataJobType.IMPORT ? 'importação' : 'exportação'} (ID: ${job.id}) criado com sucesso.`,
      );
      return job;
    } catch (error) {
      logger.error(
        `Erro ao criar job de ${jobData.type === DataJobType.IMPORT ? 'importação' : 'exportação'}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Busca um job de importação/exportação pelo ID
   */
  async getDataJobById(jobId: string): Promise<DataJob | null> {
    try {
      const { data, error } = await supabase
        .from(DATA_JOBS_TABLE)
        .select('*')
        .eq('id', jobId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          logger.warn(
            `Job de importação/exportação (ID: ${jobId}) não encontrado.`,
          );
          return null;
        }
        throw error;
      }

      const job: DataJob = {
        id: data.id,
        type: data.type,
        name: data.name,
        description: data.description,
        collection: data.collection,
        format: data.format,
        query: data.query,
        mappings: data.mappings,
        sourceUrl: data.source_url,
        createdBy: data.created_by,
        status: data.status,
        progress: data.progress,
        totalRecords: data.total_records,
        processedRecords: data.processed_records,
        startedAt: data.started_at ? new Date(data.started_at) : null,
        completedAt: data.completed_at ? new Date(data.completed_at) : null,
        resultUrl: data.result_url,
        error: data.error,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      };

      return job;
    } catch (error) {
      logger.error(
        `Erro ao buscar job de importação/exportação (ID: ${jobId}):`,
        error,
      );
      throw error;
    }
  }

  /**
   * Busca jobs de importação/exportação com opções de filtro
   */
  async getDataJobs(
    options: GetDataJobsOptions = {},
  ): Promise<{ jobs: DataJob[]; total: number }> {
    try {
      let query = supabase
        .from(DATA_JOBS_TABLE)
        .select('*', { count: 'exact' });

      // Aplicar filtros
      if (options.type) {
        query = query.eq('type', options.type);
      }

      if (options.status) {
        query = query.eq('status', options.status);
      }

      if (options.collection) {
        query = query.eq('collection', options.collection);
      }

      if (options.createdBy) {
        query = query.eq('created_by', options.createdBy);
      }

      if (options.startDate) {
        query = query.gte('created_at', options.startDate.toISOString());
      }

      if (options.endDate) {
        query = query.lte('created_at', options.endDate.toISOString());
      }

      // Ordenação
      const orderBy = options.orderByCreatedAt || 'desc';
      query = query.order('created_at', { ascending: orderBy === 'asc' });

      // Paginação
      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.offset) {
        query = query.range(
          options.offset,
          options.offset + (options.limit || 10) - 1,
        );
      }

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      const jobs: DataJob[] = (data || []).map((item) => ({
        id: item.id,
        type: item.type,
        name: item.name,
        description: item.description,
        collection: item.collection,
        format: item.format,
        query: item.query,
        mappings: item.mappings,
        sourceUrl: item.source_url,
        createdBy: item.created_by,
        status: item.status,
        progress: item.progress,
        totalRecords: item.total_records,
        processedRecords: item.processed_records,
        startedAt: item.started_at ? new Date(item.started_at) : null,
        completedAt: item.completed_at ? new Date(item.completed_at) : null,
        resultUrl: item.result_url,
        error: item.error,
        createdAt: new Date(item.created_at),
        updatedAt: new Date(item.updated_at),
      }));

      return {
        jobs,
        total: count || 0,
      };
    } catch (error) {
      logger.error('Erro ao buscar jobs de importação/exportação:', error);
      throw error;
    }
  }

  /**
   * Atualiza o status de um job
   */
  async updateDataJobStatus(
    jobId: string,
    status: DataJobStatus,
    updates: UpdateDataJobStatusDTO = {},
  ): Promise<DataJob | null> {
    try {
      const updateData: any = {
        status,
        updated_at: new Date(),
      };

      if (updates.progress !== undefined) {
        updateData.progress = updates.progress;
      }

      if (updates.totalRecords !== undefined) {
        updateData.total_records = updates.totalRecords;
      }

      if (updates.processedRecords !== undefined) {
        updateData.processed_records = updates.processedRecords;
      }

      if (updates.resultUrl !== undefined) {
        updateData.result_url = updates.resultUrl;
      }

      if (updates.error !== undefined) {
        updateData.error = updates.error;
      }

      // Definir timestamps baseado no status
      if (status === DataJobStatus.RUNNING && !updates.started_at) {
        updateData.started_at = new Date();
      }

      if (
        [
          DataJobStatus.COMPLETED,
          DataJobStatus.FAILED,
          DataJobStatus.CANCELLED,
        ].includes(status)
      ) {
        updateData.completed_at = new Date();
      }

      const { data, error } = await supabase
        .from(DATA_JOBS_TABLE)
        .update(updateData)
        .eq('id', jobId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          logger.warn(
            `Job de importação/exportação (ID: ${jobId}) não encontrado para atualização.`,
          );
          return null;
        }
        throw error;
      }

      const job: DataJob = {
        id: data.id,
        type: data.type,
        name: data.name,
        description: data.description,
        collection: data.collection,
        format: data.format,
        query: data.query,
        mappings: data.mappings,
        sourceUrl: data.source_url,
        createdBy: data.created_by,
        status: data.status,
        progress: data.progress,
        totalRecords: data.total_records,
        processedRecords: data.processed_records,
        startedAt: data.started_at ? new Date(data.started_at) : null,
        completedAt: data.completed_at ? new Date(data.completed_at) : null,
        resultUrl: data.result_url,
        error: data.error,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      };

      logger.info(`Status do job (ID: ${jobId}) atualizado para ${status}.`);
      return job;
    } catch (error) {
      logger.error(`Erro ao atualizar status do job (ID: ${jobId}):`, error);
      throw error;
    }
  }

  /**
   * Cancela um job em andamento
   */
  async cancelDataJob(jobId: string): Promise<DataJob | null> {
    try {
      return await this.updateDataJobStatus(jobId, DataJobStatus.CANCELLED);
    } catch (error) {
      logger.error(`Erro ao cancelar job (ID: ${jobId}):`, error);
      throw error;
    }
  }

  /**
   * Exclui um job
   */
  async deleteDataJob(jobId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from(DATA_JOBS_TABLE)
        .delete()
        .eq('id', jobId);

      if (error) {
        throw error;
      }

      logger.info(`Job (ID: ${jobId}) excluído com sucesso.`);
    } catch (error) {
      logger.error(`Erro ao excluir job (ID: ${jobId}):`, error);
      throw error;
    }
  }

  /**
   * Executa um job de exportação
   */
  async executeExportJob(jobId: string): Promise<void> {
    try {
      const job = await this.getDataJobById(jobId);
      if (!job) {
        throw new Error(`Job (ID: ${jobId}) não encontrado.`);
      }

      if (job.type !== DataJobType.EXPORT) {
        throw new Error(`Job (ID: ${jobId}) não é um job de exportação.`);
      }

      if (job.status !== DataJobStatus.PENDING) {
        throw new Error(`Job (ID: ${jobId}) não está pendente.`);
      }

      // Atualizar status para RUNNING
      await this.updateDataJobStatus(jobId, DataJobStatus.RUNNING);

      logger.info(`Iniciando execução do job de exportação (ID: ${jobId}).`);

      // Implementar lógica de exportação aqui
      // Por enquanto, apenas simular o processo
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Atualizar status para COMPLETED
      await this.updateDataJobStatus(jobId, DataJobStatus.COMPLETED, {
        progress: 100,
        processedRecords: 0,
        totalRecords: 0,
      });

      logger.info(`Job de exportação (ID: ${jobId}) concluído com sucesso.`);
    } catch (error) {
      logger.error(`Erro ao executar job de exportação (ID: ${jobId}):`, error);
      await this.updateDataJobStatus(jobId, DataJobStatus.FAILED, {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
      throw error;
    }
  }

  /**
   * Executa um job de importação
   */
  async executeImportJob(jobId: string): Promise<void> {
    try {
      const job = await this.getDataJobById(jobId);
      if (!job) {
        throw new Error(`Job (ID: ${jobId}) não encontrado.`);
      }

      if (job.type !== DataJobType.IMPORT) {
        throw new Error(`Job (ID: ${jobId}) não é um job de importação.`);
      }

      if (job.status !== DataJobStatus.PENDING) {
        throw new Error(`Job (ID: ${jobId}) não está pendente.`);
      }

      // Atualizar status para RUNNING
      await this.updateDataJobStatus(jobId, DataJobStatus.RUNNING);

      logger.info(`Iniciando execução do job de importação (ID: ${jobId}).`);

      // Implementar lógica de importação aqui
      // Por enquanto, apenas simular o processo
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Atualizar status para COMPLETED
      await this.updateDataJobStatus(jobId, DataJobStatus.COMPLETED, {
        progress: 100,
        processedRecords: 0,
        totalRecords: 0,
      });

      logger.info(`Job de importação (ID: ${jobId}) concluído com sucesso.`);
    } catch (error) {
      logger.error(`Erro ao executar job de importação (ID: ${jobId}):`, error);
      await this.updateDataJobStatus(jobId, DataJobStatus.FAILED, {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
      throw error;
    }
  }

  /**
   * Alias para getDataJobById - obtém status de um job
   */
  async getJobStatus(jobId: string): Promise<DataJob | null> {
    return this.getDataJobById(jobId);
  }

  /**
   * Alias para cancelDataJob - cancela um job
   */
  async cancelJob(jobId: string): Promise<DataJob | null> {
    return this.cancelDataJob(jobId);
  }

  /**
   * Alias para getDataJobs - lista jobs com filtros
   */
  async listJobs(options: GetDataJobsOptions = {}): Promise<DataJob[]> {
    const result = await this.getDataJobs(options);
    return result.jobs;
  }

  /**
   * Exporta dados para um arquivo
   */
  async exportData(params: {
    tableName: string;
    format: DataFormat;
    filters?: Record<string, any>;
  }): Promise<string> {
    const job = await this.createDataJob({
      type: DataJobType.EXPORT,
      name: `Export ${params.tableName}`,
      description: `Exportação de ${params.tableName} para ${params.format}`,
      collection: params.tableName,
      format: params.format,
      query: params.filters || {},
      createdBy: 'system',
    });

    await this.executeExportJob(job.id);
    return job.id;
  }

  /**
   * Importa dados de um arquivo
   */
  async importData(params: {
    tableName: string;
    format: DataFormat;
    filePath: string;
    options?: Record<string, any>;
  }): Promise<string> {
    const job = await this.createDataJob({
      type: DataJobType.IMPORT,
      name: `Import ${params.tableName}`,
      description: `Importação de ${params.tableName} de ${params.format}`,
      collection: params.tableName,
      format: params.format,
      sourceUrl: params.filePath,
      mappings: params.options || {},
      createdBy: 'system',
    });

    await this.executeImportJob(job.id);
    return job.id;
  }
}
