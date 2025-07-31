import { Response } from 'express';
import { AuthenticatedRequest } from '../../../../domain/auth/middleware/auth.middleware';
import {
  IFlashcardRepository,
  FlashcardFilters,
  PaginationOptions,
} from '../repositories/IFlashcardRepository';
import { CreateFlashcardUseCase } from '../use-cases/CreateFlashcardUseCase';
import { GetFlashcardByIdUseCase } from '../use-cases/GetFlashcardByIdUseCase';
import { GetUserFlashcardsUseCase } from '../use-cases/GetUserFlashcardsUseCase';
import { UpdateFlashcardUseCase } from '../use-cases/UpdateFlashcardUseCase';
import { DeleteFlashcardUseCase } from '../use-cases/DeleteFlashcardUseCase';
import { ToggleFlashcardArchiveUseCase } from '../use-cases/ToggleFlashcardArchiveUseCase';
import { RecordFlashcardReviewUseCase } from '../use-cases/RecordFlashcardReviewUseCase';
import { SearchFlashcardsUseCase } from '../use-cases/SearchFlashcardsUseCase';
import { validate } from '../validation/flashcardSchemas';

export class FlashcardController {
  constructor(private readonly flashcardRepository: IFlashcardRepository) {}

  create = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }
      const userId = req.user.id;

      const { error, value } = validate('createFlashcard', req.body);
      if (error) {
        return res.status(400).json({ error: error.message });
      }

      const createFlashcardUseCase = new CreateFlashcardUseCase(this.flashcardRepository);
      const flashcard = await createFlashcardUseCase.execute({
        ...value,
        userId,
      });

      return res.status(201).json(flashcard);
    } catch (error) {
      const appError = error as { name?: string; statusCode?: number; message?: string };
      if (appError.name === 'AppError') {
        return res.status(appError.statusCode || 400).json({ error: appError.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  };

  getById = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }
      const userId = req.user.id;
      const { id } = req.params;

      const getFlashcardByIdUseCase = new GetFlashcardByIdUseCase(this.flashcardRepository);
      const flashcard = await getFlashcardByIdUseCase.execute(id, userId);

      return res.status(200).json(flashcard);
    } catch (error) {
      const appError = error as { name?: string; statusCode?: number; message?: string };
      if (appError.name === 'AppError') {
        return res.status(appError.statusCode || 400).json({ error: appError.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  };

  getByUser = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }
      const userId = req.user.id;
      const {
        page = 1,
        limit = 10,
        deckId,
        status,
        readyForReview,
        tags,
        sortBy,
        sortOrder,
      } = req.query;

      const filters: FlashcardFilters = {
        deckId: deckId as string,
        status: status as any,
        readyForReview: readyForReview === 'true',
        tags: tags ? (Array.isArray(tags) ? (tags as string[]) : [tags as string]) : undefined,
      };

      const pagination: PaginationOptions = {
        page: Number(page),
        limit: Number(limit),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
      };

      const getUserFlashcardsUseCase = new GetUserFlashcardsUseCase(this.flashcardRepository);
      const result = await getUserFlashcardsUseCase.execute(userId, filters, pagination);

      // Padronizar resposta 
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      const appError = error as { name?: string; statusCode?: number; message?: string };
      if (appError.name === 'AppError') {
        return res.status(appError.statusCode || 400).json({ error: appError.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  };

  update = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }
      const userId = req.user.id;
      const { id } = req.params;

      const { error, value } = validate('updateFlashcard', req.body);
      if (error) {
        return res.status(400).json({ error: error.message });
      }

      const updateFlashcardUseCase = new UpdateFlashcardUseCase(this.flashcardRepository);
      const flashcard = await updateFlashcardUseCase.execute(id, userId, value);

      return res.status(200).json(flashcard);
    } catch (error) {
      const appError = error as { name?: string; statusCode?: number; message?: string };
      if (appError.name === 'AppError') {
        return res.status(appError.statusCode || 400).json({ error: appError.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  };

  delete = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }
      const userId = req.user.id;
      const { id } = req.params;

      const deleteFlashcardUseCase = new DeleteFlashcardUseCase(this.flashcardRepository);
      await deleteFlashcardUseCase.execute(id, userId);

      return res.status(204).send();
    } catch (error) {
      const appError = error as { name?: string; statusCode?: number; message?: string };
      if (appError.name === 'AppError') {
        return res.status(appError.statusCode || 400).json({ error: appError.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  };

  toggleArchive = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }
      const userId = req.user.id;
      const { id } = req.params;

      const toggleFlashcardArchiveUseCase = new ToggleFlashcardArchiveUseCase(
        this.flashcardRepository,
      );
      const flashcard = await toggleFlashcardArchiveUseCase.execute(id, userId);

      return res.status(200).json(flashcard);
    } catch (error) {
      const appError = error as { name?: string; statusCode?: number; message?: string };
      if (appError.name === 'AppError') {
        return res.status(appError.statusCode || 400).json({ error: appError.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  };

  recordReview = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }
      const userId = req.user.id;
      const { id } = req.params;
      const { reviewQuality } = req.body;

      if (reviewQuality === undefined || reviewQuality < 0 || reviewQuality > 3) {
        return res.status(400).json({ error: 'Invalid review quality' });
      }

      const recordFlashcardReviewUseCase = new RecordFlashcardReviewUseCase(
        this.flashcardRepository,
      );
      const flashcard = await recordFlashcardReviewUseCase.execute(id, userId, reviewQuality);

      return res.status(200).json(flashcard);
    } catch (error) {
      const appError = error as { name?: string; statusCode?: number; message?: string };
      if (appError.name === 'AppError') {
        return res.status(appError.statusCode || 400).json({ error: appError.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  };

  search = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }
      const userId = req.user.id;
      const { query } = req.query;

      if (!query) {
        return res.status(400).json({ error: 'Query parameter is required' });
      }

      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;
      
      const searchFlashcardsUseCase = new SearchFlashcardsUseCase(this.flashcardRepository);
      const results = await searchFlashcardsUseCase.execute(query as string, userId, { page, limit });

      return res.status(200).json(results);
    } catch (error) {
      const appError = error as { name?: string; statusCode?: number; message?: string };
      if (appError.name === 'AppError') {
        return res.status(appError.statusCode || 400).json({ error: appError.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  };

  getCollectionsMetadata = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }
      const userId = req.user.id;

      const collections = await this.flashcardRepository.getCollectionsMetadata(userId);
      
      return res.status(200).json({
        success: true,
        data: collections
      });
    } catch (error) {
      const appError = error as { name?: string; statusCode?: number; message?: string };
      if (appError.name === 'AppError') {
        return res.status(appError.statusCode || 400).json({ error: appError.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  };

  getCollectionDecks = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }
      const userId = req.user.id;
      const { collectionName } = req.params;

      const decks = await this.flashcardRepository.getCollectionDecks(userId, collectionName);
      
      return res.status(200).json({
        success: true,
        data: { decks }
      });
    } catch (error) {
      const appError = error as { name?: string; statusCode?: number; message?: string };
      if (appError.name === 'AppError') {
        return res.status(appError.statusCode || 400).json({ error: appError.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  };

  toggleDeckPublicStatus = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }
      const userId = req.user.id;
      const { deckId } = req.params;
      const { isPublic } = req.body;

      const deck = await this.flashcardRepository.updateDeckPublicStatus(deckId, userId, isPublic);
      
      return res.status(200).json({
        success: true,
        message: `Deck ${isPublic ? 'publicado' : 'despublicado'} com sucesso!`,
        data: deck
      });
    } catch (error) {
      const appError = error as { name?: string; statusCode?: number; message?: string };
      if (appError.name === 'AppError') {
        return res.status(appError.statusCode || 400).json({ error: appError.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  };

  deleteDeck = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }
      const userId = req.user.id;
      const { deckId } = req.params;

      await this.flashcardRepository.deleteDeck(deckId, userId);
      
      return res.status(200).json({
        success: true,
        message: 'Deck excluído com sucesso!'
      });
    } catch (error) {
      const appError = error as { name?: string; statusCode?: number; message?: string };
      if (appError.name === 'AppError') {
        return res.status(appError.statusCode || 400).json({ error: appError.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * 🎯 Obter deck por ID com cards (OTIMIZADO)
   */
  async getDeckById(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const { deckId } = req.params;
      console.log('🚨 [BACKEND getDeckById] Buscando deck:', deckId);

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
      }

      const userId = req.user.id;
      console.log('🚨 [BACKEND getDeckById] UserId:', userId);

      const deckData = await this.flashcardRepository.getDeckById(deckId, userId);
      console.log('🚨 [BACKEND getDeckById] Deck encontrado:', deckData ? 'SIM' : 'NÃO');
      
      if (!deckData) {
        return res.status(404).json({
          success: false,
          message: 'Deck não encontrado'
        });
      }

      console.log('🚨 [BACKEND getDeckById] Cards no deck:', deckData.cards?.length || 0);
      
      // DEBUG: Log dos primeiros cards
      if (deckData.cards && deckData.cards.length > 0) {
        console.log('🚨 [BACKEND getDeckById] Primeiros 3 cards IDs:', 
          deckData.cards.slice(0, 3).map(card => ({ 
            id: card.id, 
            front: card.frontContent?.substring(0, 30) || (card as any).front?.substring(0, 30) 
          }))
        );
      }

      return res.status(200).json({
        success: true,
        data: deckData,
        cards: deckData.cards || []
      });
    } catch (error) {
      console.error('❌ [BACKEND getDeckById] Erro:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao obter deck',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  };

  getAllDecks = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }
      const userId = req.user.id;
      const { limit = '200' } = req.query;

      const decks = await this.flashcardRepository.getAllUserDecks(userId, parseInt(limit as string));
      
      return res.status(200).json({
        success: true,
        data: decks
      });
    } catch (error) {
      const appError = error as { name?: string; statusCode?: number; message?: string };
      if (appError.name === 'AppError') {
        return res.status(appError.statusCode || 400).json({ error: appError.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  };

  getUserDecks = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }
      
      const { userId } = req.params;
      
      // Verificar se o usuário está acessando seus próprios decks
      if (userId !== req.user.id) {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      const decks = await this.flashcardRepository.getAllUserDecks(userId, 200);
      
      return res.status(200).json({
        success: true,
        data: decks
      });
    } catch (error) {
      const appError = error as { name?: string; statusCode?: number; message?: string };
      if (appError.name === 'AppError') {
        return res.status(appError.statusCode || 400).json({ error: appError.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  };

  getFlashcardsWithFilters = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }
      
      const { userId, deckId, tags, status, difficulty } = req.query;
      
      // Verificar se o usuário está acessando seus próprios flashcards
      if (userId && userId !== req.user.id) {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      const filters: any = {};
      if (deckId) filters.deckId = deckId;
      if (status) filters.status = status;
      if (difficulty) filters.difficulty = difficulty;
      if (tags) {
        filters.tags = Array.isArray(tags) ? tags : [tags];
      }

      const flashcards = await this.flashcardRepository.findByUser(
        userId as string || req.user.id,
        filters,
        { page: 1, limit: 1000 }
      );
      
      return res.status(200).json({
        success: true,
        data: flashcards.items || []
      });
    } catch (error) {
      const appError = error as { name?: string; statusCode?: number; message?: string };
      if (appError.name === 'AppError') {
        return res.status(appError.statusCode || 400).json({ error: appError.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * 🔍 NOVA API: Busca global de flashcards com filtros FSRS
   */
  globalSearch = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          success: false,
          error: 'Usuário não autenticado' 
        });
      }

      const query = req.query.q as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

      if (!query || query.trim().length < 2) {
        return res.status(400).json({
          success: false,
          error: 'Query deve ter pelo menos 2 caracteres'
        });
      }

      // Usar o SearchFlashcardsUseCase existente
      const searchFlashcardsUseCase = new SearchFlashcardsUseCase(this.flashcardRepository);
      const results = await searchFlashcardsUseCase.execute(query, req.user.id, { page, limit });

      return res.status(200).json({
        success: true,
        data: {
          directResults: results.items || [],
          folderResults: [],
          query,
          filters: [],
          stats: {
            totalDirectResults: results.total || 0,
            totalFolderResults: 0,
            totalResults: results.total || 0,
            folderGroupsCount: 0
          },
          pagination: {
            page,
            limit,
            total: results.total || 0,
            totalPages: Math.ceil((results.total || 0) / limit)
          }
        }
      });
    } catch (error) {
      console.error('Erro na busca global:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro na busca global'
      });
    }
  };

  /**
   * 📊 API: Status FSRS real com estatísticas calculadas
   */
  getFSRSStatus = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          success: false,
          error: 'Usuário não autenticado' 
        });
      }

      const userId = req.user.id;
      
      // ✅ CORREÇÃO: Buscar flashcards com limite otimizado e implementar paginação
      const allCards = await this.flashcardRepository.findByUser(
        userId, 
        {}, 
        { page: 1, limit: 500 } // ✅ MUDANÇA: Reduzido de 10000 para 500
      );

      const now = new Date();
      
      // Calcular estatísticas reais
      const stats = {
        totalCards: allCards.total || 0,
        pendingCards: 0,
        overdueCards: 0,
        upToDateCards: 0,
        neverStudiedCards: 0,
        lowPerformance: 0,
        mediumPerformance: 0,
        highPerformance: 0,
        deckStats: []
      };

      // Analisar cada card
      allCards.items.forEach((card: any) => {
        // Cards nunca estudados
        if (!card.lastReviewedAt) {
          stats.neverStudiedCards++;
          stats.pendingCards++;
          return;
        }

        // Verificar se está vencido
        if (card.nextReviewAt) {
          const nextReviewDate = card.nextReviewAt.toDate ? card.nextReviewAt.toDate() : new Date(card.nextReviewAt);
          
          if (nextReviewDate <= now) {
            stats.pendingCards++;
            
            // Se venceu há mais de 7 dias
            const daysSinceOverdue = (now.getTime() - nextReviewDate.getTime()) / (1000 * 60 * 60 * 24);
            if (daysSinceOverdue > 7) {
              stats.overdueCards++;
            }
          } else {
            stats.upToDateCards++;
          }
        }

        // Análise de performance baseada em dificuldade e lapsos
        if (card.srsData) {
          const { easeFactor = 2.5, lapses = 0 } = card.srsData;
          
          if (easeFactor < 2.0 || lapses > 3) {
            stats.lowPerformance++;
          } else if (easeFactor > 2.8 && lapses === 0) {
            stats.highPerformance++;
          } else {
            stats.mediumPerformance++;
          }
        }
      });

      return res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Erro ao buscar status FSRS:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao buscar status FSRS'
      });
    }
  };

  /**
   * 🔄 NOVA API: Duplicar flashcard
   */
  duplicateCard = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          success: false,
          error: 'Usuário não autenticado' 
        });
      }
      const userId = req.user.id;
      const { id } = req.params;
      const { newDeckId, modifications } = req.body;

      // Buscar card original
      const getFlashcardByIdUseCase = new GetFlashcardByIdUseCase(this.flashcardRepository);
      const originalCard = await getFlashcardByIdUseCase.execute(id, userId);

      // Criar novo card baseado no original
      const createFlashcardUseCase = new CreateFlashcardUseCase(this.flashcardRepository);
      const duplicatedCard = await createFlashcardUseCase.execute({
        frontContent: modifications?.frontContent || originalCard.frontContent,
        backContent: modifications?.backContent || originalCard.backContent,
        deckId: newDeckId || originalCard.deckId,
        tags: modifications?.tags || originalCard.tags,
        personalNotes: modifications?.personalNotes || originalCard.personalNotes,
        userId,
      });

      return res.status(201).json({
        success: true,
        message: 'Card duplicado com sucesso!',
        data: duplicatedCard
      });
    } catch (error) {
      console.error('Erro ao duplicar card:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao duplicar card'
      });
    }
  };

  /**
   * 🗑️ NOVA API: Exclusão em lote de cards
   */
  deleteBatch = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          success: false,
          error: 'Usuário não autenticado' 
        });
      }
      const userId = req.user.id;
      const { cardIds } = req.body;

      if (!Array.isArray(cardIds) || cardIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Lista de IDs de cards é obrigatória'
        });
      }

      const deleteFlashcardUseCase = new DeleteFlashcardUseCase(this.flashcardRepository);
      const results = {
        deleted: 0,
        failed: 0,
        errors: [] as string[]
      };

      // Processar exclusões em paralelo (máximo 10 por vez)
      const batchSize = 10;
      for (let i = 0; i < cardIds.length; i += batchSize) {
        const batch = cardIds.slice(i, i + batchSize);
        
        await Promise.allSettled(
          batch.map(async (cardId: string) => {
            try {
              await deleteFlashcardUseCase.execute(cardId, userId);
              results.deleted++;
            } catch (error) {
              results.failed++;
              results.errors.push(`Card ${cardId}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
            }
          })
        );
      }

      return res.status(200).json({
        success: true,
        message: `${results.deleted} cards excluídos com sucesso${results.failed > 0 ? `, ${results.failed} falharam` : ''}`,
        data: results
      });
    } catch (error) {
      console.error('Erro na exclusão em lote:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro na exclusão em lote'
      });
    }
  };

  /**
   * 🏷️ NOVA API: Buscar cards por deck com filtros avançados
   */
  getCardsByDeck = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          success: false,
          error: 'Usuário não autenticado' 
        });
      }
      const userId = req.user.id;
      const { deckId } = req.params;
      const {
        page = 1,
        limit = 20,
        search,
        tags,
        status,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const filters: FlashcardFilters = {
        deckId,
        searchTerm: search as string,
        tags: tags ? (Array.isArray(tags) ? (tags as string[]) : [tags as string]) : undefined,
        status: status as any,
      };

      const pagination: PaginationOptions = {
        page: Number(page),
        limit: Math.min(Number(limit), 100), // Máximo 100 por página
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
      };

      const getUserFlashcardsUseCase = new GetUserFlashcardsUseCase(this.flashcardRepository);
      const result = await getUserFlashcardsUseCase.execute(userId, filters, pagination);

      // Padronizar resposta para compatibilidade com frontend
      return res.status(200).json({
        success: true,
        data: {
          items: result.items || [],
          total: result.total || 0,
          page: Number(page),
          limit: Number(limit),
          hasMore: result.hasMore || false
        }
      });
    } catch (error) {
      console.error('Erro ao buscar cards do deck:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao buscar cards do deck'
      });
    }
  };

  /**
   * 🏷️ NOVA API: Atualizar tags de um card
   */
  updateCardTags = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          success: false,
          error: 'Usuário não autenticado' 
        });
      }
      const userId = req.user.id;
      const { id } = req.params;
      const { tags } = req.body;

      if (!Array.isArray(tags)) {
        return res.status(400).json({
          success: false,
          error: 'Tags devem ser um array'
        });
      }

      const updateFlashcardUseCase = new UpdateFlashcardUseCase(this.flashcardRepository);
      const flashcard = await updateFlashcardUseCase.execute(id, userId, { tags });

      return res.status(200).json({
        success: true,
        message: 'Tags atualizadas com sucesso!',
        data: flashcard
      });
    } catch (error) {
      console.error('Erro ao atualizar tags:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao atualizar tags'
      });
    }
  };

  /**
   * 📊 NOVA API: Estatísticas de cards por deck
   */
  getDeckCardStats = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          success: false,
          error: 'Usuário não autenticado' 
        });
      }
      const userId = req.user.id;
      const { deckId } = req.params;

      // ✅ CORREÇÃO: Buscar cards do deck com limite otimizado
      const filters: FlashcardFilters = { deckId };
      const pagination: PaginationOptions = { page: 1, limit: 200 }; // ✅ MUDANÇA: Reduzido de 10000 para 200

      const getUserFlashcardsUseCase = new GetUserFlashcardsUseCase(this.flashcardRepository);
      const result = await getUserFlashcardsUseCase.execute(userId, filters, pagination);

      // Calcular estatísticas
      const cards = result.items;
      const stats = {
        total: cards.length,
        byStatus: {
          new: cards.filter(c => c.status === 'NEW').length,
          learning: cards.filter(c => c.status === 'LEARNING').length,
          review: cards.filter(c => c.status === 'REVIEW').length,
          relearning: cards.filter(c => c.status === 'RELEARNING').length,
        },
        byDifficulty: {
          easy: cards.filter(c => (c.difficulty || 0) < 0.3).length,
          medium: cards.filter(c => (c.difficulty || 0) >= 0.3 && (c.difficulty || 0) < 0.7).length,
          hard: cards.filter(c => (c.difficulty || 0) >= 0.7).length,
        },
        tags: {} as Record<string, number>,
        averageDifficulty: cards.length > 0 
          ? cards.reduce((sum, c) => sum + (c.difficulty || 0), 0) / cards.length 
          : 0,
        lastReviewed: cards
          .map(c => c.lastReviewedAt)
          .filter(date => date !== null && date !== undefined)
          .sort((a, b) => (b as any).seconds - (a as any).seconds)[0] || null
      };

      // Contar tags
      cards.forEach(card => {
        if (card.tags) {
          card.tags.forEach(tag => {
            stats.tags[tag] = (stats.tags[tag] || 0) + 1;
          });
        }
      });

      return res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas do deck:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao buscar estatísticas do deck'
      });
    }
  };

  /**
   * 📊 NOVA API: Estatísticas em lote para múltiplos decks
   */
  getBatchDeckStats = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          success: false,
          error: 'Usuário não autenticado' 
        });
      }
      const userId = req.user.id;
      const { deckIds } = req.body;

      if (!deckIds || !Array.isArray(deckIds) || deckIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'deckIds deve ser um array não vazio'
        });
      }

      if (deckIds.length > 50) {
        return res.status(400).json({
          success: false,
          error: 'Máximo de 50 decks por requisição'
        });
      }

      const getUserFlashcardsUseCase = new GetUserFlashcardsUseCase(this.flashcardRepository);
      const batchStats: Record<string, any> = {};

      // Processar decks em paralelo
      await Promise.all(
        deckIds.map(async (deckId: string) => {
          try {
            const filters: FlashcardFilters = { deckId };
            const pagination: PaginationOptions = { page: 1, limit: 200 }; // ✅ MUDANÇA: Reduzido de 10000 para 200
            
            const result = await getUserFlashcardsUseCase.execute(userId, filters, pagination);
            const cards = result.items;

            batchStats[deckId] = {
              total: cards.length,
              byStatus: {
                new: cards.filter(c => c.status === 'NEW').length,
                learning: cards.filter(c => c.status === 'LEARNING').length,
                review: cards.filter(c => c.status === 'REVIEW').length,
                relearning: cards.filter(c => c.status === 'RELEARNING').length,
              },
              byDifficulty: {
                easy: cards.filter(c => (c.difficulty || 0) < 0.3).length,
                medium: cards.filter(c => (c.difficulty || 0) >= 0.3 && (c.difficulty || 0) < 0.7).length,
                hard: cards.filter(c => (c.difficulty || 0) >= 0.7).length,
              },
              tags: {} as Record<string, number>,
              lastReview: cards.length > 0 ? 
                Math.max(...cards.map(c => new Date(c.updatedAt).getTime())) : null
            };

            // Contar tags
            cards.forEach(card => {
              if (card.tags) {
                card.tags.forEach(tag => {
                  batchStats[deckId].tags[tag] = (batchStats[deckId].tags[tag] || 0) + 1;
                });
              }
            });
          } catch (error) {
            console.error(`Erro ao buscar estatísticas do deck ${deckId}:`, error);
            batchStats[deckId] = {
              error: 'Erro ao buscar estatísticas',
              total: 0,
              byStatus: { new: 0, learning: 0, review: 0, relearning: 0 },
              byDifficulty: { easy: 0, medium: 0, hard: 0 },
              tags: {},
              lastReview: null
            };
          }
        })
      );

      return res.status(200).json({
        success: true,
        data: batchStats
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas em lote:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao buscar estatísticas em lote'
      });
    }
  };

  /**
   * 🌍 NOVA API: Buscar coleções da comunidade
   */
  getCommunityCollections = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          success: false,
          error: 'Usuário não autenticado' 
        });
      }
      
      const userId = req.user.id;
      const { 
        page = 1, 
        limit = 20, 
        search, 
        tags, 
        featured, 
        category,
        sortBy = 'downloads', 
        sortOrder = 'desc' 
      } = req.query;

      const filters = {
        public: true, // Apenas coleções públicas
        searchTerm: search as string,
        tags: tags ? (Array.isArray(tags) ? (tags as string[]) : [tags as string]) : undefined,
        featured: featured === 'true',
        category: category as string
      };

      const pagination = {
        page: Number(page),
        limit: Math.min(Number(limit), 50),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
      };

      // Usar GetCollectionsMetadataUseCase existente
      const collections = await this.flashcardRepository.getCollectionsMetadata(userId, filters, pagination);

      // Adicionar estatísticas de popularidade
      const enrichedCollections = collections.map(collection => ({
        ...collection,
        stats: {
          downloads: collection.downloads || 0,
          likes: collection.likes || 0,
          avgRating: collection.avgRating || 0,
          totalCards: collection.totalCards || 0
        }
      }));

      return res.status(200).json({
        success: true,
        data: {
          collections: enrichedCollections,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total: collections.length,
            totalPages: Math.ceil(collections.length / Number(limit))
          }
        }
      });
    } catch (error) {
      console.error('Erro ao buscar coleções da comunidade:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao buscar coleções da comunidade'
      });
    }
  };

  /**
   * 📚 NOVA API: Buscar biblioteca do usuário
   */
  getMyLibrary = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          success: false,
          error: 'Usuário não autenticado' 
        });
      }
      
      const userId = req.user.id;
      const { 
        page = 1, 
        limit = 20, 
        search, 
        tags, 
        sortBy = 'addedAt', 
        sortOrder = 'desc' 
      } = req.query;

      // Buscar coleções na biblioteca do usuário
      const filters = {
        userId, // Apenas coleções do usuário
        searchTerm: search as string,
        tags: tags ? (Array.isArray(tags) ? (tags as string[]) : [tags as string]) : undefined,
        inLibrary: true // Flag específica para biblioteca
      };

      const pagination = {
        page: Number(page),
        limit: Math.min(Number(limit), 50),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
      };

      const collections = await this.flashcardRepository.getUserLibrary(userId, filters, pagination);

      return res.status(200).json({
        success: true,
        data: {
          collections,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total: collections.length,
            totalPages: Math.ceil(collections.length / Number(limit))
          }
        }
      });
    } catch (error) {
      console.error('Erro ao buscar biblioteca do usuário:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao buscar biblioteca do usuário'
      });
    }
  };

  /**
   * ➕ NOVA API: Adicionar coleção à biblioteca
   */
  addToLibrary = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          success: false,
          error: 'Usuário não autenticado' 
        });
      }
      
      const userId = req.user.id;
      const { id: collectionId } = req.params;

      // Verificar se a coleção existe e é pública
      const collection = await this.flashcardRepository.getCollectionById(collectionId);
      
      if (!collection) {
        return res.status(404).json({
          success: false,
          error: 'Coleção não encontrada'
        });
      }

      if (!collection.isPublic && collection.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Coleção não é pública'
        });
      }

      // Verificar se já está na biblioteca
      const isInLibrary = await this.flashcardRepository.isInUserLibrary(userId, collectionId);
      
      if (isInLibrary) {
        return res.status(400).json({
          success: false,
          error: 'Coleção já está na sua biblioteca'
        });
      }

      // Adicionar à biblioteca
      await this.flashcardRepository.addToLibrary(userId, collectionId);

      // Incrementar contador de downloads
      await this.flashcardRepository.incrementDownloads(collectionId);

      return res.status(200).json({
        success: true,
        message: 'Coleção adicionada à biblioteca com sucesso!',
        data: { collectionId, addedAt: new Date().toISOString() }
      });
    } catch (error) {
      console.error('Erro ao adicionar à biblioteca:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao adicionar à biblioteca'
      });
    }
  };

  /**
   * ➖ NOVA API: Remover coleção da biblioteca
   */
  removeFromLibrary = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          success: false,
          error: 'Usuário não autenticado' 
        });
      }
      
      const userId = req.user.id;
      const { id: collectionId } = req.params;

      // Verificar se está na biblioteca
      const isInLibrary = await this.flashcardRepository.isInUserLibrary(userId, collectionId);
      
      if (!isInLibrary) {
        return res.status(400).json({
          success: false,
          error: 'Coleção não está na sua biblioteca'
        });
      }

      // Remover da biblioteca
      await this.flashcardRepository.removeFromLibrary(userId, collectionId);

      return res.status(200).json({
        success: true,
        message: 'Coleção removida da biblioteca com sucesso!'
      });
    } catch (error) {
      console.error('Erro ao remover da biblioteca:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao remover da biblioteca'
      });
    }
  };

  /**
   * ❤️ NOVA API: Curtir/Descurtir coleção
   */
  toggleLikeCollection = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          success: false,
          error: 'Usuário não autenticado' 
        });
      }
      
      const userId = req.user.id;
      const { id: collectionId } = req.params;

      // Verificar se a coleção existe
      const collection = await this.flashcardRepository.getCollectionById(collectionId);
      
      if (!collection) {
        return res.status(404).json({
          success: false,
          error: 'Coleção não encontrada'
        });
      }

      // Toggle like
      const isLiked = await this.flashcardRepository.isCollectionLiked(userId, collectionId);
      
      if (isLiked) {
        await this.flashcardRepository.unlikeCollection(userId, collectionId);
      } else {
        await this.flashcardRepository.likeCollection(userId, collectionId);
      }

      // Buscar estatísticas atualizadas
      const updatedStats = await this.flashcardRepository.getCollectionStats(collectionId);

      return res.status(200).json({
        success: true,
        data: {
          isLiked: !isLiked,
          likes: updatedStats.likes || 0,
          message: isLiked ? 'Like removido' : 'Coleção curtida!'
        }
      });
    } catch (error) {
      console.error('Erro ao curtir/descurtir coleção:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao processar like'
      });
    }
  };

  /**
   * ⭐ NOVA API: Avaliar coleção
   */
  rateCollection = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          success: false,
          error: 'Usuário não autenticado' 
        });
      }
      
      const userId = req.user.id;
      const { id: collectionId } = req.params;
      const { rating, comment } = req.body;

      // Validar rating
      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          error: 'Rating deve ser entre 1 e 5'
        });
      }

      // Verificar se a coleção existe
      const collection = await this.flashcardRepository.getCollectionById(collectionId);
      
      if (!collection) {
        return res.status(404).json({
          success: false,
          error: 'Coleção não encontrada'
        });
      }

      // Adicionar/Atualizar avaliação
      await this.flashcardRepository.rateCollection(userId, collectionId, {
        rating,
        comment: comment?.trim() || null
      });

      // Buscar estatísticas atualizadas
      const updatedStats = await this.flashcardRepository.getCollectionStats(collectionId);

      return res.status(200).json({
        success: true,
        message: 'Avaliação salva com sucesso!',
        data: {
          avgRating: updatedStats.avgRating || 0,
          totalRatings: updatedStats.totalRatings || 0
        }
      });
    } catch (error) {
      console.error('Erro ao avaliar coleção:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao salvar avaliação'
      });
    }
  };

  /**
   * 📥 NOVA API: Iniciar importação APKG com progresso
   */
  startApkgImport = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          success: false,
          error: 'Usuário não autenticado' 
        });
      }
      
      const userId = req.user.id;
      
      // Verificar se há arquivo enviado
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'Arquivo APKG é obrigatório'
        });
      }
      
      const { 
        name, 
        description, 
        tags, 
        isPublic = false,
        category = 'medicina',
        language = 'pt',
        difficulty = 'intermediate',
        // Configurações avançadas
        duplicateHandling = 'skip',
        enableFSRS = true,
        processImages = true,
        processAudio = false,
        chunkSize = 100,
        enableIndexing = true
      } = req.body;

      // Validar entrada
      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Nome do deck é obrigatório'
        });
      }

      // Validar arquivo APKG
      if (!req.file.originalname.toLowerCase().endsWith('.apkg')) {
        return res.status(400).json({
          success: false,
          error: 'Arquivo deve ter extensão .apkg'
        });
      }

      if (req.file.size > 500 * 1024 * 1024) { // 500MB max
        return res.status(400).json({
          success: false,
          error: 'Arquivo muito grande (máximo 500MB)'
        });
      }

      // Criar importação
      const importId = `import_${userId}_${Date.now()}`;
      const importData = {
        id: importId,
        userId,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        filePath: req.file.path,
        status: 'PROCESSING' as const,
        progress: {
          phase: 'parsing',
          percentage: 0,
          currentItem: 'Iniciando importação...',
          processed: 0,
          total: 0,
          errors: [],
          warnings: []
        },
        config: {
          name: name.trim(),
          description: description?.trim() || '',
          tags: Array.isArray(tags) ? tags : (tags ? [tags] : []),
          isPublic: Boolean(isPublic),
          category,
          language,
          difficulty,
          duplicateHandling,
          enableFSRS: Boolean(enableFSRS),
          processImages: Boolean(processImages),
          processAudio: Boolean(processAudio),
          chunkSize: Math.min(Math.max(parseInt(chunkSize) || 100, 10), 500),
          enableIndexing: Boolean(enableIndexing)
        },
        startedAt: new Date(),
        estimatedDuration: null,
        resultDeckId: null
      };

      // Salvar no banco (usar repository adequado)
      await this.flashcardRepository.createImportSession(importData);

      // Iniciar processamento em background
      this.processApkgImportAsync(importData);

      return res.status(200).json({
        success: true,
        data: {
          importId,
          status: 'started',
          message: 'Importação iniciada com sucesso'
        }
      });
    } catch (error) {
      console.error('Erro ao iniciar importação APKG:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao iniciar importação'
      });
    }
  };

  /**
   * 📊 NOVA API: Buscar progresso da importação
   */
  getImportProgress = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          success: false,
          error: 'Usuário não autenticado' 
        });
      }
      
      const userId = req.user.id;
      const { importId } = req.params;

      // Validar se a importação pertence ao usuário
      const importSession = await this.flashcardRepository.getImportSession(importId);
      
      if (!importSession) {
        return res.status(404).json({
          success: false,
          error: 'Sessão de importação não encontrada'
        });
      }

      if (importSession.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Acesso negado à sessão de importação'
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          importId,
          status: importSession.status,
          progress: importSession.progress,
          config: importSession.config,
          startedAt: importSession.startedAt,
          completedAt: importSession.completedAt,
          estimatedDuration: importSession.estimatedDuration,
          resultDeckId: importSession.resultDeckId
        }
      });
    } catch (error) {
      console.error('Erro ao buscar progresso da importação:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao buscar progresso da importação'
      });
    }
  };

  /**
   * ⏸️ NOVA API: Pausar/Retomar importação
   */
  toggleImportPause = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          success: false,
          error: 'Usuário não autenticado' 
        });
      }
      
      const userId = req.user.id;
      const { importId } = req.params;
      const { action } = req.body; // 'pause' | 'resume'

      // Validar ação
      if (!['pause', 'resume'].includes(action)) {
        return res.status(400).json({
          success: false,
          error: 'Ação deve ser "pause" ou "resume"'
        });
      }

      // Buscar sessão de importação
      const importSession = await this.flashcardRepository.getImportSession(importId);
      
      if (!importSession || importSession.userId !== userId) {
        return res.status(404).json({
          success: false,
          error: 'Sessão de importação não encontrada'
        });
      }

      // Verificar se pode pausar/retomar
      if (!['PROCESSING', 'PENDING'].includes(importSession.status)) {
        return res.status(400).json({
          success: false,
          error: 'Importação não pode ser pausada/retomada no estado atual'
        });
      }

      // Atualizar status
      const newStatus = action === 'pause' ? 'PENDING' : 'PROCESSING';
      await this.flashcardRepository.updateImportStatus(importId, {
        status: newStatus as any,
        progress: {
          ...importSession.progress,
          isPaused: action === 'pause'
        }
      });

      return res.status(200).json({
        success: true,
        data: {
          importId,
          status: newStatus,
          message: action === 'pause' ? 'Importação pausada' : 'Importação retomada'
        }
      });
    } catch (error) {
      console.error('Erro ao pausar/retomar importação:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao controlar importação'
      });
    }
  };

  /**
   * 🔄 Processamento APKG em background (método privado)
   */
  private async processApkgImportAsync(importData: any): Promise<void> {
    try {
      const importId = importData.id;
      
      // Simular processamento em fases
      const phases = [
        { 
          name: 'parsing', 
          duration: 2000, 
          message: 'Analisando arquivo APKG...',
          task: () => this.simulateParsingPhase(importData)
        },
        { 
          name: 'processing', 
          duration: 5000, 
          message: 'Processando cards...',
          task: () => this.simulateProcessingPhase(importData)
        },
        { 
          name: 'inserting', 
          duration: 3000, 
          message: 'Inserindo no banco de dados...',
          task: () => this.simulateInsertingPhase(importData)
        },
        { 
          name: 'optimizing', 
          duration: 1000, 
          message: 'Otimizando índices...',
          task: () => this.simulateOptimizingPhase(importData)
        }
      ];

      let totalProcessed = 0;
      const estimatedTotal = Math.floor(Math.random() * 500) + 50; // Mock total

      for (let i = 0; i < phases.length; i++) {
        const phase = phases[i];
        
        // Atualizar fase
        await this.flashcardRepository.updateImportStatus(importId, {
          status: 'PROCESSING' as any,
          progress: {
            phase: phase.name,
            percentage: Math.floor((i / phases.length) * 100),
            currentItem: phase.message,
            processed: totalProcessed,
            total: estimatedTotal,
            errors: [],
            warnings: [],
            isPaused: false
          }
        });

        // Executar fase
        const phaseResult = await phase.task();
        totalProcessed += phaseResult.processed || 0;

        // Simular delay
        await new Promise(resolve => setTimeout(resolve, phase.duration));
      }

      // Finalizar importação
      await this.flashcardRepository.updateImportStatus(importId, {
        status: 'COMPLETED' as any,
        progress: {
          phase: 'complete',
          percentage: 100,
          currentItem: 'Importação concluída!',
          processed: estimatedTotal,
          total: estimatedTotal,
          errors: [],
          warnings: [],
          isPaused: false
        },
        completedAt: new Date().toISOString(),
        resultDeckId: `deck_${Date.now()}` // Mock deck ID
      });

    } catch (error) {
      console.error('Erro no processamento APKG:', error);
      
      // Marcar como erro
      await this.flashcardRepository.updateImportStatus(importData.id, {
        status: 'ERROR' as any,
        progress: {
          ...importData.progress,
          errors: [(error as Error).message || 'Erro desconhecido']
        }
      });
    }
  }

  // Métodos auxiliares para processar fases de importação APKG
  private async simulateParsingPhase(importData: any) {
    // TODO: Implementar análise real do arquivo APKG
    // Por enquanto retorna dados mockados
    console.log(`Parsing APKG file for import ${importData.id}`);
    return { processed: 0, warnings: [] };
  }

  private async simulateProcessingPhase(importData: any) {
    // TODO: Implementar processamento real dos cards do APKG
    // Por enquanto retorna dados mockados
    console.log(`Processing cards for import ${importData.id}`);
    return { processed: Math.floor(Math.random() * 100) + 20, warnings: [] };
  }

  private async simulateInsertingPhase(importData: any) {
    // TODO: Implementar inserção real no banco de dados
    // Por enquanto retorna dados mockados
    console.log(`Inserting cards for import ${importData.id}`);
    return { processed: Math.floor(Math.random() * 50) + 10, warnings: [] };
  }

  private async simulateOptimizingPhase(importData: any) {
    // TODO: Implementar otimização real (índices, etc.)
    // Por enquanto retorna dados mockados
    console.log(`Optimizing for import ${importData.id}`);
    return { processed: 0, warnings: [] };
  }
}
