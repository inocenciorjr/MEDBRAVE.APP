import { Firestore, Timestamp } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';
import {
  CreateMentorshipFeedbackPayload,
  MentorshipFeedback,
  UpdateMentorshipFeedbackPayload,
} from '../types';
import { IMentorshipFeedbackService } from '../interfaces/IMentorshipFeedbackService';
import { IMentorshipService } from '../interfaces/IMentorshipService';
import { mentorshipLogger } from '../utils/loggerAdapter';
import AppError from '../../../utils/AppError';

const COLLECTION_NAME = 'mentorship_feedbacks';

/**
 * Implementação do serviço de feedbacks de mentoria usando Firebase
 */
export class FirebaseMentorshipFeedbackService implements IMentorshipFeedbackService {
  private db: Firestore;
  private mentorshipService: IMentorshipService;

  constructor(db: Firestore, mentorshipService: IMentorshipService) {
    this.db = db;
    this.mentorshipService = mentorshipService;
  }

  /**
   * Cria um novo feedback de mentoria
   * @param feedbackData Dados do feedback
   */
  async createFeedback(feedbackData: CreateMentorshipFeedbackPayload): Promise<MentorshipFeedback> {
    try {
      const { mentorshipId, fromUserId, toUserId, content } = feedbackData;

      if (!mentorshipId || !fromUserId || !toUserId || !content) {
        throw new AppError(
          'ID da mentoria, ID do usuário de origem, ID do usuário de destino e conteúdo são obrigatórios',
          400,
        );
      }

      // Verificar se a mentoria existe
      const mentorship = await this.mentorshipService.getMentorshipById(mentorshipId);
      if (!mentorship) {
        throw new AppError(`Mentoria com ID ${mentorshipId} não encontrada`, 404);
      }

      // Verificar se os usuários são parte da mentoria
      if (fromUserId !== mentorship.mentorId && fromUserId !== mentorship.menteeId) {
        throw new AppError('O usuário de origem deve ser mentor ou mentorado da mentoria', 400);
      }

      if (toUserId !== mentorship.mentorId && toUserId !== mentorship.menteeId) {
        throw new AppError('O usuário de destino deve ser mentor ou mentorado da mentoria', 400);
      }

      if (fromUserId === toUserId) {
        throw new AppError('Usuário de origem e destino não podem ser o mesmo', 400);
      }

      // Validar rating se fornecido
      if (feedbackData.rating !== undefined && feedbackData.rating !== null) {
        if (feedbackData.rating < 1 || feedbackData.rating > 5) {
          throw new AppError('Avaliação deve estar entre 1 e 5', 400);
        }
      }

      const id = uuidv4();
      const now = Timestamp.now();

      const newFeedback: MentorshipFeedback = {
        id,
        mentorshipId,
        fromUserId,
        toUserId,
        content,
        rating: feedbackData.rating !== undefined ? feedbackData.rating : null,
        meetingId: feedbackData.meetingId || null,
        isAnonymous: feedbackData.isAnonymous || false,
        createdAt: now,
        updatedAt: now,
      };

      await this.db.collection(COLLECTION_NAME).doc(id).set(newFeedback);

      // Se for um feedback para o mentor com rating, atualizar a classificação média do mentor
      if (
        toUserId === mentorship.mentorId &&
        feedbackData.rating !== undefined &&
        feedbackData.rating !== null
      ) {
        await this.updateMentorRating(toUserId);
      }

      mentorshipLogger.info(`Feedback de mentoria criado com sucesso: ${id}`, {
        mentorshipId,
        fromUserId,
        toUserId,
      });

      return newFeedback;
    } catch (error) {
      mentorshipLogger.error('Erro ao criar feedback de mentoria:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao criar feedback de mentoria', 500);
    }
  }

