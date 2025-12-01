import { Router } from 'express';
import { MentorshipFeedbackController } from '../controllers/MentorshipFeedbackController';
import { MentorshipServiceFactory } from '../factories';
import { authenticate } from '../middlewares/authMiddleware';
import { enhancedAuthMiddleware, requireFeature } from '../../auth/middleware/enhancedAuth.middleware';

const router = Router();
const factory = new MentorshipServiceFactory();
const controller = new MentorshipFeedbackController(factory);

// Todas as rotas de feedbacks requerem plano com acesso à mentoria
router.use(enhancedAuthMiddleware);
router.use(requireFeature('canAccessMentorship') as any);

/**
 * @route   POST /feedbacks
 * @desc    Cria um novo feedback de mentoria
 * @access  Private (mentor/mentee)
 */
router.post('/', authenticate, controller.createFeedback);

/**
 * @route   GET /feedbacks/me/received
 * @desc    Lista feedbacks recebidos pelo usuário
 * @access  Private
 */
router.get('/me/received', authenticate, controller.getMyReceivedFeedbacks);

/**
 * @route   GET /feedbacks/me/given
 * @desc    Lista feedbacks dados pelo usuário
 * @access  Private
 */
router.get('/me/given', authenticate, controller.getMyGivenFeedbacks);

/**
 * @route   GET /feedbacks/:id
 * @desc    Obtém um feedback pelo ID
 * @access  Private
 */
router.get('/:id', authenticate, controller.getFeedback);

/**
 * @route   GET /feedbacks/mentorship/:mentorshipId
 * @desc    Lista feedbacks de uma mentoria
 * @access  Private (mentor/mentee da mentoria)
 */
router.get('/mentorship/:mentorshipId', authenticate, controller.getFeedbacksByMentorship);

/**
 * @route   GET /feedbacks/user/:userId/rating
 * @desc    Obtém a média de avaliação de um usuário
 * @access  Private
 */
router.get('/user/:userId/rating', authenticate, controller.getAverageRating);

/**
 * @route   PUT /feedbacks/:id
 * @desc    Atualiza um feedback
 * @access  Private (autor do feedback)
 */
router.put('/:id', authenticate, controller.updateFeedback);

/**
 * @route   DELETE /feedbacks/:id
 * @desc    Deleta um feedback
 * @access  Private (autor do feedback)
 */
router.delete('/:id', authenticate, controller.deleteFeedback);

export const mentorshipFeedbackRoutes = router;
