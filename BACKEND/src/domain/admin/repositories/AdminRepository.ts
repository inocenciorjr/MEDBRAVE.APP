import { AdminUser } from '../types/AdminTypes';

/**
 * Interface para o repositório de administradores
 */
export interface IAdminRepository {
  getAll(): Promise<AdminUser[]>;
  getById(id: string): Promise<AdminUser | null>;
  create(
    userId: string,
    role: 'admin' | 'superadmin',
    permissions: string[],
  ): Promise<string>;
  update(id: string, data: Partial<AdminUser>): Promise<void>;
  delete(id: string): Promise<void>;
}

// Implementação Supabase disponível em: ../../../infra/admin/supabase/SupabaseAdminRepository.ts
