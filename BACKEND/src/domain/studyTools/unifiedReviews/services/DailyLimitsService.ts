import { Firestore, Timestamp } from 'firebase-admin/firestore';
import { UnifiedContentType } from '../types';
import AppError from '../../../../utils/AppError';

const DAILY_LIMITS_COLLECTION = 'dailyLimits';
const DAILY_PROGRESS_COLLECTION = 'dailyProgress';

export interface DailyLimits {
  id: string;
  userId: string;
  maxQuestions: number;
  maxFlashcards: number;  
  maxErrorNotebook: number;
  maxTotalItems: number;
  resetHour: number; // Hora do dia para resetar (0-23)
  timezone: string;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface DailyProgress {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD format
  questionsReviewed: number;
  flashcardsReviewed: number;
  errorNotebookReviewed: number;
  totalReviewed: number;
  startedAt: Timestamp;
  lastReviewAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface DailyLimitStatus {
  remainingQuestions: number;
  remainingFlashcards: number;
  remainingErrorNotebook: number;
  remainingTotal: number;
  hasReachedLimit: boolean;
  canReviewType: {
    questions: boolean;
    flashcards: boolean;
    errorNotebook: boolean;
  };
  progress: DailyProgress;
  limits: DailyLimits;
}

/**
 * Service para gerenciar limites diários de revisões
 */
export class DailyLimitsService {
  private db: Firestore;

  constructor(db: Firestore) {
    this.db = db;
  }

  /**
   * Obter limites diários do usuário
   */
  async getUserDailyLimits(userId: string): Promise<DailyLimits | null> {
    try {
      const limitsQuery = await this.db
        .collection(DAILY_LIMITS_COLLECTION)
        .where('userId', '==', userId)
        .where('isActive', '==', true)
        .limit(1)
        .get();

      if (limitsQuery.empty) {
        return null;
      }

      const limitsDoc = limitsQuery.docs[0];
      return { id: limitsDoc.id, ...limitsDoc.data() } as DailyLimits;
    } catch (error) {
      console.error('Erro ao buscar limites diários:', error);
      throw new AppError('Erro ao buscar limites diários', 500);
    }
  }

  /**
   * Criar/atualizar limites diários do usuário
   */
  async setUserDailyLimits(
    userId: string,
    limits: {
      maxQuestions: number;
      maxFlashcards: number;
      maxErrorNotebook: number;
      maxTotalItems: number;
      resetHour?: number;
      timezone?: string;
    }
  ): Promise<DailyLimits> {
    try {
      const existingLimits = await this.getUserDailyLimits(userId);
      const now = Timestamp.now();

      const limitsData: Partial<DailyLimits> = {
        userId,
        maxQuestions: limits.maxQuestions,
        maxFlashcards: limits.maxFlashcards,
        maxErrorNotebook: limits.maxErrorNotebook,
        maxTotalItems: limits.maxTotalItems,
        resetHour: limits.resetHour || 0,
        timezone: limits.timezone || 'UTC',
        isActive: true,
        updatedAt: now,
      };

      if (existingLimits) {
        // Atualizar limites existentes
        await this.db
          .collection(DAILY_LIMITS_COLLECTION)
          .doc(existingLimits.id)
          .update(limitsData);

        return { ...existingLimits, ...limitsData } as DailyLimits;
      } else {
        // Criar novos limites
        const docRef = this.db.collection(DAILY_LIMITS_COLLECTION).doc();
        const newLimits: DailyLimits = {
          id: docRef.id,
          ...limitsData,
          createdAt: now,
        } as DailyLimits;

        await docRef.set(newLimits);
        return newLimits;
      }
    } catch (error) {
      console.error('Erro ao definir limites diários:', error);
      throw new AppError('Erro ao definir limites diários', 500);
    }
  }

  /**
   * Obter progresso diário atual do usuário
   */
  async getTodayProgress(userId: string): Promise<DailyProgress> {
    try {
      const today = this.getTodayDateString();
      
      const progressQuery = await this.db
        .collection(DAILY_PROGRESS_COLLECTION)
        .where('userId', '==', userId)
        .where('date', '==', today)
        .limit(1)
        .get();

      if (progressQuery.empty) {
        // Criar progresso para hoje
        return await this.createTodayProgress(userId);
      }

      const progressDoc = progressQuery.docs[0];
      return { id: progressDoc.id, ...progressDoc.data() } as DailyProgress;
    } catch (error) {
      console.error('Erro ao buscar progresso diário:', error);
      throw new AppError('Erro ao buscar progresso diário', 500);
    }
  }

  /**
   * Verificar status dos limites diários
   */
  async checkDailyLimitStatus(userId: string): Promise<DailyLimitStatus> {
    try {
      const [limits, progress] = await Promise.all([
        this.getUserDailyLimits(userId),
        this.getTodayProgress(userId)
      ]);

      // Se não há limites definidos, permitir tudo
      if (!limits) {
        return {
          remainingQuestions: Infinity,
          remainingFlashcards: Infinity,
          remainingErrorNotebook: Infinity,
          remainingTotal: Infinity,
          hasReachedLimit: false,
          canReviewType: {
            questions: true,
            flashcards: true,
            errorNotebook: true,
          },
          progress,
          limits: null as any
        };
      }

      // Calcular itens restantes
      const remainingQuestions = Math.max(0, limits.maxQuestions - progress.questionsReviewed);
      const remainingFlashcards = Math.max(0, limits.maxFlashcards - progress.flashcardsReviewed);
      const remainingErrorNotebook = Math.max(0, limits.maxErrorNotebook - progress.errorNotebookReviewed);
      const remainingTotal = Math.max(0, limits.maxTotalItems - progress.totalReviewed);

      // Verificar se pode revisar cada tipo
      const canReviewType = {
        questions: remainingQuestions > 0 && remainingTotal > 0,
        flashcards: remainingFlashcards > 0 && remainingTotal > 0,
        errorNotebook: remainingErrorNotebook > 0 && remainingTotal > 0,
      };

      const hasReachedLimit = remainingTotal <= 0 || 
        (!canReviewType.questions && !canReviewType.flashcards && !canReviewType.errorNotebook);

      return {
        remainingQuestions,
        remainingFlashcards,
        remainingErrorNotebook,
        remainingTotal,
        hasReachedLimit,
        canReviewType,
        progress,
        limits
      };
    } catch (error) {
      console.error('Erro ao verificar status dos limites:', error);
      throw new AppError('Erro ao verificar limites diários', 500);
    }
  }

  /**
   * Incrementar contador de revisões para um tipo específico
   */
  async incrementReviewCount(userId: string, contentType: UnifiedContentType): Promise<void> {
    try {
      const progress = await this.getTodayProgress(userId);
      const now = Timestamp.now();

      const updates: Partial<DailyProgress> = {
        totalReviewed: progress.totalReviewed + 1,
        lastReviewAt: now,
        updatedAt: now,
      };

      switch (contentType) {
        case UnifiedContentType.QUESTION:
          updates.questionsReviewed = progress.questionsReviewed + 1;
          break;
        case UnifiedContentType.FLASHCARD:
          updates.flashcardsReviewed = progress.flashcardsReviewed + 1;
          break;
        case UnifiedContentType.ERROR_NOTEBOOK:
          updates.errorNotebookReviewed = progress.errorNotebookReviewed + 1;
          break;
      }

      await this.db
        .collection(DAILY_PROGRESS_COLLECTION)
        .doc(progress.id)
        .update(updates);

    } catch (error) {
      console.error('Erro ao incrementar contador de revisões:', error);
      // Não lançar erro para não interromper revisões
    }
  }

  /**
   * Resetar progresso diário (chamado automaticamente)
   */
  async resetDailyProgress(userId: string): Promise<void> {
    try {
      await this.createTodayProgress(userId);
    } catch (error) {
      console.error('Erro ao resetar progresso diário:', error);
      throw new AppError('Erro ao resetar progresso diário', 500);
    }
  }

  /**
   * Criar progresso para hoje
   */
  private async createTodayProgress(userId: string): Promise<DailyProgress> {
    const today = this.getTodayDateString();
    const now = Timestamp.now();
    
    const docRef = this.db.collection(DAILY_PROGRESS_COLLECTION).doc();
    const newProgress: DailyProgress = {
      id: docRef.id,
      userId,
      date: today,
      questionsReviewed: 0,
      flashcardsReviewed: 0,
      errorNotebookReviewed: 0,
      totalReviewed: 0,
      startedAt: now,
      lastReviewAt: now,
      createdAt: now,
      updatedAt: now,
    };

    await docRef.set(newProgress);
    return newProgress;
  }

  /**
   * Obter string da data de hoje no formato YYYY-MM-DD
   */
  private getTodayDateString(): string {
    return new Date().toISOString().split('T')[0];
  }
} 