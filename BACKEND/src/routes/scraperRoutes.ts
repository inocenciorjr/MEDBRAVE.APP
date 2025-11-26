/**
 * 🔍 ROTAS DE SCRAPER
 *
 * Rotas para extração de questões via scraper:
 * - POST /api/admin/scraper/extract - Extração manual de uma URL
 * - POST /api/admin/scraper/batch - Processamento em lote
 * - GET /api/admin/scraper/batch/:jobId - Status de job
 * - DELETE /api/admin/scraper/batch/:jobId - Cancelar job
 * - GET /api/admin/scraper/jobs - Listar jobs
 * - GET /api/admin/scraper/logs - Logs de execução
 */

import { Router } from 'express';
import { scraperController } from '../controllers/ScraperController';
import { enhancedAuthMiddleware } from '../domain/auth/middleware/enhancedAuth.middleware';
import { adminMiddleware } from '../domain/auth/middleware/admin.middleware';
import logger from '../utils/logger';
import jobQueueService from '../services/jobQueueService';

// Alias para compatibilidade
const authMiddleware = enhancedAuthMiddleware;

const router = Router();

console.log('📡 ScraperRoutes loaded');

// Middleware de autenticação + plano e admin para todas as rotas
router.use(enhancedAuthMiddleware as any);
router.use(adminMiddleware as any);

// Rate limiting removido - será implementado posteriormente se necessário

/**
 * @swagger
 * /api/admin/scraper/extract:
 *   post:
 *     summary: Extrai questões de uma URL única (modo manual)
 *     description: Executa o scraper em uma URL e retorna questões extraídas para revisão
 *     tags: [Scraper]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - url
 *             properties:
 *               url:
 *                 type: string
 *                 description: URL da prova para extrair questões
 *                 example: https://provaderesidencia.com.br/demo/prova-exemplo
 *               options:
 *                 type: object
 *                 properties:
 *                   timeout:
 *                     type: number
 *                     description: Timeout em segundos (padrão 300)
 *                     example: 300
 *                   limit:
 *                     type: number
 *                     description: Limite de questões (0 = todas)
 *                     example: 0
 *                   downloadImages:
 *                     type: boolean
 *                     description: Download de imagens (padrão true)
 *                     example: true
 *     responses:
 *       200:
 *         description: Questões extraídas com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     questions:
 *                       type: array
 *                       items:
 *                         type: object
 *                     metadata:
 *                       type: object
 *                     stats:
 *                       type: object
 *       400:
 *         description: URL inválida ou ausente
 *       403:
 *         description: Conteúdo requer autenticação
 *       404:
 *         description: Nenhuma questão encontrada
 *       408:
 *         description: Timeout de extração
 */
router.post('/extract', scraperController.extract);

// extract-stream removido - usar WebSocket para progresso em tempo real

/**
 * @swagger
 * /api/admin/scraper/process-images:
 *   post:
 *     summary: Processa imagens locais e faz upload para R2
 *     description: Faz upload das imagens extraídas para o R2, substitui URLs e limpa arquivos locais
 *     tags: [Scraper]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - questions
 *               - examName
 *               - examYear
 *             properties:
 *               questions:
 *                 type: array
 *                 description: Array de questões com imagens locais
 *               examName:
 *                 type: string
 *                 description: Nome do exame
 *                 example: SUS-SP
 *               examYear:
 *                 type: number
 *                 description: Ano do exame
 *                 example: 2015
 *               originalJsonPath:
 *                 type: string
 *                 description: Caminho do JSON original (opcional)
 */
