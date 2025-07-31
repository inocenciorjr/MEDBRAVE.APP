import {
  CreateMentorshipSimulatedExamPayload,
  MentorshipSimulatedExam,
  UpdateMentorshipSimulatedExamPayload,
} from '../types';

/**
 * Interface para o serviço de simulados de mentoria
 */
export interface IMentorshipSimulatedExamService {
  /**
   * Atribui um simulado a uma mentoria
   * @param examData Dados do simulado
   */
  assignSimulatedExam(
    examData: CreateMentorshipSimulatedExamPayload,
  ): Promise<MentorshipSimulatedExam>;

  /**
   * Obtém um simulado pelo ID
   * @param id ID do simulado
   */
  getSimulatedExamById(id: string): Promise<MentorshipSimulatedExam | null>;

  /**
   * Atualiza um simulado existente
   * @param id ID do simulado
   * @param updateData Dados para atualização
   */
  updateSimulatedExam(
    id: string,
    updateData: UpdateMentorshipSimulatedExamPayload,
  ): Promise<MentorshipSimulatedExam | null>;

  /**
   * Remove a atribuição de um simulado
   * @param id ID do simulado
   */
  removeSimulatedExam(id: string): Promise<boolean>;

  /**
   * Lista simulados de uma mentoria
   * @param mentorshipId ID da mentoria
   */
  getSimulatedExamsByMentorship(mentorshipId: string): Promise<MentorshipSimulatedExam[]>;

  /**
   * Lista simulados atribuídos por um usuário
   * @param userId ID do usuário
   */
  getSimulatedExamsAssignedByUser(userId: string): Promise<MentorshipSimulatedExam[]>;

  /**
   * Lista simulados pendentes de uma mentoria
   * @param mentorshipId ID da mentoria
   */
  getPendingSimulatedExams(mentorshipId: string): Promise<MentorshipSimulatedExam[]>;

  /**
   * Marca um simulado como concluído
   * @param id ID do simulado
   * @param score Pontuação (0-100)
   */
  completeSimulatedExam(id: string, score: number): Promise<MentorshipSimulatedExam | null>;
}
