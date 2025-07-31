import { Firestore, Timestamp } from 'firebase-admin/firestore';
import { AppError } from '../../../../shared/errors/AppError';

const DAY_COMPLETIONS_COLLECTION = 'dayCompletions';

export enum CompletionType {
  MANUAL = 'MANUAL', // Usuário marcou como completo manualmente
  AUTO_BY_LIMIT = 'AUTO_BY_LIMIT', // Completado automaticamente por atingir limite diário
  AUTO_BY_TIME = 'AUTO_BY_TIME', // Completado automaticamente por tempo estudado
  AUTO_BY_ITEMS = 'AUTO_BY_ITEMS' // Completado automaticamente por número de itens
}

export interface DayCompletion {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD format
  completionType: CompletionType;
  
  // Estatísticas do dia
  totalItemsReviewed: number;
  questionsReviewed: number;
  flashcardsReviewed: number;
  errorNotebookReviewed: number;
  
  // Tempo e performance
  totalTimeMinutes: number;
  averageResponseTimeSeconds: number;
  accuracyPercentage: number;
  
  // Dados de completação
  completedAt: Timestamp;
  manualNotes?: string; // Notas do usuário sobre o dia
  
  // Metas atingidas
  targetItemsMet: boolean;
  targetTimeMet: boolean;
  consistencyBonus: boolean; // Se manteve a streak
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface DayCompletionStats {
  currentStreak: number;
  longestStreak: number;
  totalCompletedDays: number;
  completionRate: number; // % dos últimos 30 dias
  averageItemsPerDay: number;
  averageTimePerDay: number;
  lastCompletionDate: string | null;
}

export interface CompletionSuggestion {
  shouldComplete: boolean;
  reason: string;
  completionType: CompletionType;
  stats: {
    itemsReviewed: number;
    timeSpent: number;
    accuracy: number;
  };
}

/**
 * Service para gerenciar completação de dias de estudo
 */
export class DayCompletionService {
  private db: Firestore;

  constructor(db: Firestore) {
    this.db = db;
  }

  /**
   * Marcar dia como completo
   */
  async completeDayStudy(
    userId: string,
    completionType: CompletionType,
    stats: {
      totalItemsReviewed: number;
      questionsReviewed: number;
      flashcardsReviewed: number;
      errorNotebookReviewed: number;
      totalTimeMinutes: number;
      averageResponseTimeSeconds?: number;
      accuracyPercentage?: number;
    },
    manualNotes?: string
  ): Promise<DayCompletion> {
    try {
      const today = this.getTodayDateString();
      
      // Verificar se já foi completado hoje
      const existingCompletion = await this.getTodayCompletion(userId);
      if (existingCompletion) {
        throw new AppError('Dia já foi marcado como completo', 400);
      }

      // Calcular se metas foram atingidas
      const targetItemsMet = stats.totalItemsReviewed >= 10; // Meta padrão
      const targetTimeMet = stats.totalTimeMinutes >= 15; // Meta padrão de 15 minutos
      
      // Verificar streak
      const streakData = await this.getStreakData(userId);
      const consistencyBonus = this.isConsecutiveDay(streakData.lastCompletionDate, today);

      const now = Timestamp.now();
      const docRef = this.db.collection(DAY_COMPLETIONS_COLLECTION).doc();
      
      const completion: DayCompletion = {
        id: docRef.id,
        userId,
        date: today,
        completionType,
        
        totalItemsReviewed: stats.totalItemsReviewed,
        questionsReviewed: stats.questionsReviewed,
        flashcardsReviewed: stats.flashcardsReviewed,
        errorNotebookReviewed: stats.errorNotebookReviewed,
        
        totalTimeMinutes: stats.totalTimeMinutes,
        averageResponseTimeSeconds: stats.averageResponseTimeSeconds || 0,
        accuracyPercentage: stats.accuracyPercentage || 0,
        
        completedAt: now,
        manualNotes,
        
        targetItemsMet,
        targetTimeMet,
        consistencyBonus,
        
        createdAt: now,
        updatedAt: now,
      };

      await docRef.set(completion);
      return completion;
    } catch (error) {
      console.error('Erro ao completar dia de estudo:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao completar dia de estudo', 500);
    }
  }

