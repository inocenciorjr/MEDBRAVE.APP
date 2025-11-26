import { Router } from 'express';
import { SimulatedExamController } from '../controllers/SimulatedExamController';
import { enhancedAuthMiddleware } from '../../auth/middleware/enhancedAuth.middleware';
import { checkSimulatedExamsPerMonthLimit } from '../../auth/middleware/usageMiddlewares';

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
    enhancedAuthMiddleware,
    checkSimulatedExamsPerMonthLimit as any,
    controller.createSimulatedExam.bind(controller),
  );
  router.put(
    '/:id',
    enhancedAuthMiddleware,
    controller.updateSimulatedExam.bind(controller),
  );
  router.delete(
    '/:id',
    enhancedAuthMiddleware,
    controller.deleteSimulatedExam.bind(controller),
  );

  // Rotas específicas DEVEM vir ANTES das rotas com parâmetros dinâmicos
  // Rotas sem userId no path (usa o usuário autenticado)
  router.get(
    '/my',
    enhancedAuthMiddleware,
    controller.listUserSimulatedExams.bind(controller),
  );
  router.get(
    '/my/results',
    enhancedAuthMiddleware,
    controller.listUserSimulatedExamResults.bind(controller),
  );
  router.get(
    '/my/statistics',
    enhancedAuthMiddleware,
    controller.getUserSimulatedExamStatistics.bind(controller),
  );

  // Resultados e estatísticas
  router.get(
    '/results/:id',
    enhancedAuthMiddleware,
    controller.getSimulatedExamResult.bind(controller),
  );
  router.get(
    '/user/:userId/results',
    enhancedAuthMiddleware,
    controller.listUserSimulatedExamResults.bind(controller),
  );
  router.get(
    '/user/:userId/statistics',
    enhancedAuthMiddleware,
    controller.getUserSimulatedExamStatistics.bind(controller),
  );

  // Funcionalidade de realização de simulado
  router.post(
    '/:id/start',
    enhancedAuthMiddleware,
    controller.startSimulatedExam.bind(controller),
  );
  router.post(
    '/answer',
    enhancedAuthMiddleware,
    controller.submitAnswer.bind(controller),
  );
  router.patch(
    '/results/:id/answers',
    enhancedAuthMiddleware,
    controller.updateSimulatedExamAnswer.bind(controller),
  );
  router.post(
    '/finish',
    enhancedAuthMiddleware,
    controller.finishSimulatedExam.bind(controller),
  );

  // Rotas para usuários
  // Busca e listagem de simulados (DEVE vir por último)
  router.get(
    '/:id',
    enhancedAuthMiddleware,
    controller.getSimulatedExamById.bind(controller),
  );

  return router;
}
