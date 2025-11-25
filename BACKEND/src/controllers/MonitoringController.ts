/**
 * 📊 CONTROLADOR DE MONITORAMENTO
 *
 * Expõe endpoints para visualizar estatísticas de monitoramento:
 * - GET /api/monitoring/stats - Estatísticas gerais
 * - GET /api/monitoring/requests - Requisições recentes
 * - GET /api/monitoring/errors - Requisições com erro
 * - GET /api/monitoring/slow - Requisições lentas
 * - GET /api/monitoring/user/:userId - Requisições de um usuário
 * - POST /api/monitoring/export - Exportar relatório
 * - DELETE /api/monitoring/clear - Limpar dados
 */

import { Request, Response, NextFunction } from 'express';
import { requestMonitor } from '../middleware/requestMonitor';
import logger from '../utils/logger';

export class MonitoringController {
  /**
   * GET /api/monitoring/stats
   * Retorna estatísticas gerais de monitoramento
   */
  async getStatistics(req: Request, res: Response, next: NextFunction) {
    try {
      // Verificar se é admin
      if ((req.user?.user_role || '').toUpperCase() !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error:
            'Acesso negado. Apenas administradores podem ver estatísticas de monitoramento.',
        });
      }

      const { startDate, endDate } = req.query;

      let timeRange;
      if (startDate && endDate) {
        timeRange = {
          start: new Date(startDate as string),
          end: new Date(endDate as string),
        };
      }

      const statistics = requestMonitor.getStatistics(timeRange);

      return res.json({
        success: true,
        data: statistics,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Erro ao obter estatísticas de monitoramento:', error);
      return next(error);
    }
  }

  /**
   * GET /api/monitoring/requests
   * Retorna requisições recentes
   */
  async getRecentRequests(req: Request, res: Response, next: NextFunction) {
    try {
      if ((req.user?.user_role || '').toUpperCase() !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error: 'Acesso negado. Apenas administradores podem ver requisições.',
        });
      }

      const limit = parseInt(req.query.limit as string) || 100;
      const requests = requestMonitor.getRecentRequests(limit);

      return res.json({
        success: true,
        data: requests,
        count: requests.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Erro ao obter requisições recentes:', error);
      return next(error);
    }
  }

  /**
   * GET /api/monitoring/errors
   * Retorna requisições com erro
   */
  async getErrorRequests(req: Request, res: Response, next: NextFunction) {
    try {
      if ((req.user?.user_role || '').toUpperCase() !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error: 'Acesso negado. Apenas administradores podem ver erros.',
        });
      }

      const limit = parseInt(req.query.limit as string) || 100;
      const errors = requestMonitor.getErrorRequests(limit);

      return res.json({
        success: true,
        data: errors,
        count: errors.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Erro ao obter requisições com erro:', error);
      return next(error);
    }
  }

  /**
   * GET /api/monitoring/slow
   * Retorna requisições lentas
   */
  async getSlowRequests(req: Request, res: Response, next: NextFunction) {
    try {
      if ((req.user?.user_role || '').toUpperCase() !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error:
            'Acesso negado. Apenas administradores podem ver requisições lentas.',
        });
      }

      const threshold = parseInt(req.query.threshold as string) || 1000; // ms
      const limit = parseInt(req.query.limit as string) || 100;
      const slowRequests = requestMonitor.getSlowRequests(threshold, limit);

      return res.json({
        success: true,
        data: slowRequests,
        count: slowRequests.length,
        threshold,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Erro ao obter requisições lentas:', error);
      return next(error);
    }
  }

  /**
   * GET /api/monitoring/user/:userId
   * Retorna requisições de um usuário específico
   */
  async getUserRequests(req: Request, res: Response, next: NextFunction) {
    try {
      if ((req.user?.user_role || '').toUpperCase() !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error:
            'Acesso negado. Apenas administradores podem ver requisições de usuários.',
        });
      }

      const { userId } = req.params;
      const limit = parseInt(req.query.limit as string) || 100;
      const userRequests = requestMonitor.getRequestsByUser(userId, limit);

      return res.json({
        success: true,
        data: userRequests,
        count: userRequests.length,
        userId,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Erro ao obter requisições do usuário:', error);
      return next(error);
    }
  }

  /**
   * POST /api/monitoring/export
   * Exporta relatório de monitoramento
   */
  async exportReport(req: Request, res: Response, next: NextFunction) {
    try {
      if ((req.user?.user_role || '').toUpperCase() !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error:
            'Acesso negado. Apenas administradores podem exportar relatórios.',
        });
      }

      const { format = 'json', filename } = req.body;

      let filepath: string;

