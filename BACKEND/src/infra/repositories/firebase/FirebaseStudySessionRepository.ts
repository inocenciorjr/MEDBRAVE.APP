import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { firestore } from '../../../config/firebaseAdmin';
import {
  StudySession,
  CreateStudySessionDTO,
  UpdateStudySessionDTO,
} from '../../../domain/studyTools/studySessions/types/studySession.types';
import {
  IStudySessionRepository,
  StudySessionFilters,
  PaginatedStudySessions,
  PaginationOptions
} from '../../../domain/studyTools/studySessions/repositories/IStudySessionRepository';
import { ReviewQuality } from '../../../domain/studyTools/flashcards/types/flashcard.types';
import { AppError } from '../../../shared/errors/AppError';

const COLLECTIONS = {
  STUDY_SESSIONS: 'studySessions',
  QUESTION_RESPONSES: 'questionResponses',
};

export class FirebaseStudySessionRepository implements IStudySessionRepository {
  private db = firestore;

  async create(data: CreateStudySessionDTO): Promise<StudySession> {
    if (!data.userId) {
      throw new AppError('O ID do usuário é obrigatório', 400);
    }
    if (!data.studyType) {
      throw new AppError('O tipo de estudo é obrigatório', 400);
    }

    const now = Timestamp.now();
    const newSessionRef = this.db.collection(COLLECTIONS.STUDY_SESSIONS).doc();

    const newSessionData: StudySession = {
      id: newSessionRef.id,
      userId: data.userId,
      startTime: data.startTime ? (data.startTime instanceof Timestamp ? data.startTime : Timestamp.fromDate(data.startTime)) : now,
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

    await newSessionRef.set(newSessionData);
    return newSessionData;
  }

  async findById(id: string, userId: string): Promise<StudySession | null> {
    if (!id) {
      throw new AppError('O ID da sessão é obrigatório', 400);
    }

    const doc = await this.db.collection(COLLECTIONS.STUDY_SESSIONS).doc(id).get();
    if (!doc.exists) {
      return null;
    }

    const sessionData = doc.data() as StudySession;
    if (sessionData.userId !== userId) {
      throw new AppError('Acesso não autorizado à sessão de estudo', 403);
    }

    return sessionData;
  }

  async findByUser(
    userId: string,
    filters: StudySessionFilters,
    pagination: PaginationOptions,
  ): Promise<PaginatedStudySessions> {
    if (!userId) {
      throw new AppError('O ID do usuário é obrigatório', 400);
    }

    let query = this.db.collection(COLLECTIONS.STUDY_SESSIONS).where('userId', '==', userId);

    if (filters.studyType) {
      query = query.where('studyType', '==', filters.studyType);
    }

    if (filters.isCompleted !== undefined) {
      query = query.where('isCompleted', '==', filters.isCompleted);
    }

    // Filtros de data de início/fim requerem índices compostos especiais,
    // então talvez seja melhor filtrar em memória após obter os resultados
    const hasDateFilter = filters.startDate || filters.endDate;

    const sortBy = pagination.sortBy || 'startTime';
    const sortOrder = pagination.sortOrder || 'desc';
    query = query.orderBy(sortBy, sortOrder);

    let hasMore = false;
    if (pagination.lastDocId) {
      const startAfterDoc = await this.db.collection(COLLECTIONS.STUDY_SESSIONS).doc(pagination.lastDocId).get();
      if (startAfterDoc.exists) {
        query = query.startAfter(startAfterDoc);
      }
    }
    query = query.limit(pagination.limit + 1);

    const snapshot = await query.get();
    let sessions = snapshot.docs.slice(0, pagination.limit).map(doc => doc.data() as StudySession);
    hasMore = snapshot.docs.length > pagination.limit;

    // Aplicar filtros de data manualmente se necessário
    if (hasDateFilter) {
      if (filters.startDate) {
        const startTimestamp = Timestamp.fromDate(filters.startDate);
        sessions = sessions.filter(
          session => session.startTime.toMillis() >= startTimestamp.toMillis(),
        );
      }

      if (filters.endDate) {
        const endTimestamp = Timestamp.fromDate(filters.endDate);
        sessions = sessions.filter(
          session => !session.endTime || session.endTime.toMillis() <= endTimestamp.toMillis(),
        );
      }
    }

    return {
      items: sessions,
      total: await this.countUserSessions(userId, filters),
      hasMore,
      lastDocId: hasMore ? snapshot.docs[pagination.limit].id : undefined,
    };
  }

  private async countUserSessions(userId: string, filters: StudySessionFilters): Promise<number> {
    let query = this.db.collection(COLLECTIONS.STUDY_SESSIONS).where('userId', '==', userId);

    if (filters.studyType) {
      query = query.where('studyType', '==', filters.studyType);
    }

    if (filters.isCompleted !== undefined) {
      query = query.where('isCompleted', '==', filters.isCompleted);
    }

    // Para filtros de data, precisaríamos filtrar os resultados manualmente assim como em findByUser
    const hasDateFilter = filters.startDate || filters.endDate;

    if (hasDateFilter) {
      // Se temos filtros de data, contamos manualmente
      const allSessions = await query.get();
      let count = 0;

      for (const doc of allSessions.docs) {
        const session = doc.data() as StudySession;
        let includeInCount = true;

        if (filters.startDate) {
          const startTimestamp = Timestamp.fromDate(filters.startDate);
          if (session.startTime.toMillis() < startTimestamp.toMillis()) {
            includeInCount = false;
          }
        }

        if (includeInCount && filters.endDate) {
          const endTimestamp = Timestamp.fromDate(filters.endDate);
          if (session.endTime && session.endTime.toMillis() > endTimestamp.toMillis()) {
            includeInCount = false;
          }
        }

        if (includeInCount) {
          count++;
        }
      }

      return count;
    } else {
      // Se não temos filtros de data, podemos usar count() do Firestore
      const countSnapshot = await query.count().get();
      return countSnapshot.data().count;
    }
  }

  async update(id: string, userId: string, data: UpdateStudySessionDTO): Promise<StudySession> {
    const sessionRef = this.db.collection(COLLECTIONS.STUDY_SESSIONS).doc(id);
    const doc = await sessionRef.get();

    if (!doc.exists) {
      throw new AppError(`Sessão de estudo com ID "${id}" não encontrada`, 404);
    }

    const currentData = doc.data() as StudySession;
    if (currentData.userId !== userId) {
      throw new AppError('Usuário não autorizado a atualizar esta sessão de estudo', 403);
    }

    if (currentData.isCompleted && data.isCompleted === false) {
      throw new AppError('Não é possível reabrir uma sessão de estudo já completada', 400);
    }

    if (
      currentData.isCompleted &&
      (data.questionsAnswered || data.correctAnswers || data.incorrectAnswers)
    ) {
      throw new AppError(
        'Não é possível alterar contadores de respostas de uma sessão completada',
        400,
      );
    }

    // Remove endTime do spread para tratar manualmente
    const { endTime, ...restData } = data;
    const updateData: Partial<StudySession> = { ...restData, updatedAt: Timestamp.now() };
    if (endTime) {
      if (endTime instanceof Date) {
        updateData.endTime = Timestamp.fromDate(endTime);
      } else if (typeof endTime === 'object' && typeof (endTime as any).toDate === 'function' && typeof (endTime as any).toMillis === 'function') {
        updateData.endTime = endTime;
      }
    }

    if (data.focusScore !== undefined && data.focusScore !== null) {
      updateData.focusScore = Math.min(100, Math.max(0, Math.round(data.focusScore)));
    }

    // Garante que updateData.endTime nunca seja Date
    if (updateData.endTime instanceof Date) {
      updateData.endTime = Timestamp.fromDate(updateData.endTime);
    }

    await sessionRef.update(updateData);

    const updatedDoc = await sessionRef.get();
    return updatedDoc.data() as StudySession;
  }

  async delete(id: string, userId: string): Promise<void> {
    const sessionRef = this.db.collection(COLLECTIONS.STUDY_SESSIONS).doc(id);
    const doc = await sessionRef.get();

    if (!doc.exists) {
      throw new AppError(`Sessão de estudo com ID "${id}" não encontrada`, 404);
    }

    const sessionData = doc.data() as StudySession;
    if (sessionData.userId !== userId) {
      throw new AppError('Usuário não autorizado a excluir esta sessão de estudo', 403);
    }

    await sessionRef.delete();
  }

  async complete(
    id: string,
    userId: string,
    finalUpdates?: UpdateStudySessionDTO,
  ): Promise<StudySession> {
    const sessionRef = this.db.collection(COLLECTIONS.STUDY_SESSIONS).doc(id);
    const doc = await sessionRef.get();

    if (!doc.exists) {
      throw new AppError(`Sessão de estudo com ID "${id}" não encontrada`, 404);
    }

    const currentData = doc.data() as StudySession;
    if (currentData.userId !== userId) {
      throw new AppError('Usuário não autorizado a completar esta sessão de estudo', 403);
    }

    if (currentData.isCompleted) {
      return currentData;
    }

    const now = Timestamp.now();
    let completionData: Partial<StudySession> = {
      isCompleted: true,
      updatedAt: now,
    };
    if (finalUpdates) {
      // Atribuição manual para garantir tipos corretos
      if (finalUpdates.endTime) {
        if (finalUpdates.endTime instanceof Date) {
          completionData.endTime = Timestamp.fromDate(finalUpdates.endTime);
        } else if (typeof finalUpdates.endTime === 'object' && typeof (finalUpdates.endTime as any).toDate === 'function' && typeof (finalUpdates.endTime as any).toMillis === 'function') {
          completionData.endTime = finalUpdates.endTime;
        }
      }
      if (finalUpdates.questionsAnswered !== undefined) completionData.questionsAnswered = finalUpdates.questionsAnswered;
      if (finalUpdates.correctAnswers !== undefined) completionData.correctAnswers = finalUpdates.correctAnswers;
      if (finalUpdates.incorrectAnswers !== undefined) completionData.incorrectAnswers = finalUpdates.incorrectAnswers;
      if (finalUpdates.notes !== undefined) completionData.notes = finalUpdates.notes;
      if (finalUpdates.mood !== undefined) completionData.mood = finalUpdates.mood;
      if (finalUpdates.difficulty !== undefined) completionData.difficulty = finalUpdates.difficulty;
      if (finalUpdates.focusScore !== undefined) completionData.focusScore = finalUpdates.focusScore;
    }
    if (!completionData.endTime) {
      completionData.endTime = now;
    }
    // Conversão definitiva: garante que endTime nunca seja Date
    if (completionData.endTime instanceof Date) {
      completionData.endTime = Timestamp.fromDate(completionData.endTime);
    }

    if (currentData.startTime && completionData.endTime) {
      if (completionData.endTime instanceof Date) {
        completionData.endTime = Timestamp.fromDate(completionData.endTime);
      }
      const durationMs =
        (completionData.endTime as Timestamp).toMillis() - currentData.startTime.toMillis();
      completionData.duration = Math.round(durationMs / (1000 * 60)); // Duração em minutos
    }
    // Garante tipo correto antes do update
    if (completionData.endTime instanceof Date) {
      completionData.endTime = Timestamp.fromDate(completionData.endTime);
    }

    const questionsAnswered = finalUpdates?.questionsAnswered ?? currentData.questionsAnswered;
    const correctAnswers = finalUpdates?.correctAnswers ?? currentData.correctAnswers;

    if (questionsAnswered > 0) {
      completionData.accuracy = parseFloat(((correctAnswers / questionsAnswered) * 100).toFixed(2));
    } else {
      completionData.accuracy = 0;
    }

    if (finalUpdates?.questionsAnswered !== undefined) {
      completionData.questionsAnswered = finalUpdates.questionsAnswered;
    }

    if (finalUpdates?.correctAnswers !== undefined) {
      completionData.correctAnswers = finalUpdates.correctAnswers;
    }

    if (finalUpdates?.incorrectAnswers !== undefined) {
      completionData.incorrectAnswers = finalUpdates.incorrectAnswers;
    }

    if (finalUpdates?.focusScore !== undefined && finalUpdates.focusScore !== null) {
      completionData.focusScore = Math.min(100, Math.max(0, Math.round(finalUpdates.focusScore)));
    }

    await sessionRef.update(completionData);

    const updatedDoc = await sessionRef.get();
    return updatedDoc.data() as StudySession;
  }

  async recordAnswer(
    sessionId: string,
    userId: string,
    questionId: string,
    isCorrect: boolean,
    quality: ReviewQuality,
    selectedOptionId?: string | null,
    essayResponse?: string | null,
    responseTimeSeconds?: number,
    questionListId?: string | null,
  ): Promise<void> {
    const sessionRef = this.db.collection(COLLECTIONS.STUDY_SESSIONS).doc(sessionId);
    const sessionDoc = await sessionRef.get();

    if (!sessionDoc.exists) {
      throw new AppError(`Sessão de estudo com ID "${sessionId}" não encontrada`, 404);
    }

    const sessionData = sessionDoc.data() as StudySession;
    if (sessionData.userId !== userId) {
      throw new AppError('Usuário não autorizado a registrar respostas nesta sessão', 403);
    }

    if (sessionData.isCompleted) {
      throw new AppError('Não é possível registrar respostas em uma sessão já completada', 400);
    }

    // Atualizar contadores da sessão de estudo
    const updatePayload: Record<string, any> = {
      questionsAnswered: FieldValue.increment(1),
      updatedAt: Timestamp.now(),
    };

    if (isCorrect) {
      updatePayload.correctAnswers = FieldValue.increment(1);
    } else {
      updatePayload.incorrectAnswers = FieldValue.increment(1);
    }

    await sessionRef.update(updatePayload);

    // Registrar resposta no histórico de respostas do usuário
    let qrId: string | null = null;

    // Verificar se já existe uma resposta para essa questão
    const qrSnapshot = await this.db
      .collection(COLLECTIONS.QUESTION_RESPONSES)
      .where('userId', '==', userId)
      .where('questionId', '==', questionId)
      .limit(1)
      .get();

    if (!qrSnapshot.empty) {
      qrId = qrSnapshot.docs[0].id;

      // Atualizar resposta existente com a nova avaliação de qualidade
      await this.db
        .collection(COLLECTIONS.QUESTION_RESPONSES)
        .doc(qrId)
        .update({
          lastQuality: quality,
          lastResponseAt: Timestamp.now(),
          responseCount: FieldValue.increment(1),
          selectedOptionId: selectedOptionId || null,
          essayResponse: essayResponse || null,
          responseTimeSeconds: responseTimeSeconds || null,
          updatedAt: Timestamp.now(),
        });
    } else {
      // Criar nova resposta
      const newQrRef = this.db.collection(COLLECTIONS.QUESTION_RESPONSES).doc();
      qrId = newQrRef.id;

      await newQrRef.set({
        id: qrId,
        userId,
        questionId,
        questionListId: questionListId || null,
        selectedOptionId: selectedOptionId || null,
        essayResponse: essayResponse || null,
        isCorrectOnFirstAttempt: isCorrect,
        responseTimeSeconds: responseTimeSeconds || null,
        addedToErrorNotebook: false,
        lastQuality: quality,
        responseCount: 1,
        lastResponseAt: Timestamp.now(),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    }
  }
}
