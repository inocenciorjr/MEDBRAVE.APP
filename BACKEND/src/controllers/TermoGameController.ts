import { Request, Response } from 'express';
import { TermoGameService } from '../domain/studyTools/games/termo/services/TermoGameService';
import { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import '../types/express';

// Schemas de validação
const makeGuessSchema = z.object({
  guess: z.string().min(4).max(10)
});

const getRankingSchema = z.object({
  date: z.string().optional()
});

export class TermoGameController {
  private termoGameService: TermoGameService;

  constructor(supabase: SupabaseClient) {
    this.termoGameService = new TermoGameService(supabase);
  }

  async startGame(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const gameState = await this.termoGameService.startGame(userId);
      
      // Não retornar a palavra para o frontend
      const { word, ...gameStateWithoutWord } = gameState;
      
      return res.json({
        success: true,
        data: gameStateWithoutWord
      });
    } catch (error) {
      console.error('Erro ao iniciar jogo:', error);
      return res.status(400).json({ 
        error: error instanceof Error ? error.message : 'Erro interno do servidor' 
      });
    }
  }

  async makeGuess(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const validation = makeGuessSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: 'Dados inválidos',
          details: validation.error.errors
        });
      }

      const { guess } = validation.data;
      const result = await this.termoGameService.makeGuess(userId, guess);
      
      return res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Erro ao fazer tentativa:', error);
      return res.status(400).json({ 
        error: error instanceof Error ? error.message : 'Erro interno do servidor' 
      });
    }
  }

  async getUserStats(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const stats = await this.termoGameService.getUserStats(userId);
      
      return res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      return res.status(500).json({ 
        error: 'Erro interno do servidor' 
      });
    }
  }

  async getDailyRanking(req: Request, res: Response) {
    try {
      const validation = getRankingSchema.safeParse(req.query);
      if (!validation.success) {
        return res.status(400).json({ 
          error: 'Parâmetros inválidos',
          details: validation.error.errors
        });
      }

      const { date } = validation.data;
      const ranking = await this.termoGameService.getDailyRanking(date);
      
      return res.json({
        success: true,
        data: ranking
      });
    } catch (error) {
      console.error('Erro ao buscar ranking:', error);
      return res.status(500).json({ 
        error: 'Erro interno do servidor' 
      });
    }
  }

  async canUserPlay(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const canPlay = await this.termoGameService.canUserPlay(userId);
      
      return res.json({
        success: true,
        data: canPlay
      });
    } catch (error) {
      console.error('Erro ao verificar se usuário pode jogar:', error);
      return res.status(500).json({ 
        error: 'Erro interno do servidor' 
      });
    }
  }

  async getCurrentGame(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const gameState = await this.termoGameService.getCurrentGame(userId);
      
      if (!gameState) {
        return res.json({
          success: true,
          data: null
        });
      }
      
      // Não retornar a palavra para o frontend
      const { word, ...gameStateWithoutWord } = gameState;
      
      return res.json({
        success: true,
        data: gameStateWithoutWord
      });
    } catch (error) {
      console.error('Erro ao buscar jogo atual:', error);
      return res.status(400).json({ 
        error: error instanceof Error ? error.message : 'Erro interno do servidor' 
      });
    }
  }

  async getTodayWord(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      // Buscar palavra do dia usando o método público do service
      const todayWord = await this.termoGameService.getTodayWord();
      
      if (!todayWord) {
        return res.status(404).json({ error: 'Palavra do dia não encontrada' });
      }
      
      // Retornar apenas o comprimento da palavra
      return res.json({
        success: true,
        data: {
          wordLength: todayWord.word.length
        }
      });
    } catch (error) {
      console.error('Erro ao buscar palavra do dia:', error);
      return res.status(500).json({ 
        error: 'Erro interno do servidor' 
      });
    }
  }

  async getCorrectWord(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const correctWord = await this.termoGameService.getCorrectWordForCompletedGame(userId);
      
      if (!correctWord) {
        return res.status(404).json({ error: 'Jogo não finalizado ou não encontrado' });
      }
      
      return res.json({
        success: true,
        data: {
          word: correctWord
        }
      });
    } catch (error) {
      console.error('Erro ao buscar palavra correta:', error);
      return res.status(500).json({ 
        error: 'Erro interno do servidor' 
      });
    }
  }
}