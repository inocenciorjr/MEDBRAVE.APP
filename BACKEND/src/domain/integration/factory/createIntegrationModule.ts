import { Router } from 'express';
import { DataImportExportController } from '../controller/dataImportExportController';
import { SupabaseDataImportExportService } from '../../../infra/integration/supabase/SupabaseDataImportExportService';

/**
 * Factory para criar o módulo de integração
 * @returns Objeto com rotas e serviços do módulo
 */
export function createIntegrationModule() {
  const router = Router();

  // Inicializar o serviço de importação/exportação de dados
  const dataImportExportService = new SupabaseDataImportExportService();

  // Inicializar o controlador
  const dataImportExportController = new DataImportExportController(
    dataImportExportService,
  );

  // Configurar rotas
  router.post(
    '/',
    dataImportExportController.createDataJob.bind(dataImportExportController),
  );
  router.get(
    '/:jobId',
    dataImportExportController.getDataJobById.bind(dataImportExportController),
  );
  router.get(
    '/',
    dataImportExportController.getDataJobs.bind(dataImportExportController),
  );
  router.delete(
    '/:jobId',
    dataImportExportController.deleteDataJob.bind(dataImportExportController),
  );
  router.put(
    '/:jobId/cancel',
    dataImportExportController.cancelDataJob.bind(dataImportExportController),
  );
  router.post(
    '/:jobId/execute-import',
    dataImportExportController.executeImportJob.bind(
      dataImportExportController,
    ),
  );
  router.post(
    '/:jobId/execute-export',
    dataImportExportController.executeExportJob.bind(
      dataImportExportController,
    ),
  );

  return {
    integrationRouter: router,
    dataImportExportService,
    dataImportExportController,
  };
}