  /**
   * Obtém um feedback pelo ID
   * @param id ID do feedback
   */
  async getFeedbackById(id: string): Promise<MentorshipFeedback | null> {
    try {
      if (!id) {
        throw new AppError('ID do feedback é obrigatório', 400);
      }

      const docRef = this.db.collection(COLLECTION_NAME).doc(id);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        return null;
      }

      return docSnap.data() as MentorshipFeedback;
    } catch (error) {
      mentorshipLogger.error('Erro ao buscar feedback de mentoria:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao buscar feedback de mentoria', 500);
    }
  }

  /**
   * Atualiza um feedback existente
   * @param id ID do feedback
   * @param updateData Dados para atualização
   */
  async updateFeedback(
    id: string,
    updateData: UpdateMentorshipFeedbackPayload,
  ): Promise<MentorshipFeedback | null> {
    try {
      if (!id) {
        throw new AppError('ID do feedback é obrigatório', 400);
      }

      const docRef = this.db.collection(COLLECTION_NAME).doc(id);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        mentorshipLogger.warn(`Feedback com ID ${id} não encontrado`);
        return null;
      }

      const feedback = docSnap.data() as MentorshipFeedback;

      // Validar rating se fornecido
      if (updateData.rating !== undefined && updateData.rating !== null) {
        if (updateData.rating < 1 || updateData.rating > 5) {
          throw new AppError('Avaliação deve estar entre 1 e 5', 400);
        }
      }

      const now = Timestamp.now();
      const updates = {
        ...updateData,
        updatedAt: now,
      };

      await docRef.update(updates);

      // Se o rating foi alterado e o feedback é para o mentor, atualizar a classificação média do mentor
      if (updateData.rating !== undefined && feedback.toUserId) {
        // Obter a mentoria para verificar se o usuário de destino é o mentor
        const mentorship = await this.mentorshipService.getMentorshipById(feedback.mentorshipId);
        if (mentorship && feedback.toUserId === mentorship.mentorId) {
          await this.updateMentorRating(feedback.toUserId);
        }
      }

      mentorshipLogger.info(`Feedback atualizado com sucesso: ${id}`);

      // Retornar o feedback atualizado
      const updatedDocSnap = await docRef.get();
      return updatedDocSnap.data() as MentorshipFeedback;
    } catch (error) {
      mentorshipLogger.error('Erro ao atualizar feedback de mentoria:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao atualizar feedback de mentoria', 500);
    }
  }

  /**
   * Exclui um feedback
   * @param id ID do feedback
   */
  async deleteFeedback(id: string): Promise<boolean> {
    try {
      if (!id) {
        throw new AppError('ID do feedback é obrigatório', 400);
      }

      const docRef = this.db.collection(COLLECTION_NAME).doc(id);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        mentorshipLogger.warn(`Feedback com ID ${id} não encontrado`);
        return false;
      }

      const feedback = docSnap.data() as MentorshipFeedback;

      await docRef.delete();

      // Se o feedback excluído tinha rating e era para o mentor, atualizar a classificação média do mentor
      if (feedback.rating !== null && feedback.toUserId) {
        // Obter a mentoria para verificar se o usuário de destino é o mentor
        const mentorship = await this.mentorshipService.getMentorshipById(feedback.mentorshipId);
        if (mentorship && feedback.toUserId === mentorship.mentorId) {
          await this.updateMentorRating(feedback.toUserId);
        }
      }

      mentorshipLogger.info(`Feedback excluído com sucesso: ${id}`);

      return true;
    } catch (error) {
      mentorshipLogger.error('Erro ao excluir feedback de mentoria:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao excluir feedback de mentoria', 500);
    }
  }

  /**
   * Lista feedbacks de uma mentoria
   * @param mentorshipId ID da mentoria
   */
  async getFeedbacksByMentorship(mentorshipId: string): Promise<MentorshipFeedback[]> {
    try {
      if (!mentorshipId) {
        throw new AppError('ID da mentoria é obrigatório', 400);
      }

      // Verificar se a mentoria existe
      const mentorship = await this.mentorshipService.getMentorshipById(mentorshipId);
      if (!mentorship) {
        throw new AppError(`Mentoria com ID ${mentorshipId} não encontrada`, 404);
      }

      const snapshot = await this.db
        .collection(COLLECTION_NAME)
        .where('mentorshipId', '==', mentorshipId)
        .orderBy('createdAt', 'desc')
        .get();

      return snapshot.docs.map(doc => doc.data() as MentorshipFeedback);
    } catch (error) {
      mentorshipLogger.error('Erro ao listar feedbacks por mentoria:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao listar feedbacks por mentoria', 500);
    }
  }

  /**
   * Lista feedbacks de uma reunião
   * @param meetingId ID da reunião
   */
  async getFeedbacksByMeeting(meetingId: string): Promise<MentorshipFeedback[]> {
    try {
      if (!meetingId) {
        throw new AppError('ID da reunião é obrigatório', 400);
      }

      const snapshot = await this.db
        .collection(COLLECTION_NAME)
        .where('meetingId', '==', meetingId)
        .orderBy('createdAt', 'desc')
        .get();

      return snapshot.docs.map(doc => doc.data() as MentorshipFeedback);
    } catch (error) {
      mentorshipLogger.error('Erro ao listar feedbacks por reunião:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao listar feedbacks por reunião', 500);
    }
  }

  /**
   * Lista feedbacks dados por um usuário
   * @param userId ID do usuário
   */
  async getFeedbacksGivenByUser(userId: string): Promise<MentorshipFeedback[]> {
    try {
      if (!userId) {
        throw new AppError('ID do usuário é obrigatório', 400);
      }

      const snapshot = await this.db
        .collection(COLLECTION_NAME)
        .where('fromUserId', '==', userId)
        .orderBy('createdAt', 'desc')
        .get();

      return snapshot.docs.map(doc => doc.data() as MentorshipFeedback);
    } catch (error) {
      mentorshipLogger.error('Erro ao listar feedbacks dados por usuário:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao listar feedbacks dados por usuário', 500);
    }
  }

  /**
   * Lista feedbacks recebidos por um usuário
   * @param userId ID do usuário
   */
  async getFeedbacksReceivedByUser(userId: string): Promise<MentorshipFeedback[]> {
    try {
      if (!userId) {
        throw new AppError('ID do usuário é obrigatório', 400);
      }

      const snapshot = await this.db
        .collection(COLLECTION_NAME)
        .where('toUserId', '==', userId)
        .orderBy('createdAt', 'desc')
        .get();

      return snapshot.docs.map(doc => doc.data() as MentorshipFeedback);
    } catch (error) {
      mentorshipLogger.error('Erro ao listar feedbacks recebidos por usuário:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao listar feedbacks recebidos por usuário', 500);
    }
  }

  /**
   * Obtém a avaliação média recebida por um usuário
   * @param userId ID do usuário
   */
  async getAverageRatingForUser(userId: string): Promise<number | null> {
    try {
      if (!userId) {
        throw new AppError('ID do usuário é obrigatório', 400);
      }

      const snapshot = await this.db
        .collection(COLLECTION_NAME)
        .where('toUserId', '==', userId)
        .where('rating', '!=', null)
        .get();

      const feedbacks = snapshot.docs.map(doc => doc.data() as MentorshipFeedback);

      if (feedbacks.length === 0) {
        return null;
      }

      // Filtrar apenas feedbacks com rating e calcular a média
      const feedbacksWithRating = feedbacks.filter(feedback => feedback.rating !== null);

      if (feedbacksWithRating.length === 0) {
        return null;
      }

      const sum = feedbacksWithRating.reduce((total, feedback) => {
        return total + (feedback.rating || 0);
      }, 0);

      return Math.round((sum / feedbacksWithRating.length) * 10) / 10; // Arredonda para 1 casa decimal
    } catch (error) {
      mentorshipLogger.error('Erro ao calcular avaliação média do usuário:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao calcular avaliação média do usuário', 500);
    }
  }

  /**
   * Atualiza a avaliação média do mentor
   * @param mentorId ID do mentor
   */
  private async updateMentorRating(mentorId: string): Promise<void> {
    try {
      // Calcular a avaliação média do mentor
      const averageRating = await this.getAverageRatingForUser(mentorId);

      if (averageRating === null) {
        return;
      }

      // Buscar o perfil do mentor
      const mentorProfileRef = this.db.collection('mentor_profiles').doc(mentorId);
      const mentorProfileSnap = await mentorProfileRef.get();

      if (!mentorProfileSnap.exists) {
        mentorshipLogger.warn(`Perfil do mentor com ID ${mentorId} não encontrado`);
        return;
      }

      // Atualizar a avaliação média no perfil do mentor
      await mentorProfileRef.update({
        rating: averageRating,
        updatedAt: Timestamp.now(),
      });

      mentorshipLogger.info(
        `Avaliação média do mentor atualizada com sucesso: ${mentorId} (${averageRating})`,
      );
    } catch (error) {
      mentorshipLogger.error('Erro ao atualizar avaliação média do mentor:', error);
      // Não lançar erro para não afetar a operação principal
    }
  }
}
