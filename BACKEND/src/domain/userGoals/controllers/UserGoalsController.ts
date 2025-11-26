import { Request, Response } from 'express';
import { UserGoalsService } from '../../../infra/userGoals/supabase/UserGoalsService';

export class UserGoalsController {
  constructor(private userGoalsService: UserGoalsService) {}

  /**
   * GET /api/user-goals
   * Busca as metas do usuário
   */
  getUserGoals = async (req: Request, res: Response) => {
    try {
      console.error('🎯 [UserGoalsController] getUserGoals chamado');
      const userId = req.user?.id;
      console.error('🎯 [UserGoalsController] userId:', userId, 'tipo:', typeof userId);

      if (!userId) {
        console.error('❌ [UserGoalsController] Usuário não autenticado');
        return res.status(401).json({
          success: false,
          error: 'Usuário não autenticado',
        });
      }

      console.error('🎯 [UserGoalsController] Chamando service.getUserGoals');
      const goals = await this.userGoalsService.getUserGoals(userId);
      console.error('🎯 [UserGoalsController] Resultado do service:', goals);

      return res.json({
        success: true,
        data: goals,
      });
    } catch (error: any) {
      console.error('❌ [UserGoalsController] Erro ao buscar metas:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Erro ao buscar metas',
      });
    }
  };

  /**
   * POST /api/user-goals
   * Cria ou atualiza as metas do usuário
   */
  upsertUserGoals = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Usuário não autenticado',
        });
      }

      const { daily_questions_goal, daily_accuracy_goal } = req.body;

      // Validação
      if (
        typeof daily_questions_goal !== 'number' ||
        daily_questions_goal < 0 ||
        typeof daily_accuracy_goal !== 'number' ||
        daily_accuracy_goal < 0 ||
        daily_accuracy_goal > 100
      ) {
        return res.status(400).json({
          success: false,
          error: 'Dados inválidos',
        });
      }

      const goals = await this.userGoalsService.upsertUserGoals(userId, {
        daily_questions_goal,
        daily_accuracy_goal,
      });

      return res.json({
        success: true,
        data: goals,
      });
    } catch (error: any) {
      console.error('Erro ao salvar metas:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Erro ao salvar metas',
      });
    }
  };

  /**
   * GET /api/user-goals/today-stats
   * Busca estatísticas do dia atual
   */
  getTodayStats = async (req: Request, res: Response) => {
    try {
      console.error('🎯 [UserGoalsController] getTodayStats chamado');
      const userId = req.user?.id;
      console.error('🎯 [UserGoalsController] userId:', userId, 'tipo:', typeof userId);

      if (!userId) {
        console.error('❌ [UserGoalsController] Usuário não autenticado');
        return res.status(401).json({
          success: false,
          error: 'Usuário não autenticado',
        });
      }

      // Obter timezone do header (enviado pelo frontend)
      const timezone = req.headers['x-user-timezone'] as string || 'America/Sao_Paulo';
      console.error('🎯 [UserGoalsController] timezone:', timezone);

      console.error('🎯 [UserGoalsController] Chamando service.getTodayStats');
      const stats = await this.userGoalsService.getTodayStats(userId, timezone);
      console.error('🎯 [UserGoalsController] Resultado do service:', stats);

      return res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      console.error('❌ [UserGoalsController] Erro ao buscar estatísticas do dia:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Erro ao buscar estatísticas do dia',
      });
    }
  };
}