router.post('/process-images', async (req: any, res: any) => {
  try {
    const { questions, examName, examYear, originalJsonPath } = req.body;

    if (!questions || !Array.isArray(questions)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_QUESTIONS', message: 'Questions array is required' },
      });
    }

    if (!examName || !examYear) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_EXAM_INFO', message: 'Exam name and year are required' },
      });
    }

    const { scraperImageProcessingService } = await import('../services/scraperImageProcessingService');
    
    const result = await scraperImageProcessingService.processQuestions(
      questions,
      examName,
      examYear,
      originalJsonPath,
    );

    return res.json({
      success: result.success,
      data: {
        questionsProcessed: result.questionsProcessed,
        imagesUploaded: result.imagesUploaded,
        imagesFailed: result.imagesFailed,
        localImagesDeleted: result.localImagesDeleted,
        jsonBackupCreated: result.jsonBackupCreated,
        questions: questions, // Retorna questões com URLs atualizadas
      },
      errors: result.errors.length > 0 ? result.errors : undefined,
    });
  } catch (error: any) {
    logger.error('[Scraper] Image processing failed:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'PROCESSING_ERROR', message: error.message },
    });
  }
});

/**
 * @swagger
 * /api/admin/scraper/batch:
 *   post:
 *     summary: Cria job de processamento em lote
 *     description: Cria um job para processar múltiplas URLs automaticamente
 *     tags: [Scraper]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - urls
 *             properties:
 *               urls:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array de URLs para processar
 *               configs:
 *                 type: object
 *                 description: Configurações por URL
 *               options:
 *                 type: object
 *                 properties:
 *                   delayBetweenUrls:
 *                     type: number
 *                     description: Delay entre URLs em ms (padrão 2000)
 *                   maxRetries:
 *                     type: number
 *                     description: Máximo de tentativas (padrão 3)
 *     responses:
 *       200:
 *         description: Job criado com sucesso
 *       400:
 *         description: URLs ausentes ou inválidas
 */
router.post('/batch', scraperController.createBatchJob);

/**
 * @swagger
 * /api/admin/scraper/batch/{jobId}:
 *   get:
 *     summary: Obtém status de um job
 *     description: Retorna status e progresso de um job de batch
 *     tags: [Scraper]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do job
 *     responses:
 *       200:
 *         description: Status do job obtido com sucesso
 *       404:
 *         description: Job não encontrado
 */
router.get('/batch/:jobId', scraperController.getJobStatus);

/**
 * @swagger
 * /api/admin/scraper/batch/{jobId}:
 *   delete:
 *     summary: Cancela job em execução
 *     description: Cancela um job de batch que está em execução
 *     tags: [Scraper]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do job
 *     responses:
 *       200:
 *         description: Job cancelado com sucesso
 *       404:
 *         description: Job não encontrado
 */
router.delete('/batch/:jobId', scraperController.cancelJob);

/**
 * @swagger
 * /api/admin/scraper/jobs:
 *   get:
 *     summary: Lista jobs do usuário
 *     description: Retorna lista paginada de jobs do usuário
 *     tags: [Scraper]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, processing, completed, failed, cancelled]
 *         description: Filtrar por status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número da página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Itens por página
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, completedAt]
 *           default: createdAt
 *         description: Campo para ordenação
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Ordem de ordenação
 *     responses:
 *       200:
 *         description: Lista de jobs obtida com sucesso
 */
router.get('/jobs', scraperController.listJobs);

/**
 * @swagger
 * /api/admin/scraper/logs:
 *   get:
 *     summary: Obtém logs de execuções
 *     description: Retorna logs paginados de execuções do scraper
 *     tags: [Scraper]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: jobId
 *         schema:
 *           type: string
 *         description: Filtrar por job ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [success, failed]
 *         description: Filtrar por status
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Data inicial
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Data final
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Logs obtidos com sucesso
 */
router.get('/logs', scraperController.getLogs);

/**
 * @swagger
 * /api/admin/scraper/stats:
 *   get:
 *     summary: Obtém estatísticas de execuções
 *     description: Retorna estatísticas agregadas dos logs de scraper
 *     tags: [Scraper]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: jobId
 *         schema:
 *           type: string
 *         description: Filtrar por job ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Data inicial
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Data final
 *     responses:
 *       200:
 *         description: Estatísticas obtidas com sucesso
 */
router.get('/stats', scraperController.getStats);

