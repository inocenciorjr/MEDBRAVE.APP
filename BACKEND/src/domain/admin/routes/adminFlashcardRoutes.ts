import { Router } from 'express';
import { AdminFlashcardController } from '../controllers/AdminFlashcardController';
import { authMiddleware } from '../../auth/middleware/auth.middleware';
import { adminMiddleware } from '../../auth/middleware/admin.middleware';

export function createAdminFlashcardRoutes(controller: AdminFlashcardController): Router {
  const router = Router();

  // Middleware de autenticação
  router.use(authMiddleware);
  
  // Middleware de administração (removido para permitir importação por usuários autenticados)
  // router.use(adminMiddleware);

  // Rotas disponíveis para usuários autenticados
  router.get('/decks', controller.getAllDecks.bind(controller)); // Listar decks do usuário
  router.get('/decks/:deckId', controller.getDeckById.bind(controller));
  router.put('/decks/:deckId/public-status', adminMiddleware, controller.toggleDeckPublicStatus.bind(controller));
  router.delete('/decks/:deckId', controller.deleteDeck.bind(controller)); // Removido adminMiddleware temporariamente
  router.post('/decks/batch-delete', controller.deleteDecksBatch.bind(controller)); // Exclusão em lote
  
  // Rotas para cards individuais
  router.get('/cards/:cardId', controller.getCardById.bind(controller)); // Visualizar card
  router.put('/cards/:cardId', controller.updateCard.bind(controller)); // Editar card
  router.delete('/cards/:cardId', controller.deleteCard.bind(controller)); // Excluir card
  
  // Rotas de comunidade
  router.get('/community', controller.getCommunityDecks.bind(controller));
  
  // Estatísticas
  router.get('/stats', controller.getFlashcardStats.bind(controller));

  // 🚀 NOVAS ROTAS OTIMIZADAS PARA CARREGAMENTO LAZY
  router.get('/collections/metadata', controller.getCollectionsMetadata.bind(controller));
  router.get('/collections/:collectionName/decks', controller.getCollectionDecks.bind(controller));

  // Novas rotas para sistema de coleções públicas
  router.get('/community/collections', controller.getCommunityCollections.bind(controller));
  router.get('/collections/:collectionId/details', controller.getPublicCollectionDetails.bind(controller));
  router.post('/collections/:collectionId/add-to-library', controller.addCollectionToLibrary.bind(controller));
  router.delete('/collections/:collectionId/remove-from-library', controller.removeCollectionFromLibrary.bind(controller));
  router.get('/my-library', controller.getMyLibrary.bind(controller));
  router.put('/collections/:collectionId/public-status', controller.toggleCollectionPublicStatus.bind(controller));

  // 🔍 Nova rota para busca global com filtros FSRS
  router.get('/search', controller.globalSearch.bind(controller));

  // 📊 FSRS stats agora disponível via /api/flashcards/fsrs-stats
  // Removida rota duplicada para evitar conflitos

  return router;
}