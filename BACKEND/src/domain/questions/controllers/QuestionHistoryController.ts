import { Request, Response, NextFunction } from 'express';
import { QuestionHistoryService } from '../services/QuestionHistoryService';
import AppError from '../../../utils/AppError';

export class QuestionHistoryController {
  constructor(private historyService: QuestionHistoryService) {}

  // GET /api/questions/:questionId/history
  getQuestionHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) throw AppError.unauthorized("Usuário não autenticado");

      const { questionId } = req.params;
      const { limit } = req.query;
      
      const history = await this.historyService.getQuestionHistory(
        userId, 
        questionId,
        limit ? parseInt(limit as string) : undefined
      );
      
      res.status(200).json({ success: true, data: history });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/questions/:questionId/stats
  getQuestionStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) throw AppError.unauthorized("Usuário não autenticado");

      const { questionId } = req.params;
      const { includeComparison } = req.query;
      
      const stats = await this.historyService.getQuestionStats(
        userId, 
        questionId,
        includeComparison === 'true'
      );
      
      res.status(200).json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  };

  // POST /api/questions/stats/batch
  getBatchQuestionStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) throw AppError.unauthorized("Usuário não autenticado");

      const { questionIds } = req.body;
      
      if (!Array.isArray(questionIds) || questionIds.length === 0) {
        throw AppError.badRequest("questionIds deve ser um array não vazio");
      }

      // Limitar a 50 questões por requisição
      if (questionIds.length > 50) {
        throw AppError.badRequest("Máximo de 50 questões por requisição");
      }
      
      // Usar método otimizado que faz apenas 2 queries ao invés de 4*N
      const statsMap = await this.historyService.getBatchQuestionStats(userId, questionIds);
      
      res.status(200).json({ success: true, data: statsMap });
    } catch (error) {
      next(error);
    }
  };

  // POST /api/questions/:questionId/attempt
  recordAttempt = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) throw AppError.unauthorized("Usuário não autenticado");

      const { questionId } = req.params;
      const attemptData = {
        ...req.body,
        user_id: userId,
        question_id: questionId
      };

      // Validar campos obrigatórios
      if (!attemptData.selected_alternative_id) {
        throw AppError.badRequest("selected_alternative_id é obrigatório");
      }
      if (attemptData.is_correct === undefined) {
        throw AppError.badRequest("is_correct é obrigatório");
      }
      if (!attemptData.study_mode) {
        throw AppError.badRequest("study_mode é obrigatório");
      }
      
      const result = await this.historyService.recordQuestionAttempt(attemptData);
      
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };
}