/**
 * @swagger
 * /api/admin/scraper/rate-limit:
 *   get:
 *     summary: Obtém informações de rate limit do usuário
 *     description: Retorna quantas requisições restam e quando o limite reseta
 *     tags: [Scraper]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Informações de rate limit obtidas com sucesso
 */
router.get('/rate-limit', scraperController.getRateLimitInfo);

/**
 * @swagger
 * /api/admin/scraper/jobs/cancel-all:
 *   post:
 *     summary: Cancela todos os jobs ativos do usuário (EMERGÊNCIA)
 *     description: Para todos os jobs em execução ou pendentes
 *     tags: [Scraper]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Jobs cancelados com sucesso
 */
router.post('/jobs/cancel-all', async (req: any, res: any) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      });
    }

    logger.info(`[Scraper] Cancelling all jobs for user ${userId}`);
    
    // Get all active and waiting jobs for user
    const { jobs } = await jobQueueService.listJobs(userId, {}, 1, 1000);
    
    logger.info(`[Scraper] Found ${jobs.length} total jobs`);
    
    const activeJobs = jobs.filter(
      (j: any) => j.status === 'processing' || j.status === 'pending' || j.status === 'active'
    );
    
    logger.info(`[Scraper] Found ${activeJobs.length} active jobs to cancel`);
    
    if (activeJobs.length === 0) {
      return res.json({
        success: true,
        data: {
          cancelledCount: 0,
          results: [],
          message: 'No active jobs to cancel',
        },
      });
    }
    
    // Cancel each job with individual error handling
    const results = [];
    for (const job of activeJobs) {
      try {
        await jobQueueService.cancelJob(job.jobId);
        results.push({
          jobId: job.jobId,
          success: true,
        });
        logger.info(`[Scraper] Cancelled job ${job.jobId}`);
      } catch (err: any) {
        results.push({
          jobId: job.jobId,
          success: false,
          error: err.message,
        });
        logger.error(`[Scraper] Failed to cancel job ${job.jobId}:`, err);
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    
    return res.json({
      success: true,
      data: {
        cancelledCount: successCount,
        totalAttempted: activeJobs.length,
        results,
      },
    });
  } catch (error: any) {
    logger.error('[Scraper] Cancel all jobs failed:', error);
    return res.status(500).json({
      success: false,
      error: { 
        code: 'CANCEL_ERROR', 
        message: error.message || 'Internal server error',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
    });
  }
});



/**
 * @swagger
 * /api/admin/scraper/batch/process:
 *   post:
 *     summary: Processa batch com categorização automática e drafts
 *     description: Processa múltiplas URLs com extração, categorização e criação de drafts via SSE
 *     tags: [Scraper]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - urls
 *             properties:
 *               urls:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array de URLs para processar
 *               configs:
 *                 type: object
 *                 description: Configurações por URL
 *               options:
 *                 type: object
 *                 properties:
 *                   delayBetweenUrls:
 *                     type: number
 *                     description: Delay entre URLs em ms
 *                   autoCategorize:
 *                     type: boolean
 *                     description: Categorizar automaticamente
 *     responses:
 *       200:
 *         description: SSE stream com eventos de progresso
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 */
import { batchController } from '../controllers/BatchController';
router.post('/batch/process', batchController.processBatch);

/**
 * @swagger
 * /api/admin/scraper/drafts/{id}:
 *   get:
 *     summary: Obtém draft por ID
 *     description: Retorna dados de um draft incluindo questões e categorização
 *     tags: [Scraper]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do draft
 *     responses:
 *       200:
 *         description: Draft obtido com sucesso
 *       404:
 *         description: Draft não encontrado ou expirado
 */
import { draftController } from '../controllers/DraftController';
router.get('/drafts/:id', draftController.getById);

/**
 * @swagger
 * /api/admin/scraper/drafts/{id}:
 *   delete:
 *     summary: Deleta draft por ID
 *     description: Remove um draft do sistema
 *     tags: [Scraper]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do draft
 *     responses:
 *       204:
 *         description: Draft deletado com sucesso
 *       404:
 *         description: Draft não encontrado
 */
