import { SupabaseClient } from '@supabase/supabase-js';
import {
  UnifiedReviewService,
  UnifiedReviewItem,
  UnifiedContentType,
  DailyReviewSummary,
} from '../../../domain/studyTools/unifiedReviews/types';
import { AppError } from '../../../shared/errors/AppError';
import { SupabaseUnifiedReviewRepository } from './SupabaseUnifiedReviewRepository';
import { TimezoneService } from '../../../domain/user/services/TimezoneService';
import { PlannerService } from '../../../domain/planner/services/PlannerService';

import { logger } from '../../../utils/logger';
import { generateReviewId } from '../../../utils/idGenerator';
import { v5 as uuidv5 } from 'uuid';

// FSRS Types and Enums
export enum FSRSGrade {
  AGAIN = 0, // Falha - esqueceu completamente
  HARD = 1, // Difícil - lembrou com muita dificuldade
  GOOD = 2, // Bom - lembrou com alguma dificuldade
  EASY = 3, // Fácil - lembrou facilmente
}

export enum FSRSState {
  NEW = 'NEW',
  LEARNING = 'LEARNING',
  REVIEW = 'REVIEW',
  RELEARNING = 'RELEARNING',
}

export interface FSRSCard {
  id: string;
  user_id: string;
  content_id: string;
  deck_id: string;
  content_type: UnifiedContentType;

  // Parâmetros FSRS
  due: Date;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: FSRSState;
  last_review: Date | null;

  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface FSRSParameters {
  request_retention: number;
  maximum_interval: number;
  w: number[];
}

export interface SchedulingInfo {
  card: FSRSCard;
}

export interface SchedulingCards {
  again: SchedulingInfo;
  hard: SchedulingInfo;
  good: SchedulingInfo;
  easy: SchedulingInfo;
}

export class SupabaseUnifiedReviewService implements UnifiedReviewService {
  private supabase: SupabaseClient;
  private preferencesService: any; // ReviewPreferencesService
  private smartSchedulingService: any; // SmartSchedulingService
  private timezoneService: TimezoneService;
  private plannerService: PlannerService;

  // 🎯 PARÂMETROS CALCULADOS MATEMATICAMENTE
  // Cada modo atinge o máximo no número exato de revisões desejado
  // CRAMMING: 3 EASY / 5 GOOD | INTENSIVE: 6 EASY / 10 GOOD
  // BALANCED: 8 EASY / 12 GOOD | RELAXED: 12 EASY / 18 GOOD

  // Modo CRAMMING (máx 15 dias: 4 EASY / 6 GOOD)
  // Intervalos iniciais: HARD=2, GOOD=3, EASY=5
  // Progressão EASY: 5 → 8 → 12 → 15 (crescimento ~1.5x)
  private crammingParameters: FSRSParameters = {
    request_retention: 0.95,
    maximum_interval: 15,
    w: [
      3.0, 2.0, 3.0, 5.0, 4.0, 0.2, 0.8, 0.02, 0.7, 0.05,
      0.3, 1.0, 0.2, 0.2, -0.2, 1.5, 1.2
    ],
  };

  // Modo INTENSIVE (máx 30 dias: 6 EASY / 10 GOOD)
  // Intervalos iniciais: HARD=2, GOOD=3, EASY=5
  private intensiveParameters: FSRSParameters = {
    request_retention: 0.90,
    maximum_interval: 30,
    w: [
      4.0, 2.0, 3.0, 5.0, 5.0, 0.3, 0.8, 0.02, 0.7, 0.08,
      0.4, 0.9, 0.25, 0.25, -0.2, 1.29, 1.3
    ],
  };

  // Modo BALANCED (máx 40 dias: 8 EASY / 12 GOOD)
  // Intervalos iniciais: HARD=2, GOOD=3, EASY=5
  private balancedParameters: FSRSParameters = {
    request_retention: 0.85,
    maximum_interval: 40,
    w: [
      5.0, 2.0, 3.0, 5.0, 6.0, 0.4, 0.8, 0.02, 0.75, 0.10,
      0.5, 1.0, 0.3, 0.3, -0.2, 1.4, 1.5
    ],
  };

  // Modo RELAXED (máx 60 dias: 12 EASY / 18 GOOD)
  // Intervalos iniciais: HARD=2, GOOD=3, EASY=5
  // Progressão EASY: 5 → 10 → 17 → 25 → 34 → 43 → 52 → 60
  private relaxedParameters: FSRSParameters = {
    request_retention: 0.80,
    maximum_interval: 60,
    w: [
      6.0, 2.0, 3.0, 5.0, 7.0, 0.5, 0.8, 0.02, 0.75, 0.12,
      0.6, 1.0, 0.35, 0.35, -0.2, 1.4, 1.7
    ],
  };

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient;
    this.timezoneService = new TimezoneService(supabaseClient);
    this.plannerService = new PlannerService();
    // Importar ReviewPreferencesService dinamicamente para evitar dependência circular
    this.initializePreferencesService();
  }

  private async initializePreferencesService() {
    try {
      const { ReviewPreferencesService } = await import('../../../domain/studyTools/unifiedReviews/services/ReviewPreferencesService');
      const { SmartSchedulingService } = await import('../../../domain/studyTools/unifiedReviews/services/SmartSchedulingService');
      this.preferencesService = new ReviewPreferencesService(this.supabase);
      this.smartSchedulingService = new SmartSchedulingService(this.supabase);
    } catch (error) {
      logger.error('Erro ao inicializar services:', error);
    }
  }



  // Métodos de timezone removidos - agora usa TimezoneService

  /**
   * Sincroniza evento do planner quando um card FSRS é criado/atualizado
   * Este é o método CENTRAL que garante que eventos existam para todas as revisões agendadas
   */
  private async syncPlannerEvent(userId: string, card: FSRSCard): Promise<void> {
    try {
      // Extrair data do due (sem hora)
      const dueDate = new Date(card.due);
      const dateStr = dueDate.toISOString().split('T')[0];

      logger.info(`[syncPlannerEvent] Sincronizando evento para ${card.content_type} em ${dateStr}`);

      // Buscar evento existente para aquela data e tipo
      let plannerEvent = await this.plannerService.getEventByDateAndType(userId, dateStr, card.content_type);

      // Se não existe evento, criar um novo
      if (!plannerEvent || !plannerEvent.id) {
        logger.info(`[syncPlannerEvent] Criando novo evento para ${card.content_type} em ${dateStr}`);

        // Buscar preferências do usuário para horários personalizados
        const prefs = await this.preferencesService.getPreferences(userId);

        // Definir horários baseado nas preferências do usuário
        const defaultHours: Record<string, { start: number; end: number }> = {
          'FLASHCARD': {
            start: prefs.flashcard_start_hour || 10,
            end: prefs.flashcard_end_hour || 14
          },
          'QUESTION': {
            start: prefs.question_start_hour || 15,
            end: prefs.question_end_hour || 17
          },
          'ERROR_NOTEBOOK': {
            start: prefs.error_notebook_start_hour || 18,
            end: prefs.error_notebook_end_hour || 20
          },
        };

        const hours = defaultHours[card.content_type] || { start: 8, end: 9 };

        // Definir título, ícone e cor baseado no tipo
        const titles: Record<string, string> = {
          'FLASHCARD': 'Flashcards',
          'QUESTION': 'Questões',
          'ERROR_NOTEBOOK': 'Caderno de Erros',
        };

        const icons: Record<string, string> = {
          'FLASHCARD': 'layers',
          'QUESTION': 'list_alt',
          'ERROR_NOTEBOOK': 'book',
        };

        const colors: Record<string, string> = {
          'FLASHCARD': 'purple',
          'QUESTION': 'cyan',
          'ERROR_NOTEBOOK': 'green',
        };

        // Criar o evento
        plannerEvent = await this.plannerService.createEvent(userId, {
          event_type: 'system_review',
          content_type: card.content_type,
          title: titles[card.content_type] || 'Revisão',
          date: dateStr,
          start_hour: hours.start,
          start_minute: 0,
          end_hour: hours.end,
          end_minute: 0,
          color: colors[card.content_type] || 'gray',
          icon: icons[card.content_type] || 'event',
          status: 'pending',
          completed_count: 0,
          total_count: 0,
        });

        logger.info(`[syncPlannerEvent] ✅ Evento criado: id=${plannerEvent.id}`);

        // Atualizar total_count apenas para eventos NOVOS
        if (plannerEvent.id) {
          await this.updateEventTotalCount(userId, dateStr, card.content_type, plannerEvent.id);
        }
      } else {
        // Evento já existe - apenas incrementar o total_count em +1
        logger.info(`[syncPlannerEvent] Evento já existe para ${card.content_type} em ${dateStr}, incrementando total_count`);
        const newTotalCount = (plannerEvent.total_count || 0) + 1;
        if (plannerEvent.id) {
          await this.plannerService.updateEvent(userId, plannerEvent.id, {
            total_count: newTotalCount,
          });
        }
      }

    } catch (error) {
      logger.error('[syncPlannerEvent] ❌ Erro ao sincronizar evento do planner:', error);
      // Não lançar erro para não quebrar o fluxo de revisão
    }
  }

  /**
   * Atualiza o total_count de um evento baseado nos cards FSRS
   */
  private async updateEventTotalCount(userId: string, dateStr: string, contentType: UnifiedContentType, eventId: string): Promise<void> {
    try {
      // Buscar timezone do usuário
      const timezone = await this.timezoneService.getUserTimezone(userId);
      const startOfDay = this.timezoneService.getStartOfDayInTimezone(new Date(dateStr), timezone);
      const endOfDay = this.timezoneService.getEndOfDayInTimezone(new Date(dateStr), timezone);

      // Contar quantos cards têm due para aquela data (pendentes)
      const { data: pendingCards, error: pendingError } = await this.supabase
        .from('fsrs_cards')
        .select('id', { count: 'exact', head: false })
        .eq('user_id', userId)
        .eq('content_type', contentType.toLowerCase())
        .gte('due', startOfDay.toISOString())
        .lte('due', endOfDay.toISOString())
        .neq('state', 'NEW');

      if (pendingError) {
        logger.error('[updateEventTotalCount] Erro ao buscar cards pendentes:', pendingError);
        return;
      }

      const pendingCount = pendingCards?.length || 0;

      // Buscar evento atual para pegar completed_count
      const currentEvent = await this.plannerService.getEventByDateAndType(userId, dateStr, contentType);
      const completedCount = currentEvent?.completed_count || 0;

      // Total = pendentes + completados
      const totalCount = pendingCount + completedCount;

      logger.info(`[updateEventTotalCount] Atualizando evento ${eventId}: pending=${pendingCount}, completed=${completedCount}, total=${totalCount}`);

      // Atualizar apenas o total_count (não mexer no completed_count)
      await this.plannerService.updateEvent(userId, eventId, {
        total_count: totalCount,
      });

    } catch (error) {
      logger.error('[updateEventTotalCount] ❌ Erro ao atualizar total_count:', error);
    }
  }

  /**
   * Incrementa o completed_count do evento da data original do card (quando ele estava programado)
   */
  private async incrementCompletedCount(userId: string, contentType: UnifiedContentType, originalDueDate: Date): Promise<void> {
    try {
      // Usar a data original do due (antes da revisão) para incrementar o evento correto
      const dateStr = originalDueDate.toISOString().split('T')[0];

      // Log detalhado para rastrear chamadas
      const stack = new Error().stack;
      logger.info(`[incrementCompletedCount] 🔥 CHAMADO para ${contentType} em ${dateStr} por userId=${userId}`);
      logger.info(`[incrementCompletedCount] Stack trace: ${stack?.split('\n').slice(1, 4).join('\n')}`);

      // Incrementar completed_count do evento da data original
      const { data, error } = await this.supabase.rpc('increment_planner_event_completed', {
        p_user_id: userId,
        p_date: dateStr,
        p_content_type: contentType,
      });

      // Ignorar erro PGRST116 (função executou mas não retornou resultado em formato de tabela)
      if (error && error.code !== 'PGRST116') {
        logger.error('[incrementCompletedCount] ❌ Erro ao incrementar:', error);
      } else {
        logger.info(`[incrementCompletedCount] ✅ Incrementado completed_count para ${contentType} em ${dateStr}, linhas afetadas: ${data || 'N/A'}`);
      }
    } catch (error) {
      logger.error('[incrementCompletedCount] Erro:', error);
    }
  }

