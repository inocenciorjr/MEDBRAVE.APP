import { Request, Response } from 'express';
import { IUserStatisticsService } from '../interfaces/IUserStatisticsService';
import { DifficultyLevel, StatisticsQueryOptions } from '../types';
import { logger } from '../../../utils/logger';

/**
 * Controller para estatísticas de usuário com funcionalidades avançadas
 */
export class UserStatisticsController {
  constructor(private readonly userStatisticsService: IUserStatisticsService) {}

  /**
   * GET /api/users/:userId/statistics
   * Obtém estatísticas completas do usuário
   */
  async getUserStatistics(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const options: StatisticsQueryOptions = {
        includeFilterStats: req.query.includeFilters === 'true',
        includePeerComparison: req.query.includePeers === 'true',
        includeRecommendations: req.query.includeRecommendations === 'true'
      };

      if (req.query.filterIds) {
        options.filterIds = (req.query.filterIds as string).split(',');
      }

      if (req.query.startDate && req.query.endDate) {
        options.timeRange = {
          start: new Date(req.query.startDate as string),
          end: new Date(req.query.endDate as string)
        };
      }

      const statistics = await this.userStatisticsService.getOrCreateUserStatistics(userId, options);
      
      res.status(200).json({
        success: true,
        data: statistics
      });
    } catch (error) {
      logger.error('UserStatisticsController', 'getUserStatistics', 'Erro ao obter estatísticas', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  /**
   * POST /api/users/:userId/statistics/question-answer
   * Registra resposta de questão
   */
  async recordQuestionAnswer(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { 
        questionId, 
        isCorrect, 
        filterId, 
        difficulty, 
        timeSpent, 
        confidenceLevel,
        srsQuality,
        reviewType 
      } = req.body;

      if (!questionId || typeof isCorrect !== 'boolean' || !filterId || !difficulty) {
        res.status(400).json({
          success: false,
          error: 'Dados obrigatórios faltando: questionId, isCorrect, filterId, difficulty'
        });
        return;
      }

      const statistics = await this.userStatisticsService.recordQuestionAnswer(
        userId,
        questionId,
        isCorrect,
        {
          filterId,
          difficulty: difficulty as DifficultyLevel,
          timeSpent: timeSpent || 0,
          confidenceLevel,
          srsQuality,
          reviewType
        }
      );

      res.status(200).json({
        success: true,
        data: statistics
      });
    } catch (error) {
      logger.error('UserStatisticsController', 'recordQuestionAnswer', 'Erro ao registrar resposta', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  /**
   * POST /api/users/:userId/statistics/study-session/start
   * Inicia sessão de estudo
   */
  async startStudySession(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { sessionType } = req.body;

      const statistics = await this.userStatisticsService.startStudySession(
        userId,
        sessionType || 'general'
      );

      res.status(200).json({
        success: true,
        data: statistics
      });
    } catch (error) {
      logger.error('UserStatisticsController', 'startStudySession', 'Erro ao iniciar sessão', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  /**
   * POST /api/users/:userId/statistics/study-session/end
   * Finaliza sessão de estudo
   */
  async endStudySession(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { questionsAnswered, timeSpent, focusEvents, topicsStudied } = req.body;

      const statistics = await this.userStatisticsService.endStudySession(
        userId,
        {
          questionsAnswered: questionsAnswered || 0,
          timeSpent: timeSpent || 0,
          focusEvents: focusEvents || 0,
          topicsStudied: topicsStudied || []
        }
      );

      res.status(200).json({
        success: true,
        data: statistics
      });
    } catch (error) {
      logger.error('UserStatisticsController', 'endStudySession', 'Erro ao finalizar sessão', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  /**
   * POST /api/users/:userId/statistics/exam-completion
   * Registra conclusão de simulado
   */
  async recordExamCompletion(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const examData = req.body;

      if (!examData.score || !examData.totalQuestions || !examData.specialty || !examData.examType) {
        res.status(400).json({
          success: false,
          error: 'Dados obrigatórios faltando: score, totalQuestions, specialty, examType'
        });
        return;
      }

      const statistics = await this.userStatisticsService.recordExamCompletion(userId, examData);

      res.status(200).json({
        success: true,
        data: statistics
      });
    } catch (error) {
      logger.error('UserStatisticsController', 'recordExamCompletion', 'Erro ao registrar simulado', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  /**
   * GET /api/users/:userId/statistics/predictive-analysis
   * Gera análise preditiva
   */
  async generatePredictiveAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const analysis = await this.userStatisticsService.generatePredictiveAnalysis(userId);

      res.status(200).json({
        success: true,
        data: analysis
      });
    } catch (error) {
      logger.error('UserStatisticsController', 'generatePredictiveAnalysis', 'Erro na análise preditiva', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  /**
   * GET /api/users/:userId/statistics/recommendations
   * Gera recomendações inteligentes
   */
  async generateRecommendations(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const recommendations = await this.userStatisticsService.generateSmartRecommendations(userId);

      res.status(200).json({
        success: true,
        data: recommendations
      });
    } catch (error) {
      logger.error('UserStatisticsController', 'generateRecommendations', 'Erro ao gerar recomendações', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  /**
   * GET /api/users/:userId/statistics/study-pattern
   * Identifica padrão de estudo
   */
  async getStudyPattern(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const pattern = await this.userStatisticsService.identifyStudyPattern(userId);

      res.status(200).json({
        success: true,
        data: { pattern }
      });
    } catch (error) {
      logger.error('UserStatisticsController', 'getStudyPattern', 'Erro ao identificar padrão', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  /**
   * GET /api/users/:userId/statistics/mastery/:filterId
   * Calcula mastery de tópico
   */
  async getTopicMastery(req: Request, res: Response): Promise<void> {
    try {
      const { userId, filterId } = req.params;

      const mastery = await this.userStatisticsService.calculateTopicMastery(userId, filterId);

      res.status(200).json({
        success: true,
        data: { mastery, filterId }
      });
    } catch (error) {
      logger.error('UserStatisticsController', 'getTopicMastery', 'Erro ao calcular mastery', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  /**
   * GET /api/users/:userId/statistics/rankings
   * Obtém rankings do usuário
   */
  async getUserRankings(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const context = (req.query.context as 'global' | 'specialty' | 'institution') || 'global';

      const rankings = await this.userStatisticsService.getUserRankings(userId, context);

      res.status(200).json({
        success: true,
        data: rankings
      });
    } catch (error) {
      logger.error('UserStatisticsController', 'getUserRankings', 'Erro ao obter rankings', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  /**
   * GET /api/users/:userId/statistics/knowledge-gaps
   * Identifica gaps de conhecimento
   */
  async getKnowledgeGaps(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const gaps = await this.userStatisticsService.identifyKnowledgeGaps(userId);

      res.status(200).json({
        success: true,
        data: gaps
      });
    } catch (error) {
      logger.error('UserStatisticsController', 'getKnowledgeGaps', 'Erro ao identificar gaps', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  /**
   * GET /api/users/:userId/statistics/efficiency
   * Calcula eficiência de estudo
   */
  async getStudyEfficiency(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const timeframe = req.query.timeframe as string;

      const efficiency = await this.userStatisticsService.calculateStudyEfficiency(userId, timeframe);

      res.status(200).json({
        success: true,
        data: efficiency
      });
    } catch (error) {
      logger.error('UserStatisticsController', 'getStudyEfficiency', 'Erro ao calcular eficiência', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  /**
   * GET /api/users/:userId/statistics/insights
   * Gera insights personalizados
   */
  async getPersonalizedInsights(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const insights = await this.userStatisticsService.generatePersonalizedInsights(userId);

      res.status(200).json({
        success: true,
        data: insights
      });
    } catch (error) {
      logger.error('UserStatisticsController', 'getPersonalizedInsights', 'Erro ao gerar insights', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  /**
   * GET /api/users/:userId/statistics/export
   * Exporta dados para análise externa
   */
  async exportAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const format = (req.query.format as 'json' | 'csv') || 'json';
      
      let timeRange;
      if (req.query.startDate && req.query.endDate) {
        timeRange = {
          start: new Date(req.query.startDate as string),
          end: new Date(req.query.endDate as string)
        };
      }

      const data = await this.userStatisticsService.exportUserAnalytics(userId, format, timeRange);

      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="user-${userId}-analytics.csv"`);
      } else {
        res.setHeader('Content-Type', 'application/json');
      }

      res.status(200).send(data);
    } catch (error) {
      logger.error('UserStatisticsController', 'exportAnalytics', 'Erro ao exportar dados', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  /**
   * PUT /api/users/:userId/statistics/streak
   * Atualiza streak do usuário
   */
  async updateStreak(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { date } = req.body;

      const statistics = await this.userStatisticsService.updateStreak(
        userId,
        date ? new Date(date) : undefined
      );

      res.status(200).json({
        success: true,
        data: statistics
      });
    } catch (error) {
      logger.error('UserStatisticsController', 'updateStreak', 'Erro ao atualizar streak', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  /**
   * POST /api/users/:userId/statistics/recalculate
   * Recalcula métricas avançadas
   */
  async recalculateMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const statistics = await this.userStatisticsService.recalculateAdvancedMetrics(userId);

      res.status(200).json({
        success: true,
        data: statistics
      });
    } catch (error) {
      logger.error('UserStatisticsController', 'recalculateMetrics', 'Erro ao recalcular métricas', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  /**
   * DELETE /api/users/:userId/statistics
   * Deleta estatísticas do usuário
   */
  async deleteUserStatistics(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const success = await this.userStatisticsService.deleteUserStatistics(userId);

      if (success) {
        res.status(200).json({
          success: true,
          message: 'Estatísticas deletadas com sucesso'
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Estatísticas não encontradas'
        });
      }
    } catch (error) {
      logger.error('UserStatisticsController', 'deleteUserStatistics', 'Erro ao deletar estatísticas', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
} 