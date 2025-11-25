import {
  SupabaseMentorProfileService,
  SupabaseMentorshipService,
  SupabaseMentorshipMeetingService,
  SupabaseMentorshipObjectiveService,
  SupabaseMentorshipFeedbackService,
  SupabaseMentorshipResourceService,
  SupabaseMentorshipSimulatedExamService,
} from '../services';
import {
  IMentorProfileService,
  IMentorshipService,
  IMentorshipMeetingService,
  IMentorshipObjectiveService,
  IMentorshipFeedbackService,
  IMentorshipResourceService,
  IMentorshipSimulatedExamService,
} from '../interfaces';

/**
 * Fábrica responsável por criar instâncias dos serviços do domínio de mentoria
 */
export class MentorshipServiceFactory {
  private mentorProfileService: IMentorProfileService;
  private mentorshipService: IMentorshipService;
  private mentorshipMeetingService: IMentorshipMeetingService;
  private mentorshipObjectiveService: IMentorshipObjectiveService;
  private mentorshipFeedbackService: IMentorshipFeedbackService;
  private mentorshipResourceService: IMentorshipResourceService;
  private mentorshipSimulatedExamService: IMentorshipSimulatedExamService;

  constructor() {
    // Instanciar serviços Supabase
    this.mentorProfileService = new SupabaseMentorProfileService();
    this.mentorshipService = new SupabaseMentorshipService();
    this.mentorshipMeetingService = new SupabaseMentorshipMeetingService();
    this.mentorshipObjectiveService = new SupabaseMentorshipObjectiveService();
    this.mentorshipFeedbackService = new SupabaseMentorshipFeedbackService();
    this.mentorshipResourceService = new SupabaseMentorshipResourceService();
    this.mentorshipSimulatedExamService =
      new SupabaseMentorshipSimulatedExamService();
  }

  /**
   * Obtém o serviço de perfis de mentores
   */
  getMentorProfileService(): IMentorProfileService {
    return this.mentorProfileService;
  }

  /**
   * Obtém o serviço de mentorias
   */
  getMentorshipService(): IMentorshipService {
    return this.mentorshipService;
  }

  /**
   * Obtém o serviço de reuniões de mentoria
   */
  getMentorshipMeetingService(): IMentorshipMeetingService {
    return this.mentorshipMeetingService;
  }

  /**
   * Obtém o serviço de objetivos de mentoria
   */
  getMentorshipObjectiveService(): IMentorshipObjectiveService {
    return this.mentorshipObjectiveService;
  }

  /**
   * Obtém o serviço de feedbacks de mentoria
   */
  getMentorshipFeedbackService(): IMentorshipFeedbackService {
    return this.mentorshipFeedbackService;
  }

  /**
   * Obtém o serviço de recursos de mentoria
   */
  getMentorshipResourceService(): IMentorshipResourceService {
    return this.mentorshipResourceService;
  }

  /**
   * Obtém o serviço de simulados de mentoria
   */
  getMentorshipSimulatedExamService(): IMentorshipSimulatedExamService {
    return this.mentorshipSimulatedExamService;
  }
}