  /**
   * Atualiza o progresso do planner após uma revisão
   * DEPRECATED: Use syncPlannerEvent() ao invés deste método
   * @deprecated - Método não utilizado, mantido apenas para referência
   */
  /*
  private async updatePlannerProgress(userId: string, contentType: UnifiedContentType): Promise<void> {
    try {
      logger.info(`[updatePlannerProgress] INICIANDO para userId=${userId}, contentType=${contentType}`);
      const today = new Date().toISOString().split('T')[0];

      // Buscar evento do planner para hoje e este tipo de conteúdo
      let plannerEvent = await this.plannerService.getEventByDateAndType(userId, today, contentType);

      // Se não existe evento, criar um novo
      if (!plannerEvent || !plannerEvent.id) {
        logger.info(`[updatePlannerProgress] Nenhum evento encontrado - criando novo evento para ${contentType} em ${today}`);

        // Definir horários padrão baseado no tipo
        const defaultHours: Record<string, { start: number; end: number }> = {
          'FLASHCARD': { start: 8, end: 9 },
          'QUESTION': { start: 9, end: 10 },
          'ERROR_NOTEBOOK': { start: 10, end: 11 },
        };

        const hours = defaultHours[contentType] || { start: 8, end: 9 };

        // Definir título e ícone baseado no tipo
        const titles: Record<string, string> = {
          'FLASHCARD': 'Flashcards',
          'QUESTION': 'Questões',
          'ERROR_NOTEBOOK': 'Caderno de Erros',
        };

        const icons: Record<string, string> = {
          'FLASHCARD': 'layers',
          'QUESTION': 'list_alt',
          'ERROR_NOTEBOOK': 'book',
        };

        const colors: Record<string, string> = {
          'FLASHCARD': 'purple',
          'QUESTION': 'cyan',
          'ERROR_NOTEBOOK': 'green',
        };

        // Criar o evento
        plannerEvent = await this.plannerService.createEvent(userId, {
          event_type: 'system_review',
          content_type: contentType,
          title: titles[contentType] || 'Revisão',
          date: today,
          start_hour: hours.start,
          start_minute: 0,
          end_hour: hours.end,
          end_minute: 0,
          color: colors[contentType] || 'gray',
          icon: icons[contentType] || 'event',
          status: 'pending',
          completed_count: 0,
          total_count: 0,
        });

        logger.info(`[updatePlannerProgress] ✅ Evento criado: id=${plannerEvent.id}`);
      }

      logger.info(`[updatePlannerProgress] Evento encontrado: id=${plannerEvent.id}, total_count=${plannerEvent.total_count}`);

      // Buscar quantos cards REALMENTE faltam revisar hoje (direto da tabela fsrs_cards)
      const timezone = await this.timezoneService.getUserTimezone(userId);
      const startOfDay = this.timezoneService.getStartOfDayInTimezone(new Date(), timezone);
      const endOfDay = this.timezoneService.getEndOfDayInTimezone(new Date(), timezone);

      // Buscar cards pendentes (com due hoje)
      const { data: remainingCards, error: remainingError } = await this.supabase
        .from('fsrs_cards')
        .select('id', { count: 'exact', head: false })
        .eq('user_id', userId)
        .eq('content_type', contentType.toLowerCase())
        .gte('due', startOfDay.toISOString())
        .lte('due', endOfDay.toISOString())
        .neq('state', 'NEW');

      if (remainingError) {
        logger.error('[updatePlannerProgress] Erro ao buscar cards restantes:', remainingError);
        return;
      }

      const remainingCount = remainingCards?.length || 0;

      // Se o total_count do evento é 0 ou não existe, significa que é a primeira vez
      // Nesse caso, precisamos contar o total real (pendentes + já respondidos)
      if (!plannerEvent.total_count || plannerEvent.total_count === 0) {
        // Buscar todos os cards que tinham due para hoje (respondidos ou não)
        const { data: allCards, error: allError } = await this.supabase
          .from('fsrs_cards')
          .select('id, last_review', { count: 'exact', head: false })
          .eq('user_id', userId)
          .eq('content_type', contentType.toLowerCase())
          .gte('due', startOfDay.toISOString())
          .lte('due', endOfDay.toISOString())
          .neq('state', 'NEW');

        if (allError) {
          logger.error('[updatePlannerProgress] Erro ao buscar todos os cards:', allError);
          return;
        }

        // Contar quantos já foram respondidos (last_review não é null)
        const completedCount = allCards?.filter(c => c.last_review !== null).length || 0;
        const totalCount = allCards?.length || 0;

        logger.info(`[updatePlannerProgress] Primeira vez - totalCount=${totalCount}, completedCount=${completedCount}, remainingCount=${remainingCount}`);

        if (plannerEvent?.id) {
          await this.plannerService.updateProgress(userId, plannerEvent.id, completedCount, totalCount);
        }
      } else {
        // Usar o total_count salvo e calcular completedCount = total - remaining
        const totalCount = plannerEvent.total_count;
        const completedCount = totalCount - remainingCount;

        logger.info(`[updatePlannerProgress] Atualização - totalCount=${totalCount}, completedCount=${completedCount}, remainingCount=${remainingCount}`);

        if (plannerEvent?.id) {
          await this.plannerService.updateProgress(userId, plannerEvent.id, completedCount, totalCount);
        }
      }

      logger.info(`[updatePlannerProgress] ✅ Progresso atualizado para ${contentType}`);
    } catch (error) {
      logger.error('[updatePlannerProgress] ❌ Erro ao atualizar progresso do planner:', error);
      // Não lançar erro para não quebrar o fluxo de revisão
    }
  }
  */

  private async getParametersForUser(userId: string): Promise<FSRSParameters> {
    try {
      if (!this.preferencesService) {
        await this.initializePreferencesService();
      }

      const preferences = await this.preferencesService.getPreferences(userId);

      // Obter parâmetros base
      let baseParams: FSRSParameters;

      // Se auto-ajuste está DESABILITADO, usar modo manual
      if (!preferences.auto_adjust_mode) {
        logger.info(`Modo manual: usando ${preferences.study_mode} (travado pelo usuário)`);
        baseParams = this.getModeParameters(preferences.study_mode);
      }
      // Se auto-ajuste está HABILITADO e tem data da prova
      else if (preferences.auto_adjust_mode && preferences.exam_date) {
        const daysUntilExam = this.preferencesService.calculateDaysUntilExam(new Date(preferences.exam_date));

        if (daysUntilExam <= 15) {
          logger.info(`Auto-ajuste: cramming (${daysUntilExam} dias até prova)`);
          baseParams = this.crammingParameters;
        } else if (daysUntilExam <= 30) {
          logger.info(`Auto-ajuste: intensive (${daysUntilExam} dias até prova)`);
          baseParams = this.intensiveParameters;
        } else if (daysUntilExam <= 90) {
          logger.info(`Auto-ajuste: balanced (${daysUntilExam} dias até prova)`);
          baseParams = this.balancedParameters;
        } else {
          logger.info(`Auto-ajuste: relaxed (${daysUntilExam} dias até prova)`);
          baseParams = this.relaxedParameters;
        }
      } else {
        // Fallback: usar modo configurado
        baseParams = this.getModeParameters(preferences.study_mode);
      }

      // ✅ AJUSTAR maximum_interval baseado em max_interval_days das preferências
      if (preferences.max_interval_days && preferences.max_interval_days !== baseParams.maximum_interval) {
        logger.info(`Ajustando maximum_interval de ${baseParams.maximum_interval} para ${preferences.max_interval_days} dias (preferências do usuário)`);
        return {
          ...baseParams,
          maximum_interval: preferences.max_interval_days
        };
      }

      return baseParams;
    } catch (error) {
      logger.error('Erro ao buscar parâmetros do usuário, usando balanced:', error);
      return this.balancedParameters;
    }
  }

  private getModeParameters(mode: string): FSRSParameters {
    switch (mode) {
      case 'cramming':
        return this.crammingParameters;
      case 'intensive':
        return this.intensiveParameters;
      case 'balanced':
        return this.balancedParameters;
      case 'relaxed':
        return this.relaxedParameters;
      default:
        return this.balancedParameters;
    }
  }

  private getParametersForContentType(_contentType: UnifiedContentType): FSRSParameters {
    // Método legado - manter para compatibilidade mas usar balanced por padrão
    return this.balancedParameters;
  }

  // Métodos FSRS complexos baseados no SupabaseFlashcardFSRSService
  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  private async addDays(date: Date, days: number, userId: string): Promise<Date> {
    const timezone = await this.timezoneService.getUserTimezone(userId);
    return this.timezoneService.addDaysInTimezone(date, days, timezone);
  }

