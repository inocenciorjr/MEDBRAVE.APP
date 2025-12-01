import { Router } from 'express';
import { MentorshipObjectiveController } from '../controllers/MentorshipObjectiveController';
import { MentorshipServiceFactory } from '../factories';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();
const factory = new MentorshipServiceFactory();
const controller = new MentorshipObjectiveController(factory);

/**
 * @route   POST /objectives
 * @desc    Cria um novo objetivo de mentoria
 * @access  Private (mentor/mentee)
 */
router.post('/', authenticate, controller.createObjective);

/**
 * @route   GET /objectives/:id
 * @desc    Obtém um objetivo pelo ID
 * @access  Private
 */
router.get('/:id', authenticate, controller.getObjective);

/**
 * @route   GET /objectives/mentorship/:mentorshipId
 * @desc    Lista objetivos de uma mentoria
 * @access  Private (mentor/mentee da mentoria)
 */
router.get('/mentorship/:mentorshipId', authenticate, controller.getObjectivesByMentorship);

/**
 * @route   PUT /objectives/:id
 * @desc    Atualiza um objetivo
 * @access  Private (mentor/mentee)
 */
router.put('/:id', authenticate, controller.updateObjective);

/**
 * @route   PUT /objectives/:id/progress
 * @desc    Atualiza o progresso de um objetivo
 * @access  Private (mentor/mentee)
 */
router.put('/:id/progress', authenticate, controller.updateProgress);

/**
 * @route   PUT /objectives/:id/complete
 * @desc    Marca objetivo como completo
 * @access  Private (mentor/mentee)
 */
router.put('/:id/complete', authenticate, controller.completeObjective);

/**
 * @route   PUT /objectives/:id/cancel
 * @desc    Cancela um objetivo
 * @access  Private (mentor/mentee)
 */
router.put('/:id/cancel', authenticate, controller.cancelObjective);

/**
 * @route   DELETE /objectives/:id
 * @desc    Deleta um objetivo
 * @access  Private (mentor/mentee)
 */
router.delete('/:id', authenticate, controller.deleteObjective);

export const mentorshipObjectiveRoutes = router;
