import { firestore } from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { UserGoal, CutoffScoreConfig } from '../types';
import { logger } from '../../../utils/logger';
import { AppError } from '../../../shared/errors/AppError';

export class GoalService {
  private db: firestore.Firestore;
  constructor(db?: firestore.Firestore) {
    this.db = db || firestore();
  }

  // ---------------- Goals -----------------
  async createGoal(payload: Omit<UserGoal, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserGoal> {
    try {
      const id = this.db.collection('goals').doc().id;
      const now = Timestamp.now();
      const goal: UserGoal = { ...payload, id, createdAt: now, updatedAt: now } as UserGoal;
      await this.db.collection('goals').doc(id).set(goal);
      return goal;
    } catch (e) {
      logger.error('GoalService', 'createGoal', e);
      throw AppError.internal('Erro ao criar meta');
    }
  }

  async getGoals(userId: string): Promise<UserGoal[]> {
    const snap = await this.db.collection('goals').where('userId', '==', userId).get();
    return snap.docs.map((d) => d.data() as UserGoal);
  }

  async updateGoal(id: string, data: Partial<UserGoal>): Promise<void> {
    await this.db.collection('goals').doc(id).update({ ...data, updatedAt: Timestamp.now() });
  }

  async deleteGoal(id: string): Promise<void> {
    await this.db.collection('goals').doc(id).delete();
  }

  /**
   * Calcula progresso das metas ativas de um usuário.
   * Por enquanto suporta apenas WEEKLY_QUESTIONS.
   */
  async getGoalsProgress(userId: string): Promise<Array<{ goal: UserGoal; progress: number; gap: number }>> {
    const goals = await this.getGoals(userId);
    const results: Array<{ goal: UserGoal; progress: number; gap: number }> = [];

    for (const goal of goals) {
      let progress = goal.currentValue;

      // Calcular dinamicamente apenas alguns tipos
      if (goal.goalType === 'WEEKLY_QUESTIONS') {
        const { weekStart, weekEnd } = this.getWeekRange();
        const snap = await this.db
          .collection('enhancedQuestionResponses')
          .where('userId', '==', userId)
          .where('answeredAt', '>=', firestore.Timestamp.fromDate(weekStart))
          .where('answeredAt', '<=', firestore.Timestamp.fromDate(weekEnd))
          .get();
        progress = snap.size;
        // atualizar currentValue em background
        await this.db.collection('goals').doc(goal.id).update({ currentValue: progress, updatedAt: Timestamp.now() });
      }

      const gap = Math.max(0, goal.targetValue - progress);
      results.push({ goal, progress, gap });
    }
    return results;
  }

  private getWeekRange(refDate: Date = new Date()) {
    const date = new Date(refDate);
    const day = date.getDay();
    const diffToMonday = (day === 0 ? -6 : 1) - day;
    const monday = new Date(date);
    monday.setDate(date.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    return { weekStart: monday, weekEnd: sunday };
  }

  // ---------------- Cutoff configs -----------------
  async createCutoff(payload: Omit<CutoffScoreConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<CutoffScoreConfig> {
    const id = this.db.collection('cutoffConfigs').doc().id;
    const now = Timestamp.now();
    const cfg: CutoffScoreConfig = { ...payload, id, createdAt: now, updatedAt: now } as CutoffScoreConfig;
    await this.db.collection('cutoffConfigs').doc(id).set(cfg);
    return cfg;
  }

  async getActiveCutoff(userId: string): Promise<CutoffScoreConfig | null> {
    const snap = await this.db
      .collection('cutoffConfigs')
      .where('userId', '==', userId)
      .where('isActive', '==', true)
      .limit(1)
      .get();
    return snap.empty ? null : (snap.docs[0].data() as CutoffScoreConfig);
  }
} 