const fs = require('fs');
const path = require('path');

const filePath = 'C:\\MEDBRAVE.APP\\MEDBRAVE.APP\\BACKEND\\src\\domain\\integration\\controller\\dataImportExportController.ts';

function rebuildDataImportExportController() {
  try {
    console.log('Reconstruindo dataImportExportController.ts...');
    
    // Create backup
    const backupPath = filePath + '.backup-rebuild-' + Date.now();
    fs.copyFileSync(filePath, backupPath);
    console.log(`Backup criado: ${backupPath}`);
    
    // Clean controller content
    const cleanContent = `import { Request, Response, NextFunction } from 'express';
import {
  DataJobType,
  DataFormat,
  DataJobStatus,
} from '../../../infra/integration/types';
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
      const {
        type,
        name,
        description,
        collection,
        format,
        query,
        mappings,
        sourceUrl,
      } = req.body;
      const user_id = (req as any).user?.id;

      if (!user_id) {
        throw createError(ErrorCodes.UNAUTHORIZED, 'Usuário não autenticado');
      }

      // Validar dados obrigatórios
      if (!type || !Object.values(DataJobType).includes(type)) {
        throw createError(ErrorCodes.INVALID_INPUT, 'Tipo de job inválido');
      }

      if (!name) {
        throw createError(
          ErrorCodes.INVALID_INPUT,
          'Nome do job é obrigatório',
        );
      }

      if (!collection) {
        throw createError(ErrorCodes.INVALID_INPUT, 'Coleção é obrigatória');
      }

      if (!format || !Object.values(DataFormat).includes(format)) {
        throw createError(ErrorCodes.INVALID_INPUT, 'Formato inválido');
      }

      // Para importação, validar sourceUrl
      if (type === DataJobType.IMPORT && !sourceUrl) {
        throw createError(
          ErrorCodes.INVALID_INPUT,
          'URL de origem é obrigatória para importação',
        );
      }

      // Para exportação, validar query
      if (type === DataJobType.EXPORT && !query) {
        throw createError(
          ErrorCodes.INVALID_INPUT,
          'Query é obrigatória para exportação',
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
        createdBy: user_id,
        status: DataJobStatus.PENDING,
      });

      return res.status(201).json({
        success: true,
        data: job,
        message: 'Job criado com sucesso',
      });
    } catch (error) {
      next(error);
      return;
    }
  }

  /**
   * Busca um job específico por ID
   */
  async getDataJobById(req: Request, res: Response, next: NextFunction) {
    try {
      const { jobId } = req.params;
      const user_id = (req as any).user?.id;

      if (!user_id) {
        throw createError(ErrorCodes.UNAUTHORIZED, 'Usuário não autenticado');
      }

      const job = await this.dataImportExportService.getDataJobById(jobId);

      if (!job) {
        throw createError(ErrorCodes.NOT_FOUND, 'Job não encontrado');
      }

      // Apenas admin ou o próprio criador pode visualizar
      if (job.createdBy !== user_id && (req as any).user?.role !== 'ADMIN') {
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
   * Lista jobs do usuário com paginação
   */
  async getDataJobs(req: Request, res: Response, next: NextFunction) {
    try {
      const user_id = (req as any).user?.id;
      const { page = 1, limit = 10, type, status } = req.query;

      if (!user_id) {
        throw createError(ErrorCodes.UNAUTHORIZED, 'Usuário não autenticado');
      }

      const filters: any = {};
      
      // Admin pode ver todos os jobs, usuário comum apenas os seus
      if ((req as any).user?.role !== 'ADMIN') {
        filters.createdBy = user_id;
      }

      if (type) {
        filters.type = type;
      }

      if (status) {
        filters.status = status;
      }

      const jobs = await this.dataImportExportService.getDataJobs(
        filters,
        parseInt(page as string),
        parseInt(limit as string),
      );

      return res.status(200).json({
        success: true,
        data: jobs,
      });
    } catch (error) {
      next(error);
      return;
    }
  }

  /**
   * Cancela um job em execução
   */
  async cancelDataJob(req: Request, res: Response, next: NextFunction) {
    try {
      const { jobId } = req.params;
      const user_id = (req as any).user?.id;

      if (!user_id) {
        throw createError(ErrorCodes.UNAUTHORIZED, 'Usuário não autenticado');
      }

      const job = await this.dataImportExportService.getDataJobById(jobId);

      if (!job) {
        throw createError(ErrorCodes.NOT_FOUND, 'Job não encontrado');
      }

      // Apenas admin ou o próprio criador pode cancelar
      if (job.createdBy !== user_id && (req as any).user?.role !== 'ADMIN') {
        throw createError(ErrorCodes.FORBIDDEN, 'Acesso negado ao job');
      }

      if (job.status !== DataJobStatus.RUNNING) {
        throw createError(
          ErrorCodes.INVALID_INPUT,
          'Apenas jobs em execução podem ser cancelados',
        );
      }

      await this.dataImportExportService.cancelDataJob(jobId);

      return res.status(200).json({
        success: true,
        message: 'Job cancelado com sucesso',
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
      const user_id = (req as any).user?.id;

      if (!user_id) {
        throw createError(ErrorCodes.UNAUTHORIZED, 'Usuário não autenticado');
      }

      const job = await this.dataImportExportService.getDataJobById(jobId);

      if (!job) {
        throw createError(ErrorCodes.NOT_FOUND, 'Job não encontrado');
      }

      // Apenas admin ou o próprio criador pode excluir
      if (job.createdBy !== user_id && (req as any).user?.role !== 'ADMIN') {
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
      const user_id = (req as any).user?.id;

      if (!user_id) {
        throw createError(ErrorCodes.UNAUTHORIZED, 'Usuário não autenticado');
      }

      const job = await this.dataImportExportService.getDataJobById(jobId);

      if (!job) {
        throw createError(ErrorCodes.NOT_FOUND, 'Job não encontrado');
      }

      // Apenas admin ou o próprio criador pode executar
      if (job.createdBy !== user_id && (req as any).user?.role !== 'ADMIN') {
        throw createError(ErrorCodes.FORBIDDEN, 'Acesso negado ao job');
      }

      if (job.type !== DataJobType.IMPORT) {
        throw createError(
          ErrorCodes.INVALID_INPUT,
          'Job não é do tipo importação',
        );
      }

      if (job.status === DataJobStatus.RUNNING) {
        throw createError(
          ErrorCodes.INVALID_INPUT,
          'Job já está em execução',
        );
      }

      // Executar job de importação em background
      this.dataImportExportService.executeImportJob(jobId).catch((error) => {
        logger.error('Erro na execução do job de importação:', error);
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
      const user_id = (req as any).user?.id;

      if (!user_id) {
        throw createError(ErrorCodes.UNAUTHORIZED, 'Usuário não autenticado');
      }

      const job = await this.dataImportExportService.getDataJobById(jobId);

      if (!job) {
        throw createError(ErrorCodes.NOT_FOUND, 'Job não encontrado');
      }

      // Apenas admin ou o próprio criador pode executar
      if (job.createdBy !== user_id && (req as any).user?.role !== 'ADMIN') {
        throw createError(ErrorCodes.FORBIDDEN, 'Acesso negado ao job');
      }

      if (job.type !== DataJobType.EXPORT) {
        throw createError(
          ErrorCodes.INVALID_INPUT,
          'Job não é do tipo exportação',
        );
      }

      if (job.status === DataJobStatus.RUNNING) {
        throw createError(
          ErrorCodes.INVALID_INPUT,
          'Job já está em execução',
        );
      }

      // Executar job de exportação em background
      this.dataImportExportService.executeExportJob(jobId).catch((error) => {
        logger.error('Erro na execução do job de exportação:', error);
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
`;
    
    // Write the clean content
    fs.writeFileSync(filePath, cleanContent, 'utf8');
    
    console.log('Arquivo reconstruído com sucesso!');
    console.log(`Linhas finais: ${cleanContent.split('\n').length}`);
    
  } catch (error) {
    console.error('Erro ao reconstruir arquivo:', error.message);
  }
}

if (require.main === module) {
  rebuildDataImportExportController();
}

module.exports = { rebuildDataImportExportController };