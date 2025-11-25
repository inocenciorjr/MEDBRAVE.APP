import {
  CreateMentorProfilePayload,
  MentorProfile,
  UpdateMentorProfilePayload,
} from '../types';

/**
 * Interface para o serviço de perfis de mentores
 */
export interface IMentorProfileService {
  /**
   * Cria um novo perfil de mentor
   * @param profileData Dados do perfil de mentor
   */
  createMentorProfile(
    profileData: CreateMentorProfilePayload,
  ): Promise<MentorProfile>;

  /**
   * Obtém um perfil de mentor pelo ID do usuário
   * @param userId ID do usuário (mentor)
   */
  getMentorProfileByUserId(userId: string): Promise<MentorProfile | null>;

  /**
   * Atualiza um perfil de mentor existente
   * @param userId ID do usuário (mentor)
   * @param updateData Dados para atualização
   */
  updateMentorProfile(
    userId: string,
    updateData: UpdateMentorProfilePayload,
  ): Promise<MentorProfile | null>;

  /**
   * Exclui um perfil de mentor
   * @param userId ID do usuário (mentor)
   */
  deleteMentorProfile(userId: string): Promise<boolean>;

  /**
   * Lista perfis de mentores
   * @param limit Limite de resultados
   * @param page Página de resultados
   */
  listMentorProfiles(
    limit?: number,
    page?: number,
  ): Promise<{
    profiles: MentorProfile[];
    total: number;
    page: number;
    totalPages: number;
  }>;

  /**
   * Busca perfis de mentores por especialidade
   * @param specialty Especialidade a ser buscada
   * @param limit Limite de resultados
   * @param page Página de resultados
   */
  findProfilesBySpecialty(
    specialty: string,
    limit?: number,
    page?: number,
  ): Promise<{
    profiles: MentorProfile[];
    total: number;
    page: number;
    totalPages: number;
  }>;

  /**
   * Atualiza a avaliação do mentor
   * @param userId ID do usuário (mentor)
   * @param rating Nova avaliação
   */
  updateMentorRating(
    userId: string,
    rating: number,
  ): Promise<MentorProfile | null>;

  /**
   * Incrementa o contador de sessões do mentor
   * @param userId ID do usuário (mentor)
   */
  incrementSessionCount(userId: string): Promise<MentorProfile | null>;

  /**
   * Verifica se um usuário é mentor
   * @param userId ID do usuário
   */
  isMentor(userId: string): Promise<boolean>;
}
