import { IAdminRepository } from '../repositories/AdminRepository';

/**
 * Caso de uso para criar um novo administrador
 */
export class CreateAdminUseCase {
  private adminRepository: IAdminRepository;

  constructor(adminRepository: IAdminRepository) {
    this.adminRepository = adminRepository;
  }

  /**
   * Executa o caso de uso
   * @param userId ID do usuário que será promovido a administrador
   * @param role Função do administrador (admin ou superadmin)
   * @param permissions Lista de permissões
   * @returns ID do administrador criado
   */
  async execute(
    userId: string,
    role: 'admin' | 'superadmin',
    permissions: string[],
  ): Promise<string> {
    // Validações adicionais podem ser feitas aqui antes de criar o administrador

    // Criar administrador
    return await this.adminRepository.create(userId, role, permissions);
  }
}
