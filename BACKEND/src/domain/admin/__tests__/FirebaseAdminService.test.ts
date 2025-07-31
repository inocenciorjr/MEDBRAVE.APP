import { FirebaseAdminService } from '../services/FirebaseAdminService';
import { ErrorWithCode } from '../../../shared/errors/ErrorWithCode';

describe('FirebaseAdminService', () => {
  let adminService: FirebaseAdminService;
  const testAdminId = 'test-admin-id';

  beforeEach(() => {
    adminService = FirebaseAdminService.getInstance();
  });

  describe('logAdminAction', () => {
    it('deve registrar uma ação administrativa com sucesso', async () => {
      const action = await adminService.logAdminAction({
        type: 'CREATE_USER',
        description: 'Criação de usuário',
        performedBy: testAdminId,
        metadata: { test: 'data' },
      });

      expect(action).toBeUndefined(); // logAdminAction retorna void
    });

    it('deve falhar ao registrar ação com dados inválidos', async () => {
      await expect(
        adminService.logAdminAction({
          type: '',
          description: '',
          performedBy: '',
          metadata: { test: 'data' },
        }),
      ).rejects.toThrow(ErrorWithCode);
    });
  });

  // Os métodos abaixo não existem na implementação real de FirebaseAdminService
  // describe('createAdminTask', ...)
  // describe('updateAdminTask', ...)
  // describe('getAdminTasks', ...)
  // describe('isUserAdmin', ...)
  // describe('setUserAsAdmin', ...)
  // describe('blockUser', ...)
  // describe('unblockUser', ...)
  // describe('deleteUserByAdmin', ...)
});
