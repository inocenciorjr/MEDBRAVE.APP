import { Request, Response } from 'express';

// Enums locais para compatibilidade
export enum RemovalReason {
  MASTERED = 'MASTERED',
  NOT_RELEVANT = 'NOT_RELEVANT',
  TOO_DIFFICULT = 'TOO_DIFFICULT',
  DUPLICATE = 'DUPLICATE',
  ERROR = 'ERROR',
  OTHER = 'OTHER',
}

export enum FSRSGrade {
  AGAIN = 0,
  HARD = 1,
  GOOD = 2,
  EASY = 3,
}

// Usar Request com augmentations globais

export class ReviewManagementController {

  /**
   * POST /api/reviews/mark-day-complete
   * Marcar dia como concluído
   */
  markDayComplete = async (
    _req: Request,
    res: Response,
  ): Promise<Response> => {
    return res.status(410).json({
      error: 'Serviço descontinuado',
      message: 'O serviço de gerenciamento de revisões foi removido permanentemente'
    });
  };

  /**
   * DELETE /api/reviews/remove-item
   * Remover item do ciclo de revisões
   */
  removeFromReviews = async (
    _req: Request,
    res: Response,
  ): Promise<Response> => {
    return res.status(410).json({
      error: 'Serviço descontinuado',
      message: 'O serviço de gerenciamento de revisões foi removido permanentemente'
    });
  };

  /**
   * POST /api/reviews/restore-item
   * Restaurar item removido para o ciclo de revisões
   */
  restoreToReviews = async (
    _req: Request,
    res: Response,
  ): Promise<Response> => {
    return res.status(410).json({
      error: 'Serviço descontinuado',
      message: 'O serviço de gerenciamento de revisões foi removido permanentemente'
    });
  };

  /**
   * GET /api/reviews/removed-items
   * Obter itens removidos do usuário
   */
  getRemovedItems = async (
    _req: Request,
    res: Response,
  ): Promise<Response> => {
    return res.status(410).json({
      error: 'Serviço descontinuado',
      message: 'O serviço de gerenciamento de revisões foi removido permanentemente'
    });
  };

  /**
   * GET /api/reviews/day-completion-stats
   * Obter estatísticas de completação de dias
   */
  getDayCompletionStats = async (
    _req: Request,
    res: Response,
  ): Promise<Response> => {
    return res.status(410).json({
      error: 'Serviço descontinuado',
      message: 'O serviço de gerenciamento de revisões foi removido permanentemente'
    });
  };

  /**
   * GET /api/reviews/completion-history
   * Obter histórico de completações
   */
  getCompletionHistory = async (
    _req: Request,
    res: Response,
  ): Promise<Response> => {
    return res.status(410).json({
      error: 'Serviço descontinuado',
      message: 'O serviço de gerenciamento de revisões foi removido permanentemente'
    });
  };

  /**
   * GET /api/reviews/removal-reasons
   * Obter lista de razões de remoção disponíveis
   */
  getRemovalReasons = async (
    _req: Request,
    res: Response,
  ): Promise<Response> => {
    const reasons = Object.values(RemovalReason);
    return res.status(200).json({
      success: true,
      data: reasons,
    });
  };

  /**
   * GET /api/reviews/fsrs-grades
   * Obter lista de grades FSRS disponíveis
   */
  getFSRSGrades = async (
    _req: Request,
    res: Response,
  ): Promise<Response> => {
    const grades = Object.values(FSRSGrade)
      .filter(value => typeof value === 'number')
      .map((value) => ({
        value,
        label: FSRSGrade[value],
      }));

    return res.status(200).json({
      success: true,
      data: grades,
    });
  };
}
