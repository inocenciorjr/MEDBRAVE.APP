import { Request, Response, Router } from 'express';
import { SchulteGameService } from '../services/SchulteGameService';
import { supabase } from '../../../../../config/supabase';

const router = Router();
const service = new SchulteGameService(supabase);

// Iniciar novo jogo
router.post('/start', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }
    const { gridSize, isInverse } = req.body;
    const game = await service.startGame(userId, gridSize, isInverse);
    return res.json(game);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Completar jogo
router.post('/:id/complete', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }
    const { id } = req.params;
    const { timeTaken } = req.body;

    // Accept decimals from client; service will convert to centiseconds for DB
    const parsedTime = Math.max(0, Number(timeTaken));

    const game = await service.completeGame(id, parsedTime, userId);
    return res.json(game);
  } catch (error: any) {
    console.error('[Schulte] Error completing game:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Obter stats do usuário
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }
    const stats = await service.getUserStats(userId);
    return res.json(stats);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Obter ranking
router.get('/ranking', async (req: Request, res: Response) => {
  try {
    const { gridSize, isInverse, limit } = req.query;
    const ranking = await service.getRanking(Number(gridSize), isInverse === 'true', Number(limit) || 10);
    res.json(ranking);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Obter melhor tempo do usuário para grid específico
router.get('/best-time', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }
    const { gridSize, isInverse } = req.query;
    const bestTime = await service.getUserBestTime(userId, Number(gridSize), isInverse === 'true');
    return res.json({ bestTime });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
