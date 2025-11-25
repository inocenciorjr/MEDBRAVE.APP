import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../../utils/logger';
import { GoalService } from '../goals/supabase/GoalService';
import { AlertService } from '../../domain/alerts/services/AlertService';
import supabase from '../../config/supabaseAdmin';

/**
 * Tipos utilitários
 */
export interface WeeklySpecialtySnapshot {
  userId: string;
  weekStart: string; // ISO YYYY-MM-DD (segunda-feira)
  weekEnd: string; // ISO YYYY-MM-DD (domingo)
  specialtyId: string;
  specialtyName: string;
  questionsAnswered: number;
  correctAnswers: number;
  accuracy: number; // 0-100
  studyTimeMinutes: number;
  // Métricas de retenção FSRS
  recallRate?: number;
  lapses?: number;
  deltaStability?: number;
  avgReviewTime?: number;

  createdAt: Date;
  updatedAt: Date;
}

export interface SpecialtyTrendPoint {
  weekStart: string;
  accuracy: number;
  questionsAnswered: number;
}

export interface SpecialtyAlert {
  id: string;
  userId: string;
  specialtyId: string;
  type: 'warning' | 'info' | 'success' | 'danger';
  title: string;
  message: string;
  createdAt: Date;
  acknowledged: boolean;
}

/**
 * Serviço responsável por agregar e disponibilizar métricas semanais/mensais
 * de desempenho por especialidade médica.
 */
