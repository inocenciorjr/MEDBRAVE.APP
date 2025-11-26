import { Router } from 'express';
import { DataImportExportController } from '../controller/dataImportExportController';
import { SupabaseDataImportExportService } from '../../../infra/integration/supabase/SupabaseDataImportExportService';
import { enhancedAuthMiddleware } from '../../auth/middleware/enhancedAuth.middleware';
import { requireFeature } from '../../auth/middleware/enhancedAuth.middleware';
import { roleMiddleware } from '../../auth/middleware/role.middleware';
import { UserRole } from '../../user/types';
import { rateLimit } from '../middleware/rateLimit.middleware';

// Inicializar o controlador com o serviço
const dataImportExportService = new SupabaseDataImportExportService();
const dataImportExportController = new DataImportExportController(
  dataImportExportService,
);

const router = Router();

// Todas as rotas requerem autenticação + plano ativo + feature de export
router.use(enhancedAuthMiddleware);
router.use(requireFeature('canExportData') as any);

/**
 * @route   POST /api/data-jobs
 * @desc    Cria um novo job de importação/exportação
 * @access  Private (Admin)
 */
router.post(
  '/',
  roleMiddleware([UserRole.ADMIN]),
  rateLimit('create_data_job', 10, 60 * 60), // 10 por hora
  dataImportExportController.createDataJob.bind(dataImportExportController),
);

/**
 * @route   GET /api/data-jobs/:jobId
 * @desc    Obtém um job pelo ID
 * @access  Private
 */
router.get(
  '/:jobId',
  dataImportExportController.getDataJobById.bind(dataImportExportController),
);

/**
 * @route   GET /api/data-jobs
 * @desc    Lista jobs com filtros e paginação
 * @access  Private
 */
router.get(
  '/',
  dataImportExportController.getDataJobs.bind(dataImportExportController),
);

/**
 * @route   DELETE /api/data-jobs/:jobId
 * @desc    Exclui um job
 * @access  Private (Admin ou o criador)
 */
router.delete(
  '/:jobId',
  dataImportExportController.deleteDataJob.bind(dataImportExportController),
);

/**
 * @route   PUT /api/data-jobs/:jobId/cancel
 * @desc    Cancela um job em andamento
 * @access  Private (Admin ou o criador)
 */
router.put(
  '/:jobId/cancel',
  dataImportExportController.cancelDataJob.bind(dataImportExportController),
);

/**
 * @route   POST /api/data-jobs/:jobId/execute-import
 * @desc    Executa um job de importação manualmente
 * @access  Private (Admin ou o criador)
 */
router.post(
  '/:jobId/execute-import',
  roleMiddleware([UserRole.ADMIN]),
  rateLimit('execute_import_job', 5, 60 * 60), // 5 por hora
  dataImportExportController.executeImportJob.bind(dataImportExportController),
);

/**
 * @route   POST /api/data-jobs/:jobId/execute-export
 * @desc    Executa um job de exportação manualmente
 * @access  Private (Admin ou o criador)
 */
router.post(
  '/:jobId/execute-export',
  roleMiddleware([UserRole.ADMIN]),
  rateLimit('execute_export_job', 5, 60 * 60), // 5 por hora
  dataImportExportController.executeExportJob.bind(dataImportExportController),
);

export default router;
