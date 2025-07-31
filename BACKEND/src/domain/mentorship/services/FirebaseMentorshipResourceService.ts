import { Firestore, Timestamp } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';
import {
  CreateMentorshipResourcePayload,
  MentorshipResource,
  ResourceType,
  UpdateMentorshipResourcePayload,
} from '../types';
import { IMentorshipService } from '../interfaces';
import { IMentorshipResourceService } from '../interfaces/IMentorshipResourceService';
import { mentorshipLogger } from '../utils/loggerAdapter';
import AppError from '../../../utils/AppError';

const COLLECTION_NAME = 'mentorship_resources';

/**
 * Implementação do serviço de recursos de mentoria usando Firebase
 */
export class FirebaseMentorshipResourceService implements IMentorshipResourceService {
  private db: Firestore;
  private mentorshipService: IMentorshipService;

  constructor(db: Firestore, mentorshipService: IMentorshipService) {
    this.db = db;
    this.mentorshipService = mentorshipService;
  }

  /**
   * Cria um novo recurso de mentoria
   * @param resourceData Dados do recurso
   */
  async createResource(resourceData: CreateMentorshipResourcePayload): Promise<MentorshipResource> {
    try {
      const { mentorshipId, addedByUserId, title, type, url } = resourceData;

      if (!mentorshipId || !addedByUserId || !title || !type || !url) {
        throw new AppError(
          'ID da mentoria, ID do usuário, título, tipo e URL são obrigatórios',
          400,
        );
      }

      // Verificar se a mentoria existe e está ativa
      const mentorship = await this.mentorshipService.getMentorshipById(mentorshipId);
      if (!mentorship) {
        throw new AppError(`Mentoria com ID ${mentorshipId} não encontrada`, 404);
      }

      if (mentorship.status !== 'active') {
        throw new AppError('Só é possível adicionar recursos a mentorias ativas', 400);
      }

      // Verificar se o usuário é parte da mentoria
      if (addedByUserId !== mentorship.mentorId && addedByUserId !== mentorship.menteeId) {
        throw new AppError(
          'Apenas o mentor ou o mentorado podem adicionar recursos à mentoria',
          400,
        );
      }

      // Validar o tipo do recurso
      if (!Object.values(ResourceType).includes(type)) {
        throw new AppError('Tipo de recurso inválido', 400);
      }

      const id = uuidv4();
      const now = Timestamp.now();

      const newResource: MentorshipResource = {
        id,
        mentorshipId,
        addedByUserId,
        title,
        type,
        url,
        description: resourceData.description || null,
        createdAt: now,
        updatedAt: now,
      };

      await this.db.collection(COLLECTION_NAME).doc(id).set(newResource);

      mentorshipLogger.info(`Recurso de mentoria criado com sucesso: ${id}`, {
        mentorshipId,
        type,
        title,
      });

      return newResource;
    } catch (error) {
      mentorshipLogger.error('Erro ao criar recurso de mentoria:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao criar recurso de mentoria', 500);
    }
  }

