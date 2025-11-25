// Exportação das interfaces
export type { IRepository } from './database/interfaces/IRepository';
export type { ICacheService } from './cache/interfaces/ICacheService';

// Exportação das implementações de repositório - Supabase (recomendado)
export { SupabaseBaseRepository } from './database/SupabaseBaseRepository';

// Exportação das implementações de cache - Supabase (recomendado)
export { SupabaseCacheService } from './cache/supabase/SupabaseCacheService';
export { cacheService } from './cache';

// Exportação das implementações de notificação - Supabase (recomendado)
export {
  SupabaseNotificationLogger,
  notificationLogger,
} from './notificationLogs';
export { NotificationMonitor, notificationMonitor } from './monitoring';

// Exportação das implementações de migração - Supabase (recomendado)
export { SupabaseMigrationManager, migrationManager } from './database';

// Exportação dos factories Supabase (recomendado)
// export removido: factories não possui índice com createNotificationModule
export { createStudyToolsModule } from './factories-dir/studyTools/createStudyToolsModule';
export { createFlashcardModule } from './factories-dir/studyTools/createFlashcardModule';
export { createStudySessionModule } from './factories-dir/studyTools/createStudySessionModule';

 

// Exportação do factory principal
export {
  default as infraFactory,
  getCacheService,
  setupCacheCleanupJob,
} from './factory';
