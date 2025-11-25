import { Router } from 'express';
import { OfficialExamController } from '../controllers/OfficialExamController';
import { supabaseAuthMiddleware as authMiddleware } from '../../auth/middleware/supabaseAuth.middleware';
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

  // Public/authenticated routes
  router.get('/', authMiddleware, (req, res, next) =>
    controller.list(req, res, next)
  );

  router.get('/:id', authMiddleware, (req, res, next) =>
    controller.getById(req, res, next)
  );

  router.post('/:id/start', authMiddleware, (req, res, next) =>
    controller.startAttempt(req, res, next)
  );

  router.get('/:id/attempts', authMiddleware, (req, res, next) =>
    controller.getUserAttempts(req, res, next)
  );

  // Admin-only routes
  router.post('/bulk-create', authMiddleware, adminMiddleware, (req, res, next) =>
    controller.bulkCreate(req, res, next)
  );

  router.put('/:id', authMiddleware, adminMiddleware, (req, res, next) =>
    controller.update(req, res, next)
  );

  router.post('/:id/publish', authMiddleware, adminMiddleware, (req, res, next) =>
    controller.publish(req, res, next)
  );

  router.delete('/:id', authMiddleware, adminMiddleware, (req, res, next) =>
    controller.delete(req, res, next)
  );

  return router;
};
