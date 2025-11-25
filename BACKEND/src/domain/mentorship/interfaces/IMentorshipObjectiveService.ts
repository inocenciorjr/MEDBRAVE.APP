import {
  CreateMentorshipObjectivePayload,
  MentorshipObjective,
  ObjectiveStatus,
  UpdateMentorshipObjectivePayload,
} from '../types';

/**
 * Interface para o serviço de objetivos de mentoria
 */
export interface IMentorshipObjectiveService {
  /**
   * Cria um novo objetivo de mentoria
   * @param objectiveData Dados do objetivo
   */
  createObjective(
    objectiveData: CreateMentorshipObjectivePayload,
  ): Promise<MentorshipObjective>;

  /**
   * Obtém um objetivo pelo ID
   * @param id ID do objetivo
   */
  getObjectiveById(id: string): Promise<MentorshipObjective | null>;

  /**
   * Atualiza um objetivo existente
   * @param id ID do objetivo
   * @param updateData Dados para atualização
   */
  updateObjective(
    id: string,
    updateData: UpdateMentorshipObjectivePayload,
  ): Promise<MentorshipObjective | null>;

  /**
   * Exclui um objetivo
   * @param id ID do objetivo
   */
  deleteObjective(id: string): Promise<boolean>;

  /**
   * Lista objetivos de uma mentoria
   * @param mentorshipId ID da mentoria
   */
  getObjectivesByMentorship(
    mentorshipId: string,
  ): Promise<MentorshipObjective[]>;

  /**
   * Lista objetivos de uma mentoria com status específico
   * @param mentorshipId ID da mentoria
   * @param status Status a ser filtrado
   */
  getObjectivesByStatus(
    mentorshipId: string,
    status: ObjectiveStatus,
  ): Promise<MentorshipObjective[]>;

  /**
   * Atualiza o progresso de um objetivo
   * @param id ID do objetivo
   * @param progress Novo progresso (0-100)
   */
  updateProgress(
    id: string,
    progress: number,
  ): Promise<MentorshipObjective | null>;

  /**
   * Marca um objetivo como completado
   * @param id ID do objetivo
   */
  completeObjective(id: string): Promise<MentorshipObjective | null>;

  /**
   * Marca um objetivo como em progresso
   * @param id ID do objetivo
   */
  startObjective(id: string): Promise<MentorshipObjective | null>;

  /**
   * Cancela um objetivo
   * @param id ID do objetivo
   */
  cancelObjective(id: string): Promise<MentorshipObjective | null>;
}
