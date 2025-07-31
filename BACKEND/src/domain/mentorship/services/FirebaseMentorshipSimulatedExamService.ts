import { Firestore, Timestamp } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';
import {
  CreateMentorshipSimulatedExamPayload,
  MentorshipSimulatedExam,
  UpdateMentorshipSimulatedExamPayload,
} from '../types';
import { IMentorshipSimulatedExamService } from '../interfaces/IMentorshipSimulatedExamService';
import { IMentorshipService } from '../interfaces';
import { mentorshipLogger } from '../utils/loggerAdapter';
import AppError from '../../../utils/AppError';

const COLLECTION_NAME = 'mentorship_simulated_exams';

/**
 * Implementação do serviço de simulados de mentoria usando Firebase
 */
export class FirebaseMentorshipSimulatedExamService implements IMentorshipSimulatedExamService {
  private db: Firestore;
  private mentorshipService: IMentorshipService;

  constructor(db: Firestore, mentorshipService: IMentorshipService) {
    this.db = db;
    this.mentorshipService = mentorshipService;
  }

  /**
   * Atribui um simulado a uma mentoria
   * @param examData Dados do simulado
   */
  async assignSimulatedExam(
    examData: CreateMentorshipSimulatedExamPayload,
  ): Promise<MentorshipSimulatedExam> {
    try {
      const { mentorshipId, simulatedExamId, assignedByUserId } = examData;

      if (!mentorshipId || !simulatedExamId || !assignedByUserId) {
        throw new AppError(
          'ID da mentoria, ID do simulado e ID do usuário que atribuiu são obrigatórios',
          400,
        );
      }

      // Verificar se a mentoria existe e está ativa
      const mentorship = await this.mentorshipService.getMentorshipById(mentorshipId);
      if (!mentorship) {
        throw new AppError(`Mentoria com ID ${mentorshipId} não encontrada`, 404);
      }

      if (mentorship.status !== 'active') {
        throw new AppError('Só é possível atribuir simulados a mentorias ativas', 400);
      }

      // Verificar se o usuário que atribuiu é o mentor
      if (assignedByUserId !== mentorship.mentorId) {
        throw new AppError('Apenas o mentor pode atribuir simulados à mentoria', 400);
      }

      // Verificar se o simulado existe na coleção de simulados
      const simulatedExamDoc = await this.db
        .collection('simulated_exams')
        .doc(simulatedExamId)
        .get();
      if (!simulatedExamDoc.exists) {
        throw new AppError(`Simulado com ID ${simulatedExamId} não encontrado`, 404);
      }

      // Verificar se o simulado já foi atribuído a esta mentoria
      const existingSnapshot = await this.db
        .collection(COLLECTION_NAME)
        .where('mentorshipId', '==', mentorshipId)
        .where('simulatedExamId', '==', simulatedExamId)
        .limit(1)
        .get();

      if (!existingSnapshot.empty) {
        throw new AppError('Este simulado já foi atribuído a esta mentoria', 409);
      }

      const id = uuidv4();
      const now = Timestamp.now();

      // Converter dueDate para Timestamp se for Date
      let dueDateTimestamp: Timestamp | null = null;
      if (examData.dueDate) {
        dueDateTimestamp =
          examData.dueDate instanceof Date
            ? Timestamp.fromDate(examData.dueDate)
            : examData.dueDate;
      }

      const newSimulatedExam: MentorshipSimulatedExam = {
        id,
        mentorshipId,
        simulatedExamId,
        assignedByUserId,
        assignedDate: now,
        dueDate: dueDateTimestamp,
        completedDate: null,
        score: null,
        createdAt: now,
        updatedAt: now,
      };

      await this.db.collection(COLLECTION_NAME).doc(id).set(newSimulatedExam);

      mentorshipLogger.info(`Simulado atribuído com sucesso: ${id}`, {
        mentorshipId,
        simulatedExamId,
      });

      return newSimulatedExam;
    } catch (error) {
      mentorshipLogger.error('Erro ao atribuir simulado:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao atribuir simulado', 500);
    }
  }

