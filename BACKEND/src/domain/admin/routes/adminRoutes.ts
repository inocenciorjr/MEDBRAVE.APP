import { Router } from 'express';
import { AdminController } from '../controllers/AdminController';
import { AdminUserController } from '../controllers/AdminUserController';
import { adminMiddleware } from '../../auth/middleware/admin.middleware';
import { enhancedAuthMiddleware } from '../../auth/middleware/enhancedAuth.middleware';
// import { firestore } from 'firebase-admin';
// import { authMiddleware } from '../../../shared/middlewares/authMiddleware';
// import { adminMiddleware } from '../../../shared/middlewares/adminMiddleware';

export function createAdminRoutes(
  controller: AdminController,
  userController: AdminUserController,
): Router {
  const router = Router();

  // Middleware de autenticação + plano (deve vir ANTES do adminMiddleware)
  router.use(enhancedAuthMiddleware);

  // Middleware para garantir que apenas administradores acessem essas rotas
  router.use(adminMiddleware);

  // Rotas de dashboard (DEVEM VIR ANTES DAS ROTAS COM :id)
  router.get('/dashboard/stats', controller.getDashboardStats.bind(controller));

  // Rotas de auditoria (DEVEM VIR ANTES DAS ROTAS COM :id)
  router.get('/audit/logs', controller.getAuditLogs.bind(controller));

  // ==========================================
  // ROTAS DE GERENCIAMENTO DE USUÁRIOS
  // ==========================================
  
  // Rotas de busca e exportação (DEVEM VIR ANTES DAS ROTAS COM :id)
  router.get('/users/search', userController.searchUsers.bind(userController));
  router.get('/users/export', userController.exportUsers.bind(userController));
  router.post('/users/bulk-update', userController.bulkUpdate.bind(userController));

  // Rotas de listagem e CRUD
  router.get('/users', userController.listUsers.bind(userController));
  router.get('/users/:id', userController.getUserById.bind(userController));
  router.put('/users/:id', userController.updateUser.bind(userController));
  router.delete('/users/:id', userController.deleteUser.bind(userController));

  // Rotas de ações sobre usuários
  router.post('/users/:id/suspend', userController.suspendUser.bind(userController));
  router.post('/users/:id/activate', userController.activateUser.bind(userController));
  router.post('/users/:id/ban', userController.banUser.bind(userController));
  router.put('/users/:id/role', userController.updateUserRole.bind(userController));
  router.post('/users/:id/terminate-sessions', userController.terminateSessions.bind(userController));
  router.delete('/users/:id/sessions/:sessionId', userController.terminateSession.bind(userController));
  router.post('/users/:id/send-email', userController.sendEmail.bind(userController));

  // Rotas de informações do usuário
  router.get('/users/:id/logs', userController.getUserLogs.bind(userController));
  router.get('/users/:id/plans', userController.getUserPlans.bind(userController));
  router.get('/users/:id/statistics', userController.getUserStatistics.bind(userController));
  router.get('/users/:id/sessions', userController.getUserSessions.bind(userController));
  router.get('/users/:id/notes', userController.getUserNotes.bind(userController));
  router.post('/users/:id/notes', userController.addUserNote.bind(userController));
  
  // Rotas de segurança e monitoramento
  router.get('/users/:id/security-analysis', userController.getUserSecurityAnalysis.bind(userController));
  router.get('/users/:id/ip-location/:ip', userController.getIPLocation.bind(userController));
  router.get('/security/scan', userController.scanAllUsersForSuspiciousActivity.bind(userController));
  
  // Rotas de presença em tempo real (serão adicionadas quando PresenceController for integrado)
  // router.get('/presence/online', presenceController.getOnlineUsers.bind(presenceController));
  // router.get('/presence/users/:userId', presenceController.getUserPresence.bind(presenceController));
  // router.get('/presence/stats', presenceController.getPresenceStats.bind(presenceController));
  // router.post('/presence/users/:userId/disconnect', presenceController.disconnectUser.bind(presenceController));

  // ==========================================
  // ROTAS DE ADMINISTRADORES
  // ==========================================
  
  // Rotas de administradores
  router.get('/', controller.getAdmins.bind(controller));
  router.get('/:id', (req, res, next) => {
    // Validar se o ID é um UUID válido
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(req.params.id)) {
      return res.status(404).json({ error: 'Recurso não encontrado' });
    }
    return controller.getAdminById(req, res, next);
  });
  router.post('/', controller.createAdmin.bind(controller));
  router.put('/:id', controller.updateAdmin.bind(controller));
  router.delete('/:id', controller.deleteAdmin.bind(controller));

  // Rotas de alteração de role (apenas admin pode alterar role de outros usuários)
  router.put('/:id/role', (req, res) => {
    if (req.user?.user_role !== 'ADMIN') {
      return res.status(403).json({
        error:
          'Apenas administradores podem alterar a role de outros usuários.',
      });
    }
    const { role } = req.body;
    if (!role) {
      return res.status(400).json({ error: 'Role é obrigatória.' });
    }
    // Aqui implementaria a lógica para atualizar a role do usuário no Firestore
    // Por enquanto, apenas resposta simulada
    return res.status(200).json({
      message: 'Role atualizada com sucesso',
      user: {
        id: req.params.id,
        role,
      },
    });
  });

  return router;
}
