import { Router } from 'express';
import { enhancedAuthMiddleware } from '../../../auth/middleware/enhancedAuth.middleware';
import { checkFlashcardsCreatedLimit, checkFlashcardDecksLimit } from '../../../auth/middleware/usageMiddlewares';
import { FlashcardController } from '../controllers/flashcardController';
import deckRoutes from './deckRoutes';
import apkgImportRoutes from './apkgImportRoutes';
import collectionRoutes from './collectionRoutes';
// Firebase admin removido - migrado para Supabase
// SupabaseSearchIndexService removed - now uses GIN index directly
// eslint-disable-next-line @typescript-eslint/no-explicit-any

import multer from 'multer';

// Alias para compatibilidade
const authMiddleware = enhancedAuthMiddleware;

// Helper async wrapper para capturar erros e evitar uso de try/catch em cada rota
// Aceita qualquer assinatura e delega para o controller
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const wrap = (fn: any) => (req: any, res: any, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export const createFlashcardRoutes = (
  controller: FlashcardController,
): Router => {
  const router = Router();

  // ===== ROTAS ESPECÍFICAS PRIMEIRO (antes de /:id) =====
  
  // Biblioteca do usuário
  router.get('/my-library', enhancedAuthMiddleware, controller.getMyLibrary);
  
  // Busca global
  router.get('/search', enhancedAuthMiddleware, controller.globalSearch);
  
  // Coleções
  router.get('/collections/metadata', authMiddleware, controller.getCollectionsMetadata);
  router.get('/collections/:collectionName/decks', authMiddleware, controller.getCollectionDecks);
  
  // Comunidade
  router.get('/official/collections', authMiddleware, controller.getOfficialCollections);
  router.get('/community/collections', authMiddleware, controller.getCommunityCollections);
  router.get('/community/collections/:collectionName', authMiddleware, controller.getPublicCollectionDetails);
  
  // Estatísticas em lote
  router.post('/decks/batch-stats', authMiddleware, controller.getBatchDeckStats);
  
  // Deck específico
  router.get('/deck/:deckId/cards', authMiddleware, controller.getCardsByDeck);
  router.get('/deck/:deckId/stats', authMiddleware, controller.getDeckCardStats);
  
  // Upload de imagem para flashcards
  const imageUpload = multer({
    dest: 'uploads/temp/',
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (_req, file, cb) => {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Apenas imagens são permitidas'));
      }
    },
  });
  router.post('/upload-image', authMiddleware, imageUpload.single('file'), controller.uploadFlashcardImage);
  
  // ===== ROTAS DE SESSÃO DE ESTUDO =====
  router.get('/decks/:deckId/session', authMiddleware, controller.getStudySession);
  router.put('/decks/:deckId/session', authMiddleware, controller.updateStudySession);
  router.delete('/decks/:deckId/session', authMiddleware, controller.finishStudySession);
  router.get('/decks/:deckId/stats', authMiddleware, controller.getDeckStatistics);
  
  // Subrotas para decks (CRUD)
  router.use('/decks', deckRoutes);

  // ===== ROTAS GENÉRICAS DEPOIS =====
  
  // Criar flashcard (com verificação de limite)
  router.post('/', enhancedAuthMiddleware, checkFlashcardsCreatedLimit as any, controller.create);

  /**
   * @swagger
   * /api/flashcards/search:
   *   get:
   *     summary: Search flashcards globally
   *     description: Search across all user's flashcards
   *     tags: [Flashcards]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: q
   *         required: true
   *         schema:
   *           type: string
   *         description: Search query (minimum 2 characters)
   *       - in: query
   *         name: filters
   *         schema:
   *           type: string
   *         description: Filters (comma-separated)
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *         description: Page number
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 50
   *         description: Items per page
   *     responses:
   *       200:
   *         description: Search results
   *       400:
   *         description: Invalid query
   *       401:
   *         description: Unauthorized
   */
  // router.get('/search', authMiddleware, controller.globalSearch); // MOVIDO PARA O TOPO

  /**
   * @swagger
   * /api/flashcards/bulk:
   *   post:
   *     summary: Get multiple flashcards by IDs
   *     tags: [Flashcards]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - ids
   *             properties:
   *               ids:
   *                 type: array
   *                 items:
   *                   type: string
   *     responses:
   *       200:
   *         description: Flashcards retrieved successfully
   */
  router.post('/bulk', authMiddleware, controller.getByIds);

  /**
   * @swagger
   * /api/flashcards/{id}:
   *   get:
   *     summary: Get a flashcard by ID
   *     tags: [Flashcards]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Flashcard details
   */
  router.get('/:id', authMiddleware, controller.getById);

  /**
   * @swagger
   * /api/flashcards:
   *   get:
   *     summary: Get user flashcards with pagination and filters
   *     tags: [Flashcards]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *         default: 1
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *         default: 10
   *       - in: query
   *         name: deckId
   *         schema:
   *           type: string
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *       - in: query
   *         name: readyForReview
   *         schema:
   *           type: boolean
   *     responses:
   *       200:
   *         description: List of flashcards
   */
  router.get('/', authMiddleware, controller.getByUser);

  /**
   * @swagger
   * /api/flashcards/{id}:
   *   put:
   *     summary: Update a flashcard
   *     tags: [Flashcards]
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
   *             $ref: '#/components/schemas/UpdateFlashcardDTO'
   *     responses:
   *       200:
   *         description: Flashcard updated successfully
   */
  router.put('/:id', authMiddleware, controller.update);

  /**
   * @swagger
   * /api/flashcards/{id}:
   *   delete:
   *     summary: Delete a flashcard
   *     tags: [Flashcards]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       204:
   *         description: Flashcard deleted successfully
   */
  router.delete('/:id', authMiddleware, controller.delete);

  /**
   * @swagger
   * /api/flashcards/{id}/archive:
   *   patch:
   *     summary: Toggle flashcard archive status
   *     tags: [Flashcards]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Flashcard archive status updated
   */
  router.patch('/:id/archive', authMiddleware, controller.toggleArchive);

  /**
   * @swagger
   * /api/flashcards/{id}/review:
   *   post:
   *     summary: Record a flashcard review
   *     tags: [Flashcards]
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
   *     responses:
   *       200:
   *         description: Review recorded successfully
   */
  router.post('/:id/review', authMiddleware, controller.recordReview);

  // Require authentication for all subsequent routes
  router.use(authMiddleware);

  // FSRS status endpoint removed - FSRS logic deprecated

  // 🚀 NOVAS ROTAS PARA ESTRUTURA HIERÁRQUICA

  /**
   * @swagger
   * /api/flashcards/collections/metadata:
   *   get:
   *     summary: Get collections metadata for hierarchical structure
   *     tags: [Flashcards]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Collections metadata
   */
  // router.get('/collections/metadata', authMiddleware, controller.getCollectionsMetadata); // MOVIDO PARA O TOPO

  /**
   * @swagger
   * /api/flashcards/collections/{collectionName}/decks:
   *   get:
   *     summary: Get decks from a specific collection
   *     tags: [Flashcards]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: collectionName
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Collection decks
   */
  // Rota já protegida no topo do arquivo

  /**
   * @swagger
   * /api/flashcards/decks/{deckId}/public-status:
   *   put:
   *     summary: Toggle deck public status
   *     tags: [Flashcards]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: deckId
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               isPublic:
   *                 type: boolean
   *     responses:
   *       200:
   *         description: Deck public status updated
   */
  router.put('/decks/:deckId/public-status', authMiddleware, controller.toggleDeckPublicStatus);

  /**
   * @swagger
   * /api/flashcards/decks/{deckId}:
   *   get:
   *     summary: Get deck by ID with cards
   *     tags: [Flashcards]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: deckId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Deck details with cards
   */
  router.get('/decks/:deckId', authMiddleware, wrap(controller.getDeckById));

  /**
   * @swagger
   * /api/flashcards/decks/{deckId}:
   *   delete:
   *     summary: Delete a deck
   *     tags: [Flashcards]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: deckId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Deck deleted successfully
   */
  router.delete('/decks/:deckId', authMiddleware, controller.deleteDeck);

  /**
   * @swagger
   * /api/flashcards/decks/user/{userId}:
   *   get:
   *     summary: Get all decks for a specific user
   *     tags: [Flashcards]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: User decks
   */
  router.get('/decks/user/:userId', authMiddleware, controller.getUserDecks);

  /**
   * @swagger
   * /api/flashcards/flashcards/filtered:
   *   get:
   *     summary: Get filtered flashcards
   *     tags: [Flashcards]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *       - in: query
   *         name: deckId
   *         schema:
   *           type: string
   *       - in: query
   *         name: tags
   *         schema:
   *           type: array
   *           items:
   *             type: string
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *       - in: query
   *         name: difficulty
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Filtered flashcards
   */
  router.get('/flashcards/filtered', authMiddleware, controller.getFlashcardsWithFilters);

  /**
   * @swagger
   * /api/flashcards/decks:
   *   get:
   *     summary: Get all user decks
   *     tags: [Flashcards]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *         default: 200
   *     responses:
   *       200:
   *         description: User decks
   */
  router.get('/decks', authMiddleware, controller.getAllDecks);

  /**
   * @swagger
   * /api/flashcards/{id}/duplicate:
   *   post:
   *     summary: Duplicate a flashcard
   *     description: Create a copy of an existing flashcard with optional modifications
   *     tags: [Flashcards]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Original flashcard ID
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               newDeckId:
   *                 type: string
   *                 description: Target deck ID (optional)
   *               modifications:
   *                 type: object
   *                 properties:
   *                   front:
   *                     type: string
   *                   back:
   *                     type: string
   *                   tags:
   *                     type: array
   *                     items:
   *                       type: string
   *                   difficulty:
   *                     type: number
   *     responses:
   *       201:
   *         description: Card duplicated successfully
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Original card not found
   */
  router.post('/:id/duplicate', authMiddleware, controller.duplicateCard);

  /**
   * @swagger
   * /api/flashcards/batch-delete:
   *   delete:
   *     summary: Delete multiple flashcards
   *     description: Delete multiple flashcards in batch
   *     tags: [Flashcards]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - cardIds
   *             properties:
   *               cardIds:
   *                 type: array
   *                 items:
   *                   type: string
   *                 description: Array of flashcard IDs to delete
   *     responses:
   *       200:
   *         description: Batch deletion completed
   *       400:
   *         description: Invalid card IDs
   *       401:
   *         description: Unauthorized
   */
  router.delete('/batch-delete', authMiddleware, controller.deleteBatch);

  /**
   * @swagger
   * /api/flashcards/deck/{deckId}/cards:
   *   get:
   *     summary: Get cards by deck with advanced filters
   *     description: Retrieve flashcards from a specific deck with filtering and pagination
   *     tags: [Flashcards]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: deckId
   *         required: true
   *         schema:
   *           type: string
   *         description: Deck ID
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *         description: Page number
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 20
   *         description: Items per page (max 100)
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *         description: Search term
   *       - in: query
   *         name: tags
   *         schema:
   *           type: array
   *           items:
   *             type: string
   *         description: Filter by tags
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [NEW, LEARNING, REVIEW, RELEARNING]
   *         description: Filter by status
   *       - in: query
   *         name: sortBy
   *         schema:
   *           type: string
   *           default: createdAt
   *         description: Sort field
   *       - in: query
   *         name: sortOrder
   *         schema:
   *           type: string
   *           enum: [asc, desc]
   *           default: desc
   *         description: Sort order
   *     responses:
   *       200:
   *         description: Cards retrieved successfully
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Deck not found
   */
  // router.get("/deck/:deckId/cards", controller.getCardsByDeck); // MOVIDO PARA O TOPO

  /**
   * @swagger
   * /api/flashcards/{id}/tags:
   *   put:
   *     summary: Update card tags
   *     description: Update the tags of a specific flashcard
   *     tags: [Flashcards]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Flashcard ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - tags
   *             properties:
   *               tags:
   *                 type: array
   *                 items:
   *                   type: string
   *                 description: Array of tag names
   *     responses:
   *       200:
   *         description: Tags updated successfully
   *       400:
   *         description: Invalid tags format
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Card not found
   */
  router.put("/:id/tags", authMiddleware, controller.updateCardTags);

  /**
   * @swagger
   * /api/flashcards/deck/{deckId}/stats:
   *   get:
   *     summary: Get deck card statistics
   *     description: Get detailed statistics for cards in a specific deck
   *     tags: [Flashcards]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: deckId
   *         required: true
   *         schema:
   *           type: string
   *         description: Deck ID
   *     responses:
   *       200:
   *         description: Statistics retrieved successfully
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Deck not found
   */
  // router.get("/deck/:deckId/stats", controller.getDeckCardStats); // MOVIDO PARA O TOPO

  /**
   * @swagger
   * /api/flashcards/decks/batch-stats:
   *   post:
   *     summary: Get batch deck statistics
   *     description: Get statistics for multiple decks in a single request
   *     tags: [Flashcards]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - deckIds
   *             properties:
   *               deckIds:
   *                 type: array
   *                 items:
   *                   type: string
   *                 description: Array of deck IDs (max 50)
   *                 maxItems: 50
   *     responses:
   *       200:
   *         description: Batch statistics retrieved successfully
   *       400:
   *         description: Invalid request parameters
   *       401:
   *         description: Unauthorized
   */
  // Rota já protegida no topo do arquivo

  /**
   * @swagger
   * /api/flashcards/community/collections:
   *   get:
   *     summary: Get community collections
   *     description: Retrieve public flashcard collections from the community
   *     tags: [Flashcards]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *         default: 1
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *         default: 20
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *         description: Search term
   *       - in: query
   *         name: tags
   *         schema:
   *           type: array
   *           items:
   *             type: string
   *         description: Filter by tags
   *       - in: query
   *         name: sortBy
   *         schema:
   *           type: string
   *           default: popularity
   *         description: Sort field (popularity, rating, downloads, created)
   *       - in: query
   *         name: sortOrder
   *         schema:
   *           type: string
   *           enum: [asc, desc]
   *           default: desc
   *         description: Sort order
   *     responses:
   *       200:
   *         description: Community collections retrieved successfully
   *       401:
   *         description: Unauthorized
   */
  // router.get("/community/collections", authMiddleware, controller.getCommunityCollections); // MOVIDO PARA O TOPO

  /**
   * @swagger
   * /api/flashcards/collections/{id}/add-to-library:
   *   post:
   *     summary: Add collection to library
   *     description: Add a public collection to user's library
   *     tags: [Flashcards]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Collection ID
   *     responses:
   *       200:
   *         description: Collection added to library successfully
   *       400:
   *         description: Collection already in library
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Collection is not public
   *       404:
   *         description: Collection not found
   */
  router.post("/collections/:id/add-to-library", authMiddleware, controller.addToLibrary);

  /**
   * @swagger
   * /api/flashcards/collections/{id}/remove-from-library:
   *   delete:
   *     summary: Remove collection from library
   *     description: Remove a collection from user's library
   *     tags: [Flashcards]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Collection ID
   *     responses:
   *       200:
   *         description: Collection removed from library successfully
   *       400:
   *         description: Collection not in library
   *       401:
   *         description: Unauthorized
   */
  router.delete(
    "/collections/:id/remove-from-library",
    authMiddleware,
    controller.removeFromLibrary,
  );

  // Montar as rotas de coleções ANTES das rotas genéricas com parâmetros
  router.use('/collections', collectionRoutes);

  /**
   * @swagger
   * /api/flashcards/collections/{collectionName}:
   *   delete:
   *     summary: Delete a collection
   *     description: Delete a collection and all its decks, flashcards, and media files from R2
   *     tags: [Flashcards]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: collectionName
   *         required: true
   *         schema:
   *           type: string
   *         description: Collection name
   *     responses:
   *       200:
   *         description: Collection deleted successfully
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Collection not found
   */
  router.delete(
    "/collections/:collectionName",
    authMiddleware,
    controller.deleteCollection,
  );

  /**
   * @swagger
   * /api/flashcards/collections/{id}/like:
   *   post:
   *     summary: Toggle like on collection
   *     description: Like or unlike a collection
   *     tags: [Flashcards]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Collection ID
   *     responses:
   *       200:
   *         description: Like toggled successfully
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Collection not found
   */
  router.post("/collections/:id/like", authMiddleware, controller.toggleLikeCollection);

  /**
   * @swagger
   * /api/flashcards/collections/{id}/rate:
   *   post:
   *     summary: Rate collection
   *     description: Add or update rating for a collection
   *     tags: [Flashcards]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Collection ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - rating
   *             properties:
   *               rating:
   *                 type: integer
   *                 minimum: 1
   *                 maximum: 5
   *                 description: Rating from 1 to 5 stars
   *               comment:
   *                 type: string
   *                 description: Optional comment
   *     responses:
   *       200:
   *         description: Rating saved successfully
   *       400:
   *         description: Invalid rating
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Collection not found
   */
  router.post("/collections/:id/rate", authMiddleware, controller.rateCollection);

  // Montar as rotas de importação APKG
  router.use('/', apkgImportRoutes);

  // ==================== NOVAS ROTAS PARA COLLECTIONS COM ID ÚNICO ====================

  /**
   * @swagger
   * /api/flashcards/collections:
   *   post:
   *     summary: Create a new collection with unique ID
   *     tags: [Collections]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - name
   *             properties:
   *               name:
   *                 type: string
   *               description:
   *                 type: string
   *               is_public:
   *                 type: boolean
   *               thumbnail_url:
   *                 type: string
   *     responses:
   *       201:
   *         description: Collection created successfully
   */
  router.post('/collections', authMiddleware, controller.createCollection);

  /**
   * @swagger
   * /api/flashcards/collections/by-id/{collectionId}:
   *   get:
   *     summary: Get collection by unique ID
   *     tags: [Collections]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: collectionId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Collection details
   */
  router.get('/collections/by-id/:collectionId', authMiddleware, controller.getCollectionByUniqueId);

  /**
   * @swagger
   * /api/flashcards/collections/by-id/{collectionId}/decks:
   *   get:
   *     summary: Get decks from collection by unique ID
   *     tags: [Collections]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: collectionId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Collection decks
   */
  router.get('/collections/by-id/:collectionId/decks', authMiddleware, controller.getDecksByCollectionId);

  /**
   * @swagger
   * /api/flashcards/collections/by-id/{collectionId}/add:
   *   post:
   *     summary: Add collection to library by unique ID
   *     tags: [Collections]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: collectionId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Collection added to library
   */
  router.post('/collections/by-id/:collectionId/add', authMiddleware, controller.addCollectionToLibrary);

  /**
   * @swagger
   * /api/flashcards/collections/by-id/{collectionId}/remove:
   *   delete:
   *     summary: Remove collection from library by unique ID
   *     tags: [Collections]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: collectionId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Collection removed from library
   */
  router.delete('/collections/by-id/:collectionId/remove', authMiddleware, controller.removeCollectionFromLibrary);

  /**
   * @swagger
   * /api/flashcards/collections/by-id/{collectionId}/check:
   *   get:
   *     summary: Check if collection is in library
   *     tags: [Collections]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: collectionId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Library check result
   */
  router.get('/collections/by-id/:collectionId/check', authMiddleware, controller.checkCollectionInLibrary);

  /**
   * @swagger
   * /api/flashcards/collections/by-id/{collectionId}:
   *   put:
   *     summary: Update collection by unique ID
   *     tags: [Collections]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: collectionId
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 type: string
   *               description:
   *                 type: string
   *               is_public:
   *                 type: boolean
   *               thumbnail_url:
   *                 type: string
   *     responses:
   *       200:
   *         description: Collection updated successfully
   */
  router.put('/collections/by-id/:collectionId', authMiddleware, controller.updateCollectionById);

  /**
   * @swagger
   * /api/flashcards/collections/by-id/{collectionId}:
   *   delete:
   *     summary: Delete collection by unique ID
   *     tags: [Collections]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: collectionId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Collection deleted successfully
   */
  router.delete('/collections/by-id/:collectionId', authMiddleware, controller.deleteCollectionById);

  // ==================== ROTAS DE SESSÃO DE ESTUDO ====================

  /**
   * @swagger
   * /api/flashcards/decks/{deckId}/session:
   *   get:
   *     summary: Get or create study session for a deck
   *     tags: [Study Sessions]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: deckId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Study session retrieved successfully
   */
  router.get('/decks/:deckId/session', authMiddleware, controller.getStudySession);

  /**
   * @swagger
   * /api/flashcards/decks/{deckId}/session:
   *   put:
   *     summary: Update study session progress
   *     tags: [Study Sessions]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: deckId
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               current_index:
   *                 type: number
   *               studied_cards:
   *                 type: number
   *               reviewed_card_ids:
   *                 type: array
   *                 items:
   *                   type: string
   *     responses:
   *       200:
   *         description: Session updated successfully
   */
  router.put('/decks/:deckId/session', authMiddleware, controller.updateStudySession);

  /**
   * @swagger
   * /api/flashcards/decks/{deckId}/session:
   *   delete:
   *     summary: Finish study session
   *     tags: [Study Sessions]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: deckId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Session finished successfully
   */
  router.delete('/decks/:deckId/session', authMiddleware, controller.finishStudySession);

  /**
   * @swagger
   * /api/flashcards/decks/{deckId}/stats:
   *   get:
   *     summary: Get deck statistics (studied, new, review cards)
   *     tags: [Study Sessions]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: deckId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Deck statistics retrieved successfully
   */
  router.get('/decks/:deckId/stats', authMiddleware, controller.getDeckStatistics);

  return router;
};

// Exportação padrão da função para uso direto no sistema de roteamento
export default createFlashcardRoutes;
