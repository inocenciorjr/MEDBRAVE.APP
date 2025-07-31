import { firestore } from 'firebase-admin';
import {
  IStudySessionRepository,
  StudySessionFilters,
  PaginationOptions,
  PaginatedStudySessions,
} from './IStudySessionRepository';
import {
  StudySession,
  CreateStudySessionDTO,
  UpdateStudySessionDTO,
  CompleteStudySessionDTO,
} from '../types/studySession.types';
import { AppError } from '../../../../shared/errors/AppError';

export class FirebaseStudySessionRepository implements IStudySessionRepository {
  private collection: string = 'studySessions';

  constructor(private db: firestore.Firestore) {}

  async create(data: CreateStudySessionDTO): Promise<StudySession> {
    try {
      const id = this.db.collection(this.collection).doc().id;
      const now = firestore.Timestamp.now();

      // Preparar sessão de estudo
      const studySession: StudySession = {
        id,
        userId: data.userId,
        startTime: data.startTime ? firestore.Timestamp.fromDate(data.startTime as Date) : now,
        endTime: null,
        duration: null,
        questionsAnswered: 0,
        correctAnswers: 0,
        incorrectAnswers: 0,
        accuracy: null,
        studyType: data.studyType,
        filters: data.filters || null,
        subFilters: data.subFilters || null,
        notes: null,
        mood: null,
        difficulty: null,
        focusScore: null,
        isCompleted: false,
        createdAt: now,
        updatedAt: now,
      };

      await this.db.collection(this.collection).doc(id).set(studySession);

      return studySession;
    } catch (error) {
      console.error('Erro ao criar sessão de estudo:', error);
      throw new AppError('Failed to create study session', 500);
    }
  }

  async findById(id: string, userId?: string): Promise<StudySession | null> {
    try {
      const doc = await this.db.collection(this.collection).doc(id).get();

      if (!doc.exists) {
        return null;
      }

      const studySession = doc.data() as StudySession;

      // Verificar se a sessão pertence ao usuário (se userId for fornecido)
      if (userId && studySession.userId !== userId) {
        return null;
      }

      return studySession;
    } catch (error) {
      console.error('Erro ao buscar sessão de estudo por ID:', error);
      throw new AppError('Failed to fetch study session', 500);
    }
  }

  async findByUser(
    userId: string,
    filters?: StudySessionFilters,
    pagination?: PaginationOptions,
  ): Promise<PaginatedStudySessions> {
    try {
      let query = this.db.collection(this.collection).where('userId', '==', userId);

      // Aplicar filtros
      if (filters) {
        if (filters.studyType) {
          query = query.where('type', '==', filters.studyType);
        }

        if (filters.isCompleted !== undefined) {
          const status = filters.isCompleted ? 'completed' : 'in_progress';
          query = query.where('status', '==', status);
        }

        // Filtros de data precisam ser aplicados como desigualdades
        if (filters.startDate) {
          const startTimestamp = firestore.Timestamp.fromDate(filters.startDate);
          query = query.where('startedAt', '>=', startTimestamp);
        }

        if (filters.endDate) {
          const endTimestamp = firestore.Timestamp.fromDate(filters.endDate);
          query = query.where('startedAt', '<=', endTimestamp);
        }
      }

      // Ordenação padrão
      const sortBy = pagination?.sortBy || 'startedAt';
      const sortOrder = pagination?.sortOrder || 'desc';
      query = query.orderBy(sortBy, sortOrder);

      // Executar query para obter contagem total
      const totalSnapshot = await query.get();
      const total = totalSnapshot.size;

      // Paginação
      const page = pagination?.page || 1;
      const limit = pagination?.limit || 10;
      const offset = (page - 1) * limit;

      // Aplicar paginação
      if (offset > 0) {
        query = query.offset(offset);
      }
      query = query.limit(limit);

      // Executar query paginada
      const snapshot = await query.get();
      const items = snapshot.docs.map(doc => doc.data() as StudySession);

      return {
        items,
        total,
        hasMore: page * limit < total,
      };
    } catch (error) {
      console.error('Erro ao buscar sessões de estudo do usuário:', error);
      throw new AppError('Failed to fetch user study sessions', 500);
    }
  }

