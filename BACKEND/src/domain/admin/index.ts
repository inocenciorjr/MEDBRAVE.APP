/**
 * Módulo de Administração
 *
 * Este módulo fornece funcionalidades para gerenciar usuários administrativos,
 * suas permissões e ações no sistema.
 */

// Exportar tipos
export * from './types/AdminTypes';

// Exportar serviços
export { SupabaseAdminService } from '../../infra/admin/supabase/SupabaseAdminService';
export { AdminDashboardService } from '../../infra/admin/supabase/AdminDashboardService';

// Exportar repositórios
export { IAdminRepository } from './repositories/AdminRepository';
export { SupabaseAdminRepository } from '../../infra/admin/supabase/SupabaseAdminRepository';

// Exportar middlewares
// adminMiddleware removido em favor de requireAdmin em src/middleware/adminAuth

// Exportar controllers
export { AdminController } from './controllers/AdminController';

// Exportar rotas
export { createAdminRoutes } from './routes/adminRoutes';

// Exportar casos de uso
export * from './use-cases';

// Exportar validadores
export * from './validators/adminValidators';

// Exportar factories
export { AdminFactory } from './factories/AdminFactory';
export { SupabaseAdminServiceFactory } from './factories/SupabaseAdminServiceFactory';
