import { Router } from 'express';
import { ReviewManagementController } from '../controllers/ReviewManagementController';
import { ReviewManagementService } from '../services/ReviewManagementService';
import { FSRSService } from '../../../srs/services/FSRSService';
import { authMiddleware } from '../../../auth/middleware/auth.middleware';
import { firestore } from 'firebase-admin';

const router = Router();

// Inicializar serviços
const db = firestore();
const fsrsService = new FSRSService(db);
const reviewManagementService = new ReviewManagementService(db, fsrsService);
const reviewManagementController = new ReviewManagementController(reviewManagementService);

// === MARCAR DIA COMO CONCLUÍDO ===

/**
 * @route POST /api/reviews/mark-day-complete
 * @desc Marcar dia como concluído
 * @access Private
 * @body {
 *   skipGrade?: boolean,
 *   applyGrade?: 'AGAIN' | 'HARD' | 'GOOD' | 'EASY',
 *   notes?: string
 * }
 */
router.post(
  '/mark-day-complete',
  authMiddleware,
  reviewManagementController.markDayComplete
);

// === REMOVER/RESTAURAR ITENS ===

/**
 * @route DELETE /api/reviews/remove-item
 * @desc Remover item do ciclo de revisões
 * @access Private
 * @body {
 *   contentType: 'flashcard' | 'question' | 'error_notebook',
 *   contentId: string,
 *   reason: 'USER_REQUEST' | 'CONTENT_DELETED' | 'DUPLICATE' | 'MASTERED' | 'INAPPROPRIATE' | 'SYSTEM_CLEANUP',
 *   notes?: string,
 *   softDelete?: boolean
 * }
 */
router.delete(
  '/remove-item',
  authMiddleware,
  reviewManagementController.removeFromReviews
);

/**
 * @route POST /api/reviews/restore-item
 * @desc Restaurar item removido para o ciclo de revisões
 * @access Private
 * @body {
 *   removedItemId: string
 * }
 */
router.post(
  '/restore-item',
  authMiddleware,
  reviewManagementController.restoreToReviews
);

/**
 * @route GET /api/reviews/removed-items
 * @desc Obter itens removidos do usuário
 * @access Private
 * @query {
 *   limit?: number (1-200, default: 50)
 * }
 */
router.get(
  '/removed-items',
  authMiddleware,
  reviewManagementController.getRemovedItems
);

// === ESTATÍSTICAS E HISTÓRICO ===

/**
 * @route GET /api/reviews/day-completion-stats
 * @desc Obter estatísticas de completação de dias
 * @access Private
 */
router.get(
  '/day-completion-stats',
  authMiddleware,
  reviewManagementController.getDayCompletionStats
);

/**
 * @route GET /api/reviews/completion-history
 * @desc Obter histórico de completações
 * @access Private
 * @query {
 *   days?: number (1-365, default: 30)
 * }
 */
router.get(
  '/completion-history',
  authMiddleware,
  reviewManagementController.getCompletionHistory
);

// === UTILITÁRIOS ===

/**
 * @route GET /api/reviews/removal-reasons
 * @desc Obter lista de razões de remoção disponíveis
 * @access Public
 */
router.get(
  '/removal-reasons',
  reviewManagementController.getRemovalReasons
);

/**
 * @route GET /api/reviews/fsrs-grades
 * @desc Obter lista de grades FSRS disponíveis
 * @access Public
 */
router.get(
  '/fsrs-grades',
  reviewManagementController.getFSRSGrades
);

export default router;

/**
 * EXEMPLOS DE USO:
 * 
 * 1. Marcar dia como concluído (aplicando grade GOOD em itens pendentes):
 * POST /api/reviews/mark-day-complete
 * {
 *   "applyGrade": "GOOD",
 *   "notes": "Dia produtivo de estudos!"
 * }
 * 
 * 2. Marcar dia como concluído (sem aplicar grade):
 * POST /api/reviews/mark-day-complete
 * {
 *   "skipGrade": true,
 *   "notes": "Não consegui revisar tudo hoje"
 * }
 * 
 * 3. Remover flashcard das revisões (soft delete):
 * DELETE /api/reviews/remove-item
 * {
 *   "contentType": "flashcard",
 *   "contentId": "flashcard123",
 *   "reason": "MASTERED",
 *   "notes": "Já domino este conteúdo"
 * }
 * 
 * 4. Remover questão permanentemente (hard delete):
 * DELETE /api/reviews/remove-item
 * {
 *   "contentType": "question",
 *   "contentId": "question456",
 *   "reason": "USER_REQUEST",
 *   "softDelete": false,
 *   "notes": "Questão irrelevante"
 * }
 * 
 * 5. Restaurar item removido:
 * POST /api/reviews/restore-item
 * {
 *   "removedItemId": "removed_item_789"
 * }
 * 
 * 6. Ver itens removidos:
 * GET /api/reviews/removed-items?limit=20
 * 
 * 7. Ver estatísticas de completação:
 * GET /api/reviews/day-completion-stats
 * 
 * 8. Ver histórico dos últimos 60 dias:
 * GET /api/reviews/completion-history?days=60
 */