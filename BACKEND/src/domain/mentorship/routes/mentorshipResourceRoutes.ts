import { Router } from 'express';
import { MentorshipResourceController } from '../controllers/MentorshipResourceController';
import { MentorshipServiceFactory } from '../factories';
import { authenticate } from '../middlewares/authMiddleware';
import { enhancedAuthMiddleware, requireFeature } from '../../auth/middleware/enhancedAuth.middleware';

const router = Router();
const factory = new MentorshipServiceFactory();
const controller = new MentorshipResourceController(factory);

// Todas as rotas de recursos requerem plano com acesso à mentoria
router.use(enhancedAuthMiddleware);
router.use(requireFeature('canAccessMentorship') as any);

/**
 * @route   POST /resources
 * @desc    Cria um novo recurso de mentoria
 * @access  Private (mentor/mentee)
 */
router.post('/', authenticate, controller.createResource);

/**
 * @route   GET /resources/me
 * @desc    Lista recursos adicionados pelo usuário
 * @access  Private
 */
router.get('/me', authenticate, controller.getMyResources);

/**
 * @route   GET /resources/:id
 * @desc    Obtém um recurso pelo ID
 * @access  Private
 */
router.get('/:id', authenticate, controller.getResource);

/**
 * @route   GET /resources/mentorship/:mentorshipId
 * @desc    Lista recursos de uma mentoria
 * @access  Private (mentor/mentee da mentoria)
 */
router.get('/mentorship/:mentorshipId', authenticate, controller.getResourcesByMentorship);

/**
 * @route   GET /resources/mentorship/:mentorshipId/type/:type
 * @desc    Lista recursos de uma mentoria por tipo
 * @access  Private (mentor/mentee da mentoria)
 */
router.get('/mentorship/:mentorshipId/type/:type', authenticate, controller.getResourcesByType);

/**
 * @route   PUT /resources/:id
 * @desc    Atualiza um recurso
 * @access  Private (autor do recurso)
 */
router.put('/:id', authenticate, controller.updateResource);

/**
 * @route   DELETE /resources/:id
 * @desc    Deleta um recurso
 * @access  Private (autor do recurso)
 */
router.delete('/:id', authenticate, controller.deleteResource);

export const mentorshipResourceRoutes = router;
