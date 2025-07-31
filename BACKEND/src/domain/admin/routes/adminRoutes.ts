import { Router } from 'express';
import { AdminController } from '../controllers/AdminController';
import { adminMiddleware } from '../../auth/middleware/admin.middleware';
import { authMiddleware } from '../../auth/middleware/auth.middleware';
// import { firestore } from 'firebase-admin';
// import { authMiddleware } from '../../../shared/middlewares/authMiddleware';
// import { adminMiddleware } from '../../../shared/middlewares/adminMiddleware';

export function createAdminRoutes(controller: AdminController): Router {
  const router = Router();

  // Middleware de autenticação (deve vir ANTES do adminMiddleware)
  router.use(authMiddleware);
  
  // Middleware para garantir que apenas administradores acessem essas rotas
  router.use(adminMiddleware);

  // Rotas de administradores
  router.get('/', controller.getAdmins.bind(controller));
  router.get('/:id', controller.getAdminById.bind(controller));
  router.post('/', controller.createAdmin.bind(controller));
  router.put('/:id', controller.updateAdmin.bind(controller));
  router.delete('/:id', controller.deleteAdmin.bind(controller));

  // Rotas de dashboard
  router.get('/dashboard/stats', controller.getDashboardStats.bind(controller));

  // Rotas de auditoria
  router.get('/audit/logs', controller.getAuditLogs.bind(controller));

  // Rotas de alteração de role (apenas admin pode alterar role de outros usuários)
  router.put('/:id/role', (req, res) => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Apenas administradores podem alterar a role de outros usuários.' });
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
        role
      }
    });
  });

  return router;
}