  private dateDiff(date1: Date | string, date2: Date | string): number {
    const d1 = date1 instanceof Date ? date1 : new Date(date1);
    const d2 = date2 instanceof Date ? date2 : new Date(date2);
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  private calculateStabilityAfterSuccess(card: FSRSCard, elapsed_days: number, grade: FSRSGrade, parameters: FSRSParameters): number {
    const { w } = parameters;

    // Se o card é NEW (stability = 0), não deveria chamar este método
    // Mas se chamar, retornar valor inicial baseado no grade
    if (card.stability === 0 || card.stability === null) {
      switch (grade) {
        case FSRSGrade.HARD:
          return w[1] || 1.0; // Valor inicial para HARD
        case FSRSGrade.GOOD:
          return w[2] || 3.0; // Valor inicial para GOOD
        case FSRSGrade.EASY:
          return w[3] || 7.0; // Valor inicial para EASY
        default:
          return 3.0;
      }
    }

    const s = card.stability;
    const r = Math.exp(-elapsed_days / s);

    // Se difficulty é 0, usar valor padrão
    const difficulty = card.difficulty === 0 || card.difficulty === null ? 5 : card.difficulty;

    let factor: number;
    switch (grade) {
      case FSRSGrade.HARD:
        // HARD usa a mesma fórmula que GOOD mas com multiplicador 0.6 (60% do GOOD)
        factor = 0.6 * w[8] * Math.pow(difficulty, -w[9]) * Math.pow(s, w[10]) * (Math.exp(w[11] * (1 - r)) - 1);
        break;
      case FSRSGrade.GOOD:
        factor = w[8] * Math.pow(difficulty, -w[9]) * Math.pow(s, w[10]) * (Math.exp(w[11] * (1 - r)) - 1);
        break;
      case FSRSGrade.EASY:
        factor = w[8] * Math.pow(difficulty, -w[9]) * Math.pow(s, w[10]) * (Math.exp(w[11] * (1 - r)) - 1) * w[15];
        break;
      default:
        factor = 1;
    }

    return Math.max(0.1, s * factor);
  }

  private calculateStabilityAfterFailure(card: FSRSCard, parameters: FSRSParameters): number {
    const { w } = parameters;

    // Se o card é NEW (stability = 0), usar valor inicial
    if (card.stability === 0 || card.stability === null) {
      return Math.max(0.1, w[0]); // Usar w[0] como stability inicial
    }

    // Se difficulty é 0, usar valor padrão
    const difficulty = card.difficulty === 0 || card.difficulty === null ? 5 : card.difficulty;

    return Math.max(0.1, w[11] * Math.pow(difficulty, -w[12]) * Math.pow(card.stability, w[13]) * Math.exp(w[14] * card.lapses));
  }

  private calculateDifficultyAfterSuccess(card: FSRSCard, grade: FSRSGrade, parameters: FSRSParameters): number {
    const { w } = parameters;

    // Se o card é NEW (difficulty = 0), usar valor inicial
    const difficulty = card.difficulty === 0 || card.difficulty === null ? 5 : card.difficulty;

    const delta = grade - 3;
    return Math.max(1, Math.min(10, difficulty + w[6] * delta));
  }

  private calculateDifficultyAfterFailure(card: FSRSCard, parameters: FSRSParameters): number {
    const { w } = parameters;

    // Se o card é NEW (difficulty = 0), usar valor inicial
    const difficulty = card.difficulty === 0 || card.difficulty === null ? 5 : card.difficulty;

    return Math.max(1, Math.min(10, difficulty + w[6]));
  }

  private async scheduleAgain(card: FSRSCard, now: Date, parameters: FSRSParameters, userId: string): Promise<SchedulingInfo> {
    const elapsed_days = this.dateDiff(card.last_review || new Date(card.created_at), now);
    const new_card = { ...card };

    new_card.stability = this.calculateStabilityAfterFailure(card, parameters);
    new_card.difficulty = this.calculateDifficultyAfterFailure(card, parameters);

    // 🎯 AGAIN: Sempre 1 dia (questão errada = revisar amanhã)
    new_card.scheduled_days = 1;

    new_card.due = await this.addDays(now, new_card.scheduled_days, userId);
    new_card.elapsed_days = elapsed_days;
    new_card.reps = card.reps + 1;
    new_card.lapses = card.lapses + 1;
    new_card.state = FSRSState.RELEARNING;
    new_card.last_review = now;
    new_card.updated_at = new Date().toISOString();

    logger.info(`[scheduleAgain] Card agendado para 1 dia (amanhã)`);

    return { card: new_card };
  }

  private async scheduleHard(card: FSRSCard, now: Date, parameters: FSRSParameters, userId: string): Promise<SchedulingInfo> {
    const elapsed_days = this.dateDiff(card.last_review || new Date(card.created_at), now);
    const new_card = { ...card };

    // 🎯 HARD: "Lembrei, mas achei difícil!"
    if (card.state === FSRSState.NEW) {
      // Primeira revisão: 2 dias (diferente de AGAIN que é 1 dia)
      new_card.stability = parameters.w[1]; // 2.0
      new_card.difficulty = this.calculateDifficultyAfterSuccess(card, FSRSGrade.HARD, parameters);
      new_card.scheduled_days = Math.max(2, Math.min(parameters.maximum_interval, Math.round(new_card.stability)));
    } else {
      new_card.stability = this.calculateStabilityAfterSuccess(card, elapsed_days, FSRSGrade.HARD, parameters);
      new_card.difficulty = this.calculateDifficultyAfterSuccess(card, FSRSGrade.HARD, parameters);

      // HARD: 50% do intervalo anterior (mínimo 2 dias)
      const previousDays = card.scheduled_days || 2; // Fallback se undefined
      new_card.scheduled_days = Math.max(2, Math.min(
        parameters.maximum_interval,
        Math.round(previousDays * 0.5) // 50% do anterior
      ));

      logger.info(`[scheduleHard] Reduzindo para 50%: ${previousDays} → ${new_card.scheduled_days}`);
    }

    // Validar scheduled_days
    if (isNaN(new_card.scheduled_days) || new_card.scheduled_days < 1) {
      logger.error(`[scheduleHard] scheduled_days inválido: ${new_card.scheduled_days}, usando 2`);
      new_card.scheduled_days = 2;
    }

    new_card.due = await this.addDays(now, new_card.scheduled_days, userId);
    new_card.elapsed_days = elapsed_days;
    new_card.reps = card.reps + 1;
    new_card.state = card.state === FSRSState.NEW ? FSRSState.LEARNING : FSRSState.REVIEW;
    new_card.last_review = now;
    new_card.updated_at = new Date().toISOString();

    return { card: new_card };
  }

  private async scheduleGood(card: FSRSCard, now: Date, parameters: FSRSParameters, userId: string): Promise<SchedulingInfo> {
    const real_elapsed_days = this.dateDiff(card.last_review || new Date(card.created_at), now);
    // 🔥 Usar scheduled_days como mínimo para evitar penalizar revisões antecipadas
    const elapsed_days = Math.max(real_elapsed_days, card.scheduled_days || 0);

    logger.info(`[scheduleGood] real_elapsed=${real_elapsed_days}, scheduled=${card.scheduled_days}, using=${elapsed_days}`);

    const new_card = { ...card };

    // 🎯 GOOD: "Quase consolidado na mente..."
    if (card.state === FSRSState.NEW) {
      // Primeira revisão: 3 dias
      new_card.stability = parameters.w[2]; // 3.0
      new_card.difficulty = this.calculateDifficultyAfterSuccess(card, FSRSGrade.GOOD, parameters);
      new_card.scheduled_days = Math.max(3, Math.min(parameters.maximum_interval, Math.round(new_card.stability)));
    } else {
      new_card.stability = this.calculateStabilityAfterSuccess(card, elapsed_days, FSRSGrade.GOOD, parameters);
      new_card.difficulty = this.calculateDifficultyAfterSuccess(card, FSRSGrade.GOOD, parameters);

      // 🔥 RECOVERY BOOST: Proporcional aos lapses (penaliza quem erra muito)
      if (card.stability < 1.0 && new_card.stability < 2.0) {
        const boostFactor = Math.max(2.0, 4.0 - (card.lapses * 0.5));
        new_card.stability = Math.max(2.0, new_card.stability * boostFactor);
        logger.info(`[scheduleGood] Recovery boost (${boostFactor}x, lapses=${card.lapses}): ${card.stability} → ${new_card.stability}`);
      }

      new_card.scheduled_days = Math.max(3, Math.min(parameters.maximum_interval, Math.round(new_card.stability)));
    }

    // Validar scheduled_days
    if (isNaN(new_card.scheduled_days) || new_card.scheduled_days < 1) {
      logger.error(`[scheduleGood] scheduled_days inválido: ${new_card.scheduled_days}, usando 3`);
      new_card.scheduled_days = 3;
    }

    new_card.due = await this.addDays(now, new_card.scheduled_days, userId);
    new_card.elapsed_days = elapsed_days;
    new_card.reps = card.reps + 1;
    new_card.state = card.state === FSRSState.NEW ? FSRSState.LEARNING : FSRSState.REVIEW;
    new_card.last_review = now;
    new_card.updated_at = new Date().toISOString();

    logger.info(`[scheduleGood] Card ${card.state} - Old stability: ${card.stability}, New stability: ${new_card.stability}, Scheduled days: ${new_card.scheduled_days}`);

    return { card: new_card };
  }

  private async scheduleEasy(card: FSRSCard, now: Date, parameters: FSRSParameters, userId: string): Promise<SchedulingInfo> {
    const real_elapsed_days = this.dateDiff(card.last_review || new Date(card.created_at), now);
    let elapsed_days = real_elapsed_days;

    logger.info(`[scheduleEasy] real_elapsed=${real_elapsed_days}, scheduled=${card.scheduled_days}`);

    const new_card = { ...card };

    // 🎯 EASY: "Acertei com confiança!"
    if (card.state === FSRSState.NEW) {
      // Primeira revisão: 5 dias
      new_card.stability = parameters.w[3]; // 5.0
      new_card.difficulty = this.calculateDifficultyAfterSuccess(card, FSRSGrade.EASY, parameters);
      new_card.scheduled_days = Math.max(5, Math.min(parameters.maximum_interval, Math.round(new_card.stability)));
    } else {
      // 🔥 FIX: Se elapsed_days < scheduled_days, usar scheduled_days
      // Isso acontece quando o usuário revisa antes do tempo ou no mesmo dia
      if (elapsed_days < card.scheduled_days) {
        elapsed_days = card.scheduled_days;
        logger.info(`[scheduleEasy] Ajustando elapsed_days: ${this.dateDiff(card.last_review || new Date(card.created_at), now)} → ${elapsed_days}`);
      }

      new_card.stability = this.calculateStabilityAfterSuccess(card, elapsed_days, FSRSGrade.EASY, parameters);
      new_card.difficulty = this.calculateDifficultyAfterSuccess(card, FSRSGrade.EASY, parameters);

      // 🔥 RECOVERY BOOST: Proporcional aos lapses (penaliza quem erra muito)
      if (card.stability < 1.0 && new_card.stability < 3.0) {
        const boostFactor = Math.max(2.0, 5.0 - (card.lapses * 0.5));
        new_card.stability = Math.max(3.0, new_card.stability * boostFactor);
        logger.info(`[scheduleEasy] Recovery boost (${boostFactor}x, lapses=${card.lapses}): ${card.stability} → ${new_card.stability}`);
      }

      // EASY: Usa stability calculada pelo FSRS (já inclui w[15])
      new_card.scheduled_days = Math.max(5, Math.min(parameters.maximum_interval, Math.round(new_card.stability)));
    }

    // Validar scheduled_days
    if (isNaN(new_card.scheduled_days) || new_card.scheduled_days < 1) {
      logger.error(`[scheduleEasy] scheduled_days inválido: ${new_card.scheduled_days}, usando 5`);
      new_card.scheduled_days = 5;
    }

    new_card.due = await this.addDays(now, new_card.scheduled_days, userId);
    new_card.elapsed_days = elapsed_days;
    new_card.reps = card.reps + 1;
    new_card.state = card.state === FSRSState.NEW ? FSRSState.LEARNING : FSRSState.REVIEW;
    new_card.last_review = now;
    new_card.updated_at = new Date().toISOString();

    return { card: new_card };
  }

  private async processReview(
    card: FSRSCard,
    grade: FSRSGrade,
    userId: string,
    isActiveReview: boolean = true,
    isPreview: boolean = false
  ): Promise<SchedulingInfo> {
    const now = new Date();

    // Se não é revisão ativa, verificar threshold
    if (!isActiveReview) {
      const shouldRecalculate = this.shouldRecalculateReview(card, grade, now);

      if (!shouldRecalculate) {
        // Mantém a data original, apenas atualiza last_review
        logger.info(`Threshold não atingido - mantendo data original para card ${card.id}`);
        return {
          card: {
            ...card,
            due: typeof card.due === 'string' ? new Date(card.due) : card.due,
            last_review: now,
            updated_at: new Date().toISOString(),
          }
        };
      }
    }

    const parameters = await this.getParametersForUser(userId);

    let schedulingInfo: SchedulingInfo;

    switch (grade) {
      case FSRSGrade.AGAIN:
        schedulingInfo = await this.scheduleAgain(card, now, parameters, userId);
        break;
      case FSRSGrade.HARD:
        schedulingInfo = await this.scheduleHard(card, now, parameters, userId);
        break;
      case FSRSGrade.GOOD:
        schedulingInfo = await this.scheduleGood(card, now, parameters, userId);
        break;
      case FSRSGrade.EASY:
        schedulingInfo = await this.scheduleEasy(card, now, parameters, userId);
        break;
      default:
        schedulingInfo = await this.scheduleGood(card, now, parameters, userId);
    }

    // 🔥 NÃO aplicar smart scheduling no preview (mostra intervalo puro do FSRS)
    if (!isPreview) {
      schedulingInfo.card.due = await this.applySmartScheduling(
        userId,
        schedulingInfo.card.due,
        card.content_type
      );
    }

    return schedulingInfo;
  }

  /**
   * Verifica se deve recalcular a revisão baseado no threshold
   * @param card Card FSRS atual
   * @param grade Grade da resposta
   * @param now Data/hora atual
   * @returns true se deve recalcular, false se deve manter data original
   */
  private shouldRecalculateReview(card: FSRSCard, grade: FSRSGrade, now: Date): boolean {
    // AGAIN e HARD sempre recalculam (penalizam/reduzem intervalo)
    if (grade === FSRSGrade.AGAIN || grade === FSRSGrade.HARD) {
      logger.info(`[Threshold] Grade ${grade === FSRSGrade.AGAIN ? 'AGAIN' : 'HARD'} - sempre recalcula`);
      return true;
    }

    // Se não tem last_review ou due, recalcula
    if (!card.last_review || !card.due) {
      logger.info(`[Threshold] Sem last_review ou due - recalcula`);
      return true;
    }

    const lastReview = new Date(card.last_review);
    const dueDate = new Date(card.due);

    // Calcular progresso
    const elapsed_days = this.dateDiff(lastReview, now);
    const scheduled_days = this.dateDiff(lastReview, dueDate);

    logger.info(`[Threshold] Card ${card.id}: elapsed=${elapsed_days}, scheduled=${scheduled_days}, grade=${grade}`);

    // Se scheduled_days é 0 ou negativo, recalcula
    if (scheduled_days <= 0) {
      logger.info(`[Threshold] scheduled_days <= 0 - recalcula`);
      return true;
    }

    const progress = elapsed_days / scheduled_days;

    // Threshold apenas para GOOD e EASY (70%)
    const THRESHOLD_GOOD_EASY = 0.7;  // 70%
    const shouldRecalc = progress >= THRESHOLD_GOOD_EASY;

    logger.info(`[Threshold] Progress: ${(progress * 100).toFixed(1)}%, Threshold: ${(THRESHOLD_GOOD_EASY * 100)}%, Recalcula: ${shouldRecalc}`);

    return shouldRecalc;
  }

  /**
   * Aplica smart scheduling se habilitado
   */
  private async applySmartScheduling(
    userId: string,
    idealDate: Date,
    contentType: UnifiedContentType
  ): Promise<Date> {
    try {
      logger.info(`[applySmartScheduling] idealDate recebido: ${idealDate.toISOString()}, contentType: ${contentType}`);

      if (!this.preferencesService || !this.smartSchedulingService) {
        await this.initializePreferencesService();
      }

      const prefs = await this.preferencesService.getPreferences(userId);

      // Ajustar para próximo dia de estudo disponível
      let targetDate = this.preferencesService.findNextStudyDay(idealDate, prefs.study_days);

      logger.info(`[applySmartScheduling] targetDate após findNextStudyDay: ${targetDate.toISOString()}`);

      // Se modo smart, buscar primeiro dia disponível com vaga
      if (prefs.scheduling_mode === 'smart') {
        targetDate = await this.smartSchedulingService.findFirstAvailableDay(
          userId,
          targetDate,
          contentType,
          prefs.study_days
        );
      }

      return targetDate;
    } catch (error) {
      logger.error('Erro ao aplicar smart scheduling, usando data ideal:', error);
      return idealDate;
    }
  }

  public async createNewCard(
    content_id: string,
    user_id: string,
    deck_id: string,
    contentType: UnifiedContentType,
  ): Promise<FSRSCard> {
    if (!contentType) {
      throw new AppError('content_type é obrigatório', 400);
    }

    const validContentTypes = [UnifiedContentType.FLASHCARD, UnifiedContentType.QUESTION, UnifiedContentType.ERROR_NOTEBOOK];
    if (!validContentTypes.includes(contentType)) {
      throw new AppError(`content_type inválido: ${contentType}. Valores válidos: ${validContentTypes.join(', ')}`, 400);
    }

    const now = new Date();
    const parameters = this.getParametersForContentType(contentType);

    // Para caderno de erros, definir data inicial com mínimo de 1 dia
    // Para outros tipos, manter como agora (será ajustado pelo smart scheduling se necessário)
    let initialDueDate = now;
    let scheduledDays = 0;

    if (contentType === UnifiedContentType.ERROR_NOTEBOOK) {
      // Mínimo de 1 dia para caderno de erros
      initialDueDate = await this.addDays(now, 1, user_id);
      scheduledDays = 1;
    }

    const card: FSRSCard = {
      id: this.generateId(),
      user_id,
      content_id,
      deck_id,
      content_type: contentType,
      due: initialDueDate,
      stability: parameters.w[0],
      difficulty: parameters.w[4],
      elapsed_days: 0,
      scheduled_days: scheduledDays,
      reps: 0,
      lapses: 0,
      state: FSRSState.NEW,
      last_review: null,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };


    return card;
  }

  /**
   * Calcular score de prioridade para um item
   */
  private calculatePriorityScore(item: any): number {
    let score = 0;

    // Quanto mais atrasado, maior prioridade
    const now = new Date();
    const due = new Date(item.due);
    const daysOverdue = Math.max(0, Math.ceil((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)));
    score += daysOverdue * 10;

    // Quanto mais lapses, maior prioridade (está com dificuldade)
    score += (item.lapses || 0) * 5;

    // Quanto menor a stability, maior prioridade (memória fraca)
    score += (10 - (item.stability || 5)) * 3;

    // Caderno de erros tem prioridade extra
    if (item.content_type === UnifiedContentType.ERROR_NOTEBOOK) {
      score += 20;
    }

    return score;
  }

  /**
   * Buscar revisões com priorização inteligente
   */
  async getDueReviewsPrioritized(
    userId: string,
    limit?: number
  ): Promise<UnifiedReviewItem[]> {
    try {
      // Buscar mais items para poder priorizar
      const items = await this.getDueReviews(userId, (limit || 50) * 2);

      // Calcular score de prioridade
      const scored = items.map(item => ({
        ...item,
        priority_score: this.calculatePriorityScore(item)
      }));

      // Ordenar por prioridade
      scored.sort((a, b) => b.priority_score - a.priority_score);

      // Retornar apenas o limite solicitado
      return scored.slice(0, limit || 50);
    } catch (error) {
      logger.error('Erro ao buscar revisões priorizadas:', error);
      throw error;
    }
  }

  /**
   * Embaralhar array (Fisher-Yates shuffle)
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Buscar revisões com balanceamento de tipos
   */
  async getDueReviewsBalanced(
    userId: string,
    limit: number = 50
  ): Promise<UnifiedReviewItem[]> {
    try {
      const prefs = await this.preferencesService?.getPreferences(userId);

      // Distribuição: 40% questões, 30% flashcards, 30% erros
      const questionLimit = Math.floor(limit * 0.4);
      const flashcardLimit = Math.floor(limit * 0.3);
      const errorLimit = Math.floor(limit * 0.3);

      const questions = prefs?.enable_questions
        ? await this.getDueReviews(userId, questionLimit, [UnifiedContentType.QUESTION])
        : [];

      const flashcards = prefs?.enable_flashcards
        ? await this.getDueReviews(userId, flashcardLimit, [UnifiedContentType.FLASHCARD])
        : [];

      const errors = prefs?.enable_error_notebook
        ? await this.getDueReviews(userId, errorLimit, [UnifiedContentType.ERROR_NOTEBOOK])
        : [];

      // Misturar aleatoriamente
      return this.shuffleArray([...questions, ...flashcards, ...errors]);
    } catch (error) {
      logger.error('Erro ao buscar revisões balanceadas:', error);
      // Fallback para método normal
      return this.getDueReviews(userId, limit);
    }
  }

  async getDueReviews(
    userId: string,
    limit?: number,
    contentTypes?: UnifiedContentType[],
  ): Promise<UnifiedReviewItem[]> {
    try {
      // Buscar preferências do usuário para filtrar tipos habilitados
      let enabledTypes: UnifiedContentType[] = [];
      let prefs: any = null;

      if (this.preferencesService) {
        try {
          prefs = await this.preferencesService.getPreferences(userId);
          if (prefs.enable_questions) enabledTypes.push(UnifiedContentType.QUESTION);
          if (prefs.enable_flashcards) enabledTypes.push(UnifiedContentType.FLASHCARD);
          if (prefs.enable_error_notebook) enabledTypes.push(UnifiedContentType.ERROR_NOTEBOOK);
        } catch (error) {
          logger.error('Erro ao buscar preferências, usando todos os tipos:', error);
          enabledTypes = [UnifiedContentType.QUESTION, UnifiedContentType.FLASHCARD, UnifiedContentType.ERROR_NOTEBOOK];
        }
      } else {
        // Se não tem preferências, usar todos
        enabledTypes = [UnifiedContentType.QUESTION, UnifiedContentType.FLASHCARD, UnifiedContentType.ERROR_NOTEBOOK];
      }

      // Se contentTypes foi especificado, usar interseção
      if (contentTypes && contentTypes.length > 0) {
        enabledTypes = enabledTypes.filter(t => contentTypes.includes(t));
      }

      // Se nenhum tipo habilitado, retornar vazio
      if (enabledTypes.length === 0) {
        logger.info(`Nenhum tipo de conteúdo habilitado para usuário ${userId}`);
        return [];
      }

      const dueOnly = true;
      const now = new Date().toISOString();

      // Buscar cards FSRS
      let query = this.supabase
        .from('fsrs_cards')
        .select('*')
        .eq('user_id', userId)
        .in('content_type', enabledTypes)
        .order('due', { ascending: true });

      // Aplicar filtro de data apenas se dueOnly for true
      // Cards NEW (state = 0) sempre devem aparecer, independente da data due
      if (dueOnly) {
        query = query.or(`due.lte.${now},state.eq.0`);
      }

      const { data: allDueCards, error: cardsError } = await query;

      if (cardsError) {
        logger.error('Error fetching due cards:', cardsError);
        throw new AppError('Failed to fetch due cards', 500);
      }

      if (!allDueCards || allDueCards.length === 0) {
        return [];
      }

      // Aplicar limite baseado no modo
      let filteredCards = allDueCards;

      if (prefs && prefs.scheduling_mode === 'smart') {
        const effectiveLimit = Math.min(limit || 50, prefs.daily_reviews_limit);

        // Priorizar por score
        const scored = allDueCards.map(card => ({
          ...card,
          priority_score: this.calculatePriorityScore(card)
        }));

        scored.sort((a, b) => b.priority_score - a.priority_score);
        filteredCards = scored.slice(0, effectiveLimit);
      } else {
        // Modo tradicional: aplicar limite simples
        filteredCards = allDueCards.slice(0, limit || 50);
      }

      // Enriquecer cards com dados específicos do tipo de conteúdo
      const enrichedItems = await Promise.all(
        filteredCards.map(card => this.enrichCardWithContent(card))
      );

      return enrichedItems.filter(item => item !== null) as UnifiedReviewItem[];
    } catch (error) {
      logger.error('Error in getDueReviews:', error);
      throw error;
    }
  }

  async getFutureReviews(
    userId: string,
    limit?: number,
    startDate?: string,
    endDate?: string,
  ): Promise<UnifiedReviewItem[]> {
    try {
      // Buscar timezone do usuário
      const userTimezone = await this.timezoneService.getUserTimezone(userId);

      let startOfPeriod: Date;
      let endOfPeriod: Date;

      if (startDate && endDate) {
        // Se datas foram fornecidas, criar Date no timezone do usuário
        // startDate vem como 'YYYY-MM-DD', precisamos interpretar como data no timezone do usuário
        // Criar uma data UTC "neutra" que será interpretada pelo TimezoneService
        const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
        const [endYear, endMonth, endDay] = endDate.split('-').map(Number);

        // Criar datas UTC que representam o meio-dia (12:00) para evitar problemas de DST
        const startDateUTC = new Date(Date.UTC(startYear, startMonth - 1, startDay, 12, 0, 0));
        const endDateUTC = new Date(Date.UTC(endYear, endMonth - 1, endDay, 12, 0, 0));

        // O TimezoneService vai converter para o início/fim do dia no timezone do usuário
        startOfPeriod = this.timezoneService.getStartOfDayInTimezone(startDateUTC, userTimezone);
        endOfPeriod = this.timezoneService.getEndOfDayInTimezone(endDateUTC, userTimezone);


      } else {
        // Caso contrário, buscar semana atual
        const now = new Date();
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - 7);
        startOfPeriod = this.timezoneService.getStartOfDayInTimezone(weekStart, userTimezone);

        const weekEnd = new Date(now);
        weekEnd.setDate(weekEnd.getDate() + 7);
        endOfPeriod = this.timezoneService.getEndOfDayInTimezone(weekEnd, userTimezone);
      }

      const { data: futureCards, error: cardsError } = await this.supabase
        .from('fsrs_cards')
        .select('*')
        .eq('user_id', userId)
        .gte('due', startOfPeriod.toISOString())
        .lte('due', endOfPeriod.toISOString())
        .order('due', { ascending: true })
        .limit(limit || 200);

      if (cardsError) {
        logger.error('Error fetching future cards:', cardsError);
        throw new AppError('Failed to fetch future cards', 500);
      }

      if (!futureCards || futureCards.length === 0) {
        return [];
      }

      const filteredCards = futureCards;



      // Log detalhado por data E tipo para debug
      if (startDate && endDate) {
        const cardsByDateAndType: Record<string, Record<string, number>> = {};
        filteredCards.forEach(card => {
          const dueDate = typeof card.due === 'string' ? new Date(card.due) : card.due;
          const dateInUserTimezone = dueDate.toLocaleString('en-US', {
            timeZone: userTimezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          });
          const [month, day, year] = dateInUserTimezone.split('/');
          const dateKey = `${year}-${month}-${day}`;

          if (!cardsByDateAndType[dateKey]) {
            cardsByDateAndType[dateKey] = {};
          }
          cardsByDateAndType[dateKey][card.content_type] = (cardsByDateAndType[dateKey][card.content_type] || 0) + 1;
        });

      }

      // Enriquecer cards com dados específicos do tipo de conteúdo
      const enrichedItems = await Promise.all(
        filteredCards.map(card => this.enrichCardWithContent(card))
      );

      const nullCount = enrichedItems.filter(item => item === null).length;
      if (nullCount > 0) {
        const nullCards = filteredCards.filter((_card, index) => enrichedItems[index] === null);
        logger.warn(`[getFutureReviews] ${nullCount} cards retornaram null no enriquecimento:`, nullCards.map(c => ({ content_id: c.content_id, state: c.state })));
      }

      const finalItems = enrichedItems.filter(item => item !== null) as UnifiedReviewItem[];

      // Log após enriquecimento
      if (startDate && endDate) {
        const finalByDateAndType: Record<string, Record<string, number>> = {};
        finalItems.forEach(item => {
          const dueDate = typeof item.due === 'string' ? new Date(item.due) : item.due;
          const dateInUserTimezone = dueDate.toLocaleString('en-US', {
            timeZone: userTimezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          });
          const [month, day, year] = dateInUserTimezone.split('/');
          const dateKey = `${year}-${month}-${day}`;

          if (!finalByDateAndType[dateKey]) {
            finalByDateAndType[dateKey] = {};
          }
          finalByDateAndType[dateKey][item.content_type] = (finalByDateAndType[dateKey][item.content_type] || 0) + 1;
        });

      }

      return finalItems;
    } catch (error) {
      logger.error('Error in getFutureReviews:', error);
      throw error;
    }
  }

