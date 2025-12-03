import { Request, Response, NextFunction } from 'express';
import { SupabaseAdminService } from '../../../infra/admin/supabase/SupabaseAdminService';
import { SecurityMonitorService } from '../../auth/services/SecurityMonitorService';
import { z } from 'zod';

/**
 * Controller para gerenciamento completo de usuários pelo admin
 */
export class AdminUserController {
  private adminService: SupabaseAdminService;
  private securityMonitor: SecurityMonitorService;

  constructor(adminService: SupabaseAdminService) {
    this.adminService = adminService;
    this.securityMonitor = new SecurityMonitorService();
  }

  /**
   * GET /api/admin/users
   * Lista todos os usuários com filtros e paginação
   */
  async listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const options = {
        search: req.query.search as string,
        role: req.query.role as string,
        status: req.query.status as string,
        planId: req.query.planId as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
        sortBy: req.query.sortBy as string,
        sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
      };

      const result = await this.adminService.listAllUsers(options);

      res.status(200).json({
        success: true,
        data: result.users,
        meta: {
          total: result.total,
          limit: options.limit,
          offset: options.offset,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/users/:id
   * Obtém detalhes completos de um usuário
   */
  async getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const user = await this.adminService.getUserById(id);

      if (!user) {
        res.status(404).json({
          success: false,
          error: { message: 'Usuário não encontrado' },
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/admin/users/:id
   * Atualiza dados de um usuário
   */
  async updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const schema = z.object({
        display_name: z.string().optional(),
        email: z.string().email().optional(),
        role: z.enum(['USER', 'STUDENT', 'MENTOR', 'ADMIN', 'MODERATOR']).optional(),
        biography: z.string().optional(),
        specialties: z.array(z.string()).optional(),
        photo_url: z.string().url().optional(),
      });

      const validationResult = schema.safeParse(req.body);
      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Dados inválidos',
            details: validationResult.error.format(),
          },
        });
        return;
      }

      const performedBy = (req as any).user?.id || 'system';
      const updatedUser = await this.adminService.updateUser(
        id,
        validationResult.data,
        performedBy,
      );

      res.status(200).json({
        success: true,
        data: updatedUser,
        message: 'Usuário atualizado com sucesso',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/admin/users/:id
   * Deleta um usuário
   */
  async deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!reason) {
        res.status(400).json({
          success: false,
          error: { message: 'Motivo da exclusão é obrigatório' },
        });
        return;
      }

      const performedBy = (req as any).user?.id || 'system';
      await this.adminService.deleteUser(id, performedBy, reason);

      res.status(200).json({
        success: true,
        message: 'Usuário deletado com sucesso',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/admin/users/:id/suspend
   * Suspende um usuário
   */
  async suspendUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const schema = z.object({
        reason: z.string().min(1, 'Motivo é obrigatório'),
        duration: z.number().positive().optional(),
      });

      const validationResult = schema.safeParse(req.body);
      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Dados inválidos',
            details: validationResult.error.format(),
          },
        });
        return;
      }

      const performedBy = (req as any).user?.id || 'system';
      await this.adminService.suspendUser(
        id,
        validationResult.data.reason,
        performedBy,
        validationResult.data.duration,
      );

      res.status(200).json({
        success: true,
        message: 'Usuário suspenso com sucesso',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/admin/users/:id/activate
   * Ativa um usuário suspenso
   */
  async activateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const performedBy = (req as any).user?.id || 'system';
      
      await this.adminService.activateUser(id, performedBy);

      res.status(200).json({
        success: true,
        message: 'Usuário ativado com sucesso',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/admin/users/:id/ban
   * Bane um usuário permanentemente
   */
  async banUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!reason) {
        res.status(400).json({
          success: false,
          error: { message: 'Motivo do banimento é obrigatório' },
        });
        return;
      }

      const performedBy = (req as any).user?.id || 'system';
      await this.adminService.banUser(id, reason, performedBy);

      res.status(200).json({
        success: true,
        message: 'Usuário banido com sucesso',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/admin/users/:id/role
   * Altera a role de um usuário
   */
  async updateUserRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { role } = req.body;

      if (!role) {
        res.status(400).json({
          success: false,
          error: { message: 'Role é obrigatória' },
        });
        return;
      }

      const performedBy = (req as any).user?.id || 'system';
      await this.adminService.setUserRole(id, role, performedBy);

      res.status(200).json({
        success: true,
        message: 'Role atualizada com sucesso',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/users/:id/logs
   * Obtém logs de atividade de um usuário
   */
  async getUserLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const options = {
        limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      };

      const result = await this.adminService.getUserActivityLogs(id, options);

      res.status(200).json({
        success: true,
        data: result.logs,
        meta: {
          total: result.total,
          limit: options.limit,
          offset: options.offset,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/users/:id/plans
   * Obtém histórico de planos de um usuário
   */
  async getUserPlans(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const plans = await this.adminService.getUserPlansHistory(id);

      res.status(200).json({
        success: true,
        data: plans,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/users/:id/statistics
   * Obtém estatísticas de uso de um usuário
   */
  async getUserStatistics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const stats = await this.adminService.getUserStatistics(id);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/users/:id/sessions
   * Obtém sessões ativas de um usuário
   */
  async getUserSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const sessions = await this.adminService.getUserActiveSessions(id);

      res.status(200).json({
        success: true,
        data: sessions,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/admin/users/:id/terminate-sessions
   * Encerra todas as sessões de um usuário
   */
  async terminateSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const performedBy = (req as any).user?.id || 'system';
      
      await this.adminService.terminateUserSessions(id, performedBy);

      res.status(200).json({
        success: true,
        message: 'Sessões encerradas com sucesso',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/admin/users/:id/sessions/:sessionId
   * Encerra uma sessão específica de um usuário
   */
  async terminateSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id, sessionId } = req.params;
      const performedBy = (req as any).user?.id || 'system';
      
      await this.adminService.terminateUserSession(id, sessionId, performedBy);

      res.status(200).json({
        success: true,
        message: 'Sessão encerrada com sucesso',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/admin/users/:id/send-email
   * Envia email para um usuário
   */
  async sendEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const schema = z.object({
        subject: z.string().min(1, 'Assunto é obrigatório'),
        message: z.string().min(1, 'Mensagem é obrigatória'),
      });

      const validationResult = schema.safeParse(req.body);
      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Dados inválidos',
            details: validationResult.error.format(),
          },
        });
        return;
      }

      const performedBy = (req as any).user?.id || 'system';
      await this.adminService.sendEmailToUser(
        id,
        validationResult.data.subject,
        validationResult.data.message,
        performedBy,
      );

      res.status(200).json({
        success: true,
        message: 'Email enviado com sucesso',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/users/:id/notes
   * Obtém notas internas de um usuário
   */
  async getUserNotes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const notes = await this.adminService.getUserNotes(id);

      res.status(200).json({
        success: true,
        data: notes,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/admin/users/:id/notes
   * Adiciona nota interna sobre um usuário
   */
  async addUserNote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { note } = req.body;

      if (!note) {
        res.status(400).json({
          success: false,
          error: { message: 'Nota é obrigatória' },
        });
        return;
      }

      const performedBy = (req as any).user?.id || 'system';
      const newNote = await this.adminService.addUserNote(id, note, performedBy);

      res.status(201).json({
        success: true,
        data: newNote,
        message: 'Nota adicionada com sucesso',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/users/search
   * Busca usuários por query
   */
  async searchUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { q, limit } = req.query;

      if (!q) {
        res.status(400).json({
          success: false,
          error: { message: 'Query de busca é obrigatória' },
        });
        return;
      }

      const users = await this.adminService.searchUsers(
        q as string,
        limit ? parseInt(limit as string) : 20,
      );

      res.status(200).json({
        success: true,
        data: users,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/users/export
   * Exporta lista de usuários
   */
  async exportUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = {
        search: req.query.search as string,
        role: req.query.role as string,
        status: req.query.status as string,
      };

      const csv = await this.adminService.exportUsers(filters);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=users.csv');
      res.status(200).send(csv);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/admin/users/bulk-update
   * Atualiza múltiplos usuários
   */
  async bulkUpdate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const schema = z.object({
        userIds: z.array(z.string().uuid()),
        updates: z.object({
          role: z.string().optional(),
          status: z.string().optional(),
        }),
      });

      const validationResult = schema.safeParse(req.body);
      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Dados inválidos',
            details: validationResult.error.format(),
          },
        });
        return;
      }

      const performedBy = (req as any).user?.id || 'system';
      await this.adminService.bulkUpdateUsers(
        validationResult.data.userIds,
        validationResult.data.updates,
        performedBy,
      );

      res.status(200).json({
        success: true,
        message: `${validationResult.data.userIds.length} usuários atualizados com sucesso`,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/users/:id/security-analysis
   * Analisa atividade de segurança de um usuário
   */
  async getUserSecurityAnalysis(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      const [activity, suspicious] = await Promise.all([
        this.securityMonitor.analyzeUserSessionActivity(id),
        this.securityMonitor.detectSuspiciousActivity(id),
      ]);

      res.status(200).json({
        success: true,
        data: {
          activity,
          suspicious,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/security/scan
   * Escaneia todos os usuários em busca de atividades suspeitas
   */
  async scanAllUsersForSuspiciousActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const suspicious = await this.securityMonitor.scanAllUsersForSuspiciousActivity();

      res.status(200).json({
        success: true,
        data: suspicious,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/users/:id/ip-location/:ip
   * Obtém localização de um IP
   */
  async getIPLocation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { ip } = req.params;
      
      const location = await this.securityMonitor.getIPLocation(ip);

      res.status(200).json({
        success: true,
        data: location,
      });
    } catch (error) {
      next(error);
    }
  }
}
