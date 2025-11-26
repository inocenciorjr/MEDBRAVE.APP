import { SupabaseClient } from '@supabase/supabase-js';
import { AppError } from '../../../../shared/errors/AppError';
import { logger } from '../../../../utils/logger';
import { UnifiedContentType } from '../types';

export interface ReviewPreferences {
  id: string;
  user_id: string;
  
  // Sistema ativo/inativo
  reviews_enabled: boolean;
  
  // Auto-Add
  auto_add_questions: boolean;
  auto_add_flashcards: boolean;
  auto_add_error_notebook: boolean;
  
  // Habilitar/Desabilitar
  enable_questions: boolean;
  enable_flashcards: boolean;
  enable_error_notebook: boolean;
  
  // Intervalos
  max_interval_days: number;
  target_retention: number;
  
  // Modo de Estudo (FSRS)
  study_mode: 'intensive' | 'balanced' | 'relaxed';
  auto_adjust_mode: boolean; // Se true, ajusta automaticamente baseado na data da prova
  
  // Prova
  exam_date?: Date;
  
  // Modo de Agendamento
  scheduling_mode: 'traditional' | 'smart';
  
  // Limites (só usado em smart scheduling)
  daily_new_items_limit: number;
  daily_reviews_limit: number;
  
  // Dias de Estudo (0=Domingo, 1=Segunda, ..., 6=Sábado)
  study_days: number[];
  
  // Distribuição de Conteúdo
  content_distribution: {
    questions: number;      // % de questões
    flashcards: number;     // % de flashcards
    error_notebook: number; // % de caderno de erros
  };
  
  // Horários Padrão do Planner
  flashcard_start_hour?: number;
  flashcard_end_hour?: number;
  question_start_hour?: number;
  question_end_hour?: number;
  error_notebook_start_hour?: number;
  error_notebook_end_hour?: number;
  
  created_at: Date;
  updated_at: Date;
}

export class ReviewPreferencesService {
  constructor(private supabase: SupabaseClient) {}

