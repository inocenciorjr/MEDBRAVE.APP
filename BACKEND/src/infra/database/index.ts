// Database interfaces and implementations
export { IRepository } from './interfaces/IRepository';
export { SupabaseBaseRepository } from './SupabaseBaseRepository';

// Migration system - Supabase (recommended)
export {
  SupabaseMigrationManager,
  migrationManager,
} from './supabase/SupabaseMigrationManager';
export type {
  IDatabaseMigration,
  IDatabaseSeed,
} from './supabase/SupabaseMigrationManager';

 
