import { SupabaseClient } from '@supabase/supabase-js';
import { ITermoGameState, ITermoGameRepository, ITermoUserStats, ITermoRanking } from '../interfaces/ITermoGame';

export class TermoGameRepository implements ITermoGameRepository {
  constructor(private supabase: SupabaseClient) {}

  async createGame(gameState: Omit<ITermoGameState, 'id' | 'createdAt' | 'updatedAt'>): Promise<ITermoGameState> {
    const { data, error } = await this.supabase
      .from('termo_games')
      .insert({
        user_id: gameState.userId,
        word: gameState.word,
        word_length: gameState.wordLength,
        guesses: gameState.guesses,
        is_completed: gameState.isCompleted,
        is_won: gameState.isWon,
        attempts_used: gameState.attemptsUsed,
        max_attempts: gameState.maxAttempts,
        current_round: gameState.currentRound,
        max_rounds: gameState.maxRounds,
        rounds_used: gameState.roundsUsed,
        start_time: gameState.startTime?.toISOString(),
        end_time: gameState.endTime?.toISOString(),
        total_time: gameState.totalTime,
        date: gameState.date
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapToGameState(data);
  }

  async updateGame(gameId: string, updates: Partial<ITermoGameState>): Promise<ITermoGameState> {
    const updateData: any = {};
    
    if (updates.guesses !== undefined) updateData.guesses = updates.guesses;
    if (updates.isCompleted !== undefined) updateData.is_completed = updates.isCompleted;
    if (updates.isWon !== undefined) updateData.is_won = updates.isWon;
    if (updates.attemptsUsed !== undefined) updateData.attempts_used = updates.attemptsUsed;
    if (updates.currentRound !== undefined) updateData.current_round = updates.currentRound;
    if (updates.roundsUsed !== undefined) updateData.rounds_used = updates.roundsUsed;
    if (updates.endTime !== undefined) updateData.end_time = updates.endTime.toISOString();
    if (updates.totalTime !== undefined) updateData.total_time = updates.totalTime;

    const { data, error } = await this.supabase
      .from('termo_games')
      .update(updateData)
      .eq('id', gameId)
      .select()
      .single();

    if (error) throw error;
    return this.mapToGameState(data);
  }

  async getGameByUserAndDate(userId: string, date: string): Promise<ITermoGameState | null> {
    const { data, error } = await this.supabase
      .from('termo_games')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapToGameState(data);
  }

  async getUserStats(userId: string): Promise<ITermoUserStats | null> {
    const { data, error } = await this.supabase
      .from('termo_user_stats')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      userId: data.user_id,
      gamesPlayed: data.games_played,
      gamesWon: data.games_won,
      currentStreak: data.current_streak,
      maxStreak: data.max_streak,
      averageAttempts: data.average_attempts,
      averageTime: data.average_time,
      bestTime: data.best_time,
      lastPlayedDate: data.last_played_date
    };
  }

  async updateUserStats(userId: string, stats: Partial<ITermoUserStats>): Promise<void> {
    const updateData: any = {};
    
    if (stats.gamesPlayed !== undefined) updateData.games_played = stats.gamesPlayed;
    if (stats.gamesWon !== undefined) updateData.games_won = stats.gamesWon;
    if (stats.currentStreak !== undefined) updateData.current_streak = stats.currentStreak;
    if (stats.maxStreak !== undefined) updateData.max_streak = stats.maxStreak;
    if (stats.averageAttempts !== undefined) updateData.average_attempts = stats.averageAttempts;
    if (stats.averageTime !== undefined) updateData.average_time = stats.averageTime;
    if (stats.bestTime !== undefined) updateData.best_time = stats.bestTime;
    if (stats.lastPlayedDate !== undefined) updateData.last_played_date = stats.lastPlayedDate;

    const { error } = await this.supabase
      .from('termo_user_stats')
      .upsert({
        user_id: userId,
        ...updateData
      }, { onConflict: 'user_id' });

    if (error) {
      throw new Error(`Erro ao atualizar estatísticas: ${error.message}`);
    }
  }

  async getDailyRanking(date: string): Promise<ITermoRanking[]> {
    const { data, error } = await this.supabase
      .from('termo_rankings')
      .select(`
        *
      `)
      .eq('date', date)
      .order('position', { ascending: true });

    if (error) {
      throw new Error(`Erro ao buscar ranking: ${error.message}`);
    }

    return (data || []).map((item) => ({
      userId: item.user_id,
      userName: item.user_id, // Usando user_id como identificador temporário
      attemptsUsed: item.attempts_used,
      totalTime: item.total_time,
      completedAt: new Date(item.created_at), // Usando created_at como data de conclusão
      date: item.date,
      position: item.position
    }));
  }

  async addToRanking(ranking: Omit<ITermoRanking, 'position'>): Promise<void> {
    // Buscar a palavra do dia para incluir no ranking
    const { data: dailyWord } = await this.supabase
      .from('termo_daily_words')
      .select('word, word_length')
      .eq('date', ranking.date)
      .single();

    if (!dailyWord) {
      throw new Error('Palavra do dia não encontrada');
    }

    // Calcular pontuação usando a função do banco
    const { data: scoreData } = await this.supabase
      .rpc('calculate_termo_score', {
        attempts: ranking.attemptsUsed,
        time_seconds: ranking.totalTime
      });

    const score = scoreData || 0;

    const { error } = await this.supabase
      .from('termo_rankings')
      .upsert({
        user_id: ranking.userId,
        date: ranking.date,
        word: dailyWord.word,
        word_length: dailyWord.word_length,
        attempts_used: ranking.attemptsUsed,
        total_time: ranking.totalTime,
        score: score
      });

    if (error) {
      throw new Error(`Erro ao adicionar ao ranking: ${error.message}`);
    }

    // Atualizar posições do ranking diário
    await this.supabase.rpc('update_daily_ranking_positions', {
      ranking_date: ranking.date
    });
  }

  private mapToGameState(data: any): ITermoGameState {
    return {
      id: data.id,
      userId: data.user_id,
      word: data.word,
      wordLength: data.word_length,
      guesses: data.guesses || [],
      isCompleted: data.is_completed || false,
      isWon: data.is_won || false,
      attemptsUsed: data.attempts_used || 0,
      maxAttempts: data.max_attempts || 6,
      currentRound: data.current_round || 1,
      maxRounds: data.max_rounds || 3,
      roundsUsed: data.rounds_used || 0,
      startTime: data.start_time ? new Date(data.start_time) : undefined,
      endTime: data.end_time ? new Date(data.end_time) : undefined,
      totalTime: data.total_time,
      date: data.date,
      createdAt: data.created_at ? new Date(data.created_at) : undefined,
      updatedAt: data.updated_at ? new Date(data.updated_at) : undefined
    };
  }
}