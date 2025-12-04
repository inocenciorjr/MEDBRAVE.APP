import { Router, Request, Response } from 'express';
import { SupabaseClient } from '@supabase/supabase-js';
import { WordSearchService } from '../services/WordSearchService';

export function createWordSearchRoutes(supabase: SupabaseClient): Router {
  const router = Router();
  const service = new WordSearchService(supabase);

  // Obter puzzle do dia (metadados públicos)
  router.get('/daily-puzzle', async (_req: Request, res: Response) => {
    try {
      const puzzle = await service.getTodayPuzzle();
      res.json({
        success: true,
        data: {
          id: puzzle.id,
          date: puzzle.date,
          title: puzzle.title,
          contextText: puzzle.contextText,
          words: puzzle.words,
          grid: puzzle.grid,
          gridSize: puzzle.gridSize,
          totalWords: puzzle.words.length,
        },
      });
    } catch (error: any) {
      console.error('Erro ao obter puzzle do dia:', error);
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

      const { game, puzzle } = await service.startGame(userId);
      
      res.json({
        success: true,
        data: {
          game: {
            id: game.id,
            foundWords: game.foundWords,
            isCompleted: game.isCompleted,
            date: game.date,
            createdAt: game.createdAt,
            completedAt: game.completedAt,
          },
          puzzle: {
            id: puzzle.id,
            title: puzzle.title,
            contextText: puzzle.contextText,
            words: puzzle.words,
            grid: puzzle.grid,
            wordPositions: puzzle.wordPositions,
            gridSize: puzzle.gridSize,
          },
        },
      });
    } catch (error: any) {
      console.error('Erro ao iniciar jogo:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Encontrar palavra
  router.post('/find-word', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Não autenticado' });
      }

      const { word, startRow, startCol, endRow, endCol } = req.body;
      
      if (!word || startRow === undefined || startCol === undefined || 
          endRow === undefined || endCol === undefined) {
        return res.status(400).json({ 
          success: false, 
          error: 'Dados incompletos. Envie word, startRow, startCol, endRow, endCol' 
        });
      }

      const result = await service.findWord(userId, word, startRow, startCol, endRow, endCol);
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

  // Obter ranking diário
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
