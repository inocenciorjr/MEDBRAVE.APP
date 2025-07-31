import { Request, Response, NextFunction } from 'express';
import { IAuditLogService } from '../interfaces/IAuditLogService';
import { AdminAction } from '../../admin/types/AdminTypes';
import { AuditLogFilterOptions, AuditLogPaginationOptions } from '../types';

// Estendendo o tipo Request para incluir userId e userRole
declare global {
  namespace Express {
    interface Request {
      userId: string;
      userRole: string;
    }
  }
}

/**
 * Controlador para gerenciar os logs de auditoria
 */
export class AuditLogController {
  constructor(private auditLogService: IAuditLogService) {}

  /**
   * Registra uma ação no log de auditoria
   */
  async logAction(req: Request, res: Response, next: NextFunction) {
    try {
      const action: AdminAction = req.body;

      // Adicionar o ID do usuário que está realizando a ação
      action.performedBy = req.userId;

      await this.auditLogService.logAction(action);

      return res.status(201).json({
        success: true,
        message: 'Ação registrada com sucesso no log de auditoria',
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Obtém logs de auditoria com filtros e paginação
   */
  async getAuditLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        actionType,
        userId,
        startDate,
        endDate,
        descriptionContains,
        page = '1',
        limit = '10',
        sortBy = 'createdAt',
        sortDirection = 'desc',
      } = req.query;

      // Validar permissões (apenas administradores podem acessar logs de auditoria)
      if (req.userRole !== 'admin') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Você não tem permissão para acessar os logs de auditoria',
          },
        });
      }

      // Converter parâmetros
      const paginationOptions: AuditLogPaginationOptions = {
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
        sortBy: sortBy as 'createdAt' | 'action.type' | 'action.performedBy',
        sortDirection: sortDirection as 'asc' | 'desc',
      };

      const filterOptions: AuditLogFilterOptions = {};

      if (actionType) {
        filterOptions.actionType = actionType as string;
      }
      if (userId) {
        filterOptions.userId = userId as string;
      }

      if (startDate) {
        filterOptions.startDate = new Date(startDate as string);
      }

      if (endDate) {
        filterOptions.endDate = new Date(endDate as string);
      }

      if (descriptionContains) {
        filterOptions.descriptionContains = descriptionContains as string;
      }

      // Obter logs paginados
      const result = await this.auditLogService.getPaginatedAuditLogs(
        paginationOptions.page,
        paginationOptions.limit,
      );

      return res.json({
        success: true,
        data: {
          logs: result.logs,
          total: result.total,
          page: paginationOptions.page,
          limit: paginationOptions.limit,
          hasMore: result.hasMore,
        },
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Obtém logs de auditoria de um usuário específico
   */
  async getActionsByUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;

      // Validar permissões (apenas administradores podem acessar logs de auditoria)
      if (req.userRole !== 'admin') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Você não tem permissão para acessar os logs de auditoria',
          },
        });
      }

      const logs = await this.auditLogService.getActionsByUser(userId);

      return res.json({
        success: true,
        data: logs,
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Obtém logs de auditoria de um tipo específico
   */
  async getActionsByType(req: Request, res: Response, next: NextFunction) {
    try {
      const { actionType } = req.params;

      // Validar permissões (apenas administradores podem acessar logs de auditoria)
      if (req.userRole !== 'admin') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Você não tem permissão para acessar os logs de auditoria',
          },
        });
      }

      const logs = await this.auditLogService.getActionsByType(actionType);

      return res.json({
        success: true,
        data: logs,
      });
    } catch (error) {
      return next(error);
    }
  }
}
