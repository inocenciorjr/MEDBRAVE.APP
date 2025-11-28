import express from 'express';
import cors from 'cors';
import path from 'path';
import { SupabaseClient } from '@supabase/supabase-js';
import { createRouter } from './routes';
import { logger } from './utils/logger';
import { createAuditLogModule } from './domain/audit';
import { createNotificationsModule } from './domain/notifications/factories/createNotificationsModule';
import { createNotificationRoutes } from './domain/notifications/routes/notificationRoutes';
// import { createProxyMiddleware } from 'http-proxy-middleware';

import { createGoalRoutes } from './domain/goals/routes/goalRoutes';
import { createAlertRoutes } from './domain/alerts/routes/alertRoutes';
import { createSpecialtyAnalyticsRoutes } from './domain/analytics/routes/specialtyAnalyticsRoutes';
import { plannerRoutes } from './domain/planner';

// import requestMonitorMiddleware from './middleware/requestMonitor';
// import monitoringRoutes from './routes/monitoringRoutes';

/**
 * Cria e configura a aplicação Express
 * @param supabaseClient Instância do Supabase Client
 * @returns Aplicação Express configurada
 */
export const createApp = async (
  supabaseClient: SupabaseClient,
): Promise<express.Application> => {
  const app = express();

  // Middleware - CORS configurado via variável de ambiente
  const corsOrigins = process.env.CORS_ORIGINS?.split(',').map((origin) =>
    origin.trim(),
  ) || [
    'http://localhost:5173', // Frontend dev (npm run dev)
    'http://localhost:4173', // Frontend preview (npm run preview)
    'http://localhost:5000', // Backend Node.js
    'http://localhost:5001', // Flask
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5001', // Flask 127.0.0.1
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
  ];

  app.use(
    cors({
      origin: corsOrigins,
      credentials: true,
      optionsSuccessStatus: 200,
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    }),
  );

  // Configurar body-parser com limites maiores, mas excluir rotas de upload
  app.use((req, res, next) => {
    // Não aplicar express.json() para rotas de upload de arquivo
    if (
      req.path.includes('/bulk-from-pdf') ||
      req.path.includes('/flashcards/import') ||
      req.path.includes('/apkg/import') ||
      req.path.includes('/apkg-fsrs/import') || // ✅ CORREÇÃO ADICIONAL
      req.headers['content-type']?.includes('multipart/form-data')
    ) {
      return next();
    }

    // Aplicar JSON parser para outras rotas
    express.json({ limit: '50mb' })(req, res, next);
  });

  // Configurar urlencoded apenas para rotas que não são de upload de arquivo
  app.use((req, res, next) => {
    if (
      req.path.includes('/flashcards/import') ||
      req.path.includes('/apkg/import') ||
      req.path.includes('/apkg-fsrs/import') || // ✅ CORREÇÃO ADICIONAL
      req.headers['content-type']?.includes('multipart/form-data')
    ) {
      return next();
    }

    express.urlencoded({
      limit: "50mb",
      extended: true,
      parameterLimit: 50000,
    })(req, res, next);
  });



  // Debug middleware removido para melhor performance

  // CSP Middleware para permitir Google Fonts
  app.use((_req, res, next) => {
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; font-src 'self' https://fonts.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com;",
    );
    next();
  });

  // Middleware de monitoramento de requisições
  // app.use(requestMonitorMiddleware);



  // Health check routes
  app.get('/', (_req, res) => {
    res.status(200).json({ status: 'ok', message: 'MedBrave API is running' });
  });
  
  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  // API routes
  const router = await createRouter(supabaseClient);
  app.use('/api', router);

  // Goal routes
  app.use('/api/goals', createGoalRoutes());

  // Alert routes
  app.use('/api/alerts', createAlertRoutes());

  // Specialty analytics routes
  app.use(
    '/api/analytics/specialty',
    createSpecialtyAnalyticsRoutes(supabaseClient),
  );

  // Rotas do planner (Fase 7)
  app.use('/api/planner', plannerRoutes);

  // Statistics routes (Sistema de estatísticas)
  const statisticsRoutes = (await import('./domain/userStatistics/routes/statisticsRoutes')).default;
  app.use('/api/statistics', statisticsRoutes);

  // Review Sessions routes
  const reviewSessionRoutes = (await import('./domain/reviewSessions/routes/reviewSessionRoutes')).default;
  app.use('/api/review-sessions', reviewSessionRoutes);

  // User Goals routes
  const userGoalsRoutes = (await import('./domain/userGoals/routes/userGoalsRoutes')).default;
  app.use('/api/user-goals', userGoalsRoutes);

  // Study Sessions routes
  const studySessionRoutes = (await import('./domain/studySessions/routes/studySessionRoutes')).default;
  app.use('/api/study-sessions', studySessionRoutes);
  console.log('✅ Rotas de study-sessions registradas em /api/study-sessions');

  // Error Notebook Folders routes
  const errorNotebookFolderRoutes = (await import('./routes/errorNotebookFolderRoutes')).default;
  app.use('/api/error-notebook-folders', errorNotebookFolderRoutes);

  // Temp images from scraper
  const tempImagesRoutes = (await import('./routes/tempImagesRoutes')).default;
  app.use('/api/temp-images', tempImagesRoutes);

  // Test WebSocket routes (APENAS DESENVOLVIMENTO)
  if (process.env.NODE_ENV !== 'production') {
    const testWebsocketRoutes = (await import('./routes/testWebsocketRoutes')).default;
    app.use('/api/test/websocket', testWebsocketRoutes);
    logger.info('🧪 Rotas de teste WebSocket registradas em /api/test/websocket');
  }

  // Servir arquivos de upload locais
  app.use('/uploads', express.static('uploads'));

  // Em produção, servir arquivos estáticos do frontend
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../frontend/dist')));
    
    // Para rotas não encontradas, servir index.html (SPA)
    // Mas não capturar arquivos .js, .css, .ts, etc.
    app.get('*', (req, res) => {
      // Se for um arquivo estático, não servir index.html
      if (req.path.match(/\.(js|css|ts|tsx|json|png|jpg|jpeg|gif|svg|ico)$/)) {
        return res.status(404).send('Arquivo não encontrado');
      }
      return res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
    });
  }

  // Configurar rotas do módulo de auditoria
  const { auditLogRoutes } = createAuditLogModule({ supabaseClient });
  app.use('/api/audit-logs', auditLogRoutes);

  // Configurar rotas do módulo de notificações
  const { notificationController } = createNotificationsModule();
  const notificationRoutes = createNotificationRoutes(notificationController);
  app.use('/api/notifications', notificationRoutes);

  // Session management routes
  const sessionRoutes = (await import('./domain/auth/routes/sessionRoutes')).default;
  app.use('/api/auth', sessionRoutes);

  // Rotas de monitoramento
  // app.use('/api/monitoring', monitoringRoutes);

  // Rotas mock para /api/templates/email e /api/templates/sms
  app.get('/api/templates/email', (_req, res) => {
    res.json({ templates: [] });
  });
  app.get('/api/templates/sms', (_req, res) => {
    res.json({ templates: [] });
  });

  // Error handling
  app.use(
    (
      err: any,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      console.error('❌ Error Handler - Erro capturado:', err);

      // Se for um AppError, usar o status code específico
      if (err.statusCode && err.isOperational) {
        logger.warn('Erro operacional:', {
          statusCode: err.statusCode,
          message: err.message,
          code: err.code,
        });
        return res.status(err.statusCode).json({
          error: err.message,
          code: err.code,
        });
      }

      // Para outros erros, log completo e retorno genérico
      logger.error('Erro não tratado:', {
        error: err.message,
        stack: err.stack,
      });
      return res.status(500).json({ error: 'Erro interno do servidor' });
    },
  );

  return app;
};

export default createApp;
