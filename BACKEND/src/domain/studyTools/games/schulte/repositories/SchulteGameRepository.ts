import { SupabaseClient } from '@supabase/supabase-js';

export class SchulteGameRepository {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  async createGame(gameData: any): Promise<any> {
    const { data, error } = await this.supabase
      .from('schulte_games')
      .insert(gameData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getGameById(id: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('schulte_games')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async updateGame(id: string, updates: any): Promise<any> {
    const { data, error } = await this.supabase
      .from('schulte_games')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getUserStats(userId: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('schulte_user_stats')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && (error as any).code !== 'PGRST116') throw error;
    return data;
  }

  async createUserStats(stats: any): Promise<any> {
    const { data, error } = await this.supabase
      .from('schulte_user_stats')
      .insert(stats)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateUserStats(userId: string, updates: any): Promise<any> {
    const { data, error } = await this.supabase
      .from('schulte_user_stats')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getRankingEntry(userId: string, gridSize: number, isInverse: boolean): Promise<any> {
    const { data, error } = await this.supabase
      .from('schulte_rankings')
      .select('*')
      .eq('user_id', userId)
      .eq('grid_size', gridSize)
      .eq('is_inverse', isInverse)
      .single();

    if (error && (error as any).code !== 'PGRST116') throw error;
    return data;
  }

  async upsertRanking(rankingData: any): Promise<any> {
    const { data, error } = await this.supabase
      .from('schulte_rankings')
      .upsert(rankingData, { onConflict: 'user_id, grid_size, is_inverse' })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getRanking(gridSize: number, isInverse: boolean, limit: number): Promise<any[]> {
    // Primeiro, buscar os rankings puros (sem join) para evitar problemas com relacionamento entre schemas
    const { data: rankingRows, error: rankingError } = await this.supabase
      .from('schulte_rankings')
      .select('*')
      .eq('grid_size', gridSize)
      .eq('is_inverse', isInverse)
      .order('best_time', { ascending: true })
      .limit(limit);

    if (rankingError) throw rankingError;
    if (!rankingRows || rankingRows.length === 0) return [];

    // Em seguida, buscar perfis na tabela public.users e montar um mapa por user_id
    const userIds = Array.from(new Set(rankingRows.map((r: any) => r.user_id)));

    const { data: profiles, error: profilesError } = await this.supabase
      .from('users')
      .select('id, display_name, username_slug')
      .in('id', userIds);

    if (profilesError) throw profilesError;

    const profileMap = new Map<string, { display_name: string | null; username_slug: string | null }>();
    (profiles || []).forEach((p: any) => {
      profileMap.set(p.id, { display_name: p.display_name ?? null, username_slug: p.username_slug ?? null });
    });

    // Por compatibilidade com o frontend, retornar um campo aninhado `users` com `username`
    return rankingRows.map((row: any) => {
      const profile = profileMap.get(row.user_id);
      return {
        ...row,
        users: {
          username: profile?.display_name || 'Anônimo',
          username_slug: profile?.username_slug || null,
        },
      };
    });
  }
}