  /**
   * Obter completação de hoje (se existir)
   */
  async getTodayCompletion(userId: string): Promise<DayCompletion | null> {
    try {
      const todayString = this.getTodayDateString();
      
      const completionQuery = await this.db
        .collection(DAY_COMPLETIONS_COLLECTION)
        .where('userId', '==', userId)
        .where('date', '==', todayString)
        .limit(1)
        .get();

      if (completionQuery.empty) {
        return null;
      }

      const completionDoc = completionQuery.docs[0];
      return { id: completionDoc.id, ...completionDoc.data() } as DayCompletion;
    } catch (error) {
      console.error('Erro ao buscar completação de hoje:', error);
      throw new AppError('Erro ao buscar completação do dia', 500);
    }
  }

  /**
   * Obter estatísticas de completação do usuário
   */
  async getDayCompletionStats(userId: string): Promise<DayCompletionStats> {
    try {
      // Buscar todas as completações do usuário (últimos 365 dias)
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const oneYearAgoString = oneYearAgo.toISOString().split('T')[0];

      const completionsQuery = await this.db
        .collection(DAY_COMPLETIONS_COLLECTION)
        .where('userId', '==', userId)
        .where('date', '>=', oneYearAgoString)
        .orderBy('date', 'desc')
        .get();

      const completions = completionsQuery.docs.map(doc => doc.data() as DayCompletion);

      // Calcular streak atual
      const currentStreak = this.calculateCurrentStreak(completions);
      
      // Calcular longest streak
      const longestStreak = this.calculateLongestStreak(completions);

      // Estatísticas básicas
      const totalCompletedDays = completions.length;
      
      // Taxa de completação dos últimos 30 dias
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoString = thirtyDaysAgo.toISOString().split('T')[0];
      
      const last30DaysCompletions = completions.filter(c => c.date >= thirtyDaysAgoString);
      const completionRate = Math.round((last30DaysCompletions.length / 30) * 100);

      // Médias
      const averageItemsPerDay = totalCompletedDays > 0 
        ? Math.round(completions.reduce((sum, c) => sum + c.totalItemsReviewed, 0) / totalCompletedDays)
        : 0;
      
      const averageTimePerDay = totalCompletedDays > 0
        ? Math.round(completions.reduce((sum, c) => sum + c.totalTimeMinutes, 0) / totalCompletedDays)
        : 0;

      const lastCompletionDate = completions.length > 0 ? completions[0].date : null;

      return {
        currentStreak,
        longestStreak,
        totalCompletedDays,
        completionRate,
        averageItemsPerDay,
        averageTimePerDay,
        lastCompletionDate
      };
    } catch (error) {
      console.error('Erro ao obter estatísticas de completação:', error);
      throw new AppError('Erro ao obter estatísticas de completação', 500);
    }
  }

  /**
   * Sugerir se o dia deve ser marcado como completo
   */
  async suggestDayCompletion(
    userId: string,
    stats: {
      itemsReviewed: number;
      timeSpent: number;
      accuracy: number;
    }
  ): Promise<CompletionSuggestion> {
    try {
      // Verificar se já foi completado
      const todayCompletion = await this.getTodayCompletion(userId);
      if (todayCompletion) {
        return {
          shouldComplete: false,
          reason: 'Dia já foi marcado como completo',
          completionType: CompletionType.MANUAL,
          stats: stats
        };
      }

      // Critérios para sugerir completação
      const hasMinItems = stats.itemsReviewed >= 10;
      const hasMinTime = stats.timeSpent >= 15;

      if (hasMinItems && hasMinTime) {
        return {
          shouldComplete: true,
          reason: 'Você atingiu as metas diárias de itens e tempo de estudo!',
          completionType: CompletionType.AUTO_BY_ITEMS,
          stats: stats
        };
      }

      if (stats.timeSpent >= 30) {
        return {
          shouldComplete: true,
          reason: 'Você estudou por bastante tempo hoje!',
          completionType: CompletionType.AUTO_BY_TIME,
          stats: stats
        };
      }

      if (stats.itemsReviewed >= 20) {
        return {
          shouldComplete: true,
          reason: 'Você revisou muitos itens hoje!',
          completionType: CompletionType.AUTO_BY_ITEMS,
          stats: stats
        };
      }

      return {
        shouldComplete: false,
        reason: hasMinItems || hasMinTime 
          ? 'Continue estudando para atingir suas metas diárias!'
          : 'Você ainda pode estudar mais para atingir suas metas.',
        completionType: CompletionType.MANUAL,
        stats: stats
      };
    } catch (error) {
      console.error('Erro ao sugerir completação do dia:', error);
      throw new AppError('Erro ao sugerir completação do dia', 500);
    }
  }

