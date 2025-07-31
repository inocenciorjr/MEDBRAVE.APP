/**
 * Módulo de Administração
 *
 * Este módulo fornece funcionalidades para gerenciar usuários administrativos,
 * suas permissões e ações no sistema.
 */

// Exportar tipos
export * from './types/AdminTypes';

// Exportar serviços
export { FirebaseAdminService } from './services/FirebaseAdminService';
export { AdminDashboardService } from './services/AdminDashboardService';

// Exportar repositórios
export { IAdminRepository, FirebaseAdminRepository } from './repositories/AdminRepository';

// Exportar middlewares
export { adminMiddleware } from './middlewares/adminMiddleware';

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
export { FirebaseAdminServiceFactory } from './factories/FirebaseAdminServiceFactory';