  /**
   * Buscar revisões recentes de um card específico
   * Usado para verificar sequências consecutivas
   */
  async getRecentReviews(
    userId: string,
    contentId: string,
    contentType: UnifiedContentType,
    limit: number = 10
  ): Promise<any[]> {
    try {
      // Buscar o card FSRS para pegar scheduled_days
      const { data: card, error: cardError } = await this.supabase
        .from('fsrs_cards')
        .select('id, scheduled_days')
        .eq('user_id', userId)
        .eq('content_id', contentId)
        .eq('content_type', contentType)
        .single();

      if (cardError || !card) {
        logger.info(`[getRecentReviews] Card não encontrado: ${contentId}, error: ${cardError?.message}`);
        return [];
      }

      // Buscar histórico de revisões usando o UUID do card FSRS
      // A tabela review_history usa content_id como UUID (referência ao fsrs_cards.id)
      const { data: reviews, error: reviewsError } = await this.supabase
        .from('review_history')
        .select('*')
        .eq('user_id', userId)
        .eq('content_id', card.id)
        .eq('content_type', contentType)
        .order('reviewed_at', { ascending: false })
        .limit(limit);

      if (reviewsError) {
        logger.error('Error fetching recent reviews:', reviewsError);
        return [];
      }

      // Adicionar o scheduled_days do card atual no primeiro review (mais recente)
      if (reviews && reviews.length > 0) {
        reviews[0].current_scheduled_days = card.scheduled_days;
      }

      return reviews || [];
    } catch (error) {
      logger.error('Error in getRecentReviews:', error);
      return [];
    }
  }

  /**
   * Adicionar entry do caderno de erros ao sistema de revisão
   * Cria um card FSRS com grade AGAIN (0) automaticamente
   * Usado quando o usuário adiciona uma questão ao caderno pela primeira vez
   */
  async addErrorNoteToReview(
    entryId: string,
    userId: string
  ): Promise<void> {
    try {
      // Verificar se já existe card FSRS para este entry
      const { data: existingCard } = await this.supabase
        .from('fsrs_cards')
        .select('id')
        .eq('user_id', userId)
        .eq('content_id', entryId)
        .eq('content_type', 'ERROR_NOTEBOOK')
        .single();

      if (existingCard) {
        logger.info(`[addErrorNoteToReview] Card já existe para entry ${entryId}`);
        return;
      }

      // Criar card FSRS novo
      const newCard = await this.createNewCard(
        entryId,
        userId,
        '', // deck_id não usado para ERROR_NOTEBOOK
        UnifiedContentType.ERROR_NOTEBOOK
      );

      // Processar como AGAIN (grade 0) para agendar para 1 dia depois
      const schedulingInfo = await this.processReview(
        newCard,
        0, // AGAIN
        userId,
        true // isActiveReview = true para forçar recálculo
      );

      // Salvar o card
      const { error: insertError } = await this.supabase
        .from('fsrs_cards')
        .insert({
          id: schedulingInfo.card.id,
          user_id: schedulingInfo.card.user_id,
          content_id: schedulingInfo.card.content_id,
          content_type: schedulingInfo.card.content_type,
          deck_id: schedulingInfo.card.deck_id,
          due: schedulingInfo.card.due,
          stability: schedulingInfo.card.stability,
          difficulty: schedulingInfo.card.difficulty,
          elapsed_days: schedulingInfo.card.elapsed_days,
          scheduled_days: schedulingInfo.card.scheduled_days,
          reps: schedulingInfo.card.reps,
          lapses: schedulingInfo.card.lapses,
          state: schedulingInfo.card.state,
          last_review: schedulingInfo.card.last_review,
          created_at: schedulingInfo.card.created_at,
          updated_at: schedulingInfo.card.updated_at,
        });

      if (insertError) {
        logger.error('Error inserting FSRS card:', insertError);
        throw new AppError('Failed to add to review system', 500);
      }

      // 🔥 SINCRONIZAR EVENTO DO PLANNER (criar/atualizar evento para a data do due)
      await this.syncPlannerEvent(userId, schedulingInfo.card);

      // Nota: Não incrementar completed_count aqui porque esta função é chamada ao ADICIONAR
      // uma entrada ao caderno, não ao REVISAR. O incremento acontece em reviewErrorNotebook()

      // Registrar no histórico
      const { error: historyError } = await this.supabase
        .from('review_history')
        .insert({
          user_id: userId,
          content_type: 'ERROR_NOTEBOOK',
          content_id: entryId, // UUID da entrada do caderno de erros
          grade: 0, // AGAIN
          review_time_ms: 0,
          stability: schedulingInfo.card.stability,
          difficulty: schedulingInfo.card.difficulty,
          state: schedulingInfo.card.state,
          due: schedulingInfo.card.due,
          reps: schedulingInfo.card.reps,
          lapses: schedulingInfo.card.lapses,
          elapsed_days: schedulingInfo.card.elapsed_days,
          scheduled_days: schedulingInfo.card.scheduled_days,
          last_review: schedulingInfo.card.last_review,
          reviewed_at: new Date().toISOString(),
        });

      if (historyError) {
        logger.warn('[addErrorNoteToReview] Erro ao salvar histórico (não crítico):', historyError);
      } else {
        logger.info('[addErrorNoteToReview] Histórico de revisão salvo com sucesso');
      }

      logger.info(`[addErrorNoteToReview] Card FSRS criado para entry ${entryId}, agendado para ${schedulingInfo.card.scheduled_days} dia(s)`);
    } catch (error) {
      logger.error('Error in addErrorNoteToReview:', error);
      throw error;
    }
  }

