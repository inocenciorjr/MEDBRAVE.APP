import { Router, Response } from 'express';
import { MentorProgramService } from '../services/MentorProgramService';
import { enhancedAuthMiddleware, requireFeature } from '../../auth/middleware/enhancedAuth.middleware';
import { authenticate, isMentor } from '../middlewares/authMiddleware';

const router = Router();
const programService = new MentorProgramService();

// Middleware de autenticação para todas as rotas
router.use(enhancedAuthMiddleware as any);
router.use(requireFeature('canAccessMentorship') as any);

/**
 * GET /api/mentorship/programs
 * Lista programas do mentor autenticado
 */
router.get('/', authenticate, isMentor, async (req: any, res: Response) => {
  try {
    const mentorId = req.user?.id;
    if (!mentorId) {
      return res.status(401).json({ success: false, error: 'Não autorizado' });
    }

    const programs = await programService.getMentorPrograms(mentorId);
    res.json({ success: true, data: programs });
  } catch (error: any) {
    console.error('Erro ao listar programas:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/mentorship/programs
 * Cria um novo programa
 */
router.post('/', authenticate, isMentor, async (req: any, res: Response) => {
  try {
    const mentorId = req.user?.id;
    if (!mentorId) {
      return res.status(401).json({ success: false, error: 'Não autorizado' });
    }

    const program = await programService.createProgram(mentorId, req.body);
    res.status(201).json({ success: true, data: program });
  } catch (error: any) {
    console.error('Erro ao criar programa:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/mentorship/programs/public/list
 * Lista programas públicos aprovados (DEVE VIR ANTES DE /:id)
 */
router.get('/public/list', async (_req: any, res: Response) => {
  try {
    const programs = await programService.getPublicPrograms();
    res.json({ success: true, data: programs });
  } catch (error: any) {
    console.error('Erro ao listar programas públicos:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/mentorship/programs/:id
 * Obtém detalhes de um programa
 */
router.get('/:id', authenticate, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const program = await programService.getProgramById(id);
    
    if (!program) {
      return res.status(404).json({ success: false, error: 'Programa não encontrado' });
    }

    res.json({ success: true, data: program });
  } catch (error: any) {
    console.error('Erro ao buscar programa:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/mentorship/programs/:id
 * Atualiza um programa
 */
router.put('/:id', authenticate, isMentor, async (req: any, res: Response) => {
  try {
    const mentorId = req.user?.id;
    const { id } = req.params;

    if (!mentorId) {
      return res.status(401).json({ success: false, error: 'Não autorizado' });
    }

    const program = await programService.updateProgram(id, mentorId, req.body);
    res.json({ success: true, data: program });
  } catch (error: any) {
    console.error('Erro ao atualizar programa:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/mentorship/programs/:id
 * Deleta um programa (apenas rascunhos)
 */
router.delete('/:id', authenticate, isMentor, async (req: any, res: Response) => {
  try {
    const mentorId = req.user?.id;
    const { id } = req.params;

    if (!mentorId) {
      return res.status(401).json({ success: false, error: 'Não autorizado' });
    }

    await programService.deleteProgram(id, mentorId);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao deletar programa:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/mentorship/programs/:id/submit
 * Submete programa para aprovação
 */
router.post('/:id/submit', authenticate, isMentor, async (req: any, res: Response) => {
  try {
    const mentorId = req.user?.id;
    const { id } = req.params;

    if (!mentorId) {
      return res.status(401).json({ success: false, error: 'Não autorizado' });
    }

    const program = await programService.submitForApproval(id, mentorId);
    res.json({ success: true, data: program });
  } catch (error: any) {
    console.error('Erro ao submeter programa:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});


/**
 * POST /api/mentorship/programs/:id/activate
 * Ativa um programa aprovado
 */
router.post('/:id/activate', authenticate, isMentor, async (req: any, res: Response) => {
  try {
    const mentorId = req.user?.id;
    const { id } = req.params;

    if (!mentorId) {
      return res.status(401).json({ success: false, error: 'Não autorizado' });
    }

    const program = await programService.activateProgram(id, mentorId);
    res.json({ success: true, data: program });
  } catch (error: any) {
    console.error('Erro ao ativar programa:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/mentorship/programs/:id/close
 * Encerra um programa
 */
router.post('/:id/close', authenticate, isMentor, async (req: any, res: Response) => {
  try {
    const mentorId = req.user?.id;
    const { id } = req.params;

    if (!mentorId) {
      return res.status(401).json({ success: false, error: 'Não autorizado' });
    }

    const program = await programService.closeProgram(id, mentorId);
    res.json({ success: true, data: program });
  } catch (error: any) {
    console.error('Erro ao encerrar programa:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
