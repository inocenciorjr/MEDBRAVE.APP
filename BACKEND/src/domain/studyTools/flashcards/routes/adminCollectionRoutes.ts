import { Router } from 'express';
import { supabaseAuthMiddleware as authMiddleware } from '../../../auth/middleware/supabaseAuth.middleware';
import { adminMiddleware } from '../../../auth/middleware/admin.middleware';
import { AdminCollectionController } from '../controllers/AdminCollectionController';

const router = Router();
const controller = new AdminCollectionController();

// Todas as rotas requerem autenticação + permissão de admin
router.use(authMiddleware, adminMiddleware);

// Marcar coleção como oficial
router.post('/mark-official/:collectionName', controller.markAsOfficial.bind(controller));

// Desmarcar coleção como oficial
router.post('/unmark-official/:collectionName', controller.unmarkAsOfficial.bind(controller));

// Listar coleções oficiais
router.get('/official-collections', controller.getOfficialCollections.bind(controller));

// Listar coleções oficiais públicas (para comunidade)
router.get('/community/official', controller.getOfficialPublicCollections.bind(controller));

export default router;
