import { Router } from 'express';
import { deckController } from '../controllers/deckController';
import { enhancedAuthMiddleware } from '../../../auth/middleware/enhancedAuth.middleware';
import { checkFlashcardDecksLimit } from '../../../auth/middleware/usageMiddlewares';
// searchIndexMiddleware removed - now uses GIN index directly (auto-updated)

const router = Router();

// Todas as rotas requerem autenticação + plano
router.use(enhancedAuthMiddleware);

// ROTAS ESPECÍFICAS PRIMEIRO (para evitar conflitos com /:id)

// Rotas de busca e filtros
router.get('/search', deckController.searchDecks.bind(deckController));

// Rotas de tags
router.get('/tags', deckController.getAvailableTags.bind(deckController));

// Rotas de estatísticas
router.get('/stats/user', deckController.getUserStats.bind(deckController));

// Rotas públicas
router.get('/public', deckController.listPublicDecks.bind(deckController));

// Rotas de favoritos
router.get('/favorites', deckController.getFavoriteDecks.bind(deckController));

// ROTAS GENÉRICAS POR ÚLTIMO

// Rotas de baralhos (CRUD básico)
router.post(
  '/',
  checkFlashcardDecksLimit as any,
  deckController.createDeck.bind(deckController),
);
router.get('/', deckController.listDecks.bind(deckController));
router.get('/:id', deckController.getDeckById.bind(deckController));
router.put(
  '/:id',
  deckController.updateDeck.bind(deckController),
);
router.delete(
  '/:id',
  deckController.deleteDeck.bind(deckController),
);

// Rotas de ações específicas em decks
router.post(
  '/:id/favorite',
  deckController.toggleFavoriteDeck.bind(deckController),
);
router.patch(
  '/:id/favorite',
  deckController.toggleFavoriteDeck.bind(deckController),
); // Alias para PATCH
router.patch(
  '/:id/visibility',
  deckController.toggleDeckVisibility.bind(deckController),
);

export default router;
