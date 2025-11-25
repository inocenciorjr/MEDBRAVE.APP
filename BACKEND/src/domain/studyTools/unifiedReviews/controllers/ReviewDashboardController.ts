import { Request, Response, NextFunction } from 'express';
import { ReviewDashboardService } from '../services/ReviewDashboardService';
import AppError from '../../../../utils/AppError';

export class ReviewDashboardController {
  constructor(private dashboardService: ReviewDashboardService) {}

  // GET /api/unified-reviews/dashboard
  getDashboard = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) throw AppError.unauthorized("Usuário não autenticado");

      const dashboard = await this.dashboardService.getReviewDashboard(userId);
      
      res.status(200).json({ success: true, data: dashboard });
    } catch (error) {
      next(error);
    }
  };

  // POST /api/unified-reviews/activate-cramming
  activateCramming = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) throw AppError.unauthorized("Usuário não autenticado");

      const { exam_date } = req.body;
      if (!exam_date) throw AppError.badRequest("Data da prova é obrigatória");

      await this.dashboardService.activateCrammingMode(userId, new Date(exam_date));
      
      res.status(200).json({ 
        success: true, 
        message: 'Modo cramming ativado com sucesso' 
      });
    } catch (error) {
      next(error);
    }
  };
}
