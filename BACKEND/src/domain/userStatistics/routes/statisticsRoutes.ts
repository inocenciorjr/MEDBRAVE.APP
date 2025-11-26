import { Router } from 'express';
import { enhancedAuthMiddleware } from '../../auth/middleware/enhancedAuth.middleware';
import { requireFeature } from '../../auth/middleware/enhancedAuth.middleware';
import { createStatisticsModule } from '../factories/createStatisticsModule';

/**
 * Rotas LIMPAS de estatísticas
 * Apenas endpoints essenciais
 */
const { statisticsController } = createStatisticsModule();

const router = Router();

// Middleware de autenticação + plano para todas as rotas
router.use(enhancedAuthMiddleware);

// === ROTAS PRINCIPAIS ===

// GET /api/statistics - Obter estatísticas do usuário
router.get('/', statisticsController.getUserStatistics);

// GET /api/statistics/with-comparison - Obter estatísticas com comparação (requer estatísticas avançadas)
router.get('/with-comparison', requireFeature('canAccessAdvancedStatistics') as any, statisticsController.getStatisticsWithComparison);

// DELETE /api/statistics - Deletar estatísticas
router.delete('/', statisticsController.deleteStatistics);

// POST /api/statistics/recalculate - Recalcular estatísticas
router.post('/recalculate', statisticsController.recalculateStatistics);

// POST /api/statistics/update-streak - Atualizar apenas o streak
router.post('/update-streak', statisticsController.updateStreakFromSessions);

// === ROTAS DE REGISTRO ===

// POST /api/statistics/question-answer - Registrar resposta de questão
router.post('/question-answer', statisticsController.recordQuestionAnswer);

// POST /api/statistics/study-time - Registrar tempo de estudo
router.post('/study-time', statisticsController.recordStudyTime);

// POST /api/statistics/flashcard - Registrar flashcard estudado
router.post('/flashcard', statisticsController.recordFlashcard);

// POST /api/statistics/review - Registrar revisão completada
router.post('/review', statisticsController.recordReview);

// PUT /api/statistics/streak - Atualizar streak
router.put('/streak', statisticsController.updateStreak);

// === ROTAS DE RANKINGS ===

// GET /api/statistics/rankings/accuracy - Ranking geral de acertos
router.get('/rankings/accuracy', statisticsController.getAccuracyRanking);

// GET /api/statistics/rankings/accuracy/:specialtyId - Ranking por especialidade
router.get(
  '/rankings/accuracy/:specialtyId',
  statisticsController.getSpecialtyAccuracyRanking,
);

// GET /api/statistics/rankings/questions - Ranking de questões
router.get('/rankings/questions', statisticsController.getQuestionsRanking);

// === ROTAS DE COMPARAÇÃO ===

// GET /api/statistics/comparison/:metric - Comparação de métrica específica
router.get('/comparison/:metric', statisticsController.getMetricComparison);

// === ROTAS DE DADOS ===

// GET /api/statistics/study-time - Obter dados de tempo de estudo por dia
router.get('/study-time', statisticsController.getStudyTimeData);

// === ROTAS DE COMPARAÇÕES GLOBAIS ===

// GET /api/statistics/global/accuracy-by-month - Média global de acertos por mês
router.get('/global/accuracy-by-month', statisticsController.getGlobalAccuracyByMonth);

// GET /api/statistics/global/accuracy-by-specialty - Média global por especialidade
router.get('/global/accuracy-by-specialty', statisticsController.getGlobalAccuracyBySpecialty);

// GET /api/statistics/global/accuracy-by-university - Média global por universidade
router.get('/global/accuracy-by-university', statisticsController.getGlobalAccuracyByUniversity);

// GET /api/statistics/global/questions-per-month - Média global de questões por mês
router.get('/global/questions-per-month', statisticsController.getGlobalQuestionsPerMonth);

// GET /api/statistics/user/questions-by-specialty - Questões do usuário por especialidade
router.get('/user/questions-by-specialty', statisticsController.getUserQuestionsBySpecialty);

// GET /api/statistics/user/questions-by-university - Questões do usuário por universidade
router.get('/user/questions-by-university', statisticsController.getUserQuestionsByUniversity);

// GET /api/statistics/user/questions-by-subspecialty - Questões do usuário por subespecialidade
router.get('/user/questions-by-subspecialty', statisticsController.getUserQuestionsBySubspecialty);

// GET /api/statistics/global/accuracy-by-subspecialty - Média global por subespecialidade
router.get('/global/accuracy-by-subspecialty', statisticsController.getGlobalAccuracyBySubspecialty);

export default router;
