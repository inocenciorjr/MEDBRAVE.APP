import { Router } from 'express';
import { OfficialExamController } from '../controllers/OfficialExamController';
import { enhancedAuthMiddleware } from '../../auth/middleware/enhancedAuth.middleware';
import { adminMiddleware } from '../../admin/middlewares/adminMiddleware';

/**
 * Creates official exam routes
 * @param controller Official exam controller instance
 * @returns Configured router
 */
export const createOfficialExamRoutes = (
  controller: OfficialExamController
): Router => {
  const router = Router();

  // Public/authenticated routes (requerem plano ativo)
  router.get('/', enhancedAuthMiddleware, (req, res, next) =>
    controller.list(req, res, next)
  );

  router.get('/:id', enhancedAuthMiddleware, (req, res, next) =>
    controller.getById(req, res, next)
  );

  router.post('/:id/start', enhancedAuthMiddleware, (req, res, next) =>
    controller.startAttempt(req, res, next)
  );

  router.get('/:id/attempts', enhancedAuthMiddleware, (req, res, next) =>
    controller.getUserAttempts(req, res, next)
  );

  // Admin-only routes (requerem plano + admin)
  router.post('/bulk-create', enhancedAuthMiddleware, adminMiddleware, (req, res, next) =>
    controller.bulkCreate(req, res, next)
  );

  router.put('/:id', enhancedAuthMiddleware, adminMiddleware, (req, res, next) =>
    controller.update(req, res, next)
  );

  router.post('/:id/publish', enhancedAuthMiddleware, adminMiddleware, (req, res, next) =>
    controller.publish(req, res, next)
  );

  router.delete('/:id', enhancedAuthMiddleware, adminMiddleware, (req, res, next) =>
    controller.delete(req, res, next)
  );

  return router;
};
