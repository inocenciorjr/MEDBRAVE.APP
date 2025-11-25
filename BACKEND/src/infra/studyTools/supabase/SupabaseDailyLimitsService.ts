import { SupabaseClient } from '@supabase/supabase-js';
import { AppError } from '../../../shared/errors/AppError';
import { logger } from '../../../utils/logger';

export interface DailyLimits {
  id: string;
  userId: string;
  maxDailyReviews: number;
  maxDailyNewItems: number;
  maxDailyTimeMinutes: number;
  enableAutoStop: boolean;
  enableSmartLimits: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DailyProgress {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD format
  reviewsCompleted: number;
  newItemsAdded: number;
  timeSpentMinutes: number;
  questionsReviewed: number;
  flashcardsReviewed: number;
  errorNotebookReviewed: number;
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface DailyLimitStatus {
  canContinueReviewing: boolean;
  canAddNewItems: boolean;
  remainingReviews: number;
  remainingNewItems: number;
  remainingTimeMinutes: number;
  progress: DailyProgress;
  limits: DailyLimits;
  warnings: string[];
}

export class SupabaseDailyLimitsService {
  private supabase: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient;
  }

  async getDailyLimits(userId: string): Promise<DailyLimits | null> {
    try {
      const { data, error } = await this.supabase
        .from('daily_limits')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows returned
        logger.error('Error fetching daily limits:', error);
        throw new AppError('Failed to fetch daily limits', 500);
      }

      return data ? this.mapToDailyLimits(data) : null;
    } catch (error) {
      logger.error('Error in getDailyLimits:', error);
      throw error;
    }
  }

  async setDailyLimits(
    userId: string,
    limits: {
      maxDailyReviews: number;
      maxDailyNewItems: number;
      maxDailyTimeMinutes: number;
      enableAutoStop: boolean;
      enableSmartLimits: boolean;
    },
  ): Promise<DailyLimits> {
    try {
      const now = new Date();

      const { data, error } = await this.supabase
        .from('daily_limits')
        .upsert({
          user_id: userId,
          max_daily_reviews: limits.maxDailyReviews,
          max_daily_new_items: limits.maxDailyNewItems,
          max_daily_time_minutes: limits.maxDailyTimeMinutes,
          enable_auto_stop: limits.enableAutoStop,
          enable_smart_limits: limits.enableSmartLimits,
          updated_at: now.toISOString(),
        })
        .select('*')
        .single();

      if (error) {
        logger.error('Error setting daily limits:', error);
        throw new AppError('Failed to set daily limits', 500);
      }

      return this.mapToDailyLimits(data);
    } catch (error) {
      logger.error('Error in setDailyLimits:', error);
      throw error;
    }
  }

