import { firestore } from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { UserAlert } from '../types';
import { logger } from '../../../utils/logger';

export class AlertService {
  private readonly collection = 'userAlerts';
  constructor(private db: firestore.Firestore = firestore()) {}

  async createAlert(payload: Omit<UserAlert, 'id' | 'createdAt'>): Promise<UserAlert> {
    const id = this.db.collection(this.collection).doc().id;
    const alert: UserAlert = { ...payload, id, createdAt: Timestamp.now() } as UserAlert;
    await this.db.collection(this.collection).doc(id).set(alert);
    logger.info('AlertService', 'createAlert', `Alert ${alert.code} for ${alert.userId}`);
    return alert;
  }

  async getUserAlerts(userId: string, includeRead = false): Promise<UserAlert[]> {
    let query = this.db.collection(this.collection).where('userId', '==', userId) as any;
    if (!includeRead) query = query.where('readAt', '==', null);
    const snap = await query.orderBy('createdAt', 'desc').get();
    return snap.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => doc.data() as UserAlert);
  }

  async markAsRead(alertId: string): Promise<void> {
    await this.db.collection(this.collection).doc(alertId).update({ readAt: Timestamp.now() });
  }

  async generateWeeklyAlerts(
    userId: string,
    specialtyId: string,
    weekStart: string,
    accuracy: number,
    recallRate?: number,
    lapses?: number,
    goalGap?: number
  ) {
    // condições
    if (accuracy < 60) {
      await this.createAlert({
        userId,
        specialtyId,
        type: 'warning',
        code: 'LOW_ACCURACY',
        message: `Sua precisão na semana para esta especialidade foi de ${accuracy}%. Que tal revisar o conteúdo?`,
        weekStart
      });
    }
    if (recallRate !== undefined && recallRate < 60) {
      await this.createAlert({
        userId,
        specialtyId,
        type: 'warning',
        code: 'LOW_RECALL',
        message: `Seu recall nas revisões está baixo (${recallRate}%). Tente revisar novamente em breve.`,
        weekStart
      });
    }
    if (lapses !== undefined && lapses >= 5) {
      await this.createAlert({
        userId,
        specialtyId,
        type: 'info',
        code: 'EXCESS_LAPSES',
        message: `Percebemos ${lapses} lapses em suas revisões. Talvez seja hora de focar nos conceitos base.`,
        weekStart
      });
    }
    if (goalGap !== undefined && goalGap > 0) {
      await this.createAlert({
        userId,
        specialtyId,
        type: 'info',
        code: 'GOAL_GAP',
        message: `Você ficou ${goalGap}% abaixo da meta nesta especialidade. Continue praticando!`,
        weekStart
      });
    }
  }
} 