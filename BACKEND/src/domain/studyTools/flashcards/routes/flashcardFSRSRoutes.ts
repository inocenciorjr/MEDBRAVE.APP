import { Router } from 'express';
import { FlashcardFSRSController } from '../controllers/FlashcardFSRSController';
import { authMiddleware } from '../../../../domain/auth/middleware/auth.middleware';

export const createFlashcardFSRSRoutes = (controller: FlashcardFSRSController): Router => {
  const router = Router();
  console.log('🛣️ [createFlashcardFSRSRoutes] Criando rotas FSRS...');

  /**
   * @swagger
   * /api/flashcards/{id}/review-fsrs:
   *   post:
   *     summary: Record a flashcard review using FSRS algorithm
   *     tags: [Flashcards FSRS]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - reviewQuality
   *             properties:
   *               reviewQuality:
   *                 type: integer
   *                 minimum: 0
   *                 maximum: 3
   *                 description: "0=Again, 1=Hard, 2=Good, 3=Easy"
   *               reviewTimeMs:
   *                 type: integer
   *                 description: "Time spent reviewing in milliseconds"
   *     responses:
   *       200:
   *         description: FSRS review recorded successfully
   */
  router.post('/:id/review-fsrs', authMiddleware, controller.reviewFlashcard);

  /**
   * @swagger
   * /api/flashcards/due-fsrs:
   *   get:
   *     summary: Get flashcards due for review using FSRS
   *     tags: [Flashcards FSRS]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           maximum: 100
   *         default: 50
   *     responses:
   *       200:
   *         description: List of due flashcards
   */
  router.get('/due-fsrs', authMiddleware, controller.getDueFlashcards);

  /**
   * @swagger
   * /api/flashcards/fsrs-stats:
   *   get:
   *     summary: Get FSRS statistics for the user
   *     tags: [Flashcards FSRS]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: FSRS statistics
   */
  router.get('/fsrs-stats', authMiddleware, controller.getFSRSStats);

  // Rota migrate-to-fsrs removida - não há flashcards SM-2 no projeto

  /**
   * @swagger
   * /api/flashcards/migrate-all-to-fsrs:
   *   post:
   *     summary: Migrate all user flashcards from SM-2 to FSRS
   *     tags: [Flashcards FSRS]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: batchSize
   *         schema:
   *           type: integer
   *           maximum: 100
   *         default: 50
   *     responses:
   *       200:
   *         description: Batch migration completed
   */
  router.post('/migrate-all-to-fsrs', authMiddleware, controller.migrateAllToFSRS);

  /**
   * @swagger
   * /api/flashcards/{id}/initialize-fsrs:
   *   post:
   *     summary: Initialize FSRS card for an existing flashcard
   *     tags: [Flashcards FSRS]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - deckId
   *             properties:
   *               deckId:
   *                 type: string
   *     responses:
   *       200:
   *         description: FSRS card initialized successfully
   */
  router.post('/:id/initialize-fsrs', authMiddleware, controller.initializeFSRSCard);

  console.log('✅ [createFlashcardFSRSRoutes] Todas as rotas FSRS foram registradas, incluindo /fsrs-stats');
  return router;
};

// Exportação padrão da função para uso direto no sistema de roteamento
export default createFlashcardFSRSRoutes;