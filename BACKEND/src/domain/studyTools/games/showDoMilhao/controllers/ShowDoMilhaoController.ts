import { Router, Request, Response } from 'express';
import { SupabaseClient } from '@supabase/supabase-js';
import { ShowDoMilhaoService } from '../services/ShowDoMilhaoService';

export function createShowDoMilhaoRoutes(supabase: SupabaseClient): Router {
  const router = Router();
  const service = new ShowDoMilhaoService(supabase);

  // Iniciar novo jogo
  router.post('/start', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Não autenticado' });
      }

      const { filterIds, subFilterIds, institutionIds } = req.body;

      const game = await service.startGame(userId, {
        filterIds,
        subFilterIds,
        institutionIds,
      });

      res.json({ success: true, data: game });
    } catch (error: any) {
      console.error('Erro ao iniciar jogo:', error);
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // Obter jogo atual
  router.get('/current', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Não autenticado' });
      }

      const game = await service.getCurrentGame(userId);
      res.json({ success: true, data: game });
    } catch (error: any) {
      console.error('Erro ao obter jogo atual:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Obter questão atual
  router.get('/game/:gameId/question', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Não autenticado' });
      }

      const { gameId } = req.params;
      const question = await service.getCurrentQuestion(gameId);

      res.json({ success: true, data: question });
    } catch (error: any) {
      console.error('Erro ao obter questão:', error);
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // Responder questão
  router.post('/game/:gameId/answer', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Não autenticado' });
      }

      const { gameId } = req.params;
      const { selectedOptionId, timeSeconds } = req.body;

      if (!selectedOptionId) {
        return res.status(400).json({ success: false, error: 'Opção não selecionada' });
      }

      const result = await service.answerQuestion(userId, gameId, selectedOptionId, timeSeconds || 0);
      res.json({ success: true, data: result });
    } catch (error: any) {
      console.error('Erro ao responder:', error);
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // Parar jogo (levar prêmio)
  router.post('/game/:gameId/stop', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Não autenticado' });
      }

      const { gameId } = req.params;
      const result = await service.stopGame(userId, gameId);

      res.json({ success: true, data: result });
    } catch (error: any) {
      console.error('Erro ao parar jogo:', error);
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // Usar ajuda: Cartas
  router.post('/game/:gameId/help/cards', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Não autenticado' });
      }

      const { gameId } = req.params;
      const result = await service.useCards(userId, gameId);

      res.json({ success: true, data: result });
    } catch (error: any) {
      console.error('Erro ao usar cartas:', error);
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // Usar ajuda: Universitários
  router.post('/game/:gameId/help/university', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Não autenticado' });
      }

      const { gameId } = req.params;
      const result = await service.useUniversity(userId, gameId);

      res.json({ success: true, data: result });
    } catch (error: any) {
      console.error('Erro ao usar universitários:', error);
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // Usar ajuda: Pular
  router.post('/game/:gameId/help/skip', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Não autenticado' });
      }

      const { gameId } = req.params;
      const result = await service.useSkip(userId, gameId);

      res.json({ success: true, data: result });
    } catch (error: any) {
      console.error('Erro ao pular:', error);
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

  // Obter ranking mensal de milionários
  router.get('/ranking/millionaires', async (req: Request, res: Response) => {
    try {
      const { yearMonth } = req.query;
      const ranking = await service.getMonthlyMillionaires(yearMonth as string | undefined);
      res.json({ success: true, data: ranking });
    } catch (error: any) {
      console.error('Erro ao obter ranking de milionários:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Obter ranking do modo Fatality
  router.get('/ranking/fatality', async (_req: Request, res: Response) => {
    try {
      const ranking = await service.getFatalityRanking();
      res.json({ success: true, data: ranking });
    } catch (error: any) {
      console.error('Erro ao obter ranking fatality:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Obter ranking geral (all-time)
  router.get('/ranking/alltime', async (_req: Request, res: Response) => {
    try {
      const ranking = await service.getAllTimeRanking();
      res.json({ success: true, data: ranking });
    } catch (error: any) {
      console.error('Erro ao obter ranking all-time:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Obter histórico de jogos do usuário
  router.get('/history', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Não autenticado' });
      }

      const history = await service.getUserGameHistory(userId);
      res.json({ success: true, data: history });
    } catch (error: any) {
      console.error('Erro ao obter histórico:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
}
