/**
 * Módulo de Notificações
 *
 * Implementa um sistema completo de gerenciamento de notificações para os usuários da plataforma.
 */

// Exportar tipos
export * from './types';

// Exportar interfaces
export * from './interfaces/INotificationService';
export * from './interfaces/IDeviceService';

// Exportar serviços
// Firebase services removed - using Supabase services from infra layer
// export * from './services/FirebaseNotificationService';
// export * from './services/FirebaseDeviceService';

// Exportar controladores
export * from './controllers/NotificationController';
export * from './controllers/DeviceController';

// Exportar validadores
export * from './validators/notificationValidators';
export * from './validators/deviceValidators';

// Exportar repositórios
// Repositórios migrados para camada infra (Supabase)

// Exportar casos de uso
export * from './use-cases';

// Exportar factory
export * from './factories/createNotificationsModule';
