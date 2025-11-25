import { FirebaseAdminServiceFactory } from '../factories/FirebaseAdminServiceFactory';
import { FirebaseAdminService } from '../services/FirebaseAdminService';
import { FirebaseAuditLogService } from '../../audit/FirebaseAuditLogService';

jest.mock('../services/FirebaseAdminService');
jest.mock('../../audit/FirebaseAuditLogService');

describe('FirebaseAdminServiceFactory', () => {
  let mockAdminService: jest.Mocked<FirebaseAdminService>;
  let mockAuditService: jest.Mocked<FirebaseAuditLogService>;

  beforeEach(() => {
    mockAdminService = {
      getInstance: jest.fn().mockReturnThis(),
      createAdmin: jest.fn(),
      deleteAdmin: jest.fn(),
      updateAdminPermissions: jest.fn(),
    } as any;

    mockAuditService = {
      getInstance: jest.fn().mockReturnThis(),
      logAction: jest.fn(),
    } as any;

    (FirebaseAdminService as any).getInstance = jest
      .fn()
      .mockReturnValue(mockAdminService);
    (FirebaseAuditLogService as any).getInstance = jest
      .fn()
      .mockReturnValue(mockAuditService);
  });

  describe('createAdminWithAudit', () => {
    it('deve criar um admin e registrar a ação', async () => {
      const adminData = {
        role: 'admin' as const,
        permissions: ['read'],
      };

      const now = new Date();
      const newAdmin = {
        id: 'admin-123',
        ...adminData,
        createdAt: now,
        updatedAt: now,
      };
      mockAdminService.createAdmin.mockResolvedValue(newAdmin);

      const result = await FirebaseAdminServiceFactory.createAdminWithAudit(
        adminData,
        'performer-123',
      );

      expect(mockAdminService.createAdmin).toHaveBeenCalledWith(adminData);
      expect(mockAuditService.logAction).toHaveBeenCalled();
      expect(result).toBe(newAdmin);
    });
  });

  describe('deleteAdminWithAudit', () => {
    it('deve deletar um admin e registrar a ação', async () => {
      await FirebaseAdminServiceFactory.deleteAdminWithAudit(
        'admin-123',
        'performer-123',
      );

      expect(mockAdminService.deleteAdmin).toHaveBeenCalledWith('admin-123');
      expect(mockAuditService.logAction).toHaveBeenCalled();
    });
  });

  describe('updateAdminPermissionsWithAudit', () => {
    it('deve atualizar permissões e registrar a ação', async () => {
      const permissions = ['read', 'write'];

      await FirebaseAdminServiceFactory.updateAdminPermissionsWithAudit(
        'admin-123',
        permissions,
        'performer-123',
      );

      expect(mockAdminService.updateAdminPermissions).toHaveBeenCalledWith(
        'admin-123',
        permissions,
      );
      expect(mockAuditService.logAction).toHaveBeenCalled();
    });
  });
});
