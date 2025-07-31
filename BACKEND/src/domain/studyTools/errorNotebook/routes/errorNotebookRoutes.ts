import { Router } from 'express';
import { ErrorNotebookController } from '../controllers/errorNotebookController';
import { authMiddleware } from '../../../auth/middleware/auth.middleware';
import { logger } from '../../../../utils/logger';

/**
 * FASE 3: Routes do Sistema de Caderno de Erros
 * Implementação conforme TODO.md
 * 
 * ENDPOINTS PRINCIPAIS DA FASE 3:
 * - POST /error-notebook/create - Criar anotação
 * - GET /error-notebook/user - Listar anotações do usuário
 * - GET /error-notebook/:id/review - Preparar para revisão
 * - POST /error-notebook/:id/record-review - Registrar revisão
 * - PUT /error-notebook/:id - Atualizar anotação
 * - GET /error-notebook/stats - Estatísticas do usuário
 */

const router = Router();
const errorNotebookController = new ErrorNotebookController();

// Middleware de autenticação para todas as rotas
router.use(authMiddleware);

// ==================== ENDPOINTS DA FASE 3 ====================

/**
 * POST /error-notebook/create
 * Criar anotação de erro
 */
router.post('/create', async (req, res) => {
  try {
    logger.info('Route: POST /error-notebook/create', { 
      userId: req.user?.id 
    });
    await errorNotebookController.createErrorNote(req, res);
  } catch (error) {
    logger.error('Erro na rota POST /error-notebook/create:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

/**
 * GET /error-notebook/user
 * Listar anotações do usuário
 */
router.get('/user', async (req, res) => {
  try {
    logger.info('Route: GET /error-notebook/user', { 
      userId: req.user?.id,
      query: req.query 
    });
    await errorNotebookController.getUserErrorNotes(req, res);
  } catch (error) {
    logger.error('Erro na rota GET /error-notebook/user:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

/**
 * GET /error-notebook/stats
 * Obter estatísticas das anotações do usuário
 */
router.get('/stats', async (req, res) => {
  try {
    logger.info('Route: GET /error-notebook/stats', { 
      userId: req.user?.id 
    });
    await errorNotebookController.getUserErrorNotesStats(req, res);
  } catch (error) {
    logger.error('Erro na rota GET /error-notebook/stats:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

/**
 * GET /error-notebook/:id/review
 * Preparar anotação para revisão
 */
router.get('/:id/review', async (req, res) => {
  try {
    logger.info('Route: GET /error-notebook/:id/review', { 
      userId: req.user?.id,
      entryId: req.params.id 
    });
    await errorNotebookController.prepareErrorNoteForReview(req, res);
  } catch (error) {
    logger.error('Erro na rota GET /error-notebook/:id/review:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

/**
 * POST /error-notebook/:id/record-review
 * Registrar revisão de anotação
 */
router.post('/:id/record-review', async (req, res) => {
  try {
    logger.info('Route: POST /error-notebook/:id/record-review', { 
      userId: req.user?.id,
      entryId: req.params.id 
    });
    await errorNotebookController.recordErrorNoteReview(req, res);
  } catch (error) {
    logger.error('Erro na rota POST /error-notebook/:id/record-review:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

/**
 * PUT /error-notebook/:id
 * Atualizar anotação de erro
 */
router.put('/:id', async (req, res) => {
  try {
    logger.info('Route: PUT /error-notebook/:id', { 
      userId: req.user?.id,
      entryId: req.params.id 
    });
    await errorNotebookController.updateErrorNote(req, res);
  } catch (error) {
    logger.error('Erro na rota PUT /error-notebook/:id:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// ==================== ENDPOINTS LEGADOS (COMPATIBILIDADE) ====================
// Mantidos para não quebrar funcionalidades existentes

/**
 * POST /error-notebook/notebooks
 * DEPRECATED: Usar POST /error-notebook/create
 */
router.post('/notebooks', async (_req, res) => {
  logger.warn('Endpoint deprecated: POST /error-notebook/notebooks - use POST /error-notebook/create');
  res.status(410).json({
    success: false,
    message: 'Endpoint deprecated. Use POST /error-notebook/create',
    deprecated: true
  });
});

/**
 * GET /error-notebook/notebooks
 * DEPRECATED: Usar GET /error-notebook/user
 */
router.get('/notebooks', async (_req, res) => {
  logger.warn('Endpoint deprecated: GET /error-notebook/notebooks - use GET /error-notebook/user');
  res.status(410).json({
    success: false,
    message: 'Endpoint deprecated. Use GET /error-notebook/user',
    deprecated: true
  });
});

/**
 * GET /error-notebook/notebooks/:id
 * DEPRECATED: Funcionalidade removida na Fase 3
 */
router.get('/notebooks/:id', async (_req, res) => {
  logger.warn('Endpoint deprecated: GET /error-notebook/notebooks/:id - funcionalidade removida');
  res.status(410).json({
    success: false,
    message: 'Endpoint deprecated. Funcionalidade removida na Fase 3',
    deprecated: true
  });
});

/**
 * PUT /error-notebook/notebooks/:id
 * DEPRECATED: Usar PUT /error-notebook/:id
 */
router.put('/notebooks/:id', async (_req, res) => {
  logger.warn('Endpoint deprecated: PUT /error-notebook/notebooks/:id - use PUT /error-notebook/:id');
  res.status(410).json({
    success: false,
    message: 'Endpoint deprecated. Use PUT /error-notebook/:id',
    deprecated: true
  });
});

/**
 * DELETE /error-notebook/notebooks/:id
 * DEPRECATED: Funcionalidade removida na Fase 3
 */
router.delete('/notebooks/:id', async (_req, res) => {
  logger.warn('Endpoint deprecated: DELETE /error-notebook/notebooks/:id - funcionalidade removida');
  res.status(410).json({
    success: false,
    message: 'Endpoint deprecated. Funcionalidade removida na Fase 3',
    deprecated: true
  });
});

/**
 * GET /error-notebook/notebooks/:id/stats
 * DEPRECATED: Usar GET /error-notebook/stats
 */
router.get('/notebooks/:id/stats', async (_req, res) => {
  logger.warn('Endpoint deprecated: GET /error-notebook/notebooks/:id/stats - use GET /error-notebook/stats');
  res.status(410).json({
    success: false,
    message: 'Endpoint deprecated. Use GET /error-notebook/stats',
    deprecated: true
  });
});

// ==================== MIDDLEWARE DE INJEÇÃO DE DEPENDÊNCIAS ====================

/**
 * Função para configurar dependências do controller
 * Deve ser chamada durante a inicialização da aplicação
 */
export function setupErrorNotebookDependencies(
  unifiedReviewService: any, 
  questionService: any
): void {
  try {
    errorNotebookController.setServices(unifiedReviewService, questionService);
    logger.info('Dependências do ErrorNotebookController configuradas com sucesso');
  } catch (error) {
    logger.error('Erro ao configurar dependências do ErrorNotebookController:', error);
    throw error;
  }
}

// ==================== DOCUMENTAÇÃO DA API ====================

/**
 * DOCUMENTAÇÃO DOS ENDPOINTS DA FASE 3
 * 
 * POST /error-notebook/create
 * Body: {
 *   questionId: string,
 *   userNote: string,
 *   userExplanation: string,
 *   keyPoints?: string[],
 *   tags?: string[],
 *   difficulty?: 'EASY'|'MEDIUM'|'HARD'|'VERY_HARD',
 *   confidence?: number (1-5)
 * }
 * Response: { success: boolean, data: { entry: ErrorNotebookEntry, addedToReview: boolean } }
 * 
 * GET /error-notebook/user
 * Query: {
 *   limit?: number (1-100),
 *   page?: number (>0),
 *   tags?: string (comma-separated),
 *   difficulty?: 'EASY'|'MEDIUM'|'HARD'|'VERY_HARD',
 *   isInReviewSystem?: 'true'|'false'
 * }
 * Response: { success: boolean, data: GetUserErrorNotesResult }
 * 
 * GET /error-notebook/stats
 * Response: { success: boolean, data: ErrorNotesStats }
 * 
 * GET /error-notebook/:id/review
 * Response: { success: boolean, data: ErrorNoteReviewData }
 * 
 * POST /error-notebook/:id/record-review
 * Body: {
 *   selfAssessment: number (1-4, FSRSGrade),
 *   reviewTimeMs?: number
 * }
 * Response: { success: boolean, data: { entryId: string, grade: number, reviewTimeMs?: number } }
 * 
 * PUT /error-notebook/:id
 * Body: {
 *   userNote?: string,
 *   userExplanation?: string,
 *   keyPoints?: string[],
 *   tags?: string[],
 *   difficulty?: 'EASY'|'MEDIUM'|'HARD'|'VERY_HARD',
 *   confidence?: number (1-5)
 * }
 * Response: { success: boolean, data: ErrorNotebookEntry }
 */

export default router;
