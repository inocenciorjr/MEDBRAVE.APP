// Exportar tipos
export * from './types';

// Exportar interfaces existentes
export { IQuestionService } from './interfaces/IQuestionService';

// Exportar serviços que existem após refatoração
// Firebase services removed - using Supabase services from infra layer
// export { FirebaseQuestionService } from './services/FirebaseQuestionService';
export {
  SupabaseQuestionService,
} from '../../infra/questions/supabase';

// Exportar controladores que existem após refatoração
export { UnifiedQuestionController } from './controllers/UnifiedQuestionController';

// Exportar rotas que existem após refatoração
export { default as unifiedQuestionRoutes } from './routes/unifiedQuestionRoutes';
