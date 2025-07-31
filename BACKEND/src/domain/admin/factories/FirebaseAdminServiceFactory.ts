import { FirebaseAdminService } from '../services/FirebaseAdminService';
import { FirebaseAuditLogService } from '../../audit/FirebaseAuditLogService';

export class FirebaseAdminServiceFactory {
  private static adminService: FirebaseAdminService;
  private static auditService: FirebaseAuditLogService;

  static getAdminService(): FirebaseAdminService {
    if (!this.adminService) {
      this.adminService = FirebaseAdminService.getInstance();
    }
    return this.adminService;
  }

  static getAuditService(): FirebaseAuditLogService {
    if (!this.auditService) {
      this.auditService = FirebaseAuditLogService.getInstance();
    }
    return this.auditService;
  }

  static async createAdminWithAudit(
    adminData: Parameters<FirebaseAdminService['createAdmin']>[0],
    performedBy: string,
  ) {
    const adminService = this.getAdminService();
    const auditService = this.getAuditService();

    const newAdmin = await adminService.createAdmin(adminData);

    await auditService.logAction({
      type: 'CREATE_ADMIN',
      description: `Admin user created: ${newAdmin.id}`,
      performedBy,
      timestamp: new Date(),
      metadata: { adminId: newAdmin.id },
    });

    return newAdmin;
  }

  static async deleteAdminWithAudit(adminId: string, performedBy: string) {
    const adminService = this.getAdminService();
    const auditService = this.getAuditService();

    await adminService.deleteAdmin(adminId);

    await auditService.logAction({
      type: 'DELETE_ADMIN',
      description: `Admin user deleted: ${adminId}`,
      performedBy,
      timestamp: new Date(),
      metadata: { adminId },
    });
  }

  static async updateAdminPermissionsWithAudit(
    adminId: string,
    permissions: string[],
    performedBy: string,
  ) {
    const adminService = this.getAdminService();
    const auditService = this.getAuditService();

    await adminService.updateAdminPermissions(adminId, permissions);

    await auditService.logAction({
      type: 'UPDATE_ADMIN_PERMISSIONS',
      description: `Admin permissions updated: ${adminId}`,
      performedBy,
      timestamp: new Date(),
      metadata: { adminId, permissions },
    });
  }
}
