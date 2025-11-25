import { Request, Response, NextFunction } from 'express';
import { SmartSchedulingService } from '../services/SmartSchedulingService';
import AppError from '../../../../utils/AppError';

export class SmartSchedulingController {
  constructor(private smartSchedulingService: SmartSchedulingService) {}

  /**
   * GET /api/unified-reviews/backlog-status
   * Analisa o backlog do usuário e retorna status
   */
  getBacklogStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) throw AppError.unauthorized("Usuário não autenticado");

      const status = await this.smartSchedulingService.analyzeBacklog(userId);
      
      res.status(200).json({ 
        success: true, 
        data: status 
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/unified-reviews/recovery-mode
   * Ativa modo recuperação (redistribui backlog)
   */
  activateRecoveryMode = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) throw AppError.unauthorized("Usuário não autenticado");

      const { days_to_spread = 4 } = req.body;

      const result = await this.smartSchedulingService.activateRecoveryMode(
        userId,
        days_to_spread
      );
      
      res.status(200).json({ 
        success: true, 
        message: `${result.redistributed} revisões redistribuídas em ${result.days} dias`,
        data: result 
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/unified-reviews/study-pattern
   * Verifica padrão de estudo do usuário (aderência)
   */
  getStudyPattern = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) throw AppError.unauthorized("Usuário não autenticado");

      const pattern = await this.smartSchedulingService.checkStudyPattern(userId);
      
      res.status(200).json({ 
        success: true, 
        data: pattern 
      });
    } catch (error) {
      next(error);
    }
  };
}
