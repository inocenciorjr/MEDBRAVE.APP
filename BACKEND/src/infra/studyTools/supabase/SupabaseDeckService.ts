 
import { AppError } from '../../../shared/errors/AppError';
import {
  Deck,
  DeckStatus,
  CreateDeckPayload,
  UpdateDeckPayload,
  ListDecksOptions,
  PaginatedDecksResult,
} from '../../../domain/studyTools/flashcards/types';
import logger from '../../../utils/logger';
import { supabase } from '../../../config/supabase';

// Tables
const DECKS_TABLE = 'decks';
const FLASHCARDS_TABLE = 'flashcards';
const USERS_TABLE = 'users';
const FAVORITE_DECKS_TABLE = 'favorite_decks';

export class SupabaseDeckService {
  constructor() {}

  private async validateUserExists(user_id: string): Promise<void> {
    try {
      const { data: user, error } = await supabase
        .from(USERS_TABLE)
        .select('id')
        .eq('id', user_id)
        .single();

      if (error || !user) {
        throw AppError.notFound(`Usuário com ID ${user_id} não encontrado`);
      }
    } catch (error: unknown) {
      if (error instanceof AppError) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';
      throw AppError.internal(`Erro ao validar usuário: ${errorMessage}`);
    }
  }

  async createDeck(data: CreateDeckPayload): Promise<Deck> {
    try {
      await this.validateUserExists(data.user_id);

      const now = new Date().toISOString();
      
      // Gerar ID usando idGenerator
      const { generateDeckId } = await import('../../../utils/idGenerator');
      const collectionId = (data as any).collection_id;
      
      // Buscar nome da collection se houver
      let collectionName = 'default';
      if (collectionId) {
        const { data: collectionData } = await supabase
          .from('collections')
          .select('name')
          .eq('id', collectionId)
          .single();
        
        if (collectionData) {
          collectionName = collectionData.name;
        }
      }
      
      // Verificar se já existe deck com mesmo nome na collection
      const baseDeckId = await generateDeckId(
        data.user_id,
        data.name,
        collectionName
      );
      
      // Verificar se ID já existe
      const { data: existingDeck } = await supabase
        .from(DECKS_TABLE)
        .select('id')
        .eq('id', baseDeckId)
        .single();
      
      // Se existir, adicionar timestamp para garantir unicidade
      const deckId = existingDeck 
        ? `${baseDeckId}-${Date.now().toString(36)}`
        : baseDeckId;
      
      const newDeck = {
        id: deckId,
        user_id: data.user_id,
        name: data.name,
        description: data.description || null,
        collection_id: collectionId || null,
        is_public: data.is_public ?? false,
        is_official: data.is_official ?? false,
        tags: data.tags || [],
        image_url: data.cover_image_url || '/medbravethumb.png',
        flashcard_count: 0,
        created_at: now,
        updated_at: now,
      };

      const { data: deck, error } = await supabase
        .from(DECKS_TABLE)
        .insert(newDeck)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      // Atualizar estatísticas do usuário
      const { error: userError } = await supabase.rpc(
        'increment_user_total_decks',
        {
          user_id: data.user_id,
        },
      );

      if (userError) {
        logger.warn('Erro ao atualizar estatísticas do usuário:', userError);
      }

      // Atualizar contadores da collection se houver collection_id
      if ((data as any).collection_id) {
        try {
          const { SupabaseFlashcardRepository } = await import('./SupabaseFlashcardRepository');
          const flashcardRepo = new SupabaseFlashcardRepository(supabase);
          await flashcardRepo.updateCollectionCounts((data as any).collection_id);
        } catch (error) {
          logger.warn('Erro ao atualizar contadores da collection:', error);
        }
      }

      return this.mapDeckFromDatabase(deck);
    } catch (error) {
      logger.error('Erro ao criar deck:', { error, data });
      if (error instanceof AppError) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';
      throw AppError.internal(`Erro ao criar deck: ${errorMessage}`);
    }
  }

