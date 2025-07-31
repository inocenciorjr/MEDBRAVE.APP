import { AdminFactory } from '../factories/AdminFactory';

describe('AdminFactory', () => {
  describe('createUser', () => {
    it('deve criar um usuário admin válido', () => {
      const adminData = {
        role: 'admin' as const,
        permissions: ['read', 'write'],
      };

      const admin = AdminFactory.createUser(adminData);

      expect(admin).toHaveProperty('id');
      expect(admin.role).toBe('admin');
      expect(admin.permissions).toEqual(['read', 'write']);
      expect(admin.createdAt).toBeInstanceOf(Date);
      expect(admin.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('createAction', () => {
    it('deve criar uma ação admin válida', () => {
      const actionData = {
        type: 'CREATE_USER',
        description: 'Created new user',
        performedBy: 'admin-123',
        metadata: { userId: 'user-123' },
      };

      const action = AdminFactory.createAction(actionData);

      expect(action.type).toBe('CREATE_USER');
      expect(action.description).toBe('Created new user');
      expect(action.performedBy).toBe('admin-123');
      expect(action.metadata).toEqual({ userId: 'user-123' });
      expect(action.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('createAuditLog', () => {
    it('deve criar um log de auditoria válido', () => {
      const action = AdminFactory.createAction({
        type: 'CREATE_USER',
        description: 'Created new user',
        performedBy: 'admin-123',
      });

      const auditLog = AdminFactory.createAuditLog(action);

      expect(auditLog).toHaveProperty('id');
      expect(auditLog.action).toBe(action);
      expect(auditLog.createdAt).toBeInstanceOf(Date);
    });
  });
});