  async getPreferences(userId: string): Promise<ReviewPreferences> {
    try {
      console.error('🔍 [ReviewPreferencesService] Buscando preferências para userId:', userId, 'tipo:', typeof userId);
      
      const { data, error } = await this.supabase
        .from('review_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      console.error('📊 [ReviewPreferencesService] Resultado:', { data, error });

      if (error || !data) {
        // Criar preferências padrão
        console.error('ℹ️ [ReviewPreferencesService] Preferências não encontradas, criando padrão');
        return this.createDefaultPreferences(userId);
      }

      return data as ReviewPreferences;
    } catch (error) {
      console.error('❌ [ReviewPreferencesService] Erro ao buscar preferências:', error);
      logger.error('Erro ao buscar preferências:', error);
      throw new AppError('Erro ao buscar preferências de revisão', 500);
    }
  }

  async createDefaultPreferences(userId: string): Promise<ReviewPreferences> {
    try {
      const defaultPrefs = {
        user_id: userId,
        reviews_enabled: true, // Sistema ativo por padrão
        auto_add_questions: true,
        auto_add_flashcards: true,
        auto_add_error_notebook: true,
        enable_questions: true,
        enable_flashcards: true,
        enable_error_notebook: true,
        max_interval_days: 21,
        target_retention: 0.85,
        study_mode: 'balanced' as const,
        auto_adjust_mode: true,
        scheduling_mode: 'traditional' as const, // Padrão: tradicional (mais flexível)
        daily_new_items_limit: 20,
        daily_reviews_limit: 50, // Padrão: 50 revisões/dia
        study_days: [1, 2, 3, 4, 5, 6, 0], // Todos os dias
        content_distribution: {
          questions: 40,
          flashcards: 30,
          error_notebook: 30,
        },
      };

      const { data, error } = await this.supabase
        .from('review_preferences')
        .insert(defaultPrefs)
        .select()
        .single();

      if (error) {
        logger.error('Erro ao criar preferências padrão:', error);
        throw new AppError('Erro ao criar preferências', 500);
      }

      logger.info(`Preferências padrão criadas para usuário ${userId}`);
      return data as ReviewPreferences;
    } catch (error) {
      logger.error('Erro ao criar preferências padrão:', error);
      throw error;
    }
  }

  /**
   * Atualiza os horários dos eventos do planner
   * @param userId ID do usuário
   * @param updateFutureOnly Se true, atualiza apenas eventos futuros. Se false, atualiza todos (presentes + futuros)
   */
  async updatePlannerEventSchedules(
    userId: string,
    updateFutureOnly: boolean = true
  ): Promise<{ updated: number }> {
    try {
      const prefs = await this.getPreferences(userId);
      const today = new Date().toISOString().split('T')[0];
      
      // Definir horários por tipo
      const schedules = [
        {
          content_type: 'FLASHCARD',
          start_hour: prefs.flashcard_start_hour || 10,
          end_hour: prefs.flashcard_end_hour || 14,
        },
        {
          content_type: 'QUESTION',
          start_hour: prefs.question_start_hour || 15,
          end_hour: prefs.question_end_hour || 17,
        },
        {
          content_type: 'ERROR_NOTEBOOK',
          start_hour: prefs.error_notebook_start_hour || 18,
          end_hour: prefs.error_notebook_end_hour || 20,
        },
      ];
      
      let totalUpdated = 0;
      
      for (const schedule of schedules) {
        // Montar query baseado na opção
        let query = this.supabase
          .from('planner_events')
          .update({
            start_hour: schedule.start_hour,
            start_minute: 0,
            end_hour: schedule.end_hour,
            end_minute: 0,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
          .eq('content_type', schedule.content_type)
          .eq('event_type', 'system_review');
        
        // Se updateFutureOnly, filtrar apenas datas >= hoje
        if (updateFutureOnly) {
          query = query.gte('date', today);
        }
        
        const { data, error } = await query.select('id');
        
        if (error) {
          logger.error(`Erro ao atualizar eventos ${schedule.content_type}:`, error);
        } else {
          const count = data?.length || 0;
          totalUpdated += count;
          logger.info(`✅ ${count} eventos ${schedule.content_type} atualizados`);
        }
      }
      
      logger.info(`✅ Total: ${totalUpdated} eventos atualizados (futureOnly: ${updateFutureOnly})`);
      
      return { updated: totalUpdated };
    } catch (error) {
      logger.error('Erro ao atualizar horários dos eventos:', error);
      throw error;
    }
  }

  async updatePreferences(
    userId: string,
    preferences: Partial<ReviewPreferences>
  ): Promise<ReviewPreferences> {
    try {
      // Remover user_id do objeto de atualização para evitar conflito
      const { user_id, id, created_at, ...updateData } = preferences as any;
      
      logger.info(`📝 Atualizando preferências para ${userId}:`, updateData);
      
      const { data, error } = await this.supabase
        .from('review_preferences')
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        logger.error('❌ Erro ao atualizar preferências:', error);
        throw new AppError('Erro ao atualizar preferências', 500);
      }

      logger.info(`✅ Preferências salvas no banco:`, {
        study_mode: data.study_mode,
        max_interval_days: data.max_interval_days,
        daily_reviews_limit: data.daily_reviews_limit,
        exam_date: data.exam_date,
      });
      
      return data as ReviewPreferences;
    } catch (error) {
      logger.error('❌ Erro ao atualizar preferências:', error);
      throw error;
    }
  }

  /**
   * Conta quantos cards excedem o limite de dias
   */
  async countCardsExceedingLimit(userId: string, maxDays: number): Promise<number> {
    try {
      const now = new Date();
      const limitDate = new Date(now.getTime() + maxDays * 24 * 60 * 60 * 1000);
      
      const { count, error } = await this.supabase
        .from('fsrs_cards')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gt('due', limitDate.toISOString());
      
      if (error) {
        logger.error('Erro ao contar cards:', error);
        return 0;
      }
      
      return count || 0;
    } catch (error) {
      logger.error('Erro ao contar cards excedendo limite:', error);
      return 0;
    }
  }

  /**
   * Reagenda cards que excedem o limite máximo
   */
  async rescheduleCardsExceedingLimit(userId: string, maxDays: number): Promise<number> {
    try {
      const now = new Date();
      const limitDate = new Date(now.getTime() + maxDays * 24 * 60 * 60 * 1000);
      
      // Buscar cards que excedem o limite
      const { data: cards, error } = await this.supabase
        .from('fsrs_cards')
        .select('*')
        .eq('user_id', userId)
        .gt('due', limitDate.toISOString());
      
      if (error || !cards || cards.length === 0) {
        return 0;
      }
      
      // Reagendar para o limite máximo
      for (const card of cards) {
        await this.supabase
          .from('fsrs_cards')
          .update({
            due: limitDate.toISOString(),
            scheduled_days: maxDays,
            updated_at: now.toISOString()
          })
          .eq('id', card.id);
      }
      
      logger.info(`${cards.length} cards reagendados para limite de ${maxDays} dias`);
      return cards.length;
    } catch (error) {
      logger.error('Erro ao reagendar cards:', error);
      throw error;
    }
  }

  async shouldAutoAdd(
    userId: string,
    contentType: UnifiedContentType
  ): Promise<boolean> {
    try {
      const prefs = await this.getPreferences(userId);

      switch (contentType) {
        case UnifiedContentType.QUESTION:
          return prefs.auto_add_questions && prefs.enable_questions;
        case UnifiedContentType.FLASHCARD:
          return prefs.auto_add_flashcards && prefs.enable_flashcards;
        case UnifiedContentType.ERROR_NOTEBOOK:
          return prefs.auto_add_error_notebook && prefs.enable_error_notebook;
        default:
          return false;
      }
    } catch (error) {
      logger.error('Erro ao verificar auto-add:', error);
      // Em caso de erro, retornar true (comportamento padrão)
      return true;
    }
  }

  async isContentTypeEnabled(
    userId: string,
    contentType: UnifiedContentType
  ): Promise<boolean> {
    try {
      const prefs = await this.getPreferences(userId);

      switch (contentType) {
        case UnifiedContentType.QUESTION:
          return prefs.enable_questions;
        case UnifiedContentType.FLASHCARD:
          return prefs.enable_flashcards;
        case UnifiedContentType.ERROR_NOTEBOOK:
          return prefs.enable_error_notebook;
        default:
          return false;
      }
    } catch (error) {
      logger.error('Erro ao verificar tipo habilitado:', error);
      // Em caso de erro, retornar true (comportamento padrão)
      return true;
    }
  }

  calculateDaysUntilExam(examDate: Date): number {
    const now = new Date();
    const diff = examDate.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  /**
   * Calcula distribuição de conteúdo baseado nos tipos habilitados
   */
  calculateContentDistribution(prefs: ReviewPreferences): { questions: number; flashcards: number; error_notebook: number } {
    const enabled = {
      questions: prefs.enable_questions,
      flashcards: prefs.enable_flashcards,
      error_notebook: prefs.enable_error_notebook,
    };

    const enabledCount = Object.values(enabled).filter(Boolean).length;

    // Questões sempre habilitadas (obrigatório)
    if (enabledCount === 3) {
      return { questions: 40, flashcards: 30, error_notebook: 30 };
    } else if (enabledCount === 2) {
      if (enabled.questions && enabled.flashcards) {
        return { questions: 60, flashcards: 40, error_notebook: 0 };
      } else if (enabled.questions && enabled.error_notebook) {
        return { questions: 60, flashcards: 0, error_notebook: 40 };
      }
    }
    
    // Só questões
    return { questions: 100, flashcards: 0, error_notebook: 0 };
  }

  /**
   * Verifica se é um dia de estudo
   */
  isStudyDay(date: Date, studyDays: number[]): boolean {
    const dayOfWeek = date.getDay(); // 0-6
    return studyDays.includes(dayOfWeek);
  }

  /**
   * Encontra o próximo dia de estudo
   */
  findNextStudyDay(startDate: Date, studyDays: number[]): Date {
    let currentDate = new Date(startDate);
    let attempts = 0;
    const maxAttempts = 14; // Não buscar além de 2 semanas

    while (attempts < maxAttempts) {
      if (this.isStudyDay(currentDate, studyDays)) {
        return currentDate;
      }
      currentDate.setDate(currentDate.getDate() + 1);
      attempts++;
    }

    // Se não achou em 2 semanas, retornar data original
    return startDate;
  }

  /**
   * Calcula limite diário por tipo de conteúdo
   */
  getDailyLimitForType(
    prefs: ReviewPreferences,
    contentType: UnifiedContentType
  ): number {
    if (prefs.scheduling_mode === 'traditional') {
      return Infinity; // Sem limite no modo tradicional
    }

    const distribution = prefs.content_distribution;
    const totalLimit = prefs.daily_reviews_limit;

    switch (contentType) {
      case UnifiedContentType.QUESTION:
        return Math.floor(totalLimit * (distribution.questions / 100));
      case UnifiedContentType.FLASHCARD:
        return Math.floor(totalLimit * (distribution.flashcards / 100));
      case UnifiedContentType.ERROR_NOTEBOOK:
        return Math.floor(totalLimit * (distribution.error_notebook / 100));
      default:
        return totalLimit;
    }
  }
}
