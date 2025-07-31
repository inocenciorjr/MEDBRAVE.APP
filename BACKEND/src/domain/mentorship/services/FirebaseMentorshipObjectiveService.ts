import { Firestore, Timestamp } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';
import {
  CreateMentorshipObjectivePayload,
  MentorshipObjective,
  ObjectiveStatus,
  UpdateMentorshipObjectivePayload,
} from '../types';
import { IMentorshipObjectiveService } from '../interfaces/IMentorshipObjectiveService';
import { IMentorshipService } from '../interfaces/IMentorshipService';
import { mentorshipLogger } from '../utils/loggerAdapter';
import AppError from '../../../utils/AppError';

const COLLECTION_NAME = 'mentorship_objectives';

/**
 * Implementação do serviço de objetivos de mentoria usando Firebase
 */
export class FirebaseMentorshipObjectiveService implements IMentorshipObjectiveService {
  private db: Firestore;
  private mentorshipService: IMentorshipService;

  constructor(db: Firestore, mentorshipService: IMentorshipService) {
    this.db = db;
    this.mentorshipService = mentorshipService;
  }

  /**
   * Cria um novo objetivo de mentoria
   * @param objectiveData Dados do objetivo
   */
  async createObjective(
    objectiveData: CreateMentorshipObjectivePayload,
  ): Promise<MentorshipObjective> {
    try {
      const { mentorshipId, title } = objectiveData;

      if (!mentorshipId || !title) {
        throw new AppError('ID da mentoria e título são obrigatórios', 400);
      }

      // Verificar se a mentoria existe
      const mentorship = await this.mentorshipService.getMentorshipById(mentorshipId);
      if (!mentorship) {
        throw new AppError(`Mentoria com ID ${mentorshipId} não encontrada`, 404);
      }

      // Validar progresso
      const progress = objectiveData.progress !== undefined ? objectiveData.progress : 0;
      if (progress < 0 || progress > 100) {
        throw new AppError('Progresso deve estar entre 0 e 100', 400);
      }

      // Converter targetDate para Timestamp se for Date
      let targetDate: Timestamp | null = null;
      if (objectiveData.targetDate) {
        targetDate =
          objectiveData.targetDate instanceof Date
            ? Timestamp.fromDate(objectiveData.targetDate)
            : objectiveData.targetDate;
      }

      const id = uuidv4();
      const now = Timestamp.now();

      const newObjective: MentorshipObjective = {
        id,
        mentorshipId,
        title,
        description: objectiveData.description || null,
        status: objectiveData.status || ObjectiveStatus.PENDING,
        targetDate,
        completedDate: null,
        progress,
        createdAt: now,
        updatedAt: now,
      };

      await this.db.collection(COLLECTION_NAME).doc(id).set(newObjective);

      // Atualizar a lista de objetivos na mentoria
      const mentorshipObjectives = mentorship.objectives || [];
      await this.mentorshipService.updateObjectives(mentorshipId, [...mentorshipObjectives, title]);

      mentorshipLogger.info(`Objetivo de mentoria criado com sucesso: ${id}`, {
        mentorshipId,
        title,
      });

      return newObjective;
    } catch (error) {
      mentorshipLogger.error('Erro ao criar objetivo de mentoria:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao criar objetivo de mentoria', 500);
    }
  }