router.delete('/drafts/:id', draftController.delete);

/**
 * @swagger
 * /api/admin/scraper/drafts:
 *   get:
 *     summary: Lista todos os drafts
 *     description: Retorna lista de drafts não expirados
 *     tags: [Scraper]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: jobId
 *         schema:
 *           type: string
 *         description: Filtrar por job ID
 *     responses:
 *       200:
 *         description: Lista de drafts obtida com sucesso
 */
router.get('/drafts', draftController.list);

/**
 * @swagger
 * /api/admin/scraper/drafts/cleanup:
 *   post:
 *     summary: Executa limpeza manual de drafts expirados
 *     description: Remove todos os drafts que já expiraram
 *     tags: [Scraper]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Limpeza executada com sucesso
 */
import { draftCleanupService } from '../services/draftCleanupService';
router.post('/drafts/cleanup', async (_req, res) => {
  try {
    const deletedCount = await draftCleanupService.runCleanup();
    res.json({
      success: true,
      data: {
        deletedCount,
        message: `${deletedCount} draft(s) expirado(s) deletado(s)`,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao executar limpeza',
    });
  }
});

/**
 * @route POST /api/admin/scraper/extract-from-sources
 * @description Extrai questões de exam sources selecionadas
 * @access Admin
 * @returns {Object} Job ID e status
 */
router.post('/extract-from-sources', authMiddleware as any, adminMiddleware as any, scraperController.extractFromSources.bind(scraperController));

/**
 * @route GET /api/admin/scraper/exam-sources
 * @description Lista todas as fontes de exames disponíveis
 * @access Admin
 * @returns {Object} Lista de exam sources
 */
router.get('/exam-sources', authMiddleware as any, adminMiddleware as any, async (_req, res) => {
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase configuration is missing');
    }

    // Buscar todos os registros em lotes para evitar limite de 1000
    let allData: any[] = [];
    let from = 0;
    const batchSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('exam_sources')
        .select('*')
        .order('source_index', { ascending: true })
        .range(from, from + batchSize - 1);

      if (error) {
        throw error;
      }

      if (data && data.length > 0) {
        allData = allData.concat(data);
        from += batchSize;
        hasMore = data.length === batchSize; // Se retornou menos que batchSize, acabou
      } else {
        hasMore = false;
      }
    }

    console.log(`✅ Fetched ${allData.length} exam sources in total`);

    res.json({
      success: true,
      data: allData,
      total: allData.length,
    });
  } catch (error) {
    console.error('Error fetching exam sources:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao buscar fontes de exames',
    });
  }
});

/**
 * @route GET /api/admin/scraper/jobs/all
 * @description Lista TODOS os jobs do Redis (completed, failed, active, waiting, delayed)
 * @access Admin
 * @returns {Object} Lista detalhada de todos os jobs
 */
router.get('/jobs/all', authMiddleware as any, adminMiddleware as any, scraperController.getAllJobs);

/**
 * @route DELETE /api/admin/scraper/jobs/obliterate
 * @description Remove TODOS os jobs do Redis (nuclear option)
 * @access Admin
 * @returns {Object} Resultado da remoção
 */
router.delete('/jobs/obliterate', authMiddleware as any, adminMiddleware as any, scraperController.obliterateAllJobs);

/**
 * @route DELETE /api/admin/scraper/jobs/status/:status
 * @description Remove jobs por status (completed, failed, waiting, active, delayed)
 * @access Admin
 * @param {string} status - Status dos jobs a remover
 * @returns {Object} Resultado da remoção
 */
router.delete('/jobs/status/:status', authMiddleware as any, adminMiddleware as any, scraperController.removeJobsByStatus);

/**
 * @route DELETE /api/admin/scraper/jobs/:jobId/force
 * @description Force remove um job específico
 * @access Admin
 * @param {string} jobId - ID do job a remover
 * @returns {Object} Resultado da remoção
 */
router.delete('/jobs/:jobId/force', authMiddleware as any, adminMiddleware as any, scraperController.forceRemoveJob);

export default router;
