import { Request, Response } from 'express';
import { IUserStatisticsService } from '../interfaces/IUserStatisticsService';
import { StatisticsQueryOptions, RankingFilters } from '../types';
import { logger } from '../../../utils/logger';

/**
 * Controller para estatísticas de usuário
 * Apenas endpoints essenciais
 */
export class UserStatisticsController {
  constructor(
    private readonly userStatisticsService: IUserStatisticsService,
  ) {}

  /**
   * GET /api/statistics
   * Obtém estatísticas completas do usuário
   */
  getUserStatistics = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Não autenticado' });
        return;
      }

      const options: StatisticsQueryOptions = {
        includeSpecialtyStats: req.query.includeSpecialty !== 'false',
        includeUniversityStats: req.query.includeUniversity !== 'false',
        includeHeatmap: req.query.includeHeatmap === 'true',
        includeComparison: req.query.includeComparison === 'true',
      };

      const statistics =
        await this.userStatisticsService.getOrCreateUserStatistics(
          userId,
          options,
        );

      res.status(200).json({
        success: true,
        data: statistics,
      });
    } catch (error) {
      logger.error('Erro ao obter estatísticas:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      });
    }
  };

  /**
   * GET /api/statistics/with-comparison
   * Obtém estatísticas com comparação vs outros usuários
   */
  getStatisticsWithComparison = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Não autenticado' });
        return;
      }

      const options: StatisticsQueryOptions = {
        includeSpecialtyStats: true,
        includeUniversityStats: true,
        includeHeatmap: req.query.includeHeatmap === 'true',
        includeComparison: true,
      };

      const result =
        await this.userStatisticsService.getStatisticsWithComparison(
          userId,
          options,
        );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Erro ao obter estatísticas com comparação:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      });
    }
  };

  /**
   * POST /api/statistics/question-answer
   * Registra resposta de questão
   */
  recordQuestionAnswer = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Não autenticado' });
        return;
      }

      const {
        questionId,
        isCorrect,
        isFirstAttempt,
        specialtyId,
        universityId,
        timeSpent,
      } = req.body;

      if (!questionId || typeof isCorrect !== 'boolean' || !specialtyId) {
        res.status(400).json({
          success: false,
          error: 'Dados obrigatórios: questionId, isCorrect, specialtyId',
        });
        return;
      }

      const statistics =
        await this.userStatisticsService.recordQuestionAnswer(
          userId,
          questionId,
          isCorrect,
          isFirstAttempt ?? true,
          specialtyId,
          universityId,
          timeSpent,
        );

      res.status(200).json({
        success: true,
        data: statistics,
      });
    } catch (error) {
      logger.error('Erro ao registrar resposta:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      });
    }
  };

  /**
   * POST /api/statistics/study-time
   * Registra tempo de estudo
   */
  recordStudyTime = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Não autenticado' });
        return;
      }

      const { minutes, date } = req.body;

      if (!minutes || minutes <= 0) {
        res.status(400).json({
          success: false,
          error: 'Minutos deve ser maior que 0',
        });
        return;
      }

      const statistics = await this.userStatisticsService.recordStudyTime(
        userId,
        minutes,
        date,
      );

      res.status(200).json({
        success: true,
        data: statistics,
      });
    } catch (error) {
      logger.error('Erro ao registrar tempo de estudo:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      });
    }
  };

  /**
   * POST /api/statistics/flashcard
   * Registra flashcard estudado
   */
  recordFlashcard = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Não autenticado' });
        return;
      }

      const { flashcardId, date } = req.body;

      if (!flashcardId) {
        res.status(400).json({
          success: false,
          error: 'flashcardId é obrigatório',
        });
        return;
      }

      const statistics =
        await this.userStatisticsService.recordFlashcardStudied(
          userId,
          flashcardId,
          date,
        );

      res.status(200).json({
        success: true,
        data: statistics,
      });
    } catch (error) {
      logger.error('Erro ao registrar flashcard:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      });
    }
  };

  /**
   * POST /api/statistics/review
   * Registra revisão completada
   */
  recordReview = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Não autenticado' });
        return;
      }

      const { type, itemsReviewed, date } = req.body;

      if (!type || !itemsReviewed) {
        res.status(400).json({
          success: false,
          error: 'type e itemsReviewed são obrigatórios',
        });
        return;
      }

      const statistics =
        await this.userStatisticsService.recordReviewCompleted(
          userId,
          type,
          itemsReviewed,
          date,
        );

      res.status(200).json({
        success: true,
        data: statistics,
      });
    } catch (error) {
      logger.error('Erro ao registrar revisão:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      });
    }
  };

  /**
   * PUT /api/statistics/streak
   * Atualiza streak
   */
  updateStreak = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Não autenticado' });
        return;
      }

      const { date } = req.body;

      const statistics = await this.userStatisticsService.updateStreak(
        userId,
        date ? new Date(date) : undefined,
      );

      res.status(200).json({
        success: true,
        data: statistics,
      });
    } catch (error) {
      logger.error('Erro ao atualizar streak:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      });
    }
  };

  /**
   * GET /api/statistics/rankings/accuracy
   * Obtém ranking de acertos
   */
  getAccuracyRanking = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Não autenticado' });
        return;
      }

      const filters: RankingFilters = {
        type: 'accuracy_general',
        timeRange: (req.query.timeRange as any) || 'all_time',
      };

      const ranking = await this.userStatisticsService.getAccuracyRanking(
        userId,
        filters,
      );

      res.status(200).json({
        success: true,
        data: ranking,
      });
    } catch (error) {
      logger.error('Erro ao obter ranking de acertos:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      });
    }
  };

  /**
   * GET /api/statistics/rankings/accuracy/:specialtyId
   * Obtém ranking de acertos por especialidade
   */
  getSpecialtyAccuracyRanking = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Não autenticado' });
        return;
      }

      const { specialtyId } = req.params;

      const filters: RankingFilters = {
        type: 'accuracy_specialty',
        specialty: specialtyId,
        timeRange: (req.query.timeRange as any) || 'all_time',
      };

      const ranking =
        await this.userStatisticsService.getSpecialtyAccuracyRanking(
          userId,
          specialtyId,
          filters,
        );

      res.status(200).json({
        success: true,
        data: ranking,
      });
    } catch (error) {
      logger.error('Erro ao obter ranking por especialidade:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      });
    }
  };

  /**
   * GET /api/statistics/rankings/questions
   * Obtém ranking de questões respondidas
   */
  getQuestionsRanking = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Não autenticado' });
        return;
      }

      const filters: RankingFilters = {
        type: 'questions_total',
        timeRange: (req.query.timeRange as any) || 'all_time',
      };

      const ranking = await this.userStatisticsService.getQuestionsRanking(
        userId,
        filters,
      );

      res.status(200).json({
        success: true,
        data: ranking,
      });
    } catch (error) {
      logger.error('Erro ao obter ranking de questões:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      });
    }
  };

  /**
   * GET /api/statistics/comparison/:metric
   * Obtém comparação de métrica específica
   */
  getMetricComparison = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Não autenticado' });
        return;
      }

      const { metric } = req.params;
      const { specialty } = req.query;

      const comparison = await this.userStatisticsService.getMetricComparison(
        userId,
        metric as any,
        specialty as string,
      );

      res.status(200).json({
        success: true,
        data: comparison,
      });
    } catch (error) {
      logger.error('Erro ao obter comparação de métrica:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      });
    }
  };

  /**
   * POST /api/statistics/recalculate
   * Recalcula estatísticas
   */
  recalculateStatistics = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Não autenticado' });
        return;
      }

      const statistics =
        await this.userStatisticsService.recalculateStatistics(userId);

      res.status(200).json({
        success: true,
        data: statistics,
      });
    } catch (error) {
      logger.error('Erro ao recalcular estatísticas:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      });
    }
  };

  /**
   * POST /api/statistics/update-streak
   * Atualiza apenas o streak baseado em study_sessions (mais rápido)
   */
  updateStreakFromSessions = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Não autenticado' });
        return;
      }

      const streakData =
        await this.userStatisticsService.updateStreakOnly(userId);

      res.status(200).json({
        success: true,
        data: streakData,
      });
    } catch (error) {
      logger.error('Erro ao atualizar streak:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      });
    }
  };

  /**
   * DELETE /api/statistics
   * Deleta estatísticas
   */
  deleteStatistics = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Não autenticado' });
        return;
      }

      const success =
        await this.userStatisticsService.deleteUserStatistics(userId);

      if (success) {
        res.status(200).json({
          success: true,
          message: 'Estatísticas deletadas com sucesso',
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Estatísticas não encontradas',
        });
      }
    } catch (error) {
      logger.error('Erro ao deletar estatísticas:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      });
    }
  };

  /**
   * GET /api/statistics/study-time
   * Obtém dados de tempo de estudo por dia
   */
  getStudyTimeData = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Não autenticado' });
        return;
      }

      const days = parseInt(req.query.days as string) || 7;
      const data = await this.userStatisticsService.getStudyTimeData(userId, days);

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      logger.error('Erro ao obter dados de tempo de estudo:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      });
    }
  };

  // === COMPARAÇÕES GLOBAIS ===

  /**
   * GET /api/statistics/global/accuracy-by-month?startDate=...&endDate=...
   * Obtém média global de acertos por mês (com filtro de período)
   */
  getGlobalAccuracyByMonth = async (req: Request, res: Response): Promise<void> => {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const data = await this.userStatisticsService.getGlobalAccuracyByMonth(startDate, endDate);

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      logger.error('Erro ao buscar média global por mês:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      });
    }
  };

  /**
   * GET /api/statistics/global/accuracy-by-specialty?startDate=...&endDate=...
   * Obtém média global de acertos por especialidade (com filtro de período)
   */
  getGlobalAccuracyBySpecialty = async (req: Request, res: Response): Promise<void> => {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const data = await this.userStatisticsService.getGlobalAccuracyBySpecialty(startDate, endDate);

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      logger.error('Erro ao buscar média global por especialidade:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      });
    }
  };

  /**
   * GET /api/statistics/global/accuracy-by-university?startDate=...&endDate=...
   * Obtém média global de acertos por universidade (com filtro de período)
   */
  getGlobalAccuracyByUniversity = async (req: Request, res: Response): Promise<void> => {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const data = await this.userStatisticsService.getGlobalAccuracyByUniversity(startDate, endDate);

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      logger.error('Erro ao buscar média global por universidade:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      });
    }
  };

  /**
   * GET /api/statistics/global/questions-per-month?startDate=...&endDate=...
   * Obtém média global de questões por mês (com filtro de período)
   */
  getGlobalQuestionsPerMonth = async (req: Request, res: Response): Promise<void> => {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const data = await this.userStatisticsService.getGlobalQuestionsPerMonth(startDate, endDate);

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      logger.error('Erro ao buscar média global de questões por mês:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      });
    }
  };

  /**
   * GET /api/statistics/user/questions-by-specialty
   * Obtém quantidade de questões por especialidade do usuário
   */
  getUserQuestionsBySpecialty = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Não autenticado' });
        return;
      }

      const period = (req.query.period as 'day' | 'week' | 'month') || 'month';
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const data = await this.userStatisticsService.getUserQuestionsBySpecialty(
        userId,
        period,
        startDate,
        endDate
      );

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      logger.error('Erro ao buscar questões por especialidade:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      });
    }
  };

  /**
   * Obtém quantidade de questões por universidade do usuário
   */
  getUserQuestionsByUniversity = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Não autenticado' });
        return;
      }

      const period = (req.query.period as 'day' | 'week' | 'month') || 'month';
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const data = await this.userStatisticsService.getUserQuestionsByUniversity(
        userId,
        period,
        startDate,
        endDate
      );

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      logger.error('Erro ao buscar questões por universidade:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      });
    }
  };

  /**
   * Obtém quantidade de questões por subespecialidade do usuário
   */
  getUserQuestionsBySubspecialty = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Não autenticado' });
        return;
      }

      const period = (req.query.period as 'day' | 'week' | 'month') || 'month';
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const data = await this.userStatisticsService.getUserQuestionsBySubspecialty(
        userId,
        period,
        startDate,
        endDate
      );

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      logger.error('Erro ao buscar questões por subespecialidade:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      });
    }
  };

  /**
   * Obtém média global de acertos por subespecialidade
   */
  getGlobalAccuracyBySubspecialty = async (req: Request, res: Response): Promise<void> => {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const data = await this.userStatisticsService.getGlobalAccuracyBySubspecialty(
        startDate,
        endDate
      );

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      logger.error('Erro ao buscar média global por subespecialidade:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      });
    }
  };
}
