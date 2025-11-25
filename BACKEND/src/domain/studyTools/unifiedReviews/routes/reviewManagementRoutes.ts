import { Router } from 'express';

const router = Router();

// Rotas de gerenciamento de revisões removidas - serviço descontinuado
// Retornar 410 Gone para indicar que o recurso foi removido permanentemente

const removedRoutes = [
  '/mark-day-complete',
  '/remove-item',
  '/restore-item',
  '/removed-items',
  '/day-completion-stats',
  '/completion-history',
  '/removal-reasons',
  '/fsrs-grades'
];

removedRoutes.forEach(route => {
  router.all(route, (_req, res) => {
    res.status(410).json({
      error: 'Serviço de gerenciamento de revisões foi removido permanentemente',
      message: 'Este endpoint não está mais disponível'
    });
  });
});

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
