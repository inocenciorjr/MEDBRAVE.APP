import { Request, Response } from 'express';
import { QuestionInteractionService } from '../services/QuestionInteractionService';
import { createClient } from '@supabase/supabase-js';

// Usar Request já aumentado globalmente

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const interactionService = new QuestionInteractionService(supabase);

export class QuestionInteractionController {
  /**
   * Toggle like/dislike
   */
  async toggleReaction(req: Request, res: Response) {
    try {
      const { questionId } = req.params;
      const { reactionType } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      if (!['like', 'dislike'].includes(reactionType)) {
        return res.status(400).json({ error: 'Tipo de reação inválido' });
      }

      const stats = await interactionService.toggleReaction(
        questionId,
        userId,
        reactionType
      );

      return res.json(stats);
    } catch (error) {
      console.error('Erro ao alternar reação:', error);
      return res.status(500).json({ error: 'Erro ao processar reação' });
    }
  }

  /**
   * Obter estatísticas de reações
   */
  async getReactionStats(req: Request, res: Response) {
    try {
      const { questionId } = req.params;
      const userId = req.user?.id;

      const stats = await interactionService.getReactionStats(questionId, userId);

      res.json(stats);
    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      res.status(500).json({ error: 'Erro ao obter estatísticas' });
    }
  }

  /**
   * Toggle voto de estilo
   */
  async toggleStyleVote(req: Request, res: Response) {
    try {
      const { questionId } = req.params;
      const { styleType } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const validStyles = [
        'conduta',
        'classificacao',
        'diagnostico',
        'decoreba',
        'tratamento',
        'prognostico',
        'epidemiologia',
        'fisiopatologia',
      ];

      if (!validStyles.includes(styleType)) {
        return res.status(400).json({ error: 'Tipo de estilo inválido' });
      }

      const stats = await interactionService.toggleStyleVote(
        questionId,
        userId,
        styleType
      );

      return res.json(stats);
    } catch (error) {
      console.error('Erro ao alternar voto de estilo:', error);
      return res.status(500).json({ error: 'Erro ao processar voto' });
    }
  }

  /**
   * Obter estatísticas de estilos
   */
  async getStyleStats(req: Request, res: Response) {
    try {
      const { questionId } = req.params;
      const userId = req.user?.id;

      const stats = await interactionService.getStyleStats(questionId, userId);

      res.json(stats);
    } catch (error) {
      console.error('Erro ao obter estatísticas de estilos:', error);
      res.status(500).json({ error: 'Erro ao obter estatísticas' });
    }
  }
}

export const questionInteractionController = new QuestionInteractionController();
