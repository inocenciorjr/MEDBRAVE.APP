import { Router } from 'express';
import { supabaseAuthMiddleware as authMiddleware } from '../domain/auth/middleware/supabaseAuth.middleware';
import questionListFolderController from '../controllers/QuestionListFolderController';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authMiddleware as any);

// GET /api/banco-questoes/folders - Lista pastas do usuário
router.get('/folders', (req, res) => questionListFolderController.listFolders(req as any, res));

// POST /api/banco-questoes/folders - Cria nova pasta
router.post('/folders', (req, res) => questionListFolderController.createFolder(req as any, res));

// PUT /api/banco-questoes/folders/:folderId - Atualiza pasta
router.put('/folders/:folderId', (req, res) => questionListFolderController.updateFolder(req as any, res));

// DELETE /api/banco-questoes/folders/:folderId - Deleta pasta
router.delete('/folders/:folderId', (req, res) => questionListFolderController.deleteFolder(req as any, res));

export default router;
