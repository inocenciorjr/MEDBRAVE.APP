import { Request, Response } from 'express';
import { IStudySessionService } from '../interfaces/IStudySessionService';
import { logger } from '../../../utils/logger';
import { TimezoneService } from '../../user/services/TimezoneService';
import { SupabaseClient } from '@supabase/supabase-js';
import { toZonedTime } from 'date-fns-tz';

export class StudySessionController {
  private timezoneService: TimezoneService;

  constructor(
    private studySessionService: IStudySessionService,
    supabase: SupabaseClient
  ) {
    this.timezoneService = new TimezoneService(supabase);
  }

  startSession = async (req: Request, res: Response) => {
    try {
      logger.info('[StudySessionController] startSession chamado');
      logger.info('[StudySessionController] Body:', req.body);

      const userId = req.user?.id;
      if (!userId) {
        logger.warn('[StudySessionController] Usuário não autenticado');
        return res.status(401).json({ success: false, error: 'Não autenticado' });
      }

      logger.info('[StudySessionController] UserId:', userId);

      // Aceitar tanto activity_type (snake_case) quanto activityType (camelCase)
      const activityType = req.body.activityType || req.body.activity_type;
      if (!activityType) {
        logger.warn('[StudySessionController] activityType não fornecido');
        return res.status(400).json({ success: false, error: 'activityType é obrigatório' });
      }

      logger.info('[StudySessionController] ActivityType:', activityType);

      const session = await this.studySessionService.startSession(userId, { activityType });

      logger.info('[StudySessionController] Sessão criada:', session);
      return res.json({ success: true, data: session });
    } catch (error: any) {
      logger.error('[StudySessionController] Erro ao iniciar sessão:', error);
      return res.status(500).json({ success: false, error: 'Erro interno do servidor' });
    }
  };

  endSession = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Não autenticado' });
      }

      // A rota usa :id, não :sessionId
      const sessionId = req.params.id || req.params.sessionId;

      if (!sessionId) {
        logger.warn('[StudySessionController] sessionId não fornecido');
        return res.status(400).json({ success: false, error: 'sessionId é obrigatório' });
      }

      const { itemsCompleted } = req.body;

      const session = await this.studySessionService.endSession(userId, sessionId, { itemsCompleted });

      return res.json({ success: true, data: session });
    } catch (error: any) {
      logger.error('Erro ao finalizar sessão:', error);
      return res.status(500).json({ success: false, error: 'Erro interno do servidor' });
    }
  };

  heartbeat = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Não autenticado' });
      }

      // A rota usa :id, não :sessionId
      const sessionId = req.params.id || req.params.sessionId;

      if (!sessionId) {
        logger.warn('[StudySessionController] sessionId não fornecido');
        return res.status(400).json({ success: false, error: 'sessionId é obrigatório' });
      }

      const session = await this.studySessionService.heartbeat(userId, sessionId);

      return res.json({ success: true, data: session });
    } catch (error: any) {
      logger.error('Erro ao atualizar heartbeat:', error);
      return res.status(500).json({ success: false, error: 'Erro interno do servidor' });
    }
  };

  getActiveSession = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Não autenticado' });
      }

      const session = await this.studySessionService.getActiveSession(userId);

      return res.json({ success: true, data: session });
    } catch (error: any) {
      logger.error('Erro ao buscar sessão ativa:', error);
      return res.status(500).json({ success: false, error: 'Erro interno do servidor' });
    }
  };

  getWeeklyStudyTime = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Não autenticado' });
      }

      const weeklyData = await this.studySessionService.getWeeklyStudyTime(userId);

      return res.json({ success: true, data: weeklyData });
    } catch (error: any) {
      logger.error('Erro ao buscar tempo semanal:', error);
      return res.status(500).json({ success: false, error: 'Erro interno do servidor' });
    }
  };

  getStudyTimeByDay = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Não autenticado' });
      }

      const days = parseInt(req.query.days as string) || 7;

      // Buscar timezone do usuário
      const userTimezone = await this.timezoneService.getUserTimezone(userId);

      const endDate = new Date();
      endDate.setHours(23, 59, 59, 999); // Fim do dia atual
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days + 1);
      startDate.setHours(0, 0, 0, 0);

      const sessions = await this.studySessionService.getUserSessions(userId, startDate, endDate);

      // Agrupar por dia
      const daysMap = new Map<string, { minutes: number; sessions: number }>();

      // Inicializar todos os dias com 0
      for (let i = 0; i < days; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);

        // Converter para o timezone do usuário
        const zonedDate = toZonedTime(date, userTimezone);

        const year = zonedDate.getFullYear();
        const month = String(zonedDate.getMonth() + 1).padStart(2, '0');
        const day = String(zonedDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        daysMap.set(dateStr, { minutes: 0, sessions: 0 });
      }

      // Processar sessões
      sessions.forEach((session) => {
        const date = new Date(session.startedAt);

        // Converter para o timezone do usuário
        const zonedDate = toZonedTime(date, userTimezone);

        const year = zonedDate.getFullYear();
        const month = String(zonedDate.getMonth() + 1).padStart(2, '0');
        const day = String(zonedDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        if (daysMap.has(dateStr)) {
          const current = daysMap.get(dateStr)!;
          current.minutes += Math.round((session.durationSeconds || 0) / 60);
          current.sessions += 1;
        }
      });

      // Converter para array
      const result = Array.from(daysMap.entries())
        .map(([date, data]) => ({
          date,
          minutes: data.minutes,
          sessions: data.sessions,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return res.json({ success: true, data: result });
    } catch (error: any) {
      logger.error('Erro ao buscar tempo por dia:', error);
      return res.status(500).json({ success: false, error: 'Erro interno do servidor' });
    }
  };

  /**
   * Limpar sessões órfãs (ativas há mais de 2 horas)
   * Endpoint para job automático ou chamada manual
   */
  cleanupOrphanedSessions = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;

      // Se não tiver userId, limpar todas as sessões órfãs (admin)
      const result = await this.studySessionService.cleanupOrphanedSessions(userId);

      return res.json({
        success: true,
        message: `${result.cleaned} sessões órfãs finalizadas`,
        data: result
      });
    } catch (error: any) {
      logger.error('Erro ao limpar sessões órfãs:', error);
      return res.status(500).json({ success: false, error: 'Erro interno do servidor' });
    }
  };
}
