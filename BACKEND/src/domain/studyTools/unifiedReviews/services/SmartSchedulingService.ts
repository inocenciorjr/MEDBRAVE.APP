import { SupabaseClient } from '@supabase/supabase-js';
import { AppError } from '../../../../shared/errors/AppError';
import { logger } from '../../../../utils/logger';
import { UnifiedContentType } from '../types';
import { ReviewPreferencesService } from './ReviewPreferencesService';
import { TimezoneService } from '../../../user/services/TimezoneService';

export interface BacklogStatus {
  status: 'normal' | 'warning' | 'critical' | 'severe';
  totalDue: number;
  limit: number;
  backlogRatio: number;
  daysToRecover: number;
  suggestions: string[];
}

export class SmartSchedulingService {
  private preferencesService: ReviewPreferencesService;

  constructor(private supabase: SupabaseClient) {
    this.preferencesService = new ReviewPreferencesService(supabase);
  }

  /**
   * Conta revisões agendadas para uma data específica
   * Usa timezone do usuário para contar corretamente
   */
  async countReviewsOnDate(
    userId: string,
    date: Date,
    contentType: UnifiedContentType
  ): Promise<number> {
    // Buscar timezone do usuário (padrão: America/Sao_Paulo)
    const { data: userData } = await this.supabase
      .from('users')
      .select('timezone')
      .eq('id', userId)
      .maybeSingle();
    
    const userTimezone = userData?.timezone || 'America/Sao_Paulo';
    
    // Usar TimezoneService para obter início e fim do dia no timezone do usuário
    const timezoneService = new TimezoneService(this.supabase);
    const startOfDay = timezoneService.getStartOfDayInTimezone(date, userTimezone);
    const endOfDay = timezoneService.getEndOfDayInTimezone(date, userTimezone);
    
    const { count, error } = await this.supabase
      .from('fsrs_cards')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('content_type', contentType)
      .gte('due', startOfDay.toISOString())
      .lte('due', endOfDay.toISOString());
    
    if (error) {
      logger.error('Erro ao contar revisões:', error);
      return 0;
    }
    
    const dateStr = date.toISOString().split('T')[0];
    logger.info(`[countReviewsOnDate] ${dateStr}: ${count || 0} ${contentType} agendados (${startOfDay.toISOString()} até ${endOfDay.toISOString()})`);
    
    return count || 0;
  }

