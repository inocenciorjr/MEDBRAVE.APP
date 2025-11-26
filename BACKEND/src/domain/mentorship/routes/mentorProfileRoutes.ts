import { Router } from 'express';
import { MentorProfileController } from '../controllers/MentorProfileController';
import { MentorshipServiceFactory } from '../factories';
import { authenticate, isMentor } from '../middlewares/authMiddleware';
import { enhancedAuthMiddleware } from '../../auth/middleware/enhancedAuth.middleware';
import { requireFeature } from '../../auth/middleware/enhancedAuth.middleware';

const router = Router();
const factory = new MentorshipServiceFactory();
const controller = new MentorProfileController(factory);

// Todas as rotas de perfil de mentor requerem plano com acesso à mentoria
router.use(enhancedAuthMiddleware);
router.use(requireFeature('canAccessMentorship') as any);

/**
 * @route   POST /mentor-profiles
 * @desc    Cria um novo perfil de mentor
 * @access  Private (somente mentores)
 */
router.post('/', authenticate, isMentor, controller.createProfile);

/**
 * @route   PUT /mentor-profiles
 * @desc    Atualiza perfil de mentor do usuário autenticado
 * @access  Private (somente mentores)
 */
router.put('/', authenticate, isMentor, controller.updateProfile);

/**
 * @route   GET /mentor-profiles/me
 * @desc    Obtém perfil de mentor do usuário autenticado
 * @access  Private (somente mentores)
 */
router.get('/me', authenticate, isMentor, controller.getProfile);

/**
 * @route   GET /mentor-profiles/:userId
 * @desc    Obtém perfil de mentor por ID de usuário
 * @access  Public
 */
router.get('/:userId', controller.getProfile);

/**
 * @route   GET /mentor-profiles
 * @desc    Lista perfis de mentores com paginação
 * @access  Public
 */
router.get('/', controller.listProfiles);

/**
 * @route   GET /mentor-profiles/specialty/:specialty
 * @desc    Busca perfis de mentores por especialidade
 * @access  Public
 */
router.get('/specialty/:specialty', controller.findBySpecialty);

/**
 * @route   GET /mentor-profiles/check/:userId
 * @desc    Verifica se um usuário é mentor
 * @access  Public
 */
router.get('/check/:userId', controller.checkIsMentor);

export const mentorProfileRoutes = router;
