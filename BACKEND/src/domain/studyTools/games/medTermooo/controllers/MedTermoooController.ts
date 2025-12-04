import { Router, Request, Response } from 'express';
import { SupabaseClient } from '@supabase/supabase-js';
import { MedTermoooService } from '../services/MedTermoooService';

export function createMedTermoooRoutes(supabase: SupabaseClient): Router {
  const router = Router();
  const service = new MedTermoooService(supabase);

  // Obter palavra do dia (apenas metadados, não a palavra em si)
  router.get('/daily-word', async (_req: Request, res: Response) => {
    try {
      const word = await service.getTodayWord();
      res.json({
        success: true,
        data: {
          date: word.date,
          length: word.length,
          category: word.category,
          hint: word.hint,
        },
      });
    } catch (error: any) {
      console.error('Erro ao obter palavra do dia:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Verificar se pode jogar hoje
  router.get('/can-play', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Não autenticado' });
      }

      const result = await service.canPlayToday(userId);
      res.json({ success: true, data: result });
    } catch (error: any) {
      console.error('Erro ao verificar se pode jogar:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Iniciar ou continuar jogo
  router.post('/start', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Não autenticado' });
      }

      const game = await service.startGame(userId);
      
      // Retornar a palavra apenas se o jogo já está completo (para mostrar as cores)
      res.json({
        success: true,
        data: {
          id: game.id,
          wordLength: game.wordLength,
          guesses: game.guesses,
          isCompleted: game.isCompleted,
          isWon: game.isWon,
          attempts: game.attempts,
          date: game.date,
          createdAt: game.createdAt,
          completedAt: game.completedAt,
          // Retorna a palavra apenas quando o jogo está completo
          ...(game.isCompleted && { word: game.word }),
        },
      });
    } catch (error: any) {
      console.error('Erro ao iniciar jogo:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Fazer palpite
  router.post('/guess', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Não autenticado' });
      }

      const { guess } = req.body;
      if (!guess) {
        return res.status(400).json({ success: false, error: 'Palpite não informado' });
      }

      const result = await service.makeGuess(userId, guess);
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // Obter estatísticas do usuário
  router.get('/stats', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Não autenticado' });
      }

      const stats = await service.getStats(userId);
      res.json({ success: true, data: stats });
    } catch (error: any) {
      console.error('Erro ao obter estatísticas:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Obter ranking diário (top 10)
  router.get('/ranking', async (_req: Request, res: Response) => {
    try {
      const ranking = await service.getDailyRanking();
      res.json({ success: true, data: ranking });
    } catch (error: any) {
      console.error('Erro ao obter ranking:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
}
