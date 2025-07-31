import { Router } from 'express';
import { authMiddleware } from '../../../../domain/auth/middleware/auth.middleware';
import { FlashcardController } from '../controllers/flashcardController';
import deckRoutes from './deckRoutes';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import * as admin from 'firebase-admin';
// eslint-disable-next-line @typescript-eslint/no-explicit-any

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/temp/',
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB max
  },
  fileFilter: (_req, file, cb) => {
    if (file.originalname.toLowerCase().endsWith('.apkg')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos .apkg são permitidos'));
    }
  }
});

// Helper async wrapper para capturar erros e evitar uso de try/catch em cada rota
// Aceita qualquer assinatura e delega para o controller
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const wrap = (fn: any) => (req: any, res: any, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export const createFlashcardRoutes = (controller: FlashcardController): Router => {
  const router = Router();

  // Preview de arquivo APKG usando processador disponível
  router.post(
    '/preview-apkg',
    authMiddleware,
    upload.single('apkgFile'),
    async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ success: false, error: 'Arquivo APKG é obrigatório' });
        }
        // Carregar processador completo
        const projectRoot = process.cwd();
        const ProcessadorFuncionando = require(path.join(projectRoot, 'processador-apkg-completo.js')).ProcessadorAPKGCompleto;
        const processador = new ProcessadorFuncionando();
        // Executar parse apenas
        const resultadoJS = await processador.processarAPKG(req.file.path, req.user!.id);
        const resultado = resultadoJS.resultado;
        const decksPreview = resultado.resultado.medbraveDecks || [];
        const totalDecksPreview = decksPreview.length;
        const totalCardsPreview = (decksPreview as unknown[]).reduce((sum: number, d: any) => sum + (d.cards?.length || 0), 0);

        return res.json({
          fileName: req.file.originalname,
          fileSize: req.file.size,
          deckName: resultado.colecao || path.basename(req.file.originalname, path.extname(req.file.originalname)),
          stats: {
            totalCards: totalCardsPreview,
            totalDecks: totalDecksPreview,
            totalNotes: resultado.stats?.totalNotes || 0,
            totalMedia: resultado.stats?.totalMedia || 0,
            medbraveDecks: totalDecksPreview
          },
          metadata: {
            algorithm: resultado.algorithm || 'FSRS v4.5',
            processor: resultado.processor || 'processador-apkg-completo',
            created: resultado.processedAt || new Date().toISOString(),
            fsrsEnabled: resultado.fsrsEnabled || true,
            collectionName: resultado.colecao
          },
          sampleCards: resultado.sampleCards || [],
          warnings: resultado.warnings || []
        });
      } catch (error: any) {
        console.error('Erro no preview APKG:', error);
        return res.status(500).json({ success: false, error: error.message });
      } finally {
        // Limpar arquivo temporário
        if (req.file && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
      }
    }
  );

  // Subrotas para decks
  router.use('/decks', deckRoutes);

  /**
   * @swagger
   * /api/flashcards:
   *   post:
   *     summary: Create a new flashcard
   *     tags: [Flashcards]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateFlashcardDTO'
   *     responses:
   *       201:
   *         description: Flashcard created successfully
   */
  router.post('/', authMiddleware, controller.create);

  /**
   * @swagger
   * /api/flashcards/my-library:
   *   get:
   *     summary: Get user's library
   *     description: Retrieve collections in user's library
   *     tags: [Flashcards]
   *     security:
   *       - bearerAuth: []
   *     parameters:
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
   *         description: Items per page (max 50)
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
   *           default: addedAt
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
   *         description: Library retrieved successfully
   *       401:
   *         description: Unauthorized
   */
  router.get('/my-library', authMiddleware, controller.getMyLibrary);

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

  /**
   * @swagger
   * /api/flashcards/search:
   *   get:
   *     summary: Search flashcards globally
   *     description: Search across all user's flashcards with FSRS filters
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
   *         description: FSRS filters (comma-separated)
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
  router.get('/search', controller.globalSearch);

  /**
   * @swagger
   * /api/flashcards/fsrs-status:
   *   get:
   *     summary: Get FSRS status statistics
   *     description: Get FSRS review status for all user's cards
   *     tags: [Flashcards]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: FSRS status statistics
   *       401:
   *         description: Unauthorized
   */
  router.get('/fsrs-status', controller.getFSRSStatus);

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
  router.get('/collections/metadata', controller.getCollectionsMetadata);

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
  router.get('/collections/:collectionName/decks', controller.getCollectionDecks);

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
  router.put('/decks/:deckId/public-status', controller.toggleDeckPublicStatus);

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
  router.delete('/decks/:deckId', controller.deleteDeck);

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
  router.get('/decks/user/:userId', controller.getUserDecks);

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
  router.get('/flashcards/filtered', controller.getFlashcardsWithFilters);

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
  router.get('/decks', controller.getAllDecks);

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
  router.post('/:id/duplicate', controller.duplicateCard);

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
  router.delete('/batch-delete', controller.deleteBatch);

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
   router.get('/deck/:deckId/cards', controller.getCardsByDeck);

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
   router.put('/:id/tags', controller.updateCardTags);

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
   router.get('/deck/:deckId/stats', controller.getDeckCardStats);

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
   router.post('/decks/batch-stats', controller.getBatchDeckStats);

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
    *           default: 1
    *         description: Page number
    *       - in: query
    *         name: limit
    *         schema:
    *           type: integer
    *           default: 20
    *         description: Items per page (max 50)
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
   router.get('/community/collections', controller.getCommunityCollections);

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
   router.post('/collections/:id/add-to-library', controller.addToLibrary);

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
   router.delete('/collections/:id/remove-from-library', controller.removeFromLibrary);

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
   router.post('/collections/:id/like', controller.toggleLikeCollection);

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
   router.post('/collections/:id/rate', controller.rateCollection);

   /**
    * @swagger
    * /api/flashcards/apkg-fsrs/import:
    *   post:
    *     summary: Start APKG import with real-time progress
    *     description: Import APKG file with advanced features and progress tracking
    *     tags: [Flashcards]
    *     security:
    *       - bearerAuth: []
    *     requestBody:
    *       required: true
    *       content:
    *         multipart/form-data:
    *           schema:
    *             type: object
    *             required:
    *               - file
    *               - name
    *             properties:
    *               file:
    *                 type: string
    *                 format: binary
    *                 description: APKG file to import
    *               name:
    *                 type: string
    *                 description: Name for the imported deck
    *               description:
    *                 type: string
    *                 description: Description for the deck
    *               tags:
    *                 type: array
    *                 items:
    *                   type: string
    *                 description: Tags for the deck
    *               isPublic:
    *                 type: boolean
    *                 default: false
    *                 description: Make deck public
    *               category:
    *                 type: string
    *                 default: medicina
    *                 description: Deck category
    *               language:
    *                 type: string
    *                 default: pt
    *                 description: Deck language
    *               difficulty:
    *                 type: string
    *                 default: intermediate
    *                 description: Deck difficulty
    *               duplicateHandling:
    *                 type: string
    *                 enum: [skip, update, create]
    *                 default: skip
    *                 description: How to handle duplicate cards
    *               enableFSRS:
    *                 type: boolean
    *                 default: true
    *                 description: Enable FSRS algorithm
    *               processImages:
    *                 type: boolean
    *                 default: true
    *                 description: Process images in cards
    *               processAudio:
    *                 type: boolean
    *                 default: false
    *                 description: Process audio files
    *               chunkSize:
    *                 type: integer
    *                 default: 100
    *                 minimum: 10
    *                 maximum: 500
    *                 description: Batch size for processing
    *               enableIndexing:
    *                 type: boolean
    *                 default: true
    *                 description: Enable database indexing
    *     responses:
    *       200:
    *         description: Import started successfully
    *       400:
    *         description: Invalid request or file
    *       401:
    *         description: Unauthorized
    */
  router.post(
    '/apkg-fsrs/import',
    upload.single('file'),
    async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ success: false, error: 'Arquivo APKG é obrigatório' });
        }

        const userId = req.user!.id;
        // Obter slug do usuário (deve já existir via auth middleware)
        const getUserSlug = async (): Promise<string> => {
          const firestore = admin.firestore();
          const userRef = firestore.collection('users').doc(userId);
          const userSnap = await userRef.get();
          
          if (userSnap.exists && userSnap.data()?.usernameSlug) {
            return userSnap.data()!.usernameSlug;
          }
          
          // Fallback: usar userId se slug não existir (não deveria acontecer)
          console.warn(`⚠️ Usuário ${userId} não tem slug, usando userId como fallback`);
          return userId.substring(0, 8); // Primeiros 8 chars do userId
        };

        await getUserSlug(); // Garante que o slug existe
        const previewOnly = req.body.previewOnly === 'true';

        console.log(`🚀 Processando APKG: ${req.file.originalname}, Preview: ${previewOnly}`);

        // Carregar processador completo
        const projectRoot = process.cwd();
        const ProcessadorCompleto = require(path.join(projectRoot, 'processador-apkg-completo.js')).ProcessadorAPKGCompleto;
        const processador = new ProcessadorCompleto();

        // Executar processamento completo
        const resultado = await processador.processarAPKG(req.file.path, userId, {
          collectionName: null, // Usar nome do arquivo
          saveToDatabase: !previewOnly // Só salvar se não for preview
        });

        if (!resultado.success) {
          throw new Error(resultado.error || 'Erro no processamento');
        }

        console.log(`✅ Processamento concluído. Preview: ${previewOnly}, Cards: ${resultado.resultado.stats.totalCards}`);

        if (previewOnly) {
          // Gerar sessionId para armazenar dados temporariamente
          const sessionId = `apkg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          // Armazenar dados processados em cache temporário (Redis ou memória)
          // Por simplicidade, vou usar um Map global por ora
          (global as any).tempAPKGSessions = (global as any).tempAPKGSessions || new Map();
          (global as any).tempAPKGSessions.set(sessionId, {
            resultado: resultado.resultado,
            userId,
            processedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutos
          });

          // Retornar preview
          const decksPreview = resultado.resultado.medbraveDecks || [];
          const totalDecksPreview = decksPreview.length;
          const totalCardsPreview = (decksPreview as unknown[]).reduce((sum: number, d: any) => sum + (d.cards?.length || 0), 0);

          return res.json({
            success: true,
            sessionId,
            preview: true,
            stats: {
              totalDecks: totalDecksPreview,
              totalCards: totalCardsPreview,
              totalNotes: resultado.resultado.stats.totalNotes,
              totalMedia: resultado.resultado.stats.totalMedia
            },
            collectionName: resultado.resultado.colecao,
            warnings: resultado.resultado.warnings || [],
            metadata: {
              algorithm: resultado.resultado.algorithm,
              processor: resultado.processor,
              fsrsEnabled: resultado.fsrsEnabled
            }
          });
        } else {
          // Salvar diretamente (modo antigo para compatibilidade)
          return res.json({
            success: true,
            preview: false,
            resultado: resultado.resultado,
            importId: resultado.importId,
            stats: resultado.resultado.stats
          });
        }

      } catch (error: any) {
        console.error('❌ Erro no processamento APKG:', error);
        return res.status(500).json({ 
          success: false, 
          error: error.message || 'Erro interno do servidor' 
        });
      } finally {
        // Limpar arquivo temporário
        if (req.file && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
      }
    }
  );

  // Confirmar e salvar dados processados
  router.post(
    '/apkg-fsrs/confirm',
    authMiddleware,
    async (req, res) => {
      try {
        const { sessionId } = req.body;

        if (!sessionId) {
          return res.status(400).json({ success: false, error: 'SessionId é obrigatório' });
        }

        // Recuperar dados da sessão
        (global as any).tempAPKGSessions = (global as any).tempAPKGSessions || new Map();
        const sessionData = (global as any).tempAPKGSessions.get(sessionId);

        if (!sessionData) {
          return res.status(404).json({ success: false, error: 'Sessão não encontrada ou expirada' });
        }

        // Verificar se usuário pode confirmar esta sessão
        if (sessionData.userId !== req.user!.id) {
          return res.status(403).json({ success: false, error: 'Não autorizado' });
        }

        console.log(`💾 Confirmando salvamento da sessão: ${sessionId}`);

        // Obter slug do usuário (deve já existir via auth middleware)
        const getUserSlug = async (): Promise<string> => {
          const firestore = admin.firestore();
          const userRef = firestore.collection('users').doc(req.user!.id);
          const userSnap = await userRef.get();
          
          if (userSnap.exists && userSnap.data()?.usernameSlug) {
            return userSnap.data()!.usernameSlug;
          }
          
          // Fallback: usar userId se slug não existir (não deveria acontecer)
          console.warn(`⚠️ Usuário ${req.user!.id} não tem slug, usando userId como fallback`);
          return req.user!.id.substring(0, 8); // Primeiros 8 chars do userId
        };

        const userSlug: string = await getUserSlug();

        // Salvar dados no banco de dados
        const resultado = sessionData.resultado;
        
        // Usar FirebaseFlashcardService para salvar decks e cards
        const firestore = admin.firestore();
        const batch = firestore.batch();

        let savedDecks = 0;
        let savedCards = 0;

        // Função util para deixar id legível
        const sanitize = (txt: string) =>
          (txt || 'untitled')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .substring(0, 40);

        // Cache para evitar conflito no mesmo batch
        const generatedIds = new Set<string>();

        // Salvar cada deck da estrutura MedBrave
        for (const deckItem of resultado.medbraveDecks) {
          // A estrutura é {deck: ..., flashcards: ...}
          const deck = deckItem.deck || deckItem; // Compatibilidade com estruturas antigas
          const flashcards = deckItem.flashcards || deckItem.cards || [];
          
          // Construir id base legível
          let deckIdBase = `${userSlug}_${sanitize(resultado.colecao)}_${sanitize(deck.name || deck.title)}`;
          let deckId = deckIdBase;
          let suffix = 2;
          while (generatedIds.has(deckId)) {
            deckId = `${deckIdBase}_${suffix++}`;
          }
          generatedIds.add(deckId);

          const deckRef = firestore.collection('decks').doc(deckId);
          batch.set(deckRef, {
            ...deck,
            id: deckId
          });
          savedDecks++;

          // Salvar cards do deck
          let cardIndex = 1;
          for (const card of flashcards) {
            const cardId = `${deckId}_${cardIndex++}`;
            const cardRef = firestore.collection('flashcards').doc(cardId);
            batch.set(cardRef, {
              ...card,
              id: cardId,
              deckId: deckId
            });
            savedCards++;
          }
        }

        // Executar batch write
        await batch.commit();

        console.log(`✅ Salvamento concluído: ${savedDecks} decks, ${savedCards} cards`);

        // Atualizar / criar documento da coleção
        try {
          const colRef = firestore
            .collection('collections')
            .doc(`${req.user!.id}_${resultado.colecao}`);

          await colRef.set(
            {
              userId: req.user!.id,
              name: resultado.colecao,
              isPublic: false,
              deckCount: admin.firestore.FieldValue.increment(savedDecks),
              cardCount: admin.firestore.FieldValue.increment(savedCards),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
        } catch (colErr) {
          console.error('⚠️ Erro ao atualizar documento da coleção:', colErr);
        }

        // Limpar sessão temporária
        (global as any).tempAPKGSessions.delete(sessionId);

        return res.json({
          success: true,
          saved: true,
          stats: {
            decks: savedDecks,
            cards: savedCards,
            totalImported: savedCards
          },
          collection: resultado.colecao
        });

      } catch (error: any) {
        console.error('❌ Erro ao confirmar salvamento:', error);
        return res.status(500).json({ 
          success: false, 
          error: error.message || 'Erro ao salvar dados' 
        });
      }
    }
  );

  return router;
};

// Exportação padrão da função para uso direto no sistema de roteamento
export default createFlashcardRoutes;