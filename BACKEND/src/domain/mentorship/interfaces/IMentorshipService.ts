import {
  CreateMentorshipPayload,
  ListMentorshipsOptions,
  Mentorship,
  MentorshipStatus,
  PaginatedMentorshipsResult,
  UpdateMentorshipPayload,
} from '../types';

/**
 * Interface para o serviço de mentorias
 */
export interface IMentorshipService {
  /**
   * Cria uma nova mentoria
   * @param mentorshipData Dados da mentoria
   */
  createMentorship(mentorshipData: CreateMentorshipPayload): Promise<Mentorship>;

  /**
   * Obtém uma mentoria pelo ID
   * @param id ID da mentoria
   */
  getMentorshipById(id: string): Promise<Mentorship | null>;

  /**
   * Atualiza uma mentoria existente
   * @param id ID da mentoria
   * @param updateData Dados para atualização
   */
  updateMentorship(id: string, updateData: UpdateMentorshipPayload): Promise<Mentorship | null>;

  /**
   * Exclui uma mentoria
   * @param id ID da mentoria
   */
  deleteMentorship(id: string): Promise<boolean>;

  /**
   * Lista mentorias com filtros e paginação
   * @param options Opções de listagem e filtros
   */
  listMentorships(options?: ListMentorshipsOptions): Promise<PaginatedMentorshipsResult>;

  /**
   * Lista mentorias onde o usuário é mentor
   * @param mentorId ID do usuário mentor
   * @param status Status opcional para filtro
   */
  getMentorshipsByMentor(
    mentorId: string,
    status?: MentorshipStatus | MentorshipStatus[],
  ): Promise<Mentorship[]>;

  /**
   * Lista mentorias onde o usuário é mentorado
   * @param menteeId ID do usuário mentorado
   * @param status Status opcional para filtro
   */
  getMentorshipsByMentee(
    menteeId: string,
    status?: MentorshipStatus | MentorshipStatus[],
  ): Promise<Mentorship[]>;

  /**
   * Aceita uma mentoria pendente
   * @param id ID da mentoria
   */
  acceptMentorship(id: string): Promise<Mentorship | null>;

  /**
   * Cancela uma mentoria ativa ou pendente
   * @param id ID da mentoria
   * @param reason Motivo do cancelamento
   */
  cancelMentorship(id: string, reason?: string): Promise<Mentorship | null>;

  /**
   * Completa uma mentoria
   * @param id ID da mentoria
   * @param rating Avaliação opcional
   * @param feedback Feedback opcional
   */
  completeMentorship(
    id: string,
    rating?: number | null,
    feedback?: string | null,
  ): Promise<Mentorship | null>;

  /**
   * Registra a conclusão de uma reunião
   * @param id ID da mentoria
   */
  recordMeetingCompletion(id: string): Promise<Mentorship | null>;

  /**
   * Atualiza os objetivos de uma mentoria
   * @param id ID da mentoria
   * @param objectives Lista de objetivos
   */
  updateObjectives(id: string, objectives: string[]): Promise<Mentorship | null>;

  /**
   * Atualiza a frequência de reuniões de uma mentoria
   * @param id ID da mentoria
   * @param frequency Nova frequência
   * @param customDays Dias personalizados (quando frequency = CUSTOM)
   */
  updateMeetingFrequency(
    id: string,
    frequency: string,
    customDays?: number | null,
  ): Promise<Mentorship | null>;

  /**
   * Calcula o progresso de uma mentoria
   * @param mentorship Objeto da mentoria
   */
  getProgress(mentorship: Mentorship): number | null;

  /**
   * Obtém um resumo da mentoria
   * @param mentorship Objeto da mentoria
   */
  getMentorshipSummary(mentorship: Mentorship): any;

  /**
   * Verifica se existem mentorias ativas entre mentor e mentorado
   * @param mentorId ID do mentor
   * @param menteeId ID do mentorado
   */
  existsActiveMentorshipBetweenUsers(mentorId: string, menteeId: string): Promise<boolean>;
}
