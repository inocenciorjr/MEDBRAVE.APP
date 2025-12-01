import { Router } from 'express';
import { MentorshipSimulatedExamController } from '../controllers/MentorshipSimulatedExamController';
import { MentorshipServiceFactory } from '../factories';
import { authenticate } from '../middlewares/authMiddleware';
import { enhancedAuthMiddleware, requireFeature } from '../../auth/middleware/enhancedAuth.middleware';

const router = Router();
const factory = new MentorshipServiceFactory();
const controller = new MentorshipSimulatedExamController(factory);

// Todas as rotas de simulados requerem plano com acesso à mentoria
router.use(enhancedAuthMiddleware);
router.use(requireFeature('canAccessMentorship') as any);

/**
 * @route   POST /simulated-exams
 * @desc    Atribui um simulado a uma mentoria
 * @access  Private (mentor)
 */
router.post('/', authenticate, controller.assignSimulatedExam);

/**
 * @route   GET /simulated-exams/me/assigned
 * @desc    Lista simulados atribuídos pelo usuário (mentor)
 * @access  Private
 */
router.get('/me/assigned', authenticate, controller.getMyAssignedExams);

/**
 * @route   GET /simulated-exams/:id
 * @desc    Obtém um simulado pelo ID
 * @access  Private
 */
router.get('/:id', authenticate, controller.getSimulatedExam);

/**
 * @route   GET /simulated-exams/mentorship/:mentorshipId
 * @desc    Lista simulados de uma mentoria
 * @access  Private (mentor/mentee da mentoria)
 */
router.get('/mentorship/:mentorshipId', authenticate, controller.getSimulatedExamsByMentorship);

/**
 * @route   GET /simulated-exams/mentorship/:mentorshipId/pending
 * @desc    Lista simulados pendentes de uma mentoria
 * @access  Private (mentor/mentee da mentoria)
 */
router.get('/mentorship/:mentorshipId/pending', authenticate, controller.getPendingSimulatedExams);

/**
 * @route   PUT /simulated-exams/:id/complete
 * @desc    Marca um simulado como concluído
 * @access  Private (mentee)
 */
router.put('/:id/complete', authenticate, controller.completeSimulatedExam);

/**
 * @route   PUT /simulated-exams/:id
 * @desc    Atualiza um simulado
 * @access  Private (mentor que atribuiu)
 */
router.put('/:id', authenticate, controller.updateSimulatedExam);

/**
 * @route   DELETE /simulated-exams/:id
 * @desc    Remove um simulado
 * @access  Private (mentor que atribuiu)
 */
router.delete('/:id', authenticate, controller.removeSimulatedExam);

export const mentorshipSimulatedExamRoutes = router;
