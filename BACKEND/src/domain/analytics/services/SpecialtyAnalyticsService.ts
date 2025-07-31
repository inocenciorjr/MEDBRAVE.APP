import { firestore } from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { logger } from '../../../utils/logger';
import { GoalService } from '../../goals/services/GoalService';
import { AlertService } from '../../alerts/services/AlertService';

/**
 * Tipos utilitários
 */
export interface WeeklySpecialtySnapshot {
  userId: string;
  weekStart: string; // ISO YYYY-MM-DD (segunda-feira)
  weekEnd: string;   // ISO YYYY-MM-DD (domingo)
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

  createdAt: Timestamp;
  updatedAt: Timestamp;
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
  createdAt: Timestamp;
  acknowledged: boolean;
}

/**
 * Serviço responsável por agregar e disponibilizar métricas semanais/mensais
 * de desempenho por especialidade médica.
 */
export class SpecialtyAnalyticsService {
  private db: firestore.Firestore;

  constructor(db?: firestore.Firestore) {
    this.db = db || firestore();
  }

  /**
   * Agrega dados da semana corrente (segunda-feira → domingo) para um usuário.
   * Caso já exista snapshot da semana, ele é sobrescrito.
   */
  async aggregateWeekly(userId: string, referenceDate: Date = new Date()): Promise<void> {
    try {
      const { weekStart, weekEnd } = this.getWeekRange(referenceDate);
      const goalService = new GoalService(this.db);
      const alertService = new AlertService(this.db);

      // 1. Obter filtros de especialidade médica (cache simples em memória)
      const filtersSnapshot = await this.db
        .collection('filters')
        .where('category', '==', 'MEDICAL_SPECIALTY')
        .where('status', '==', 'ACTIVE')
        .get();

      if (filtersSnapshot.empty) {
        logger.warn('SpecialtyAnalytics', 'aggregateWeekly', 'Nenhum filtro de especialidade encontrado');
        return;
      }

      const medicalFilterMap: Record<string, string> = {}; // id -> name
      filtersSnapshot.docs.forEach((doc) => {
        medicalFilterMap[doc.id] = (doc.data() as any).name || doc.id;
      });
      const medicalFilterIds = new Set(Object.keys(medicalFilterMap));

      // 2. Buscar respostas de questões do período
      const responsesSnap = await this.db
        .collection('enhancedQuestionResponses')
        .where('userId', '==', userId)
        .where('answeredAt', '>=', Timestamp.fromDate(weekStart))
        .where('answeredAt', '<=', Timestamp.fromDate(weekEnd))
        .get();

      if (responsesSnap.empty) {
        logger.info('SpecialtyAnalytics', 'aggregateWeekly', `Sem respostas para ${userId} na semana`);
        return;
      }

      const questionIds = Array.from(new Set(responsesSnap.docs.map((d) => (d.data() as any).questionId)));

      // 3. Carregar questões em lotes de 10 (limite Firestore IN)
      const questionsData: Record<string, any> = {};
      const batchSize = 10;
      for (let i = 0; i < questionIds.length; i += batchSize) {
        const batchIds = questionIds.slice(i, i + batchSize);
        const qsSnap = await this.db
          .collection('questions')
          .where(firestore.FieldPath.documentId(), 'in', batchIds)
          .get();
        qsSnap.docs.forEach((doc) => {
          questionsData[doc.id] = doc.data();
        });
      }

      // 4. Agregar estatísticas
      const specialtyMap: Record<string, WeeklySpecialtySnapshot> = {};
      responsesSnap.docs.forEach((doc) => {
        const resp = doc.data() as any;
        const question = questionsData[resp.questionId];
        if (!question || !question.filterIds) return;

        // Encontrar IDs de especialidade médica
        const specialties = (question.filterIds as string[]).filter((fid) => medicalFilterIds.has(fid));
        if (specialties.length === 0) return;

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
              createdAt: Timestamp.now(),
              updatedAt: Timestamp.now(),
            };
          }

          const snap = specialtyMap[specId];
          snap.questionsAnswered += 1;
          if (resp.isCorrectOnFirstAttempt) snap.correctAnswers += 1;
          if (resp.responseTimeSeconds) snap.studyTimeMinutes += Math.round(resp.responseTimeSeconds / 60);
        });
      });

      if (Object.keys(specialtyMap).length === 0) {
        logger.info('SpecialtyAnalytics', 'aggregateWeekly', 'Nenhuma questão com especialidade médica respondida');
        return;
      }

      const batch = this.db.batch();
      for (const [specId, data] of Object.entries(specialtyMap)) {
        const goalGap = await this.computeGoalGap(goalService, userId, specId, data.accuracy);
        const docRef = this.db
          .collection('userAnalytics')
          .doc(userId)
          .collection('specialty')
          .doc(`${data.weekStart}_${specId}`);
        batch.set(docRef, { ...data, goalGap }, { merge: true });

        // Gerar alertas conforme regras
        await alertService.generateWeeklyAlerts(
          userId,
          specId,
          data.weekStart,
          data.accuracy,
          data.recallRate,
          undefined,
          goalGap
        );

        // Verificar conquistas relacionadas à especialidade
        await this.checkSpecialtyAchievements(userId, specId, data.questionsAnswered, data.accuracy);
      }
      await batch.commit();
      logger.info('SpecialtyAnalytics', 'aggregateWeekly', `Snapshots salvos (${Object.keys(specialtyMap).length}) para ${userId}`);

      // 5. Agregar dados de revisões FSRS para retenção
      await this.aggregateWeeklyReviews(userId, weekStart, weekEnd);
    } catch (error) {
      logger.error('SpecialtyAnalytics', 'aggregateWeekly', 'Erro ao agregar semana', error);
      throw error;
    }
  }

  /**
   * Agrega métricas de revisão (recall rate, avg review time, lapses) para cada especialidade
   * usando a coleção fsrsQuestionReviews.
   */
  private async aggregateWeeklyReviews(userId: string, weekStart: Date, weekEnd: Date): Promise<void> {
    try {
      const reviewsSnap = await this.db
        .collection('fsrsQuestionReviews')
        .where('userId', '==', userId)
        .where('reviewedAt', '>=', Timestamp.fromDate(weekStart))
        .where('reviewedAt', '<=', Timestamp.fromDate(weekEnd))
        .get();

      if (reviewsSnap.empty) return;

      // Agrupar por specialtyId
      interface ReviewAgg { total: number; goodEasy: number; totalTimeMs: number; lapses: number; }
      const map: Record<string, ReviewAgg> = {};
      reviewsSnap.docs.forEach((d) => {
        const r = d.data() as any;
        const specId = r.specialtyId || 'UNKNOWN';
        if (!map[specId]) {
          map[specId] = { total: 0, goodEasy: 0, totalTimeMs: 0, lapses: 0 };
        }
        map[specId].total += 1;
        if (r.grade === 3 || r.grade === 4) map[specId].goodEasy += 1;
        if (r.reviewTimeMs) map[specId].totalTimeMs += r.reviewTimeMs;
        if (r.grade === 1) map[specId].lapses += 1;
      });

      const batch = this.db.batch();
      const weekKey = weekStart.toISOString().substring(0, 10);
      Object.entries(map).forEach(([specId, agg]) => {
        const docId = `${userId}_${specId}_${weekKey}`;
        const docRef = this.db.collection('userAnalytics').doc(userId).collection('specialty').doc(docId);
        const recallRate = Math.round((agg.goodEasy / agg.total) * 100);
        const avgReviewTime = Math.round(agg.totalTimeMs / Math.max(1, agg.total));
        batch.set(docRef, {
          recallRate,
          avgReviewTimeMs: avgReviewTime,
          totalReviews: agg.total,
          lapses: agg.lapses,
          updatedAt: Timestamp.now(),
        }, { merge: true });
      });
      await batch.commit();
      logger.info('SpecialtyAnalytics', 'aggregateWeeklyReviews', `Métricas de revisão agregadas para ${userId}`);
    } catch (error) {
      logger.error('SpecialtyAnalytics', 'aggregateWeeklyReviews', 'Erro ao agregar métricas de revisão', error);
    }
  }

  /**
   * Retorna série temporal (últimas N semanas) de accuracy para uma especialidade.
   */
  async getTrend(userId: string, specialtyId: string, weeks = 12): Promise<SpecialtyTrendPoint[]> {
    try {
      const collection = this.db.collection('userAnalytics').doc(userId).collection('specialty');
      const snap = await collection
        .where('specialtyId', '==', specialtyId)
        .orderBy('weekStart', 'desc')
        .limit(weeks)
        .get();

      return snap.docs
        .map((d) => d.data() as WeeklySpecialtySnapshot)
        .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
        .map((s) => ({
          weekStart: s.weekStart,
          accuracy: s.accuracy,
          questionsAnswered: s.questionsAnswered,
        }));
    } catch (error) {
      logger.error('SpecialtyAnalytics', 'getTrend', 'Erro ao buscar tendência', error);
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

      const snap = await this.db
        .collection('userAnalytics')
        .doc(userId)
        .collection('specialty')
        .where('weekStart', '==', weekKey)
        .get();

      if (snap.empty) return;

      const batch = this.db.batch();
      snap.docs.forEach((doc) => {
        const data = doc.data() as WeeklySpecialtySnapshot;
        if (data.accuracy < threshold) {
          const alertId = `${userId}_${data.specialtyId}_${weekKey}`;
          const alertRef = this.db.collection('userAlerts').doc(alertId);
          const alert: SpecialtyAlert = {
            id: alertId,
            userId,
            specialtyId: data.specialtyId,
            type: 'warning',
            title: `Desempenho baixo em ${data.specialtyName}`,
            message: `Sua precisão em ${data.specialtyName} esta semana foi de ${data.accuracy}%. Considere revisar esse tema.`,
            createdAt: Timestamp.now(),
            acknowledged: false,
          };
          batch.set(alertRef, alert, { merge: true });
        }
      });

      await batch.commit();
      logger.info('SpecialtyAnalytics', 'generateAlerts', `Alertas gerados para ${userId}`);
    } catch (error) {
      logger.error('SpecialtyAnalytics', 'generateAlerts', 'Erro ao gerar alertas', error);
      throw error;
    }
  }

  // Helpers -------------------------------------------------
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

  private async computeGoalGap(goalService: GoalService, userId: string, specialtyId: string, value: number) {
    const goals = await goalService.getGoals(userId);
    const specGoals = goals.filter(
      g => g.goalType === 'SPECIALTY_ACCURACY' && g.specialtyId === specialtyId && g.isActive
    );
    if (specGoals.length === 0) return 0;
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
    accuracy: number
  ) {
    if (questionsAnswered < 100 || accuracy < 80) return;

    const achievementId = `SPECIALTY_MASTER_${specialtyId}`;
    const ref = this.db
      .collection('userAchievements')
      .where('userId', '==', userId)
      .where('achievementId', '==', achievementId)
      .limit(1);
    const snap = await ref.get();
    if (!snap.empty) return; // já possui

    // Criar simples registro de conquista; detalhes podem ser enriquecidos depois
    await this.db.collection('userAchievements').add({
      userId,
      achievementId,
      status: 'unlocked',
      unlockedAt: Timestamp.now(),
      progress: 100,
    });
    logger.info('SpecialtyAnalytics', 'checkSpecialtyAchievements', `Conquista ${achievementId} desbloqueada para ${userId}`);
  }
} 