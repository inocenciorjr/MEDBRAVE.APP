import { Router } from 'express';
import { UserStatisticsController } from '../controllers/UserStatisticsController';
import { authMiddleware } from '../../auth/middleware/auth.middleware';
import { createUserStatisticsFactory } from '../factory/UserStatisticsFactory';

const router = Router();

// Criar instância do controller usando factory
const userStatisticsController = new UserStatisticsController(
  createUserStatisticsFactory()
);

// Middleware de autenticação para todas as rotas
router.use(authMiddleware);

// === ROTAS PRINCIPAIS ===

// GET /api/users/:userId/statistics - Obter estatísticas do usuário
router.get('/:userId/statistics', 
  userStatisticsController.getUserStatistics.bind(userStatisticsController)
);

// DELETE /api/users/:userId/statistics - Deletar estatísticas
router.delete('/:userId/statistics', 
  userStatisticsController.deleteUserStatistics.bind(userStatisticsController)
);

// === ROTAS DE REGISTRO DE ATIVIDADES ===

// POST /api/users/:userId/statistics/question-answer - Registrar resposta de questão
router.post('/:userId/statistics/question-answer', 
  userStatisticsController.recordQuestionAnswer.bind(userStatisticsController)
);

// POST /api/users/:userId/statistics/exam-completion - Registrar conclusão de simulado
router.post('/:userId/statistics/exam-completion', 
  userStatisticsController.recordExamCompletion.bind(userStatisticsController)
);

// === ROTAS DE SESSÕES DE ESTUDO ===

// POST /api/users/:userId/statistics/study-session/start - Iniciar sessão
router.post('/:userId/statistics/study-session/start', 
  userStatisticsController.startStudySession.bind(userStatisticsController)
);

// POST /api/users/:userId/statistics/study-session/end - Finalizar sessão
router.post('/:userId/statistics/study-session/end', 
  userStatisticsController.endStudySession.bind(userStatisticsController)
);

// PUT /api/users/:userId/statistics/streak - Atualizar streak
router.put('/:userId/statistics/streak', 
  userStatisticsController.updateStreak.bind(userStatisticsController)
);

// === ROTAS DE ANÁLISE E INSIGHTS ===

// GET /api/users/:userId/statistics/predictive-analysis - Análise preditiva
router.get('/:userId/statistics/predictive-analysis', 
  userStatisticsController.generatePredictiveAnalysis.bind(userStatisticsController)
);

// GET /api/users/:userId/statistics/recommendations - Recomendações inteligentes
router.get('/:userId/statistics/recommendations', 
  userStatisticsController.generateRecommendations.bind(userStatisticsController)
);

// GET /api/users/:userId/statistics/insights - Insights personalizados
router.get('/:userId/statistics/insights', 
  userStatisticsController.getPersonalizedInsights.bind(userStatisticsController)
);

// === ROTAS DE PADRÕES E MÉTRICAS ===

// GET /api/users/:userId/statistics/study-pattern - Identificar padrão de estudo
router.get('/:userId/statistics/study-pattern', 
  userStatisticsController.getStudyPattern.bind(userStatisticsController)
);

// GET /api/users/:userId/statistics/efficiency - Calcular eficiência de estudo
router.get('/:userId/statistics/efficiency', 
  userStatisticsController.getStudyEfficiency.bind(userStatisticsController)
);

// GET /api/users/:userId/statistics/mastery/:filterId - Calcular mastery de tópico
router.get('/:userId/statistics/mastery/:filterId', 
  userStatisticsController.getTopicMastery.bind(userStatisticsController)
);

// === ROTAS DE COMPARAÇÃO E RANKINGS ===

// GET /api/users/:userId/statistics/rankings - Obter rankings
router.get('/:userId/statistics/rankings', 
  userStatisticsController.getUserRankings.bind(userStatisticsController)
);

// GET /api/users/:userId/statistics/knowledge-gaps - Identificar gaps de conhecimento
router.get('/:userId/statistics/knowledge-gaps', 
  userStatisticsController.getKnowledgeGaps.bind(userStatisticsController)
);

// === ROTAS UTILITÁRIAS ===

// GET /api/users/:userId/statistics/export - Exportar dados
router.get('/:userId/statistics/export', 
  userStatisticsController.exportAnalytics.bind(userStatisticsController)
);

// POST /api/users/:userId/statistics/recalculate - Recalcular métricas
router.post('/:userId/statistics/recalculate', 
  userStatisticsController.recalculateMetrics.bind(userStatisticsController)
);

export default router; 