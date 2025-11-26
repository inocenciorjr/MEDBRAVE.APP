import { Router } from 'express';
import { AchievementController } from '../controllers/AchievementController';
import { enhancedAuthMiddleware } from '../../auth/middleware/enhancedAuth.middleware';

/**
 * Cria as rotas para o sistema de conquistas
 */
export const createAchievementRoutes = (
  achievementController: AchievementController,
): Router => {
  const router = Router();

  // === ROTAS PÚBLICAS (sem autenticação) ===

  // Obter todas as conquistas ativas
  router.get(
    '/',
    achievementController.getAllAchievements.bind(achievementController),
  );

  // Obter conquista específica
  router.get(
    '/:id',
    achievementController.getAchievementById.bind(achievementController),
  );

  // Leaderboards públicos
  router.get(
    '/leaderboard/global',
    achievementController.getGlobalLeaderboard.bind(achievementController),
  );
  router.get(
    '/leaderboard/category/:category',
    achievementController.getCategoryLeaderboard.bind(achievementController),
  );
  router.get(
    '/leaderboard/weekly',
    achievementController.getWeeklyLeaderboard.bind(achievementController),
  );

  // Configurações públicas
  router.get(
    '/config',
    achievementController.getConfig.bind(achievementController),
  );

  // === ROTAS PROTEGIDAS (com autenticação) ===

  // Conquistas do usuário (requerem plano ativo)
  router.get(
    '/user/:userId',
    enhancedAuthMiddleware,
    achievementController.getUserAchievements.bind(achievementController),
  );
  router.get(
    '/user/:userId/stats',
    enhancedAuthMiddleware,
    achievementController.getUserAchievementStats.bind(achievementController),
  );
  router.get(
    '/user/:userId/ranking',
    enhancedAuthMiddleware,
    achievementController.getUserRanking.bind(achievementController),
  );

  // Recompensas (requerem plano ativo)
  router.get(
    '/user/:userId/pending-rewards',
    enhancedAuthMiddleware,
    achievementController.getPendingRewards.bind(achievementController),
  );
  router.post(
    '/user/:userId/collect/:achievementId',
    enhancedAuthMiddleware,
    achievementController.collectRewards.bind(achievementController),
  );

  // Notificações (requerem plano ativo)
  router.get(
    '/user/:userId/notifications',
    enhancedAuthMiddleware,
    achievementController.getUserNotifications.bind(achievementController),
  );
  router.put(
    '/notifications/:notificationId/read',
    enhancedAuthMiddleware,
    achievementController.markNotificationAsRead.bind(achievementController),
  );
  router.put(
    '/user/:userId/notifications/read-all',
    enhancedAuthMiddleware,
    achievementController.markAllNotificationsAsRead.bind(
      achievementController,
    ),
  );

  // IA e Análises (requerem plano ativo)
  router.get(
    '/user/:userId/suggestions',
    enhancedAuthMiddleware,
    achievementController.generateAchievementSuggestions.bind(
      achievementController,
    ),
  );
  router.get(
    '/user/:userId/patterns',
    enhancedAuthMiddleware,
    achievementController.analyzeUserAchievementPatterns.bind(
      achievementController,
    ),
  );
  router.get(
    '/user/:userId/progress-report',
    enhancedAuthMiddleware,
    achievementController.generateProgressReport.bind(achievementController),
  );

  // Verificação manual de conquistas (requer plano ativo)
  router.post(
    '/check',
    enhancedAuthMiddleware,
    achievementController.checkAchievements.bind(achievementController),
  );

  // === ROTAS ADMINISTRATIVAS ===

  // Métricas administrativas (requer permissão de admin + plano)
  router.get(
    '/admin/metrics',
    enhancedAuthMiddleware,
    achievementController.getAdminMetrics.bind(achievementController),
  );

  return router;
};