  /**
   * Obtém um objetivo pelo ID
   * @param id ID do objetivo
   */
  async getObjectiveById(id: string): Promise<MentorshipObjective | null> {
    try {
      if (!id) {
        throw new AppError('ID do objetivo é obrigatório', 400);
      }

      const docRef = this.db.collection(COLLECTION_NAME).doc(id);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        return null;
      }

      return docSnap.data() as MentorshipObjective;
    } catch (error) {
      mentorshipLogger.error('Erro ao buscar objetivo de mentoria:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao buscar objetivo de mentoria', 500);
    }
  }

  /**
   * Atualiza um objetivo existente
   * @param id ID do objetivo
   * @param updateData Dados para atualização
   */
  async updateObjective(
    id: string,
    updateData: UpdateMentorshipObjectivePayload,
  ): Promise<MentorshipObjective | null> {
    try {
      if (!id) {
        throw new AppError('ID do objetivo é obrigatório', 400);
      }

      const docRef = this.db.collection(COLLECTION_NAME).doc(id);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        mentorshipLogger.warn(`Objetivo com ID ${id} não encontrado`);
        return null;
      }

      const objective = docSnap.data() as MentorshipObjective;

      // Validar progresso
      if (
        updateData.progress !== undefined &&
        (updateData.progress < 0 || updateData.progress > 100)
      ) {
        throw new AppError('Progresso deve estar entre 0 e 100', 400);
      }

      // Converter targetDate para Timestamp se for Date
      const updates: any = { ...updateData };

      if (updateData.targetDate instanceof Date) {
        updates.targetDate = Timestamp.fromDate(updateData.targetDate);
      }

      // Converter completedDate para Timestamp se for Date
      if (updateData.completedDate instanceof Date) {
        updates.completedDate = Timestamp.fromDate(updateData.completedDate);
      }

      const now = Timestamp.now();
      updates.updatedAt = now;

      await docRef.update(updates);

      mentorshipLogger.info(`Objetivo atualizado com sucesso: ${id}`);

      // Se o título do objetivo foi alterado, atualizar na lista de objetivos da mentoria
      if (updateData.title && updateData.title !== objective.title) {
        const mentorship = await this.mentorshipService.getMentorshipById(objective.mentorshipId);
        if (mentorship && mentorship.objectives) {
          const updatedObjectives = mentorship.objectives.map(obj =>
            obj === objective.title ? (updateData.title as string) : obj,
          );
          await this.mentorshipService.updateObjectives(objective.mentorshipId, updatedObjectives);
        }
      }

      // Retornar o objetivo atualizado
      const updatedDocSnap = await docRef.get();
      return updatedDocSnap.data() as MentorshipObjective;
    } catch (error) {
      mentorshipLogger.error('Erro ao atualizar objetivo de mentoria:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao atualizar objetivo de mentoria', 500);
    }
  }

  /**
   * Exclui um objetivo
   * @param id ID do objetivo
   */
  async deleteObjective(id: string): Promise<boolean> {
    try {
      if (!id) {
        throw new AppError('ID do objetivo é obrigatório', 400);
      }

      const docRef = this.db.collection(COLLECTION_NAME).doc(id);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        mentorshipLogger.warn(`Objetivo com ID ${id} não encontrado`);
        return false;
      }

      const objective = docSnap.data() as MentorshipObjective;

      await docRef.delete();

      // Remover o objetivo da lista de objetivos da mentoria
      const mentorship = await this.mentorshipService.getMentorshipById(objective.mentorshipId);
      if (mentorship && mentorship.objectives) {
        const updatedObjectives = mentorship.objectives.filter(obj => obj !== objective.title);
        await this.mentorshipService.updateObjectives(objective.mentorshipId, updatedObjectives);
      }

      mentorshipLogger.info(`Objetivo excluído com sucesso: ${id}`);

      return true;
    } catch (error) {
      mentorshipLogger.error('Erro ao excluir objetivo de mentoria:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao excluir objetivo de mentoria', 500);
    }
  }

  /**
   * Lista objetivos de uma mentoria
   * @param mentorshipId ID da mentoria
   */
  async getObjectivesByMentorship(mentorshipId: string): Promise<MentorshipObjective[]> {
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

      return snapshot.docs.map(doc => doc.data() as MentorshipObjective);
    } catch (error) {
      mentorshipLogger.error('Erro ao listar objetivos por mentoria:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao listar objetivos por mentoria', 500);
    }
  }

  /**
   * Lista objetivos de uma mentoria com status específico
   * @param mentorshipId ID da mentoria
   * @param status Status a ser filtrado
   */
  async getObjectivesByStatus(
    mentorshipId: string,
    status: ObjectiveStatus,
  ): Promise<MentorshipObjective[]> {
    try {
      if (!mentorshipId) {
        throw new AppError('ID da mentoria é obrigatório', 400);
      }

      if (!Object.values(ObjectiveStatus).includes(status)) {
        throw new AppError('Status inválido', 400);
      }

      // Verificar se a mentoria existe
      const mentorship = await this.mentorshipService.getMentorshipById(mentorshipId);
      if (!mentorship) {
        throw new AppError(`Mentoria com ID ${mentorshipId} não encontrada`, 404);
      }

      const snapshot = await this.db
        .collection(COLLECTION_NAME)
        .where('mentorshipId', '==', mentorshipId)
        .where('status', '==', status)
        .orderBy('createdAt', 'desc')
        .get();

      return snapshot.docs.map(doc => doc.data() as MentorshipObjective);
    } catch (error) {
      mentorshipLogger.error('Erro ao listar objetivos por status:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao listar objetivos por status', 500);
    }
  }

  /**
   * Atualiza o progresso de um objetivo
   * @param id ID do objetivo
   * @param progress Novo progresso (0-100)
   */
  async updateProgress(id: string, progress: number): Promise<MentorshipObjective | null> {
    try {
      if (!id) {
        throw new AppError('ID do objetivo é obrigatório', 400);
      }

      if (progress < 0 || progress > 100) {
        throw new AppError('Progresso deve estar entre 0 e 100', 400);
      }

      const docRef = this.db.collection(COLLECTION_NAME).doc(id);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        mentorshipLogger.warn(`Objetivo com ID ${id} não encontrado`);
        return null;
      }

      const objective = docSnap.data() as MentorshipObjective;

      const now = Timestamp.now();
      const updates: any = {
        progress,
        updatedAt: now,
      };

      // Se o progresso atingiu 100%, atualizar o status para completado
      if (progress === 100 && objective.status !== ObjectiveStatus.COMPLETED) {
        updates.status = ObjectiveStatus.COMPLETED;
        updates.completedDate = now;
      }
      // Se o progresso é maior que 0 e menor que 100, e o status não é em progresso, atualizar para em progresso
      else if (progress > 0 && progress < 100 && objective.status !== ObjectiveStatus.IN_PROGRESS) {
        updates.status = ObjectiveStatus.IN_PROGRESS;
      }
      // Se o progresso é 0 e o status é em progresso, atualizar para pendente
      else if (progress === 0 && objective.status === ObjectiveStatus.IN_PROGRESS) {
        updates.status = ObjectiveStatus.PENDING;
      }

      await docRef.update(updates);

      mentorshipLogger.info(`Progresso do objetivo atualizado com sucesso: ${id}`, { progress });

      // Retornar o objetivo atualizado
      const updatedDocSnap = await docRef.get();
      return updatedDocSnap.data() as MentorshipObjective;
    } catch (error) {
      mentorshipLogger.error('Erro ao atualizar progresso do objetivo:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao atualizar progresso do objetivo', 500);
    }
  }

  /**
   * Marca um objetivo como completado
   * @param id ID do objetivo
   */
  async completeObjective(id: string): Promise<MentorshipObjective | null> {
    try {
      if (!id) {
        throw new AppError('ID do objetivo é obrigatório', 400);
      }

      const docRef = this.db.collection(COLLECTION_NAME).doc(id);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        mentorshipLogger.warn(`Objetivo com ID ${id} não encontrado`);
        return null;
      }

      const objective = docSnap.data() as MentorshipObjective;

      if (objective.status === ObjectiveStatus.COMPLETED) {
        return objective; // Já está completado
      }

      if (objective.status === ObjectiveStatus.CANCELLED) {
        throw new AppError('Objetivos cancelados não podem ser completados', 400);
      }

      const now = Timestamp.now();
      await docRef.update({
        status: ObjectiveStatus.COMPLETED,
        progress: 100,
        completedDate: now,
        updatedAt: now,
      });

      mentorshipLogger.info(`Objetivo marcado como completado com sucesso: ${id}`);

      // Retornar o objetivo atualizado
      const updatedDocSnap = await docRef.get();
      return updatedDocSnap.data() as MentorshipObjective;
    } catch (error) {
      mentorshipLogger.error('Erro ao completar objetivo:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao completar objetivo', 500);
    }
  }

  /**
   * Marca um objetivo como em progresso
   * @param id ID do objetivo
   */
  async startObjective(id: string): Promise<MentorshipObjective | null> {
    try {
      if (!id) {
        throw new AppError('ID do objetivo é obrigatório', 400);
      }

      const docRef = this.db.collection(COLLECTION_NAME).doc(id);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        mentorshipLogger.warn(`Objetivo com ID ${id} não encontrado`);
        return null;
      }

      const objective = docSnap.data() as MentorshipObjective;

      if (objective.status === ObjectiveStatus.IN_PROGRESS) {
        return objective; // Já está em progresso
      }

      if (
        objective.status === ObjectiveStatus.COMPLETED ||
        objective.status === ObjectiveStatus.CANCELLED
      ) {
        throw new AppError('Objetivos completados ou cancelados não podem ser iniciados', 400);
      }

      // Definir um progresso inicial se ainda estiver em 0
      const progress = objective.progress === 0 ? 10 : objective.progress;

      const now = Timestamp.now();
      await docRef.update({
        status: ObjectiveStatus.IN_PROGRESS,
        progress,
        updatedAt: now,
      });

      mentorshipLogger.info(`Objetivo marcado como em progresso com sucesso: ${id}`);

      // Retornar o objetivo atualizado
      const updatedDocSnap = await docRef.get();
      return updatedDocSnap.data() as MentorshipObjective;
    } catch (error) {
      mentorshipLogger.error('Erro ao iniciar objetivo:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao iniciar objetivo', 500);
    }
  }

  /**
   * Cancela um objetivo
   * @param id ID do objetivo
   */
  async cancelObjective(id: string): Promise<MentorshipObjective | null> {
    try {
      if (!id) {
        throw new AppError('ID do objetivo é obrigatório', 400);
      }

      const docRef = this.db.collection(COLLECTION_NAME).doc(id);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        mentorshipLogger.warn(`Objetivo com ID ${id} não encontrado`);
        return null;
      }

      const objective = docSnap.data() as MentorshipObjective;

      if (objective.status === ObjectiveStatus.CANCELLED) {
        return objective; // Já está cancelado
      }

      if (objective.status === ObjectiveStatus.COMPLETED) {
        throw new AppError('Objetivos completados não podem ser cancelados', 400);
      }

      const now = Timestamp.now();
      await docRef.update({
        status: ObjectiveStatus.CANCELLED,
        updatedAt: now,
      });

      mentorshipLogger.info(`Objetivo cancelado com sucesso: ${id}`);

      // Retornar o objetivo atualizado
      const updatedDocSnap = await docRef.get();
      return updatedDocSnap.data() as MentorshipObjective;
    } catch (error) {
      mentorshipLogger.error('Erro ao cancelar objetivo:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao cancelar objetivo', 500);
    }
  }
}