  async update(id: string, userId: string, data: UpdateStudySessionDTO): Promise<StudySession> {
    try {
      // Verificar se a sessão existe e pertence ao usuário
      const studySession = await this.findById(id, userId);

      if (!studySession) {
        throw new AppError('Study session not found or unauthorized', 404);
      }

      // Verificar se a sessão já foi concluída
      if (studySession.isCompleted) {
        throw new AppError('Cannot update a completed study session', 400);
      }

      // Preparar dados para atualização
      const now = firestore.Timestamp.now();
      // Remover endTime do spread para tratar manualmente
      const { endTime, ...restData } = data;
      const updateData: Partial<StudySession> = {
        ...restData,
        updatedAt: now,
      };
      if (endTime && endTime instanceof Date) {
        updateData.endTime = firestore.Timestamp.fromDate(endTime);
      } else if (endTime && (endTime as any)._seconds !== undefined) {
        // já é Timestamp, não faz nada
        updateData.endTime = endTime as any;
      } else if (endTime) {
        // fallback defensivo: tenta converter para Timestamp
        try {
          updateData.endTime = firestore.Timestamp.fromDate(new Date(endTime as any));
        } catch {}
      }

      await this.db.collection(this.collection).doc(id).update(updateData);

      // Retornar sessão atualizada
      return {
        ...studySession,
        ...updateData,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Erro ao atualizar sessão de estudo:', error);
      throw new AppError('Failed to update study session', 500);
    }
  }

  async delete(id: string, userId: string): Promise<void> {
    try {
      // Verificar se a sessão existe e pertence ao usuário
      const studySession = await this.findById(id, userId);

      if (!studySession) {
        throw new AppError('Study session not found or unauthorized', 404);
      }

      await this.db.collection(this.collection).doc(id).delete();
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Erro ao excluir sessão de estudo:', error);
      throw new AppError('Failed to delete study session', 500);
    }
  }

  async complete(id: string, userId: string, data: CompleteStudySessionDTO): Promise<StudySession> {
    try {
      // Verificar se a sessão existe e pertence ao usuário
      const studySession = await this.findById(id, userId);

      if (!studySession) {
        throw new AppError('Study session not found or unauthorized', 404);
      }

      // Verificar se a sessão já foi concluída
      if (studySession.isCompleted) {
        throw new AppError('Study session is already completed', 400);
      }

      // Preparar dados para concluir a sessão
      const now = firestore.Timestamp.now();
      const endTime = data.endTime ? firestore.Timestamp.fromDate(data.endTime) : now;
      let duration = null;
      if (studySession.startTime && endTime) {
        duration = Math.floor((endTime.toDate().getTime() - studySession.startTime.toDate().getTime()) / 60000);
      }
      const updateData: Partial<StudySession> = {
        isCompleted: true,
        endTime,
        notes: data.notes || '',
        mood: data.mood || null,
        difficulty: data.difficulty || null,
        focusScore: data.focusScore || null,
        duration,
        updatedAt: now,
      };

      await this.db.collection(this.collection).doc(id).update(updateData);

      // Retornar sessão atualizada
      return {
        ...studySession,
        ...updateData,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Erro ao concluir sessão de estudo:', error);
      throw new AppError('Failed to complete study session', 500);
    }
  }

  async recordAnswer(
    sessionId: string,
    userId: string,
    questionId: string,
    isCorrect: boolean,
    quality: import('../../flashcards/types/flashcard.types').ReviewQuality,
    selectedOptionId?: string | null,
    essayResponse?: string | null,
    responseTimeSeconds?: number,
    questionListId?: string | null,
  ): Promise<void> {
    try {
      // Verificar se a sessão existe e pertence ao usuário
      const studySession = await this.findById(sessionId, userId);

      if (!studySession) {
        throw new AppError('Study session not found or unauthorized', 404);
      }

      // Verificar se a sessão já foi concluída
      if (studySession.isCompleted) {
        throw new AppError('Cannot record answer for a completed study session', 400);
      }

      // Calcular novos valores
      const questionsAnswered = studySession.questionsAnswered + 1;
      const correctAnswers = isCorrect
        ? studySession.correctAnswers + 1
        : studySession.correctAnswers;
      const incorrectAnswers = !isCorrect
        ? studySession.incorrectAnswers + 1
        : studySession.incorrectAnswers;

      // Preparar dados para atualização
      const updateData = {
        questionsAnswered,
        correctAnswers,
        incorrectAnswers,
        updatedAt: firestore.Timestamp.now(),
      };

      await this.db.collection(this.collection).doc(sessionId).update(updateData);

      // Registrar também a resposta específica
      const answerData = {
        sessionId,
        questionId,
        userId,
        isCorrect,
        quality,
        selectedOptionId: selectedOptionId || null,
        essayResponse: essayResponse || null,
        responseTimeSeconds: responseTimeSeconds || null,
        questionListId: questionListId || null,
        timestamp: firestore.Timestamp.now(),
      };

      await this.db.collection('sessionAnswers').add(answerData);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Erro ao registrar resposta:', error);
      throw new AppError('Failed to record answer', 500);
    }
  }

  async getStats(userId: string): Promise<{
    totalSessions: number;
    completedSessions: number;
    totalTimeSpent: number;
    averageScore: number;
  }> {
    try {
      // Buscar todas as sessões do usuário
      const snapshot = await this.db
        .collection(this.collection)
        .where('userId', '==', userId)
        .get();

      if (snapshot.empty) {
        return {
          totalSessions: 0,
          completedSessions: 0,
          totalTimeSpent: 0,
          averageScore: 0,
        };
      }

      // Calcular estatísticas
      let totalSessions = 0;
      let completedSessions = 0;
      let totalTimeSpent = 0;
      let totalQuestions = 0;
      let totalCorrect = 0;

      snapshot.docs.forEach(doc => {
        const session = doc.data() as StudySession;
        totalSessions++;

        if (session.isCompleted) {
          completedSessions++;
          totalTimeSpent += session.duration || 0;
        }

        totalQuestions += session.questionsAnswered;
        totalCorrect += session.correctAnswers;
      });

      const averageScore = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;

      return {
        totalSessions,
        completedSessions,
        totalTimeSpent,
        averageScore,
      };
    } catch (error) {
      console.error('Erro ao obter estatísticas de sessões de estudo:', error);
      throw new AppError('Failed to get study session statistics', 500);
    }
  }
}
