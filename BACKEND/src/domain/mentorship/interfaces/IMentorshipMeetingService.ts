import {
  CreateMentorshipMeetingPayload,
  ListMentorshipMeetingsOptions,
  MentorshipMeeting,
  PaginatedMentorshipMeetingsResult,
  UpdateMentorshipMeetingPayload,
} from '../types';

/**
 * Interface para o serviço de reuniões de mentoria
 */
export interface IMentorshipMeetingService {
  /**
   * Cria uma nova reunião de mentoria
   * @param meetingData Dados da reunião
   */
  createMeeting(meetingData: CreateMentorshipMeetingPayload): Promise<MentorshipMeeting>;

  /**
   * Obtém uma reunião pelo ID
   * @param id ID da reunião
   */
  getMeetingById(id: string): Promise<MentorshipMeeting | null>;

  /**
   * Atualiza uma reunião existente
   * @param id ID da reunião
   * @param updateData Dados para atualização
   */
  updateMeeting(
    id: string,
    updateData: UpdateMentorshipMeetingPayload,
  ): Promise<MentorshipMeeting | null>;

  /**
   * Exclui uma reunião
   * @param id ID da reunião
   */
  deleteMeeting(id: string): Promise<boolean>;

  /**
   * Lista reuniões com filtros e paginação
   * @param options Opções de listagem e filtros
   */
  listMeetings(options: ListMentorshipMeetingsOptions): Promise<PaginatedMentorshipMeetingsResult>;

  /**
   * Lista reuniões de uma mentoria
   * @param mentorshipId ID da mentoria
   */
  getMeetingsByMentorship(mentorshipId: string): Promise<MentorshipMeeting[]>;

  /**
   * Lista reuniões futuras de uma mentoria
   * @param mentorshipId ID da mentoria
   */
  getUpcomingMeetings(mentorshipId: string): Promise<MentorshipMeeting[]>;

  /**
   * Marca uma reunião como concluída
   * @param id ID da reunião
   * @param actualDate Data real da reunião
   * @param actualDuration Duração real em minutos
   * @param notes Notas opcionais
   * @param mentorFeedback Feedback do mentor opcional
   * @param studentFeedback Feedback do aluno opcional
   */
  completeMeeting(
    id: string,
    actualDate: Date,
    actualDuration: number,
    notes?: string | null,
    mentorFeedback?: string | null,
    studentFeedback?: string | null,
  ): Promise<MentorshipMeeting | null>;

  /**
   * Cancela uma reunião
   * @param id ID da reunião
   * @param reason Motivo do cancelamento
   */
  cancelMeeting(id: string, reason?: string | null): Promise<MentorshipMeeting | null>;

  /**
   * Reagenda uma reunião
   * @param id ID da reunião
   * @param newDate Nova data
   * @param newDuration Nova duração (opcional)
   * @param newMeetingType Novo tipo de reunião (opcional)
   * @param newMeetingLink Novo link da reunião (opcional)
   * @param newMeetingLocation Novo local da reunião (opcional)
   * @param newAgenda Nova agenda (opcional)
   * @param reason Motivo do reagendamento (opcional)
   */
  rescheduleMeeting(
    id: string,
    newDate: Date,
    newDuration?: number | null,
    newMeetingType?: string | null,
    newMeetingLink?: string | null,
    newMeetingLocation?: string | null,
    newAgenda?: string | null,
    reason?: string | null,
  ): Promise<MentorshipMeeting | null>;

  /**
   * Adiciona notas a uma reunião
   * @param id ID da reunião
   * @param notesToAdd Notas a serem adicionadas
   */
  addNotes(id: string, notesToAdd: string): Promise<MentorshipMeeting | null>;

  /**
   * Adiciona feedback do mentor a uma reunião
   * @param id ID da reunião
   * @param feedback Feedback a ser adicionado
   */
  addMentorFeedback(id: string, feedback: string): Promise<MentorshipMeeting | null>;

  /**
   * Adiciona feedback do aluno a uma reunião
   * @param id ID da reunião
   * @param feedback Feedback a ser adicionado
   */
  addStudentFeedback(id: string, feedback: string): Promise<MentorshipMeeting | null>;

  /**
   * Verifica se uma reunião é futura
   * @param meeting Objeto da reunião
   */
  isUpcoming(meeting: MentorshipMeeting): boolean;

  /**
   * Obtém um resumo da reunião
   * @param meeting Objeto da reunião
   */
  getMeetingSummary(meeting: MentorshipMeeting): any;
}
