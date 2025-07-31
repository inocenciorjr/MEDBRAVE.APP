import {
  CreateMentorshipFeedbackPayload,
  MentorshipFeedback,
  UpdateMentorshipFeedbackPayload,
} from '../types';

/**
 * Interface para o serviço de feedbacks de mentoria
 */
export interface IMentorshipFeedbackService {
  /**
   * Cria um novo feedback de mentoria
   * @param feedbackData Dados do feedback
   */
  createFeedback(feedbackData: CreateMentorshipFeedbackPayload): Promise<MentorshipFeedback>;

  /**
   * Obtém um feedback pelo ID
   * @param id ID do feedback
   */
  getFeedbackById(id: string): Promise<MentorshipFeedback | null>;

  /**
   * Atualiza um feedback existente
   * @param id ID do feedback
   * @param updateData Dados para atualização
   */
  updateFeedback(
    id: string,
    updateData: UpdateMentorshipFeedbackPayload,
  ): Promise<MentorshipFeedback | null>;

  /**
   * Exclui um feedback
   * @param id ID do feedback
   */
  deleteFeedback(id: string): Promise<boolean>;

  /**
   * Lista feedbacks de uma mentoria
   * @param mentorshipId ID da mentoria
   */
  getFeedbacksByMentorship(mentorshipId: string): Promise<MentorshipFeedback[]>;

  /**
   * Lista feedbacks de uma reunião
   * @param meetingId ID da reunião
   */
  getFeedbacksByMeeting(meetingId: string): Promise<MentorshipFeedback[]>;

  /**
   * Lista feedbacks dados por um usuário
   * @param userId ID do usuário
   */
  getFeedbacksGivenByUser(userId: string): Promise<MentorshipFeedback[]>;

  /**
   * Lista feedbacks recebidos por um usuário
   * @param userId ID do usuário
   */
  getFeedbacksReceivedByUser(userId: string): Promise<MentorshipFeedback[]>;

  /**
   * Obtém a avaliação média recebida por um usuário
   * @param userId ID do usuário
   */
  getAverageRatingForUser(userId: string): Promise<number | null>;
}