  async getDailyProgress(
    userId: string,
    date?: Date,
  ): Promise<DailyProgress | null> {
    try {
      const targetDate = date || new Date();
      const dateString = targetDate.toISOString().split('T')[0];

      const { data, error } = await this.supabase
        .from('daily_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('date', dateString)
        .single();

      if (error && error.code !== 'PGRST116') {
        logger.error('Error fetching daily progress:', error);
        throw new AppError('Failed to fetch daily progress', 500);
      }

      return data ? this.mapToDailyProgress(data) : null;
    } catch (error) {
      logger.error('Error in getDailyProgress:', error);
      throw error;
    }
  }

  async checkDailyLimitStatus(userId: string): Promise<DailyLimitStatus> {
    try {
      const limits = await this.getDailyLimits(userId);
      const progress = await this.getDailyProgress(userId);

      // Default limits if none set
      const effectiveLimits: DailyLimits = limits || {
        id: '',
        userId,
        maxDailyReviews: 100,
        maxDailyNewItems: 20,
        maxDailyTimeMinutes: 120,
        enableAutoStop: false,
        enableSmartLimits: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Default progress if none exists
      const effectiveProgress: DailyProgress = progress || {
        id: '',
        userId,
        date: new Date().toISOString().split('T')[0],
        reviewsCompleted: 0,
        newItemsAdded: 0,
        timeSpentMinutes: 0,
        questionsReviewed: 0,
        flashcardsReviewed: 0,
        errorNotebookReviewed: 0,
        lastActivityAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const remainingReviews = Math.max(
        0,
        effectiveLimits.maxDailyReviews - effectiveProgress.reviewsCompleted,
      );
      const remainingNewItems = Math.max(
        0,
        effectiveLimits.maxDailyNewItems - effectiveProgress.newItemsAdded,
      );
      const remainingTimeMinutes = Math.max(
        0,
        effectiveLimits.maxDailyTimeMinutes -
          effectiveProgress.timeSpentMinutes,
      );

      const canContinueReviewing =
        !effectiveLimits.enableAutoStop || remainingReviews > 0;
      const canAddNewItems =
        !effectiveLimits.enableAutoStop || remainingNewItems > 0;

      const warnings: string[] = [];
      if (effectiveLimits.enableAutoStop) {
        if (remainingReviews <= 5) {
          warnings.push(`Apenas ${remainingReviews} revisões restantes hoje`);
        }
        if (remainingNewItems <= 2) {
          warnings.push(
            `Apenas ${remainingNewItems} novos itens restantes hoje`,
          );
        }
        if (remainingTimeMinutes <= 10) {
          warnings.push(
            `Apenas ${remainingTimeMinutes} minutos restantes hoje`,
          );
        }
      }

      return {
        canContinueReviewing,
        canAddNewItems,
        remainingReviews,
        remainingNewItems,
        remainingTimeMinutes,
        progress: effectiveProgress,
        limits: effectiveLimits,
        warnings,
      };
    } catch (error) {
      logger.error('Error in checkDailyLimitStatus:', error);
      throw error;
    }
  }

  async incrementReviewCount(
    userId: string,
    contentType: 'QUESTION' | 'FLASHCARD' | 'ERROR_NOTEBOOK',
    timeSpentMinutes: number = 0,
  ): Promise<DailyProgress> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const now = new Date();

      // Get current progress or create new
      const progress = await this.getDailyProgress(userId);

      if (!progress) {
        // Create new progress entry
        const { data, error } = await this.supabase
          .from('daily_progress')
          .insert({
            user_id: userId,
            date: today,
            reviews_completed: 1,
            new_items_added: 0,
            time_spent_minutes: timeSpentMinutes,
            questions_reviewed: contentType === 'QUESTION' ? 1 : 0,
            flashcards_reviewed: contentType === 'FLASHCARD' ? 1 : 0,
            error_notebook_reviewed: contentType === 'ERROR_NOTEBOOK' ? 1 : 0,
            last_activity_at: now.toISOString(),
            created_at: now.toISOString(),
            updated_at: now.toISOString(),
          })
          .select('*')
          .single();

        if (error) {
          logger.error('Error creating daily progress:', error);
          throw new AppError('Failed to create daily progress', 500);
        }

        return this.mapToDailyProgress(data);
      } else {
        // Update existing progress
        const updates: any = {
          reviews_completed: progress.reviewsCompleted + 1,
          time_spent_minutes: progress.timeSpentMinutes + timeSpentMinutes,
          last_activity_at: now.toISOString(),
          updated_at: now.toISOString(),
        };

        if (contentType === 'QUESTION') {
          updates.questions_reviewed = progress.questionsReviewed + 1;
        } else if (contentType === 'FLASHCARD') {
          updates.flashcards_reviewed = progress.flashcardsReviewed + 1;
        } else if (contentType === 'ERROR_NOTEBOOK') {
          updates.error_notebook_reviewed = progress.errorNotebookReviewed + 1;
        }

        const { data, error } = await this.supabase
          .from('daily_progress')
          .update(updates)
          .eq('user_id', userId)
          .eq('date', today)
          .select('*')
          .single();

        if (error) {
          logger.error('Error updating daily progress:', error);
          throw new AppError('Failed to update daily progress', 500);
        }

        return this.mapToDailyProgress(data);
      }
    } catch (error) {
      logger.error('Error in incrementReviewCount:', error);
      throw error;
    }
  }

  async incrementNewItemCount(userId: string): Promise<DailyProgress> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const now = new Date();

      const progress = await this.getDailyProgress(userId);

      if (!progress) {
        const { data, error } = await this.supabase
          .from('daily_progress')
          .insert({
            user_id: userId,
            date: today,
            reviews_completed: 0,
            new_items_added: 1,
            time_spent_minutes: 0,
            questions_reviewed: 0,
            flashcards_reviewed: 0,
            error_notebook_reviewed: 0,
            last_activity_at: now.toISOString(),
            created_at: now.toISOString(),
            updated_at: now.toISOString(),
          })
          .select('*')
          .single();

        if (error) {
          logger.error('Error creating daily progress for new item:', error);
          throw new AppError('Failed to create daily progress', 500);
        }

        return this.mapToDailyProgress(data);
      } else {
        const { data, error } = await this.supabase
          .from('daily_progress')
          .update({
            new_items_added: progress.newItemsAdded + 1,
            last_activity_at: now.toISOString(),
            updated_at: now.toISOString(),
          })
          .eq('user_id', userId)
          .eq('date', today)
          .select('*')
          .single();

        if (error) {
          logger.error('Error updating daily progress for new item:', error);
          throw new AppError('Failed to update daily progress', 500);
        }

        return this.mapToDailyProgress(data);
      }
    } catch (error) {
      logger.error('Error in incrementNewItemCount:', error);
      throw error;
    }
  }

  async resetDailyProgress(userId: string): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const now = new Date();

      const { error } = await this.supabase.from('daily_progress').upsert({
        user_id: userId,
        date: today,
        reviews_completed: 0,
        new_items_added: 0,
        time_spent_minutes: 0,
        questions_reviewed: 0,
        flashcards_reviewed: 0,
        error_notebook_reviewed: 0,
        last_activity_at: now.toISOString(),
        updated_at: now.toISOString(),
      });

      if (error) {
        logger.error('Error resetting daily progress:', error);
        throw new AppError('Failed to reset daily progress', 500);
      }
    } catch (error) {
      logger.error('Error in resetDailyProgress:', error);
      throw error;
    }
  }

  private mapToDailyLimits(data: any): DailyLimits {
    return {
      id: data.id,
      userId: data.user_id,
      maxDailyReviews: data.max_daily_reviews,
      maxDailyNewItems: data.max_daily_new_items,
      maxDailyTimeMinutes: data.max_daily_time_minutes,
      enableAutoStop: data.enable_auto_stop,
      enableSmartLimits: data.enable_smart_limits,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  private mapToDailyProgress(data: any): DailyProgress {
    return {
      id: data.id,
      userId: data.user_id,
      date: data.date,
      reviewsCompleted: data.reviews_completed,
      newItemsAdded: data.new_items_added,
      timeSpentMinutes: data.time_spent_minutes,
      questionsReviewed: data.questions_reviewed,
      flashcardsReviewed: data.flashcards_reviewed,
      errorNotebookReviewed: data.error_notebook_reviewed,
      lastActivityAt: new Date(data.last_activity_at),
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }
}
