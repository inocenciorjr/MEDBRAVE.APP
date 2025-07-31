/**
 * Módulo de Integração
 *
 * Fornece funcionalidades para importação e exportação de dados.
 */

// Exportar tipos
export * from './types';

// Exportar validadores
export * from './validation/dataJobValidation';

// Exportar factory
export * from './factory/createIntegrationModule';

// Exportar rotas (re-exportando para manter compatibilidade com código existente)
import dataImportExportRoutes from './routes/dataImportExportRoutes';
export { dataImportExportRoutes };