  /**
   * Obtém um recurso pelo ID
   * @param id ID do recurso
   */
  async getResourceById(id: string): Promise<MentorshipResource | null> {
    try {
      if (!id) {
        throw new AppError('ID do recurso é obrigatório', 400);
      }

      const docRef = this.db.collection(COLLECTION_NAME).doc(id);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        return null;
      }

      return docSnap.data() as MentorshipResource;
    } catch (error) {
      mentorshipLogger.error('Erro ao buscar recurso de mentoria:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao buscar recurso de mentoria', 500);
    }
  }

  /**
   * Atualiza um recurso existente
   * @param id ID do recurso
   * @param updateData Dados para atualização
   */
  async updateResource(
    id: string,
    updateData: UpdateMentorshipResourcePayload,
  ): Promise<MentorshipResource | null> {
    try {
      if (!id) {
        throw new AppError('ID do recurso é obrigatório', 400);
      }

      const docRef = this.db.collection(COLLECTION_NAME).doc(id);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        mentorshipLogger.warn(`Recurso com ID ${id} não encontrado`);
        return null;
      }

      // Validar o tipo do recurso se fornecido
      if (updateData.type && !Object.values(ResourceType).includes(updateData.type)) {
        throw new AppError('Tipo de recurso inválido', 400);
      }

      const now = Timestamp.now();
      const updates = {
        ...updateData,
        updatedAt: now,
      };

      await docRef.update(updates);

      mentorshipLogger.info(`Recurso atualizado com sucesso: ${id}`);

      // Retornar o recurso atualizado
      const updatedDocSnap = await docRef.get();
      return updatedDocSnap.data() as MentorshipResource;
    } catch (error) {
      mentorshipLogger.error('Erro ao atualizar recurso de mentoria:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao atualizar recurso de mentoria', 500);
    }
  }

  /**
   * Exclui um recurso
   * @param id ID do recurso
   */
  async deleteResource(id: string): Promise<boolean> {
    try {
      if (!id) {
        throw new AppError('ID do recurso é obrigatório', 400);
      }

      const docRef = this.db.collection(COLLECTION_NAME).doc(id);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        mentorshipLogger.warn(`Recurso com ID ${id} não encontrado`);
        return false;
      }

      await docRef.delete();

      mentorshipLogger.info(`Recurso excluído com sucesso: ${id}`);

      return true;
    } catch (error) {
      mentorshipLogger.error('Erro ao excluir recurso de mentoria:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao excluir recurso de mentoria', 500);
    }
  }

  /**
   * Lista recursos de uma mentoria
   * @param mentorshipId ID da mentoria
   */
  async getResourcesByMentorship(mentorshipId: string): Promise<MentorshipResource[]> {
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

      return snapshot.docs.map(doc => doc.data() as MentorshipResource);
    } catch (error) {
      mentorshipLogger.error('Erro ao listar recursos por mentoria:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao listar recursos por mentoria', 500);
    }
  }

  /**
   * Lista recursos por tipo
   * @param mentorshipId ID da mentoria
   * @param type Tipo de recurso
   */
  async getResourcesByType(
    mentorshipId: string,
    type: ResourceType,
  ): Promise<MentorshipResource[]> {
    try {
      if (!mentorshipId) {
        throw new AppError('ID da mentoria é obrigatório', 400);
      }

      if (!type) {
        throw new AppError('Tipo de recurso é obrigatório', 400);
      }

      // Verificar se o tipo é válido
      if (!Object.values(ResourceType).includes(type)) {
        throw new AppError('Tipo de recurso inválido', 400);
      }

      // Verificar se a mentoria existe
      const mentorship = await this.mentorshipService.getMentorshipById(mentorshipId);
      if (!mentorship) {
        throw new AppError(`Mentoria com ID ${mentorshipId} não encontrada`, 404);
      }

      const snapshot = await this.db
        .collection(COLLECTION_NAME)
        .where('mentorshipId', '==', mentorshipId)
        .where('type', '==', type)
        .orderBy('createdAt', 'desc')
        .get();

      return snapshot.docs.map(doc => doc.data() as MentorshipResource);
    } catch (error) {
      mentorshipLogger.error('Erro ao listar recursos por tipo:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao listar recursos por tipo', 500);
    }
  }

  /**
   * Lista recursos adicionados por um usuário
   * @param userId ID do usuário
   */
  async getResourcesAddedByUser(userId: string): Promise<MentorshipResource[]> {
    try {
      if (!userId) {
        throw new AppError('ID do usuário é obrigatório', 400);
      }

      const snapshot = await this.db
        .collection(COLLECTION_NAME)
        .where('addedByUserId', '==', userId)
        .orderBy('createdAt', 'desc')
        .get();

      return snapshot.docs.map(doc => doc.data() as MentorshipResource);
    } catch (error) {
      mentorshipLogger.error('Erro ao listar recursos adicionados por usuário:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao listar recursos adicionados por usuário', 500);
    }
  }
}
