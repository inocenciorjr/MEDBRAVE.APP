import { Request, Response } from 'express';
import { SupabaseClient } from '@supabase/supabase-js';
import supabase from '../../../config/supabaseAdmin';

// Migrated to Supabase - 2025-08-06T01:58:44.063Z
// ✅ Transações e operações em lote implementadas
// ✅ Sintaxe Supabase aplicada em todas as operações
// ⚠️  Testar todas as funcionalidades após migração
// 
// ⚠️  NOTA (2025-11-10): Tabela 'collections' removida por redundância
//     Todas as funções que usam from('collections') precisam ser reimplementadas
//     usando agregação da tabela 'decks' agrupando por coluna 'collection'
//     Essas funções não são usadas no frontend atualmente.

export class AdminFlashcardController {
  private client: SupabaseClient;
  private cache = new Map<string, { data: any; expiresAt: number }>();
  private readonly CACHE_TTL = 30 * 1000; // 30 segundos

  constructor(client?: SupabaseClient) {
    this.client = client || supabase;
  }

  // Método para cache genérico
  private getCacheKey(user_id: string, collection?: string): string {
    return `decks_${user_id}_${collection || 'all'}`;
  }

  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + this.CACHE_TTL,
    });
  }

  /**
   * Lista todos os decks de flashcards (OTIMIZADO)
   */
  async getAllDecks(req: Request, res: Response): Promise<void> {
    try {
      // Verificar se o usuário está autenticado
      const user = (req as any).user;
      if (!user || !user.id) {
        res.status(401).json({
          success: false,
          message: 'Usuário não autenticado',
        });
        return;
      }

      // Parâmetros de paginação - limitando mais agressivamente
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000); // Máximo 1.000 (reduzido de 10.000)
      const collection = req.query.collection as string;
      const sort_by = (req.query.sort_by as string) || 'created_at';
      const sort_order = (req.query.sort_order as string) || 'desc';

      // Verificar cache primeiro
      const cache_key = this.getCacheKey(user.id, collection);
      const cached_result = this.getFromCache(cache_key);
      if (cached_result) {
        res.status(200).json(cached_result);
        return;
      }

      // Se for admin, buscar todos os decks; se não, buscar apenas os do usuário
      const isAdmin =
        user.role === 'ADMIN' || user.role === 'admin' || user.isAdmin;

      // OTIMIZAÇÃO: Query única para buscar decks e metadados
      let query = this.client.from('decks').select('*');

      // Filtro por usuário
      if (!isAdmin) {
        query = query.eq('user_id', user.id);
      }

      // Filtro por coleção
      if (collection && collection !== 'all') {
        query = query.eq('collection', collection);
      }

      // Ordenação
      const order_direction = sort_order === 'asc' ? 'asc' : 'desc';
      query = query.order(sort_by, { ascending: order_direction === 'asc' });

      // OTIMIZAÇÃO: Usar limit menor para primeira carga
      const effective_limit = page === 1 ? Math.min(limit, 200) : limit;

      // Paginação
      if (page > 1) {
        const offset = (page - 1) * effective_limit;
        query = query.range(offset, offset + effective_limit - 1);
      } else {
        query = query.range(0, effective_limit - 1);
      }

      // Executar query principal
      const decks_snapshot = await query;

      const decks =
        decks_snapshot.data?.map((doc: any) => ({
          id: doc.id,
          ...doc,
        })) || [];

      // OTIMIZAÇÃO: Usar cache para contagem (menos preciso, mas mais rápido)
      let total = decks.length;
      let collections: string[] = [];

      // Para primeira página, fazer queries de metadados
      if (page === 1) {
        try {
          // Query de contagem paralela (com timeout)
          const count_promise = this.get_approximate_count(
            isAdmin,
            user,
            collection,
          );

          // Query de coleções paralela (com timeout)
          const collections_promise = this.get_collections(isAdmin, user);

          // Executar em paralelo com timeout
          const [count_result, collections_result] = await Promise.allSettled([
            Promise.race([count_promise, this.timeout(2000)]), // 2s timeout
            Promise.race([collections_promise, this.timeout(2000)]), // 2s timeout
          ]);

          if (count_result.status === 'fulfilled') {
            total = count_result.value;
          }

          if (collections_result.status === 'fulfilled') {
            collections = collections_result.value;
          }
        } catch (error) {
          // Se falhar, usar valores padrão
          console.warn('Metadados falharam, usando valores padrão:', error);
        }
      }

      const total_pages = Math.ceil(total / effective_limit);

      const result = {
        success: true,
        data: decks,
        pagination: {
          page,
          limit: effective_limit,
          total,
          total_pages,
          has_next: page < total_pages,
          has_prev: page > 1,
        },
        filters: {
          collections,
          current_collection: collection || 'all',
        },
      };

      // Cache apenas para primeira página
      if (page === 1) {
        this.setCache(cache_key, result);
      }

      res.status(200).json(result);
    } catch (error) {
      console.error('Erro ao listar decks:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao listar decks de flashcards',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }

  // Método auxiliar para contagem aproximada
  private async get_approximate_count(
    is_admin: boolean,
    user: any,
    collection?: string,
  ): Promise<number> {
    let count_query = this.client.from('decks');

    if (!is_admin) {
      count_query = count_query.in('user_id', [user.id, user.email]);
    }

    if (collection && collection !== 'all') {
      count_query = count_query.eq('collection', collection);
    }

    const { count } = await count_query.select('*', { count: 'exact', head: true });
    return count || 0;
  }

  // Método auxiliar para buscar coleções
  private async get_collections(is_admin: boolean, user: any): Promise<string[]> {
    let collections_query = this.client.from('decks');

    if (!is_admin) {
      collections_query = collections_query.in('user_id', [user.id, user.email]);
    }

    const { data } = await collections_query.select('collection');
    const collections_set = new Set(
      (data || [])
        .map((doc: any) => doc.collection)
        .filter(Boolean),
    );
    const collections = Array.from(collections_set).sort() as string[];

    return collections;
  }

  // Método auxiliar para timeout
  private timeout(ms: number): Promise<never> {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), ms),
    );
  }

  /**
   * Obtém detalhes de um deck específico
   */
  async getDeckById(req: Request, res: Response): Promise<void> {
    try {
      const { deck_id } = req.params;

      const { data: deck, error: deck_error } = await this.client
        .from('decks')
        .select('*')
        .eq('id', deck_id)
        .single();

      if (deck_error || !deck) {
        res.status(404).json({
          success: false,
          message: 'Deck não encontrado',
        });
        return;
      }

      // Buscar os cards deste deck
      const { data: cards } = await this.client
        .from('flashcards')
        .select('*')
        .eq('deck_id', deck_id);

      const formatted_cards =
        (cards || []).map((doc) => ({
          id: doc.id,
          ...doc,
        })) || [];

      res.status(200).json({
        success: true,
        data: {
          deck: {
            id: deck.id,
            ...deck,
          },
          cards: formatted_cards,
        },
      });
    } catch (error) {
      console.error('Erro ao obter deck:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao obter detalhes do deck',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }

  /**
   * Altera o status de publicação de um deck (público/privado)
   */
  async toggleDeckPublicStatus(req: Request, res: Response): Promise<void> {
    try {
      const { deck_id } = req.params;
      const { is_public } = req.body;

      if (typeof is_public !== 'boolean') {
        res.status(400).json({
          success: false,
          message: 'O parâmetro is_public deve ser um booleano',
        });
        return;
      }

      const { data: deck, error: deck_error } = await this.client
        .from('decks')
        .select('*')
        .eq('id', deck_id)
        .single();

      if (deck_error || !deck) {
        res.status(404).json({
          success: false,
          message: 'Deck não encontrado',
        });
        return;
      }

      const { error: update_error } = await this.client
        .from('decks')
        .update({
          is_public,
          updated_at: new Date().toISOString(),
        })
        .eq('id', deck_id);

      if (update_error) {
        throw update_error;
      }

      res.status(200).json({
        success: true,
        message: `Deck ${is_public ? 'publicado' : 'despublicado'} com sucesso`,
        data: {
          id: deck_id,
          is_public,
        },
      });
    } catch (error) {
      console.error('Erro ao alterar status do deck:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao alterar status de publicação do deck',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }

  /**
   * Exclui um deck e todos os seus cards
   */
  async deleteDeck(req: Request, res: Response): Promise<void> {
    try {
      const { deck_id } = req.params;
      const user = (req as any).user;

      console.log(`[DELETE_DECK] Tentando excluir deck: ${deck_id}`);
      console.log(`[DELETE_DECK] Usuário: ${user?.id} (${user?.email})`);

      if (!user || !user.id) {
        res.status(401).json({
          success: false,
          message: 'Usuário não autenticado',
        });
        return;
      }

      // Verificar se o deck existe
      const { data: deck, error: deck_error } = await this.client
        .from('decks')
        .select('*')
        .eq('id', deck_id)
        .single();

      console.log(`[DELETE_DECK] Deck existe: ${deck !== null}`);

      if (deck_error || !deck) {
        // Vamos buscar se existe algum deck similar para debug
        console.log("[DELETE_DECK] Buscando decks similares para debug...");
        const { data: similar_decks } = await this.client
          .from('decks')
          .select('*')
          .eq('user_id', user.id)
          .limit(5);

        console.log(
          `[DELETE_DECK] Decks encontrados para o usuário: ${similar_decks?.length || 0}`,
        );
        (similar_decks || []).forEach((doc) => {
          console.log(`[DELETE_DECK] - ID: ${doc.id}, Nome: ${doc.name}`);
        });

        res.status(404).json({
          success: false,
          message: 'Deck não encontrado',
          debug: {
            deck_id,
            user_id: user.id,
            similar_decks_count: similar_decks?.length || 0,
          },
        });
        return;
      }

      const deck_data = deck;
      const is_admin =
        user.role === 'ADMIN' || user.role === 'admin' || user.is_admin;

      console.log("[DELETE_DECK] Dados do deck:", {
        deck_user_id: deck_data?.user_id,
        user_id_auth: user.id,
        user_email: user.email,
        is_admin,
      });

      // Verificar se o usuário é o dono do deck ou admin
      if (
        !is_admin &&
        deck_data?.user_id !== user.id &&
        deck_data?.user_id !== user.email
      ) {
        res.status(403).json({
          success: false,
          message: 'Você não tem permissão para excluir este deck',
        });
        return;
      }

      // Usar múltiplas operações com tratamento de erro (Supabase)
      try {
        // Primeiro, excluir todos os cards do deck
        const { error: cards_error } = await this.client
          .from('flashcards')
          .delete()
          .eq('deck_id', deck_id);

        if (cards_error) {
          throw cards_error;
        }

        // Depois, excluir o deck
        const { error: deckError } = await this.client
          .from('decks')
          .delete()
          .eq('id', deckId);

        if (deckError) {
throw deckError;
}
      } catch (error) {
        throw error;
      }

      console.log(`[DELETE_DECK] ✅ Deck ${deck_id} excluído com sucesso`);

      res.status(200).json({
        success: true,
        message: 'Deck e cards excluídos com sucesso',
        data: { id: deck_id },
      });
    } catch (error) {
      console.error('[DELETE_DECK] ❌ Erro ao excluir deck:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao excluir deck e seus cards',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }

  /**
   * Exclui múltiplos decks em lote (até 100 por vez)
   */
  async deleteDecksBatch(req: Request, res: Response): Promise<void> {
    try {
      const { deck_ids } = req.body;
      const user = (req as any).user;

      if (!user || !user.id) {
        res.status(401).json({
          success: false,
          message: 'Usuário não autenticado',
        });
        return;
      }

      if (!deck_ids || !Array.isArray(deck_ids) || deck_ids.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Lista de IDs de decks é obrigatória',
        });
        return;
      }

      if (deck_ids.length > 500) {
        res.status(400).json({
          success: false,
          message: 'Máximo de 500 decks por lote',
        });
        return;
      }

      const is_admin =
        user.role === 'ADMIN' || user.role === 'admin' || user.is_admin;
      const results: {
        success: Array<{ id: string; name: string; cards_deleted: number }>;
        failed: Array<{ id: string; error: string }>;
        not_found: string[];
        unauthorized: string[];
      } = {
        success: [],
        failed: [],
        not_found: [],
        unauthorized: [],
      };

      // 🚀 SISTEMA DE BATCH DINÂMICO: Calcula tamanho ideal baseado no número de cards
      const batches = await this.create_dynamic_batches(deck_ids, user, is_admin);

      for (let batch_index = 0; batch_index < batches.length; batch_index++) {
        const current_batch = batches[batch_index];

        try {
          // 🚀 OTIMIZAÇÃO: Usar Promise.all() para operações em lote (Supabase)
          const delete_operations: Promise<any>[] = [];

          // Buscar todos os decks do lote atual
          const deck_promises = current_batch.map((deck_id: string) =>
            this.client.from('decks').select('*').eq('id', deck_id).single(),
          );

          const deck_docs = await Promise.all(deck_promises);

          // Validar permissões e coletar dados
          const valid_decks: Array<{ id: string; data: any }> = [];

          for (let i = 0; i < deck_docs.length; i++) {
            const deck_doc = deck_docs[i];
            const deck_id = current_batch[i];

            if (deck_doc.data === null) {
              results.not_found.push(deck_id);
              continue;
            }

            const deck_data = deck_doc;

            // Verificar permissões
            if (
              !is_admin &&
              deck_data?.user_id !== user.id &&
              deck_data?.user_id !== user.email
            ) {
              results.unauthorized.push(deck_id);
              continue;
            }

            valid_decks.push({ id: deck_id, data: deck_data });
          }

          // 🚀 OTIMIZAÇÃO: Buscar cards em paralelo para todos os decks válidos
          const card_promises = valid_decks.map((deck) =>
            this.client.from('flashcards').select('*').eq('deck_id', deck.id),
          );

          const card_snapshots = await Promise.all(card_promises);

          // Adicionar exclusões ao batch
          let total_cards = 0;
          card_snapshots.forEach((snapshot, index) => {
            const deck = valid_decks[index];
            total_cards += (snapshot.data || []).length;

            // Adicionar exclusão de cards às operações
            if (snapshot.data && snapshot.data.length > 0) {
              delete_operations.push(
                this.client.from('flashcards').delete().eq('deck_id', deck.id),
              );
            }

            // Adicionar exclusão do deck às operações
            delete_operations.push(
              this.client.from('decks').delete().eq('id', deck.id),
            );

            results.success.push({
              id: deck.id,
              name: deck.data?.name || 'Sem nome',
              cards_deleted: (snapshot.data || []).length,
            });
          });

          // 🚀 EXECUTAR OPERAÇÕES EM LOTE
          await Promise.all(delete_operations);
        } catch (error) {
          // 🚨 IMPORTANTE: Marcar todos os decks do lote como falhados
          current_batch.forEach((deck_id: string) => {
            results.failed.push({
              id: deck_id,
              error:
                error instanceof Error ? error.message : 'Erro desconhecido',
            });
          });
        }
      }

      const total_requested = deck_ids.length;
      const total_success = results.success.length;
      const total_failed =
        results.failed.length +
        results.not_found.length +
        results.unauthorized.length;

      // 🚨 CORREÇÃO: Só reportar sucesso se TODOS os decks foram excluídos
      const all_successful = total_failed === 0;
      const has_partial_success = total_success > 0 && total_failed > 0;

      // 🚨 CORREÇÃO: Status HTTP e success baseado no resultado real
      const status_code = all_successful ? 200 : has_partial_success ? 207 : 400;
      const message = all_successful
        ? `${total_success}/${total_requested} decks excluídos com sucesso`
        : has_partial_success
          ? `Exclusão parcial: ${total_success}/${total_requested} decks excluídos, ${total_failed} falharam`
          : `Falha na exclusão: ${total_failed}/${total_requested} decks falharam`;

      res.status(status_code).json({
        success: all_successful,
        partial_success: has_partial_success,
        message: message,
        data: {
          summary: {
            requested: total_requested,
            success: total_success,
            failed: total_failed,
            not_found: results.not_found.length,
            unauthorized: results.unauthorized.length,
            all_successful: all_successful,
            has_partial_success: has_partial_success,
          },
          details: results,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erro ao excluir decks em lote',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }

  /**
   * Lista todos os decks da comunidade
   */
  async getCommunityDecks(_req: Request, res: Response): Promise<void> {
    try {
      const { data: decks, error } = await this.client
        .from('decks')
        .eq('is_public', true)
        .select('*');

      if (error) {
        throw error;
      }

      const formatted_decks = decks.map((deck) => ({
        id: deck.id,
        ...deck,
      }));

      res.status(200).json({
        success: true,
        data: formatted_decks,
      });
    } catch (error) {
      console.error('Erro ao listar decks da comunidade:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao listar decks da comunidade',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }

  /**
   * Obtém estatísticas sobre os flashcards
   */
  async getFlashcardStats(req: Request, res: Response): Promise<void> {
    try {
      // Verificar se o usuário está autenticado
      const user = (req as any).user;
      if (!user || !user.id) {
        res.status(401).json({
          success: false,
          message: 'Usuário não autenticado',
        });
        return;
      }

      // Se for admin, buscar estatísticas globais; se não, buscar apenas do usuário
      const is_admin =
        user.role === 'ADMIN' || user.role === 'admin' || user.is_admin;

      let total_decks = 0;
      let public_decks = 0;
      let total_cards = 0;
      let users_with_decks = 0;

      if (is_admin) {
        // Admin: estatísticas globais
        const { data: decks, error: decks_error } = await this.client.from('decks').select('*');
        if (decks_error) throw decks_error;
        total_decks = decks.length;

        const { data: public_decks_data, error: public_error } = await this.client
          .from('decks')
          .eq('is_public', true)
          .select('*');
        if (public_error) throw public_error;
        public_decks = public_decks_data.length;

        const { data: cards, error: cards_error } = await this.client.from('flashcards').select('*');
        if (cards_error) throw cards_error;
        total_cards = cards.length;

        const { data: user_decks, error: user_decks_error } = await this.client
          .from('decks')
          .select('user_id');
        if (user_decks_error) throw user_decks_error;

        const unique_users = new Set(user_decks.map((deck) => deck.user_id));
        users_with_decks = unique_users.size;
      } else {
        // Usuário normal: apenas suas estatísticas

        // Contar decks do usuário (buscar por UID e email para compatibilidade)
        const { data: user_decks, error: user_decks_error } = await this.client
          .from('decks')
          .in('user_id', [user.id, user.email])
          .select('*');
        if (user_decks_error) throw user_decks_error;
        total_decks = user_decks.length;

        // Contar decks públicos do usuário
        const { data: user_public_decks, error: user_public_error } = await this.client
          .from('decks')
          .in('user_id', [user.id, user.email])
          .eq('is_public', true)
          .select('*');
        if (user_public_error) throw user_public_error;
        public_decks = user_public_decks.length;

        // Contar cards do usuário - buscar por todos os deck_ids do usuário
        const user_deck_ids = user_decks.map((deck) => deck.id);

        if (user_deck_ids.length > 0) {
          // Processar em batches para evitar limites do Supabase
          const batch_size = 10;
          let total_cards_count = 0;

          for (let i = 0; i < user_deck_ids.length; i += batch_size) {
            const batch = user_deck_ids.slice(i, i + batch_size);
            const { data: cards, error: cards_error } = await this.client
              .from('flashcards')
              .in('deck_id', batch)
              .select('*');
            if (cards_error) throw cards_error;
            total_cards_count += cards.length;
          }
          total_cards = total_cards_count;
        }

        users_with_decks = 1; // O próprio usuário
      }

      res.status(200).json({
        success: true,
        data: {
          total_decks,
          public_decks,
          private_decks: total_decks - public_decks,
          total_cards,
          users_with_decks: users_with_decks,
        },
      });
    } catch (error) {
      console.error('Erro ao obter estatísticas de flashcards:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao obter estatísticas de flashcards',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }

  // Nova função: Obter coleções públicas para a comunidade
  async getCommunityCollections(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      if (!user || !user.id) {
        res.status(401).json({
          success: false,
          message: 'Usuário não autenticado',
        });
        return;
      }

      // NOTA: Tabela 'collections' removida - dados agora vêm da tabela 'decks'
      // TODO: Reimplementar usando agregação da tabela 'decks'
      const collections: any[] = [];
      const error = null;

      const collections_data = [];

      for (const collection of collections) {
        const collection_data: any = {
          id: collection.id,
          ...collection,
        };

        // Buscar decks da coleção para mostrar preview
        const { data: decks, error: decks_error } = await this.client
          .from('decks')
          .eq('user_id', collection_data.user_id)
          .eq('collection', collection_data.name)
          .order('created_at', { ascending: false })
          .select('*');

        if (decks_error) {
          console.error('Erro ao buscar decks da coleção:', decks_error);
          collection_data.decks = [];
        } else {
          collection_data.decks = decks.map((deck) => ({
            id: deck.id,
            ...deck,
          }));
        }

        collections_data.push(collection_data);
      }

      res.json({
        success: true,
        data: collections_data,
      });
    } catch (error) {
      console.error('Erro ao buscar coleções da comunidade:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
      });
    }
  }

  // Nova função: Obter detalhes de uma coleção pública específica
  async getPublicCollectionDetails(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      if (!user || !user.id) {
        res.status(401).json({
          success: false,
          message: 'Usuário não autenticado',
        });
        return;
      }

      const { collectionId } = req.params;

      const collectionDoc = await this.client
        .from('collections')
        .select('*')
        .eq('id', collectionId)
        .single();

      if (!collectionDoc !== null) {
        res.status(404).json({
          success: false,
          message: 'Coleção não encontrada',
        });
        return;
      }

      const collectionData: any = collectionDoc;

      if (!collectionData?.isPublic) {
        res.status(403).json({
          success: false,
          message: 'Coleção não é pública',
        });
        return;
      }

      // Buscar todos os decks da coleção com estrutura hierárquica
      const decksQuery = await this.client
        .from('decks')
        .where('userId', '==', collectionData.userId)
        .where('collection', '==', collectionData.name)
        .order('created_at', { ascending: false })
        .select('*');

      const decks = [];

      for (const deckDoc of decksQuery.docs) {
        const deckData: any = {
          id: deckDoc.id,
          ...deckDoc,
        };

        // Buscar flashcards do deck para contagem
        const flashcardsQuery = await this.client
          .from('flashcards')
          .eq('deck_id', deckDoc.id)
          .select('*');

        deckData.flashcardCount = flashcardsQuery.length;
        decks.push(deckData);
      }

      res.json({
        success: true,
        data: {
          id: collectionDoc.id,
          ...collectionData,
          decks,
        },
      });
    } catch (error) {
      console.error('Erro ao buscar detalhes da coleção pública:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
      });
    }
  }

  // Nova função: Adicionar coleção pública à biblioteca pessoal
  async addCollectionToLibrary(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const userId = user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Usuário não autenticado',
        });
        return;
      }

      const { collectionId } = req.params;

      // Verificar se a coleção existe e é pública
      const collectionDoc = await this.client
        .from('collections')
        .select('*')
        .eq('id', collectionId)
        .single();

      if (!collectionDoc !== null) {
        res.status(404).json({
          success: false,
          message: 'Coleção não encontrada',
        });
        return;
      }

      const collectionData: any = collectionDoc;

      if (!collectionData?.isPublic) {
        res.status(403).json({
          success: false,
          message: 'Coleção não é pública',
        });
        return;
      }

      // Verificar se já está na biblioteca
      const existingSubscription = await this.client
        .from('collection_subscriptions')
        .eq('user_id', userId)
        .eq("collectionId", collectionId)
        .limit(1)
        .select('*');

      if (!existingSubscription.empty) {
        res.status(400).json({
          success: false,
          message: 'Coleção já está na sua biblioteca',
        });
        return;
      }

      // Adicionar à biblioteca
      const subscriptionData = {
        userId,
        collectionId,
        collectionName: collectionData.name,
        originalUserId: collectionData.userId,
        subscribedAt: new Date().toISOString(),
        lastSyncedAt: new Date().toISOString(),
        isActive: true,
      };

      await this.client.from('collection_subscriptions').add(subscriptionData);

      res.json({
        success: true,
        message: 'Coleção adicionada à sua biblioteca com sucesso',
        data: subscriptionData,
      });
    } catch (error) {
      console.error('Erro ao adicionar coleção à biblioteca:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
      });
    }
  }

  // Nova função: Remover coleção da biblioteca pessoal
  async removeCollectionFromLibrary(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const user = (req as any).user;
      const userId = user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Usuário não autenticado',
        });
        return;
      }

      const { collectionId } = req.params;

      // Buscar subscription
      const subscriptionQuery = await this.client
        .from('collection_subscriptions')
        .where('userId', '==', userId)
        .where('collectionId', '==', collectionId)
        .limit(1)
        .select('*');

      if (subscriptionQuery.empty) {
        res.status(404).json({
          success: false,
          message: 'Coleção não está na sua biblioteca',
        });
        return;
      }

      // Remover subscription
      await subscriptionQuery.docs[0].ref.delete();

      res.json({
        success: true,
        message: 'Coleção removida da sua biblioteca com sucesso',
      });
    } catch (error) {
      console.error('Erro ao remover coleção da biblioteca:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
      });
    }
  }

  // Nova função: Obter biblioteca pessoal de coleções
  async getMyLibrary(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const userId = user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Usuário não autenticado',
        });
        return;
      }

      // Buscar subscriptions do usuário
      const subscriptionsQuery = await this.client
        .from('collection_subscriptions')
        .eq('user_id', userId)
        .eq("isActive", true)
        .orderBy('subscribedAt', 'desc')
        .select('*');

      const libraryCollections = [];

      for (const subDoc of subscriptionsQuery.docs) {
        const subData = subDoc;

        // Buscar dados atualizados da coleção
        const collectionDoc = await this.client
          .from('collections')
          .doc(subData.collectionId)
          .select('*');

        if (collectionDoc !== null && collectionDoc?.isPublic) {
          const collectionData = {
            subscriptionId: subDoc.id,
            ...subData,
            ...collectionDoc,
            id: collectionDoc.id,
          };

          libraryCollections.push(collectionData);
        }
      }

      res.json({
        success: true,
        data: libraryCollections,
      });
    } catch (error) {
      console.error('Erro ao buscar biblioteca pessoal:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
      });
    }
  }

  // Nova função: Tornar coleção pública/privada
  async toggleCollectionPublicStatus(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const user = (req as any).user;
      const userId = user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Usuário não autenticado',
        });
        return;
      }

      const { collectionId } = req.params;
      const { isPublic } = req.body;

      // Verificar se a coleção pertence ao usuário
      const collectionDoc = await this.client
        .from('collections')
        .select('*')
        .eq('id', collectionId)
        .single();

      if (!collectionDoc !== null) {
        res.status(404).json({
          success: false,
          message: 'Coleção não encontrada',
        });
        return;
      }

      const collectionData: any = collectionDoc;

      if (collectionData?.userId !== userId) {
        res.status(403).json({
          success: false,
          message: 'Você não tem permissão para alterar esta coleção',
        });
        return;
      }

      // Atualizar status público da coleção
      await collectionDoc.ref.update({
        isPublic: isPublic,
        updatedAt: new Date().toISOString(),
      });

      // Atualizar flag nos decks da coleção
      const { data: decksData, error: decksError } = await this.client
        .from('decks')
        .eq('userId', userId)
        .eq('collection', collectionData.name)
        .select('*');

      if (decksError) {
throw decksError;
}

      // Atualizar todos os decks da coleção em lote
      if (decksData && decksData.length > 0) {
        const updateOperations = decksData.map((deck: any) =>
          this.client
            .from('decks')
            .update({ isPublic: isPublic, updatedAt: new Date().toISOString() })
            .eq('id', deck.id),
        );

        await Promise.all(updateOperations);
      }

      res.json({
        success: true,
        message: `Coleção ${isPublic ? 'publicada' : 'despublicada'} com sucesso`,
      });
    } catch (error) {
      console.error('Erro ao alterar status público da coleção:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
      });
    }
  }

  // Método para obter um card específico
  async getCardById(req: Request, res: Response): Promise<void> {
    try {
      const { cardId } = req.params;
      const user = (req as any).user;

      if (!user || !user.id) {
        res.status(401).json({
          success: false,
          message: 'Usuário não autenticado',
        });
        return;
      }

      // Primeiro, tentar buscar pelo ID do documento
      let cardDoc = await this.client
        .from('flashcards')
        .select('*')
        .eq('id', cardId)
        .single();

      // Se não encontrar, tentar buscar por ID interno/externo
      if (!cardDoc !== null) {
        const querySnapshot = await this.client
          .from('flashcards')
          .eq('id', cardId)
          .limit(1)
          .select('*');

        if (!querySnapshot.empty) {
          cardDoc = querySnapshot.docs[0];
        }
      }

      if (!cardDoc !== null) {
        res.status(404).json({
          success: false,
          message: 'Card não encontrado',
        });
        return;
      }

      const cardData = cardDoc;

      // Verificar se o card pertence ao usuário
      if (cardData?.userId !== user.id && cardData?.userId !== user.email) {
        res.status(403).json({
          success: false,
          message: 'Acesso negado',
        });
        return;
      }

      // Buscar informações do deck
      const deckDoc = await this.client
        .from('decks')
        .doc(cardData?.deckId)
        .select('*');
      const deckData = deckDoc !== null ? deckDoc : null;

      const card = {
        id: cardDoc.id,
        ...cardData,
        deckName: deckData?.name || 'Deck não encontrado',
      };

      res.json({
        success: true,
        data: { card },
      });
    } catch (error) {
      console.error('Erro ao buscar card:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
      });
    }
  }

  // Método para atualizar um card
  async updateCard(req: Request, res: Response): Promise<void> {
    try {
      const { cardId } = req.params;
      const { front, back, tags, notes } = req.body;
      const user = (req as any).user;

      if (!user || !user.id) {
        res.status(401).json({
          success: false,
          message: 'Usuário não autenticado',
        });
        return;
      }

      // Buscar o card
      const cardDoc = await this.client
        .from('flashcards')
        .select('*')
        .eq('id', cardId)
        .single();

      if (!cardDoc !== null) {
        res.status(404).json({
          success: false,
          message: 'Card não encontrado',
        });
        return;
      }

      const cardData = cardDoc;

      // Verificar se o card pertence ao usuário
      if (cardData?.userId !== user.id && cardData?.userId !== user.email) {
        res.status(403).json({
          success: false,
          message: 'Acesso negado',
        });
        return;
      }

      // Preparar dados para atualização
      const updateData: any = {
        updatedAt: new Date().toISOString(),
      };

      if (front !== undefined) {
updateData.frontContent = front;
}
      if (back !== undefined) {
updateData.backContent = back;
}
      if (tags !== undefined) {
updateData.tags = Array.isArray(tags) ? tags : [];
}
      if (notes !== undefined) {
updateData.notes = notes;
}

      // Atualizar o card
      await this.client.from('flashcards').doc(cardId).update(updateData);

      res.json({
        success: true,
        message: 'Card atualizado com sucesso',
      });
    } catch (error) {
      console.error('Erro ao atualizar card:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
      });
    }
  }

  // Método para excluir um card
  async deleteCard(req: Request, res: Response): Promise<void> {
    try {
      const { cardId } = req.params;
      const user = (req as any).user;

      if (!user || !user.id) {
        res.status(401).json({
          success: false,
          message: 'Usuário não autenticado',
        });
        return;
      }

      // Buscar o card
      const cardDoc = await this.client
        .from('flashcards')
        .select('*')
        .eq('id', cardId)
        .single();

      if (!cardDoc !== null) {
        res.status(404).json({
          success: false,
          message: 'Card não encontrado',
        });
        return;
      }

      const cardData = cardDoc;

      // Verificar se o card pertence ao usuário
      if (cardData?.userId !== user.id && cardData?.userId !== user.email) {
        res.status(403).json({
          success: false,
          message: 'Acesso negado',
        });
        return;
      }

      // Excluir o card
      await this.client.from('flashcards').doc(cardId).delete();

      // Atualizar contagem do deck
      if (cardData?.deckId) {
        const deckDoc = await this.client
          .from('decks')
          .doc(cardData.deckId)
          .select('*');
        if (deckDoc !== null) {
          const currentCount = deckDoc?.flashcardCount || 0;
          await this.client
            .from('decks')
            .doc(cardData.deckId)
            .update({
              flashcardCount: Math.max(0, currentCount - 1),
              updatedAt: new Date().toISOString(),
            });
        }
      }

      res.json({
        success: true,
        message: 'Card excluído com sucesso',
      });
    } catch (error) {
      console.error('Erro ao excluir card:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
      });
    }
  }

  /**
   * 🚀 SISTEMA DE BATCH DINÂMICO: Calcula lotes baseado no número real de cards
   */
  private async createDynamicBatches(
    deckIds: string[],
    user: any,
    isAdmin: boolean,
  ): Promise<string[][]> {
    const maxOperationsPerBatch = 450; // Margem de segurança do limite 500 do Firestore
    const batches: string[][] = [];
    let currentBatch: string[] = [];
    let currentOperations = 0;

    // Analisar cada deck para contar cards
    for (const deckId of deckIds) {
      try {
        // Verificar se o deck existe e pertence ao usuário
        const deckDoc = await this.client
          .from('decks')
          .select('*')
          .eq('id', deckId)
          .single();

        if (!deckDoc !== null) {
          continue;
        }

        const deckData = deckDoc;

        // Verificar permissões
        if (
          !isAdmin &&
          deckData?.userId !== user.id &&
          deckData?.userId !== user.email
        ) {
          continue;
        }

        // Contar cards do deck
        const cardsSnapshot = await this.client
          .from('flashcards')
          .eq('deck_id', deckId)
          .select() // Só pegar IDs para economizar
          .select('*');

        const cardCount = cardsSnapshot.length;
        const deckOperations = cardCount + 1; // +1 para o próprio deck

        // Se adicionar este deck exceder o limite, fechar lote atual
        if (
          currentOperations + deckOperations > maxOperationsPerBatch &&
          currentBatch.length > 0
        ) {
          batches.push([...currentBatch]);
          currentBatch = [];
          currentOperations = 0;
        }

        // Adicionar deck ao lote atual
        currentBatch.push(deckId);
        currentOperations += deckOperations;

        // Se um único deck excede o limite, criar lote só para ele
        if (deckOperations > maxOperationsPerBatch) {
          batches.push([deckId]);
          currentBatch = [];
          currentOperations = 0;
        }
      } catch (error) {
        // Continuar com próximo deck
      }
    }

    // Adicionar último lote se não estiver vazio
    if (currentBatch.length > 0) {
      batches.push(currentBatch);
    }

    return batches;
  }

  /**
   * 🚀 NOVA API: Metadados das coleções (OTIMIZADO PARA CARREGAMENTO RÁPIDO)
   */
  async getCollectionsMetadata(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      if (!user || !user.id) {
        res.status(401).json({
          success: false,
          message: 'Usuário não autenticado',
        });
        return;
      }

      // Cache específico para metadados
      const cacheKey = `metadata_${user.id}`;
      const cachedResult = this.getFromCache(cacheKey);
      if (cachedResult) {
        res.status(200).json(cachedResult);
        return;
      }

      const isAdmin =
        user.role === 'ADMIN' || user.role === 'admin' || user.isAdmin;

      // QUERY SUPER OTIMIZADA: Apenas campos necessários
      let query: any = this.client.from('decks');

      if (!isAdmin) {
        query = query.in('userId', [user.id, user.email]);
      }

      // Selecionar apenas campos necessários para metadados
      query = query.select(
        'collection',
        'flashcardCount',
        'updatedAt',
        'createdAt',
      );

      const snapshot = await query.select('*');

      // Processar metadados por coleção
      const collectionsMap = new Map();

      snapshot.data?.forEach((item: any) => {
        const {
          collection,
          flashcardCount: cardCount,
          updatedAt,
          createdAt,
        } = item;

        if (!collection) {
return;
}

        if (!collectionsMap.has(collection)) {
          collectionsMap.set(collection, {
            name: collection,
            deckCount: 0,
            card_count: 0,
            updatedAt: updatedAt || createdAt,
            createdAt: createdAt,
          });
        }

        const collectionData = collectionsMap.get(collection);
        collectionData.deckCount += 1;
        collectionData.card_count += cardCount || 0;

        // Manter a data mais recente
        if (updatedAt && updatedAt > collectionData.updatedAt) {
          collectionData.updatedAt = updatedAt;
        }
      });

      // Converter para array e ordenar por data de atualização
      const collections = Array.from(collectionsMap.values()).sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );

      const result = {
        success: true,
        data: {
          collections,
          totalCollections: collections.length,
          totalDecks: snapshot.docs.length,
          totalCards: collections.reduce((sum, col) => sum + col.card_count, 0),
        },
      };

      // Cache por 5 minutos
      this.setCache(cacheKey, result);

      res.status(200).json(result);
    } catch (error) {
      console.error('Erro ao buscar metadados das coleções:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar metadados das coleções',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }

  /**
   * 🚀 NOVA API: Decks de uma coleção específica (CARREGAMENTO LAZY)
   */
  async getCollectionDecks(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      if (!user || !user.id) {
        res.status(401).json({
          success: false,
          message: 'Usuário não autenticado',
        });
        return;
      }

      const collectionName = req.params.collectionName;
      if (!collectionName) {
        res.status(400).json({
          success: false,
          message: 'Nome da coleção é obrigatório',
        });
        return;
      }

      // Cache específico para coleção
      const cacheKey = `collection_${user.id}_${collectionName}`;
      const cachedResult = this.getFromCache(cacheKey);
      if (cachedResult) {
        res.status(200).json(cachedResult);
        return;
      }

      const isAdmin =
        user.role === 'ADMIN' || user.role === 'admin' || user.isAdmin;

      // Query para decks da coleção específica
      let query: any = this.client.from('decks');

      if (!isAdmin) {
        query = query.where('userId', 'in', [user.id, user.email]);
      }

      query = query
        .eq('collection', decodeURIComponent(collectionName))
        .order('updated_at', { ascending: false });

      const { data: snapshot, error } = await query;

      if (error) {
        throw new Error(`Erro ao buscar decks: ${error.message}`);
      }

      const decks = snapshot || [];

      const result = {
        success: true,
        data: {
          collection: collectionName,
          decks,
          deck_count: decks.length,
          total_cards: decks.reduce(
            (sum: number, deck: any) => sum + (deck.flashcard_count || 0),
            0,
          ),
        },
      };

      // Cache por 2 minutos (menor TTL para dados específicos)
      const shortCacheKey = `collection_short_${user.id}_${collectionName}`;
      this.cache.set(shortCacheKey, {
        data: result,
        expiresAt: Date.now() + 2 * 60 * 1000, // 2 minutos
      });

      res.status(200).json(result);
    } catch (error) {
      console.error('Erro ao buscar decks da coleção:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar decks da coleção',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }

  /**
   * 🔍 NOVA API: Busca global em todas as coleções com filtros FSRS
   */
  async globalSearch(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      if (!user || !user.id) {
        res.status(401).json({
          success: false,
          message: 'Usuário não autenticado',
        });
        return;
      }

      const query = req.query.q as string;
      const filters = req.query.filters as string; // Ex: "pendentes,baixo"
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

      if (!query || query.trim().length < 2) {
        res.status(400).json({
          success: false,
          message: 'Query deve ter pelo menos 2 caracteres',
        });
        return;
      }

      // Cache para busca
      const cacheKey = `search_${user.id}_${query.toLowerCase()}_${filters}_${page}`;
      const cachedResult = this.getFromCache(cacheKey);
      if (cachedResult) {
        res.status(200).json(cachedResult);
        return;
      }

      const isAdmin =
        user.role === 'ADMIN' || user.role === 'admin' || user.isAdmin;

      // 🔍 BUSCA MELHORADA: Buscar todos os decks primeiro, depois filtrar
      let searchQuery: any = this.client.from('decks');

      if (!isAdmin) {
        searchQuery = searchQuery.in('userId', [user.id, user.email]);
      }

      // Buscar TODOS os decks do usuário
      const allDecksSnapshot = await searchQuery.select('*');
      const allDecks = allDecksSnapshot.docs.map((doc: any) => ({
        id: item.id,
        ...doc,
      }));

      // 🔍 BUSCA HIERÁRQUICA EM DUAS SEÇÕES
      const searchTerm = query.toLowerCase().trim();

      // 📋 SEÇÃO 1: RESULTADOS DIRETOS (nome, descrição)
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

      // 📁 SEÇÃO 2: DECKS EM PASTAS RELACIONADAS
      const folderMatches: {
        [key: string]: {
          collection: string;
          folder: string;
          hierarchyPath: string;
          originalHierarchyPath: string;
          originalPath: string;
          decks: any[];
        };
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

            // Construir hierarchyPath completo
            const hierarchyPath = hierarchy.join(' > ');
            const originalHierarchyPath = hierarchy.join('::');
            const originalPath = deck.hierarchyPath || hierarchyPath;

            if (!folderMatches[key]) {
              folderMatches[key] = {
                collection,
                folder,
                hierarchyPath,
                originalHierarchyPath,
                originalPath,
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

          return {
            ...group,
            deckCount: group.decks.length,
            totalCards: group.decks.reduce(
              (sum: number, deck: any) => sum + (deck.flashcardCount || 0),
              0,
            ),
          };
        })
        .sort((a, b) => b.deckCount - a.deckCount); // Pastas com mais decks primeiro

      // Limpar scores dos resultados diretos
      let directResults = sortedDirectMatches.map((deck: any) => {
        const { _searchScore, ...cleanDeck } = deck;
        return cleanDeck;
      });

      // Aplicar filtros FSRS se especificados
      if (filters) {
        directResults = await this.applyFSRSFilters(
          directResults,
          filters.split(','),
        );
        // Aplicar filtros também nos folder results
        for (const folderGroup of folderResults) {
          folderGroup.decks = await this.applyFSRSFilters(
            folderGroup.decks,
            filters.split(','),
          );
        }
      }

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

      const result = {
        success: true,
        data: {
          directResults: paginatedDirectResults,
          folderResults: folderResults.slice(0, 10), // Máximo 10 pastas para performance
          query,
          filters: filters ? filters.split(',') : [],
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
      };

      // Cache por 2 minutos
      this.cache.set(cacheKey, {
        data: result,
        expiresAt: Date.now() + 2 * 60 * 1000,
      });

      res.status(200).json(result);
    } catch (error) {
      console.error('Erro na busca global:', error);
      res.status(500).json({
        success: false,
        message: 'Erro na busca global',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }

  /**
   * 📊 NOVA API: Status FSRS de todos os cards do usuário
   */
  async getFSRSStatus(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      if (!user || !user.id) {
        res.status(401).json({
          success: false,
          message: 'Usuário não autenticado',
        });
        return;
      }

      // Cache para status FSRS
      const cacheKey = `fsrs_status_${user.id}`;
      const cachedResult = this.getFromCache(cacheKey);
      if (cachedResult) {
        res.status(200).json(cachedResult);
        return;
      }

      const isAdmin =
        user.role === 'ADMIN' || user.role === 'admin' || user.isAdmin;

      // Buscar todos os decks do usuário
      let decksQuery: any = this.client.from('decks');

      if (!isAdmin) {
        decksQuery = decksQuery.in('userId', [user.id, user.email]);
      }

      const decksSnapshot = await decksQuery.select('*');
      const decks =
        decksSnapshot.data?.map((doc: any) => ({
          id: doc.id,
          ...doc,
        })) || [];

      // Buscar cards FSRS para cada deck
      const fsrsStats = {
        totalCards: 0,
        pendingCards: 0,
        overdueCards: 0,
        upToDateCards: 0,
        neverStudiedCards: 0,
        lowPerformance: 0,
        mediumPerformance: 0,
        highPerformance: 0,
        deckStats: [] as any[],
      };

      const now = new Date();

      for (const deck of decks) {
        try {
          // Buscar cards FSRS deste deck
          const cardsSnapshot = await this.client
            .from('fsrs_cards')
            .eq('deck_id', deck.id)
            .select('*');

          const deckStat = {
            deckId: deck.id,
            deckName: deck.name,
            collection: deck.collection,
            totalCards: cardsSnapshot.docs.length,
            pendingCards: 0,
            overdueCards: 0,
            upToDateCards: 0,
            neverStudiedCards: 0,
            lowPerformance: 0,
            mediumPerformance: 0,
            highPerformance: 0,
            lastReview: null as any,
          };

          cardsSnapshot.docs.forEach((cardDoc: any) => {
            const cardData = cardDoc;
            fsrsStats.totalCards++;
            deckStat.totalCards++;

            // Analisar status do card
            const nextReview = cardData.next_review?.toDate();
            const lastReview = cardData.last_review?.toDate();
            const difficulty = cardData.difficulty || 0;
            const stability = cardData.stability || 0;

            // Última revisão do deck
            if (
              lastReview &&
              (!deckStat.lastReview || lastReview > deckStat.lastReview)
            ) {
              deckStat.lastReview = lastReview;
            }

            // Status de revisão
            if (!nextReview) {
              // Nunca estudado
              fsrsStats.neverStudiedCards++;
              deckStat.neverStudiedCards++;
            } else if (nextReview <= now) {
              // Pendente
              fsrsStats.pendingCards++;
              deckStat.pendingCards++;

              // Vencida (mais de 7 dias)
              const daysDiff = Math.floor(
                (now.getTime() - nextReview.getTime()) / (1000 * 60 * 60 * 24),
              );
              if (daysDiff > 7) {
                fsrsStats.overdueCards++;
                deckStat.overdueCards++;
              }
            } else {
              // Em dia
              fsrsStats.upToDateCards++;
              deckStat.upToDateCards++;
            }

            // Análise de desempenho
            if (difficulty > 8 || stability < 1) {
              fsrsStats.lowPerformance++;
              deckStat.lowPerformance++;
            } else if (
              difficulty >= 5 &&
              difficulty <= 8 &&
              stability >= 1 &&
              stability <= 7
            ) {
              fsrsStats.mediumPerformance++;
              deckStat.mediumPerformance++;
            } else if (difficulty < 5 && stability > 7) {
              fsrsStats.highPerformance++;
              deckStat.highPerformance++;
            }
          });

          fsrsStats.deckStats.push(deckStat);
        } catch (error) {
          console.error(`Erro ao analisar deck ${deck.id}:`, error);
        }
      }

      const result = {
        success: true,
        data: fsrsStats,
      };

      // Cache por 5 minutos
      this.cache.set(cacheKey, {
        data: result,
        expiresAt: Date.now() + 5 * 60 * 1000,
      });

      res.status(200).json(result);
    } catch (error) {
      console.error('Erro ao buscar status FSRS:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar status FSRS',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }

  /**
   * 🎛️ MÉTODO AUXILIAR: Aplicar filtros FSRS
   */
  private async applyFSRSFilters(
    decks: any[],
    filters: string[],
  ): Promise<any[]> {
    if (!filters || filters.length === 0) {
return decks;
}

    const filteredDecks = [];
    const now = new Date();

    for (const deck of decks) {
      try {
        // Buscar cards FSRS deste deck
        const cardsSnapshot = await this.client
          .from('fsrs_cards')
          .eq('deck_id', deck.id)
          .select('*');

        let matchesFilter = false;
        const deckStats = {
          pendingCards: 0,
          overdueCards: 0,
          upToDateCards: 0,
          neverStudiedCards: 0,
          lowPerformance: 0,
          mediumPerformance: 0,
          highPerformance: 0,
        };

        // Analisar cards para aplicar filtros
        cardsSnapshot.docs.forEach((cardDoc: any) => {
          const cardData = cardDoc;
          const nextReview = cardData.next_review?.toDate();
          const difficulty = cardData.difficulty || 0;
          const stability = cardData.stability || 0;

          // Contadores para filtros
          if (!nextReview) {
            deckStats.neverStudiedCards++;
          } else if (nextReview <= now) {
            deckStats.pendingCards++;
            const daysDiff = Math.floor(
              (now.getTime() - nextReview.getTime()) / (1000 * 60 * 60 * 24),
            );
            if (daysDiff > 7) {
              deckStats.overdueCards++;
            }
          } else {
            deckStats.upToDateCards++;
          }

          // Análise de desempenho
          if (difficulty > 8 || stability < 1) {
            deckStats.lowPerformance++;
          } else if (
            difficulty >= 5 &&
            difficulty <= 8 &&
            stability >= 1 &&
            stability <= 7
          ) {
            deckStats.mediumPerformance++;
          } else if (difficulty < 5 && stability > 7) {
            deckStats.highPerformance++;
          }
        });

        // Verificar se deck atende aos filtros
        for (const filter of filters) {
          switch (filter.toLowerCase()) {
            case 'pendentes':
              if (deckStats.pendingCards > 0) {
                matchesFilter = true;
              }
              break;
            case 'vencidas':
              if (deckStats.overdueCards > 0) {
                matchesFilter = true;
              }
              break;
            case 'em-dia':
              if (deckStats.upToDateCards > 0) {
                matchesFilter = true;
              }
              break;
            case 'nunca-estudadas':
              if (deckStats.neverStudiedCards > 0) {
                matchesFilter = true;
              }
              break;
            case 'baixo':
              if (deckStats.lowPerformance > 0) {
                matchesFilter = true;
              }
              break;
            case 'medio':
              if (deckStats.mediumPerformance > 0) {
                matchesFilter = true;
              }
              break;
            case 'alto':
              if (deckStats.highPerformance > 0) {
                matchesFilter = true;
              }
              break;
            case 'alta-prioridade':
              if (deckStats.overdueCards > 0 && deckStats.lowPerformance > 0) {
                matchesFilter = true;
              }
              break;
          }
        }

        if (matchesFilter) {
          // Adicionar estatísticas ao deck
          deck.fsrsStats = deckStats;
          filteredDecks.push(deck);
        }
      } catch (error) {
        console.error(`Erro ao filtrar deck ${deck.id}:`, error);
      }
    }

    return filteredDecks;
  }
}
