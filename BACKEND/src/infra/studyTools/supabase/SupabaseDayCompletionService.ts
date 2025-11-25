import { SupabaseClient } from '@supabase/supabase-js';
import { AppError } from '../../../shared/errors/AppError';
import { logger } from '../../../utils/logger';

export enum CompletionType {
  MANUAL = 'MANUAL',
  AUTO_BY_LIMIT = 'AUTO_BY_LIMIT',
  AUTO_BY_TIME = 'AUTO_BY_TIME',
  AUTO_BY_ITEMS = 'AUTO_BY_ITEMS',
}

export interface DayCompletion {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD format
  completionType: CompletionType;

  // Estatísticas do dia
  totalItemsReviewed: number;
  questionsReviewed: number;
  flashcardsReviewed: number;
  errorNotebookReviewed: number;

  // Tempo e performance
  totalTimeMinutes: number;
  averageResponseTimeSeconds: number;
  accuracyPercentage: number;

  // Dados de completação
  completedAt: Date;
  manualNotes?: string;

  // Metas atingidas
  targetItemsMet: boolean;
  targetTimeMet: boolean;
  consistencyBonus: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export interface DayCompletionStats {
  currentStreak: number;
  longestStreak: number;
  totalCompletedDays: number;
  completionRate: number;
  averageItemsPerDay: number;
  averageTimePerDay: number;
  lastCompletionDate: string | null;
}

export interface CompletionSuggestion {
  shouldComplete: boolean;
  reason: string;
  completionType: CompletionType;
  stats: {
    itemsReviewed: number;
    timeSpent: number;
    accuracy: number;
  };
}

export class SupabaseDayCompletionService {
  private supabase: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient;
  }

  async completeDayStudy(
    userId: string,
    completionType: CompletionType,
    stats: {
      totalItemsReviewed: number;
      questionsReviewed: number;
      flashcardsReviewed: number;
      errorNotebookReviewed: number;
      totalTimeMinutes: number;
      averageResponseTimeSeconds?: number;
      accuracyPercentage?: number;
    },
    manualNotes?: string,
  ): Promise<DayCompletion> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const now = new Date();

      // Check if day is already completed
      const existing = await this.getTodayCompletion(userId);
      if (existing) {
        throw new AppError('Day already completed', 400);
      }

      // Get user's daily limits to check targets
      const { data: limitsData } = await this.supabase
        .from('daily_limits')
        .select('*')
        .eq('user_id', userId)
        .single();

      const targetItemsMet = limitsData
        ? stats.totalItemsReviewed >= limitsData.max_daily_reviews
        : stats.totalItemsReviewed >= 20; // default target

      const targetTimeMet = limitsData
        ? stats.totalTimeMinutes >= limitsData.max_daily_time_minutes
        : stats.totalTimeMinutes >= 60; // default target

      // Check consistency bonus (studied yesterday)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayString = yesterday.toISOString().split('T')[0];

      const { data: yesterdayCompletion } = await this.supabase
        .from('day_completions')
        .select('id')
        .eq('user_id', userId)
        .eq('date', yesterdayString)
        .single();

      const consistencyBonus = !!yesterdayCompletion;

      const { data, error } = await this.supabase
        .from('day_completions')
        .insert({
          userId: userId,
          date: today,
          completionType: completionType,
          totalItemsReviewed: stats.totalItemsReviewed,
          questionsReviewed: stats.questionsReviewed,
          flashcardsReviewed: stats.flashcardsReviewed,
          errorNotebookReviewed: stats.errorNotebookReviewed,
          totalTimeMinutes: stats.totalTimeMinutes,
          averageResponseTimeSeconds: stats.averageResponseTimeSeconds || 0,
          accuracyPercentage: stats.accuracyPercentage || 0,
          completedAt: now.toISOString(),
          manualNotes: manualNotes,
          targetItemsMet: targetItemsMet,
          targetTimeMet: targetTimeMet,
          consistencyBonus: consistencyBonus,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        })
        .select('*')
        .single();

