import { SupabaseClient } from '@supabase/supabase-js';
import {
  Flashcard,
  FlashcardStatus,
  ReviewQuality,
} from '../../../domain/studyTools/flashcards/types/flashcard.types';
 
import {
  IFlashcardRepository,
  PaginationOptions,
  PaginatedResult,
  FlashcardFilters,
  CollectionMetadata,
  DeckWithCards,
  CollectionStats,
  CollectionRating,
  ImportSession,
} from '../../../domain/studyTools/flashcards/repositories/IFlashcardRepository';

export class SupabaseFlashcardRepository implements IFlashcardRepository {
  constructor(private supabase: SupabaseClient) { }

  getSupabaseClient(): SupabaseClient {
    return this.supabase;
  }

  /**
   * Atualiza contadores e updated_at do deck e da collection
   */
  private async updateDeckAndCollectionCounters(deckId: string): Promise<void> {
    try {
      const now = new Date().toISOString();

      // Buscar o deck para obter collection_id
      const { data: deckData } = await this.supabase
        .from('decks')
        .select('collection_id')
        .eq('id', deckId)
        .single();

      // Contar flashcards do deck
      const { count: flashcardCount } = await this.supabase
        .from('flashcards')
        .select('id', { count: 'exact', head: true })
        .eq('deck_id', deckId);

      // Atualizar deck (updated_at é jsonb, não timestamp)
      const { error: updateError } = await this.supabase
        .from('decks')
        .update({
          flashcard_count: flashcardCount || 0,
          updated_at: now, // Supabase converte automaticamente string para jsonb
        })
        .eq('id', deckId);

      if (updateError) {
        console.error('Error updating deck counters:', updateError);
      }

      // Se o deck pertence a uma collection, atualizar a collection também
      if (deckData?.collection_id) {
        await this.updateCollectionCounts(deckData.collection_id);
      }
    } catch (error) {
      console.error('Error updating deck and collection counters:', error);
    }
  }

  async create(
    flashcard: Omit<Flashcard, 'id' | 'created_at' | 'updated_at'>,
  ): Promise<Flashcard> {
    const now = new Date().toISOString();

    // Remover searchable_text pois é gerado automaticamente pelo trigger
    const { searchable_text, ...flashcardWithoutSearch } = flashcard;

    // Buscar o deck para obter user_id e collection_id
    const { data: deckData, error: deckError } = await this.supabase
      .from('decks')
      .select('user_id, collection_id, name')
      .eq('id', flashcard.deck_id)
      .single();

    if (deckError || !deckData) {
      throw new Error(`Failed to find deck: ${deckError?.message || 'Deck not found'}`);
    }

    // Buscar o nome da collection se houver collection_id
    let collectionName = 'default';
    if (deckData.collection_id) {
      const { data: collectionData } = await this.supabase
        .from('collections')
        .select('name')
        .eq('id', deckData.collection_id)
        .single();

      if (collectionData) {
        collectionName = collectionData.name;
      }
    }

    // Contar flashcards existentes no deck para gerar o índice
    const { count } = await this.supabase
      .from('flashcards')
      .select('id', { count: 'exact', head: true })
      .eq('deck_id', flashcard.deck_id);

    const index = (count || 0) + 1;

    // Gerar ID usando idGenerator
    const { generateFlashcardId } = await import('../../../utils/idGenerator');
    const flashcardId = await generateFlashcardId(
      deckData.user_id,
      flashcard.deck_id,
      index,
      {
        collectionName: collectionName,
        nomeItem: deckData.name,
      }
    );

    const flashcardData = {
      id: flashcardId,
      ...flashcardWithoutSearch,
      created_at: now,
      updated_at: now,
    };

    const { data, error } = await this.supabase
      .from('flashcards')
      .insert(flashcardData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create flashcard: ${error.message}`);
    }

    // Atualizar contadores do deck e collection
    await this.updateDeckAndCollectionCounters(flashcard.deck_id);

    return this.mapToFlashcard(data);
  }

  async findById(id: string): Promise<Flashcard | null> {
    const { data, error } = await this.supabase
      .from('flashcards')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to find flashcard: ${error.message}`);
    }

