import { Router } from 'express';
import { AuditLogController } from '../controllers/AuditLogController';
import { enhancedAuthMiddleware } from '../../auth/middleware/enhancedAuth.middleware';
import { adminMiddleware } from '../../auth/middleware/role.middleware';

/**
 * Cria as rotas para o módulo de auditoria
 * @param controller Controlador de logs de auditoria
 * @returns Router com as rotas configuradas
 */
export function createAuditLogRoutes(controller: AuditLogController): Router {
  const router = Router();

  // Aplicar middleware de autenticação + plano em todas as rotas
  router.use(enhancedAuthMiddleware);

  // Aplicar middleware de administrador em todas as rotas (logs são visíveis apenas para admins)
  router.use(adminMiddleware);

  // Registrar ação
  router.post('/', controller.logAction.bind(controller));

  // Obter logs com filtros e paginação
  router.get('/', controller.getAuditLogs.bind(controller));

  // Obter logs por usuário
  router.get('/user/:userId', controller.getActionsByUser.bind(controller));

  // Obter logs por tipo de ação
  router.get('/type/:actionType', controller.getActionsByType.bind(controller));

  return router;
}
