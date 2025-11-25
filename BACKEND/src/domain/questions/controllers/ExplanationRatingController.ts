import { Request, Response } from 'express';
import { ExplanationRatingService } from '../services/ExplanationRatingService';
import { SupabaseClient } from '@supabase/supabase-js';
import logger from '../../../utils/logger';

export class ExplanationRatingController {
  private service: ExplanationRatingService;

  constructor(supabase: SupabaseClient) {
    this.service = new ExplanationRatingService(supabase);
  }

  /**
   * Criar ou atualizar avaliação de explicação
   */
  async rateExplanation(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Usuário não autenticado' });
        return;
      }

      const { question_id, rating } = req.body;

      if (!question_id || !rating) {
        res.status(400).json({ error: 'question_id e rating são obrigatórios' });
        return;
      }

      if (rating < 1 || rating > 5) {
        res.status(400).json({ error: 'Rating deve ser entre 1 e 5' });
        return;
      }

      const result = await this.service.rateExplanation(userId, question_id, rating);
      res.json(result);
    } catch (error) {
      logger.error('[ExplanationRatingController] Erro ao avaliar explicação:', error);
      res.status(500).json({ error: 'Erro ao avaliar explicação' });
    }
  }

  /**
   * Obter avaliações de uma questão
   */
  async getQuestionRatings(req: Request, res: Response): Promise<void> {
    try {
      const { questionId } = req.params;
      const userId = req.user?.id;

      if (!questionId) {
        res.status(400).json({ error: 'questionId é obrigatório' });
        return;
      }

      const ratings = await this.service.getQuestionRatings(questionId, userId);
      res.json(ratings);
    } catch (error) {
      logger.error('[ExplanationRatingController] Erro ao buscar avaliações:', error);
      res.status(500).json({ error: 'Erro ao buscar avaliações' });
    }
  }
}
