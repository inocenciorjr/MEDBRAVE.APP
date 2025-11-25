import { Router } from 'express';
import { SimulatedExamController } from '../controllers/SimulatedExamController';
import { supabaseAuthMiddleware as authMiddleware } from '../../auth/middleware/supabaseAuth.middleware';

/**
 * Configura as rotas para o módulo de simulados
 * @param controller Instância do SimulatedExamController
 * @returns Router configurado
 */
export function simulatedExamRoutes(
  controller: SimulatedExamController,
): Router {
  const router = Router();

  // Rotas para usuários autenticados
  // Criação, edição e exclusão de simulados (qualquer usuário autenticado)
  router.post(
    '/',
    authMiddleware,
    controller.createSimulatedExam.bind(controller),
  );
  router.put(
    '/:id',
    authMiddleware,
    controller.updateSimulatedExam.bind(controller),
  );
  router.delete(
    '/:id',
    authMiddleware,
    controller.deleteSimulatedExam.bind(controller),
  );

  // Rotas específicas DEVEM vir ANTES das rotas com parâmetros dinâmicos
  // Rotas sem userId no path (usa o usuário autenticado)
  router.get(
    '/my',
    authMiddleware,
    controller.listUserSimulatedExams.bind(controller),
  );
  router.get(
    '/my/results',
    authMiddleware,
    controller.listUserSimulatedExamResults.bind(controller),
  );
  router.get(
    '/my/statistics',
    authMiddleware,
    controller.getUserSimulatedExamStatistics.bind(controller),
  );

  // Resultados e estatísticas
  router.get(
    '/results/:id',
    authMiddleware,
    controller.getSimulatedExamResult.bind(controller),
  );
  router.get(
    '/user/:userId/results',
    authMiddleware,
    controller.listUserSimulatedExamResults.bind(controller),
  );
  router.get(
    '/user/:userId/statistics',
    authMiddleware,
    controller.getUserSimulatedExamStatistics.bind(controller),
  );

  // Funcionalidade de realização de simulado
  router.post(
    '/:id/start',
    authMiddleware,
    controller.startSimulatedExam.bind(controller),
  );
  router.post(
    '/answer',
    authMiddleware,
    controller.submitAnswer.bind(controller),
  );
  router.patch(
    '/results/:id/answers',
    authMiddleware,
    controller.updateSimulatedExamAnswer.bind(controller),
  );
  router.post(
    '/finish',
    authMiddleware,
    controller.finishSimulatedExam.bind(controller),
  );

  // Rotas para usuários
  // Busca e listagem de simulados (DEVE vir por último)
  router.get(
    '/:id',
    authMiddleware,
    controller.getSimulatedExamById.bind(controller),
  );

  return router;
}
