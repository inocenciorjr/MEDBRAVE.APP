import { supabase } from '../config/supabase';

export class SearchService {
  /**
   * Busca decks usando Full Text Search diretamente na tabela decks
   */
  static async searchDecks({
    query,
    userId,
    limit = 20,
    offset = 0
  }: {
    query: string;
    userId: string;
    limit?: number;
    offset?: number;
  }) {
    try {
      const { data, error } = await supabase
        .from('decks')
        .select(`
          id,
          name,
          title,
          description,
          collection,
          flashcard_count,
          hierarchy,
          hierarchy_path,
          path,
          is_public,
          created_at,
          updated_at
        `)
        .eq('user_id', userId)
        .textSearch('searchable_text', query, {
          type: 'websearch',
          config: 'portuguese'
        })
        .range(offset, offset + limit - 1)
        .order('name');

      if (error) {
        throw error;
      }

      return {
        data: data || [],
        count: data?.length || 0
      };
    } catch (error) {
      console.error('Erro ao buscar decks:', error);
      throw error;
    }
  }

  /**
   * Busca decks por hierarquia
   */
  static async searchDecksByHierarchy({
    hierarchy,
    userId,
    limit = 20,
    offset = 0
  }: {
    hierarchy: string[];
    userId: string;
    limit?: number;
    offset?: number;
  }) {
    try {
      const { data, error } = await supabase
        .from('decks')
        .select(`
          id,
          name,
          title,
          description,
          collection,
          flashcard_count,
          hierarchy,
          hierarchy_path,
          path
        `)
        .eq('user_id', userId)
        .contains('hierarchy', hierarchy)
        .range(offset, offset + limit - 1)
        .order('hierarchy_path');

      if (error) {
        throw error;
      }

      return {
        data: data || [],
        count: data?.length || 0
      };
    } catch (error) {
      console.error('Erro ao buscar decks por hierarquia:', error);
      throw error;
    }
  }

  /**
   * Busca decks por coleção
   */
  static async searchDecksByCollection({
    collectionName,
    userId,
    limit = 20,
    offset = 0
  }: {
    collectionName: string;
    userId: string;
    limit?: number;
    offset?: number;
  }) {
    try {
      const { data, error } = await supabase
        .from('decks')
        .select(`
          id,
          name,
          title,
          description,
          collection,
          flashcard_count,
          hierarchy,
          hierarchy_path,
          path
        `)
        .eq('user_id', userId)
        .eq('collection', collectionName)
        .range(offset, offset + limit - 1)
        .order('name');

      if (error) {
        throw error;
      }

      return {
        data: data || [],
        count: data?.length || 0
      };
    } catch (error) {
      console.error('Erro ao buscar decks por coleção:', error);
      throw error;
    }
  }
}
