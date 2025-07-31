/**
 * Módulo de Auditoria
 *
 * Implementa funcionalidades para registro e consulta de logs de auditoria
 * das ações administrativas no sistema.
 */

// Exportar tipos
export * from './types';

// Exportar interfaces
export * from './interfaces/IAuditLogService';

// Exportar implementações
export { FirebaseAuditLogService } from './FirebaseAuditLogService';

// Exportar controladores
export { AuditLogController } from './controllers/AuditLogController';

// Exportar rotas
export { createAuditLogRoutes } from './routes/auditLogRoutes';

// Exportar factory
export { createAuditLogModule } from './factory/createAuditLogModule';

// Exportar validadores
export * from './validators/auditLogValidators';

// Exportar repositórios
export { IAuditLogRepository, FirebaseAuditLogRepository } from './repositories/AuditLogRepository';

// Exportar casos de uso
export * from './use-cases';
