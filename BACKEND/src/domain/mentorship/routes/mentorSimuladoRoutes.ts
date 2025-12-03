import { Router } from 'express';
import { MentorSimuladoController } from '../controllers/MentorSimuladoController';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();
const controller = new MentorSimuladoController();

// Todas as rotas requerem autenticação
router.use(authenticate);

// ============================================================================
// MENTORIAS E MENTORADOS
// ============================================================================

/**
 * @route   GET /mentor-simulados/mentorships
 * @desc    Lista mentorias do mentor com dados dos mentorados (legado)
 * @access  Private (mentor)
 */
router.get('/mentorships', controller.getMentorships);

/**
 * @route   GET /mentor-simulados/programs
 * @desc    Lista programas do mentor com mentorados agrupados
 * @access  Private (mentor)
 */
router.get('/programs', controller.getMentorPrograms);

/**
 * @route   GET /mentor-simulados/my-assignments
 * @desc    Lista atribuições do usuário (simulados que precisa fazer)
 * @access  Private
 */
router.get('/my-assignments', controller.getMyAssignments);

// ============================================================================
// QUESTÕES AUTORAIS
// ============================================================================

/**
 * @route   POST /mentor-simulados/questions
 * @desc    Cria uma questão autoral do mentor
 * @access  Private (mentor)
 */
router.post('/questions', controller.createQuestion);

/**
 * @route   GET /mentor-simulados/questions
 * @desc    Lista questões criadas pelo mentor
 * @access  Private (mentor)
 */
router.get('/questions', controller.getQuestions);

// ============================================================================
// SIMULADOS
// ============================================================================

/**
 * @route   POST /mentor-simulados
 * @desc    Cria um simulado personalizado
 * @access  Private (mentor)
 */
router.post('/', controller.createSimulado);

/**
 * @route   GET /mentor-simulados
 * @desc    Lista simulados do mentor
 * @access  Private (mentor)
 */
router.get('/', controller.getSimulados);

/**
 * @route   GET /mentor-simulados/:id
 * @desc    Obtém um simulado pelo ID
 * @access  Private
 */
router.get('/:id', controller.getSimuladoById);

/**
 * @route   PUT /mentor-simulados/:id
 * @desc    Atualiza um simulado
 * @access  Private (mentor dono)
 */
router.put('/:id', controller.updateSimulado);

/**
 * @route   DELETE /mentor-simulados/:id
 * @desc    Deleta um simulado
 * @access  Private (mentor dono)
 */
router.delete('/:id', controller.deleteSimulado);

/**
 * @route   PATCH /mentor-simulados/:id/status
 * @desc    Altera o status do simulado
 * @access  Private (mentor dono)
 */
router.patch('/:id/status', controller.changeStatus);

/**
 * @route   POST /mentor-simulados/:id/subscribe
 * @desc    Inscreve usuário em simulado público
 * @access  Private
 */
router.post('/:id/subscribe', controller.subscribeToExam);

/**
 * @route   GET /mentor-simulados/:id/assignments
 * @desc    Lista atribuições de um simulado (progresso dos participantes)
 * @access  Private (mentor dono)
 */
router.get('/:id/assignments', controller.getSimuladoAssignments);

/**
 * @route   POST /mentor-simulados/:id/sync-assignments
 * @desc    Sincroniza atribuições após edição do simulado
 * @access  Private (mentor dono)
 */
router.post('/:id/sync-assignments', controller.syncAssignments);

/**
 * @route   GET /mentor-simulados/:id/analytics
 * @desc    Obtém analytics detalhados do simulado
 * @access  Private (mentor dono)
 */
router.get('/:id/analytics', controller.getSimuladoAnalytics);

/**
 * @route   GET /mentor-simulados/:id/user/:userId/performance
 * @desc    Obtém performance detalhada de um usuário no simulado
 * @access  Private (mentor dono)
 */
router.get('/:id/user/:userId/performance', controller.getUserPerformance);

export const mentorSimuladoRoutes = router;
