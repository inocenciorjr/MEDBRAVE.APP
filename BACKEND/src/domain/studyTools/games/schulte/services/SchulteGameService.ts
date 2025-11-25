import { SupabaseClient } from '@supabase/supabase-js';

import { SchulteGameRepository } from '../repositories/SchulteGameRepository';

interface ISchulteGame {
  id: string;
  user_id: string;
  grid_size: number;
  is_inverse: boolean;
  time_taken: number; // Represented as SECONDS with 2 decimals when returned to client
  completed: boolean;
  date: string;
  created_at: string;
}

interface ISchulteUserStats {
  id: string;
  user_id: string;
  games_played: number;
  total_time: number; // SECONDS with 2 decimals when returned to client
  best_times: Record<string, number>; // Values in SECONDS with 2 decimals when returned to client
  created_at: string;
  updated_at: string;
}

interface ISchulteRanking {
  grid_size: number;
  user_id: string;
  best_time: number; // SECONDS with 2 decimals when returned to client
  is_inverse: boolean;
  updated_at: string;
}

export class SchulteGameService {
  private gameRepository: SchulteGameRepository;

  constructor(supabase: SupabaseClient) {
    this.gameRepository = new SchulteGameRepository(supabase);
  }

  private getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  async startGame(userId: string, gridSize: number, isInverse: boolean): Promise<ISchulteGame> {
    const today = this.getTodayDate();
    const gameData = {
      user_id: userId,
      grid_size: gridSize,
      is_inverse: isInverse,
      time_taken: 0, // stored as centiseconds in DB
      completed: false,
      date: today
    };
    return await this.gameRepository.createGame(gameData);
  }

  async completeGame(gameId: string, timeTaken: number, userId?: string): Promise<ISchulteGame> {
    const game = await this.gameRepository.getGameById(gameId);
    if (!game || game.completed) {
      throw new Error('Jogo não encontrado ou já completado');
    }

    if (userId && game.user_id !== userId) {
      throw new Error('Não autorizado');
    }

    // Store as centiseconds (INTEGER) to keep 2-decimal precision without changing schema
    const centiseconds = Math.max(0, Math.round(Number(timeTaken) * 100));

    const updates = {
      time_taken: centiseconds,
      completed: true
    };

    const updatedRow = await this.gameRepository.updateGame(gameId, updates);

    // Use centiseconds internally for stats/ranking calculations
    const internalGame = { ...updatedRow, time_taken: centiseconds } as ISchulteGame;

    await this.updateUserStats(updatedRow.user_id, internalGame);
    await this.updateRanking(updatedRow.user_id, internalGame);

    // Return to client in seconds with 2 decimals
    const responseGame = { ...updatedRow, time_taken: Number((centiseconds / 100).toFixed(2)) } as ISchulteGame;
    return responseGame;
  }

  private async updateUserStats(userId: string, game: ISchulteGame): Promise<void> {
    let stats = await this.gameRepository.getUserStats(userId);

    if (!stats) {
      stats = {
        user_id: userId,
        games_played: 0,
        total_time: 0, // centiseconds in DB
        best_times: {}
      };
      await this.gameRepository.createUserStats(stats);
    }

    const key = `${game.grid_size}_${game.is_inverse ? 'inverse' : 'standard'}`;
    const currentBest = stats.best_times[key] || Infinity; // centiseconds
    const newBest = Math.min(currentBest, game.time_taken); // centiseconds

    const updates = {
      games_played: stats.games_played + 1,
      total_time: stats.total_time + game.time_taken, // accumulate centiseconds
      best_times: {
        ...stats.best_times,
        [key]: newBest
      }
    };

    await this.gameRepository.updateUserStats(userId, updates);
  }

  private async updateRanking(userId: string, game: ISchulteGame): Promise<void> {
    const existing = await this.gameRepository.getRankingEntry(userId, game.grid_size, game.is_inverse);
    const currentBest = existing ? existing.best_time : Infinity; // centiseconds
    if (game.time_taken < currentBest) {
      await this.gameRepository.upsertRanking({
        user_id: userId,
        grid_size: game.grid_size,
        best_time: game.time_taken, // centiseconds
        is_inverse: game.is_inverse
      });
    }
  }

  async getUserStats(userId: string): Promise<ISchulteUserStats | null> {
    const stats = await this.gameRepository.getUserStats(userId);
    if (!stats) return null;

    // Convert centiseconds to seconds with 2 decimals for client
    const bestTimesSeconds: Record<string, number> = {};
    for (const [k, v] of Object.entries(stats.best_times || {})) {
      bestTimesSeconds[k] = Number(((v as number) / 100).toFixed(2));
    }

    return {
      ...stats,
      total_time: Number(((stats.total_time || 0) / 100).toFixed(2)),
      best_times: bestTimesSeconds
    } as ISchulteUserStats;
  }

  async getRanking(gridSize: number, isInverse: boolean, limit: number = 10): Promise<ISchulteRanking[]> {
    const rows = await this.gameRepository.getRanking(gridSize, isInverse, limit);
    // Convert best_time to seconds for client
    return rows.map((r: any) => ({
      ...r,
      best_time: Number(((r.best_time || 0) / 100).toFixed(2))
    }));
  }

  async getUserBestTime(userId: string, gridSize: number, isInverse: boolean): Promise<number | null> {
    const stats = await this.getUserStats(userId);
    if (!stats) return null;
    const key = `${gridSize}_${isInverse ? 'inverse' : 'standard'}`;
    return stats.best_times[key] || null; // seconds with 2 decimals
  }
}