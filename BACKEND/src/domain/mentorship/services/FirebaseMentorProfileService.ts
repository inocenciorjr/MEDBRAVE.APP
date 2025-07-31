import { Firestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
// import { v4 as uuidv4 } from 'uuid';
import { CreateMentorProfilePayload, MentorProfile, UpdateMentorProfilePayload } from '../types';
import { IMentorProfileService } from '../interfaces/IMentorProfileService';
import { mentorshipLogger } from '../utils/loggerAdapter';
import AppError from '../../../utils/AppError';

const COLLECTION_NAME = 'mentor_profiles';

/**
 * Implementação do serviço de perfis de mentores usando Firebase
 */
export class FirebaseMentorProfileService implements IMentorProfileService {
  private db: Firestore;

  constructor(db: Firestore) {
    this.db = db;
  }

  /**
   * Cria um novo perfil de mentor
   * @param profileData Dados do perfil de mentor
   */
  async createMentorProfile(profileData: CreateMentorProfilePayload): Promise<MentorProfile> {
    try {
      const { userId } = profileData;

      if (!userId) {
        throw new AppError('ID do usuário é obrigatório', 400);
      }

      // Verificar se já existe um perfil para este usuário
      const existingProfile = await this.getMentorProfileByUserId(userId);
      if (existingProfile) {
        throw new AppError(`Perfil de mentor já existe para o usuário com ID ${userId}`, 409);
      }

      // Verificar se o usuário existe na coleção users
      const userDoc = await this.db.collection('users').doc(userId).get();
      if (!userDoc.exists) {
        throw new AppError(`Usuário com ID ${userId} não encontrado`, 404);
      }

      // Verificar se o usuário é um mentor (role = MENTOR)
      const userData = userDoc.data();
      if (userData && userData.role !== 'MENTOR') {
        throw new AppError(`Usuário com ID ${userId} não é um mentor`, 403);
      }

      const now = Timestamp.now();

      const newProfile: MentorProfile = {
        id: userId, // Usamos o userId como ID do perfil para facilitar referências
        userId,
        specialties: profileData.specialties || [],
        biography: profileData.biography || '',
        experience: profileData.experience || [],
        education: profileData.education || [],
        availability: profileData.availability || [],
        rating: 0, // Inicializado com 0
        totalSessions: 0, // Inicializado com 0
        createdAt: now,
        updatedAt: now,
      };

      await this.db.collection(COLLECTION_NAME).doc(userId).set(newProfile);

      mentorshipLogger.info(`Perfil de mentor criado com sucesso: ${userId}`);

      return newProfile;
    } catch (error) {
      mentorshipLogger.error('Erro ao criar perfil de mentor:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao criar perfil de mentor', 500);
    }
  }

  /**
   * Obtém um perfil de mentor pelo ID do usuário
   * @param userId ID do usuário (mentor)
   */
  async getMentorProfileByUserId(userId: string): Promise<MentorProfile | null> {
    try {
      if (!userId) {
        throw new AppError('ID do usuário é obrigatório', 400);
      }

      const docRef = this.db.collection(COLLECTION_NAME).doc(userId);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        return null;
      }

      return docSnap.data() as MentorProfile;
    } catch (error) {
      mentorshipLogger.error('Erro ao buscar perfil de mentor:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao buscar perfil de mentor', 500);
    }
  }

  /**
   * Atualiza um perfil de mentor existente
   * @param userId ID do usuário (mentor)
   * @param updateData Dados para atualização
   */
  async updateMentorProfile(
    userId: string,
    updateData: UpdateMentorProfilePayload,
  ): Promise<MentorProfile | null> {
    try {
      if (!userId) {
        throw new AppError('ID do usuário é obrigatório', 400);
      }

      const docRef = this.db.collection(COLLECTION_NAME).doc(userId);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        mentorshipLogger.warn(`Perfil de mentor não encontrado para o usuário ${userId}`);
        return null;
      }

      const now = Timestamp.now();
      const updates = {
        ...updateData,
        updatedAt: now,
      };

      await docRef.update(updates);

      mentorshipLogger.info(`Perfil de mentor atualizado com sucesso: ${userId}`);

      // Retornar o perfil atualizado
      const updatedDocSnap = await docRef.get();
      return updatedDocSnap.data() as MentorProfile;
    } catch (error) {
      mentorshipLogger.error('Erro ao atualizar perfil de mentor:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao atualizar perfil de mentor', 500);
    }
  }

  /**
   * Exclui um perfil de mentor
   * @param userId ID do usuário (mentor)
   */
  async deleteMentorProfile(userId: string): Promise<boolean> {
    try {
      if (!userId) {
        throw new AppError('ID do usuário é obrigatório', 400);
      }

      const docRef = this.db.collection(COLLECTION_NAME).doc(userId);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        mentorshipLogger.warn(`Perfil de mentor não encontrado para o usuário ${userId}`);
        return false;
      }

      await docRef.delete();

      mentorshipLogger.info(`Perfil de mentor excluído com sucesso: ${userId}`);

      return true;
    } catch (error) {
      mentorshipLogger.error('Erro ao excluir perfil de mentor:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao excluir perfil de mentor', 500);
    }
  }

  /**
   * Lista perfis de mentores
   * @param limit Limite de resultados
   * @param page Página de resultados
   */
  async listMentorProfiles(
    limit: number = 10,
    page: number = 1,
  ): Promise<{
    profiles: MentorProfile[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      if (limit < 1 || limit > 100) {
        throw new AppError('Limite deve estar entre 1 e 100', 400);
      }

      if (page < 1) {
        throw new AppError('Página deve ser maior ou igual a 1', 400);
      }

      const offset = (page - 1) * limit;
      const query = this.db.collection(COLLECTION_NAME);

      // Primeiro, obter o total para calcular as páginas
      const totalSnapshot = await query.count().get();
      const total = totalSnapshot.data().count;

      if (total === 0) {
        return {
          profiles: [],
          total: 0,
          page,
          totalPages: 0,
        };
      }

      const totalPages = Math.ceil(total / limit);

      // Agora, obter os resultados paginados
      const snapshot = await query.orderBy('createdAt', 'desc').offset(offset).limit(limit).get();

      const profiles = snapshot.docs.map(doc => doc.data() as MentorProfile);

      return {
        profiles,
        total,
        page,
        totalPages,
      };
    } catch (error) {
      mentorshipLogger.error('Erro ao listar perfis de mentores:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao listar perfis de mentores', 500);
    }
  }

  /**
   * Busca perfis de mentores por especialidade
   * @param specialty Especialidade a ser buscada
   * @param limit Limite de resultados
   * @param page Página de resultados
   */
  async findProfilesBySpecialty(
    specialty: string,
    limit: number = 10,
    page: number = 1,
  ): Promise<{
    profiles: MentorProfile[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      if (!specialty) {
        throw new AppError('Especialidade é obrigatória', 400);
      }

      if (limit < 1 || limit > 100) {
        throw new AppError('Limite deve estar entre 1 e 100', 400);
      }

      if (page < 1) {
        throw new AppError('Página deve ser maior ou igual a 1', 400);
      }

      const offset = (page - 1) * limit;

      // Como não podemos usar array-contains com order by sem índice composto,
      // vamos primeiro buscar todos os perfis que contêm a especialidade
      const snapshot = await this.db
        .collection(COLLECTION_NAME)
        .where('specialties', 'array-contains', specialty)
        .get();

      const total = snapshot.size;

      if (total === 0) {
        return {
          profiles: [],
          total: 0,
          page,
          totalPages: 0,
        };
      }

      // Ordenar e paginar manualmente
      const allProfiles = snapshot.docs.map(doc => doc.data() as MentorProfile);
      const sortedProfiles = allProfiles.sort(
        (a, b) => b.createdAt.toMillis() - a.createdAt.toMillis(),
      );

      const totalPages = Math.ceil(total / limit);
      const paginatedProfiles = sortedProfiles.slice(offset, offset + limit);

      return {
        profiles: paginatedProfiles,
        total,
        page,
        totalPages,
      };
    } catch (error) {
      mentorshipLogger.error('Erro ao buscar perfis de mentores por especialidade:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao buscar perfis de mentores por especialidade', 500);
    }
  }

  /**
   * Atualiza a avaliação do mentor
   * @param userId ID do usuário (mentor)
   * @param rating Nova avaliação
   */
  async updateMentorRating(userId: string, rating: number): Promise<MentorProfile | null> {
    try {
      if (!userId) {
        throw new AppError('ID do usuário é obrigatório', 400);
      }

      if (rating < 0 || rating > 5) {
        throw new AppError('Avaliação deve estar entre 0 e 5', 400);
      }

      const docRef = this.db.collection(COLLECTION_NAME).doc(userId);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        mentorshipLogger.warn(`Perfil de mentor não encontrado para o usuário ${userId}`);
        return null;
      }

      const now = Timestamp.now();
      await docRef.update({
        rating,
        updatedAt: now,
      });

      mentorshipLogger.info(`Avaliação do mentor atualizada com sucesso: ${userId}`);

      // Retornar o perfil atualizado
      const updatedDocSnap = await docRef.get();
      return updatedDocSnap.data() as MentorProfile;
    } catch (error) {
      mentorshipLogger.error('Erro ao atualizar avaliação do mentor:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao atualizar avaliação do mentor', 500);
    }
  }

  /**
   * Incrementa o contador de sessões do mentor
   * @param userId ID do usuário (mentor)
   */
  async incrementSessionCount(userId: string): Promise<MentorProfile | null> {
    try {
      if (!userId) {
        throw new AppError('ID do usuário é obrigatório', 400);
      }

      const docRef = this.db.collection(COLLECTION_NAME).doc(userId);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        mentorshipLogger.warn(`Perfil de mentor não encontrado para o usuário ${userId}`);
        return null;
      }

      const now = Timestamp.now();
      await docRef.update({
        totalSessions: FieldValue.increment(1),
        updatedAt: now,
      });

      mentorshipLogger.info(`Contador de sessões do mentor incrementado com sucesso: ${userId}`);

      // Retornar o perfil atualizado
      const updatedDocSnap = await docRef.get();
      return updatedDocSnap.data() as MentorProfile;
    } catch (error) {
      mentorshipLogger.error('Erro ao incrementar contador de sessões do mentor:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao incrementar contador de sessões do mentor', 500);
    }
  }

  /**
   * Verifica se um usuário é mentor
   * @param userId ID do usuário
   */
  async isMentor(userId: string): Promise<boolean> {
    try {
      if (!userId) {
        throw new AppError('ID do usuário é obrigatório', 400);
      }

      const docRef = this.db.collection(COLLECTION_NAME).doc(userId);
      const docSnap = await docRef.get();

      return docSnap.exists;
    } catch (error) {
      mentorshipLogger.error('Erro ao verificar se usuário é mentor:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao verificar se usuário é mentor', 500);
    }
  }
}
