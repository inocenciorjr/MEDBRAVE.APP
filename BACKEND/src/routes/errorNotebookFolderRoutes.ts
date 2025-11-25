import { Router, Request, Response } from 'express';
import errorNotebookFolderService from '../services/errorNotebookFolderService';
import { supabaseAuthMiddleware } from '../domain/auth/middleware/supabaseAuth.middleware';

const router = Router();

// Aplicar middleware de autenticação em todas as rotas
router.use(supabaseAuthMiddleware);

// GET /api/error-notebook-folders - Listar pastas do usuário
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const folders = await errorNotebookFolderService.listUserFolders(userId);
    return res.json(folders);
  } catch (error) {
    console.error('Erro ao listar pastas:', error);
    return res.status(500).json({ error: 'Erro ao listar pastas' });
  }
});

// GET /api/error-notebook-folders/:id - Obter pasta específica
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const folder = await errorNotebookFolderService.getFolderById(req.params.id, userId);
    if (!folder) {
      return res.status(404).json({ error: 'Pasta não encontrada' });
    }

    return res.json(folder);
  } catch (error) {
    console.error('Erro ao buscar pasta:', error);
    return res.status(500).json({ error: 'Erro ao buscar pasta' });
  }
});

// POST /api/error-notebook-folders - Criar nova pasta
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const folder = await errorNotebookFolderService.createFolder(userId, req.body);
    return res.status(201).json(folder);
  } catch (error) {
    console.error('Erro ao criar pasta:', error);
    return res.status(500).json({ error: 'Erro ao criar pasta' });
  }
});

// PUT /api/error-notebook-folders/:id - Atualizar pasta
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const folder = await errorNotebookFolderService.updateFolder(req.params.id, userId, req.body);
    return res.json(folder);
  } catch (error) {
    console.error('Erro ao atualizar pasta:', error);
    return res.status(500).json({ error: 'Erro ao atualizar pasta' });
  }
});

// DELETE /api/error-notebook-folders/:id - Deletar pasta
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    await errorNotebookFolderService.deleteFolder(req.params.id, userId);
    return res.status(204).send();
  } catch (error) {
    console.error('Erro ao deletar pasta:', error);
    return res.status(500).json({ error: 'Erro ao deletar pasta' });
  }
});

// POST /api/error-notebook-folders/update-counts - Atualizar contagens
router.post('/update-counts', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    await errorNotebookFolderService.updateFolderEntryCounts(userId);
    return res.json({ success: true });
  } catch (error) {
    console.error('Erro ao atualizar contagens:', error);
    return res.status(500).json({ error: 'Erro ao atualizar contagens' });
  }
});

export default router;
