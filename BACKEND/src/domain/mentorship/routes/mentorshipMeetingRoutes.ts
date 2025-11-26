import { Router } from 'express';
import { authenticate } from '../middlewares/authMiddleware';
import { MentorshipMeetingController } from '../controllers/MentorshipMeetingController';
import { MentorshipServiceFactory } from '../factories';
import { enhancedAuthMiddleware } from '../../auth/middleware/enhancedAuth.middleware';
import { requireFeature } from '../../auth/middleware/enhancedAuth.middleware';

const router = Router();
const factory = new MentorshipServiceFactory();
const controller = new MentorshipMeetingController(factory);

// Todas as rotas de reuniões de mentoria requerem plano com acesso à mentoria
router.use(enhancedAuthMiddleware);
router.use(requireFeature('canAccessMentorship') as any);

/**
 * @route   POST /meetings
 * @desc    Cria uma nova reunião
 * @access  Private (mentor/mentee)
 */
router.post('/', authenticate, controller.createMeeting);

/**
 * @route   GET /meetings/:id
 * @desc    Obtém uma reunião pelo ID
 * @access  Private (mentor/mentee da mentoria)
 */
router.get('/:id', authenticate, controller.getMeeting);

/**
 * @route   GET /meetings/mentorship/:mentorshipId
 * @desc    Lista reuniões de uma mentoria
 * @access  Private (mentor/mentee da mentoria)
 */
router.get(
  '/mentorship/:mentorshipId',
  authenticate,
  controller.getMeetingsByMentorship,
);

/**
 * @route   GET /meetings/mentorship/:mentorshipId/upcoming
 * @desc    Lista próximas reuniões de uma mentoria
 * @access  Private (mentor/mentee da mentoria)
 */
router.get(
  '/mentorship/:mentorshipId/upcoming',
  authenticate,
  controller.getUpcomingMeetings,
);

/**
 * @route   PUT /meetings/:id/complete
 * @desc    Completa uma reunião
 * @access  Private (mentor/mentee da mentoria)
 */
router.put('/:id/complete', authenticate, controller.completeMeeting);

/**
 * @route   PUT /meetings/:id/cancel
 * @desc    Cancela uma reunião
 * @access  Private (mentor/mentee da mentoria)
 */
router.put('/:id/cancel', authenticate, controller.cancelMeeting);

/**
 * @route   PUT /meetings/:id/reschedule
 * @desc    Reagenda uma reunião
 * @access  Private (mentor/mentee da mentoria)
 */
router.put('/:id/reschedule', authenticate, controller.rescheduleMeeting);

/**
 * @route   PUT /meetings/:id/notes
 * @desc    Adiciona anotações a uma reunião
 * @access  Private (mentor/mentee da mentoria)
 */
router.put('/:id/notes', authenticate, controller.addNotes);

export const mentorshipMeetingRoutes = router;