  /**
   * Encontra o primeiro dia disponível com vaga
   */
  async findFirstAvailableDay(
    userId: string,
    idealDate: Date,
    contentType: UnifiedContentType,
    studyDays: number[]
  ): Promise<Date> {
    const prefs = await this.preferencesService.getPreferences(userId);
    const dailyLimit = this.preferencesService.getDailyLimitForType(prefs, contentType);
    
    logger.info(`[findFirstAvailableDay] Buscando vaga para ${contentType}, limite diário: ${dailyLimit}`);
    
    let currentDate = new Date(idealDate);
    const maxSearchDays = 30;
    let daysSearched = 0;
    
    while (daysSearched < maxSearchDays) {
      // Verificar se é dia de estudo
      if (this.preferencesService.isStudyDay(currentDate, studyDays)) {
        const count = await this.countReviewsOnDate(userId, currentDate, contentType);
        
        logger.info(`[findFirstAvailableDay] Dia ${currentDate.toISOString().split('T')[0]}: ${count}/${dailyLimit} cards`);
        
        if (count < dailyLimit) {
          // Achou vaga!
          if (daysSearched > 0) {
            logger.info(`Card adiado ${daysSearched} dias (dia ideal estava cheio)`);
          }
          logger.info(`[findFirstAvailableDay] ✅ Retornando: ${currentDate.toISOString()}`);
          return currentDate;
        } else {
          logger.info(`[findFirstAvailableDay] ❌ Dia cheio, continuando busca...`);
        }
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
      daysSearched++;
    }
    
    // Não achou vaga em 30 dias, forçar no dia ideal
    logger.warn(`Não achou vaga em 30 dias, forçando dia ideal`);
    return idealDate;
  }

  /**
   * Analisa backlog e retorna status
   */
  async analyzeBacklog(userId: string): Promise<BacklogStatus> {
    const prefs = await this.preferencesService.getPreferences(userId);
    
    // Buscar revisões devidas
    const now = new Date();
    const { data: dueCards, error } = await this.supabase
      .from('fsrs_cards')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .lte('due', now.toISOString());
    
    if (error) {
      throw new AppError('Erro ao analisar backlog', 500);
    }
    
    const totalDue = dueCards?.length || 0;
    const limit = prefs.daily_reviews_limit;
    const backlogRatio = totalDue / limit;
    const daysToRecover = Math.ceil(totalDue / limit);
    
    let status: 'normal' | 'warning' | 'critical' | 'severe' = 'normal';
    const suggestions: string[] = [];
    
    if (backlogRatio > 3) {
      status = 'severe';
      suggestions.push('Ativar modo recuperação urgente');
      suggestions.push('Considerar mudar para modo tradicional');
      suggestions.push(`Aumentar limite diário para ${Math.ceil(limit * 1.5)} revisões/dia`);
    } else if (backlogRatio > 2) {
      status = 'critical';
      suggestions.push('Ativar modo recuperação');
      suggestions.push('Estudar um pouco mais nos próximos dias');
      suggestions.push(`Aumentar limite diário para ${Math.ceil(limit * 1.3)} revisões/dia`);
    } else if (backlogRatio > 1.2) {
      status = 'warning';
      suggestions.push('Tente estudar um pouco mais hoje');
      suggestions.push('Evite faltar nos próximos dias');
    }
    
    return {
      status,
      totalDue,
      limit,
      backlogRatio,
      daysToRecover,
      suggestions,
    };
  }

  /**
   * Ativa modo recuperação (redistribui backlog)
   */
  async activateRecoveryMode(
    userId: string,
    daysToSpread: number = 4
  ): Promise<{ redistributed: number; days: number }> {
    const prefs = await this.preferencesService.getPreferences(userId);
    
    // Buscar revisões atrasadas
    const now = new Date();
    const { data: backlog, error } = await this.supabase
      .from('fsrs_cards')
      .select('*')
      .eq('user_id', userId)
      .lte('due', now.toISOString())
      .order('due', { ascending: true });
    
    if (error || !backlog || backlog.length === 0) {
      return { redistributed: 0, days: 0 };
    }
    
    // Calcular score de prioridade
    const scored = backlog.map(card => ({
      ...card,
      priority_score: this.calculatePriorityScore(card, now)
    }));
    
    // Ordenar por prioridade
    scored.sort((a, b) => b.priority_score - a.priority_score);
    
    // Obter próximos dias de estudo
    const studyDays = this.getNextStudyDays(prefs.study_days, daysToSpread);
    const perDay = prefs.daily_reviews_limit;
    
    // Redistribuir
    for (let i = 0; i < scored.length; i++) {
      const dayIndex = Math.floor(i / perDay);
      const targetDay = studyDays[Math.min(dayIndex, studyDays.length - 1)];
      
      await this.supabase
        .from('fsrs_cards')
        .update({
          due: targetDay.toISOString(),
          updated_at: now.toISOString()
        })
        .eq('id', scored[i].id);
    }
    
    logger.info(`Modo recuperação ativado: ${scored.length} cards redistribuídos em ${studyDays.length} dias`);
    
    return {
      redistributed: scored.length,
      days: studyDays.length
    };
  }

  /**
   * Calcula score de prioridade
   */
  private calculatePriorityScore(card: any, now: Date): number {
    let score = 0;
    
    // Dias atrasado
    const due = new Date(card.due);
    const daysOverdue = Math.max(0, Math.ceil((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)));
    score += daysOverdue * 10;
    
    // Lapses
    score += (card.lapses || 0) * 5;
    
    // Stability (menor = maior prioridade)
    score += (10 - (card.stability || 5)) * 3;
    
    // Tipo (caderno de erros tem prioridade)
    if (card.content_type === 'ERROR_NOTEBOOK') {
      score += 20;
    }
    
    // Estado (relearning tem prioridade)
    if (card.state === 'RELEARNING') {
      score += 15;
    }
    
    return score;
  }

  /**
   * Obtém próximos N dias de estudo
   */
  private getNextStudyDays(studyDays: number[], count: number): Date[] {
    const result: Date[] = [];
    let currentDate = new Date();
    let found = 0;
    
    while (found < count && result.length < 30) {
      if (this.preferencesService.isStudyDay(currentDate, studyDays)) {
        result.push(new Date(currentDate));
        found++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return result;
  }

  /**
   * Verifica padrão de estudo (aderência)
   */
  async checkStudyPattern(userId: string): Promise<{
    shouldSuggestChange: boolean;
    adherenceRate: number;
    expectedDays: number;
    actualDays: number;
  }> {
    const prefs = await this.preferencesService.getPreferences(userId);
    
    // Últimos 14 dias
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 14);
    
    // Contar dias esperados
    let expectedDays = 0;
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      if (this.preferencesService.isStudyDay(currentDate, prefs.study_days)) {
        expectedDays++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Buscar histórico de revisões
    const { data: history, error } = await this.supabase
      .from('review_history')
      .select('reviewed_at')
      .eq('user_id', userId)
      .gte('reviewed_at', startDate.toISOString())
      .lte('reviewed_at', endDate.toISOString());
    
    if (error) {
      logger.error('Erro ao verificar padrão de estudo:', error);
      return {
        shouldSuggestChange: false,
        adherenceRate: 1,
        expectedDays,
        actualDays: expectedDays
      };
    }
    
    // Contar dias únicos com revisões
    const uniqueDays = new Set(
      (history || []).map(h => new Date(h.reviewed_at).toISOString().split('T')[0])
    );
    const actualDays = uniqueDays.size;
    
    const adherenceRate = expectedDays > 0 ? actualDays / expectedDays : 1;
    const shouldSuggestChange = adherenceRate < 0.8 && prefs.scheduling_mode === 'smart';
    
    return {
      shouldSuggestChange,
      adherenceRate,
      expectedDays,
      actualDays
    };
  }
}