export class SpecialtyAnalyticsService {
  private client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client = client || supabase;
  }

  public getClient(): SupabaseClient {
    return this.client;
  }

  /**
   * Agrega dados semanais de desempenho por especialidade médica.
   */
  async aggregateWeekly(
    userId: string,
    referenceDate: Date = new Date(),
  ): Promise<void> {
    try {
      const { weekStart, weekEnd } = this.getWeekRange(referenceDate);
      const goalService = new GoalService();
      const alertService = new AlertService(this.client);

      // 1. Obter filtros de especialidade médica
      const { data: filters, error: filtersError } = await this.client
        .from('filters')
        .select('id, name')
        .eq('category', 'MEDICAL_SPECIALTY')
        .eq('status', 'ACTIVE');

      if (filtersError) {
        logger.error(
          'SpecialtyAnalytics',
          'aggregateWeekly',
          'Erro ao buscar filtros',
          filtersError,
        );
        return;
      }

      if (!filters || filters.length === 0) {
        logger.warn(
          'SpecialtyAnalytics',
          'aggregateWeekly',
          'Nenhum filtro de especialidade encontrado',
        );
        return;
      }

      const medicalFilterMap: Record<string, string> = {}; // id -> name
      filters.forEach((filter) => {
        medicalFilterMap[filter.id] = filter.name || filter.id;
      });
      const medicalFilterIds = new Set(Object.keys(medicalFilterMap));

      // 2. Buscar respostas de questões do período
      const { data: responses, error: responsesError } = await this.client
        .from('enhancedQuestionResponses')
        .select('*')
        .eq('userId', userId)
        .gte('answeredAt', weekStart.toISOString())
        .lte('answeredAt', weekEnd.toISOString());

      if (responsesError) {
        logger.error(
          'SpecialtyAnalytics',
          'aggregateWeekly',
          'Erro ao buscar respostas',
          responsesError,
        );
        return;
      }

      if (!responses || responses.length === 0) {
        logger.info(
          'SpecialtyAnalytics',
          'aggregateWeekly',
          `Sem respostas para ${userId} na semana`,
        );
        return;
      }

      const questionIds = Array.from(
        new Set(responses.map((r) => r.questionId)),
      );

      // 3. Carregar questões em lotes
      const questionsData: Record<string, any> = {};
      const batchSize = 1000;
      for (let i = 0; i < questionIds.length; i += batchSize) {
        const batchIds = questionIds.slice(i, i + batchSize);
        const { data: questions, error: questionsError } = await this.client
          .from('questions')
          .select('*')
          .in('id', batchIds);

        if (questionsError) {
          logger.error(
            'SpecialtyAnalytics',
            'aggregateWeekly',
            'Erro ao buscar questões',
            questionsError,
          );
          continue;
        }

        questions?.forEach((question) => {
          questionsData[question.id] = question;
        });
      }

      // 4. Agregar estatísticas
      const specialtyMap: Record<string, WeeklySpecialtySnapshot> = {};
      responses.forEach((resp) => {
        const question = questionsData[resp.questionId];
        if (!question || !question.filterIds) {
return;
}

        // Encontrar IDs de especialidade médica
        const specialties = (question.filterIds as string[]).filter((fid) =>
          medicalFilterIds.has(fid),
        );
        if (specialties.length === 0) {
return;
}

        specialties.forEach((specId) => {
          if (!specialtyMap[specId]) {
            specialtyMap[specId] = {
              userId,
              weekStart: weekStart.toISOString().substring(0, 10),
              weekEnd: weekEnd.toISOString().substring(0, 10),
              specialtyId: specId,
              specialtyName: medicalFilterMap[specId] || specId,
              questionsAnswered: 0,
              correctAnswers: 0,
              accuracy: 0,
              studyTimeMinutes: 0,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
          }

          const snap = specialtyMap[specId];
          snap.questionsAnswered += 1;
          if (resp.isCorrectOnFirstAttempt) {
snap.correctAnswers += 1;
}
          if (resp.responseTimeSeconds) {
            snap.studyTimeMinutes += Math.round(resp.responseTimeSeconds / 60);
          }
        });
      });

      if (Object.keys(specialtyMap).length === 0) {
        logger.info(
          'SpecialtyAnalytics',
          'aggregateWeekly',
          'Nenhuma questão com especialidade médica respondida',
        );
        return;
      }

      // 5. Salvar dados agregados
      for (const [specId, data] of Object.entries(specialtyMap)) {
        data.accuracy =
          data.questionsAnswered > 0
            ? Math.round((data.correctAnswers / data.questionsAnswered) * 100)
            : 0;
        const goalGap = await this.computeGoalGap(
          goalService,
          userId,
          specId,
          data.accuracy,
        );

        const docId = `${data.weekStart}_${specId}`;
        const { error: upsertError } = await this.client
          .from('userAnalytics')
          .upsert({
            id: `${userId}_${docId}`,
            userId,
            type: 'specialty',
            data: { ...data, goalGap },
            createdAt: new Date(),
            updatedAt: new Date(),
          });

        if (upsertError) {
          logger.error(
            'SpecialtyAnalytics',
            'aggregateWeekly',
            'Erro ao salvar snapshot',
            upsertError,
          );
          continue;
        }

        // Gerar alertas conforme regras
        await alertService.generateWeeklyAlerts(
          userId,
          specId,
          data.weekStart,
          data.accuracy,
          data.recallRate,
          undefined,
          goalGap,
        );

        // Verificar conquistas relacionadas à especialidade
        await this.checkSpecialtyAchievements(
          userId,
          specId,
          data.questionsAnswered,
          data.accuracy,
        );
      }

      logger.info(
        'SpecialtyAnalytics',
        'aggregateWeekly',
        `Snapshots salvos (${Object.keys(specialtyMap).length}) para ${userId}`,
      );

      // 6. Agregar dados de revisões FSRS para retenção
      await this.aggregateWeeklyReviews(userId, weekStart, weekEnd);
    } catch (error) {
      logger.error(
        'SpecialtyAnalytics',
        'aggregateWeekly',
        'Erro ao agregar semana',
        error,
      );
      throw error;
    }
  }

  /**
   * Agrega métricas de revisão (recall rate, avg review time, lapses) para cada especialidade
   * usando a tabela fsrsQuestionReviews.
   */
  private async aggregateWeeklyReviews(
    userId: string,
    weekStart: Date,
    weekEnd: Date,
  ): Promise<void> {
    try {
      const { data: reviews, error: reviewsError } = await this.client
        .from('fsrsQuestionReviews')
        .select('*')
        .eq('userId', userId)
        .gte('reviewedAt', weekStart.toISOString())
        .lte('reviewedAt', weekEnd.toISOString());

      if (reviewsError) {
        logger.error(
          'SpecialtyAnalytics',
          'aggregateWeeklyReviews',
          'Erro ao buscar revisões',
          reviewsError,
        );
        return;
      }

      if (!reviews || reviews.length === 0) {
return;
}

      // Agrupar por specialtyId
      interface ReviewAgg {
        total: number;
        goodEasy: number;
        totalTimeMs: number;
        lapses: number;
      }
      const map: Record<string, ReviewAgg> = {};
      reviews.forEach((r) => {
        const specId = r.specialtyId || 'UNKNOWN';
        if (!map[specId]) {
          map[specId] = { total: 0, goodEasy: 0, totalTimeMs: 0, lapses: 0 };
        }
        map[specId].total += 1;
        if (r.grade === 3 || r.grade === 4) {
map[specId].goodEasy += 1;
}
        if (r.reviewTimeMs) {
map[specId].totalTimeMs += r.reviewTimeMs;
}
        if (r.grade === 1) {
map[specId].lapses += 1;
}
      });

      const weekKey = weekStart.toISOString().substring(0, 10);
      for (const [specId, agg] of Object.entries(map)) {
        const docId = `${userId}_${specId}_${weekKey}`;
        const recallRate = Math.round((agg.goodEasy / agg.total) * 100);
        const avgReviewTime = Math.round(
          agg.totalTimeMs / Math.max(1, agg.total),
        );

        const { error: updateError } = await this.client
          .from('userAnalytics')
          .upsert({
            id: docId,
            userId,
            type: 'specialty_review',
            data: {
              recallRate,
              avgReviewTimeMs: avgReviewTime,
              totalReviews: agg.total,
              lapses: agg.lapses,
              specialtyId: specId,
              weekStart: weekKey,
            },
            updatedAt: new Date(),
          });

        if (updateError) {
          logger.error(
            'SpecialtyAnalytics',
            'aggregateWeeklyReviews',
            'Erro ao atualizar métricas',
            updateError,
          );
        }
      }

      logger.info(
        'SpecialtyAnalytics',
        'aggregateWeeklyReviews',
        `Métricas de revisão agregadas para ${userId}`,
      );
    } catch (error) {
      logger.error(
        'SpecialtyAnalytics',
        'aggregateWeeklyReviews',
        'Erro ao agregar métricas de revisão',
        error,
      );
    }
  }

  /**
   * Retorna série temporal (últimas N semanas) de accuracy para uma especialidade.
   */
  async getTrend(
    userId: string,
    specialtyId: string,
    weeks = 12,
  ): Promise<SpecialtyTrendPoint[]> {
    try {
      const { data: analytics, error } = await this.client
        .from('userAnalytics')
        .select('data')
        .eq('userId', userId)
        .eq('type', 'specialty')
        .like('data->>specialtyId', specialtyId)
        .order('data->>weekStart', { ascending: false })
        .limit(weeks);

      if (error) {
        logger.error(
          'SpecialtyAnalytics',
          'getTrend',
          'Erro ao buscar tendência',
          error,
        );
        throw error;
      }

      return (analytics || [])
        .map((a) => a.data as WeeklySpecialtySnapshot)
        .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
        .map((s) => ({
          weekStart: s.weekStart,
          accuracy: s.accuracy,
          questionsAnswered: s.questionsAnswered,
        }));
    } catch (error) {
      logger.error(
        'SpecialtyAnalytics',
        'getTrend',
        'Erro ao buscar tendência',
        error,
      );
      throw error;
    }
  }

  /**
   * Gera alertas caso a accuracy da semana esteja abaixo de um limiar.
   * Limiar padrão = 60 %.
   */
  async generateAlerts(userId: string, threshold = 60): Promise<void> {
    try {
      const { weekStart } = this.getWeekRange();
      const weekKey = weekStart.toISOString().substring(0, 10);

      const { data: analytics, error } = await this.client
        .from('userAnalytics')
        .select('data')
        .eq('userId', userId)
        .eq('type', 'specialty')
        .like('data->>weekStart', weekKey);

      if (error) {
        logger.error(
          'SpecialtyAnalytics',
          'generateAlerts',
          'Erro ao buscar analytics',
          error,
        );
        return;
      }

      if (!analytics || analytics.length === 0) {
return;
}

      const alertsToCreate = [];
      for (const analytic of analytics) {
        const data = analytic.data as WeeklySpecialtySnapshot;
        if (data.accuracy < threshold) {
          const alertId = `${userId}_${data.specialtyId}_${weekKey}`;
          const alert: SpecialtyAlert = {
            id: alertId,
            userId,
            specialtyId: data.specialtyId,
            type: 'warning',
            title: `Desempenho baixo em ${data.specialtyName}`,
            message: `Sua precisão em ${data.specialtyName} esta semana foi de ${data.accuracy}%. Considere revisar esse tema.`,
            createdAt: new Date(),
            acknowledged: false,
          };
          alertsToCreate.push(alert);
        }
      }

      if (alertsToCreate.length > 0) {
        const { error: alertError } = await this.client
          .from('userAlerts')
          .upsert(alertsToCreate);

        if (alertError) {
          logger.error(
            'SpecialtyAnalytics',
            'generateAlerts',
            'Erro ao criar alertas',
            alertError,
          );
        }
      }

      logger.info(
        'SpecialtyAnalytics',
        'generateAlerts',
        `Alertas gerados para ${userId}`,
      );
    } catch (error) {
      logger.error(
        'SpecialtyAnalytics',
        'generateAlerts',
        'Erro ao gerar alertas',
        error,
      );
      throw error;
    }
  }

  // Helpers -------------------------------------------------
  public getWeekStart(refDate: Date = new Date()): Date {
    const { weekStart } = this.getWeekRange(refDate);
    return weekStart;
  }

  private getWeekRange(refDate: Date = new Date()) {
    const date = new Date(refDate);
    const day = date.getDay(); // 0 = domingo, 1 = segunda…
    const diffToMonday = (day === 0 ? -6 : 1) - day; // quanto voltar/avançar para chegar na segunda
    const monday = new Date(date);
    monday.setDate(date.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    return { weekStart: monday, weekEnd: sunday };
  }

  private async computeGoalGap(
    goalService: GoalService,
    userId: string,
    specialtyId: string,
    value: number,
  ) {
    const goals = await goalService.getGoals(userId);
    const specGoals = goals.filter(
      (g) =>
        g.goalType === 'SPECIALTY_ACCURACY' &&
        g.specialtyId === specialtyId &&
        g.isActive,
    );
    if (specGoals.length === 0) {
return 0;
}
    const target = specGoals[0].targetValue;
    return Math.max(0, target - value);
  }

  /**
   * Desbloqueia conquistas básicas de especialidade.
   * Critérios iniciais:
   *   – 100 questões respondidas com ≥ 80 % de acerto.
   */
  private async checkSpecialtyAchievements(
    userId: string,
    specialtyId: string,
    questionsAnswered: number,
    accuracy: number,
  ) {
    if (questionsAnswered < 100 || accuracy < 80) {
return;
}

    const achievementId = `SPECIALTY_MASTER_${specialtyId}`;
    const { data: existing, error } = await this.client
      .from('userAchievements')
      .select('id')
      .eq('userId', userId)
      .eq('achievementId', achievementId)
      .limit(1);

    if (error) {
      logger.error(
        'SpecialtyAnalytics',
        'checkSpecialtyAchievements',
        'Erro ao verificar conquistas',
        error,
      );
      return;
    }

    if (existing && existing.length > 0) {
return;
} // já possui

    // Criar simples registro de conquista
    const { error: insertError } = await this.client
      .from('userAchievements')
      .insert({
        userId,
        achievementId,
        status: 'unlocked',
        unlockedAt: new Date(),
        progress: 100,
      });

    if (insertError) {
      logger.error(
        'SpecialtyAnalytics',
        'checkSpecialtyAchievements',
        'Erro ao criar conquista',
        insertError,
      );
    } else {
      logger.info(
        'SpecialtyAnalytics',
        'checkSpecialtyAchievements',
        `Conquista ${achievementId} desbloqueada para ${userId}`,
      );
    }
  }
}