  /**
   * Obtém um simulado pelo ID
   * @param id ID do simulado
   */
  async getSimulatedExamById(id: string): Promise<MentorshipSimulatedExam | null> {
    try {
      if (!id) {
        throw new AppError('ID do simulado é obrigatório', 400);
      }

      const docRef = this.db.collection(COLLECTION_NAME).doc(id);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        return null;
      }

      return docSnap.data() as MentorshipSimulatedExam;
    } catch (error) {
      mentorshipLogger.error('Erro ao buscar simulado:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao buscar simulado', 500);
    }
  }

  /**
   * Atualiza um simulado existente
   * @param id ID do simulado
   * @param updateData Dados para atualização
   */
  async updateSimulatedExam(
    id: string,
    updateData: UpdateMentorshipSimulatedExamPayload,
  ): Promise<MentorshipSimulatedExam | null> {
    try {
      if (!id) {
        throw new AppError('ID do simulado é obrigatório', 400);
      }

      const docRef = this.db.collection(COLLECTION_NAME).doc(id);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        mentorshipLogger.warn(`Simulado com ID ${id} não encontrado`);
        return null;
      }

      const simulatedExam = docSnap.data() as MentorshipSimulatedExam;

      // Verificar se o simulado já foi concluído
      if (simulatedExam.completedDate && !updateData.score) {
        throw new AppError(
          'Simulados concluídos só podem ser atualizados para alterar a pontuação',
          400,
        );
      }

      // Converter dueDate para Timestamp se for Date
      const updates: any = { ...updateData };
      if (updateData.dueDate instanceof Date) {
        updates.dueDate = Timestamp.fromDate(updateData.dueDate);
      }

      // Converter completedDate para Timestamp se for Date
      if (updateData.completedDate instanceof Date) {
        updates.completedDate = Timestamp.fromDate(updateData.completedDate);
      }

      const now = Timestamp.now();
      updates.updatedAt = now;

      await docRef.update(updates);

      mentorshipLogger.info(`Simulado atualizado com sucesso: ${id}`);

      // Retornar o simulado atualizado
      const updatedDocSnap = await docRef.get();
      return updatedDocSnap.data() as MentorshipSimulatedExam;
    } catch (error) {
      mentorshipLogger.error('Erro ao atualizar simulado:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao atualizar simulado', 500);
    }
  }

  /**
   * Remove a atribuição de um simulado
   * @param id ID do simulado
   */
  async removeSimulatedExam(id: string): Promise<boolean> {
    try {
      if (!id) {
        throw new AppError('ID do simulado é obrigatório', 400);
      }

      const docRef = this.db.collection(COLLECTION_NAME).doc(id);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        mentorshipLogger.warn(`Simulado com ID ${id} não encontrado`);
        return false;
      }

      const simulatedExam = docSnap.data() as MentorshipSimulatedExam;

      // Verificar se o simulado já foi concluído
      if (simulatedExam.completedDate) {
        throw new AppError('Simulados concluídos não podem ser removidos', 400);
      }

      await docRef.delete();

      mentorshipLogger.info(`Simulado removido com sucesso: ${id}`);

      return true;
    } catch (error) {
      mentorshipLogger.error('Erro ao remover simulado:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao remover simulado', 500);
    }
  }

  /**
   * Lista simulados de uma mentoria
   * @param mentorshipId ID da mentoria
   */
  async getSimulatedExamsByMentorship(mentorshipId: string): Promise<MentorshipSimulatedExam[]> {
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
        .orderBy('assignedDate', 'desc')
        .get();

      return snapshot.docs.map(doc => doc.data() as MentorshipSimulatedExam);
    } catch (error) {
      mentorshipLogger.error('Erro ao listar simulados por mentoria:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao listar simulados por mentoria', 500);
    }
  }

  /**
   * Lista simulados atribuídos por um usuário
   * @param userId ID do usuário
   */
  async getSimulatedExamsAssignedByUser(userId: string): Promise<MentorshipSimulatedExam[]> {
    try {
      if (!userId) {
        throw new AppError('ID do usuário é obrigatório', 400);
      }

      const snapshot = await this.db
        .collection(COLLECTION_NAME)
        .where('assignedByUserId', '==', userId)
        .orderBy('assignedDate', 'desc')
        .get();

      return snapshot.docs.map(doc => doc.data() as MentorshipSimulatedExam);
    } catch (error) {
      mentorshipLogger.error('Erro ao listar simulados atribuídos por usuário:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao listar simulados atribuídos por usuário', 500);
    }
  }

  /**
   * Lista simulados pendentes de uma mentoria
   * @param mentorshipId ID da mentoria
   */
  async getPendingSimulatedExams(mentorshipId: string): Promise<MentorshipSimulatedExam[]> {
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
        .where('completedDate', '==', null)
        .orderBy('assignedDate', 'desc')
        .get();

      return snapshot.docs.map(doc => doc.data() as MentorshipSimulatedExam);
    } catch (error) {
      mentorshipLogger.error('Erro ao listar simulados pendentes:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao listar simulados pendentes', 500);
    }
  }

  /**
   * Marca um simulado como concluído
   * @param id ID do simulado
   * @param score Pontuação (0-100)
   */
  async completeSimulatedExam(id: string, score: number): Promise<MentorshipSimulatedExam | null> {
    try {
      if (!id) {
        throw new AppError('ID do simulado é obrigatório', 400);
      }

      if (score < 0 || score > 100) {
        throw new AppError('Pontuação deve estar entre 0 e 100', 400);
      }

      const docRef = this.db.collection(COLLECTION_NAME).doc(id);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        mentorshipLogger.warn(`Simulado com ID ${id} não encontrado`);
        return null;
      }

      const simulatedExam = docSnap.data() as MentorshipSimulatedExam;

      // Verificar se o simulado já foi concluído
      if (simulatedExam.completedDate) {
        throw new AppError('Simulado já foi concluído', 400);
      }

      const now = Timestamp.now();
      const updates = {
        completedDate: now,
        score,
        updatedAt: now,
      };

      await docRef.update(updates);

      mentorshipLogger.info(`Simulado marcado como concluído com sucesso: ${id} (Score: ${score})`);

      // Retornar o simulado atualizado
      const updatedDocSnap = await docRef.get();
      return updatedDocSnap.data() as MentorshipSimulatedExam;
    } catch (error) {
      mentorshipLogger.error('Erro ao concluir simulado:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao concluir simulado', 500);
    }
  }
}
