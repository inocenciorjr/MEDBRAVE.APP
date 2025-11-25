import { Router } from 'express';
import { ReviewManageController } from '../controllers/ReviewManageController';
import { supabaseAuthMiddleware as authMiddleware } from '../../../auth/middleware/supabaseAuth.middleware';

export const createReviewManageRoutes = (
  controller: ReviewManageController,
): Router => {
  const router = Router();

  /**
   * @swagger
   * /api/reviews/manage:
   *   get:
   *     summary: Listar todas as revisões do usuário para gerenciamento
   *     tags: [Review Management]
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
   *         name: state
   *         schema:
   *           type: string
   *           enum: [NEW, LEARNING, REVIEW, RELEARNING]
   *         description: Filtrar por estado
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 100
   *         description: Limite de resultados
   *     responses:
   *       200:
   *         description: Revisões carregadas com sucesso
   */
  router.get('/manage', authMiddleware, controller.getAllReviews);

  /**
   * @swagger
   * /api/reviews/manage/metadata:
   *   get:
   *     summary: Obter metadados das revisões (contagem por tipo)
   *     tags: [Review Management]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Metadados carregados com sucesso
   */
  router.get('/manage/metadata', authMiddleware, controller.getReviewsMetadata);

  /**
   * @swagger
   * /api/reviews/reschedule:
   *   post:
   *     summary: Reagendar revisões específicas
   *     tags: [Review Management]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - reviewIds
   *               - mode
   *             properties:
   *               reviewIds:
   *                 type: array
   *                 items:
   *                   type: string
   *               mode:
   *                 type: string
   *                 enum: [specific, distribute]
   *               specificDate:
   *                 type: string
   *                 format: date
   *               distributeDays:
   *                 type: integer
   *     responses:
   *       200:
   *         description: Revisões reagendadas com sucesso
   */
  router.post('/reschedule', authMiddleware, controller.rescheduleSpecificReviews);

  /**
   * @swagger
   * /api/reviews/{id}:
   *   delete:
   *     summary: Deletar uma revisão específica
   *     tags: [Review Management]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: ID da revisão
   *     responses:
   *       200:
   *         description: Revisão deletada com sucesso
   */
  router.delete('/:id', authMiddleware, controller.deleteReview);

  return router;
};
