import { Router } from 'express';
import { UnifiedReviewController } from '../controllers/UnifiedReviewController';
import { authMiddleware } from '../../../auth/middleware/auth.middleware';

export const createUnifiedReviewRoutes = (controller: UnifiedReviewController): Router => {
  const router = Router();

  /**
   * @swagger
   * /api/unified-reviews/due:
   *   get:
   *     summary: Obter revisões pendentes
   *     tags: [Unified Reviews]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: contentType
   *         schema:
   *           type: string
   *           enum: [FLASHCARD, QUESTION, ERROR_NOTEBOOK]
   *         description: Filtrar por tipo de conteúdo
   *       - in: query
   *         name: deckId
   *         schema:
   *           type: string
   *         description: Filtrar por deck específico
   *       - in: query
   *         name: dueOnly
   *         schema:
   *           type: boolean
   *         description: Apenas itens devidos
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 200
   *         description: Limite de resultados
   *     responses:
   *       200:
   *         description: Revisões devidas carregadas com sucesso
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *                 data:
   *                   type: object
   *                   properties:
   *                     reviews:
   *                       type: array
   *                       items:
   *                         $ref: '#/components/schemas/UnifiedReviewItem'
   *                     total:
   *                       type: integer
   */
  router.get('/due', authMiddleware, controller.getDueReviews);

  /**
   * @swagger
   * /api/unified-reviews/record:
   *   post:
   *     summary: Registrar uma revisão
   *     tags: [Unified Reviews]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - contentType
   *               - contentId
   *               - grade
   *             properties:
   *               contentType:
   *                 type: string
   *                 enum: [FLASHCARD, QUESTION, ERROR_NOTEBOOK]
   *               contentId:
   *                 type: string
   *               grade:
   *                 type: integer
   *                 enum: [1, 2, 3, 4]
   *                 description: 1=AGAIN, 2=HARD, 3=GOOD, 4=EASY
   *               reviewTimeMs:
   *                 type: integer
   *                 description: Tempo gasto na revisão em milissegundos
   *     responses:
   *       200:
   *         description: Revisão registrada com sucesso
   *       400:
   *         description: Dados inválidos
   */
  router.post('/record', authMiddleware, controller.recordReview);

  /**
   * @swagger
   * /api/unified-reviews/today:
   *   get:
   *     summary: Obter apenas revisões de hoje (otimizado para dashboard)
   *     tags: [Unified Reviews]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 50
   *         description: Limite de revisões de hoje
   *     responses:
   *       200:
   *         description: Revisões de hoje carregadas com sucesso
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *                 data:
   *                   type: object
   *                   properties:
   *                     reviews:
   *                       type: array
   *                       items:
   *                         $ref: '#/components/schemas/UnifiedReviewItem'
   *                     total:
   *                       type: integer
   *                     date:
   *                       type: string
   *                       format: date
   */
  router.get('/today', authMiddleware, controller.getTodayReviews);

  /**
   * @swagger
   * /api/unified-reviews/summary:
   *   get:
   *     summary: Obter resumo diário de revisões
   *     tags: [Unified Reviews]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Resumo diário carregado com sucesso
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *                 data:
   *                   type: object
   *                   properties:
   *                     summary:
   *                       $ref: '#/components/schemas/DailyReviewSummary'
   */
  router.get('/summary', authMiddleware, controller.getDailySummary);

  /**
   * @swagger
   * /api/unified-reviews/future:
   *   get:
   *     summary: Obter revisões futuras
   *     tags: [Unified Reviews]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: contentType
   *         schema:
   *           type: string
   *           enum: [FLASHCARD, QUESTION, ERROR_NOTEBOOK]
   *         description: Filtrar por tipo de conteúdo
   *       - in: query
   *         name: deckId
   *         schema:
   *           type: string
   *         description: Filtrar por deck específico
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 200
   *         description: Limite de resultados
   *     responses:
   *       200:
   *         description: Revisões futuras carregadas com sucesso
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *                 data:
   *                   type: object
   *                   properties:
   *                     reviews:
   *                       type: array
   *                       items:
   *                         $ref: '#/components/schemas/UnifiedReviewItem'
   *                     total:
   *                       type: integer
   */
  router.get('/future', authMiddleware, controller.getFutureReviews);

  /**
   * @swagger
   * /api/unified-reviews/completed:
   *   get:
   *     summary: Obter revisões completadas
   *     tags: [Unified Reviews]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: contentType
   *         schema:
   *           type: string
   *           enum: [FLASHCARD, QUESTION, ERROR_NOTEBOOK]
   *         description: Filtrar por tipo de conteúdo
   *       - in: query
   *         name: deckId
   *         schema:
   *           type: string
   *         description: Filtrar por deck específico
   *       - in: query
   *         name: days
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 30
   *         description: Número de dias para buscar no histórico (padrão: 7)
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 200
   *         description: Limite de resultados
   *     responses:
   *       200:
   *         description: Revisões completadas carregadas com sucesso
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *                 data:
   *                   type: object
   *                   properties:
   *                     reviews:
   *                       type: array
   *                       items:
   *                         $ref: '#/components/schemas/UnifiedReviewItem'
   *                     total:
   *                       type: integer
   */
  router.get('/completed', authMiddleware, controller.getCompletedReviews);

  /**
   * @swagger
   * /api/unified-reviews/create:
   *   post:
   *     summary: Criar novo item de revisão
   *     tags: [Unified Reviews]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - contentType
   *               - contentId
   *             properties:
   *               contentType:
   *                 type: string
   *                 enum: [FLASHCARD, QUESTION, ERROR_NOTEBOOK]
   *               contentId:
   *                 type: string
   *               metadata:
   *                 type: object
   *                 description: Metadados adicionais específicos do tipo
   *     responses:
   *       201:
   *         description: Item de revisão criado com sucesso
   *       400:
   *         description: Dados inválidos
   */
  router.post('/create', authMiddleware, controller.createReviewItem);

  return router;
};