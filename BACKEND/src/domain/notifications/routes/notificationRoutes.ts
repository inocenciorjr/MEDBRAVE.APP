import { Router } from 'express';
import { NotificationController } from '../controllers/NotificationController';
import { authMiddleware } from '../../auth/middleware/auth.middleware';
import { adminMiddleware } from '../../admin/middlewares/adminMiddleware';
import { selfMiddleware } from '../../auth/middleware/self.middleware';

export function createNotificationRoutes(controller: NotificationController): Router {
  const router = Router();

  // Middleware de autenticação para todas as rotas
  router.use(authMiddleware);

  // Rotas de notificações para usuários
  router.get('/', controller.getMyNotifications.bind(controller));
  router.get('/unread/count', controller.countUnreadNotifications.bind(controller));
  router.get('/:id', controller.getNotificationById.bind(controller));
  router.put('/:id/read', selfMiddleware, controller.markAsRead.bind(controller));
  router.put('/read-all', controller.markAllAsRead.bind(controller));
  router.delete('/:id', selfMiddleware, controller.deleteNotification.bind(controller));
  router.delete('/', controller.deleteAllNotifications.bind(controller));

  // Rotas administrativas
  router.post('/', controller.createNotification.bind(controller));
  router.post(
    '/bulk',
    adminMiddleware,
    controller.sendNotificationToMultipleUsers.bind(controller),
  );

  return router;
}
