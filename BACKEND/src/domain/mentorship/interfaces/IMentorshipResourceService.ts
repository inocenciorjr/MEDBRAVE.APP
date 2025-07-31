import {
  CreateMentorshipResourcePayload,
  MentorshipResource,
  ResourceType,
  UpdateMentorshipResourcePayload,
} from '../types';

/**
 * Interface para o serviço de recursos de mentoria
 */
export interface IMentorshipResourceService {
  /**
   * Cria um novo recurso de mentoria
   * @param resourceData Dados do recurso
   */
  createResource(resourceData: CreateMentorshipResourcePayload): Promise<MentorshipResource>;

  /**
   * Obtém um recurso pelo ID
   * @param id ID do recurso
   */
  getResourceById(id: string): Promise<MentorshipResource | null>;

  /**
   * Atualiza um recurso existente
   * @param id ID do recurso
   * @param updateData Dados para atualização
   */
  updateResource(
    id: string,
    updateData: UpdateMentorshipResourcePayload,
  ): Promise<MentorshipResource | null>;

  /**
   * Exclui um recurso
   * @param id ID do recurso
   */
  deleteResource(id: string): Promise<boolean>;

  /**
   * Lista recursos de uma mentoria
   * @param mentorshipId ID da mentoria
   */
  getResourcesByMentorship(mentorshipId: string): Promise<MentorshipResource[]>;

  /**
   * Lista recursos por tipo
   * @param mentorshipId ID da mentoria
   * @param type Tipo de recurso
   */
  getResourcesByType(mentorshipId: string, type: ResourceType): Promise<MentorshipResource[]>;

  /**
   * Lista recursos adicionados por um usuário
   * @param userId ID do usuário
   */
  getResourcesAddedByUser(userId: string): Promise<MentorshipResource[]>;
}