  /**
   * Excluir um item do sistema de revisão
   * Remove o card FSRS mas mantém o histórico
   */
  async deleteReviewItem(
    userId: string,
    contentId: string,
    contentType: UnifiedContentType
  ): Promise<void> {
    try {
      // Deletar o card FSRS
      const { error: deleteError } = await this.supabase
        .from('fsrs_cards')
        .delete()
        .eq('user_id', userId)
        .eq('content_id', contentId)
        .eq('content_type', contentType);

      if (deleteError) {
        logger.error('Error deleting review item:', deleteError);
        throw new AppError('Failed to delete review item', 500);
      }

      logger.info(`[deleteReviewItem] Card excluído: ${contentType}/${contentId}`);
    } catch (error) {
      logger.error('Error in deleteReviewItem:', error);
      throw error;
    }
  }

  async recordReview(
    userId: string,
    contentId: string,
    grade: number,
    reviewTimeMs?: number,
    isActiveReview: boolean = false
  ): Promise<void> {
    try {
      // Buscar o card FSRS existente
      const { data: existingCard, error: cardError } = await this.supabase
        .from('fsrs_cards')
        .select('*')
        .eq('user_id', userId)
        .eq('content_id', contentId)
        .single();

      if (cardError && cardError.code !== 'PGRST116') {
        throw cardError;
      }

      let card: FSRSCard;
      if (existingCard) {
        card = existingCard;
      } else {
        // Buscar o deck_id do flashcard
        const { data: flashcardData } = await this.supabase
          .from('flashcards')
          .select('deck_id')
          .eq('id', contentId)
          .single();

        const deckId = flashcardData?.deck_id || '';

        // Criar novo card se não existir
        card = await this.createNewCard(contentId, userId, deckId, UnifiedContentType.FLASHCARD);
      }

      // Processar a revisão com a nova lógica FSRS complexa
      const schedulingInfo = await this.processReview(card, grade, userId, isActiveReview);

      // Salvar o card atualizado
      const { error: updateError } = await this.supabase
        .from('fsrs_cards')
        .upsert({
          ...schedulingInfo.card,
          due: schedulingInfo.card.due.toISOString(),
          last_review: schedulingInfo.card.last_review ? schedulingInfo.card.last_review.toISOString() : null,
          updated_at: new Date().toISOString(),
        });

      if (updateError) {
        throw updateError;
      }

      // 🔥 SINCRONIZAR EVENTO DO PLANNER (criar/atualizar evento para a data do due)
      await this.syncPlannerEvent(userId, schedulingInfo.card);

      // 🔥 INCREMENTAR COMPLETED_COUNT DO EVENTO DA DATA ORIGINAL (se for revisão ativa)
      if (isActiveReview) {
        // Usar o due ORIGINAL do card (antes da revisão) para incrementar o evento correto
        const originalDue = new Date(card.due);
        // Usar o content_type do card ao invés de hardcoded FLASHCARD
        await this.incrementCompletedCount(userId, card.content_type as UnifiedContentType, originalDue);
      }

      // Salvar histórico de revisão
      const repository = new SupabaseUnifiedReviewRepository(this.supabase);
      await (repository as any).saveReviewHistory(
        userId,
        UnifiedContentType.FLASHCARD,
        contentId,
        grade,
        reviewTimeMs || 0,
        schedulingInfo.card
      );

      logger.info(`Revisão registrada para ${UnifiedContentType.FLASHCARD} ${contentId}`);
    } catch (error) {
      logger.error('Erro ao registrar revisão:', error);
      throw error;
    }
  }

  async getTodayReviews(
    user_id: string,
    limit: number = 50,
  ): Promise<UnifiedReviewItem[]> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Buscar revisões de hoje diretamente da tabela fsrs_cards
      const { data, error } = await this.supabase
        .from('fsrs_cards')
        .select('*')
        .eq('user_id', user_id)
        .gte('last_review', today.toISOString())
        .lt('last_review', tomorrow.toISOString())
        .order('last_review', { ascending: false })
        .limit(limit);

      if (error) {
        logger.error('Error fetching today reviews:', error);
        throw new AppError('Failed to fetch today reviews', 500);
      }

      const items = data || [];

      // Buscar o último grade de cada card da tabela review_history
      const mappedItems = await Promise.all(items.map(async (item) => {
        const reviewItem = await this.mapToUnifiedReviewItem(item);

        // Buscar último grade do review history
        const { data: logData } = await this.supabase
          .from('review_history')
          .select('grade')
          .eq('content_id', item.content_id)
          .eq('content_type', item.content_type)
          .eq('user_id', user_id)
          .order('reviewed_at', { ascending: false })
          .limit(1)
          .single();

        if (logData) {
          reviewItem.last_grade = logData.grade;
        }

        return reviewItem;
      }));

