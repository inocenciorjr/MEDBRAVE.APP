import { Router } from 'express';
import { DeviceController } from '../controllers/DeviceController';
import { supabaseAuthMiddleware as authMiddleware } from '../../auth/middleware/supabaseAuth.middleware';
import { adminMiddleware } from '../../admin/middlewares/adminMiddleware';
import { selfMiddleware } from '../../auth/middleware/self.middleware';

export function createDeviceRoutes(controller: DeviceController): Router {
  const router = Router();

  // Middleware de autenticação para todas as rotas
  router.use(authMiddleware);

  // Rotas para gerenciamento de dispositivos
  router.post('/', controller.registerDevice.bind(controller));
  router.get('/my', controller.getMyDevices.bind(controller));
  router.get('/:id', controller.getDeviceById.bind(controller));
  router.put('/:id', selfMiddleware, controller.updateDevice.bind(controller));
  router.put(
    '/:id/token',
    selfMiddleware,
    controller.updateDeviceToken.bind(controller),
  );
  router.delete(
    '/:id',
    selfMiddleware,
    controller.deleteDevice.bind(controller),
  );

  // Rotas administrativas
  router.get('/', adminMiddleware, controller.getAllDevices.bind(controller));

  return router;
}