      if (format === 'csv') {
        filepath = requestMonitor.exportStatsToCsv(filename);
      } else {
        filepath = requestMonitor.exportToFile(filename);
      }

      return res.json({
        success: true,
        message: 'Relatório exportado com sucesso',
        filepath,
        format,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Erro ao exportar relatório:', error);
      return next(error);
    }
  }

  /**
   * DELETE /api/monitoring/clear
   * Limpa dados de monitoramento
   */
  async clearData(req: Request, res: Response, next: NextFunction) {
    try {
      if ((req.user?.user_role || '').toUpperCase() !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error: 'Acesso negado. Apenas administradores podem limpar dados.',
        });
      }

      requestMonitor.clearData();

      return res.json({
        success: true,
        message: 'Dados de monitoramento limpos com sucesso',
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Erro ao limpar dados de monitoramento:', error);
      return next(error);
    }
  }

  /**
   * PUT /api/monitoring/toggle
   * Habilita/desabilita monitoramento
   */
  async toggleMonitoring(req: Request, res: Response, next: NextFunction) {
    try {
      if ((req.user?.user_role || '').toUpperCase() !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error:
            'Acesso negado. Apenas administradores podem controlar o monitoramento.',
        });
      }

      const { enabled } = req.body;

      if (enabled) {
        requestMonitor.enable();
      } else {
        requestMonitor.disable();
      }

      return res.json({
        success: true,
        message: `Monitoramento ${enabled ? 'habilitado' : 'desabilitado'} com sucesso`,
        enabled,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Erro ao alterar estado do monitoramento:', error);
      return next(error);
    }
  }

  /**
   * POST /api/monitoring/frontend-data
   * Recebe dados do frontend
   */
  async receiveFrontendData(req: Request, res: Response, next: NextFunction) {
    try {
      const { sessionId, userId, userRole, requests, pageViews, userActions } =
        req.body;

      // Processar requisições do frontend
      if (requests && requests.length > 0) {
        requests.forEach((request: any) => {
          requestMonitor.addFrontendRequest({
            ...request,
            source: 'frontend',
            sessionId,
            userId,
            userRole,
          });
        });
      }

      // Processar visualizações de página
      if (pageViews && pageViews.length > 0) {
        pageViews.forEach((pageView: any) => {
          requestMonitor.addPageView({
            ...pageView,
            sessionId,
            userId,
            userRole,
          });
        });
      }

      // Processar ações do usuário
      if (userActions && userActions.length > 0) {
        userActions.forEach((action: any) => {
          requestMonitor.addUserAction({
            ...action,
            sessionId,
            userId,
            userRole,
          });
        });
      }

      // Log detalhado para debug - mostrar quais endpoints estão sendo chamados
      if (requests && requests.length > 0) {
        const endpoints = requests
          .map((r: any) => `${r.method} ${r.url}`)
          .join(', ');
        logger.info(
          `📥 [Monitoring] ${requests.length} requests: [${endpoints}]`,
        );
      }

      logger.info(
        `📥 [Monitoring] Dados recebidos do frontend: ${requests?.length || 0} requests, ${pageViews?.length || 0} page views, ${userActions?.length || 0} actions`,
      );

      res.json({
        success: true,
        message: 'Dados recebidos com sucesso',
        processed: {
          requests: requests?.length || 0,
          pageViews: pageViews?.length || 0,
          userActions: userActions?.length || 0,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Erro ao processar dados do frontend:', error);
      next(error);
    }
  }

  /**
   * GET /api/monitoring/dashboard
   * Retorna dados para dashboard de monitoramento
   */
  async getDashboardData(req: Request, res: Response, next: NextFunction) {
    try {
      if ((req.user?.user_role || '').toUpperCase() !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error: 'Acesso negado. Apenas administradores podem ver o dashboard.',
        });
      }

      // Estatísticas dos últimos 30 minutos
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      const now = new Date();

      const recentStats = requestMonitor.getStatistics({
        start: thirtyMinutesAgo,
        end: now,
      });

      // Estatísticas gerais
      const overallStats = requestMonitor.getStatistics();

      // Requisições recentes
      const recentRequests = requestMonitor.getRecentRequests(20);

      // Erros recentes
      const recentErrors = requestMonitor.getErrorRequests(10);

      // Requisições lentas
      const slowRequests = requestMonitor.getSlowRequests(1000, 10);

      return res.json({
        success: true,
        data: {
          recent: recentStats,
          overall: overallStats,
          recentRequests,
          recentErrors,
          slowRequests,
          lastUpdated: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Erro ao obter dados do dashboard:', error);
      return next(error);
    }
  }
}

export const monitoringController = new MonitoringController();
