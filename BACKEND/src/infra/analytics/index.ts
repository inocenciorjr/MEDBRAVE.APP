// Index da infraestrutura Analytics
// Centraliza todas as exportações da camada de infraestrutura

// Serviços
export {
  SpecialtyAnalyticsService,
  WeeklySpecialtySnapshot,
  SpecialtyTrendPoint,
  SpecialtyAlert,
} from './SpecialtyAnalyticsService';

// Rotas
export { createSpecialtyAnalyticsRoutes } from './specialtyAnalyticsRoutes';
export { createReportRoutes } from './reportRoutes';
