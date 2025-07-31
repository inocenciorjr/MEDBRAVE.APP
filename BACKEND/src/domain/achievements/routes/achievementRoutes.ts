import { Router } from 'express';
import { AchievementController } from '../controllers/AchievementController';
import { authMiddleware } from '../../auth/middleware/auth.middleware';

/**
 * Cria as rotas para o sistema de conquistas
 */
export const createAchievementRoutes = (achievementController: AchievementController): Router => {
  const router = Router();

  // === ROTAS PÚBLICAS (sem autenticação) ===
  
  // Obter todas as conquistas ativas
  router.get('/', achievementController.getAllAchievements.bind(achievementController));
  
  // Obter conquista específica
  router.get('/:id', achievementController.getAchievementById.bind(achievementController));
  
  // Leaderboards públicos
  router.get('/leaderboard/global', achievementController.getGlobalLeaderboard.bind(achievementController));
  router.get('/leaderboard/category/:category', achievementController.getCategoryLeaderboard.bind(achievementController));
  router.get('/leaderboard/weekly', achievementController.getWeeklyLeaderboard.bind(achievementController));
  
  // Configurações públicas
  router.get('/config', achievementController.getConfig.bind(achievementController));

  // === ROTAS PROTEGIDAS (com autenticação) ===
  
  // Conquistas do usuário
  router.get('/user/:userId', authMiddleware, achievementController.getUserAchievements.bind(achievementController));
  router.get('/user/:userId/stats', authMiddleware, achievementController.getUserAchievementStats.bind(achievementController));
  router.get('/user/:userId/ranking', authMiddleware, achievementController.getUserRanking.bind(achievementController));
  
  // Recompensas
  router.get('/user/:userId/pending-rewards', authMiddleware, achievementController.getPendingRewards.bind(achievementController));
  router.post('/user/:userId/collect/:achievementId', authMiddleware, achievementController.collectRewards.bind(achievementController));
  
  // Notificações
  router.get('/user/:userId/notifications', authMiddleware, achievementController.getUserNotifications.bind(achievementController));
  router.put('/notifications/:notificationId/read', authMiddleware, achievementController.markNotificationAsRead.bind(achievementController));
  router.put('/user/:userId/notifications/read-all', authMiddleware, achievementController.markAllNotificationsAsRead.bind(achievementController));
  
  // IA e Análises
  router.get('/user/:userId/suggestions', authMiddleware, achievementController.generateAchievementSuggestions.bind(achievementController));
  router.get('/user/:userId/patterns', authMiddleware, achievementController.analyzeUserAchievementPatterns.bind(achievementController));
  router.get('/user/:userId/progress-report', authMiddleware, achievementController.generateProgressReport.bind(achievementController));
  
  // Verificação manual de conquistas
  router.post('/check', authMiddleware, achievementController.checkAchievements.bind(achievementController));
  
  // === ROTAS ADMINISTRATIVAS ===
  
  // Métricas administrativas (requer permissão de admin)
  router.get('/admin/metrics', authMiddleware, achievementController.getAdminMetrics.bind(achievementController));

  return router;
}; 