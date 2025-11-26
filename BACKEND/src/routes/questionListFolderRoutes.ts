import { Router } from 'express';
import { enhancedAuthMiddleware } from '../domain/auth/middleware/enhancedAuth.middleware';
import { requireFeature } from '../domain/auth/middleware/enhancedAuth.middleware';
import questionListFolderController from '../controllers/QuestionListFolderController';

const router = Router();

// Todas as rotas requerem autenticação + plano
router.use(enhancedAuthMiddleware as any);

// GET /api/banco-questoes/folders - Lista pastas do usuário
router.get('/folders', (req, res) => questionListFolderController.listFolders(req as any, res));

// POST /api/banco-questoes/folders - Cria nova pasta (requer listas customizadas)
router.post('/folders', requireFeature('canCreateCustomLists') as any, (req, res) => questionListFolderController.createFolder(req as any, res));

// PUT /api/banco-questoes/folders/:folderId - Atualiza pasta
router.put('/folders/:folderId', (req, res) => questionListFolderController.updateFolder(req as any, res));

// DELETE /api/banco-questoes/folders/:folderId - Deleta pasta
router.delete('/folders/:folderId', (req, res) => questionListFolderController.deleteFolder(req as any, res));

export default router;
