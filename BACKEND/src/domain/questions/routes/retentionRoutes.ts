import { Router } from 'express';
import { RetentionController } from '../controllers/RetentionController';
import { UnifiedQuestionResponseService } from '../services/UnifiedQuestionResponseService';
import { QuestionRetentionService } from '../services/QuestionRetentionService';

import { authMiddleware } from '../../auth/middleware/auth.middleware';
import { firestore } from '../../../config/firebaseAdmin';

const router = Router();

// Inicializar serviços com dependências corretas
const db = firestore;
const retentionService = new QuestionRetentionService(db);
const unifiedService = new UnifiedQuestionResponseService(db, retentionService);

// Inicializar controlador
const retentionController = new RetentionController(
  retentionService,
  unifiedService
);

// Aplicar middleware de autenticação a todas as rotas
router.use(authMiddleware);

// ==================== ROTAS DE ESTATÍSTICAS ====================

/**
 * @route GET /api/retention/list/:listId/statistics
 * @desc Obter estatísticas completas de conclusão de lista
 * @access Private
 */
router.get('/list/:listId/statistics', (req, res) => 
  retentionController.getListCompletionStatistics(req, res)
);

/**
 * @route GET /api/retention/dashboard
 * @desc Obter dashboard completo de retenção do usuário
 * @access Private
 */
router.get('/dashboard', (req, res) => 
  retentionController.getRetentionDashboard(req, res)
);

/**
 * @route GET /api/retention/summary
 * @desc Obter resumo de retenção do usuário com filtro de tempo
 * @access Private
 */
router.get('/summary', (req, res) => 
  retentionController.getUserRetentionSummary(req, res)
);

// ==================== ROTAS DE PREDIÇÃO ====================

/**
 * @route GET /api/retention/prediction
 * @desc Obter predição de performance baseada em dados históricos
 * @access Private
 */
router.get('/prediction', (req, res) => 
  retentionController.getPerformancePrediction(req, res)
);

// ==================== ROTAS DE HISTÓRICO ====================

/**
 * @route GET /api/retention/question/:questionId/history
 * @desc Obter histórico completo de retenção de uma questão
 * @access Private
 */
router.get('/question/:questionId/history', (req, res) => 
  retentionController.getQuestionRetentionHistory(req, res)
);

// ==================== ROTAS DE AÇÕES ====================

/**
 * @route POST /api/retention/answer
 * @desc Registrar resposta de questão com análise de retenção
 * @access Private
 */
router.post('/answer', (req, res) => 
  retentionController.recordQuestionAnswer(req, res)
);

/**
 * @route POST /api/retention/fsrs/add
 * @desc Adicionar questões selecionadas ao sistema FSRS
 * @access Private
 */
router.post('/fsrs/add', (req, res) => 
  retentionController.addQuestionsToFSRS(req, res)
);

// ==================== ROTAS DE ALERTAS E RECOMENDAÇÕES ====================

/**
 * @route GET /api/retention/alerts
 * @desc Obter alertas de retenção do usuário
 * @access Private
 */
router.get('/alerts', (req, res) => 
  retentionController.getRetentionAlerts(req, res)
);

/**
 * @route GET /api/retention/recommendations
 * @desc Obter recomendações de estudo personalizadas
 * @access Private
 */
router.get('/recommendations', (req, res) => 
  retentionController.getStudyRecommendations(req, res)
);

// ==================== ROTAS DE GAMIFICAÇÃO ====================

/**
 * @route GET /api/retention/achievements
 * @desc Obter conquistas significativas do usuário
 * @access Private
 */
router.get('/achievements', (req, res) => 
  retentionController.getMeaningfulAchievements(req, res)
);

/**
 * @route PUT /api/retention/gamification/settings
 * @desc Atualizar configurações de gamificação
 * @access Private
 */
router.put('/gamification/settings', (req, res) => 
  retentionController.updateGamificationSettings(req, res)
);

export default router;