// Exportar tipos
export * from './types';

// Exportar interfaces existentes
export { IQuestionService } from './interfaces/IQuestionService';

// Exportar serviços que existem após refatoração
export { FirebaseQuestionService } from './services/FirebaseQuestionService';
export { QuestionFSRSService } from './services/QuestionFSRSService';
export { QuestionRetentionService } from './services/QuestionRetentionService';
export { UnifiedQuestionResponseService } from './services/UnifiedQuestionResponseService';

// Exportar controladores que existem após refatoração
export { RetentionController } from './controllers/RetentionController';
export { UnifiedQuestionController } from './controllers/UnifiedQuestionController';

// Exportar rotas que existem após refatoração
export { default as retentionRoutes } from './routes/retentionRoutes';
export { default as unifiedQuestionRoutes } from './routes/unifiedQuestionRoutes';
