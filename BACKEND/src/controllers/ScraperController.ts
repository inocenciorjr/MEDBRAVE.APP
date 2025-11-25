/**
 * 🔍 CONTROLADOR DE SCRAPER
 *
 * Expõe endpoints para extração de questões via scraper:
 * - POST /api/admin/scraper/extract - Extração manual de uma URL
 * - POST /api/admin/scraper/batch - Processamento em lote
 * - GET /api/admin/scraper/batch/:jobId - Status de job
 * - DELETE /api/admin/scraper/batch/:jobId - Cancelar job
 * - GET /api/admin/scraper/jobs - Listar jobs
 * - GET /api/admin/scraper/logs - Logs de execução
 */

import { Request, Response, NextFunction } from 'express';
import scraperService from '../services/scraperService';
import jobQueueService from '../services/jobQueueService';
 
import { getRateLimitInfo as getRateLimitInfoUtil } from '../middleware/rateLimiter';
import logger from '../utils/logger';

export class ScraperController {
  /**
   * POST /api/admin/scraper/extract
   * Extrai questões de uma URL única (modo manual)
   */
  async extract(req: Request, res: Response, _next: NextFunction) {
    try {
      logger.info('[Scraper] Extract method called');
      const { url, options } = req.body;
      logger.info(`[Scraper] URL received: ${url}`);

      if (!url) {
        logger.warn('[Scraper] URL missing in request');
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_URL',
            message: 'URL is required',
          },
        });
      }

      logger.info(`[Scraper] Starting extraction from URL: ${url}`);

      // Extract questions
      const result = await scraperService.extractFromUrl(url, options);

      // Convert to BulkQuestion format
      const bulkQuestions = scraperService.convertToBulkFormat(result.questions);

      logger.info(
        `[Scraper] Extraction completed: ${result.stats.questionsExtracted} questions extracted`
      );

      return res.json({
        success: true,
        data: {
          questions: bulkQuestions,
          metadata: result.metadata,
          stats: result.stats,
        },
      });
    } catch (error: any) {
      logger.error('[Scraper] Extraction failed:', error);

      // Map specific errors to error codes
      let errorCode = 'EXTRACTION_ERROR';
      let statusCode = 500;

      if (error.name === 'InvalidUrlError') {
        errorCode = 'INVALID_URL';
        statusCode = 400;
      } else if (error.name === 'ScraperTimeoutError') {
        errorCode = 'TIMEOUT';
        statusCode = 408;
      } else if (error.name === 'NoQuestionsFoundError') {
        errorCode = 'NO_QUESTIONS';
        statusCode = 404;
      } else if (error.name === 'AuthRequiredError') {
        errorCode = 'AUTH_REQUIRED';
        statusCode = 403;
      }

      return res.status(statusCode).json({
        success: false,
        error: {
          code: errorCode,
          message: error.message,
          details: error.stack,
        },
      });
    }
  }

  /**
   * POST /api/admin/scraper/batch
   * Cria job de processamento em lote
   */
  async createBatchJob(req: Request, res: Response, _next: NextFunction) {
    try {
      const { urls, configs, options } = req.body;
      const userId = (req as any).user?.id;

      if (!urls || !Array.isArray(urls) || urls.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_URLS',
            message: 'URLs array is required and must not be empty',
          },
        });
      }

      logger.info(`[Scraper] Creating ${urls.length} individual jobs (1 job per URL)`);

      // Create 1 job per URL (allows parallel processing with concurrency: 2)
      const jobIds: string[] = [];
      
      for (const url of urls) {
        // Create individual job for this URL
        const jobId = await jobQueueService.createBatchJob(
          [url], // Array with single URL
          configs || {},
          userId,
          options
        );
        
        jobIds.push(jobId);
        logger.info(`[Scraper] Job created for URL ${url}: ${jobId}`);
      }

      // Estimate time (with concurrency: 2, time is roughly half)
      const estimatedTime = Math.ceil((urls.length / 2) * 30);

      logger.info(`[Scraper] ${jobIds.length} jobs created`);

      return res.json({
        success: true,
        data: {
          jobId: jobIds[0], // First job ID for compatibility
          jobIds, // All job IDs
          status: 'pending',
          totalUrls: urls.length,
          estimatedTime,
        },
      });
    } catch (error: any) {
      logger.error('[Scraper] Failed to create batch job:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'BATCH_ERROR',
          message: error.message,
        },
      });
    }
  }

  /**
   * GET /api/admin/scraper/batch/:jobId
   * Obtém status de um job
   */
  async getJobStatus(req: Request, res: Response, _next: NextFunction) {
    try {
      const { jobId } = req.params;

      const status = await jobQueueService.getJobStatus(jobId);

      if (!status) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'JOB_NOT_FOUND',
            message: `Job ${jobId} not found`,
          },
        });
      }

      return res.json({
        success: true,
        data: status,
      });
    } catch (error: any) {
      logger.error('[Scraper] Failed to get job status:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'STATUS_ERROR',
          message: error.message,
        },
      });
    }
  }

  /**
   * DELETE /api/admin/scraper/batch/:jobId
   * Cancela job em execução
   */
  async cancelJob(req: Request, res: Response, _next: NextFunction) {
    try {
      const { jobId } = req.params;

      await jobQueueService.cancelJob(jobId);

      logger.info(`[Scraper] Job cancelled: ${jobId}`);

      return res.json({
        success: true,
        message: 'Job cancelled successfully',
      });
    } catch (error: any) {
      logger.error('[Scraper] Failed to cancel job:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'CANCEL_ERROR',
          message: error.message,
        },
      });
    }
  }

  /**
   * GET /api/admin/scraper/jobs
   * Lista jobs do usuário
   */
  async listJobs(req: Request, res: Response, _next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const { status, page, limit, sortBy, sortOrder } = req.query;

      const filters = {
        status: status as string,
        page: parseInt(page as string) || 1,
        limit: parseInt(limit as string) || 20,
        sortBy: (sortBy as string) || 'createdAt',
        sortOrder: (sortOrder as string) || 'desc',
      };

      const result = await jobQueueService.listJobs(userId, filters);

      return res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error('[Scraper] Failed to list jobs:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'LIST_ERROR',
          message: error.message,
        },
      });
    }
  }

  /**
   * GET /api/admin/scraper/logs
   * Obtém logs de execuções
   */
  async getLogs(_req: Request, res: Response, _next: NextFunction) {
    try {
      // TODO: Implement logs retrieval from database
      // This will be implemented in Phase 4 (task 20.1)
      
      return res.json({
        success: true,
        data: {
          logs: [],
          pagination: {
            total: 0,
            page: 1,
            limit: 20,
            totalPages: 0,
          },
        },
        message: 'Logs feature coming soon',
      });
    } catch (error: any) {
      logger.error('[Scraper] Failed to get logs:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'LOGS_ERROR',
          message: error.message,
        },
      });
    }
  }

  /**
   * GET /api/admin/scraper/stats
   * Obtém estatísticas de execuções
   */
  async getStats(_req: Request, res: Response, _next: NextFunction) {
    try {
      // TODO: Implement stats retrieval from database
      // This will be implemented in Phase 4 (task 20.3)
      
      return res.json({
        success: true,
        data: {
          totalExtractions: 0,
          successRate: 0,
          averageExtractionTime: 0,
          questionsPerMinute: 0,
          totalQuestionsExtracted: 0,
        },
        message: 'Stats feature coming soon',
      });
    } catch (error: any) {
      logger.error('[Scraper] Failed to get stats:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'STATS_ERROR',
          message: error.message,
        },
      });
    }
  }

  /**
   * GET /api/admin/scraper/rate-limit
   * Obtém informações de rate limit do usuário
   */
  async getRateLimitInfo(req: Request, res: Response, _next: NextFunction): Promise<any> {
    try {
      const user = (req as any).user;
      
      if (!user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Autenticação necessária',
          },
        });
      }

      const rateLimitInfo = await getRateLimitInfoUtil(user.id);

      if (!rateLimitInfo) {
        return res.status(500).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_ERROR',
            message: 'Erro ao obter informações de rate limit',
          },
        });
      }

      return res.json({
        success: true,
        data: {
          limit: 10,
          used: rateLimitInfo.used,
          remaining: rateLimitInfo.remaining,
          resetAt: rateLimitInfo.resetAt,
        },
      });
    } catch (error: any) {
      logger.error('[Scraper] Failed to get rate limit info:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_ERROR',
          message: error.message,
        },
      });
    }
  }

  /**
   * POST /api/admin/scraper/extract-from-sources
   * Extrai questões de exam sources (via CLI Hardworq)
   */
  async extractFromSources(req: Request, res: Response, _next: NextFunction): Promise<any> {
    try {
      const { sourceValues, configs, options } = req.body;
      const userId = (req as any).user?.id;

      if (!sourceValues || !Array.isArray(sourceValues) || sourceValues.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_SOURCE_VALUES',
            message: 'sourceValues array is required and must not be empty',
          },
        });
      }

      logger.info(`[Scraper] Creating ${sourceValues.length} individual jobs for exam sources (1 job per source)`);

      // Create 1 job per source (allows parallel processing with concurrency: 2)
      const jobIds: string[] = [];
      
      for (const sourceValue of sourceValues) {
        const pseudoUrl = `source://${sourceValue}`;
        
        // Create individual job for this source
        const jobId = await jobQueueService.createBatchJob(
          [pseudoUrl], // Array with single URL
          configs || {},
          userId,
          { ...options, scraperType: 'alternative' }
        );
        
        jobIds.push(jobId);
        logger.info(`[Scraper] Job created for source ${sourceValue}: ${jobId}`);
      }

      // Estimate time (with concurrency: 2, time is roughly half)
      const estimatedTime = Math.ceil((sourceValues.length / 2) * 60);

      logger.info(`[Scraper] ${jobIds.length} jobs created for exam sources`);

      return res.json({
        success: true,
        data: {
          jobId: jobIds[0], // First job ID for compatibility
          jobIds, // All job IDs
          status: 'pending',
          totalSources: sourceValues.length,
          estimatedTime,
        },
      });
    } catch (error: any) {
      logger.error('[Scraper] Failed to create exam sources batch job:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'BATCH_ERROR',
          message: error.message,
        },
      });
    }
  }

  /**
   * GET /api/admin/scraper/jobs/all
   * Lista TODOS os jobs do Redis (completed, failed, active, waiting, delayed)
   */
  async getAllJobs(_req: Request, res: Response, _next: NextFunction): Promise<any> {
    try {
      logger.info('[Scraper] Getting all jobs from Redis');

      const result = await jobQueueService.getAllJobsDetailed();

      return res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error('[Scraper] Failed to get all jobs:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_JOBS_ERROR',
          message: error.message,
        },
      });
    }
  }

  /**
   * DELETE /api/admin/scraper/jobs/obliterate
   * Remove TODOS os jobs do Redis (nuclear option)
   */
  async obliterateAllJobs(_req: Request, res: Response, _next: NextFunction): Promise<any> {
    try {
      logger.info('[Scraper] OBLITERATING ALL JOBS FROM REDIS');

      const result = await jobQueueService.obliterateAllJobs();

      return res.json({
        success: true,
        data: result,
        message: `Removed ${result.removed}/${result.found} jobs from Redis`,
      });
    } catch (error: any) {
      logger.error('[Scraper] Failed to obliterate jobs:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'OBLITERATE_ERROR',
          message: error.message,
        },
      });
    }
  }

  /**
   * DELETE /api/admin/scraper/jobs/status/:status
   * Remove jobs por status (completed, failed, waiting, active, delayed)
   */
  async removeJobsByStatus(req: Request, res: Response, _next: NextFunction): Promise<Response> {
    try {
      const { status } = req.params;

      if (!['completed', 'failed', 'waiting', 'active', 'delayed'].includes(status)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_STATUS',
            message: 'Status must be one of: completed, failed, waiting, active, delayed',
          },
        });
      }

      logger.info(`[Scraper] Removing all ${status} jobs`);

      const result = await jobQueueService.removeJobsByStatus(
        status as 'completed' | 'failed' | 'waiting' | 'active' | 'delayed'
      );

      return res.json({
        success: true,
        data: result,
        message: `Removed ${result.removed}/${result.found} ${status} jobs`,
      });
    } catch (error: any) {
      logger.error('[Scraper] Failed to remove jobs by status:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'REMOVE_ERROR',
          message: error.message,
        },
      });
    }
  }

  /**
   * DELETE /api/admin/scraper/jobs/:jobId/force
   * Force remove um job específico
   */
  async forceRemoveJob(req: Request, res: Response, _next: NextFunction): Promise<any> {
    try {
      const { jobId } = req.params;

      logger.info(`[Scraper] Force removing job ${jobId}`);

      const removed = await jobQueueService.forceRemoveJob(jobId);

      if (!removed) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'JOB_NOT_FOUND',
            message: 'Job not found',
          },
        });
      }

      return res.json({
        success: true,
        message: `Job ${jobId} removed`,
      });
    } catch (error: any) {
      logger.error('[Scraper] Failed to force remove job:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'REMOVE_ERROR',
          message: error.message,
        },
      });
    }
  }
}

export const scraperController = new ScraperController();
