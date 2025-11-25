import { SupabaseAdminService } from '../../../infra/admin/supabase/SupabaseAdminService';
import { SupabaseAuditLogService } from '../../../infra/audit/supabase/SupabaseAuditLogService';

export class SupabaseAdminServiceFactory {
  private static adminService: SupabaseAdminService;
  private static auditService: SupabaseAuditLogService;

  static getAdminService(): SupabaseAdminService {
    if (!this.adminService) {
      this.adminService = SupabaseAdminService.getInstance();
    }
    return this.adminService;
  }

  static getAuditService(): SupabaseAuditLogService {
    if (!this.auditService) {
      this.auditService = SupabaseAuditLogService.getInstance();
    }
    return this.auditService;
  }

  static async createAdminWithAudit(
    adminData: Parameters<SupabaseAdminService['createAdmin']>[0],
    performedBy: string,
  ) {
    const adminService = this.getAdminService();
    const auditService = this.getAuditService();

    const newAdmin = await adminService.createAdmin(adminData);

    await auditService.logAction({
      type: 'CREATE_ADMIN',
      description: 'Novo administrador criado',
      performedBy,
      timestamp: new Date(),
      metadata: {
        targetId: newAdmin.id,
        adminEmail: (newAdmin as any).email || (newAdmin as any).userId,
        permissions: newAdmin.permissions,
      },
    });

    return newAdmin;
  }

  static async deleteAdminWithAudit(adminId: string, performedBy: string) {
    const adminService = this.getAdminService();
    const auditService = this.getAuditService();

    const admin = await adminService.getAdminById(adminId);
    if (!admin) {
      throw new Error('Admin não encontrado');
    }

    await adminService.deleteAdmin(adminId);

    await auditService.logAction({
      type: 'DELETE_ADMIN',
      description: 'Administrador removido',
      performedBy,
      timestamp: new Date(),
      metadata: {
        targetId: adminId,
        deletedAdminEmail: (admin as any).email || (admin as any).userId,
      },
    });
  }

  static async updateAdminPermissionsWithAudit(
    adminId: string,
    permissions: string[],
    performedBy: string,
  ) {
    const adminService = this.getAdminService();
    const auditService = this.getAuditService();

    const admin = await adminService.getAdminById(adminId);
    if (!admin) {
      throw new Error('Admin não encontrado');
    }

    await adminService.updateAdminPermissions(adminId, permissions);

    await auditService.logAction({
      type: 'UPDATE_ADMIN_PERMISSIONS',
      description: 'Permissões do administrador atualizadas',
      performedBy,
      timestamp: new Date(),
      metadata: {
        targetId: adminId,
        adminEmail: (admin as any).email || (admin as any).userId,
        oldPermissions: admin.permissions,
        newPermissions: permissions,
      },
    });
  }
}
