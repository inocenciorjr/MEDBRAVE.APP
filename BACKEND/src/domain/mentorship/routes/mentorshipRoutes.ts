import { Router } from 'express';
import { MentorshipController } from '../controllers/MentorshipController';
import { MentorshipServiceFactory } from '../factories';
import { authenticate, isMentorOrMentee } from '../middlewares/authMiddleware';
import { getFirestore } from 'firebase-admin/firestore';

const router = Router();
const db = getFirestore();
const factory = new MentorshipServiceFactory(db);
const controller = new MentorshipController(factory);
const mentorshipService = factory.getMentorshipService();

/**
 * @route   POST /mentorships
 * @desc    Cria uma nova mentoria
 * @access  Private
 */
router.post('/', authenticate, controller.createMentorship);

/**
 * @route   GET /mentorships/:id
 * @desc    Obtém uma mentoria pelo ID
 * @access  Private (mentor/mentorado da mentoria)
 */
router.get('/:id', authenticate, controller.getMentorship);

/**
 * @route   GET /mentorships
 * @desc    Lista mentorias com filtros
 * @access  Private
 */
router.get('/', authenticate, controller.listMentorships);

/**
 * @route   GET /mentorships/mentor/:mentorId
 * @desc    Lista mentorias onde o usuário é mentor
 * @access  Private (mentor)
 */
router.get('/mentor/:mentorId', authenticate, controller.listMentorshipsByMentor);

/**
 * @route   GET /mentorships/me/mentor
 * @desc    Lista mentorias onde o usuário autenticado é mentor
 * @access  Private (mentor)
 */
router.get('/me/mentor', authenticate, controller.listMentorshipsByMentor);

/**
 * @route   GET /mentorships/mentee/:menteeId
 * @desc    Lista mentorias onde o usuário é mentorado
 * @access  Private (mentorado)
 */
router.get('/mentee/:menteeId', authenticate, controller.listMentorshipsByMentee);

/**
 * @route   GET /mentorships/me/mentee
 * @desc    Lista mentorias onde o usuário autenticado é mentorado
 * @access  Private
 */
router.get('/me/mentee', authenticate, controller.listMentorshipsByMentee);

/**
 * @route   PUT /mentorships/:id/accept
 * @desc    Aceita uma mentoria pendente
 * @access  Private (mentor da mentoria)
 */
router.put(
  '/:id/accept',
  authenticate,
  isMentorOrMentee(mentorshipService),
  controller.acceptMentorship,
);

/**
 * @route   PUT /mentorships/:id/cancel
 * @desc    Cancela uma mentoria
 * @access  Private (mentor/mentorado da mentoria)
 */
router.put(
  '/:id/cancel',
  authenticate,
  isMentorOrMentee(mentorshipService),
  controller.cancelMentorship,
);

/**
 * @route   PUT /mentorships/:id/complete
 * @desc    Completa uma mentoria
 * @access  Private (mentor/mentorado da mentoria)
 */
router.put(
  '/:id/complete',
  authenticate,
  isMentorOrMentee(mentorshipService),
  controller.completeMentorship,
);

/**
 * @route   PUT /mentorships/:id/objectives
 * @desc    Atualiza os objetivos de uma mentoria
 * @access  Private (mentor/mentorado da mentoria)
 */
router.put(
  '/:id/objectives',
  authenticate,
  isMentorOrMentee(mentorshipService),
  controller.updateObjectives,
);

export const mentorshipRoutes = router;