      return mappedItems;
    } catch (error) {
      logger.error('Error in getTodayReviews:', error);
      throw error;
    }
  }

  async getDailySummary(user_id: string, date?: Date): Promise<DailyReviewSummary> {
    try {
      const startOfDay = new Date();
      if (date) {
        startOfDay.setTime(date.getTime());
      }
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      if (date) {
        endOfDay.setTime(date.getTime());
      }
      endOfDay.setHours(23, 59, 59, 999);

      const { data: logs, error } = await this.supabase
        .from('review_history')
        .select('*')
        .eq('user_id', user_id)
        .gte('reviewed_at', startOfDay.toISOString())
        .lte('reviewed_at', endOfDay.toISOString());

      if (error) {
        logger.error('Error fetching daily summary:', error);
        throw new AppError('Failed to fetch daily summary', 500);
      }

      const reviewLogs = logs || [];
      const totalReviews = reviewLogs.length;

      const contentTypeCounts = reviewLogs.reduce(
        (acc, log) => {
          acc[log.content_type] = (acc[log.content_type] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      return {
        total_items: totalReviews,
        today_items: totalReviews,
        old_items: 0,
        flashcards: contentTypeCounts[UnifiedContentType.FLASHCARD] || 0,
        questions: contentTypeCounts[UnifiedContentType.QUESTION] || 0,
        error_notes: contentTypeCounts[UnifiedContentType.ERROR_NOTEBOOK] || 0,
        estimated_time_minutes: Math.round(totalReviews * 2),
        breakdown: {
          by_deck: [],
          by_subject: [],
          by_difficulty: [],
        },
      };
    } catch (error) {
      logger.error('Error in getDailySummary:', error);
      throw error;
    }
  }

  async createReviewItem(
    userId: string,
    contentType: UnifiedContentType,
    contentId: string,
    metadata?: any
  ): Promise<UnifiedReviewItem> {
    try {
      // Verificar se já existe um card FSRS para este conteúdo
      const { data: existingCard } = await this.supabase
        .from('fsrs_cards')
        .select('id')
        .eq('content_id', contentId)
        .eq('user_id', userId)
        .eq('content_type', contentType)
        .single();

      if (existingCard) {
        logger.info(`Card FSRS já existe para o conteúdo ${contentId}`);
        const { data: cardData } = await this.supabase
          .from('fsrs_cards')
          .select('*')
          .eq('id', existingCard.id)
          .single();
        return await this.mapToUnifiedReviewItem(cardData);
      }

      // Create initial FSRS card
      const deckId = metadata?.deck_id || '';
      const initialCard = await this.createNewCard(contentId, userId, deckId, contentType);



      const { data: cardData, error: cardError } = await this.supabase
        .from('fsrs_cards')
        .insert(initialCard)
        .select('*')
        .single();

      if (cardError) {

        throw new AppError(`Failed to create FSRS card: ${cardError.message}`, 500);
      }

      if (!cardData) {
        throw new AppError('Failed to create FSRS card: no data returned', 500);
      }

      return await this.mapToUnifiedReviewItem(cardData);
    } catch (error) {
      console.error('Error creating review item:', error);
      throw error;
    }
  }



  /**
   * Adicionar questão ao sistema de revisões FSRS
   * @param force Se true, ignora preferências de auto-add
   */
  async addQuestionToReviews(questionId: string, userId: string, force: boolean = false): Promise<void> {
    try {
      // Se não for forçado, verificar preferências
      if (!force && this.preferencesService) {
        const shouldAdd = await this.preferencesService.shouldAutoAdd(userId, UnifiedContentType.QUESTION);
        if (!shouldAdd) {
          logger.info(`Auto-add desabilitado para questões do usuário ${userId}`);
          return;
        }
      }

      // Verificar se a questão existe
      const { data: question, error: questionError } = await this.supabase
        .from('questions')
        .select('id')
        .eq('id', questionId)
        .single();

      if (questionError || !question) {
        throw new AppError('Questão não encontrada', 404);
      }

      // Verificar se já existe um card FSRS para esta questão
      const { data: existingCard } = await this.supabase
        .from('fsrs_cards')
        .select('*')
        .eq('content_id', questionId)
        .eq('user_id', userId)
        .eq('content_type', UnifiedContentType.QUESTION)
        .single();

      if (existingCard) {
        logger.info(`Card FSRS já existe para a questão ${questionId}`);
        return existingCard;
      }

      // Criar novo card FSRS
      const newCard = await this.createNewCard(questionId, userId, '', UnifiedContentType.QUESTION);

      // Aplicar smart scheduling para considerar dias de estudo disponíveis
      const adjustedDueDate = await this.applySmartScheduling(
        userId,
        newCard.due,
        UnifiedContentType.QUESTION
      );

      const { data: insertedCard, error: insertError } = await this.supabase
        .from('fsrs_cards')
        .insert({
          ...newCard,
          due: adjustedDueDate.toISOString(),
        })
        .select()
        .single();

      if (insertError || !insertedCard) {
        logger.error('Erro ao criar card FSRS para questão:', insertError);
        throw new AppError('Erro ao adicionar questão às revisões', 500);
      }

      // 🔥 SINCRONIZAR EVENTO DO PLANNER (criar/atualizar evento para a data do due)
      await this.syncPlannerEvent(userId, { ...insertedCard, due: adjustedDueDate });

      logger.info(`Questão ${questionId} adicionada ao sistema FSRS`);
      return insertedCard;
    } catch (error) {
      logger.error('Erro ao adicionar questão às revisões:', error);
      throw error;
    }
  }

  /**
   * Atualizar card FSRS de questão sem registrar no histórico de revisões
   * Usado quando o usuário responde via lista/simulado (não é revisão ativa)
   */
  async updateQuestionCardOnly(
    userId: string,
    questionId: string,
    isCorrect: boolean,
    isActiveReview: boolean = false
  ): Promise<void> {
    try {
      // Garantir que a questão está no sistema de revisões
      await this.addQuestionToReviews(questionId, userId);

      // Converter isCorrect para FSRSGrade
      const grade = isCorrect ? FSRSGrade.GOOD : FSRSGrade.AGAIN;

      // Buscar card FSRS
      const { data: card, error: cardError } = await this.supabase
        .from('fsrs_cards')
        .select('*')
        .eq('content_id', questionId)
        .eq('user_id', userId)
        .eq('content_type', UnifiedContentType.QUESTION)
        .single();

      if (cardError || !card) {
        logger.info(`Card FSRS não encontrado para questão ${questionId}, será criado na próxima revisão`);
        return; // Não é erro crítico - card será criado quando necessário
      }

      // Processar revisão com o parâmetro isActiveReview
      const schedulingInfo = await this.processReview(card, grade, userId, isActiveReview);

      // Salvar card atualizado
      const { error: updateError } = await this.supabase
        .from('fsrs_cards')
        .update({
          ...schedulingInfo.card,
          updated_at: new Date().toISOString(),
        })
        .eq('id', card.id);

      if (updateError) {
        logger.error('Erro ao atualizar card FSRS:', updateError);
        throw new AppError('Erro ao salvar card', 500);
      }

      // 🔥 SINCRONIZAR EVENTO DO PLANNER (criar/atualizar evento para a data do due)
      await this.syncPlannerEvent(userId, schedulingInfo.card);

      // 🔥 INCREMENTAR COMPLETED_COUNT DO EVENTO DA DATA ORIGINAL (sempre true para questões em revisão)
      // Usar o due ORIGINAL do card (antes da revisão) para incrementar o evento correto
      const originalDue = new Date(card.due);
      await this.incrementCompletedCount(userId, UnifiedContentType.QUESTION, originalDue);

      // Salvar histórico de revisão
      const repository = new SupabaseUnifiedReviewRepository(this.supabase);
      await (repository as any).saveReviewHistory(
        userId,
        UnifiedContentType.QUESTION,
        questionId,
        grade,
        undefined,
        schedulingInfo.card,
        isActiveReview
      );

      const reviewType = isActiveReview ? 'revisão ativa' : 'estudo';
      logger.info(`Card FSRS atualizado para questão ${questionId} (${reviewType})`);
    } catch (error) {
      logger.error('Erro ao atualizar card FSRS:', error);
      // Não lançar erro - não é crítico
    }
  }

  /**
   * Registrar resposta de questão (com histórico de revisão)
   * Usado apenas quando o usuário está fazendo revisão ativa
   */
  async recordQuestionResponse(
    userId: string,
    questionId: string,
    isCorrect: boolean,
    timeSpent: number
  ): Promise<void> {
    try {
      // Garantir que a questão está no sistema de revisões
      await this.addQuestionToReviews(questionId, userId);

      // Converter isCorrect para FSRSGrade
      const grade = isCorrect ? FSRSGrade.GOOD : FSRSGrade.AGAIN; // Good (2) se correto, Again (0) se incorreto

      // Buscar card FSRS com retry (pode ter sido criado recentemente)
      let card = null;
      let cardError = null;

      for (let attempt = 0; attempt < 3; attempt++) {
        const result = await this.supabase
          .from('fsrs_cards')
          .select('*')
          .eq('content_id', questionId)
          .eq('user_id', userId)
          .eq('content_type', UnifiedContentType.QUESTION)
          .single();

        card = result.data;
        cardError = result.error;

        if (card) break;

        // Aguardar 100ms antes de tentar novamente
        if (attempt < 2) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      if (cardError || !card) {
        logger.error(`Card FSRS não encontrado após 3 tentativas para questão ${questionId}`);
        throw new AppError('Card FSRS não encontrado', 404);
      }

      // Processar revisão (isActiveReview = true, pois é revisão ativa na página de revisões)
      const schedulingInfo = await this.processReview(card, grade, userId, true);

      // Salvar card atualizado
      const { error: updateError } = await this.supabase
        .from('fsrs_cards')
        .update({
          ...schedulingInfo.card,
          updated_at: new Date().toISOString(),
        })
        .eq('id', card.id);

      if (updateError) {
        logger.error('Erro ao atualizar card FSRS:', updateError);
        throw new AppError('Erro ao salvar revisão', 500);
      }

      // Salvar histórico de revisão
      const repository = new SupabaseUnifiedReviewRepository(this.supabase);
      await (repository as any).saveReviewHistory(
        userId,
        UnifiedContentType.QUESTION,
        questionId,
        grade,
        timeSpent,
        schedulingInfo.card
      );

      // ✅ TAMBÉM SALVAR EM question_responses para histórico unificado
      try {
        // Calcular attempt_number
        const { count } = await this.supabase
          .from('question_responses')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('question_id', questionId);

        const attemptNumber = (count || 0) + 1;

        await this.supabase
          .from('question_responses')
          .insert({
            id: `response_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            user_id: userId,
            question_id: questionId,
            selected_alternative_id: '', // Não temos essa info no UnifiedReview
            is_correct_on_first_attempt: attemptNumber === 1 ? isCorrect : false,
            study_mode: 'unified_review',  // ✅ Identifica que foi em revisão
            was_focus_mode: false,
            attempt_number: attemptNumber,
            answered_at: { value: new Date().toISOString() },
            created_at: { value: new Date().toISOString() },
          });

        logger.info(`Resposta também salva em question_responses para histórico unificado`);
      } catch (historyError) {
        logger.error('Erro ao salvar em question_responses (não crítico):', historyError);
      }

      logger.info(`Resposta da questão ${questionId} registrada`);
    } catch (error) {
      logger.error('Erro ao registrar resposta da questão:', error);
      throw error;
    }
  }

  /**
   * Criar entrada no caderno de erros
   */
  async createErrorEntry(
    userId: string,
    questionId: string,
    errorDescription: string,
    solution: string,
    notebookId?: string
  ): Promise<string> {
    try {
      // Verificar se a questão existe
      const { data: question, error: questionError } = await this.supabase
        .from('questions')
        .select('id')
        .eq('id', questionId)
        .single();

      if (questionError || !question) {
        throw new AppError('Questão não encontrada', 404);
      }

      const entryId = await generateReviewId(userId, questionId);

      // Criar entrada no caderno de erros
      const { error: entryError } = await this.supabase
        .from('error_notebook_entries')
        .insert({
          id: entryId,
          user_id: userId,
          question_id: questionId,
          notebook_id: notebookId,
          error_description: errorDescription,
          solution: solution,
          is_in_review_system: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (entryError) {
        logger.error('Erro ao criar entrada no caderno de erros:', entryError);
        throw new AppError('Erro ao criar entrada', 500);
      }

      // Criar card FSRS para a entrada
      const newCard = await this.createNewCard(entryId, userId, `error_notebook_${notebookId || 'default'}`, UnifiedContentType.ERROR_NOTEBOOK);

      const { error: cardError } = await this.supabase
        .from('fsrs_cards')
        .insert(newCard);

      if (cardError) {
        logger.error('Erro ao criar card FSRS:', cardError);
        throw new AppError('Erro ao criar card FSRS', 500);
      }

      logger.info(`Entrada do caderno de erros ${entryId} criada`);
      return entryId;
    } catch (error) {
      logger.error('Erro ao criar entrada no caderno de erros:', error);
      throw error;
    }
  }

  // MÉTODO REMOVIDO - Duplicata do addErrorNoteToReview que está na linha ~904
  // O método correto usa processReview com grade AGAIN para criar o card FSRS

  /**
   * Registrar revisão de entrada do caderno de erros
   */
  async recordErrorNotebookEntryReview(
    entryId: string,
    userId: string,
    selfAssessment: number,
    reviewTimeMs?: number,
    isActiveReview: boolean = false
  ): Promise<void> {
    try {
      // Verificar se a entrada existe
      const { data: entry, error: entryError } = await this.supabase
        .from('error_notebook_entries')
        .select('id')
        .eq('id', entryId)
        .eq('user_id', userId)
        .single();

      if (entryError || !entry) {
        throw new AppError('Entrada não encontrada', 404);
      }

      // Converter qualidade para FSRSGrade
      const grade = this.convertQualityToGrade(selfAssessment);

      // Buscar card FSRS
      const { data: card, error: cardError } = await this.supabase
        .from('fsrs_cards')
        .select('*')
        .eq('content_id', entryId)
        .eq('user_id', userId)
        .eq('content_type', UnifiedContentType.ERROR_NOTEBOOK)
        .single();

      if (cardError || !card) {
        throw new AppError('Card FSRS não encontrado', 404);
      }

      // Processar revisão com threshold
      const updatedCard = await this.processReview(card, grade, userId, isActiveReview);

      // Atualizar card no banco
      const { error: updateError } = await this.supabase
        .from('fsrs_cards')
        .update({
          due: updatedCard.card.due.toISOString(),
          stability: updatedCard.card.stability,
          difficulty: updatedCard.card.difficulty,
          elapsed_days: updatedCard.card.elapsed_days,
          scheduled_days: updatedCard.card.scheduled_days,
          reps: updatedCard.card.reps,
          lapses: updatedCard.card.lapses,
          state: updatedCard.card.state,
          last_review: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', card.id);

      if (updateError) {
        logger.error('Erro ao atualizar card FSRS:', updateError);
        throw new AppError('Erro ao registrar revisão', 500);
      }

      // 🔥 SINCRONIZAR EVENTO DO PLANNER (criar/atualizar evento para a data do due)
      await this.syncPlannerEvent(userId, updatedCard.card);

      // 🔥 INCREMENTAR COMPLETED_COUNT DO EVENTO DA DATA ORIGINAL (sempre true para caderno em revisão)
      // Usar o due ORIGINAL do card (antes da revisão) para incrementar o evento correto
      const originalDue = new Date(card.due);
      await this.incrementCompletedCount(userId, UnifiedContentType.ERROR_NOTEBOOK, originalDue);

      // Salvar histórico de revisão
      const repository = new SupabaseUnifiedReviewRepository(this.supabase);
      await (repository as any).saveReviewHistory(
        userId,
        UnifiedContentType.ERROR_NOTEBOOK,
        entryId,
        grade,
        reviewTimeMs || 0,
        updatedCard.card
      );

      // Atualizar entrada com data da última revisão
      const { error: entryUpdateError } = await this.supabase
        .from('error_notebook_entries')
        .update({
          last_reviewed_at: new Date().toISOString(),
        })
        .eq('id', entryId);

      if (entryUpdateError) {
        logger.warn('Erro ao atualizar data de revisão da entrada:', entryUpdateError);
      }

      logger.info(`Revisão da entrada ${entryId} registrada com sucesso`);
    } catch (error) {
      logger.error('Erro ao registrar revisão da entrada:', error);
      throw error;
    }
  }

  /**
   * Registrar revisão de entrada do caderno de erros (método legado)
   */
  async recordEntryReview(
    entryId: string,
    userId: string,
    quality: number
  ): Promise<void> {
    try {
      // Verificar se a entrada existe
      const { data: entry, error: entryError } = await this.supabase
        .from('error_notebook_entries')
        .select('id')
        .eq('id', entryId)
        .eq('user_id', userId)
        .single();

      if (entryError || !entry) {
        throw new AppError('Entrada não encontrada', 404);
      }

      // Converter qualidade para FSRSGrade
      const grade = this.convertQualityToGrade(quality);

      // Buscar card FSRS
      const { data: card, error: cardError } = await this.supabase
        .from('fsrs_cards')
        .select('*')
        .eq('content_id', entryId)
        .eq('user_id', userId)
        .eq('content_type', UnifiedContentType.ERROR_NOTEBOOK)
        .single();

      if (cardError || !card) {
        throw new AppError('Card FSRS não encontrado', 404);
      }

      // Processar revisão (método legado - assume não é revisão ativa)
      const schedulingInfo = await this.processReview(card, grade, userId, false);

      // Salvar card atualizado
      const { error: updateError } = await this.supabase
        .from('fsrs_cards')
        .update({
          ...schedulingInfo.card,
          updated_at: new Date().toISOString(),
        })
        .eq('id', card.id);

      if (updateError) {
        logger.error('Erro ao atualizar card FSRS:', updateError);
        throw new AppError('Erro ao salvar revisão', 500);
      }

      // 🔥 SINCRONIZAR EVENTO DO PLANNER (criar/atualizar evento para a data do due)
      await this.syncPlannerEvent(userId, schedulingInfo.card);

      // Atualizar entrada com data da última revisão
      const { error: entryUpdateError } = await this.supabase
        .from('error_notebook_entries')
        .update({
          last_reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', entryId);

      if (entryUpdateError) {
        logger.error('Erro ao atualizar entrada:', entryUpdateError);
      }

      // Salvar histórico de revisão
      const repository = new SupabaseUnifiedReviewRepository(this.supabase);
      await (repository as any).saveReviewHistory(
        userId,
        UnifiedContentType.ERROR_NOTEBOOK,
        entryId,
        grade,
        undefined,
        schedulingInfo.card
      );

      logger.info(`Revisão da entrada ${entryId} registrada`);
    } catch (error) {
      logger.error('Erro ao registrar revisão da entrada:', error);
      throw error;
    }
  }

  /**
   * Registrar revisão de flashcard
   */
  async recordFlashcardReview(
    userId: string,
    flashcardId: string,
    grade: number,
    deckId?: string
  ): Promise<void> {
    try {
      // Buscar o card FSRS existente
      const { data: existingCard, error: cardError } = await this.supabase
        .from('fsrs_cards')
        .select('*')
        .eq('user_id', userId)
        .eq('content_id', flashcardId)
        .eq('content_type', UnifiedContentType.FLASHCARD)
        .single();

      if (cardError && cardError.code !== 'PGRST116') {
        throw cardError;
      }

      let card: FSRSCard;
      if (existingCard) {
        card = existingCard;
      } else {
        // Criar novo card se não existir
        card = await this.createNewCard(flashcardId, userId, deckId || '', UnifiedContentType.FLASHCARD);
      }

      // Usar o grade diretamente
      const fsrsGrade = grade;

      // Processar a revisão (assume não é revisão ativa por padrão)
      const schedulingInfo = await this.processReview(card, fsrsGrade, userId, false);

      // Atualizar o card FSRS
      const { error: updateError } = await this.supabase
        .from('fsrs_cards')
        .upsert({
          ...schedulingInfo.card,
          due: schedulingInfo.card.due.toISOString(),
          last_review: schedulingInfo.card.last_review ? schedulingInfo.card.last_review.toISOString() : null,
          updated_at: new Date().toISOString(),
        });

      if (updateError) {
        throw updateError;
      }

      // 🔥 SINCRONIZAR EVENTO DO PLANNER (criar/atualizar evento para a data do due)
      await this.syncPlannerEvent(userId, schedulingInfo.card);

      // Salvar histórico de revisão (isActiveReview = false porque é estudo, não revisão)
      const repository = new SupabaseUnifiedReviewRepository(this.supabase);
      await (repository as any).saveReviewHistory(
        userId,
        UnifiedContentType.FLASHCARD,
        flashcardId,
        fsrsGrade,
        undefined,
        schedulingInfo.card,
        false // isActiveReview = false (página de flashcards)
      );

      // Flashcard atualizado apenas através do unifiedreview - sem campos SRS duplicados

      logger.info(`Revisão do flashcard ${flashcardId} registrada`);
    } catch (error) {
      logger.error('Erro ao registrar revisão de flashcard:', error);
      throw error;
    }
  }

  /**
   * Obter estatísticas FSRS para questões
   */
  async getQuestionFSRSStats(
    userId: string
  ): Promise<{
    total_questions: number;
    due_questions: number;
  }> {
    try {
      const { data: cards, error } = await this.supabase
        .from('fsrs_cards')
        .select('*')
        .eq('user_id', userId)
        .eq('content_type', UnifiedContentType.QUESTION);

      if (error) {
        logger.error('Erro ao buscar estatísticas FSRS de questões:', error);
        throw new AppError('Erro ao buscar estatísticas', 500);
      }

      const total_questions = cards?.length || 0;
      const due_questions = cards?.filter(card =>
        new Date(card.due) <= new Date()
      ).length || 0;

      return {
        total_questions,
        due_questions,
      };
    } catch (error) {
      logger.error('Erro ao obter estatísticas FSRS de questões:', error);
      throw error;
    }
  }

  /**
   * Obter estatísticas FSRS para caderno de erros
   */
  async getErrorNotebookFSRSStats(
    userId: string
  ): Promise<{
    total_entries: number;
    due_entries: number;
    resolved_entries: number;
  }> {
    try {
      let query = this.supabase
        .from('fsrs_cards')
        .select('*')
        .eq('user_id', userId)
        .eq('content_type', UnifiedContentType.ERROR_NOTEBOOK);

      const { data: cards, error } = await query;

      if (error) {
        logger.error('Erro ao buscar estatísticas FSRS do caderno de erros:', error);
        throw new AppError('Erro ao buscar estatísticas', 500);
      }

      const total_entries = cards?.length || 0;
      const due_entries = cards?.filter(card =>
        new Date(card.due) <= new Date()
      ).length || 0;
      const resolved_entries = cards?.filter(card =>
        card.state === FSRSState.REVIEW && card.stability > 30
      ).length || 0;

      return {
        total_entries,
        due_entries,
        resolved_entries,
      };
    } catch (error) {
      logger.error('Erro ao obter estatísticas FSRS do caderno de erros:', error);
      throw error;
    }
  }

  /**
   * Obter questões devidas
   */
  async getDueQuestions(
    userId: string,
    limit?: number
  ): Promise<UnifiedReviewItem[]> {
    try {
      const dueItems = await this.getDueReviews(userId, limit, [UnifiedContentType.QUESTION]);

      const result = [];
      for (const item of dueItems) {
        const { data: question, error } = await this.supabase
          .from('questions')
          .select('*')
          .eq('id', item.content_id)
          .single();

        if (!error && question) {
          const { data: card } = await this.supabase
            .from('fsrs_cards')
            .select('*')
            .eq('content_id', item.content_id)
            .eq('user_id', userId)
            .eq('content_type', UnifiedContentType.QUESTION)
            .single();

          if (card) {
            result.push({
              id: card.id,
              user_id: card.user_id,
              content_type: card.content_type,
              content_id: card.content_id,
              title: question.question_text || 'Questão',
              subtitle: `Dificuldade: ${question.difficulty_level}`,
              front_content: question.question_text,
              back_content: question.explanation,
              due: new Date(card.due),
              stability: card.stability,
              difficulty: card.difficulty,
              elapsed_days: card.elapsed_days,
              scheduled_days: card.scheduled_days,
              reps: card.reps,
              lapses: card.lapses,
              state: card.state,
              last_review: card.last_review ? new Date(card.last_review) : null,
              tags: question.tags,
              created_at: card.created_at,
              updated_at: card.updated_at
            });
          }
        }
      }

      return result;
    } catch (error) {
      logger.error('Erro ao obter questões devidas:', error);
      throw error;
    }
  }

  /**
   * Obter entradas devidas do caderno de erros
   */
  async getDueErrorNotebookEntries(
    userId: string,
    limit?: number
  ): Promise<UnifiedReviewItem[]> {
    try {
      const dueItems = await this.getDueReviews(userId, limit, [UnifiedContentType.ERROR_NOTEBOOK]);

      const result = [];
      for (const item of dueItems) {
        const { data: entry, error } = await this.supabase
          .from('error_notebook_entries')
          .select('*')
          .eq('id', item.content_id)
          .single();

        if (!error && entry) {
          const { data: card } = await this.supabase
            .from('fsrs_cards')
            .select('*')
            .eq('content_id', item.content_id)
            .eq('user_id', userId)
            .eq('content_type', UnifiedContentType.ERROR_NOTEBOOK)
            .single();

          if (card) {
            result.push({
              id: card.id,
              user_id: card.user_id,
              content_type: card.content_type,
              content_id: card.content_id,
              title: entry.error_description || 'Entrada do caderno de erros',
              subtitle: `Notebook: ${entry.notebook_id}`,
              front_content: entry.error_description,
              back_content: entry.solution,
              due: new Date(card.due),
              stability: card.stability,
              difficulty: card.difficulty,
              elapsed_days: card.elapsed_days,
              scheduled_days: card.scheduled_days,
              reps: card.reps,
              lapses: card.lapses,
              state: card.state,
              last_review: card.last_review ? new Date(card.last_review) : null,
              tags: entry.tags,
              created_at: card.created_at,
              updated_at: card.updated_at
            });
          }
        }
      }

      return result;
    } catch (error) {
      logger.error('Erro ao obter entradas devidas do caderno de erros:', error);
      throw error;
    }
  }

  /**
   * Converter qualidade de revisão para FSRSGrade
   */
  private convertQualityToGrade(quality: number): FSRSGrade {
    switch (quality) {
      case 1:
        return FSRSGrade.AGAIN;
      case 2:
        return FSRSGrade.HARD;
      case 3:
        return FSRSGrade.GOOD;
      case 4:
        return FSRSGrade.EASY;
      default:
        return FSRSGrade.GOOD;
    }
  }

  private async enrichCardWithContent(card: any): Promise<UnifiedReviewItem | null> {
    try {
      switch (card.content_type) {
        case UnifiedContentType.FLASHCARD:
          return await this.enrichFlashcardContent(card);
        case UnifiedContentType.QUESTION:
          return await this.enrichQuestionContent(card);
        case UnifiedContentType.ERROR_NOTEBOOK:
          return await this.enrichErrorNotebookContent(card);
        default:
          logger.warn(`Unknown content type: ${card.content_type}`);
          return null;
      }
    } catch (error) {
      logger.error(`Error enriching card content for ${card.content_type}:`, error);
      return null;
    }
  }

  private async enrichFlashcardContent(card: any): Promise<UnifiedReviewItem | null> {
    const { data: flashcard, error } = await this.supabase
      .from('flashcards')
      .select('front_content, back_content, tags')
      .eq('id', card.content_id)
      .single();

    if (error) {
      logger.error(`❌ [enrichFlashcard] Erro ao buscar flashcard ${card.content_id}:`, error);
    }

    if (!flashcard) {
      logger.warn(`⚠️ [enrichFlashcard] Flashcard ${card.content_id} não encontrado no resultado`);
    }

    if (error || !flashcard) {
      // Não deletar cards de teste
      if (card.content_id.startsWith('test_')) {
        logger.info(`✅ [enrichFlashcard] Card de teste: ${card.content_id}`);
        return {
          id: card.id,
          user_id: card.user_id,
          content_type: card.content_type,
          content_id: card.content_id,
          title: `[TESTE] Flashcard ${card.content_id}`,
          subtitle: 'Card de teste para desenvolvimento',
          due: card.due,
          state: card.state,
          difficulty: card.difficulty,
          stability: card.stability,
          last_review: card.last_review,
          reps: card.reps,
          lapses: card.lapses,
          elapsed_days: card.elapsed_days,
          scheduled_days: card.scheduled_days,
          created_at: card.created_at,
          updated_at: card.updated_at,
        };
      }

      logger.warn(`🗑️ [enrichFlashcard] Flashcard ${card.content_id} não encontrado, removendo card FSRS correspondente`);
      // Opcional: remover o card FSRS órfão
      await this.supabase
        .from('fsrs_cards')
        .delete()
        .eq('id', card.id);
      return null;
    }

    return {
      id: card.id,
      user_id: card.user_id,
      content_type: card.content_type,
      content_id: card.content_id,
      title: flashcard.front_content,
      subtitle: undefined,
      front_content: flashcard.front_content,
      back_content: flashcard.back_content,
      due: new Date(card.due),
      stability: card.stability,
      difficulty: card.difficulty,
      elapsed_days: card.elapsed_days,
      scheduled_days: card.scheduled_days,
      reps: card.reps,
      lapses: card.lapses,
      state: card.state,
      last_review: card.last_review ? new Date(card.last_review) : null,
      tags: flashcard.tags,
      created_at: card.created_at,
      updated_at: card.updated_at,
    };
  }

  private async enrichQuestionContent(card: any): Promise<UnifiedReviewItem | null> {
    const { data: question, error } = await this.supabase
      .from('questions')
      .select('title, content, explanation, tags, difficulty')
      .eq('id', card.content_id)
      .single();

    if (error || !question) {
      // Não deletar cards de teste
      if (card.content_id.startsWith('test_')) {
        return {
          id: card.id,
          user_id: card.user_id,
          content_type: card.content_type,
          content_id: card.content_id,
          title: `[TESTE] Questão ${card.content_id}`,
          subtitle: 'Card de teste para desenvolvimento',
          due: card.due,
          state: card.state,
          difficulty: card.difficulty,
          stability: card.stability,
          last_review: card.last_review,
          reps: card.reps,
          lapses: card.lapses,
          elapsed_days: card.elapsed_days,
          scheduled_days: card.scheduled_days,
          created_at: card.created_at,
          updated_at: card.updated_at,
        };
      }

      logger.warn(`Questão ${card.content_id} não encontrada (erro: ${error?.message}), removendo card FSRS correspondente`);
      // Remover o card FSRS órfão
      await this.supabase
        .from('fsrs_cards')
        .delete()
        .eq('id', card.id);
      return null;
    }

    // Extrair texto limpo do HTML
    const questionText = question.content || question.title || '';
    const cleanText = questionText.replace(/<[^>]*>/g, '').substring(0, 100);

    return {
      id: card.id,
      user_id: card.user_id,
      content_type: card.content_type,
      content_id: card.content_id,
      title: cleanText + (cleanText.length >= 100 ? '...' : ''),
      subtitle: question.difficulty ? `Dificuldade: ${question.difficulty}` : undefined,
      front_content: question.content,
      back_content: question.explanation,
      due: new Date(card.due),
      stability: card.stability,
      difficulty: card.difficulty,
      elapsed_days: card.elapsed_days,
      scheduled_days: card.scheduled_days,
      reps: card.reps,
      lapses: card.lapses,
      state: card.state,
      last_review: card.last_review ? new Date(card.last_review) : null,
      tags: question.tags,
      created_at: card.created_at,
      updated_at: card.updated_at,
    };
  }

  private async enrichErrorNotebookContent(card: any): Promise<UnifiedReviewItem | null> {
    const { data: entry, error } = await this.supabase
      .from('error_notebook_entries')
      .select('user_note, user_explanation, tags, question_id, question_statement, difficulty, confidence')
      .eq('id', card.content_id)
      .single();

    if (error || !entry) {
      // Não deletar cards de teste
      if (card.content_id.startsWith('test_')) {
        return {
          id: card.id,
          user_id: card.user_id,
          content_type: card.content_type,
          content_id: card.content_id,
          title: `[TESTE] Caderno de Erros ${card.content_id}`,
          subtitle: 'Card de teste para desenvolvimento',
          due: card.due,
          state: card.state,
          difficulty: card.difficulty,
          stability: card.stability,
          last_review: card.last_review,
          reps: card.reps,
          lapses: card.lapses,
          elapsed_days: card.elapsed_days,
          scheduled_days: card.scheduled_days,
          created_at: card.created_at,
          updated_at: card.updated_at,
        };
      }

      logger.warn(`Entrada do caderno de erros ${card.content_id} não encontrada, removendo card FSRS correspondente`);
      // Opcional: remover o card FSRS órfão
      await this.supabase
        .from('fsrs_cards')
        .delete()
        .eq('id', card.id);
      return null;
    }

    const questionText = entry.question_statement || 'Questão não encontrada';
    const userNote = entry.user_note || 'Sem anotação';

    return {
      id: card.id,
      user_id: card.user_id,
      content_type: card.content_type,
      content_id: card.content_id,
      title: userNote.replace(/<[^>]*>/g, '').substring(0, 100) + (userNote.length > 100 ? '...' : ''),
      subtitle: questionText.replace(/<[^>]*>/g, '').substring(0, 50) + '...',
      front_content: `Anotação: ${userNote}\n\nQuestão: ${questionText}`,
      back_content: entry.user_explanation || 'Sem explicação',
      due: new Date(card.due),
      stability: card.stability,
      difficulty: card.difficulty,
      elapsed_days: card.elapsed_days,
      scheduled_days: card.scheduled_days,
      reps: card.reps,
      lapses: card.lapses,
      state: card.state,
      last_review: card.last_review ? new Date(card.last_review) : null,
      tags: entry.tags,
      created_at: card.created_at,
      updated_at: card.updated_at,
    };
  }

  private async mapToUnifiedReviewItem(data: any): Promise<UnifiedReviewItem> {
    return await this.enrichCardWithContent(data) || {
      id: data.id,
      user_id: data.user_id,
      content_type: data.content_type as UnifiedContentType,
      content_id: data.content_id,
      title: data.title || 'Sem título',
      subtitle: data.subtitle || null,
      front_content: data.front_content || '',
      back_content: data.back_content || '',
      due: new Date(data.due),
      stability: data.stability || 0,
      difficulty: data.difficulty || 0,
      elapsed_days: data.elapsed_days || 0,
      scheduled_days: data.scheduled_days || 0,
      reps: data.reps || 0,
      lapses: data.lapses || 0,
      state: data.state || 0,
      last_review: data.last_review ? new Date(data.last_review) : null,
      tags: data.tags || [],
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  }

  /**
   * Obter revisões completadas
   */
  async getCompletedReviews(
    userId: string,
    filters?: {
      limit?: number;
      days?: number;
      content_type?: UnifiedContentType;
    }
  ): Promise<any[]> {
    try {
      const limit = filters?.limit || 50;
      const days = filters?.days || 7;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      let query = this.supabase
        .from('review_history')
        .select('*')
        .eq('user_id', userId)
        .gte('reviewed_at', startDate.toISOString())
        .order('reviewed_at', { ascending: false });

      if (filters?.content_type) {
        query = query.eq('content_type', filters.content_type);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Erro ao buscar revisões completadas:', error);
        throw new AppError('Failed to get completed reviews', 500);
      }

      // Agrupar revisões por content_id e manter apenas a mais recente de cada
      const groupedReviews = new Map<string, any>();
      const reviewCounts = new Map<string, number>();

      (data || []).forEach(review => {
        const key = review.content_id;

        // Contar total de revisões para este content_id
        reviewCounts.set(key, (reviewCounts.get(key) || 0) + 1);

        // Manter apenas a revisão mais recente (primeira no array ordenado)
        if (!groupedReviews.has(key)) {
          groupedReviews.set(key, {
            ...review,
            total_reviews: 0 // Será atualizado depois
          });
        }
      });

      // Atualizar contagem de revisões
      groupedReviews.forEach((review, contentId) => {
        review.total_reviews = reviewCounts.get(contentId) || 1;
      });

      // Converter para array e aplicar limite
      const uniqueReviews = Array.from(groupedReviews.values()).slice(0, limit);

      // Enriquecer dados com títulos, dados do FSRS e análise de padrões
      const enrichedData = await Promise.all(
        uniqueReviews.map(async (reviewHistory) => {
          let title = 'Sem título';
          let fsrsData = null;
          let performancePattern = null;

          try {
            logger.info(`[getCompletedReviews] Processando: content_type=${reviewHistory.content_type}, content_id=${reviewHistory.content_id}`);

            // Converter content_id para UUID se necessário (mesmo processo usado no getReviewHistory)
            const contentUuid = reviewHistory.content_id.length > 36 ? uuidv5(reviewHistory.content_id, uuidv5.DNS) : reviewHistory.content_id;

            // Analisar padrão de desempenho
            try {
              performancePattern = await this.analyzePerformancePattern(userId, reviewHistory.content_id);
            } catch (patternError) {
              logger.warn(`Erro ao analisar padrão de desempenho para ${reviewHistory.content_id}:`, patternError);
            }

            if (reviewHistory.content_type === 'FLASHCARD') {
              // O content_id na review_history é um UUID gerado a partir do ID original do flashcard
              // Precisamos buscar na fsrs_cards e encontrar qual content_id gera este UUID
              const { data: fsrsCards, error: fsrsError } = await this.supabase
                .from('fsrs_cards')
                .select('content_id, stability, difficulty, reps, lapses, state')
                .eq('content_type', 'FLASHCARD');

              if (fsrsCards && fsrsCards.length > 0) {
                // Encontrar o flashcard cujo ID gera o UUID que estamos procurando
                let matchingCard = null;
                for (const card of fsrsCards) {
                  const generatedUuid = card.content_id.length > 36 ? uuidv5(card.content_id, uuidv5.DNS) : card.content_id;
                  if (generatedUuid === contentUuid) {
                    matchingCard = card;
                    break;
                  }
                }

                if (matchingCard) {
                  // Armazenar dados do FSRS
                  fsrsData = {
                    stability: matchingCard.stability,
                    difficulty: matchingCard.difficulty,
                    reps: matchingCard.reps,
                    lapses: matchingCard.lapses,
                    state: matchingCard.state
                  };

                  // Buscar o front_content na tabela flashcards usando o content_id original
                  const { data: flashcard, error: flashcardError } = await this.supabase
                    .from('flashcards')
                    .select('front_content')
                    .eq('id', matchingCard.content_id)
                    .single();

                  logger.info(`[getCompletedReviews] Flashcard query result:`, { flashcard, error: flashcardError });

                  if (flashcard?.front_content) {
                    title = flashcard.front_content;
                    logger.info(`[getCompletedReviews] Título encontrado: ${title}`);
                  } else {
                    logger.warn(`[getCompletedReviews] Flashcard não encontrado ou sem front_content para ID: ${matchingCard.content_id}`);
                  }
                } else {
                  logger.warn(`[getCompletedReviews] Nenhum flashcard encontrado que gere o UUID: ${contentUuid}`);
                }
              } else {
                logger.warn(`[getCompletedReviews] Erro ao buscar fsrs_cards:`, { error: fsrsError });
              }
            } else if (reviewHistory.content_type === 'QUESTION') {
              const { data: question } = await this.supabase
                .from('questions')
                .select('question_text')
                .eq('id', contentUuid)
                .single();

              if (question?.question_text) {
                title = question.question_text;
              }
            } else if (reviewHistory.content_type === 'ERROR_NOTEBOOK') {
              const { data: entry } = await this.supabase
                .from('error_notebook_entries')
                .select('error_description')
                .eq('id', contentUuid)
                .single();

              if (entry?.error_description) {
                title = entry.error_description;
              }
            }
          } catch (err) {
            logger.warn(`Erro ao buscar título para ${reviewHistory.content_type} ${reviewHistory.content_id}:`, err);
          }

          return {
            ...reviewHistory,
            title,
            ...fsrsData, // Inclui stability, difficulty, reps, lapses, state se for flashcard
            performance_pattern: performancePattern // Inclui análise de padrão de desempenho
          };
        })
      );

      return enrichedData;
    } catch (error) {
      logger.error('Erro ao obter revisões completadas:', error);
      throw error;
    }
  }

  /**
   * Buscar histórico de revisões de um content_id específico
   */
  async getReviewHistory(userId: string, contentId: string): Promise<any[]> {
    try {
      // Converter contentId para UUID se necessário (mesmo processo usado no saveReviewHistory)
      const contentUuid = contentId.length > 36 ? uuidv5(contentId, uuidv5.DNS) : contentId;

      console.log(`[getReviewHistory] contentId: ${contentId}`);
      console.log(`[getReviewHistory] contentUuid: ${contentUuid}`);
      console.log(`[getReviewHistory] userId: ${userId}`);

      const { data, error } = await this.supabase
        .from('review_history')
        .select('*')
        .eq('user_id', userId)
        .eq('content_id', contentUuid)
        .order('reviewed_at', { ascending: false })
        .limit(20);

      if (error) {
        logger.error('Erro ao buscar histórico de revisões:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error('Erro ao obter histórico de revisões:', error);
      throw error;
    }
  }

  /**
   * Analisar padrões de desempenho baseado no histórico de revisões
   */
  async analyzePerformancePattern(userId: string, contentId: string): Promise<{
    pattern: string;
    message: string;
  }> {
    try {
      const reviewHistory = await this.getReviewHistory(userId, contentId);

      if (reviewHistory.length < 2) {
        return {
          pattern: 'insufficient_data',
          message: 'Poucos dados para análise'
        };
      }

      // Analisar as últimas revisões (máximo 10)
      const recentReviews = reviewHistory.slice(0, Math.min(10, reviewHistory.length));
      const grades = recentReviews.map(r => r.grade).reverse(); // Ordem cronológica (mais antiga para mais recente)

      logger.info(`[analyzePerformancePattern] Analisando grades para ${contentId}:`, grades);

      // Categorizar grades: 0=Again (erro), 1=Hard (difícil), 2=Good (bom), 3=Easy (fácil)
      const successes = grades.filter(g => g >= 2); // Good ou Easy

      const successRate = successes.length / grades.length;

      // Analisar últimas 3 revisões vs primeiras 3 para detectar tendências
      const recentGrades = grades.slice(-3); // Últimas 3
      const earlyGrades = grades.slice(0, 3); // Primeiras 3

      const recentSuccesses = recentGrades.filter(g => g >= 2).length;
      const earlySuccesses = earlyGrades.filter(g => g >= 2).length;

      // Analisar sequência específica do exemplo: [2, 2, 3, 0] (Bom, Bom, Fácil, Novamente)
      const lastGrade = grades[grades.length - 1];
      const secondLastGrade = grades[grades.length - 2];
      const thirdLastGrade = grades[grades.length - 3];

      // Caso específico: estava indo bem e errou na última
      if (grades.length >= 3 && lastGrade < 2 && secondLastGrade >= 2 && thirdLastGrade >= 2) {
        const previousSuccesses = grades.slice(0, -1).filter(g => g >= 2).length;
        const previousRate = previousSuccesses / (grades.length - 1);

        if (previousRate >= 0.7) {
          return {
            pattern: 'recent_regression',
            message: 'Você vinha acertando bem, mas errou na última tentativa. Revise este conteúdo novamente'
          };
        }
      }

      // Detectar melhoria consistente
      if (earlyGrades.length >= 2 && recentGrades.length >= 2) {
        const earlySuccessRate = earlySuccesses / earlyGrades.length;
        const recentSuccessRate = recentSuccesses / recentGrades.length;

        if (earlySuccessRate <= 0.3 && recentSuccessRate >= 0.7) {
          return {
            pattern: 'improvement',
            message: 'Excelente progresso! Você está dominando este conteúdo'
          };
        }

        // Detectar regressão (era bom, agora está ruim)
        if (earlySuccessRate >= 0.7 && recentSuccessRate <= 0.3) {
          return {
            pattern: 'regression',
            message: 'Atenção! Este conteúdo precisa ser revisado - você costumava acertar mais'
          };
        }
      }

      // Detectar oscilação (alternando entre acerto e erro)
      const isOscillating = this.detectOscillation(grades);
      if (isOscillating) {
        return {
          pattern: 'oscillating',
          message: 'Seu desempenho está inconsistente. Foque nos conceitos fundamentais'
        };
      }

      // Padrões baseados na taxa geral de sucesso
      if (successRate >= 0.8) {
        return {
          pattern: 'consistent_success',
          message: 'Parabéns! Você domina bem este assunto'
        };
      }

      if (successRate <= 0.3) {
        return {
          pattern: 'consistent_difficulty',
          message: 'Este conteúdo ainda é desafiador. Continue estudando e praticando'
        };
      }

      // Padrão neutro/moderado
      return {
        pattern: 'moderate',
        message: 'Continue praticando para consolidar este conhecimento'
      };

    } catch (error) {
      logger.error('Erro ao analisar padrão de desempenho:', error);
      return {
        pattern: 'error',
        message: 'Não foi possível analisar o desempenho'
      };
    }
  }

  /**
   * Detectar se há oscilação no desempenho
   */
  private detectOscillation(grades: number[]): boolean {
    if (grades.length < 4) return false;

    let changes = 0;
    for (let i = 1; i < grades.length; i++) {
      const prev = grades[i - 1] >= 2; // Sucesso anterior
      const curr = grades[i] >= 2; // Sucesso atual
      if (prev !== curr) {
        changes++;
      }
    }

    // Se houve mudanças em mais de 50% das transições, considera oscilação
    return changes / (grades.length - 1) > 0.5;
  }

  /**
   * Remove um item do sistema de revisão
   */
  async deleteReview(userId: string, contentId: string, contentType: UnifiedContentType): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('fsrs_cards')
        .delete()
        .eq('user_id', userId)
        .eq('content_id', contentId)
        .eq('content_type', contentType);

      if (error) {
        logger.error('Erro ao deletar revisão:', error);
        throw new AppError('Erro ao deletar revisão', 500);
      }

      logger.info(`[deleteReview] Revisão deletada: ${contentType}/${contentId} para user ${userId}`);
    } catch (error) {
      logger.error('Erro ao deletar revisão:', error);
      throw error;
    }
  }

  /**
   * Retorna o número de dias programados para a próxima revisão
   */
  async getCardScheduledDays(userId: string, contentId: string, contentType: UnifiedContentType): Promise<number> {
    try {
      const { data: card, error } = await this.supabase
        .from('fsrs_cards')
        .select('scheduled_days')
        .eq('user_id', userId)
        .eq('content_id', contentId)
        .eq('content_type', contentType)
        .single();

      if (error && error.code !== 'PGRST116') {
        logger.error('Erro ao buscar scheduled_days:', error);
        throw new AppError('Erro ao buscar scheduled_days', 500);
      }

      if (!card) {
        return 0; // Card não existe ainda
      }

      return card.scheduled_days || 0;
    } catch (error) {
      logger.error('Erro ao buscar scheduled_days:', error);
      throw error;
    }
  }
}


