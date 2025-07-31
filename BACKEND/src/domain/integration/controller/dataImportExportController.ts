import { Request, Response, NextFunction } from 'express';
import { DataJobType, DataFormat, DataJobStatus } from '../../../infra/integration/types';
import { IDataImportExportService } from '../../../infra/integration/interfaces/IDataImportExportService';
import { ErrorCodes, createError } from '../../../utils/errors';
import logger from '../../../utils/logger';

export class DataImportExportController {
  constructor(private dataImportExportService: IDataImportExportService) {}

  /**
   * Cria um novo job de importação/exportação
   */
  async createDataJob(req: Request, res: Response, next: NextFunction) {
    try {
      const { type, name, description, collection, format, query, mappings, sourceUrl } = req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        throw createError(ErrorCodes.UNAUTHORIZED, 'Usuário não autenticado');
      }

      // Validar dados obrigatórios
      if (!type || !Object.values(DataJobType).includes(type)) {
        throw createError(ErrorCodes.INVALID_INPUT, 'Tipo de job inválido');
      }

      if (!name) {
        throw createError(ErrorCodes.INVALID_INPUT, 'Nome do job é obrigatório');
      }

      if (!collection) {
        throw createError(ErrorCodes.INVALID_INPUT, 'Coleção é obrigatória');
      }

      if (!format || !Object.values(DataFormat).includes(format)) {
        throw createError(ErrorCodes.INVALID_INPUT, 'Formato inválido');
      }

      // Validar URL de origem para jobs de importação
      if (type === DataJobType.IMPORT && !sourceUrl) {
        throw createError(
          ErrorCodes.INVALID_INPUT,
          'URL de origem é obrigatória para jobs de importação',
        );
      }

      const job = await this.dataImportExportService.createDataJob({
        type,
        name,
        description,
        collection,
        format,
        query,
        mappings,
        sourceUrl,
        createdBy: userId,
      });

      // Se for um job de importação ou exportação, iniciar a execução em segundo plano
      if (type === DataJobType.IMPORT) {
        // Iniciar execução em segundo plano para não bloquear a resposta
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.dataImportExportService.executeImportJob(job.id).catch(error => {
          logger.error(`Erro na execução de job de importação (ID: ${job.id}):`, error);
        });
      } else if (type === DataJobType.EXPORT) {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.dataImportExportService.executeExportJob(job.id).catch(error => {
          logger.error(`Erro na execução de job de exportação (ID: ${job.id}):`, error);
        });
      }

      return res.status(201).json({
        success: true,
        data: job,
      });
    } catch (error) {
      next(error);
      return;
    }
  }

  /**
   * Obtém um job pelo ID
   */
  async getDataJobById(req: Request, res: Response, next: NextFunction) {
    try {
      const { jobId } = req.params;
      const userId = (req as any).user?.id;

      if (!userId) {
        throw createError(ErrorCodes.UNAUTHORIZED, 'Usuário não autenticado');
      }

      const job = await this.dataImportExportService.getDataJobById(jobId);

      if (!job) {
        throw createError(ErrorCodes.NOT_FOUND, 'Job não encontrado');
      }

      // Verificar se o usuário tem acesso ao job (admin ou criador)
      if (job.createdBy !== userId && (req as any).user?.role !== 'ADMIN') {
        throw createError(ErrorCodes.FORBIDDEN, 'Acesso negado ao job');
      }

      return res.status(200).json({
        success: true,
        data: job,
      });
    } catch (error) {
      next(error);
      return;
    }
  }

  /**
   * Lista jobs com filtros e paginação
   */
  async getDataJobs(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        throw createError(ErrorCodes.UNAUTHORIZED, 'Usuário não autenticado');
      }

      const { type, status, collection, startDate, endDate, limit, offset, orderByCreatedAt } =
        req.query;

      const isAdmin = (req as any).user?.role === 'ADMIN';

      // Se não for admin, filtrar apenas pelos próprios jobs
      const createdBy = isAdmin ? (req.query.createdBy as string) : userId;

      const result = await this.dataImportExportService.getDataJobs({
        type: type as DataJobType,
        status: status as DataJobStatus,
        collection: collection as string,
        createdBy,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined,
        orderByCreatedAt: orderByCreatedAt as 'asc' | 'desc',
      });

      return res.status(200).json({
        success: true,
        data: result.jobs,
        meta: {
          total: result.total,
        },
      });
    } catch (error) {
      next(error);
      return;
    }
  }

  /**
   * Cancela um job em andamento
   */
  async cancelDataJob(req: Request, res: Response, next: NextFunction) {
    try {
      const { jobId } = req.params;
      const userId = (req as any).user?.id;

      if (!userId) {
        throw createError(ErrorCodes.UNAUTHORIZED, 'Usuário não autenticado');
      }

      const job = await this.dataImportExportService.getDataJobById(jobId);

      if (!job) {
        throw createError(ErrorCodes.NOT_FOUND, 'Job não encontrado');
      }

      // Verificar se o usuário tem acesso ao job (admin ou criador)
      if (job.createdBy !== userId && (req as any).user?.role !== 'ADMIN') {
        throw createError(ErrorCodes.FORBIDDEN, 'Acesso negado ao job');
      }

      const cancelledJob = await this.dataImportExportService.cancelDataJob(jobId);

      if (!cancelledJob) {
        throw createError(ErrorCodes.INTERNAL_SERVER_ERROR, 'Não foi possível cancelar o job');
      }

      return res.status(200).json({
        success: true,
        data: cancelledJob,
      });
    } catch (error) {
      next(error);
      return;
    }
  }

  /**
   * Exclui um job
   */
  async deleteDataJob(req: Request, res: Response, next: NextFunction) {
    try {
      const { jobId } = req.params;
      const userId = (req as any).user?.id;

      if (!userId) {
        throw createError(ErrorCodes.UNAUTHORIZED, 'Usuário não autenticado');
      }

      const job = await this.dataImportExportService.getDataJobById(jobId);

      if (!job) {
        throw createError(ErrorCodes.NOT_FOUND, 'Job não encontrado');
      }

      // Apenas admin ou o próprio criador pode excluir
      if (job.createdBy !== userId && (req as any).user?.role !== 'ADMIN') {
        throw createError(ErrorCodes.FORBIDDEN, 'Acesso negado ao job');
      }

      await this.dataImportExportService.deleteDataJob(jobId);

      return res.status(200).json({
        success: true,
        message: 'Job excluído com sucesso',
      });
    } catch (error) {
      next(error);
      return;
    }
  }

  /**
   * Executa um job de importação manualmente
   */
  async executeImportJob(req: Request, res: Response, next: NextFunction) {
    try {
      const { jobId } = req.params;
      const userId = (req as any).user?.id;

      if (!userId) {
        throw createError(ErrorCodes.UNAUTHORIZED, 'Usuário não autenticado');
      }

      const job = await this.dataImportExportService.getDataJobById(jobId);

      if (!job) {
        throw createError(ErrorCodes.NOT_FOUND, 'Job não encontrado');
      }

      // Apenas admin ou o próprio criador pode executar
      if (job.createdBy !== userId && (req as any).user?.role !== 'ADMIN') {
        throw createError(ErrorCodes.FORBIDDEN, 'Acesso negado ao job');
      }

      if (job.type !== DataJobType.IMPORT) {
        throw createError(ErrorCodes.INVALID_INPUT, 'Job não é do tipo importação');
      }

      if (job.status !== DataJobStatus.PENDING && job.status !== DataJobStatus.FAILED) {
        throw createError(
          ErrorCodes.INVALID_INPUT,
          `Job não pode ser executado no status atual (${job.status})`,
        );
      }

      // Iniciar a execução em segundo plano
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.dataImportExportService.executeImportJob(jobId).catch(error => {
        logger.error(`Erro na execução de job de importação (ID: ${jobId}):`, error);
      });

      return res.status(202).json({
        success: true,
        message: 'Job de importação iniciado com sucesso',
      });
    } catch (error) {
      next(error);
      return;
    }
  }

  /**
   * Executa um job de exportação manualmente
   */
  async executeExportJob(req: Request, res: Response, next: NextFunction) {
    try {
      const { jobId } = req.params;
      const userId = (req as any).user?.id;

      if (!userId) {
        throw createError(ErrorCodes.UNAUTHORIZED, 'Usuário não autenticado');
      }

      const job = await this.dataImportExportService.getDataJobById(jobId);

      if (!job) {
        throw createError(ErrorCodes.NOT_FOUND, 'Job não encontrado');
      }

      // Apenas admin ou o próprio criador pode executar
      if (job.createdBy !== userId && (req as any).user?.role !== 'ADMIN') {
        throw createError(ErrorCodes.FORBIDDEN, 'Acesso negado ao job');
      }

      if (job.type !== DataJobType.EXPORT) {
        throw createError(ErrorCodes.INVALID_INPUT, 'Job não é do tipo exportação');
      }

      if (job.status !== DataJobStatus.PENDING && job.status !== DataJobStatus.FAILED) {
        throw createError(
          ErrorCodes.INVALID_INPUT,
          `Job não pode ser executado no status atual (${job.status})`,
        );
      }

      // Iniciar a execução em segundo plano
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.dataImportExportService.executeExportJob(jobId).catch(error => {
        logger.error(`Erro na execução de job de exportação (ID: ${jobId}):`, error);
      });

      return res.status(202).json({
        success: true,
        message: 'Job de exportação iniciado com sucesso',
      });
    } catch (error) {
      next(error);
      return;
    }
  }
}
