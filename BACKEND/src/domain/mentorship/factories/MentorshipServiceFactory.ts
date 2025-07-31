import { Firestore } from 'firebase-admin/firestore';
import {
  FirebaseMentorProfileService,
  FirebaseMentorshipService,
  FirebaseMentorshipMeetingService,
  FirebaseMentorshipObjectiveService,
  FirebaseMentorshipFeedbackService,
  FirebaseMentorshipResourceService,
  FirebaseMentorshipSimulatedExamService,
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

  constructor(db: Firestore) {
    // Instanciar serviços na ordem correta de dependência
    this.mentorProfileService = new FirebaseMentorProfileService(db);
    this.mentorshipService = new FirebaseMentorshipService(db);

    // Serviços que dependem do mentorshipService
    this.mentorshipMeetingService = new FirebaseMentorshipMeetingService(
      db,
      this.mentorshipService,
    );
    this.mentorshipObjectiveService = new FirebaseMentorshipObjectiveService(
      db,
      this.mentorshipService,
    );
    this.mentorshipFeedbackService = new FirebaseMentorshipFeedbackService(
      db,
      this.mentorshipService,
    );
    this.mentorshipResourceService = new FirebaseMentorshipResourceService(
      db,
      this.mentorshipService,
    );
    this.mentorshipSimulatedExamService = new FirebaseMentorshipSimulatedExamService(
      db,
      this.mentorshipService,
    );
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
