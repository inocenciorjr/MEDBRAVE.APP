import { SupabaseClient } from '@supabase/supabase-js';
import {
  IDeckRepository,
  Deck,
  DeckCreateData,
  DeckUpdateData,
  DeckFilters,
  DeckVisibility,
  DeckStatus,
  PaginationOptions,
  PaginatedResult,
} from '../../../domain/studyTools/flashcards/repositories/IDeckRepository';
import { AppError } from '../../../shared/errors/AppError';

export class SupabaseDeckRepository implements IDeckRepository {
  constructor(private supabase: SupabaseClient) {}

  async create(data: DeckCreateData): Promise<Deck> {
    const deckData = {
      user_id: data.userId,
      title: data.title,
      description: data.description,
      tags: data.tags || [],
      image_url: data.imageUrl || null,
      visibility: data.visibility || DeckVisibility.PRIVATE,
      status: DeckStatus.ACTIVE,
      flashcard_count: 0,
      is_public: data.isPublic || false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: deck, error } = await this.supabase
      .from('decks')
      .insert(deckData)
      .select()
      .single();

    if (error) {
      throw new AppError(`Erro ao criar deck: ${error.message}`, 500);
    }

    return this.mapToDeck(deck);
  }

  async findById(id: string): Promise<Deck | null> {
    const { data: deck, error } = await this.supabase
      .from('decks')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new AppError(`Erro ao buscar deck: ${error.message}`, 500);
    }

    return this.mapToDeck(deck);
  }

  async update(id: string, data: DeckUpdateData): Promise<Deck> {
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (data.title !== undefined) {
      updateData.title = data.title;
    }
    if (data.description !== undefined) {
      updateData.description = data.description;
    }
    if (data.tags !== undefined) {
      updateData.tags = data.tags;
    }
    if (data.imageUrl !== undefined) {
      updateData.image_url = data.imageUrl;
    }
    if (data.visibility !== undefined) {
      updateData.visibility = data.visibility;
    }
    if (data.status !== undefined) {
      updateData.status = data.status;
    }
    if (data.isPublic !== undefined) {
      updateData.is_public = data.isPublic;
    }

    const { data: deck, error } = await this.supabase
      .from('decks')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new AppError(`Erro ao atualizar deck: ${error.message}`, 500);
    }

    return this.mapToDeck(deck);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase.from('decks').delete().eq('id', id);

    if (error) {
      throw new AppError(`Erro ao deletar deck: ${error.message}`, 500);
    }
  }

  async findAll(
    filters?: DeckFilters,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<Deck>> {
    let query = this.supabase.from('decks').select('*', { count: 'exact' });

    // Apply filters
    if (filters) {
      if (filters.userId) {
        query = query.eq('user_id', filters.userId);
      }
      if (filters.visibility) {
        query = query.eq('visibility', filters.visibility);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.isPublic !== undefined) {
        query = query.eq('is_public', filters.isPublic);
      }
      if (filters.tags && filters.tags.length > 0) {
        query = query.overlaps('tags', filters.tags);
      }
      if (filters.searchTerm) {
        query = query.or(
          `title.ilike.%${filters.searchTerm}%,description.ilike.%${filters.searchTerm}%`,
        );
      }
    }

    // Apply pagination
    const limit = pagination?.limit || 20;
    const page = pagination?.page || 1;
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    // Apply sorting
    query = query.order('created_at', { ascending: false });

    const { data: decks, error, count } = await query;

    if (error) {
      throw new AppError(`Erro ao buscar decks: ${error.message}`, 500);
    }

    return {
      items: decks?.map((deck) => this.mapToDeck(deck)) || [],
      total: count || 0,
      hasMore: offset + limit < (count || 0),
    };
  }

  async findByUser(
    userId: string,
    filters?: DeckFilters,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<Deck>> {
    return this.findAll({ ...filters, userId }, pagination);
  }

  async findPublic(
    filters?: DeckFilters,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<Deck>> {
    return this.findAll({ ...filters, isPublic: true }, pagination);
  }

  async addCollaborator(deckId: string, userId: string): Promise<Deck> {
    // First get current collaborators
    const { data: deck, error: fetchError } = await this.supabase
      .from('decks')
      .select('collaborators')
      .eq('id', deckId)
      .single();

    if (fetchError) {
      throw new AppError(`Erro ao buscar deck: ${fetchError.message}`, 500);
    }

    const currentCollaborators = deck.collaborators || [];
    if (!currentCollaborators.includes(userId)) {
      currentCollaborators.push(userId);
    }

    const { data: updatedDeck, error } = await this.supabase
      .from('decks')
      .update({
        collaborators: currentCollaborators,
        updated_at: new Date().toISOString(),
      })
      .eq('id', deckId)
      .select()
      .single();

    if (error) {
      throw new AppError(
        `Erro ao adicionar colaborador: ${error.message}`,
        500,
      );
    }

    return this.mapToDeck(updatedDeck);
  }

  async removeCollaborator(deckId: string, userId: string): Promise<Deck> {
    // First get current collaborators
    const { data: deck, error: fetchError } = await this.supabase
      .from('decks')
      .select('collaborators')
      .eq('id', deckId)
      .single();

    if (fetchError) {
      throw new AppError(`Erro ao buscar deck: ${fetchError.message}`, 500);
    }

    const currentCollaborators = (deck.collaborators || []).filter(
      (id: string) => id !== userId,
    );

    const { data: updatedDeck, error } = await this.supabase
      .from('decks')
      .update({
        collaborators: currentCollaborators,
        updated_at: new Date().toISOString(),
      })
      .eq('id', deckId)
      .select()
      .single();

    if (error) {
      throw new AppError(`Erro ao remover colaborador: ${error.message}`, 500);
    }

    return this.mapToDeck(updatedDeck);
  }

  async incrementFlashcardCount(deckId: string): Promise<void> {
    const { error } = await this.supabase.rpc(
      'increment_deck_flashcard_count',
      {
        deck_id: deckId,
      },
    );

    if (error) {
      throw new AppError(
        `Erro ao incrementar contagem de flashcards: ${error.message}`,
        500,
      );
    }
  }

  async decrementFlashcardCount(deckId: string): Promise<void> {
    const { error } = await this.supabase.rpc(
      'decrement_deck_flashcard_count',
      {
        deck_id: deckId,
      },
    );

    if (error) {
      throw new AppError(
        `Erro ao decrementar contagem de flashcards: ${error.message}`,
        500,
      );
    }
  }

  async updateLastStudied(deckId: string, date?: Date): Promise<void> {
    const { error } = await this.supabase
      .from('decks')
      .update({
        last_studied: (date || new Date()).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', deckId);

    if (error) {
      throw new AppError(
        `Erro ao atualizar última data de estudo: ${error.message}`,
        500,
      );
    }
  }

  async search(
    query: string,
    filters?: DeckFilters,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<Deck>> {
    return this.findAll({ ...filters, searchTerm: query }, pagination);
  }

  private mapToDeck(data: any): Deck {
    return {
      id: data.id,
      userId: data.user_id,
      title: data.title,
      description: data.description,
      tags: data.tags || [],
      visibility: data.visibility,
      status: data.status,
      flashcardCount: data.flashcard_count,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      lastStudied: data.last_studied ? new Date(data.last_studied) : undefined,
      imageUrl: data.image_url,
      collaborators: data.collaborators || [],
      isPublic: data.is_public,
    };
  }
}


