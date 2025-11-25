import { Response } from 'express';
import { AuthenticatedRequest } from '../../../../domain/auth/middleware/supabaseAuth.middleware';
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
import { supabase } from '../../../../config/supabase';
import { DeckStudySessionService } from '../services/DeckStudySessionService';

export class FlashcardController {
  private sessionService: DeckStudySessionService;

  constructor(private readonly flashcardRepository: IFlashcardRepository) {
    this.sessionService = new DeckStudySessionService(supabase);
  }

  create = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const { error, value } = validate('createFlashcard', req.body);
      if (error) {
        return res.status(400).json({ error: error.message });
      }

      const createFlashcardUseCase = new CreateFlashcardUseCase(
        this.flashcardRepository,
      );
      
      // Converter camelCase para snake_case para o use case
      const flashcard = await createFlashcardUseCase.execute({
        deck_id: value.deckId,
        front_content: value.frontContent,
        back_content: value.backContent,
        tags: value.tags,
      }, req.user.id);

      return res.status(201).json(flashcard);
    } catch (error) {
      console.error('[FlashcardController.create] Error creating flashcard:', error);
      const appError = error as {
        name?: string;
        statusCode?: number;
        message?: string;
      };
      if (appError.name === 'AppError') {
        return res
          .status(appError.statusCode || 400)
          .json({ error: appError.message });
      }
      return res.status(500).json({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  getById = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }
      const user_id = req.user.id;
      const { id } = req.params;

      const getFlashcardByIdUseCase = new GetFlashcardByIdUseCase(
        this.flashcardRepository,
      );
      const flashcard = await getFlashcardByIdUseCase.execute(id, user_id);

      return res.status(200).json(flashcard);
    } catch (error) {
      const appError = error as {
        name?: string;
        statusCode?: number;
        message?: string;
      };
      if (appError.name === 'AppError') {
        return res
          .status(appError.statusCode || 400)
          .json({ error: appError.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  };

  getByIds = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }
      
      const { ids } = req.body;
      
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'IDs são obrigatórios e devem ser um array' 
        });
      }
      
      const flashcards = await this.flashcardRepository.findByIds(ids);
      
      return res.status(200).json({ 
        success: true, 
        data: flashcards 
      });
    } catch (error) {
      console.error('Erro ao buscar flashcards:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Erro interno do servidor' 
      });
    }
  };

  getByUser = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }
      const user_id = req.user.id;
      const {
        page = 1,
        limit = 10,
        deck_id: deckId,
        status,
        ready_for_review: readyForReview,
        tags,
        sort_by: sortBy,
        sort_order: sortOrder,
      } = req.query;

      const filters: FlashcardFilters = {
        deck_id: deckId as string,
        status: status as any,
        ready_for_review: readyForReview === 'true',
        tags: tags
          ? Array.isArray(tags)
            ? (tags as string[])
            : [tags as string]
          : undefined,
      };

      const pagination: PaginationOptions = {
        page: Number(page),
        limit: Number(limit),
        sort_by: sortBy as string,
        sort_order: sortOrder as 'asc' | 'desc',
      };

      const getUserFlashcardsUseCase = new GetUserFlashcardsUseCase(
        this.flashcardRepository,
      );
      const result = await getUserFlashcardsUseCase.execute(
        user_id,
        filters,
        pagination,
      );

      // Padronizar resposta
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      const appError = error as {
        name?: string;
        statusCode?: number;
        message?: string;
      };
      if (appError.name === 'AppError') {
        return res
          .status(appError.statusCode || 400)
          .json({ error: appError.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  };

  update = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }
      const user_id = req.user.id;
      const { id } = req.params;

      const { error, value } = validate('updateFlashcard', req.body);
      if (error) {
        return res.status(400).json({ error: error.message });
      }

      // Converter campos do schema para o formato do banco
      const updateData: any = {};
      if (value.frontContent !== undefined) updateData.front_content = value.frontContent;
      if (value.backContent !== undefined) updateData.back_content = value.backContent;
      if (value.tags !== undefined) updateData.tags = value.tags;
      if (value.status !== undefined) updateData.status = value.status;
      if (value.mediaUrls !== undefined) updateData.media_urls = value.mediaUrls;
      if (value.metadata !== undefined) updateData.metadata = value.metadata;

      const updateFlashcardUseCase = new UpdateFlashcardUseCase(
        this.flashcardRepository,
      );
      const flashcard = await updateFlashcardUseCase.execute(id, user_id, updateData);

      return res.status(200).json(flashcard);
    } catch (error) {
      const appError = error as {
        name?: string;
        statusCode?: number;
        message?: string;
      };
      if (appError.name === 'AppError') {
        return res
          .status(appError.statusCode || 400)
          .json({ error: appError.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  };

  delete = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }
      const user_id = req.user.id;
      const { id } = req.params;

      const deleteFlashcardUseCase = new DeleteFlashcardUseCase(
        this.flashcardRepository,
      );
      await deleteFlashcardUseCase.execute(id, user_id);

      return res.status(204).send();
    } catch (error) {
      const appError = error as {
        name?: string;
        statusCode?: number;
        message?: string;
      };
      if (appError.name === 'AppError') {
        return res
          .status(appError.statusCode || 400)
          .json({ error: appError.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  };

  toggleArchive = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }
      const user_id = req.user.id;
      const { id } = req.params;

      const toggleFlashcardArchiveUseCase = new ToggleFlashcardArchiveUseCase(
        this.flashcardRepository,
      );
      const flashcard = await toggleFlashcardArchiveUseCase.execute(id, user_id);

      return res.status(200).json(flashcard);
    } catch (error) {
      const appError = error as {
        name?: string;
        statusCode?: number;
        message?: string;
      };
      if (appError.name === 'AppError') {
        return res
          .status(appError.statusCode || 400)
          .json({ error: appError.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  };

  recordReview = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }
      const user_id = req.user.id;
      const { id } = req.params;
      const { review_quality: reviewQuality, review_time_ms: reviewTimeMs } = req.body;

      console.log('[FlashcardController] recordReview:', { id, user_id, reviewQuality, reviewTimeMs });

      if (
        reviewQuality === undefined ||
        reviewQuality < 0 ||
        reviewQuality > 3
      ) {
        return res.status(400).json({ error: 'Invalid review quality' });
      }

      const recordFlashcardReviewUseCase = new RecordFlashcardReviewUseCase(
        this.flashcardRepository,
      );
      const flashcard = await recordFlashcardReviewUseCase.execute(
        id,
        user_id,
        reviewQuality,
        reviewTimeMs || 0,
      );

      console.log('[FlashcardController] Review recorded successfully');
      return res.status(200).json(flashcard);
    } catch (error) {
      console.error('[FlashcardController] Error recording review:', error);
      const appError = error as {
        name?: string;
        statusCode?: number;
        message?: string;
      };
      if (appError.name === 'AppError') {
        return res
          .status(appError.statusCode || 400)
          .json({ error: appError.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  };

  search = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> => {
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

      const searchFlashcardsUseCase = new SearchFlashcardsUseCase(
        this.flashcardRepository,
      );
      const results = await searchFlashcardsUseCase.execute(
        query as string,
        userId,
        { page, limit },
      );

      return res.status(200).json(results);
    } catch (error) {
      const appError = error as {
        name?: string;
        statusCode?: number;
        message?: string;
      };
      if (appError.name === 'AppError') {
        return res
          .status(appError.statusCode || 400)
          .json({ error: appError.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  };



  getCollectionDecks = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }
      const userId = req.user.id;
      const { collectionName } = req.params;

      const decks = await this.flashcardRepository.getCollectionDecks(
        userId,
        collectionName,
      );

      // Verificar se é uma coleção importada da comunidade
      // Buscar na tabela collection_imports
      let isFromCommunity = false;
      if (decks.length > 0 && (decks[0] as any).collection_id) {
        const { data: importData } = await supabase
          .from('collection_imports')
          .select('id')
          .eq('user_id', userId)
          .eq('collection_id', (decks[0] as any).collection_id)
          .single();
        
        isFromCommunity = !!importData;
      }

      return res.status(200).json({
        success: true,
        data: { 
          decks,
          isFromCommunity, // Flag para indicar se é da comunidade
        },
      });
    } catch (error) {
      const appError = error as {
        name?: string;
        statusCode?: number;
        message?: string;
      };
      if (appError.name === 'AppError') {
        return res
          .status(appError.statusCode || 400)
          .json({ error: appError.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  };

  toggleDeckPublicStatus = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }
      const userId = req.user.id;
      const { deckId } = req.params;
      const { isPublic } = req.body;

      const deck = await this.flashcardRepository.updateDeckPublicStatus(
        deckId,
        userId,
        isPublic,
      );

      return res.status(200).json({
        success: true,
        message: `Deck ${isPublic ? 'publicado' : 'despublicado'} com sucesso!`,
        data: deck,
      });
    } catch (error) {
      const appError = error as {
        name?: string;
        statusCode?: number;
        message?: string;
      };
      if (appError.name === 'AppError') {
        return res
          .status(appError.statusCode || 400)
          .json({ error: appError.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  };

  deleteDeck = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }
      const userId = req.user.id;
      const { deckId } = req.params;

      await this.flashcardRepository.deleteDeck(deckId, userId);

      return res.status(200).json({
        success: true,
        message: 'Deck excluído com sucesso!',
      });
    } catch (error) {
      const appError = error as {
        name?: string;
        statusCode?: number;
        message?: string;
      };
      if (appError.name === 'AppError') {
        return res
          .status(appError.statusCode || 400)
          .json({ error: appError.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * 🎯 Obter deck por ID com cards (OTIMIZADO)
   */
  async getDeckById(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> {
    try {
      const { deckId } = req.params;
      console.log('🚨 [BACKEND getDeckById] Buscando deck:', deckId);

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Usuário não autenticado',
        });
      }

      const userId = req.user.id;
      console.log('🚨 [BACKEND getDeckById] UserId:', userId);

      const deckData = await this.flashcardRepository.getDeckById(
        deckId,
        userId,
      );
      console.log(
        '🚨 [BACKEND getDeckById] Deck encontrado:',
        deckData ? 'SIM' : 'NÃO',
      );

      if (!deckData) {
        return res.status(404).json({
          success: false,
          message: 'Deck não encontrado',
        });
      }

      console.log(
        '🚨 [BACKEND getDeckById] Cards no deck:',
        deckData.cards?.length || 0,
      );

      // DEBUG: Log dos primeiros cards
      if (deckData.cards && deckData.cards.length > 0) {
        console.log(
          '🚨 [BACKEND getDeckById] Primeiros 3 cards IDs:',
          deckData.cards.slice(0, 3).map((card) => ({
            id: card.id,
            front:
              card.front_content?.substring(0, 30) ||
              (card as any).front?.substring(0, 30),
          })),
        );
      }

      return res.status(200).json({
        success: true,
        data: deckData,
        cards: deckData.cards || [],
      });
    } catch (error) {
      console.error('❌ [BACKEND getDeckById] Erro:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao obter deck',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }

  getAllDecks = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }
      const userId = req.user.id;
      const { limit = '200' } = req.query;

      const decks = await this.flashcardRepository.getAllUserDecks(
        userId,
        parseInt(limit as string),
      );

      return res.status(200).json({
        success: true,
        data: decks,
      });
    } catch (error) {
      const appError = error as {
        name?: string;
        statusCode?: number;
        message?: string;
      };
      if (appError.name === 'AppError') {
        return res
          .status(appError.statusCode || 400)
          .json({ error: appError.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  };

  getUserDecks = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> => {
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
        data: decks,
      });
    } catch (error) {
      const appError = error as {
        name?: string;
        statusCode?: number;
        message?: string;
      };
      if (appError.name === 'AppError') {
        return res
          .status(appError.statusCode || 400)
          .json({ error: appError.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  };

  getFlashcardsWithFilters = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> => {
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
      if (deckId) {
        filters.deck_id = deckId;
      }
      if (status) {
        filters.status = status;
      }
      if (difficulty) {
        filters.difficulty = difficulty;
      }
      if (tags) {
        filters.tags = Array.isArray(tags) ? tags : [tags];
      }

      const flashcards = await this.flashcardRepository.findByUser(
        (userId as string) || req.user.id,
        filters,
        { page: 1, limit: 1000 },
      );

      return res.status(200).json({
        success: true,
        data: flashcards.items || [],
      });
    } catch (error) {
      const appError = error as {
        name?: string;
        statusCode?: number;
        message?: string;
      };
      if (appError.name === 'AppError') {
        return res
          .status(appError.statusCode || 400)
          .json({ error: appError.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * 🔍 NOVA API: Busca global de flashcards com filtros FSRS
   */
  globalSearch = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Usuário não autenticado',
        });
      }

      const query = req.query.q as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

      if (!query || query.trim().length < 2) {
        return res.status(400).json({
          success: false,
          error: 'Query deve ter pelo menos 2 caracteres',
        });
      }

      // Buscar todos os decks do usuário
      const db = (this.flashcardRepository as any).db;
      let searchQuery: any = db.collection('decks');
      searchQuery = searchQuery.where('userId', '==', req.user.id);

      const allDecksSnapshot = await searchQuery.get();
      const allDecks = allDecksSnapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Busca hierárquica em duas seções
      const searchTerm = query.toLowerCase().trim();

      // Seção 1: Resultados diretos (nome, descrição)
      const directMatches = allDecks.filter((deck: any) => {
        const deckName = (deck.name || '').toLowerCase();
        const description = (deck.description || '').toLowerCase();

        return (
          deckName.includes(searchTerm) || description.includes(searchTerm)
        );
      });

      // Aplicar score aos matches diretos
      const scoredDirectMatches = directMatches.map((deck: any) => {
        const deckName = (deck.name || '').toLowerCase();
        const description = (deck.description || '').toLowerCase();

        let score = 0;
        if (deckName.includes(searchTerm)) {
          score += deckName.startsWith(searchTerm) ? 100 : 50;
        }
        if (description.includes(searchTerm)) {
          score += 20;
        }

        return { ...deck, _searchScore: score };
      });

      // Ordenar por relevância
      const sortedDirectMatches = scoredDirectMatches.sort(
        (a: any, b: any) => b._searchScore - a._searchScore,
      );

      // IDs dos decks já encontrados na seção 1 (para evitar duplicatas)
      const directMatchIds = new Set(
        sortedDirectMatches.map((deck: any) => deck.id),
      );

      // Seção 2: Decks em pastas relacionadas
      const folderMatches: {
        [key: string]: { collection: string; folder: string; decks: any[] };
      } = {};

      allDecks.forEach((deck: any) => {
        // Pular se já está nos resultados diretos
        if (directMatchIds.has(deck.id)) {
          return;
        }

        // Verificar se está em pasta relacionada
        const hierarchy = deck.hierarchy ||
          deck.hierarchyPath?.split('::') || [deck.collection || 'Sem Coleção'];

        // Buscar em cada nível da hierarquia (exceto o último que é o próprio deck)
        for (let i = 0; i < hierarchy.length - 1; i++) {
          const folderName = (hierarchy[i] || '').toLowerCase();

          if (folderName.includes(searchTerm)) {
            const collection = hierarchy[0] || 'Sem Coleção';
            const folder = hierarchy[i];
            const key = `${collection}::${folder}`;

            if (!folderMatches[key]) {
              folderMatches[key] = {
                collection,
                folder,
                decks: [],
              };
            }

            folderMatches[key].decks.push(deck);
            break; // Encontrou match, não precisa verificar outros níveis
          }
        }
      });

      // Converter folder matches para array e ordenar
      const folderResults = Object.values(folderMatches)
        .map((group) => {
          // Construir hierarchyPath baseado na estrutura da pasta
          const hierarchyPath =
            group.collection === group.folder
              ? group.collection
              : `${group.collection}::${group.folder}`;

          return {
            ...group,
            hierarchyPath,
            originalHierarchyPath: hierarchyPath,
            originalPath: hierarchyPath,
            deckCount: group.decks.length,
            totalCards: group.decks.reduce(
              (sum: number, deck: any) => sum + (deck.flashcard_count || 0),
              0,
            ),
          };
        })
        .sort((a, b) => b.deckCount - a.deckCount); // Pastas com mais decks primeiro

      // Limpar scores dos resultados diretos
      const directResults = sortedDirectMatches.map((deck: any) => {
        const { _searchScore, ...cleanDeck } = deck;
        return cleanDeck;
      });

      // Calcular totais para paginação
      const totalDirectResults = directResults.length;
      const totalFolderResults = folderResults.reduce(
        (sum, group) => sum + group.deckCount,
        0,
      );
      const totalResults = totalDirectResults + totalFolderResults;

      // Paginação aplicada aos resultados diretos (folder results sempre mostram todos)
      const startIndex = (page - 1) * limit;
      const paginatedDirectResults = directResults.slice(
        startIndex,
        startIndex + limit,
      );

      return res.status(200).json({
        success: true,
        data: {
          directResults: paginatedDirectResults,
          folderResults: folderResults.slice(0, 10), // Máximo 10 pastas para performance
          query,
          filters: [],
          stats: {
            totalDirectResults,
            totalFolderResults,
            totalResults,
            folderGroupsCount: folderResults.length,
          },
          pagination: {
            page,
            limit,
            total: totalDirectResults, // Paginação só para resultados diretos
            totalPages: Math.ceil(totalDirectResults / limit),
          },
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('Erro na busca global:', errorMessage);
      return res.status(500).json({
        success: false,
        error: 'Erro na busca global',
      });
    }
  };

  // getFSRSStatus method removed - FSRS logic deprecated

  /**
   * 🔄 NOVA API: Duplicar flashcard
   */
  duplicateCard = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Usuário não autenticado',
        });
      }
      const user_id = req.user.id;
      const { id } = req.params;
      const { newDeckId, modifications } = req.body;

      // Buscar card original
      const getFlashcardByIdUseCase = new GetFlashcardByIdUseCase(
        this.flashcardRepository,
      );
      const originalCard = await getFlashcardByIdUseCase.execute(id, user_id);

      // Criar novo card baseado no original
      const createFlashcardUseCase = new CreateFlashcardUseCase(
        this.flashcardRepository,
      );
      const duplicatedCard = await createFlashcardUseCase.execute({
        front_content: modifications?.frontContent || originalCard.front_content,
        back_content: modifications?.backContent || originalCard.back_content,
          deck_id: newDeckId || originalCard.deck_id,
        tags: modifications?.tags || originalCard.tags,
        // Campo personal_notes removido do DTO - manter compatibilidade
      });

      return res.status(201).json({
        success: true,
        message: 'Card duplicado com sucesso!',
        data: duplicatedCard,
      });
    } catch (error) {
      console.error('Erro ao duplicar card:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao duplicar card',
      });
    }
  };

  /**
   * 🗑️ NOVA API: Exclusão em lote de cards
   */
  deleteBatch = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Usuário não autenticado',
        });
      }
      const userId = req.user.id;
      const { cardIds } = req.body;

      if (!Array.isArray(cardIds) || cardIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Lista de IDs de cards é obrigatória',
        });
      }

      const deleteFlashcardUseCase = new DeleteFlashcardUseCase(
        this.flashcardRepository,
      );
      const results = {
        deleted: 0,
        failed: 0,
        errors: [] as string[],
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
              results.errors.push(
                `Card ${cardId}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
              );
            }
          }),
        );
      }

      return res.status(200).json({
        success: true,
        message: `${results.deleted} cards excluídos com sucesso${results.failed > 0 ? `, ${results.failed} falharam` : ''}`,
        data: results,
      });
    } catch (error) {
      console.error('Erro na exclusão em lote:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro na exclusão em lote',
      });
    }
  };

  /**
   * 🏷️ NOVA API: Buscar cards por deck com filtros avançados
   */
  getCardsByDeck = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Usuário não autenticado',
        });
      }
      const userId = req.user.id;
      const { deckId } = req.params;
      const {
        page = 1,
        limit = 100,
        tags,
        status,
        search,
      } = req.query;

      const filters: FlashcardFilters = {
        deck_id: deckId,
        tags: tags
          ? Array.isArray(tags)
            ? (tags as string[])
            : [tags as string]
          : undefined,
        status: status as any,
        search_term: search as string,
      };

      const pagination: PaginationOptions = {
        page: Number(page),
        limit: Math.min(Number(limit), 100), // Máximo 100 por página
      };

      const getUserFlashcardsUseCase = new GetUserFlashcardsUseCase(
        this.flashcardRepository,
      );
      const result = await getUserFlashcardsUseCase.execute(
        userId,
        filters,
        pagination,
      );

      // Padronizar resposta para compatibilidade com frontend
      return res.status(200).json({
        success: true,
        data: {
          items: result.items || [],
          total: result.total || 0,
          page: Number(page),
          limit: Number(limit),
          hasMore: result.hasMore || false,
        },
      });
    } catch (error) {
      console.error('Erro ao buscar cards do deck:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao buscar cards do deck',
      });
    }
  };

  /**
   * 🏷️ NOVA API: Atualizar tags de um card
   */
  updateCardTags = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Usuário não autenticado',
        });
      }
      const userId = req.user.id;
      const { id } = req.params;
      const { tags } = req.body;

      if (!Array.isArray(tags)) {
        return res.status(400).json({
          success: false,
          error: 'Tags devem ser um array',
        });
      }

      const updateFlashcardUseCase = new UpdateFlashcardUseCase(
        this.flashcardRepository,
      );
      const flashcard = await updateFlashcardUseCase.execute(id, userId, {
        tags,
      });

      return res.status(200).json({
        success: true,
        message: 'Tags atualizadas com sucesso!',
        data: flashcard,
      });
    } catch (error) {
      console.error('Erro ao atualizar tags:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao atualizar tags',
      });
    }
  };

  /**
   * 📊 NOVA API: Estatísticas de cards por deck
   */
  getDeckCardStats = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Usuário não autenticado',
        });
      }
      const userId = req.user.id;
      const { deckId } = req.params;

      // ✅ CORREÇÃO: Buscar cards do deck com limite otimizado
      const filters: FlashcardFilters = { deck_id: deckId };
      const pagination: PaginationOptions = { page: 1, limit: 200 }; // ✅ MUDANÇA: Reduzido de 10000 para 200

      const getUserFlashcardsUseCase = new GetUserFlashcardsUseCase(
        this.flashcardRepository,
      );
      const result = await getUserFlashcardsUseCase.execute(
        userId,
        filters,
        pagination,
      );

      // Calcular estatísticas
      const cards = result.items;
      const tagCounts: Record<string, number> = {};
      
      // Contar tags
      cards.forEach((card) => {
        if (card.tags) {
          card.tags.forEach((tag) => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
          });
        }
      });

      const stats = {
        total: cards.length,
        byStatus: {
          new: cards.filter((c) => c.status === 'NEW').length,
          learning: cards.filter((c) => c.status === 'LEARNING').length,
          review: cards.filter((c) => c.status === 'REVIEW').length,
          relearning: cards.filter((c) => c.status === 'RELEARNING').length,
        },
        byDifficulty: {
          easy: cards.filter((c) => (((c as any).difficulty || 0) < 0.3)).length,
          medium: cards.filter(
            (c) => (((c as any).difficulty || 0) >= 0.3) && (((c as any).difficulty || 0) < 0.7),
          ).length,
          hard: cards.filter((c) => (((c as any).difficulty || 0) >= 0.7)).length,
        },
        tags: tagCounts,
        averageDifficulty:
          cards.length > 0
            ? cards.reduce((sum, c) => sum + (((c as any).difficulty || 0)), 0) /
              cards.length
            : 0,
        lastReviewed: null,
      };

      return res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas do deck:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao buscar estatísticas do deck',
      });
    }
  };

  /**
   * 📊 NOVA API: Estatísticas em lote para múltiplos decks
   */
  getBatchDeckStats = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Usuário não autenticado',
        });
      }
      const userId = req.user.id;
      const { deckIds } = req.body;

      if (!deckIds || !Array.isArray(deckIds) || deckIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'deckIds deve ser um array não vazio',
        });
      }

      if (deckIds.length > 50) {
        return res.status(400).json({
          success: false,
          error: 'Máximo de 50 decks por requisição',
        });
      }

      const getUserFlashcardsUseCase = new GetUserFlashcardsUseCase(
        this.flashcardRepository,
      );
      const batchStats: Record<string, any> = {};

      // Processar decks em paralelo
      await Promise.all(
        deckIds.map(async (deckId: string) => {
          try {
            const filters: FlashcardFilters = { deck_id: deckId };
            const pagination: PaginationOptions = { page: 1, limit: 200 }; // ✅ MUDANÇA: Reduzido de 10000 para 200

            const result = await getUserFlashcardsUseCase.execute(
                userId,
                filters,
                pagination,
            );
            const cards = result.items;

            const tagCounts: Record<string, number> = {};
            
            // Contar tags
            cards.forEach((card) => {
              if (card.tags) {
                card.tags.forEach((tag) => {
                  tagCounts[tag] = (tagCounts[tag] || 0) + 1;
                });
              }
            });

            batchStats[deckId] = {
              total: cards.length,
              byStatus: {
                new: cards.filter((c) => c.status === 'NEW').length,
                learning: cards.filter((c) => c.status === 'LEARNING').length,
                review: cards.filter((c) => c.status === 'REVIEW').length,
                relearning: cards.filter((c) => c.status === 'RELEARNING')
                  .length,
              },
              byDifficulty: {
                easy: cards.filter((c) => (((c as any).difficulty || 0) < 0.3)).length,
                medium: cards.filter(
                  (c) => (((c as any).difficulty || 0) >= 0.3) && (((c as any).difficulty || 0) < 0.7),
                ).length,
                hard: cards.filter((c) => (((c as any).difficulty || 0) >= 0.7)).length,
              },
              tags: tagCounts,
              lastReview:
                cards.length > 0
                  ? Math.max(
                    ...cards.map((c) => new Date(c.updated_at).getTime()),
                  )
                  : null,
            };
          } catch (error) {
            console.error(
              `Erro ao buscar estatísticas do deck ${deckId}:`,
              error,
            );
            batchStats[deckId] = {
              error: 'Erro ao buscar estatísticas',
              total: 0,
              byStatus: { new: 0, learning: 0, review: 0, relearning: 0 },
              byDifficulty: { easy: 0, medium: 0, hard: 0 },
              tags: {},
              lastReview: null,
            };
          }
        }),
      );

      return res.status(200).json({
        success: true,
        data: batchStats,
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas em lote:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao buscar estatísticas em lote',
      });
    }
  };





  /**
   * ➕ NOVA API: Adicionar coleção à biblioteca
   */
  addToLibrary = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Usuário não autenticado',
        });
      }

      const userId = req.user.id;
      const { id: collectionNameOrId } = req.params;

      console.log(`📚 [addToLibrary] Adicionando coleção "${collectionNameOrId}" à biblioteca do usuário ${userId}`);

      // Buscar decks da coleção para verificar se existe e é pública
      const supabase = this.flashcardRepository.getSupabaseClient();
      
      const { data: decks, error: decksError } = await supabase
        .from('decks')
        .select('id, collection_id, is_public, user_id')
        .eq('collection_id', collectionNameOrId)
        .eq('is_public', true)
        .limit(1);

      if (decksError || !decks || decks.length === 0) {
        console.log(`⚠️ [addToLibrary] Coleção "${collectionNameOrId}" não encontrada ou não é pública`);
        return res.status(404).json({
          success: false,
          error: 'Coleção não encontrada ou não é pública',
        });
      }

      const collectionName = decks[0].collection;

      // Verificar se já está na biblioteca
      const { data: existingEntry } = await supabase
        .from('user_library')
        .select('id')
        .eq('user_id', userId)
        .eq('deck_id', decks[0].id)
        .single();

      if (existingEntry) {
        return res.status(400).json({
          success: false,
          error: 'Coleção já está na sua biblioteca',
        });
      }

      // Adicionar à biblioteca (por referência)
      await this.flashcardRepository.addToLibrary(userId, collectionName);

      // Registrar import/download
      // collectionName na verdade é o collectionId (UUID)
      const { data: existingImport } = await supabase
        .from('collection_imports')
        .select('id')
        .eq('user_id', userId)
        .eq('collection_id', collectionName)
        .single();

      if (!existingImport) {
        await supabase
          .from('collection_imports')
          .insert({
            user_id: userId,
            collection_id: collectionName
          });
        
        console.log(`✅ [addToLibrary] Import registrado para coleção ID: "${collectionName}"`);
      }

      return res.status(200).json({
        success: true,
        message: 'Coleção adicionada à biblioteca com sucesso!',
        data: { 
          collectionName,
          addedAt: new Date().toISOString() 
        },
      });
    } catch (error) {
      console.error('❌ [addToLibrary] Erro ao adicionar à biblioteca:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao adicionar à biblioteca',
      });
    }
  };

  /**
   * ➖ NOVA API: Remover coleção da biblioteca
   */
  removeFromLibrary = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Usuário não autenticado',
        });
      }

      const userId = req.user.id;
      const { id: collectionNameOrId } = req.params;

      console.log(`🗑️ [removeFromLibrary] Removendo coleção "${collectionNameOrId}" da biblioteca do usuário ${userId}`);

      // Buscar decks da coleção
      const supabase = this.flashcardRepository.getSupabaseClient();
      
      const { data: decks } = await supabase
        .from('decks')
        .select('id, collection_id')
        .eq('collection_id', collectionNameOrId)
        .limit(1);

      if (!decks || decks.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Coleção não encontrada',
        });
      }

      const collectionName = decks[0].collection;

      // Verificar se está na biblioteca
      const { data: existingEntry } = await supabase
        .from('user_library')
        .select('id')
        .eq('user_id', userId)
        .eq('deck_id', decks[0].id)
        .single();

      if (!existingEntry) {
        return res.status(400).json({
          success: false,
          error: 'Coleção não está na sua biblioteca',
        });
      }

      // Remover da biblioteca
      await this.flashcardRepository.removeFromLibrary(userId, collectionName);

      return res.status(200).json({
        success: true,
        message: 'Coleção removida da biblioteca com sucesso!',
      });
    } catch (error) {
      console.error('Erro ao remover da biblioteca:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao remover da biblioteca',
      });
    }
  };

  /**
   * ❤️ NOVA API: Curtir/Descurtir coleção
   */
  toggleLikeCollection = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Usuário não autenticado',
        });
      }

      const userId = req.user.id;
      const { id: collectionId } = req.params;

      // Verificar se a coleção existe
      const collection =
        await this.flashcardRepository.getCollectionById(collectionId);

      if (!collection) {
        return res.status(404).json({
          success: false,
          error: 'Coleção não encontrada',
        });
      }

      // Toggle like
      const isLiked = await this.flashcardRepository.isCollectionLiked(
        userId,
        collectionId,
      );

      if (isLiked) {
        await this.flashcardRepository.unlikeCollection(userId, collectionId);
      } else {
        await this.flashcardRepository.likeCollection(userId, collectionId);
      }

      // Buscar estatísticas atualizadas
      const updatedStats =
        await this.flashcardRepository.getCollectionStats(collectionId);

      return res.status(200).json({
        success: true,
        data: {
          isLiked: !isLiked,
          likes: updatedStats.likes || 0,
          message: isLiked ? 'Like removido' : 'Coleção curtida!',
        },
      });
    } catch (error) {
      console.error('Erro ao curtir/descurtir coleção:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao processar like',
      });
    }
  };

  /**
   * 🗑️ NOVA API: Deletar coleção completa (decks, flashcards e mídia do R2)
   */
  deleteCollection = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Usuário não autenticado',
        });
      }

      const userId = req.user.id;
      const { collectionName } = req.params;

      if (!collectionName) {
        return res.status(400).json({
          success: false,
          error: 'Nome da coleção é obrigatório',
        });
      }

      // Buscar todos os decks da coleção
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const { data: decks, error: decksError } = await supabase
        .from('decks')
        .select('id')
        .eq('user_id', userId)
        .eq('collection_id', collectionName);

      if (decksError) {
        console.error('Erro ao buscar decks da coleção:', decksError);
        return res.status(500).json({
          success: false,
          error: 'Erro ao buscar decks da coleção',
        });
      }

      if (!decks || decks.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Coleção não encontrada ou vazia',
        });
      }

      const deckIds = decks.map((d: any) => d.id);

      // IMPORTANTE: Buscar flashcards ANTES de deletar para extrair URLs de mídia
      console.log(`🔍 [DELETE-COLLECTION] Buscando flashcards dos decks:`, deckIds);
      
      const { data: flashcards, error: fetchFlashcardsError } = await supabase
        .from('flashcards')
        .select('front_content, back_content')
        .in('deck_id', deckIds);

      console.log(`📊 [DELETE-COLLECTION] Resultado da busca:`, {
        flashcardsCount: flashcards?.length || 0,
        hasError: !!fetchFlashcardsError,
        error: fetchFlashcardsError?.message
      });

      // let deletedMediaCount = 0;
      let mediaFolder: string | null = null;

      if (flashcards && !fetchFlashcardsError && flashcards.length > 0) {
        const urlRegex = /https?:\/\/[^\s"'<>]+\.(jpg|jpeg|png|gif|webp|mp3|mp4|wav|ogg)/i;
        
        console.log(`🔍 [DELETE-COLLECTION] Procurando mídia em ${flashcards.length} flashcards...`);
        
        // DEBUG: Mostrar conteúdo dos primeiros 3 flashcards
        console.log(`🐛 [DEBUG] Primeiros 3 flashcards:`, 
          flashcards.slice(0, 3).map((c: any) => ({
            front: c.front_content?.substring(0, 200),
            back: c.back_content?.substring(0, 200)
          }))
        );
        
        // Procurar por um flashcard que tenha mídia
        for (const card of flashcards) {
          const frontMatch = card.front_content?.match(urlRegex);
          const backMatch = card.back_content?.match(urlRegex);
          const mediaUrl = frontMatch?.[0] || backMatch?.[0];

          if (mediaUrl) {
            console.log(`✅ [DELETE-COLLECTION] URL de mídia encontrada: ${mediaUrl}`);
            
            try {
              // Extrair o diretório da URL: flashcards/{userId}/{collectionSlug}/
              const urlObj = new URL(mediaUrl);
              const path = urlObj.pathname.substring(1); // Remove leading /
              
              console.log(`🔍 [DELETE-COLLECTION] Path extraído: ${path}`);
              
              // Extrair diretório (tudo antes do último /)
              const lastSlashIndex = path.lastIndexOf('/');
              if (lastSlashIndex > 0) {
                mediaFolder = path.substring(0, lastSlashIndex);
                console.log(`📁 [DELETE-COLLECTION] Diretório identificado: ${mediaFolder}`);
                break; // Encontrou, pode parar
              }
            } catch (e) {
              console.error('❌ [DELETE-COLLECTION] Erro ao extrair diretório da URL:', e);
            }
          }
        }

        if (!mediaFolder) {
          console.log(`⚠️ [DELETE-COLLECTION] Nenhuma mídia encontrada nos ${flashcards.length} flashcards`);
        }
      }

      // ✅ DELETAR DO BANCO PRIMEIRO (rápido, não bloqueia)
      console.log(`🗑️ [DELETE-COLLECTION] Deletando flashcards do banco...`);
      
      const { error: flashcardsError } = await supabase
        .from('flashcards')
        .delete()
        .in('deck_id', deckIds);

      if (flashcardsError) {
        console.error('❌ Erro ao deletar flashcards:', flashcardsError);
        return res.status(500).json({
          success: false,
          error: 'Erro ao deletar flashcards',
        });
      }

      console.log(`🗑️ [DELETE-COLLECTION] Deletando decks do banco...`);

      const { error: deleteDecksError } = await supabase
        .from('decks')
        .delete()
        .in('id', deckIds);

      if (deleteDecksError) {
        console.error('❌ Erro ao deletar decks:', deleteDecksError);
        return res.status(500).json({
          success: false,
          error: 'Erro ao deletar decks',
        });
      }

      console.log(`✅ [DELETE-COLLECTION] Coleção deletada do banco de dados`);

      // ✅ RESPONDER IMEDIATAMENTE (antes de limpar R2)
      const responseData = {
        success: true,
        message: mediaFolder 
          ? 'Coleção deletada com sucesso. Arquivos de mídia estão sendo removidos em segundo plano.'
          : 'Coleção deletada com sucesso',
        data: {
          deletedDecks: deckIds.length,
          deletedFlashcards: flashcards?.length || 0,
          mediaCleanupInProgress: !!mediaFolder,
          collectionName,
        },
      };

      // Enviar resposta ANTES de limpar R2
      res.status(200).json(responseData);

      // ✅ LIMPAR R2 EM BACKGROUND (depois de responder)
      if (mediaFolder) {
        // Executar limpeza do R2 em background DEPOIS de responder
        (async () => {
          try {
            const { r2Service } = require('../../../../services/r2Service');
            
            console.log(`🗑️ [DELETE-COLLECTION-BG] Iniciando limpeza de mídia em background: ${mediaFolder}/`);
            
            // Listar TODOS os arquivos do diretório (com paginação automática)
            const allFiles = await r2Service.listAllFiles(mediaFolder);
            
            console.log(`📊 [DELETE-COLLECTION-BG] Total de ${allFiles.length} arquivos encontrados`);
            
            if (allFiles.length > 0) {
              // Deletar em batches de 1000 (limite do R2)
              const BATCH_SIZE = 1000;
              let totalErrors = 0;
              let bgDeletedCount = 0;
              
              for (let i = 0; i < allFiles.length; i += BATCH_SIZE) {
                const batch = allFiles.slice(i, i + BATCH_SIZE);
                const fileKeys = batch.map((file: any) => file.key);
                
                console.log(`🗑️ [DELETE-COLLECTION-BG] Deletando batch ${Math.floor(i / BATCH_SIZE) + 1}: ${fileKeys.length} arquivos...`);
                
                const result = await r2Service.deleteFiles(fileKeys);
                
                bgDeletedCount += result.deleted;
                totalErrors += result.errors.length;
                
                if (result.errors.length > 0) {
                  console.error(`❌ [DELETE-COLLECTION-BG] ${result.errors.length} erros no batch:`, result.errors.slice(0, 5));
                }
                
                console.log(`✅ [DELETE-COLLECTION-BG] Progresso: ${bgDeletedCount}/${allFiles.length} arquivos deletados`);
              }
              
              console.log(`✅ [DELETE-COLLECTION-BG] ${bgDeletedCount} arquivos deletados do diretório ${mediaFolder}/ (${totalErrors} erros)`);
            }
          } catch (r2Error) {
            console.error('❌ [DELETE-COLLECTION-BG] Erro ao deletar mídia do R2:', r2Error);
          }
        })().catch(err => {
          console.error('❌ [DELETE-COLLECTION-BG] Erro fatal na limpeza de mídia:', err);
        });
        
        console.log(`ℹ️ [DELETE-COLLECTION] Limpeza de mídia iniciada em background`);
      } else {
        console.log(`ℹ️ [DELETE-COLLECTION] Nenhum diretório de mídia identificado para esta coleção`);
      }

      // Não retornar nada aqui - já respondemos acima
      return undefined as any;
    } catch (error) {
      console.error('Erro ao deletar coleção:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao deletar coleção',
      });
    }
  };

  /**
   * ⭐ NOVA API: Avaliar coleção
   */
  rateCollection = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Usuário não autenticado',
        });
      }

      const userId = req.user.id;
      const { id: collectionId } = req.params;
      const { rating, comment } = req.body;

      // Validar rating
      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          error: 'Rating deve ser entre 1 e 5',
        });
      }

      // Verificar se a coleção existe
      const collection =
        await this.flashcardRepository.getCollectionById(collectionId);

      if (!collection) {
        return res.status(404).json({
          success: false,
          error: 'Coleção não encontrada',
        });
      }

      // Adicionar/Atualizar avaliação
      await this.flashcardRepository.rateCollection(userId, collectionId, {
        rating,
        comment: comment?.trim() || null,
      });

      // Buscar estatísticas atualizadas
      const updatedStats =
        await this.flashcardRepository.getCollectionStats(collectionId);

      return res.status(200).json({
        success: true,
        message: 'Avaliação salva com sucesso!',
        data: {
          avg_rating: updatedStats.avg_rating || 0,
        total_ratings: updatedStats.total_ratings || 0,
        },
      });
    } catch (error) {
      console.error('Erro ao avaliar coleção:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao salvar avaliação',
      });
    }
  };

  /**
   * 📥 NOVA API: Iniciar importação APKG com progresso
   */
  startApkgImport = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> => {
    console.log('🚀 [BACKEND] startApkgImport - Iniciando endpoint de importação APKG');
    
    try {
      console.log('🔍 [BACKEND] Verificando autenticação do usuário...');
      if (!req.user) {
        console.log('❌ [BACKEND] Usuário não autenticado');
        return res.status(401).json({
          success: false,
          error: 'Usuário não autenticado',
        });
      }

      const userId = req.user.id;
      console.log('✅ [BACKEND] Usuário autenticado:', userId);

      // Verificar se há arquivo enviado
      console.log('🔍 [BACKEND] Verificando arquivo enviado...');
      console.log('📁 [BACKEND] req.file:', req.file ? {
        originalname: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        path: req.file.path
      } : 'null');
      
      if (!req.file) {
        console.log('❌ [BACKEND] Arquivo APKG não encontrado na requisição');
        return res.status(400).json({
          success: false,
          error: 'Arquivo APKG é obrigatório',
        });
      }
      
      console.log('✅ [BACKEND] Arquivo encontrado:', req.file.originalname, 'Tamanho:', req.file.size, 'bytes');

      console.log('🔍 [BACKEND] Extraindo dados do req.body...');
      console.log('📋 [BACKEND] req.body:', req.body);
      
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
        enableIndexing = true,
      } = req.body;

      console.log('📝 [BACKEND] Dados extraídos:', {
        name,
        description,
        tags,
        isPublic,
        category,
        language,
        difficulty,
        duplicateHandling,
        enableFSRS,
        processImages,
        processAudio,
        chunkSize,
        enableIndexing
      });

      // Validar entrada
      console.log('🔍 [BACKEND] Validando nome do deck...');
      if (!name || !name.trim()) {
        console.log('❌ [BACKEND] Nome do deck é obrigatório');
        return res.status(400).json({
          success: false,
          error: 'Nome do deck é obrigatório',
        });
      }
      console.log('✅ [BACKEND] Nome do deck válido:', name.trim());

      // Validar arquivo APKG
      console.log('🔍 [BACKEND] Validando extensão do arquivo...');
      if (!req.file.originalname.toLowerCase().endsWith('.apkg')) {
        console.log('❌ [BACKEND] Arquivo não tem extensão .apkg:', req.file.originalname);
        return res.status(400).json({
          success: false,
          error: 'Arquivo deve ter extensão .apkg',
        });
      }
      console.log('✅ [BACKEND] Extensão .apkg válida');

      console.log('🔍 [BACKEND] Validando tamanho do arquivo...');
      if (req.file.size > 500 * 1024 * 1024) {
        // 500MB max
        console.log('❌ [BACKEND] Arquivo muito grande:', req.file.size, 'bytes (máximo 500MB)');
        return res.status(400).json({
          success: false,
          error: 'Arquivo muito grande (máximo 500MB)',
        });
      }
      console.log('✅ [BACKEND] Tamanho do arquivo válido:', req.file.size, 'bytes');

      // Criar importação
      console.log('🔧 [BACKEND] Criando dados de importação...');
      const importId = `import_${userId}_${Date.now()}`;
      console.log('🆔 [BACKEND] Import ID gerado:', importId);
      
      const importData = {
        id: importId,
        user_id: userId,
        filename: req.file.originalname,
        file_size: req.file.size,
        file_path: req.file.path,
        status: 'PROCESSING' as const,
        progress: {
          phase: 'parsing',
          percentage: 0,
          current_item: 'Iniciando importação...',
          processed: 0,
          total: 0,
          errors: [],
          warnings: [],
        },
        config: {
          name: name.trim(),
          description: description?.trim() || '',
          tags: Array.isArray(tags) ? tags : tags ? [tags] : [],
          is_public: Boolean(isPublic),
          category,
          language,
          difficulty,
          duplicate_handling: duplicateHandling,
          // enable_fsrs: Boolean(enableFSRS), // FSRS logic deprecated
          process_images: Boolean(processImages),
          process_audio: Boolean(processAudio),
          chunk_size: Math.min(Math.max(parseInt(chunkSize) || 100, 10), 500),
          enable_indexing: Boolean(enableIndexing),
        },
        started_at: new Date(),
        estimated_duration: null,
        result_deck_id: null,
      };
      
      console.log('📊 [BACKEND] Dados de importação criados:', JSON.stringify(importData, null, 2));

      // Salvar no banco (usar repository adequado)
      console.log('💾 [BACKEND] Salvando sessão de importação no banco...');
      try {
        await this.flashcardRepository.createImportSession(importData.user_id, importData.config, {
          id: importData.id,
          filename: importData.filename,
          file_size: importData.file_size,
          file_path: importData.file_path,
          started_at: importData.started_at,
        });
        console.log('✅ [BACKEND] Sessão de importação salva com sucesso');
      } catch (dbError) {
        console.error('❌ [BACKEND] Erro ao salvar sessão de importação:', dbError);
        throw dbError;
      }

      // Iniciar processamento em background
      console.log('🚀 [BACKEND] Iniciando processamento em background...');
      try {
        this.processApkgImportAsync(importData);
        console.log('✅ [BACKEND] Processamento em background iniciado');
      } catch (processError) {
        console.error('❌ [BACKEND] Erro ao iniciar processamento:', processError);
        // Não falhar aqui, pois a sessão já foi criada
      }

      console.log('🎉 [BACKEND] Retornando resposta de sucesso');
      return res.status(200).json({
        success: true,
        data: {
          importId,
          status: 'started',
          message: 'Importação iniciada com sucesso',
        },
      });
    } catch (error) {
      const err = error as Error;
      console.error('💥 [BACKEND] Erro crítico ao iniciar importação APKG:', err);
      console.error('💥 [BACKEND] Stack trace:', err.stack);
      console.error('💥 [BACKEND] Tipo do erro:', typeof err);
      console.error('💥 [BACKEND] Propriedades do erro:', Object.keys(err));
      
      return res.status(500).json({
        success: false,
        error: 'Erro ao iniciar importação',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  };

  /**
   * 📊 NOVA API: Buscar progresso da importação
   */
  getImportProgress = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Usuário não autenticado',
        });
      }

      const userId = req.user.id;
      const { importId } = req.params;

      // Validar se a importação pertence ao usuário
      const importSession =
        await this.flashcardRepository.getImportSession(importId);

      if (!importSession) {
        return res.status(404).json({
          success: false,
          error: 'Sessão de importação não encontrada',
        });
      }

      if (importSession.user_id !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Acesso negado à sessão de importação',
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          importId,
          status: importSession.status,
          progress: importSession.progress,
          config: importSession.config,
          started_at: importSession.started_at,
          completed_at: importSession.completed_at,
          estimated_duration: importSession.estimated_duration,
          result_deck_id: importSession.result_deck_id,
        },
      });
    } catch (error) {
      console.error('Erro ao buscar progresso da importação:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao buscar progresso da importação',
      });
    }
  };

  /**
   * ⏸️ NOVA API: Pausar/Retomar importação
   */
  toggleImportPause = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Usuário não autenticado',
        });
      }

      const userId = req.user.id;
      const { importId } = req.params;
      const { action } = req.body; // 'pause' | 'resume'

      // Validar ação
      if (!['pause', 'resume'].includes(action)) {
        return res.status(400).json({
          success: false,
          error: 'Ação deve ser "pause" ou "resume"',
        });
      }

      // Buscar sessão de importação
      const importSession =
        await this.flashcardRepository.getImportSession(importId);

      if (!importSession || importSession.user_id !== userId) {
        return res.status(404).json({
          success: false,
          error: 'Sessão de importação não encontrada',
        });
      }

      // Verificar se pode pausar/retomar
      if (!['PROCESSING', 'PENDING'].includes(importSession.status)) {
        return res.status(400).json({
          success: false,
          error: 'Importação não pode ser pausada/retomada no estado atual',
        });
      }

      // Atualizar status
      const newStatus = action === 'pause' ? 'PENDING' : 'PROCESSING';
      await this.flashcardRepository.updateImportStatus(
        importId,
        newStatus,
        importSession.progress || 0
      );

      return res.status(200).json({
        success: true,
        data: {
          importId,
          status: newStatus,
          message:
            action === 'pause' ? 'Importação pausada' : 'Importação retomada',
        },
      });
    } catch (error) {
      console.error('Erro ao pausar/retomar importação:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao controlar importação',
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
          task: () => this.simulateParsingPhase(importData),
        },
        {
          name: 'processing',
          duration: 5000,
          message: 'Processando cards...',
          task: () => this.simulateProcessingPhase(importData),
        },
        {
          name: 'inserting',
          duration: 3000,
          message: 'Inserindo no banco de dados...',
          task: () => this.simulateInsertingPhase(importData),
        },
        {
          name: 'optimizing',
          duration: 1000,
          message: 'Otimizando índices...',
          task: () => this.simulateOptimizingPhase(importData),
        },
      ];

      for (let i = 0; i < phases.length; i++) {
        const phase = phases[i];

        // Atualizar fase
        await this.flashcardRepository.updateImportStatus(
          importId, 
          'PROCESSING',
          Math.floor((i / phases.length) * 100),
          []
        );

        // Executar fase
        await phase.task();

        // Simular delay
        await new Promise((resolve) => setTimeout(resolve, phase.duration));
      }

      // Finalizar importação
      await this.flashcardRepository.updateImportStatus(
        importId,
        'COMPLETED',
        100,
        [],
        `deck_${Date.now()}` // Mock deck ID
      );
    } catch (error) {
      console.error('Erro no processamento APKG:', error);

      // Marcar como erro
      await this.flashcardRepository.updateImportStatus(
        importData.id,
        'FAILED',
        0,
        [(error as Error).message || 'Erro desconhecido']
      );
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
    // Otimização automática via GIN index na tabela decks
    // Não é necessário criar índices separados
    console.log(`✅ Optimizing for import ${importData.id} - GIN index já configurado`);
    return { processed: 0, warnings: [] };
  }

  /**
   * Buscar metadados das coleções do usuário
   */
  getCollectionsMetadata = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const userId = req.user.id;
      
      // Buscar metadados das coleções do repositório
      const collections = await this.flashcardRepository.getCollectionsMetadata(userId);
      
      // Transformar para o formato esperado pelo frontend
      const formattedCollections = collections.map((col: any) => ({
        id: col.id, // ✅ Usar UUID da coleção
        name: col.name,
        deckCount: col.deck_count || 0,
        cardCount: col.card_count || 0,
        newCards: 0, // TODO: Implementar contagem de cards novos
        updatedAt: col.updated_at,
        createdAt: col.updated_at, // Usar updated_at como fallback
        isAdded: true, // Sempre true para coleções próprias
        isImported: col.is_imported || false, // ✅ Incluir flag de importação
        thumbnail_url: col.thumbnail_url || null, // ✅ Incluir thumbnail
        isPublic: col.is_public || false, // ✅ Incluir flag de público
        tags: [], // TODO: Implementar tags
      }));
      
      return res.status(200).json({
        success: true,
        data: formattedCollections,
      });
    } catch (error) {
      console.error('Erro ao buscar metadados das coleções:', error);
      return res.status(500).json({ 
        success: false,
        error: 'Erro ao buscar metadados das coleções' 
      });
    }
  };

  /**
   * Buscar biblioteca do usuário (coleções adicionadas)
   */
  getMyLibrary = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> => {
    try {
      // Log removido para reduzir verbosidade
      
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const userId = req.user.id;
      const {
        page = '1',
        limit = '20',
      } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);

      const supabase = this.flashcardRepository.getSupabaseClient();
      
      // 1. Buscar coleções PRÓPRIAS do usuário (criadas/importadas por ele via .apkg)
      const { data: ownCollections, error: ownError } = await supabase
        .from('collections')
        .select('id, name, is_public, is_official, is_imported, user_id, deck_count, card_count, thumbnail_url, image_url, created_at, updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (ownError) {
        console.error('❌ [getMyLibrary] Erro ao buscar coleções próprias:', ownError);
        return res.status(500).json({ 
          success: false,
          error: 'Erro ao buscar coleções próprias' 
        });
      }



      // 2. Buscar coleções da COMUNIDADE que o usuário importou (collection_imports)
      const { data: libraryEntries, error: libraryError } = await supabase
        .from('collection_imports')
        .select(`
          collection_id,
          imported_at,
          collections!inner(
            id,
            name,
            is_public,
            is_official,
            is_imported,
            user_id,
            deck_count,
            card_count,
            thumbnail_url,
            image_url,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', userId)
        .order('imported_at', { ascending: false });

      if (libraryError) {
        console.error('❌ [getMyLibrary] Erro ao buscar biblioteca:', libraryError);
        return res.status(500).json({ 
          success: false,
          error: 'Erro ao buscar biblioteca' 
        });
      }



      // Processar coleções PRÓPRIAS (criadas manualmente OU importadas via .apkg)
      const ownCollectionsFormatted = ownCollections?.map((collection: any) => ({
        id: collection.id,
        name: collection.name,
        deck_count: collection.deck_count || 0,
        card_count: collection.card_count || 0,
        added_at: collection.created_at || collection.updated_at,
        updated_at: collection.updated_at,
        created_at: collection.created_at,
        user_id: collection.user_id,
        is_public: collection.is_public || false,
        is_official: collection.is_official || false,
        is_imported: collection.is_imported || false, // ✅ true = importado via .apkg, false = criado manualmente
        is_blocked: false,
        thumbnail_url: collection.thumbnail_url || collection.image_url || null,
        author_name: 'Você',
        author_id: userId,
        isFromCommunity: false, // ✅ false = coleção própria (não importada da comunidade)
      })) || [];

      // Coletar IDs únicos de usuários das coleções da comunidade
      const uniqueUserIds = [...new Set(libraryEntries?.map((entry: any) => entry.collections.user_id))];
      
      // Buscar informações de todos os autores de uma vez
      const { data: usersData } = await supabase
        .from('users')
        .select('id, display_name, username_slug')
        .in('id', uniqueUserIds);
      
      // Criar mapa de usuários para acesso rápido
      const usersMap = new Map();
      usersData?.forEach((user: any) => {
        usersMap.set(user.id, user);
      });

      // Mapear collections IMPORTADAS DA COMUNIDADE (apenas de outros usuários)
      const importedCollections = libraryEntries
        ?.filter((entry: any) => entry.collections.user_id !== userId) // ✅ Filtrar apenas coleções de outros usuários
        .map((entry: any) => {
          const collection = entry.collections;
          const userData = usersMap.get(collection.user_id);
          
          return {
            id: collection.id,
            name: collection.name,
            deck_count: collection.deck_count || 0,
            card_count: collection.card_count || 0,
            added_at: entry.imported_at,
            updated_at: collection.updated_at,
            created_at: collection.created_at,
            user_id: collection.user_id,
            is_public: collection.is_public || false,
            is_official: collection.is_official || false,
            is_imported: collection.is_imported || false, // Flag da coleção original
            is_blocked: !collection.is_public,
            thumbnail_url: collection.thumbnail_url || collection.image_url || null,
            author_name: userData?.display_name || userData?.username_slug || 'Usuário',
            author_id: collection.user_id,
            isFromCommunity: true, // ✅ true = importado da comunidade (não é do usuário)
          };
        }) || [];



      // Ordenar coleções próprias por data de adição (mais recente primeiro)
      ownCollectionsFormatted.sort((a: any, b: any) => new Date(b.added_at).getTime() - new Date(a.added_at).getTime());
      
      // Ordenar coleções importadas por data de importação (mais recente primeiro)
      importedCollections.sort((a: any, b: any) => new Date(b.added_at).getTime() - new Date(a.added_at).getTime());



      // Retornar as coleções JÁ SEPARADAS - sem lógica de negócio no frontend
      return res.status(200).json({
        success: true,
        myCollections: ownCollectionsFormatted,
        importedCollections: importedCollections,
        pagination: {
          page: pageNum,
          limit: limitNum,
          totalOwn: ownCollectionsFormatted.length,
          totalImported: importedCollections.length,
          total: ownCollectionsFormatted.length + importedCollections.length,
        },
      });
    } catch (error) {
      console.error('❌ [getMyLibrary] Erro ao buscar biblioteca:', error);
      return res.status(500).json({ 
        success: false,
        error: 'Erro ao buscar biblioteca' 
      });
    }
  };

  /**
   * Buscar coleções OFICIAIS MedBrave
   */
  getOfficialCollections = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const {
        page = '1',
        limit = '50',
        search = '',
      } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;

      console.log('🏛️ [getOfficialCollections] Buscando coleções oficiais...');

      const supabase = this.flashcardRepository.getSupabaseClient();

      let query = supabase
        .from('collections')
        .select('*', { count: 'exact' })
        .eq('is_official', true)
        .eq('is_public', true);

      // Filtro de busca
      if (search) {
        query = query.ilike('name', `%${search}%`);
      }

      const { data: collections, error, count } = await query
        .order('updated_at', { ascending: false })
        .range(offset, offset + limitNum - 1);

      if (error) {
        console.error('❌ [getOfficialCollections] Erro:', error);
        return res.status(500).json({ error: 'Erro ao buscar coleções oficiais' });
      }

      console.log(`✅ [getOfficialCollections] ${collections?.length || 0} coleções encontradas`);

      return res.status(200).json({
        success: true,
        data: collections || [],
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limitNum),
        },
      });
    } catch (error) {
      console.error('❌ [getOfficialCollections] Erro:', error);
      return res.status(500).json({ error: 'Erro ao buscar coleções oficiais' });
    }
  };

  /**
   * Buscar coleções da COMUNIDADE (públicas não-oficiais)
   */
  getCommunityCollections = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const {
        page = '1',
        limit = '50',
        search = '',
        // sortBy removido
      } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;



      const supabase = this.flashcardRepository.getSupabaseClient();

      let query = supabase
        .from('collections')
        .select('*', { count: 'exact' })
        .eq('is_public', true);
        // REMOVIDO: .eq('is_official', false) - Agora retorna TODAS as coleções públicas (oficiais e não-oficiais)

      // Filtro de busca
      if (search) {
        query = query.ilike('name', `%${search}%`);
      }

      const { data: collections, error, count } = await query
        .order('updated_at', { ascending: false })
        .range(offset, offset + limitNum - 1);

      if (error) {

        return res.status(500).json({ error: 'Erro ao buscar coleções da comunidade' });
      }



      return res.status(200).json({
        success: true,
        data: collections || [],
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limitNum),
        },
      });
    } catch (error) {

      return res.status(500).json({ error: 'Erro ao buscar coleções da comunidade' });
    }
  };

  /**
   * Buscar detalhes de uma coleção pública específica
   */
  getPublicCollectionDetails = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const { collectionName } = req.params;

      console.log('🔍 [getPublicCollectionDetails] Buscando detalhes da coleção:', {
        collectionName,
        userId: req.user.id
      });

      // Buscar detalhes da coleção
      const collectionDetails = await this.flashcardRepository.getPublicCollectionDetails(collectionName);

      if (!collectionDetails) {
        return res.status(404).json({ 
          success: false,
          error: 'Coleção não encontrada ou não é pública' 
        });
      }

      console.log('✅ [getPublicCollectionDetails] Detalhes encontrados:', {
        name: collectionDetails.name,
        deckCount: collectionDetails.deck_count,
        cardCount: collectionDetails.card_count
      });

      return res.status(200).json({
        success: true,
        data: collectionDetails
      });
    } catch (error) {
      console.error('❌ [getPublicCollectionDetails] Erro ao buscar detalhes da coleção:', error);
      return res.status(500).json({ error: 'Erro ao buscar detalhes da coleção' });
    }
  };

  /**
   * Upload de imagem para flashcard
   */
  uploadFlashcardImage = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const file = req.file;
      const { deckId } = req.body;

      if (!file) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
      }

      if (!deckId) {
        return res.status(400).json({ error: 'deckId é obrigatório' });
      }

      // Importar serviços
      const fs = await import('fs');
      const { R2Service } = await import('../../../../services/r2Service');
      const { MediaOptimizationService } = await import('../../../../services/mediaOptimizationService');

      const r2Service = new R2Service();
      const optimizer = new MediaOptimizationService();

      // Ler arquivo
      const fileBuffer = fs.readFileSync(file.path);

      // Otimizar imagem
      let optimizedBuffer: Buffer = fileBuffer;
      let mimeType = file.mimetype;

      if (optimizer.isImage(file.mimetype)) {
        const result = await optimizer.optimizeImage(fileBuffer, {
          maxWidth: 1920,
          maxHeight: 1920,
          quality: 90,
          format: 'webp',
        });
        optimizedBuffer = Buffer.from(result.buffer);
        mimeType = result.mimeType;
      }

      // Buscar o deck para obter o collection
      const supabase = this.flashcardRepository.getSupabaseClient();
      const { data: deck, error: deckError } = await supabase
        .from('decks')
        .select('collection_id, user_id')
        .eq('id', deckId)
        .single();

      if (deckError || !deck) {
        fs.unlinkSync(file.path);
        return res.status(404).json({ error: 'Deck não encontrado' });
      }

      // Verificar se o usuário é dono do deck
      if (deck.user_id !== req.user.id) {
        fs.unlinkSync(file.path);
        return res.status(403).json({ error: 'Você não tem permissão para adicionar imagens neste deck' });
      }

      // Criar slug da coleção (mesma lógica do CollectionController)
      const collectionSlug = deck.collection
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 50);

      // Upload para R2 usando a estrutura: flashcards/{userId}/{collectionSlug}/images/
      const fileName = `${Date.now()}-${file.originalname.replace(/\.(jpg|jpeg|png|gif)$/i, '.webp')}`;
      const folder = `flashcards/${req.user.id}/${collectionSlug}/images`;

      const uploadResult = await r2Service.uploadFile(
        optimizedBuffer,
        fileName,
        mimeType,
        folder,
      );

      // Limpar arquivo temporário
      fs.unlinkSync(file.path);

      return res.status(200).json({
        success: true,
        url: uploadResult.publicUrl,
      });
    } catch (error) {
      console.error('❌ [uploadFlashcardImage] Erro:', error);
      return res.status(500).json({ error: 'Erro ao fazer upload da imagem' });
    }
  };

  // ==================== NOVOS MÉTODOS PARA COLLECTIONS COM ID ÚNICO ====================

  /**
   * 📦 Criar nova coleção com ID único
   */
  createCollection = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const { name, description, is_public, thumbnail_url } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Nome da coleção é obrigatório' });
      }

      // Gerar ID único usando idGenerator
      const { generateCollectionId } = require('../../../../utils/idGenerator');
      const collectionId = generateCollectionId(name);

      const collection = await this.flashcardRepository.createCollection({
        id: collectionId,
        name: name.trim(),
        description: description?.trim(),
        user_id: req.user.id,
        is_public: is_public || false,
        is_imported: false,
        thumbnail_url,
      });

      return res.status(201).json({
        success: true,
        message: 'Coleção criada com sucesso!',
        data: collection,
      });
    } catch (error) {
      console.error('Erro ao criar coleção:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao criar coleção',
      });
    }
  };

  /**
   * 📖 Buscar coleção por ID único
   */
  getCollectionByUniqueId = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const { collectionId } = req.params;

      // Verificar acesso
      const hasAccess = await this.flashcardRepository.canAccessCollection(
        collectionId,
        req.user.id,
      );

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: 'Acesso negado a esta coleção',
        });
      }

      const collection = await this.flashcardRepository.getCollectionByUniqueId(
        collectionId,
      );

      if (!collection) {
        return res.status(404).json({
          success: false,
          error: 'Coleção não encontrada',
        });
      }

      // Verificar se o usuário é o dono da coleção
      const isOwner = collection.user_id === req.user.id;

      // Verificar se é uma coleção importada da comunidade
      let isFromCommunity = false;
      if (!isOwner) {
        const { data: importData } = await supabase
          .from('collection_imports')
          .select('id')
          .eq('user_id', req.user.id)
          .eq('collection_id', collectionId)
          .single();
        
        isFromCommunity = !!importData;
      }

      return res.status(200).json({
        success: true,
        data: {
          ...collection,
          canEdit: isOwner, // Se pode editar (é o dono)
          isFromCommunity, // Se foi importada da comunidade
        },
      });
    } catch (error) {
      console.error('Erro ao buscar coleção:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao buscar coleção',
      });
    }
  };

  /**
   * 📚 Buscar decks de uma coleção por ID único
   */
  getDecksByCollectionId = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const { collectionId } = req.params;

      const decks = await this.flashcardRepository.getDecksByCollectionId(
        collectionId,
        req.user.id,
      );

      // Verificar se é uma coleção da comunidade
      const collection = await this.flashcardRepository.getCollectionByUniqueId(
        collectionId,
      );
      // Verificar se é uma coleção importada da comunidade
      let isFromCommunity = false;
      if (collection) {
        const { data: importData } = await supabase
          .from('collection_imports')
          .select('id')
          .eq('user_id', req.user.id)
          .eq('collection_id', collectionId)
          .single();
        
        isFromCommunity = !!importData;
      }

      return res.status(200).json({
        success: true,
        data: {
          decks,
          isFromCommunity,
        },
      });
    } catch (error) {
      console.error('Erro ao buscar decks da coleção:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao buscar decks',
      });
    }
  };

  /**
   * ➕ Adicionar coleção à biblioteca (por ID único)
   */
  addCollectionToLibrary = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const { collectionId } = req.params;

      await this.flashcardRepository.addCollectionToLibrary(
        req.user.id,
        collectionId,
      );

      return res.status(200).json({
        success: true,
        message: 'Coleção adicionada à biblioteca com sucesso!',
      });
    } catch (error) {
      console.error('Erro ao adicionar coleção à biblioteca:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Erro ao adicionar à biblioteca';
      
      // Retornar status code apropriado baseado no erro
      if (errorMessage.includes('not found')) {
        return res.status(404).json({ success: false, error: errorMessage });
      }
      if (errorMessage.includes('your own collection')) {
        return res.status(400).json({ success: false, error: 'Você não pode adicionar suas próprias coleções à biblioteca' });
      }
      if (errorMessage.includes('private')) {
        return res.status(403).json({ success: false, error: 'Esta coleção é privada' });
      }
      
      return res.status(500).json({
        success: false,
        error: errorMessage,
      });
    }
  };

  /**
   * ➖ Remover coleção da biblioteca (por ID único)
   */
  removeCollectionFromLibrary = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const { collectionId } = req.params;

      await this.flashcardRepository.removeCollectionFromLibrary(
        req.user.id,
        collectionId,
      );

      return res.status(200).json({
        success: true,
        message: 'Coleção removida da biblioteca com sucesso!',
      });
    } catch (error) {
      console.error('Erro ao remover coleção da biblioteca:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao remover da biblioteca',
      });
    }
  };

  /**
   * ✅ Verificar se coleção está na biblioteca
   */
  checkCollectionInLibrary = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const { collectionId } = req.params;

      const isInLibrary = await this.flashcardRepository.isCollectionInLibrary(
        req.user.id,
        collectionId,
      );

      return res.status(200).json({
        success: true,
        data: { isInLibrary },
      });
    } catch (error) {
      console.error('Erro ao verificar biblioteca:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao verificar biblioteca',
      });
    }
  };

  /**
   * ✏️ Atualizar coleção
   */
  updateCollectionById = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const { collectionId } = req.params;
      const { name, description, is_public, thumbnail_url } = req.body;

      const updatedCollection = await this.flashcardRepository.updateCollection(
        collectionId,
        req.user.id,
        {
          name,
          description,
          is_public,
          thumbnail_url,
        },
      );

      return res.status(200).json({
        success: true,
        message: 'Coleção atualizada com sucesso!',
        data: updatedCollection,
      });
    } catch (error) {
      console.error('Erro ao atualizar coleção:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao atualizar coleção',
      });
    }
  };

  /**
   * 🗑️ Deletar coleção por ID único
   */
  deleteCollectionById = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const { collectionId } = req.params;

      await this.flashcardRepository.deleteCollection(
        collectionId,
        req.user.id,
      );

      return res.status(200).json({
        success: true,
        message: 'Coleção deletada com sucesso!',
      });
    } catch (error) {
      console.error('Erro ao deletar coleção:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao deletar coleção',
      });
    }
  };

  // ==================== MÉTODOS DE SESSÃO DE ESTUDO ====================

  /**
   * 📖 Buscar ou criar sessão de estudo
   */
  getStudySession = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const { deckId } = req.params;

      // Buscar total de cards do deck
      const { data: deck, error: deckError } = await supabase
        .from('decks')
        .select('flashcard_count')
        .eq('id', deckId)
        .single();

      if (deckError || !deck) {
        return res.status(404).json({ error: 'Deck não encontrado' });
      }

      const session = await this.sessionService.getOrCreateSession(
        req.user.id,
        deckId,
        deck.flashcard_count || 0,
      );

      return res.status(200).json({
        success: true,
        data: session,
      });
    } catch (error) {
      console.error('Erro ao buscar sessão:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao buscar sessão de estudo',
      });
    }
  };

  /**
   * 💾 Atualizar progresso da sessão
   */
  updateStudySession = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const { deckId } = req.params;
      const { current_index, studied_cards, reviewed_card_ids } = req.body;

      const session = await this.sessionService.updateSession(
        req.user.id,
        deckId,
        {
          current_index,
          studied_cards,
          reviewed_card_ids,
        },
      );

      return res.status(200).json({
        success: true,
        data: session,
      });
    } catch (error) {
      console.error('Erro ao atualizar sessão:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao atualizar sessão de estudo',
      });
    }
  };

  /**
   * ✅ Finalizar sessão de estudo
   */
  finishStudySession = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const { deckId } = req.params;

      await this.sessionService.finishSession(req.user.id, deckId);

      return res.status(200).json({
        success: true,
        message: 'Sessão finalizada com sucesso',
      });
    } catch (error) {
      console.error('Erro ao finalizar sessão:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao finalizar sessão de estudo',
      });
    }
  };

  /**
   * 📊 Buscar estatísticas do deck
   */
  getDeckStatistics = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const { deckId } = req.params;

      const stats = await this.sessionService.getDeckStats(req.user.id, deckId);

      return res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao buscar estatísticas do deck',
      });
    }
  };

  /**
   * 🧹 Limpar sessões antigas manualmente (admin)
   */
  cleanOldSessions = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      // Executar função de limpeza manual
      const { data, error } = await supabase.rpc('manual_clean_old_study_sessions');

      if (error) {
        console.error('Erro ao limpar sessões antigas:', error);
        return res.status(500).json({
          success: false,
          error: 'Erro ao limpar sessões antigas',
        });
      }

      const deletedCount = data?.[0]?.deleted_count || 0;

      return res.status(200).json({
        success: true,
        message: `${deletedCount} sessões antigas foram removidas`,
        data: { deletedCount },
      });
    } catch (error) {
      console.error('Erro ao limpar sessões:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao limpar sessões antigas',
      });
    }
  };
}