      if (error) {
        logger.error('Error completing day study:', error);
        throw new AppError('Failed to complete day study', 500);
      }

      return this.mapToDayCompletion(data);
    } catch (error) {
      logger.error('Error in completeDayStudy:', error);
      throw error;
    }
  }

  async getTodayCompletion(userId: string): Promise<DayCompletion | null> {
    try {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await this.supabase
        .from('day_completions')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .single();

      if (error && error.code !== 'PGRST116') {
        logger.error('Error fetching today completion:', error);
        throw new AppError('Failed to fetch today completion', 500);
      }

      return data ? this.mapToDayCompletion(data) : null;
    } catch (error) {
      logger.error('Error in getTodayCompletion:', error);
      throw error;
    }
  }

  async getDayCompletionStats(userId: string): Promise<DayCompletionStats> {
    try {
      // Get all completions for stats calculation
      const { data: completions, error } = await this.supabase
        .from('day_completions')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (error) {
        logger.error('Error fetching completion stats:', error);
        throw new AppError('Failed to fetch completion stats', 500);
      }

      const completionList = completions?.map(this.mapToDayCompletion) || [];
      const totalCompletedDays = completionList.length;

      if (totalCompletedDays === 0) {
        return {
          currentStreak: 0,
          longestStreak: 0,
          totalCompletedDays: 0,
          completionRate: 0,
          averageItemsPerDay: 0,
          averageTimePerDay: 0,
          lastCompletionDate: null,
        };
      }

      // Calculate current streak
      const currentStreak = this.calculateCurrentStreak(completionList);

      // Calculate longest streak
      const longestStreak = this.calculateLongestStreak(completionList);

      // Calculate completion rate (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentCompletions = completionList.filter(
        (c) => new Date(c.date) >= thirtyDaysAgo,
      );
      const completionRate = (recentCompletions.length / 30) * 100;

      // Calculate averages
      const totalItems = completionList.reduce(
        (sum, c) => sum + c.totalItemsReviewed,
        0,
      );
      const totalTime = completionList.reduce(
        (sum, c) => sum + c.totalTimeMinutes,
        0,
      );
      const averageItemsPerDay = totalItems / totalCompletedDays;
      const averageTimePerDay = totalTime / totalCompletedDays;

      const lastCompletionDate =
        completionList.length > 0 ? completionList[0].date : null;

      return {
        currentStreak,
        longestStreak,
        totalCompletedDays,
        completionRate: Math.round(completionRate * 100) / 100,
        averageItemsPerDay: Math.round(averageItemsPerDay * 100) / 100,
        averageTimePerDay: Math.round(averageTimePerDay * 100) / 100,
        lastCompletionDate,
      };
    } catch (error) {
      logger.error('Error in getDayCompletionStats:', error);
      throw error;
    }
  }

  async suggestDayCompletion(
    userId: string,
    stats: {
      itemsReviewed: number;
      timeSpent: number;
      accuracy: number;
    },
  ): Promise<CompletionSuggestion> {
    try {
      // Get user's daily limits
      const { data: limitsData } = await this.supabase
        .from('daily_limits')
        .select('*')
        .eq('user_id', userId)
        .single();

      const targetItems = limitsData?.max_daily_reviews || 20;
      const targetTime = limitsData?.max_daily_time_minutes || 60;

      let shouldComplete = false;
      let reason = '';
      let completionType = CompletionType.MANUAL;

      if (stats.itemsReviewed >= targetItems) {
        shouldComplete = true;
        reason = `Você atingiu sua meta de ${targetItems} itens revisados!`;
        completionType = CompletionType.AUTO_BY_ITEMS;
      } else if (stats.timeSpent >= targetTime) {
        shouldComplete = true;
        reason = `Você atingiu sua meta de ${targetTime} minutos de estudo!`;
        completionType = CompletionType.AUTO_BY_TIME;
      } else if (
        stats.itemsReviewed >= targetItems * 0.8 &&
        stats.timeSpent >= targetTime * 0.8
      ) {
        shouldComplete = true;
        reason = 'Você está próximo das suas metas. Considere finalizar o dia!';
        completionType = CompletionType.MANUAL;
      } else if (stats.accuracy >= 85 && stats.itemsReviewed >= 10) {
        shouldComplete = true;
        reason = `Excelente performance! ${stats.accuracy}% de acerto com ${stats.itemsReviewed} itens.`;
        completionType = CompletionType.MANUAL;
      }

      return {
        shouldComplete,
        reason,
        completionType,
        stats,
      };
    } catch (error) {
      logger.error('Error in suggestDayCompletion:', error);
      throw error;
    }
  }

  async getCompletionHistory(
    userId: string,
    days: number = 30,
  ): Promise<DayCompletion[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateString = startDate.toISOString().split('T')[0];

      const { data, error } = await this.supabase
        .from('day_completions')
        .select('*')
        .eq('user_id', userId)
        .gte('date', startDateString)
        .order('date', { ascending: false });

      if (error) {
        logger.error('Error fetching completion history:', error);
        throw new AppError('Failed to fetch completion history', 500);
      }

      return data?.map(this.mapToDayCompletion) || [];
    } catch (error) {
      logger.error('Error in getCompletionHistory:', error);
      throw error;
    }
  }

  private calculateCurrentStreak(completions: DayCompletion[]): number {
    if (completions.length === 0) {
      return 0;
    }

    let streak = 0;
    const today = new Date();
    let checkDate = new Date(today);

    // Sort by date descending
    const sortedCompletions = completions.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    for (const completion of sortedCompletions) {
      const completionDate = new Date(completion.date);
      const checkDateString = checkDate.toISOString().split('T')[0];

      if (completion.date === checkDateString) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        // Check if there's a gap
        const daysDiff = Math.floor(
          (checkDate.getTime() - completionDate.getTime()) /
            (1000 * 60 * 60 * 24),
        );

        if (daysDiff > 1) {
          break; // Gap found, streak ends
        } else if (daysDiff === 1) {
          streak++;
          checkDate = new Date(completionDate);
          checkDate.setDate(checkDate.getDate() - 1);
        }
      }
    }

    return streak;
  }

  private calculateLongestStreak(completions: DayCompletion[]): number {
    if (completions.length === 0) {
      return 0;
    }

    const sortedCompletions = completions.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    let longestStreak = 1;
    let currentStreak = 1;
    let previousDate = new Date(sortedCompletions[0].date);

    for (let i = 1; i < sortedCompletions.length; i++) {
      const currentDate = new Date(sortedCompletions[i].date);
      const daysDiff = Math.floor(
        (currentDate.getTime() - previousDate.getTime()) /
          (1000 * 60 * 60 * 24),
      );

      if (daysDiff === 1) {
        currentStreak++;
        longestStreak = Math.max(longestStreak, currentStreak);
      } else {
        currentStreak = 1;
      }

      previousDate = currentDate;
    }

    return longestStreak;
  }

  private mapToDayCompletion(data: any): DayCompletion {
    return {
      id: data.id,
      userId: data.userId,
      date: data.date,
      completionType: data.completionType as CompletionType,
      totalItemsReviewed: data.totalItemsReviewed,
      questionsReviewed: data.questionsReviewed,
      flashcardsReviewed: data.flashcardsReviewed,
      errorNotebookReviewed: data.errorNotebookReviewed,
      totalTimeMinutes: data.totalTimeMinutes,
      averageResponseTimeSeconds: data.averageResponseTimeSeconds,
      accuracyPercentage: data.accuracyPercentage,
      completedAt: new Date(data.completedAt),
      manualNotes: data.manualNotes,
      targetItemsMet: data.targetItemsMet,
      targetTimeMet: data.targetTimeMet,
      consistencyBonus: data.consistencyBonus,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    };
  }
}
