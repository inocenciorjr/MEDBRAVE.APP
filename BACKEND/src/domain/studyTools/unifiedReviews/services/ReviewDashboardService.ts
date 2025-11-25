import { SupabaseClient } from '@supabase/supabase-js';
import { AppError } from '../../../../shared/errors/AppError';
import { logger } from '../../../../utils/logger';
import { UnifiedContentType, FSRSState } from '../types';

export interface ReviewDashboard {
  total_due: number;
  completed_today: number;
  estimated_time_minutes: number;
  days_until_exam: number | null;
  
  breakdown: {
    questions: number;
    flashcards: number;
    errors: number;
  };
  
  state_breakdown: {
    new: number;
    learning: number;
    review: number;
    relearning: number;
  };
  
  study_mode: 'intensive' | 'balanced' | 'relaxed';
  max_interval_days: number;
}

export class ReviewDashboardService {
  constructor(
    private supabase: SupabaseClient,
    private unifiedReviewService: any,
    private preferencesService: any
  ) {}

  async getReviewDashboard(userId: string): Promise<ReviewDashboard> {
    try {
      const prefs = await this.preferencesService.getPreferences(userId);
      const dueItems = await this.unifiedReviewService.getDueReviews(userId, 1000);
      const todayReviews = await this.unifiedReviewService.getTodayReviews(userId, 1000);
      
      // Calcular tempo estimado (45 segundos por item)
      const avgTimePerItem = 45;
      const estimatedTimeMinutes = Math.ceil((dueItems.length * avgTimePerItem) / 60);
      
      // Calcular dias até a prova
      let daysUntilExam = null;
      if (prefs.exam_date) {
        const now = new Date();
        const examDate = new Date(prefs.exam_date);
        daysUntilExam = Math.ceil((examDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      }
      
      // Breakdown por tipo
      const breakdown = {
        questions: dueItems.filter((i: any) => i.content_type === UnifiedContentType.QUESTION).length,
        flashcards: dueItems.filter((i: any) => i.content_type === UnifiedContentType.FLASHCARD).length,
        errors: dueItems.filter((i: any) => i.content_type === UnifiedContentType.ERROR_NOTEBOOK).length,
      };
      
      // Breakdown por estado
      const stateBreakdown = {
        new: dueItems.filter((i: any) => i.state === FSRSState.NEW || i.state === 'NEW').length,
        learning: dueItems.filter((i: any) => i.state === FSRSState.LEARNING || i.state === 'LEARNING').length,
        review: dueItems.filter((i: any) => i.state === FSRSState.REVIEW || i.state === 'REVIEW').length,
        relearning: dueItems.filter((i: any) => i.state === FSRSState.RELEARNING || i.state === 'RELEARNING').length,
      };
      
      return {
        total_due: dueItems.length,
        completed_today: todayReviews.length,
        estimated_time_minutes: estimatedTimeMinutes,
        days_until_exam: daysUntilExam,
        breakdown,
        state_breakdown: stateBreakdown,
        study_mode: prefs.study_mode || 'balanced',
        max_interval_days: prefs.max_interval_days || 21,
      };
    } catch (error) {
      logger.error('Erro ao buscar dashboard:', error);
      throw new AppError('Erro ao buscar dashboard de revisões', 500);
    }
  }

  async activateCrammingMode(userId: string, examDate: Date): Promise<void> {
    try {
      const now = new Date();
      const daysUntilExam = Math.ceil((examDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      // Cramming: Limitar a no máximo 15 dias (modo urgente)
      const crammingDays = Math.min(daysUntilExam, 15);
      
      logger.info(`🎯 Ativando cramming: prova em ${daysUntilExam} dias, cramming em ${crammingDays} dias`);
      
      // Atualizar preferências COM TODOS OS CAMPOS NECESSÁRIOS
      const updatedPrefs = await this.preferencesService.updatePreferences(userId, {
        exam_date: examDate,
        study_mode: 'intensive',
        max_interval_days: crammingDays, // Usa dias até a prova (máx 15)
        daily_reviews_limit: 200,
        auto_adjust_mode: true, // Garantir que está em modo automático
      });
      
      logger.info(`✅ Preferências atualizadas:`, {
        study_mode: updatedPrefs.study_mode,
        max_interval_days: updatedPrefs.max_interval_days,
        daily_reviews_limit: updatedPrefs.daily_reviews_limit,
      });
      
      // Buscar cards que excedem os dias até a prova
      const limitDate = new Date(now.getTime() + crammingDays * 24 * 60 * 60 * 1000);
      
      const { data: cards } = await this.supabase
        .from('fsrs_cards')
        .select('*')
        .eq('user_id', userId)
        .gt('due', limitDate.toISOString());
      
      if (cards && cards.length > 0) {
        // Distribuir cards uniformemente até a data da prova
        const cardsPerDay = Math.ceil(cards.length / crammingDays);
        
        for (let i = 0; i < cards.length; i++) {
          const dayOffset = Math.floor(i / cardsPerDay);
          const newDue = new Date(now);
          newDue.setDate(newDue.getDate() + dayOffset);
          
          await this.supabase
            .from('fsrs_cards')
            .update({
              due: newDue.toISOString(),
              scheduled_days: dayOffset,
              updated_at: now.toISOString()
            })
            .eq('id', cards[i].id);
        }
        
        logger.info(`Modo Pré-Prova ativado para usuário ${userId}, ${cards.length} cards reagendados em ${crammingDays} dias (prova em ${daysUntilExam} dias)`);
      }
    } catch (error) {
      logger.error('Erro ao ativar modo Pré-Prova:', error);
      throw new AppError('Erro ao ativar modo Pré-Prova', 500);
    }
  }
}
