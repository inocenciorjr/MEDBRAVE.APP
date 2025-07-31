import { IAdminRepository } from '../repositories/AdminRepository';
import { AdminUser } from '../types/AdminTypes';

/**
 * Caso de uso para obter todos os administradores
 */
export class GetAllAdminsUseCase {
  private adminRepository: IAdminRepository;

  constructor(adminRepository: IAdminRepository) {
    this.adminRepository = adminRepository;
  }

  /**
   * Executa o caso de uso
   * @returns Lista de todos os administradores
   */
  async execute(): Promise<AdminUser[]> {
    return await this.adminRepository.getAll();
  }
}