  async getDeckById(id: string, user_id: string): Promise<Deck | null> {
    try {
      const { data: deck, error } = await supabase
        .from(DECKS_TABLE)
        .select('*, hierarchy, hierarchy_path')
        .eq('id', id)
        .single();

      if (error || !deck) {
        return null;
      }

      // Se o deck não for público e não pertencer ao usuário, retorna erro
      if (!deck.is_public && deck.user_id !== user_id) {
        throw AppError.forbidden('Usuário não autorizado a acessar este deck.');
      }

      return this.mapDeckFromDatabase(deck);
    } catch (error) {
      logger.error('Erro ao buscar deck:', { error, id, user_id });
      if (error instanceof AppError) {
        throw error;
      }
      throw AppError.internal(`Erro ao buscar deck: ${error}`);
    }
  }

  async updateDeck(
    deck_id: string,
    user_id: string,
    data: UpdateDeckPayload,
  ): Promise<Deck | null> {
    try {
      // Verificar se o deck existe e pertence ao usuário
      const { data: existingDeck, error: fetchError } = await supabase
        .from(DECKS_TABLE)
        .select('*')
        .eq('id', deck_id)
        .eq('user_id', user_id)
        .single();

      if (fetchError || !existingDeck) {
        if (fetchError?.code === 'PGRST116') {
          throw AppError.notFound('Deck não encontrado.');
        }
        throw AppError.forbidden(
          'Usuário não autorizado a atualizar este deck.',
        );
      }

      const updateData = {
        ...data,
        updated_at: new Date().toISOString(),
      };

      const { data: updatedDeck, error } = await supabase
        .from(DECKS_TABLE)
        .update(updateData)
        .eq('id', deck_id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return this.mapDeckFromDatabase(updatedDeck);
    } catch (error) {
      logger.error('Erro ao atualizar deck:', { error, deck_id, user_id, data });
      if (error instanceof AppError) {
        throw error;
      }
      throw AppError.internal(`Erro ao atualizar deck: ${error}`);
    }
  }

  async deleteDeck(deck_id: string, user_id: string): Promise<void> {
    try {
      // Verificar se o deck existe e pertence ao usuário
      const { data: deck, error: fetchError } = await supabase
        .from(DECKS_TABLE)
        .select('*')
        .eq('id', deck_id)
        .eq('user_id', user_id)
        .single();

      if (fetchError || !deck) {
        if (fetchError?.code === 'PGRST116') {
          throw AppError.notFound('Deck não encontrado.');
        }
        throw AppError.forbidden('Usuário não autorizado a deletar este deck.');
      }

      // Deletar flashcards do deck
      const { error: flashcardsError } = await supabase
        .from(FLASHCARDS_TABLE)
        .delete()
        .eq('deck_id', deck_id);

      if (flashcardsError) {
        logger.warn('Erro ao deletar flashcards:', flashcardsError);
      }

      // Deletar favoritos do deck
      const { error: favoritesError } = await supabase
        .from(FAVORITE_DECKS_TABLE)
        .delete()
        .eq('deck_id', deck_id);

      if (favoritesError) {
        logger.warn('Erro ao deletar favoritos:', favoritesError);
      }

      // Deletar o deck
      const { error: deleteError } = await supabase
        .from(DECKS_TABLE)
        .delete()
        .eq('id', deck_id);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      // Atualizar estatísticas do usuário
      const { error: userError } = await supabase.rpc(
        'decrement_user_total_decks',
        {
          user_id: user_id,
        },
      );

      if (userError) {
        logger.warn('Erro ao atualizar estatísticas do usuário:', userError);
      }
    } catch (error) {
      logger.error('Erro ao deletar deck:', { error, deck_id, user_id });
      if (error instanceof AppError) {
        throw error;
      }
      throw AppError.internal(`Erro ao deletar deck: ${error}`);
    }
  }

  async listDecks(
    options: ListDecksOptions = {},
  ): Promise<PaginatedDecksResult> {
    try {
      let query = supabase
        .from(DECKS_TABLE)
        .select('*, hierarchy, "hierarchyPath"', { count: 'exact' });

      // Filtros
      if (options.user_id) {
        query = query.eq('user_id', options.user_id);
      }

      if (options.status) {
        query = query.eq('status', options.status);
      }

      if (options.is_public !== undefined) {
        query = query.eq('is_public', options.is_public);
      }

      if (options.tags && options.tags.length > 0) {
        query = query.overlaps('tags', options.tags);
      }

      // Ordenação
      const sort_by = options.sort_by || 'updated_at';
      const sort_order = options.sort_order || 'DESC';
      query = query.order(sort_by, {
        ascending: sort_order.toLowerCase() === 'asc',
      });

      // Paginação
      const limit = options.limit || 10;
      let offset = 0;

      if (options.last_doc_id) {
        // Para paginação baseada em cursor, precisaríamos implementar lógica adicional
        // Por simplicidade, usando offset baseado em página
        offset = limit;
      }

      query = query.range(offset, offset + limit - 1);

      const { data: decks, error, count } = await query;

      if (error) {
        throw new Error(error.message);
      }

      const has_more = (count || 0) > offset + limit;
      const mappedDecks = (decks || []).map((deck) =>
        this.mapDeckFromDatabase(deck),
      );

      return {
        decks: mappedDecks,
        total: count || 0,
        has_more,
      };
    } catch (error) {
      logger.error('Erro ao listar decks:', { error, options });
      if (error instanceof AppError) {
        throw error;
      }
      throw AppError.internal(`Erro ao listar decks: ${error}`);
    }
  }

  async toggleFavoriteDeck(
    deck_id: string,
    user_id: string,
  ): Promise<{ is_favorite: boolean }> {
    try {
      await this.validateUserExists(user_id);

      // Verificar se o deck existe
      const { data: deck, error: deckError } = await supabase
        .from(DECKS_TABLE)
        .select('id')
        .eq('id', deck_id)
        .single();

      if (deckError || !deck) {
        throw AppError.notFound('Deck não encontrado.');
      }

      // Verificar se já está nos favoritos
      const { data: favorite } = await supabase
        .from(FAVORITE_DECKS_TABLE)
        .select('id')
        .eq('user_id', user_id)
        .eq('deck_id', deck_id)
        .single();

      if (favorite) {
        // Remover dos favoritos
        const { error: deleteError } = await supabase
          .from(FAVORITE_DECKS_TABLE)
          .delete()
          .eq('user_id', user_id)
          .eq('deck_id', deck_id);

        if (deleteError) {
          throw new Error(deleteError.message);
        }

        return { is_favorite: false };
      } else {
        // Adicionar aos favoritos
        const { error: insertError } = await supabase
          .from(FAVORITE_DECKS_TABLE)
          .insert({
            user_id: user_id,
            deck_id: deck_id,
            favorited_at: new Date().toISOString(),
          });

        if (insertError) {
          throw new Error(insertError.message);
        }

        return { is_favorite: true };
      }
    } catch (error) {
      logger.error('Erro ao alternar favorito:', { error, deck_id, user_id });
      if (error instanceof AppError) {
        throw error;
      }
      throw AppError.internal(`Erro ao alternar favorito: ${error}`);
    }
  }

  async getFavoriteDecks(
    user_id: string,
    options: ListDecksOptions = {},
  ): Promise<PaginatedDecksResult> {
    try {
      const limit = options.limit || 10;
      let offset = 0;

      if (options.last_doc_id) {
        offset = limit;
      }

      const {
        data: favorites,
        error,
        count,
      } = await supabase
        .from(FAVORITE_DECKS_TABLE)
        .select(
          `
          deck_id,
          favorited_at,
          ${DECKS_TABLE}(*, hierarchy, "hierarchyPath")
        `,
          { count: 'exact' },
        )
        .eq('user_id', user_id)
        .order('favorited_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw new Error(error.message);
      }

      const has_more = (count || 0) > offset + limit;
      const decks = (favorites || []).map((favorite) =>
        this.mapDeckFromDatabase(favorite.decks),
      );

      return {
        decks,
        total: count || 0,
        has_more,
      };
    } catch (error) {
      logger.error('Erro ao listar decks favoritos:', {
        error,
        user_id,
        options,
      });
      if (error instanceof AppError) {
        throw error;
      }
      throw AppError.internal(`Erro ao listar decks favoritos: ${error}`);
    }
  }

  async recalculateFlashcardCount(deck_id: string): Promise<void> {
    try {
      const { data: deck, error: deckError } = await supabase
        .from(DECKS_TABLE)
        .select('id')
        .eq('id', deck_id)
        .single();

      if (deckError || !deck) {
        throw AppError.notFound('Deck não encontrado.');
      }

      const { count, error: countError } = await supabase
        .from(FLASHCARDS_TABLE)
        .select('*', { count: 'exact', head: true })
        .eq('deck_id', deck_id);

      if (countError) {
        throw new Error(countError.message);
      }

      const { error: updateError } = await supabase
        .from(DECKS_TABLE)
        .update({
          flashcard_count: count || 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', deck_id);

      if (updateError) {
        throw new Error(updateError.message);
      }
    } catch (error) {
      logger.error('Erro ao recalcular contagem de flashcards:', {
        error,
        deck_id,
      });
      if (error instanceof AppError) {
        throw error;
      }
      throw AppError.internal(
        `Erro ao recalcular contagem de flashcards: ${error}`,
      );
    }
  }

  async toggleDeckVisibility(
    deck_id: string,
    user_id: string,
  ): Promise<Deck | null> {
    try {
      const { data: existingDeck, error: fetchError } = await supabase
        .from(DECKS_TABLE)
        .select('*')
        .eq('id', deck_id)
        .eq('user_id', user_id)
        .single();

      if (fetchError || !existingDeck) {
        if (fetchError?.code === 'PGRST116') {
          throw AppError.notFound('Deck não encontrado.');
        }
        throw AppError.forbidden(
          'Usuário não autorizado a alterar a visibilidade deste deck.',
        );
      }

      const newVisibility = !existingDeck.is_public;

      const { data: updatedDeck, error } = await supabase
        .from(DECKS_TABLE)
        .update({
          is_public: newVisibility,
          updated_at: new Date().toISOString(),
        })
        .eq('id', deck_id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return this.mapDeckFromDatabase(updatedDeck);
    } catch (error) {
      logger.error('Erro ao alterar visibilidade do deck:', {
        error,
        deck_id,
        user_id,
      });
      if (error instanceof AppError) {
        throw error;
      }
      throw AppError.internal(`Erro ao alterar visibilidade do deck: ${error}`);
    }
  }

  async getAvailableTags(user_id: string): Promise<string[]> {
    try {
      await this.validateUserExists(user_id);

      const { data: decks, error } = await supabase
        .from(DECKS_TABLE)
        .select('tags')
        .eq('user_id', user_id)
        .eq('status', DeckStatus.ACTIVE);

      if (error) {
        throw new Error(error.message);
      }

      const tagsSet = new Set<string>();

      (decks || []).forEach((deck) => {
        if (deck.tags && Array.isArray(deck.tags)) {
          deck.tags.forEach((tag: string) => {
            if (tag && typeof tag === 'string' && tag.trim()) {
              tagsSet.add(tag.trim().toLowerCase());
            }
          });
        }
      });

      const tags = Array.from(tagsSet).sort();
      logger.info(`Tags encontradas para usuário ${user_id}:`, tags);
      return tags;
    } catch (error) {
      logger.error('Erro ao buscar tags disponíveis:', { error, user_id });
      if (error instanceof AppError) {
        throw error;
      }
      throw AppError.internal(`Erro ao buscar tags disponíveis: ${error}`);
    }
  }

  async getUserStats(user_id: string): Promise<{
    totalDecks: number;
    totalCards: number;
    dueCards: number;
    studiedToday: number;
    streakDays: number;
    totalStudyTime: number;
    publicDecks: number;
    favoriteDecks: number;
  }> {
    try {
      await this.validateUserExists(user_id);

      // Buscar estatísticas dos decks
      const { data: decks, error: decksError } = await supabase
        .from(DECKS_TABLE)
        .select('flashcard_count, is_public')
        .eq('user_id', user_id)
        .eq('status', DeckStatus.ACTIVE);

      if (decksError) {
        throw new Error(decksError.message);
      }

      let totalDecks = 0;
      let totalCards = 0;
      let publicDecks = 0;

      (decks || []).forEach((deck) => {
        totalDecks++;
        totalCards += deck.flashcard_count || 0;
        if (deck.is_public) {
          publicDecks++;
        }
      });

      // Contar decks favoritos
      const { count: favoriteDecks, error: favoritesError } =
        await supabase
          .from(FAVORITE_DECKS_TABLE)
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user_id);

      if (favoritesError) {
        logger.warn('Erro ao contar favoritos:', favoritesError);
      }

      // TODO: Implementar estatísticas de revisão quando o sistema FSRS estiver integrado
      const stats = {
        totalDecks,
        totalCards,
        dueCards: 0, // TODO: Calcular com base no sistema FSRS
        studiedToday: 0, // TODO: Calcular com base nas revisões do dia
        streakDays: 0, // TODO: Calcular streak de estudos
        totalStudyTime: 0, // TODO: Calcular tempo total de estudo
        publicDecks,
        favoriteDecks: favoriteDecks || 0,
      };

      logger.info(`Estatísticas calculadas para usuário ${user_id}:`, stats);
      return stats;
    } catch (error) {
      logger.error('Erro ao calcular estatísticas do usuário:', {
        error,
        user_id,
      });
      if (error instanceof AppError) {
        throw error;
      }
      throw AppError.internal(
        `Erro ao calcular estatísticas do usuário: ${error}`,
      );
    }
  }

  async searchDecks(searchParams: any): Promise<PaginatedDecksResult> {
    try {
      const {
        user_id,
        search,
        tags,
        status,
        is_public,
        limit = 10,
        offset = 0,
      } = searchParams;

      let query = supabase
        .from(DECKS_TABLE)
        .select('*, hierarchy, "hierarchyPath"', { count: 'exact' });

      // Filtro por usuário (sempre obrigatório para decks privados)
      if (is_public !== 'true') {
        query = query.eq('user_id', user_id);
      }

      // Filtro por status
      if (status && status !== 'all') {
        if (status === 'public') {
          query = query.eq('is_public', true);
        } else if (status === 'private') {
          query = query.eq('is_public', false);
        }
      }

      // Filtro por visibilidade pública
      if (is_public === 'true') {
        query = query.eq('is_public', true);
      }

      // Filtro por busca de texto usando Full Text Search com GIN index
      if (search && search.trim()) {
        const searchTerm = search.trim();
        // Usar Full Text Search com GIN index para melhor performance
        query = query.textSearch('searchable_text', searchTerm, {
          type: 'websearch',
          config: 'portuguese'
        });
      }

      // Filtro por tags
      if (tags && Array.isArray(tags) && tags.length > 0) {
        query = query.overlaps('tags', tags);
      }

      // Ordenação padrão
      query = query.order('updated_at', { ascending: false });

      // Aplicar limit e offset
      query = query.range(Number(offset), Number(offset) + Number(limit) - 1);

      const { data: decks, error, count } = await query;

      if (error) {
        throw new Error(error.message);
      }

      const has_more = (count || 0) > Number(offset) + Number(limit);
      const mappedDecks = (decks || []).map((deck) =>
        this.mapDeckFromDatabase(deck),
      );

      return {
        decks: mappedDecks,
        total: count || 0,
        has_more,
      };
    } catch (error) {
      logger.error('Erro ao buscar decks:', { error, searchParams });
      if (error instanceof AppError) {
        throw error;
      }
      throw AppError.internal(`Erro ao buscar decks: ${error}`);
    }
  }

  private mapDeckFromDatabase(deck: any): Deck {
    return {
      id: deck.id,
      user_id: deck.user_id || deck.userId,
      name: deck.name,
      description: deck.description,
      is_public: deck.is_public || deck.isPublic,
      tags: deck.tags || [],
      cover_image_url: deck.image_url || deck.cover_image_url || deck.coverImageUrl,
      status: deck.status || DeckStatus.ACTIVE,
      flashcard_count: deck.flashcard_count || deck.flashcardCount || 0,
      hierarchy: deck.hierarchy,
      hierarchy_path: deck.hierarchy_path || deck.hierarchyPath,
      created_at: typeof deck.created_at === 'string' ? deck.created_at : deck.created_at?.toISOString?.() || deck.createdAt,
      updated_at: typeof deck.updated_at === 'string' ? deck.updated_at : deck.updated_at?.toISOString?.() || deck.updatedAt,
    };
  }
}

export const deckService = new SupabaseDeckService();