  /**
   * Obter histórico de completações
   */
  async getCompletionHistory(
    userId: string,
    days: number = 30
  ): Promise<DayCompletion[]> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      const cutoffString = cutoffDate.toISOString().split('T')[0];

      const completionsQuery = await this.db
        .collection(DAY_COMPLETIONS_COLLECTION)
        .where('userId', '==', userId)
        .where('date', '>=', cutoffString)
        .orderBy('date', 'desc')
        .get();

      return completionsQuery.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as DayCompletion));
    } catch (error) {
      console.error('Erro ao buscar histórico de completações:', error);
      throw new AppError('Erro ao buscar histórico de completações', 500);
    }
  }

  // Métodos privados para cálculos

  private async getStreakData(userId: string): Promise<{ lastCompletionDate: string | null }> {
    try {
      const completionsQuery = await this.db
        .collection(DAY_COMPLETIONS_COLLECTION)
        .where('userId', '==', userId)
        .orderBy('date', 'desc')
        .limit(1)
        .get();

      if (completionsQuery.empty) {
        return { lastCompletionDate: null };
      }

      const lastCompletion = completionsQuery.docs[0].data() as DayCompletion;
      return { lastCompletionDate: lastCompletion.date };
    } catch (error) {
      console.error('Erro ao buscar dados de streak:', error);
      throw new AppError('Erro ao buscar dados de streak', 500);
    }
  }

  private isConsecutiveDay(lastDate: string | null, currentDate: string): boolean {
    if (!lastDate) return true; // Primeiro dia sempre conta
  
    const last = new Date(lastDate);
    const current = new Date(currentDate);
    const diffTime = current.getTime() - last.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays === 1;
  }

  private calculateCurrentStreak(completions: DayCompletion[]): number {
    if (completions.length === 0) {
      return 0;
    }

    let currentStreak = 0;
    const today = this.getTodayDateString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = yesterday.toISOString().split('T')[0];

    // Check if the most recent completion is today or yesterday
    if (completions[0].date === today || completions[0].date === yesterdayString) {
      currentStreak = 1;
      for (let i = 0; i < completions.length - 1; i++) {
        const currentCompletionDate = new Date(completions[i].date);
        const previousCompletionDate = new Date(completions[i + 1].date);
        
        const diffInDays = (currentCompletionDate.getTime() - previousCompletionDate.getTime()) / (1000 * 3600 * 24);

        if (diffInDays === 1) {
          currentStreak++;
        } else {
          break; // Streak is broken
        }
      }
    }
    
    return currentStreak;
  }

  private calculateLongestStreak(completions: DayCompletion[]): number {
    if (completions.length === 0) return 0;

    const sortedCompletions = completions.sort((a, b) => a.date.localeCompare(b.date));
    let longestStreak = 0;
    let currentStreak = 1;

    for (let i = 1; i < sortedCompletions.length; i++) {
      const prevDate = new Date(sortedCompletions[i - 1].date);
      const currDate = new Date(sortedCompletions[i].date);
      
      const diffTime = currDate.getTime() - prevDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        currentStreak++;
      } else {
        longestStreak = Math.max(longestStreak, currentStreak);
        currentStreak = 1;
      }
    }

    return Math.max(longestStreak, currentStreak);
  }

  private getTodayDateString(): string {
    return new Date().toISOString().split('T')[0];
  }
}