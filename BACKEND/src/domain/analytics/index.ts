// Index principal do domínio Analytics
// Centraliza todas as exportações para facilitar importações

// Serviços
export {
  SpecialtyAnalyticsService,
  WeeklySpecialtySnapshot,
  SpecialtyTrendPoint,
  SpecialtyAlert,
} from './services/SpecialtyAnalyticsService';

// Rotas
export { createSpecialtyAnalyticsRoutes } from './routes/specialtyAnalyticsRoutes';
export { createReportRoutes } from './routes/reportRoutes';

// Exportar outros serviços de analytics quando existirem
// export { OtherAnalyticsService } from './services/OtherAnalyticsService';
