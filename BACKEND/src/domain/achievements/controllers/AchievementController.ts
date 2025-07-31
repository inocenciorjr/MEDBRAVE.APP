import { Request, Response } from 'express';
import { Timestamp } from 'firebase-admin/firestore';
import { IAchievementService } from '../interfaces/IAchievementService';
import { AchievementCategory, AchievementRarity, AchievementStatus } from '../types';
import { logger } from '../../../utils/logger';

/**
 * Controller para o sistema de conquistas avançado
 */
export class AchievementController {
  constructor(private readonly achievementService: IAchievementService) {}

  /**
   * GET /api/achievements
   * Obtém todas as conquistas ativas
   */
  async getAllAchievements(req: Request, res: Response): Promise<void> {
    try {
      const { category, rarity, tags, search, limit, offset } = req.query;
      
      const filters = {
        categories: category ? [category as AchievementCategory] : undefined,
        rarities: rarity ? [rarity as AchievementRarity] : undefined,
        tags: tags ? (tags as string).split(',') : undefined,
        searchQuery: search as string,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined
      };

      const achievements = await this.achievementService.getAllAchievements(filters);
      
      res.status(200).json({
        success: true,
        data: achievements
      });
    } catch (error) {
      logger.error('AchievementController', 'getAllAchievements', 'Erro ao buscar conquistas', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  /**
   * GET /api/achievements/:id
   * Obtém conquista específica
   */
  async getAchievementById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const achievement = await this.achievementService.getAchievementById(id);
      
      if (!achievement) {
        res.status(404).json({
          success: false,
          error: 'Conquista não encontrada'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: achievement
      });
    } catch (error) {
      logger.error('AchievementController', 'getAchievementById', 'Erro ao buscar conquista', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  /**
   * GET /api/achievements/user/:userId
   * Obtém conquistas do usuário
   */
  async getUserAchievements(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { status, category, rarity } = req.query;
      
      const filters = {
        statuses: status ? [status as AchievementStatus] : undefined,
        categories: category ? [category as AchievementCategory] : undefined,
        rarities: rarity ? [rarity as AchievementRarity] : undefined
      };

      const userAchievements = await this.achievementService.getUserAchievements(userId, filters);
      
      res.status(200).json({
        success: true,
        data: userAchievements
      });
    } catch (error) {
      logger.error('AchievementController', 'getUserAchievements', 'Erro ao buscar conquistas do usuário', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  /**
   * GET /api/achievements/user/:userId/stats
   * Obtém estatísticas de conquistas do usuário
   */
  async getUserAchievementStats(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      
      const stats = await this.achievementService.getUserAchievementStats(userId);
      
      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('AchievementController', 'getUserAchievementStats', 'Erro ao buscar estatísticas', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  /**
   * POST /api/achievements/user/:userId/collect/:achievementId
   * Coleta recompensas de uma conquista
   */
  async collectRewards(req: Request, res: Response): Promise<void> {
    try {
      const { userId, achievementId } = req.params;
      
      const result = await this.achievementService.collectRewards(userId, achievementId);
      
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('AchievementController', 'collectRewards', 'Erro ao coletar recompensas', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  /**
   * GET /api/achievements/user/:userId/pending-rewards
   * Obtém recompensas pendentes do usuário
   */
  async getPendingRewards(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      
      const pendingRewards = await this.achievementService.getPendingRewards(userId);
      
      res.status(200).json({
        success: true,
        data: pendingRewards
      });
    } catch (error) {
      logger.error('AchievementController', 'getPendingRewards', 'Erro ao buscar recompensas pendentes', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  /**
   * GET /api/achievements/leaderboard/global
   * Obtém leaderboard global
   */
  async getGlobalLeaderboard(req: Request, res: Response): Promise<void> {
    try {
      const { limit } = req.query;
      
      const leaderboard = await this.achievementService.getGlobalLeaderboard(
        limit ? parseInt(limit as string) : 100
      );
      
      res.status(200).json({
        success: true,
        data: leaderboard
      });
    } catch (error) {
      logger.error('AchievementController', 'getGlobalLeaderboard', 'Erro ao buscar leaderboard', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  /**
   * GET /api/achievements/leaderboard/category/:category
   * Obtém leaderboard por categoria
   */
  async getCategoryLeaderboard(req: Request, res: Response): Promise<void> {
    try {
      const { category } = req.params;
      const { limit } = req.query;
      
      const leaderboard = await this.achievementService.getCategoryLeaderboard(
        category as AchievementCategory,
        limit ? parseInt(limit as string) : 50
      );
      
      res.status(200).json({
        success: true,
        data: leaderboard
      });
    } catch (error) {
      logger.error('AchievementController', 'getCategoryLeaderboard', 'Erro ao buscar leaderboard da categoria', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  /**
   * GET /api/achievements/leaderboard/weekly
   * Obtém leaderboard semanal
   */
  async getWeeklyLeaderboard(req: Request, res: Response): Promise<void> {
    try {
      const { limit } = req.query;
      
      const leaderboard = await this.achievementService.getWeeklyLeaderboard(
        limit ? parseInt(limit as string) : 50
      );
      
      res.status(200).json({
        success: true,
        data: leaderboard
      });
    } catch (error) {
      logger.error('AchievementController', 'getWeeklyLeaderboard', 'Erro ao buscar leaderboard semanal', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  /**
   * GET /api/achievements/user/:userId/ranking
   * Obtém ranking do usuário
   */
  async getUserRanking(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      
      const ranking = await this.achievementService.getUserRanking(userId);
      
      res.status(200).json({
        success: true,
        data: ranking
      });
    } catch (error) {
      logger.error('AchievementController', 'getUserRanking', 'Erro ao buscar ranking do usuário', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  /**
   * GET /api/achievements/user/:userId/notifications
   * Obtém notificações de conquistas do usuário
   */
  async getUserNotifications(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { includeRead } = req.query;
      
      const notifications = await this.achievementService.getUserNotifications(
        userId,
        includeRead === 'true'
      );
      
      res.status(200).json({
        success: true,
        data: notifications
      });
    } catch (error) {
      logger.error('AchievementController', 'getUserNotifications', 'Erro ao buscar notificações', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  /**
   * PUT /api/achievements/notifications/:notificationId/read
   * Marca notificação como lida
   */
  async markNotificationAsRead(req: Request, res: Response): Promise<void> {
    try {
      const { notificationId } = req.params;
      
      const success = await this.achievementService.markNotificationAsRead(notificationId);
      
      res.status(200).json({
        success,
        data: { marked: success }
      });
    } catch (error) {
      logger.error('AchievementController', 'markNotificationAsRead', 'Erro ao marcar notificação', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  /**
   * PUT /api/achievements/user/:userId/notifications/read-all
   * Marca todas as notificações como lidas
   */
  async markAllNotificationsAsRead(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      
      const count = await this.achievementService.markAllNotificationsAsRead(userId);
      
      res.status(200).json({
        success: true,
        data: { markedCount: count }
      });
    } catch (error) {
      logger.error('AchievementController', 'markAllNotificationsAsRead', 'Erro ao marcar todas as notificações', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  /**
   * GET /api/achievements/user/:userId/suggestions
   * Gera sugestões de conquistas para o usuário
   */
  async generateAchievementSuggestions(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      
      const suggestions = await this.achievementService.generateAchievementSuggestions(userId);
      
      res.status(200).json({
        success: true,
        data: suggestions
      });
    } catch (error) {
      logger.error('AchievementController', 'generateAchievementSuggestions', 'Erro ao gerar sugestões', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  /**
   * GET /api/achievements/user/:userId/patterns
   * Analisa padrões de conquistas do usuário
   */
  async analyzeUserAchievementPatterns(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      
      const patterns = await this.achievementService.analyzeUserAchievementPatterns(userId);
      
      res.status(200).json({
        success: true,
        data: patterns
      });
    } catch (error) {
      logger.error('AchievementController', 'analyzeUserAchievementPatterns', 'Erro ao analisar padrões', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  /**
   * GET /api/achievements/user/:userId/progress-report
   * Gera relatório de progresso personalizado
   */
  async generateProgressReport(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { timeframe } = req.query;
      
      const report = await this.achievementService.generateProgressReport(
        userId,
        timeframe as string
      );
      
      res.status(200).json({
        success: true,
        data: report
      });
    } catch (error) {
      logger.error('AchievementController', 'generateProgressReport', 'Erro ao gerar relatório', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  /**
   * POST /api/achievements/check
   * Força verificação de conquistas para um usuário
   */
  async checkAchievements(req: Request, res: Response): Promise<void> {
    try {
      const { userId, eventType, eventData, triggerSource } = req.body;
      
      if (!userId || !eventType) {
        res.status(400).json({
          success: false,
          error: 'userId e eventType são obrigatórios'
        });
        return;
      }

      const result = await this.achievementService.checkAchievements({
        userId,
        eventType,
        eventData: eventData || {},
        timestamp: Timestamp.now(),
        triggerSource: triggerSource || 'manual'
      });
      
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('AchievementController', 'checkAchievements', 'Erro ao verificar conquistas', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  /**
   * GET /api/achievements/config
   * Obtém configurações do sistema de conquistas
   */
  async getConfig(_req: Request, res: Response): Promise<void> {
    try {
      const config = await this.achievementService.getConfig();
      res.json({
        success: true,
        data: config
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * GET /api/achievements/admin/metrics
   * Obtém métricas administrativas
   */
  async getAdminMetrics(_req: Request, res: Response): Promise<void> {
    try {
      const metrics = await this.achievementService.getAdminMetrics();
      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }
} 