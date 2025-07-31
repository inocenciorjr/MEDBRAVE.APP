import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { firestore } from '../../../../config/firebaseAdmin';
import AppError from '../../../../utils/AppError';
import {
  StudySession,
  StudySessionType,
  CreateStudySessionDTO,
  UpdateStudySessionDTO,
  StudySessionFilters,
  PaginatedStudySessions,
  PaginationOptions,
} from '../types';
import logger from '../../../../utils/logger';
import { ReviewQuality } from '../../flashcards/types';
// Removendo imports SM-2 legacy - FSRS já integrado via unifiedReviews
// import { ProgrammedReviewServiceFactory } from '../../../srs/factory/programmedReviewServiceFactory';
// import { ProgrammedReviewContentType, ProgrammedReviewStatus } from '../../../srs/types';
// import type { IProgrammedReviewService } from '../../../srs/interfaces/IProgrammedReviewService';

// Collections
const STUDY_SESSIONS_COLLECTION = 'studySessions';
const USERS_COLLECTION = 'users';

export class StudySessionService {
  private db = firestore;
  // private programmedReviewService: IProgrammedReviewService;

  constructor() {
    // this.programmedReviewService = ProgrammedReviewServiceFactory.createService(this.db);
  }

  async createStudySession(data: CreateStudySessionDTO): Promise<StudySession> {
    try {
      const now = Timestamp.now();
      const newSession: Omit<StudySession, 'id'> = {
        userId: data.userId,
        startTime: data.startTime || now,
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

      const docRef = await this.db.collection(STUDY_SESSIONS_COLLECTION).add(newSession);
      return {
        id: docRef.id,
        ...newSession,
      };
    } catch (error) {
      logger.error('Erro ao criar sessão de estudo:', { error, data });
      if (error instanceof AppError) {
        throw error;
      }
      throw AppError.internal('Erro ao criar sessão de estudo');
    }
  }

  async getSessionById(id: string, userId: string): Promise<StudySession | null> {
    try {
      const sessionDoc = await this.db.collection(STUDY_SESSIONS_COLLECTION).doc(id).get();
      if (!sessionDoc.exists) {
        return null;
      }

      const session = sessionDoc.data() as Omit<StudySession, 'id'>;
      if (session.userId !== userId) {
        throw AppError.forbidden('Usuário não autorizado a acessar esta sessão de estudo');
      }

      return {
        id: sessionDoc.id,
        ...session,
      };
    } catch (error) {
      logger.error('Erro ao buscar sessão de estudo:', { error, id, userId });
      if (error instanceof AppError) {
        throw error;
      }
      throw AppError.internal('Erro ao buscar sessão de estudo');
    }
  }

  async updateSession(
    id: string,
    userId: string,
    data: UpdateStudySessionDTO,
  ): Promise<StudySession> {
    try {
      const sessionRef = this.db.collection(STUDY_SESSIONS_COLLECTION).doc(id);
      const sessionDoc = await sessionRef.get();

      if (!sessionDoc.exists) {
        throw AppError.notFound('Sessão de estudo não encontrada');
      }

      const session = sessionDoc.data() as StudySession;
      if (session.userId !== userId) {
        throw AppError.forbidden('Usuário não autorizado a atualizar esta sessão de estudo');
      }

      const updateData: Partial<StudySession> = {
        ...data,
        updatedAt: Timestamp.now(),
      };

      // Calcular a acurácia se os valores necessários forem fornecidos
      if (
        data.questionsAnswered !== undefined &&
        (data.correctAnswers !== undefined || data.incorrectAnswers !== undefined)
      ) {
        const totalAnswered = data.questionsAnswered;
        const correctAnswers =
          data.correctAnswers !== undefined ? data.correctAnswers : session.correctAnswers;

        if (totalAnswered > 0) {
          updateData.accuracy = (correctAnswers / totalAnswered) * 100;
        }
      }

      // Calcular a duração se startTime e endTime estiverem presentes
      if (data.endTime && session.startTime) {
        const durationMs = data.endTime.toMillis() - session.startTime.toMillis();
        updateData.duration = Math.round(durationMs / (1000 * 60)); // Convertendo para minutos
      }

      await sessionRef.update(updateData);
      const updatedDoc = await sessionRef.get();
      return {
        id: updatedDoc.id,
        ...updatedDoc.data(),
      } as StudySession;
    } catch (error) {
      logger.error('Erro ao atualizar sessão de estudo:', { error, id, userId, data });
      if (error instanceof AppError) {
        throw error;
      }
      throw AppError.internal('Erro ao atualizar sessão de estudo');
    }
  }

  async completeSession(
    id: string,
    userId: string,
    finalUpdates?: UpdateStudySessionDTO,
  ): Promise<StudySession> {
    try {
      const sessionRef = this.db.collection(STUDY_SESSIONS_COLLECTION).doc(id);
      const sessionDoc = await sessionRef.get();

      if (!sessionDoc.exists) {
        throw AppError.notFound('Sessão de estudo não encontrada');
      }

      const session = sessionDoc.data() as StudySession;
      if (session.userId !== userId) {
        throw AppError.forbidden('Usuário não autorizado a completar esta sessão de estudo');
      }

      const now = Timestamp.now();
      const completeData: Partial<StudySession> = {
        endTime: finalUpdates?.endTime || now,
        isCompleted: true,
        updatedAt: now,
        ...finalUpdates,
      };

      // Calcular a duração se não foi informada
      if (!completeData.duration && session.startTime) {
        const endTime = completeData.endTime || now;
        const durationMs = endTime.toMillis() - session.startTime.toMillis();
        completeData.duration = Math.round(durationMs / (1000 * 60)); // Convertendo para minutos
      }

      // Calcular a acurácia se os valores necessários estiverem disponíveis
      const questionsAnswered = finalUpdates?.questionsAnswered ?? session.questionsAnswered;
      const correctAnswers = finalUpdates?.correctAnswers ?? session.correctAnswers;

      if (questionsAnswered > 0) {
        completeData.accuracy = (correctAnswers / questionsAnswered) * 100;
      }

      await sessionRef.update(completeData);

      // Atualizar estatísticas do usuário
      const userRef = this.db.collection(USERS_COLLECTION).doc(userId);
      await userRef.update({
        totalStudySessions: FieldValue.increment(1),
        totalStudyTimeMinutes: FieldValue.increment(completeData.duration || 0),
        updatedAt: now,
      });

      const updatedDoc = await sessionRef.get();
      return {
        id: updatedDoc.id,
        ...updatedDoc.data(),
      } as StudySession;
    } catch (error) {
      logger.error('Erro ao completar sessão de estudo:', { error, id, userId });
      if (error instanceof AppError) {
        throw error;
      }
      throw AppError.internal('Erro ao completar sessão de estudo');
    }
  }

  async deleteSession(id: string, userId: string): Promise<void> {
    try {
      const sessionRef = this.db.collection(STUDY_SESSIONS_COLLECTION).doc(id);
      const sessionDoc = await sessionRef.get();

      if (!sessionDoc.exists) {
        throw AppError.notFound('Sessão de estudo não encontrada');
      }

      const session = sessionDoc.data() as StudySession;
      if (session.userId !== userId) {
        throw AppError.forbidden('Usuário não autorizado a deletar esta sessão de estudo');
      }

      await sessionRef.delete();
    } catch (error) {
      logger.error('Erro ao deletar sessão de estudo:', { error, id, userId });
      if (error instanceof AppError) {
        throw error;
      }
      throw AppError.internal('Erro ao deletar sessão de estudo');
    }
  }

  async findByUser(
    userId: string,
    filters: StudySessionFilters = {},
    pagination: PaginationOptions = { page: 1, limit: 10 },
  ): Promise<PaginatedStudySessions> {
    try {
      let query = this.db.collection(STUDY_SESSIONS_COLLECTION).where('userId', '==', userId);

      // Aplicar filtros
      if (filters.studyType) {
        query = query.where('studyType', '==', filters.studyType);
      }

      if (filters.isCompleted !== undefined) {
        query = query.where('isCompleted', '==', filters.isCompleted);
      }

      if (filters.startDate) {
        const startTimestamp = Timestamp.fromDate(filters.startDate);
        query = query.where('startTime', '>=', startTimestamp);
      }

      if (filters.endDate) {
        const endTimestamp = Timestamp.fromDate(filters.endDate);
        query = query.where('startTime', '<=', endTimestamp);
      }

      // Ordenação padrão por data de início decrescente
      query = query.orderBy('startTime', 'desc');

      // Paginação
      const startAfter = (pagination.page - 1) * pagination.limit;
      const limitPlusOne = pagination.limit + 1; // +1 para verificar se há mais páginas

      query = query.offset(startAfter).limit(limitPlusOne);

      const snapshot = await query.get();
      const hasMore = snapshot.size > pagination.limit;

      const sessions = snapshot.docs.slice(0, pagination.limit).map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as StudySession[];

      // Contar o total de documentos (pode ser otimizado em versões futuras)
      const countQuery = this.db
        .collection(STUDY_SESSIONS_COLLECTION)
        .where('userId', '==', userId);

      if (filters.studyType) {
        countQuery.where('studyType', '==', filters.studyType);
      }

      if (filters.isCompleted !== undefined) {
        countQuery.where('isCompleted', '==', filters.isCompleted);
      }

      const countSnapshot = await countQuery.count().get();
      const total = countSnapshot.data().count;

      return {
        sessions,
        total,
        hasMore,
      };
    } catch (error) {
      logger.error('Erro ao buscar sessões de estudo do usuário:', { error, userId, filters });
      if (error instanceof AppError) {
        throw error;
      }
      throw AppError.internal('Erro ao buscar sessões de estudo');
    }
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
    try {
      const sessionRef = this.db.collection(STUDY_SESSIONS_COLLECTION).doc(sessionId);
      const sessionDoc = await sessionRef.get();

      if (!sessionDoc.exists) {
        throw AppError.notFound('Sessão de estudo não encontrada');
      }

      const session = sessionDoc.data() as StudySession;
      if (session.userId !== userId) {
        throw AppError.forbidden('Usuário não autorizado a registrar resposta nesta sessão');
      }

      if (session.isCompleted) {
        throw AppError.badRequest('Não é possível registrar respostas em uma sessão completa');
      }

      // Atualizar estatísticas da sessão
      const updateData: { [key: string]: any } = {
        questionsAnswered: FieldValue.increment(1),
        updatedAt: Timestamp.now(),
      };

      if (isCorrect) {
        updateData.correctAnswers = FieldValue.increment(1);
      } else {
        updateData.incorrectAnswers = FieldValue.increment(1);
      }

      // Registrar a resposta
      const answerId = `${sessionId}_${questionId}_${Date.now()}`;
      const answerData = {
        id: answerId,
        sessionId,
        userId,
        questionId,
        questionListId: questionListId || null,
        isCorrect,
        quality,
        selectedOptionId: selectedOptionId || null,
        essayResponse: essayResponse || null,
        responseTimeSeconds: responseTimeSeconds || null,
        createdAt: Timestamp.now(),
      };

      const batch = this.db.batch();

      // Atualizar sessão
      batch.update(sessionRef, updateData);

      // Registrar resposta
      const answerRef = this.db.collection('studySessionAnswers').doc(answerId);
      batch.set(answerRef, answerData);

      // Atualizar estatísticas do usuário se necessário
      if (session.studyType === StudySessionType.QUESTIONS) {
        const userRef = this.db.collection(USERS_COLLECTION).doc(userId);
        batch.update(userRef, {
          totalQuestionsAnswered: FieldValue.increment(1),
          totalCorrectAnswers: FieldValue.increment(isCorrect ? 1 : 0),
          updatedAt: Timestamp.now(),
        });
      }

      // Integrar com sistema SRS para agendamento de revisões
      try {
        // Verificar se já existe uma revisão programada para esta questão
        // const existingReview = await this.programmedReviewService.getProgrammedReviewByContentId(
        //   questionId,
        //   ProgrammedReviewContentType.QUESTION,
        //   userId
        // );

        // if (existingReview) {
        //   // Atualizar a revisão programada existente
        //   await this.programmedReviewService.updateProgrammedReview(
        //     existingReview.id,
        //     quality,
        //     `Question review - Correct: ${isCorrect}`
        //   );
        //   
        //   logger.info('Revisão programada atualizada para questão', {
        //     questionId,
        //     userId,
        //     reviewId: existingReview.id
        //   });
        // } else {
        //   // Criar uma nova revisão programada
        //   const now = Timestamp.now();
        //   const programmedReview = await this.programmedReviewService.createProgrammedReview({
        //     userId,
        //     contentId: questionId,
        //     contentType: ProgrammedReviewContentType.QUESTION,
        //     deckId: null, // Questões não têm deck associado
        //     originalAnswerCorrect: isCorrect,
        //     nextReviewAt: Timestamp.fromMillis(now.toMillis() + 24 * 60 * 60 * 1000), // 1 dia inicial
        //     intervalDays: 1,
        //     easeFactor: 2.5,
        //     repetitions: 0,
        //     lapses: 0,
        //     status: ProgrammedReviewStatus.LEARNING,
        //     notes: null
        //   });
        //   
        //   logger.info('Nova revisão programada criada para questão', {
        //     questionId,
        //     userId,
        //     reviewId: programmedReview.id
        //   });
        // }
      } catch (programmedReviewError) {
        // Log do erro mas não falha o registro da resposta
        logger.error('Erro ao atualizar revisão programada para questão (continuando):', {
          error: programmedReviewError,
          questionId,
          userId
        });
      }

      await batch.commit();
    } catch (error) {
      logger.error('Erro ao registrar resposta na sessão de estudo:', {
        error,
        sessionId,
        userId,
        questionId,
        isCorrect,
      });
      if (error instanceof AppError) {
        throw error;
      }
      throw AppError.internal('Erro ao registrar resposta na sessão de estudo');
    }
  }
}

export const studySessionService = new StudySessionService();