    return this.mapToFlashcard(data);
  }

  async findByIds(ids: string[]): Promise<Flashcard[]> {
    if (ids.length === 0) {
      return [];
    }

    // Se os IDs são nanoids curtos (de fsrs_cards), buscar os content_ids primeiro
    let flashcardIds = ids;
    
    // Verificar se são nanoids curtos (menos de 30 caracteres, sem underscores)
    const areNanoids = ids.every(id => id.length < 30 && !id.includes('_'));
    
    if (areNanoids) {
      console.log('[findByIds] IDs são nanoids, buscando content_ids da fsrs_cards');
      const { data: fsrsData, error: fsrsError } = await this.supabase
        .from('fsrs_cards')
        .select('content_id')
        .in('id', ids);
      
      if (fsrsError) {
        console.error('[findByIds] Erro ao buscar fsrs_cards:', fsrsError);
      } else if (fsrsData && fsrsData.length > 0) {
        flashcardIds = fsrsData.map(item => item.content_id);
        console.log('[findByIds] Content IDs encontrados:', flashcardIds.length);
      }
    }

    const { data, error } = await this.supabase
      .from('flashcards')
      .select('*')
      .in('id', flashcardIds);

    if (error) {
      throw new Error(`Failed to find flashcards: ${error.message}`);
    }

    // Mapear flashcards
    const flashcards = (data || []).map(item => this.mapToFlashcard(item));
    
    // Buscar nomes dos decks únicos
    const uniqueDeckIds = [...new Set(flashcards.map(f => f.deck_id))];
    
    if (uniqueDeckIds.length > 0) {
      const { data: decksData } = await this.supabase
        .from('decks')
        .select('id, name')
        .in('id', uniqueDeckIds);
      
      const deckNamesMap = new Map(
        (decksData || []).map(d => [d.id, d.name])
      );
      
      // Adicionar nomes dos decks aos flashcards
      return flashcards.map(f => ({
        ...f,
        deck_name: deckNamesMap.get(f.deck_id),
      }));
    }
    
    return flashcards;
  }

  async update(id: string, data: Partial<Flashcard>): Promise<Flashcard> {
    const updateData: any = {
      ...data,
      updated_at: new Date().toISOString(),
    };

    const { data: result, error } = await this.supabase
      .from('flashcards')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update flashcard: ${error.message}`);
    }

    // Atualizar contadores do deck e collection
    if (result.deck_id) {
      await this.updateDeckAndCollectionCounters(result.deck_id);
    }

    return this.mapToFlashcard(result);
  }

  async delete(id: string): Promise<void> {
    // Buscar o flashcard para obter o deck_id antes de deletar
    const { data: flashcard } = await this.supabase
      .from('flashcards')
      .select('deck_id')
      .eq('id', id)
      .single();

    const { error } = await this.supabase
      .from('flashcards')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete flashcard: ${error.message}`);
    }

    // Atualizar contadores do deck e collection
    if (flashcard?.deck_id) {
      await this.updateDeckAndCollectionCounters(flashcard.deck_id);
    }
  }

  async findByUser(
    user_id: string,
    filters?: FlashcardFilters,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<Flashcard>> {
    // First, get all deck IDs for the user
    const { data: userDecks, error: decksError } = await this.supabase
      .from('decks')
      .select('id')
      .eq('user_id', user_id);

    if (decksError) {
      throw new Error(`Failed to find user decks: ${decksError.message}`);
    }

    const deck_ids = userDecks?.map(deck => deck.id) || [];

    if (deck_ids.length === 0) {
      return {
        items: [],
        total: 0,
        hasMore: false,
      };
    }

    let query = this.supabase
      .from('flashcards')
      .select('*', { count: 'exact' })
      .in('deck_id', deck_ids);

    if (filters) {
      if (filters.deck_id) {
        query = query.eq('deck_id', filters.deck_id);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.tags && filters.tags.length > 0) {
        query = query.overlaps('tags', filters.tags);
      }
      // Review filtering is now handled by UnifiedReviewService
      if (filters.search_term) {
        // Usar busca full-text com índice GIN (muito mais rápido)
        query = query.textSearch('searchable_text', filters.search_term, {
          type: 'websearch',
          config: 'portuguese'
        });
      }
      // Date-based filtering removed - managed by UnifiedReviewService
    }

    if (pagination) {
      const offset = (pagination.page - 1) * pagination.limit;
      query = query.range(offset, offset + pagination.limit - 1);

      if (pagination.sort_by) {
        const order =
          pagination.sort_order === 'desc'
            ? { ascending: false }
            : { ascending: true };
        // Map camelCase to snake_case to match Supabase schema
        const sortMap: Record<string, string> = {
          createdAt: 'created_at',
          updatedAt: 'updated_at',
        };
        const allowed = new Set([
          'id',
          'deck_id',
          'status',
          'created_at',
          'updated_at',
        ]);
        let sortColumn = sortMap[pagination.sort_by] || pagination.sort_by;
        if (!allowed.has(sortColumn)) {
          sortColumn = 'created_at';
        }
        query = query.order(sortColumn, order);
      }
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to find flashcards: ${error.message}`);
    }

    const flashcards = data?.map((item) => this.mapToFlashcard(item)) || [];
    const total = count || 0;
    const hasMore = pagination
      ? pagination.page * pagination.limit < total
      : false;

    return {
      items: flashcards,
      total,
      hasMore,
    };
  }

  async search(
    query: string,
    user_id: string,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<Flashcard>> {
    return this.findByUser(user_id, { search_term: query }, pagination);
  }

  async updateStatus(id: string, status: FlashcardStatus): Promise<Flashcard> {
    return this.update(id, { status });
  }

  async recordReview(
    id: string,
    reviewQuality: ReviewQuality,
    _reviewTimeMs?: number,
  ): Promise<Flashcard> {
    try {
      console.log('[SupabaseFlashcardRepository] recordReview - Buscando flashcard:', id);
      
      // Buscar o flashcard para obter o deck_id
      const { data: flashcardData, error: flashcardError } = await this.supabase
        .from('flashcards')
        .select('deck_id')
        .eq('id', id)
        .single();

      console.log('[SupabaseFlashcardRepository] Flashcard encontrado:', { flashcardData, flashcardError });

      if (flashcardError || !flashcardData) {
        throw new Error(`Flashcard não encontrado: ${flashcardError?.message || 'Dados não retornados'}`);
      }

      // Buscar o deck para obter o user_id
      const { data: deckData, error: deckError } = await this.supabase
        .from('decks')
        .select('user_id')
        .eq('id', flashcardData.deck_id)
        .single();

      console.log('[SupabaseFlashcardRepository] Deck encontrado:', { deckData, deckError });

      if (deckError || !deckData) {
        throw new Error(`Deck não encontrado: ${deckError?.message || 'Dados não retornados'}`);
      }

      const user_id = deckData.user_id;
      if (!user_id) {
        throw new Error('Não foi possível obter o user_id do deck');
      }

      // Converter ReviewQuality para grade FSRS (0-3)
      const qualityMap = {
        [ReviewQuality.AGAIN]: 0,  // Again = 0 (falhou)
        [ReviewQuality.HARD]: 1,   // Hard = 1 (difícil)
        [ReviewQuality.GOOD]: 2,   // Good = 2 (bom)
        [ReviewQuality.EASY]: 3,   // Easy = 3 (fácil)
      };
      const quality = qualityMap[reviewQuality];
      
      console.log('[SupabaseFlashcardRepository] Quality mapping:', { reviewQuality, quality });

      // Registrar revisão no sistema unificado com dados FSRS
      // NÃO atualizar planner porque é estudo na página de flashcards, não revisão ativa
      const { SupabaseUnifiedReviewService } = await import('./SupabaseUnifiedReviewService');
      const unifiedReviewService = new SupabaseUnifiedReviewService(this.supabase);

      await unifiedReviewService.recordFlashcardReview(
        user_id,
        id,
        quality,
        flashcardData.deck_id
      );

      // Buscar o flashcard atualizado
      const { data, error } = await this.supabase
        .from('flashcards')
        .select()
        .eq('id', id)
        .single();

      if (error) {
        throw new Error('Erro ao buscar flashcard atualizado');
      }

      return this.mapToFlashcard(data);
    } catch (error) {
      throw new Error(`Erro ao registrar revisão do flashcard: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  async findDueForReview(
    user_id: string,
    deck_id?: string,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<Flashcard>> {
    // Review scheduling is now handled by UnifiedReviewService
    // This method returns all flashcards for the user/deck
    const filters: FlashcardFilters = {};

    if (deck_id) {
      filters.deck_id = deck_id;
    }

    return this.findByUser(user_id, filters, pagination);
  }

  async findByTags(
    user_id: string,
    tags: string[],
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<Flashcard>> {
    return this.findByUser(user_id, { tags }, pagination);
  }

  async toggleArchive(id: string): Promise<Flashcard> {
    const flashcard = await this.findById(id);
    if (!flashcard) {
      throw new Error('Flashcard not found');
    }

    const newStatus =
      flashcard.status === FlashcardStatus.ARCHIVED
        ? FlashcardStatus.REVIEWING
        : FlashcardStatus.ARCHIVED;

    return this.updateStatus(id, newStatus);
  }

  // Collection and Deck methods
  async getCollectionsMetadata(
    user_id: string,
    _filters?: any,
    _pagination?: PaginationOptions,
  ): Promise<CollectionMetadata[]> {
    try {
      

      // 1. Buscar collections próprias do usuário
      const { data: ownCollections, error: ownError } = await this.supabase
        .from('collections')
        .select('*')
        .eq('user_id', user_id)
        .order('updated_at', { ascending: false });

      if (ownError) {
        throw new Error(`Erro ao buscar coleções próprias: ${ownError.message}`);
      }

      // 2. Buscar collections importadas (referências)
      const { data: importedRefs, error: importError } = await this.supabase
        .from('collection_imports')
        .select('collection_id, imported_at')
        .eq('user_id', user_id);

      if (importError) {
        console.error('Erro ao buscar imports:', importError);
      }

      // 3. Buscar dados das collections importadas
      let importedCollections: any[] = [];
      if (importedRefs && importedRefs.length > 0) {
        const importedIds = importedRefs.map(ref => ref.collection_id);
        const { data: imported } = await this.supabase
          .from('collections')
          .select('*')
          .in('id', importedIds);

        if (imported) {
          // Marcar como importadas
          importedCollections = imported.map(col => ({
            ...col,
            is_imported: true,
          }));
        }
      }

      // 4. Combinar próprias e importadas
      const allCollections = [...(ownCollections || []), ...importedCollections];

      if (allCollections.length === 0) {
        return [];
      }

      // Mapear para o formato esperado
      const result = allCollections.map((col: any) => ({
        id: col.id,
        name: col.name,
        deck_count: col.deck_count || 0,
        card_count: col.card_count || 0,
        updated_at: col.updated_at,
        created_at: col.created_at,
        thumbnail_url: col.thumbnail_url || col.image_url,
        is_imported: col.is_imported || false,
        is_public: col.is_public || false,
        is_official: col.is_official || false,
      }));

      // Logs removidos para reduzir verbosidade
      

      return result;
    } catch (error) {
      console.error('Erro ao buscar metadados das coleções:', error);
      throw error;
    }
  }

  async getCollectionDecks(
    user_id: string,
    collectionName: string,
  ): Promise<DeckWithCards[]> {
    

    try {
      // Primeiro, verificar se é uma coleção importada da comunidade
      // Buscar na user_library para ver se o usuário tem decks desta coleção
      const { data: libraryDecks, error: libraryError } = await this.supabase
        .from('user_library')
        .select(`
          deck_id,
          decks!inner(*)
        `)
        .eq('user_id', user_id)
        .eq('decks.collection', collectionName);

      if (libraryError) {
        console.error('Erro ao buscar na biblioteca:', libraryError);
      }

      let decks: any[] = [];

      // Se encontrou decks na biblioteca, usar esses
      if (libraryDecks && libraryDecks.length > 0) {
        console.log(`📚 [getCollectionDecks] Encontrados ${libraryDecks.length} decks na biblioteca do usuário`);
        decks = libraryDecks.map((entry: any) => entry.decks);
      } else {
        // Se não encontrou na biblioteca, buscar decks próprios do usuário
        console.log(`📁 [getCollectionDecks] Buscando decks próprios do usuário`);
        const { data: ownDecks, error: decksError } = await this.supabase
          .from('decks')
          .select('*')
          .eq('user_id', user_id)
          .eq('collection', collectionName)
          .order('updated_at', { ascending: false });

        if (decksError) {
          throw new Error(`Erro ao buscar decks da coleção: ${decksError.message}`);
        }

        decks = ownDecks || [];
      }

      if (!decks || decks.length === 0) {
        console.log(`⚠️ [getCollectionDecks] Nenhum deck encontrado para a coleção "${collectionName}"`);
        return [];
      }

      // Montar decks SEM cards (cards vazios para listagem)
      const decksWithCards: DeckWithCards[] = decks.map(deck => ({
        id: deck.id,
        name: deck.name,
        description: deck.description,
        hierarchy: deck.hierarchy,
        user_id: deck.user_id,
        is_public: deck.is_public || false,
        card_count: deck.flashcard_count || 0,
        flashcard_count: deck.flashcard_count || 0,
        collection: deck.collection,
        tags: deck.tags || [],
        created_at: deck.created_at,
        updated_at: deck.updated_at,
        image_url: deck.image_url || null,
        is_imported: deck.is_imported || false,
        cards: [], // 🚀 Vazio para listagem - cards são carregados sob demanda
      }));

      
      

      return decksWithCards;
    } catch (error) {
      console.error('Erro ao buscar decks da coleção:', error);
      throw error;
    }
  }

  async updateDeckPublicStatus(
    deck_id: string,
    user_id: string,
    is_public: boolean,
  ): Promise<DeckWithCards> {
    // Update the deck's public status
    const { error: updateError } = await this.supabase
      .from('decks')
      .update({
        is_public: is_public,
        updated_at: new Date().toISOString()
      })
      .eq('id', deck_id)
      .eq('user_id', user_id)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update deck public status: ${updateError.message}`);
    }

    // Return the updated deck with cards
    return this.getDeckById(deck_id, user_id);
  }

  async deleteDeck(deck_id: string, user_id: string): Promise<void> {
    // First verify the deck belongs to the user and get collection_id
    const { data: deck, error: deckError } = await this.supabase
      .from('decks')
      .select('id, collection_id')
      .eq('id', deck_id)
      .eq('user_id', user_id)
      .single();

    if (deckError) {
      if (deckError.code === 'PGRST116') {
        throw new Error('Deck not found or access denied');
      }
      throw new Error(`Failed to verify deck ownership: ${deckError.message}`);
    }

    const collectionId = deck.collection_id;

    // Delete all flashcards in the deck first
    const { error: cardsError } = await this.supabase
      .from('flashcards')
      .delete()
      .eq('deck_id', deck_id);

    if (cardsError) {
      throw new Error(`Failed to delete flashcards: ${cardsError.message}`);
    }

    // Delete the deck
    const { error: deleteError } = await this.supabase
      .from('decks')
      .delete()
      .eq('id', deck_id)
      .eq('user_id', user_id);

    if (deleteError) {
      throw new Error(`Failed to delete deck: ${deleteError.message}`);
    }

    // Atualizar contadores da collection
    if (collectionId) {
      await this.updateCollectionCounts(collectionId);
    }
  }

  /**
   * Verifica se o usuário pode EDITAR o deck (deve ser o dono)
   */
  async canEditDeck(deck_id: string, user_id: string): Promise<boolean> {
    const { data: deck, error } = await this.supabase
      .from('decks')
      .select('user_id')
      .eq('id', deck_id)
      .single();

    if (error || !deck) {
      return false;
    }

    return deck.user_id === user_id;
  }

  async getDeckById(deck_id: string, user_id: string): Promise<DeckWithCards> {
    // First, get the deck and verify access (either owned by user or public)
    const { data: deck, error: deckError } = await this.supabase
      .from('decks')
      .select('*')
      .eq('id', deck_id)
      .or(`user_id.eq.${user_id},is_public.eq.true`)
      .single();

    if (deckError) {
      if (deckError.code === 'PGRST116') {
        throw new Error('Deck not found or access denied');
      }
      throw new Error(`Failed to find deck: ${deckError.message}`);
    }

    // Get all flashcards for this deck
    const { data: flashcards, error: cardsError } = await this.supabase
      .from('flashcards')
      .select('*')
      .eq('deck_id', deck_id)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true }); // Ordem secundária por ID para consistência

    if (cardsError) {
      throw new Error(`Failed to find flashcards: ${cardsError.message}`);
    }

    // Map the deck data to the expected format
    const deckWithCards: DeckWithCards = {
      id: deck.id,
      name: deck.name,
      description: deck.description || '',
      user_id: deck.user_id,
      tags: deck.tags || [],
      image_url: deck.image_url,
      hierarchy: deck.hierarchy,
      status: deck.status,
      is_public: deck.is_public || false,
      created_at: deck.created_at,
      updated_at: deck.updated_at,
      card_count: flashcards?.length || 0,
      last_reviewed: deck.last_reviewed_at,
      due_cards: 0, // TODO: calcular due cards
      cards: flashcards?.map(card => this.mapToFlashcard(card)) || []
    };

    return deckWithCards;
  }

  async getAllUserDecks(
    _user_id: string,
    _limit?: number,
  ): Promise<DeckWithCards[]> {
    // TODO: Implement user decks retrieval
    return [];
  }

  async getUserLibrary(
    _user_id: string,
    _filters?: any,
    _pagination?: PaginationOptions,
  ): Promise<CollectionMetadata[]> {
    // TODO: Implement user library retrieval
    return [];
  }

  async getCollectionById(
    _collectionId: string,
  ): Promise<CollectionMetadata | null> {
    // TODO: Implement collection retrieval by ID
    return null;
  }

  async isInUserLibrary(
    _user_id: string,
    _collectionId: string,
  ): Promise<boolean> {
    // TODO: Implement library check
    return false;
  }

  /**
   * Adiciona todos os decks de uma coleção à biblioteca do usuário (por referência)
   */
  async addToLibrary(user_id: string, collectionName: string): Promise<void> {
    try {
      // Buscar todos os decks públicos da coleção
      const { data: decks, error: decksError } = await this.supabase
        .from('decks')
        .select('id')
        .eq('collection', collectionName)
        .eq('is_public', true);

      if (decksError) {
        throw new Error(`Failed to fetch collection decks: ${decksError.message}`);
      }

      if (!decks || decks.length === 0) {
        throw new Error('Collection not found or has no public decks');
      }

      // Adicionar cada deck à biblioteca (ignorar duplicatas)
      const libraryEntries = decks.map(deck => ({
        user_id,
        deck_id: deck.id
      }));

      const { error: insertError } = await this.supabase
        .from('user_library')
        .insert(libraryEntries)
        .select();

      // Ignorar erro de duplicata (constraint violation)
      if (insertError && !insertError.message.includes('duplicate')) {
        throw new Error(`Failed to add to library: ${insertError.message}`);
      }

      console.log(`✅ [addToLibrary] ${decks.length} decks adicionados à biblioteca do usuário ${user_id}`);
    } catch (error) {
      console.error('Error adding to library:', error);
      throw error;
    }
  }

  async incrementDownloads(_collectionId: string): Promise<void> {
    // Não é mais necessário - usamos collection_imports
    console.log('[incrementDownloads] Deprecated - using collection_imports instead');
  }

  /**
   * Remove todos os decks de uma coleção da biblioteca do usuário
   */
  async removeFromLibrary(user_id: string, collectionName: string): Promise<void> {
    try {
      // Buscar IDs dos decks da coleção
      const { data: decks, error: decksError } = await this.supabase
        .from('decks')
        .select('id')
        .eq('collection', collectionName);

      if (decksError) {
        throw new Error(`Failed to fetch collection decks: ${decksError.message}`);
      }

      if (!decks || decks.length === 0) {
        return; // Nada para remover
      }

      const deckIds = decks.map(d => d.id);

      // Remover da biblioteca
      const { error: deleteError } = await this.supabase
        .from('user_library')
        .delete()
        .eq('user_id', user_id)
        .in('deck_id', deckIds);

      if (deleteError) {
        throw new Error(`Failed to remove from library: ${deleteError.message}`);
      }

      // 🔥 CORRIGIDO: Remover também da tabela collection_imports
      const { error: importError } = await this.supabase
        .from('collection_imports')
        .delete()
        .eq('user_id', user_id)
        .eq('collection_name', collectionName);

      if (importError) {
        console.error('⚠️ [removeFromLibrary] Erro ao remover de collection_imports:', importError);
        // Não lançar erro aqui para não quebrar o fluxo principal
      }

      console.log(`✅ [removeFromLibrary] ${decks.length} decks removidos da biblioteca do usuário ${user_id}`);
    } catch (error) {
      console.error('Error removing from library:', error);
      throw error;
    }
  }

  async isCollectionLiked(
    _user_id: string,
    _collectionId: string,
  ): Promise<boolean> {
    // TODO: Implement collection like check
    return false;
  }

  async unlikeCollection(_user_id: string, _collectionId: string): Promise<void> {
    // TODO: Implement unlike collection
  }

  async likeCollection(_user_id: string, _collectionId: string): Promise<void> {
    // TODO: Implement like collection
  }

  async getCollectionStats(_collectionId: string): Promise<CollectionStats> {
    // TODO: Implement collection stats
    return {
      likes: 0,
      downloads: 0,
      avg_rating: 0,
      total_ratings: 0,
    };
  }

  async rateCollection(
    _user_id: string,
    _collectionId: string,
    _rating: CollectionRating,
  ): Promise<void> {
    // TODO: Implement collection rating
  }

  async processImportBatch(
    _sessionId: string,
    flashcards: any[],
    deck_id: string,
  ): Promise<void> {
    try {
      const flashcardsToInsert = flashcards.map(flashcard => ({
        ...flashcard,
        deck_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      const { error } = await this.supabase
        .from('flashcards')
        .insert(flashcardsToInsert);

      if (error) {
        throw new Error(`Failed to insert flashcards: ${error.message}`);
      }
    } catch (error) {
      throw new Error(`Failed to process import batch: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createImportSession(
    user_id: string,
    config: any,
    metadata: any,
  ): Promise<ImportSession> {
    const sessionData = {
      id: crypto.randomUUID(),
      user_id,
      file_name: metadata.file_name,
      status: 'PENDING',
      total_cards: metadata.total || 0,
      processed_cards: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata,
      config,
      progress: 0,
      errors: []
    };

    const { data, error } = await this.supabase
      .from('import_sessions')
      .insert(sessionData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create import session: ${error.message}`);
    }

    return {
      id: data.id,
      user_id: data.user_id,
      status: data.status as any,
      progress: data.progress,
      total: data.total_cards,
      errors: data.errors || [],
      metadata: data.metadata,
      config: data.config,
      started_at: data.created_at,
      completed_at: data.updated_at,
      estimated_duration: 0,
      result_deck_id: undefined,
    };
  }

  async getImportSession(_sessionId: string): Promise<ImportSession> {
    // TODO: Implement import session retrieval
    throw new Error('Method not implemented.');
  }

  async updateImportStatus(
    sessionId: string,
    status: ImportSession['status'],
    progress?: number,
    errors?: string[],
    result_deck_id?: string,
  ): Promise<ImportSession> {
    const updateData: any = { status };
    if (progress !== undefined) updateData.progress = progress;
    if (errors !== undefined) updateData.errors = errors;
    if (result_deck_id !== undefined) updateData.result_deck_id = result_deck_id;
    if (status === 'COMPLETED' || status === 'FAILED') {
      updateData.completed_at = new Date().toISOString();
    }

    const { data, error } = await this.supabase
      .from('import_sessions')
      .update(updateData)
      .eq('id', sessionId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update import status: ${error.message}`);
    }

    return {
      id: data.id,
      user_id: data.user_id,
      status: data.status,
      progress: data.progress,
      total: data.total,
      errors: data.errors || [],
      metadata: data.metadata || {},
      config: data.config || {},
      started_at: data.created_at,
      completed_at: data.completed_at,
      estimated_duration: data.estimated_duration,
      result_deck_id: data.result_deck_id,
    };
  }

  /**
   * Busca coleções públicas da comunidade
   */
  async getPublicCollections(params: {
    search?: string;
    sortBy?: string;
    limit: number;
    offset: number;
  }): Promise<{ data: CollectionMetadata[]; total: number }> {
    try {
      console.log('🔍 [getPublicCollections] Iniciando busca...', params);

      // Buscar coleções públicas diretamente da tabela collections
      let query = this.supabase
        .from('collections')
        .select('id, name, deck_count, card_count, updated_at, user_id', { count: 'exact' })
        .eq('is_public', true);

      // Aplicar filtro de busca se fornecido
      if (params.search) {
        query = query.ilike('name', `%${params.search}%`);
      }

      // Aplicar ordenação
      if (params.sortBy === 'likes') {
        query = query.order('deck_count', { ascending: false });
      } else if (params.sortBy === 'imports') {
        query = query.order('deck_count', { ascending: false });
      } else {
        // recent (padrão)
        query = query.order('updated_at', { ascending: false });
      }

      const { data: collections, error, count } = await query;

      console.log('📊 [getPublicCollections] Resultado da query:', {
        collectionsCount: collections?.length || 0,
        error: error?.message,
        count
      });

      if (error) {
        throw new Error(`Failed to fetch public collections: ${error.message}`);
      }

      if (!collections || collections.length === 0) {
        console.log('⚠️ [getPublicCollections] Nenhuma coleção pública encontrada');
        return { data: [], total: 0 };
      }

      // Aplicar paginação
      const paginatedCollections = collections.slice(params.offset, params.offset + params.limit);

      return {
        data: paginatedCollections.map((col: any) => ({
          id: col.id,
          name: col.name,
          deck_count: col.deck_count || 0,
          card_count: col.card_count || 0,
          updated_at: col.updated_at,
          user_id: col.user_id,
        })),
        total: count || 0,
      };
    } catch (error) {
      console.error('Error fetching public collections:', error);
      throw error;
    }
  }

  /**
   * Busca detalhes de uma coleção pública específica
   */
  async getPublicCollectionDetails(collectionName: string): Promise<any | null> {
    try {
      console.log('🔍 [getPublicCollectionDetails] Buscando coleção:', collectionName);

      // Primeiro, buscar TODOS os decks com esse nome de coleção (públicos e privados) para debug
      const { data: allDecks } = await this.supabase
        .from('decks')
        .select('id, name, collection, is_public')
        .eq('collection', collectionName);

      console.log('📊 [getPublicCollectionDetails] Decks encontrados (todos):', {
        total: allDecks?.length || 0,
        decks: allDecks
      });

      // Buscar todos os decks públicos da coleção
      const { data: decks, error } = await this.supabase
        .from('decks')
        .select('*')
        .eq('collection', collectionName)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      console.log('📊 [getPublicCollectionDetails] Decks públicos encontrados:', {
        total: decks?.length || 0,
        error: error?.message
      });

      if (error) {
        console.error('❌ [getPublicCollectionDetails] Erro ao buscar decks:', error);
        throw new Error(`Failed to fetch collection decks: ${error.message}`);
      }

      if (!decks || decks.length === 0) {
        console.log('⚠️ [getPublicCollectionDetails] Coleção não encontrada ou não é pública');
        console.log('💡 Dica: Verifique se os decks desta coleção estão marcados como is_public=true');
        return null;
      }

      // Buscar informações do autor
      const { data: userData } = await this.supabase
        .from('users')
        .select('display_name, username_slug, avatar_url')
        .eq('id', decks[0].user_id)
        .single();

      // Buscar contagem de likes usando collection_id
      const likesCount = 0;
      const importsCount = 0;

      // Calcular total de cards
      const deckIds = decks.map(d => d.id);
      const { count: totalCards } = await this.supabase
        .from('flashcards')
        .select('id', { count: 'exact', head: true })
        .in('deck_id', deckIds);

      // Determinar se está "em alta"
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentActivity = 0;

      // Mapear decks para o formato esperado pelo frontend
      const mappedDecks = decks.map(deck => ({
        id: deck.id,
        name: deck.name,
        description: deck.description,
        institution: deck.institution || '',
        tags: deck.tags || [],
        totalCards: deck.flashcard_count || 0,
        studiedCards: 0, // TODO: Buscar do progresso do usuário
        reviewCards: 0,
        newCards: deck.flashcard_count || 0,
        isAdded: false, // TODO: Verificar se usuário já adicionou
        area: deck.area || '',
        priority: deck.priority || 0,
        created_at: deck.created_at,
        updated_at: deck.updated_at
      }));

      return {
        id: collectionName.toLowerCase().replace(/\s+/g, '-'),
        name: collectionName,
        description: decks[0].description || '',
        thumbnail_url: decks[0].image_url || null,
        author_name: userData?.display_name || userData?.username_slug || 'Usuário',
        author_id: decks[0].user_id,
        author_avatar: userData?.avatar_url || null,
        deck_count: decks.length,
        card_count: totalCards || 0,
        likes: likesCount || 0,
        imports: importsCount || 0,
        is_hot: (recentActivity || 0) >= 5,
        created_at: decks[0].created_at,
        updated_at: decks[0].updated_at,
        decks: mappedDecks
      };
    } catch (error) {
      console.error('Error fetching public collection details:', error);
      throw error;
    }
  }

  // ==================== NOVOS MÉTODOS PARA COLLECTIONS COM ID ÚNICO ====================

  /**
   * Cria uma nova coleção com ID único
   */
  async createCollection(data: {
    id: string;
    name: string;
    description?: string;
    user_id: string;
    is_public?: boolean;
    is_imported?: boolean;
    thumbnail_url?: string;
  }): Promise<any> {
    const now = new Date().toISOString();

    const collectionData = {
      id: data.id,
      name: data.name,
      title: data.name,
      description: data.description || '',
      owner_id: data.user_id,
      user_id: data.user_id,
      is_public: data.is_public || false,
      is_official: false,
      is_imported: data.is_imported || false,
      thumbnail_url: data.thumbnail_url || null,
      image_url: data.thumbnail_url || null,
      deck_count: 0,
      card_count: 0,
      created_at: now,
      updated_at: now,
    };

    const { data: result, error } = await this.supabase
      .from('collections')
      .insert(collectionData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create collection: ${error.message}`);
    }

    return result;
  }

  /**
   * Busca uma coleção por ID único
   */
  async getCollectionByUniqueId(collectionId: string): Promise<any | null> {
    const { data, error } = await this.supabase
      .from('collections')
      .select('*')
      .eq('id', collectionId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch collection: ${error.message}`);
    }

    return data;
  }

  /**
   * Verifica se usuário tem acesso à coleção (é dono ou coleção é pública)
   */
  async canAccessCollection(collectionId: string, userId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('collections')
      .select('user_id, is_public')
      .eq('id', collectionId)
      .single();

    if (error || !data) {
      return false;
    }

    // Usuário é dono ou coleção é pública
    return data.user_id === userId || data.is_public === true;
  }

  /**
   * Busca decks de uma coleção por ID único
   */
  async getDecksByCollectionId(collectionId: string, userId: string): Promise<DeckWithCards[]> {
    // Verificar acesso
    const hasAccess = await this.canAccessCollection(collectionId, userId);
    if (!hasAccess) {
      throw new Error('Access denied to this collection');
    }

    // Buscar decks
    const { data: decks, error } = await this.supabase
      .from('decks')
      .select('*')
      .eq('collection_id', collectionId)
      .order('updated_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch decks: ${error.message}`);
    }

    if (!decks || decks.length === 0) {
      return [];
    }

    // Mapear para DeckWithCards (sem cards para listagem)
    const decksWithCards: DeckWithCards[] = decks.map(deck => ({
      id: deck.id,
      name: deck.name,
      description: deck.description,
      hierarchy: deck.hierarchy,
      user_id: deck.user_id,
      is_public: deck.is_public || false,
      card_count: deck.flashcard_count || 0,
      flashcard_count: deck.flashcard_count || 0,
      collection: deck.collection,
      tags: deck.tags || [],
      created_at: deck.created_at,
      updated_at: deck.updated_at,
      image_url: deck.image_url || null,
      is_imported: deck.is_imported || false,
      cards: [],
    }));

    return decksWithCards;
  }

  /**
   * Adiciona coleção à biblioteca do usuário (por ID único)
   */
  async addCollectionToLibrary(userId: string, collectionId: string): Promise<void> {
    console.log('🔧 [addCollectionToLibrary] userId:', userId);
    console.log('🔧 [addCollectionToLibrary] collectionId:', collectionId);

    // Verificar se coleção existe e é pública
    const collection = await this.getCollectionByUniqueId(collectionId);

    console.log('🔧 [addCollectionToLibrary] collection found:', !!collection);
    if (collection) {
      console.log('🔧 [addCollectionToLibrary] collection.id:', collection.id);
      console.log('🔧 [addCollectionToLibrary] collection.name:', collection.name);
      console.log('🔧 [addCollectionToLibrary] collection.user_id:', collection.user_id);
      console.log('🔧 [addCollectionToLibrary] collection.is_public:', collection.is_public);
    }

    if (!collection) {
      throw new Error('Collection not found');
    }

    // Verificar se o usuário está tentando adicionar sua própria coleção
    if (collection.user_id === userId) {
      throw new Error('Cannot add your own collection to library');
    }

    if (!collection.is_public) {
      throw new Error('Access denied: Collection is private');
    }

    // Registrar import na tabela collection_imports
    const { error: importError } = await this.supabase
      .from('collection_imports')
      .insert({
        user_id: userId,
        collection_id: collectionId,
        imported_at: new Date().toISOString(),
      });

    // Ignorar erro de duplicata
    if (importError && !importError.message.includes('duplicate')) {
      throw new Error(`Failed to add collection to library: ${importError.message}`);
    }

    console.log(`✅ [addCollectionToLibrary] Coleção ${collectionId} adicionada à biblioteca do usuário ${userId}`);
  }

  /**
   * Remove coleção da biblioteca do usuário (por ID único)
   */
  async removeCollectionFromLibrary(userId: string, collectionId: string): Promise<void> {
    // Remover de collection_imports (apenas referência)
    const { error: importError } = await this.supabase
      .from('collection_imports')
      .delete()
      .eq('user_id', userId)
      .eq('collection_id', collectionId);

    if (importError) {
      throw new Error(`Failed to remove from library: ${importError.message}`);
    }

    console.log(`✅ [removeCollectionFromLibrary] Coleção ${collectionId} removida da biblioteca do usuário ${userId}`);

    console.log(`✅ [removeCollectionFromLibrary] Coleção ${collectionId} removida da biblioteca do usuário ${userId}`);
  }

  /**
   * Verifica se coleção está na biblioteca do usuário
   */
  async isCollectionInLibrary(userId: string, collectionId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('user_library')
      .select('id')
      .eq('user_id', userId)
      .eq('collection_id', collectionId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking library:', error);
      return false;
    }

    return !!data;
  }

  /**
   * Atualiza contadores de uma coleção (deck_count e card_count)
   */
  async updateCollectionCounts(collectionId: string): Promise<void> {
    // Contar decks
    const { count: deckCount } = await this.supabase
      .from('decks')
      .select('id', { count: 'exact', head: true })
      .eq('collection_id', collectionId);

    // Buscar IDs dos decks
    const { data: decks } = await this.supabase
      .from('decks')
      .select('id')
      .eq('collection_id', collectionId);

    let cardCount = 0;
    if (decks && decks.length > 0) {
      const deckIds = decks.map(d => d.id);
      const { count } = await this.supabase
        .from('flashcards')
        .select('id', { count: 'exact', head: true })
        .in('deck_id', deckIds);
      cardCount = count || 0;
    }

    // Atualizar coleção
    const { error } = await this.supabase
      .from('collections')
      .update({
        deck_count: deckCount || 0,
        card_count: cardCount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', collectionId);

    if (error) {
      console.error('Error updating collection counts:', error);
    }
  }

  /**
   * Atualiza informações de uma coleção
   */
  async updateCollection(collectionId: string, userId: string, data: {
    name?: string;
    description?: string;
    is_public?: boolean;
    thumbnail_url?: string;
  }): Promise<any> {
    // Verificar se usuário é dono
    const collection = await this.getCollectionByUniqueId(collectionId);
    if (!collection || collection.user_id !== userId) {
      throw new Error('Access denied: You are not the owner of this collection');
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (data.name) {
      updateData.name = data.name;
      updateData.title = data.name;
    }
    if (data.description !== undefined) {
      updateData.description = data.description;
    }
    if (data.is_public !== undefined) {
      updateData.is_public = data.is_public;
    }
    if (data.thumbnail_url !== undefined) {
      updateData.thumbnail_url = data.thumbnail_url;
      updateData.image_url = data.thumbnail_url;
    }

    const { data: result, error } = await this.supabase
      .from('collections')
      .update(updateData)
      .eq('id', collectionId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update collection: ${error.message}`);
    }

    return result;
  }

  /**
   * Deleta uma coleção e todos os seus decks e flashcards
   */
  async deleteCollection(collectionId: string, userId: string): Promise<void> {
    // Verificar se usuário é dono
    const collection = await this.getCollectionByUniqueId(collectionId);
    if (!collection || collection.user_id !== userId) {
      throw new Error('Access denied: You are not the owner of this collection');
    }

    // Buscar todos os decks da coleção
    const { data: decks } = await this.supabase
      .from('decks')
      .select('id')
      .eq('collection_id', collectionId);

    if (decks && decks.length > 0) {
      const deckIds = decks.map(d => d.id);

      // ✅ BUSCAR FLASHCARDS ANTES DE DELETAR para extrair URLs de mídia
      console.log(`🔍 [DELETE-COLLECTION] Buscando flashcards dos decks:`, deckIds);
      
      const { data: flashcards } = await this.supabase
        .from('flashcards')
        .select('front_content, back_content')
        .in('deck_id', deckIds);

      // ✅ DELETAR MÍDIAS DO R2
      let mediaFolder: string | null = null;
      
      if (flashcards && flashcards.length > 0) {
        const urlRegex = /https?:\/\/[^\s"'<>]+\.(jpg|jpeg|png|gif|webp|mp3|mp4|wav|ogg)/i;
        
        console.log(`🔍 [DELETE-COLLECTION] Procurando mídia em ${flashcards.length} flashcards...`);
        
        for (const flashcard of flashcards) {
          const content = `${flashcard.front_content || ''} ${flashcard.back_content || ''}`;
          const match = content.match(urlRegex);
          const mediaUrl = match ? match[0] : null;

          if (mediaUrl) {
            console.log(`✅ [DELETE-COLLECTION] URL de mídia encontrada: ${mediaUrl}`);
            
            try {
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

      // Deletar mídia do R2 se encontrou diretório
      if (mediaFolder) {
        try {
          const { r2Service } = require('../../../services/r2Service');
          
          console.log(`🗑️ [DELETE-COLLECTION] Deletando diretório: ${mediaFolder}/`);
          
          // Listar TODOS os arquivos do diretório
          const allFiles = await r2Service.listAllFiles(mediaFolder);
          
          console.log(`📊 [DELETE-COLLECTION] Total de ${allFiles.length} arquivos encontrados`);
          
          if (allFiles.length > 0) {
            let deletedMediaCount = 0;
            let totalErrors = 0;
            const BATCH_SIZE = 100;
            
            for (let i = 0; i < allFiles.length; i += BATCH_SIZE) {
              const batch = allFiles.slice(i, i + BATCH_SIZE);
              const fileKeys = batch.map((file: any) => file.key);
              
              console.log(`🗑️ [DELETE-COLLECTION] Deletando batch ${Math.floor(i / BATCH_SIZE) + 1}: ${fileKeys.length} arquivos...`);
              
              const result = await r2Service.deleteFiles(fileKeys);
              
              deletedMediaCount += result.deleted.length;
              totalErrors += result.errors.length;
              
              if (result.errors.length > 0) {
                console.error(`❌ [DELETE-COLLECTION] ${result.errors.length} erros no batch:`, result.errors.slice(0, 5));
              }
              
              console.log(`✅ [DELETE-COLLECTION] Progresso: ${deletedMediaCount}/${allFiles.length} arquivos deletados`);
            }
            
            console.log(`✅ [DELETE-COLLECTION] ${deletedMediaCount} arquivos deletados do diretório ${mediaFolder}/ (${totalErrors} erros)`);
          }
        } catch (r2Error) {
          console.error('❌ [DELETE-COLLECTION] Erro ao deletar mídia do R2:', r2Error);
        }
      } else {
        console.log(`ℹ️ [DELETE-COLLECTION] Nenhum diretório de mídia identificado para esta coleção`);
      }

      // Deletar todos os flashcards dos decks
      const { error: cardsError } = await this.supabase
        .from('flashcards')
        .delete()
        .in('deck_id', deckIds);

      if (cardsError) {
        throw new Error(`Failed to delete flashcards: ${cardsError.message}`);
      }

      // Deletar todos os decks
      const { error: decksError } = await this.supabase
        .from('decks')
        .delete()
        .eq('collection_id', collectionId);

      if (decksError) {
        throw new Error(`Failed to delete decks: ${decksError.message}`);
      }
    }

    // Deletar a coleção
    const { error: collectionError } = await this.supabase
      .from('collections')
      .delete()
      .eq('id', collectionId);

    if (collectionError) {
      throw new Error(`Failed to delete collection: ${collectionError.message}`);
    }

    console.log(`✅ [deleteCollection] Coleção ${collectionId} deletada com sucesso`);
  }

  private mapToFlashcard(data: any): Flashcard {
    return {
      id: data.id,
      deck_id: data.deck_id,
      front_content: data.front_content,
      back_content: data.back_content,
      tags: data.tags || [],
      status: data.status,
      created_at: data.created_at,
      updated_at: data.updated_at,
      searchable_text: data.searchable_text,
    };
  }
}


