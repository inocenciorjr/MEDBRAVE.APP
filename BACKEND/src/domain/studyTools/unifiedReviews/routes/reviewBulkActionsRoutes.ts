import { Router } from 'express';
import { ReviewBulkActionsController } from '../controllers/ReviewBulkActionsController';
import { enhancedAuthMiddleware } from '../../../auth/middleware/enhancedAuth.middleware';
import { createClient } from '@supabase/supabase-js';

// Alias para compatibilidade
const authMiddleware = enhancedAuthMiddleware;

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const controller = new ReviewBulkActionsController(supabase);

export const createReviewBulkActionsRoutes = (): Router => {
  const router = Router();
  
  // Todas as rotas requerem autenticação + plano ativo
  router.use(enhancedAuthMiddleware);

  /**
   * @swagger
   * /api/unified-reviews/bulk/reschedule:
   *   post:
   *     summary: Reagendar revisões pendentes
   *     tags: [Review Bulk Actions]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               content_types:
   *                 type: array
   *                 items:
   *                   type: string
   *                   enum: [FLASHCARD, QUESTION, ERROR_NOTEBOOK]
   *                 description: Tipos de conteúdo para reagendar (opcional)
   *               new_date:
   *                 type: string
   *                 format: date
   *                 description: Nova data para todas as revisões
   *               days_to_distribute:
   *                 type: integer
   *                 description: Distribuir revisões ao longo de X dias
   *     responses:
   *       200:
   *         description: Revisões reagendadas com sucesso
   */
  router.post('/reschedule', controller.rescheduleReviews);

  /**
   * @swagger
   * /api/unified-reviews/bulk/delete:
   *   delete:
   *     summary: Deletar revisões pendentes
   *     tags: [Review Bulk Actions]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               card_ids:
   *                 type: array
   *                 items:
   *                   type: string
   *                 description: IDs específicos de cards para deletar
   *               content_types:
   *                 type: array
   *                 items:
   *                   type: string
   *                   enum: [FLASHCARD, QUESTION, ERROR_NOTEBOOK]
   *                 description: Deletar todos os cards desses tipos
   *               delete_all:
   *                 type: boolean
   *                 description: Deletar TODAS as revisões (requer true explícito)
   *     responses:
   *       200:
   *         description: Revisões deletadas com sucesso
   */
  router.delete('/delete', controller.deleteReviews);

  /**
   * @swagger
   * /api/unified-reviews/bulk/reset-progress:
   *   post:
   *     summary: Resetar progresso de revisões
   *     tags: [Review Bulk Actions]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               card_ids:
   *                 type: array
   *                 items:
   *                   type: string
   *                 description: IDs específicos de cards para resetar
   *               content_types:
   *                 type: array
   *                 items:
   *                   type: string
   *                   enum: [FLASHCARD, QUESTION, ERROR_NOTEBOOK]
   *                 description: Resetar todos os cards desses tipos
   *     responses:
   *       200:
   *         description: Progresso resetado com sucesso
   */
  router.post('/reset-progress', controller.resetProgress);

  /**
   * @swagger
   * /api/unified-reviews/bulk/overdue-stats:
   *   get:
   *     summary: Obter estatísticas de revisões atrasadas
   *     tags: [Review Bulk Actions]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Estatísticas de revisões atrasadas
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
   *                     total_overdue:
   *                       type: integer
   *                     by_type:
   *                       type: object
   *                     very_overdue:
   *                       type: integer
   *                     oldest_overdue_days:
   *                       type: integer
   */
  router.get('/overdue-stats', controller.getOverdueStats);

  return router;
};

/**
 * EXEMPLOS DE USO:
 *
 * 1. Reagendar todas as revisões pendentes para amanhã:
 * POST /api/unified-reviews/bulk/reschedule
 * {
 *   "new_date": "2024-12-01"
 * }
 *
 * 2. Distribuir revisões pendentes ao longo de 7 dias:
 * POST /api/unified-reviews/bulk/reschedule
 * {
 *   "days_to_distribute": 7
 * }
 *
 * 3. Reagendar apenas flashcards para próxima semana:
 * POST /api/unified-reviews/bulk/reschedule
 * {
 *   "content_types": ["FLASHCARD"],
 *   "new_date": "2024-12-07"
 * }
 *
 * 4. Deletar todas as revisões de flashcards:
 * DELETE /api/unified-reviews/bulk/delete
 * {
 *   "content_types": ["FLASHCARD"]
 * }
 *
 * 5. Deletar cards específicos:
 * DELETE /api/unified-reviews/bulk/delete
 * {
 *   "card_ids": ["card1", "card2", "card3"]
 * }
 *
 * 6. Deletar TODAS as revisões (cuidado!):
 * DELETE /api/unified-reviews/bulk/delete
 * {
 *   "delete_all": true
 * }
 *
 * 7. Resetar progresso de questões (volta para NEW):
 * POST /api/unified-reviews/bulk/reset-progress
 * {
 *   "content_types": ["QUESTION"]
 * }
 *
 * 8. Ver estatísticas de revisões atrasadas:
 * GET /api/unified-reviews/bulk/overdue-stats
 */
