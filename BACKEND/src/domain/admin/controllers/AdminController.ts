import { Request, Response, NextFunction } from 'express';
import { SupabaseAdminService } from '../../../infra/admin/supabase/SupabaseAdminService';
import { AdminDashboardService } from '../../../infra/admin/supabase/AdminDashboardService';
import { SupabaseAuditLogService } from '../../../infra/audit/supabase/SupabaseAuditLogService';
import { AdminStats } from '../types/AdminTypes';
import { z } from 'zod';

/**
 * Controller responsável por lidar com as requisições relacionadas à administração
 */
export class AdminController {
  private adminService: SupabaseAdminService;
  private dashboardService: AdminDashboardService;
  private auditService: SupabaseAuditLogService;

  constructor(
    adminService: SupabaseAdminService,
    dashboardService: AdminDashboardService,
    auditService: SupabaseAuditLogService,
  ) {
    this.adminService = adminService;
    this.dashboardService = dashboardService;
    this.auditService = auditService;
  }

  /**
   * Obtém a lista de administradores
   */
  async getAdmins(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      // Não existe getAllAdmins, então buscar todos os admins manualmente
      // Supondo que o método getAllAdmins deveria buscar todos os documentos da coleção 'admins'
      const snapshot = await (this.adminService as any).db
        .collection('admins')
        .get();
      const admins = snapshot.docs.map((doc: any) => doc.data());
      res.status(200).json({ success: true, data: admins });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtém um administrador pelo ID
   */
  async getAdminById(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { id } = req.params;
      const admin = await this.adminService.getAdminById(id);

      if (!admin) {
        res.status(404).json({
          success: false,
          error: { message: 'Administrador não encontrado' },
        });
        return;
      }

      res.status(200).json({ success: true, data: admin });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cria um novo administrador
   */
  async createAdmin(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const schema = z.object({
        userId: z.string().min(1, 'ID do usuário é obrigatório'),
        role: z.enum(['admin', 'superadmin'], {
          errorMap: () => ({ message: 'Função deve ser admin ou superadmin' }),
        }),
        permissions: z.array(z.string()).optional(),
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
      const data = validationResult.data;
      // createAdmin espera um objeto Omit<AdminUser, 'id' | 'createdAt' | 'updatedAt'>
      const newAdmin = await this.adminService.createAdmin({
        role: data.role,
        permissions: data.permissions || [],
        userId: data.userId,
      });
      await this.auditService.logAction({
        type: 'ADMIN_CREATED',
        description: `Administrador criado: ${data.userId} com função ${data.role}`,
        performedBy: (req as any).user?.id || 'system',
        timestamp: new Date(),
        metadata: { adminId: newAdmin.id, role: data.role },
      });
      res.status(201).json({ success: true, data: newAdmin });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Atualiza um administrador existente
   */
  async updateAdmin(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { id } = req.params;
      const schema = z.object({
        permissions: z.array(z.string()).optional(),
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
      const data = validationResult.data;
      const admin = await this.adminService.getAdminById(id);
      if (!admin) {
        res.status(404).json({
          success: false,
          error: { message: 'Administrador não encontrado' },
        });
        return;
      }
      if (data.permissions) {
        await this.adminService.updateAdminPermissions(id, data.permissions);
      }
      await this.auditService.logAction({
        type: 'ADMIN_UPDATED',
        description: `Administrador atualizado: ${id}`,
        performedBy: (req as any).user?.id || 'system',
        timestamp: new Date(),
        metadata: { adminId: id, updates: data },
      });
      const updatedAdmin = await this.adminService.getAdminById(id);
      res.status(200).json({ success: true, data: updatedAdmin });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove um administrador
   */
  async deleteAdmin(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { id } = req.params;
      const admin = await this.adminService.getAdminById(id);

      if (!admin) {
        res.status(404).json({
          success: false,
          error: { message: 'Administrador não encontrado' },
        });
        return;
      }

      await this.adminService.deleteAdmin(id);

      // Registrar ação no log de auditoria
      await this.auditService.logAction({
        type: 'ADMIN_DELETED',
        description: `Administrador removido: ${id}`,
        performedBy: req.user?.id || 'system',
        timestamp: new Date(),
        metadata: { adminId: id },
      });

      res.status(200).json({
        success: true,
        data: { message: 'Administrador removido com sucesso' },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtém estatísticas do painel administrativo
   */
  async getDashboardStats(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      // O método correto é getDashboardStats
      const stats: AdminStats = await this.dashboardService.getDashboardStats();
      res.status(200).json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtém o histórico de ações administrativas
   */
  async getAuditLogs(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      // Parâmetros de paginação e filtros
      const limit = parseInt(req.query.limit as string) || 10;
      const page = parseInt(req.query.page as string) || 1;
      // const type = req.query.type as string;
      // const adminId = req.query.adminId as string;
      // const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      // const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      // Usar o método paginado correto
      const { logs, total, hasMore } =
        await this.auditService.getPaginatedAuditLogs(page, limit);

      res.status(200).json({
        success: true,
        data: logs,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          hasMore,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
