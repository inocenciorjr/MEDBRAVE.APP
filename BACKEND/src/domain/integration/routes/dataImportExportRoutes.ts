import { Router } from 'express';
import { DataImportExportController } from '../controller/dataImportExportController';
import { SupabaseDataImportExportService } from '../../../infra/integration/supabase/SupabaseDataImportExportService';
import { supabaseAuthMiddleware as authMiddleware } from '../../auth/middleware/supabaseAuth.middleware';
import { roleMiddleware } from '../../auth/middleware/role.middleware';
import { UserRole } from '../../user/types';
import { rateLimit } from '../middleware/rateLimit.middleware';

// Inicializar o controlador com o serviço
const dataImportExportService = new SupabaseDataImportExportService();
const dataImportExportController = new DataImportExportController(
  dataImportExportService,
);

const router = Router();

/**
 * @route   POST /api/data-jobs
 * @desc    Cria um novo job de importação/exportação
 * @access  Private (Admin)
 */
router.post(
  '/',
  authMiddleware,
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
  authMiddleware,
  dataImportExportController.getDataJobById.bind(dataImportExportController),
);

/**
 * @route   GET /api/data-jobs
 * @desc    Lista jobs com filtros e paginação
 * @access  Private
 */
router.get(
  '/',
  authMiddleware,
  dataImportExportController.getDataJobs.bind(dataImportExportController),
);

/**
 * @route   DELETE /api/data-jobs/:jobId
 * @desc    Exclui um job
 * @access  Private (Admin ou o criador)
 */
router.delete(
  '/:jobId',
  authMiddleware,
  dataImportExportController.deleteDataJob.bind(dataImportExportController),
);

/**
 * @route   PUT /api/data-jobs/:jobId/cancel
 * @desc    Cancela um job em andamento
 * @access  Private (Admin ou o criador)
 */
router.put(
  '/:jobId/cancel',
  authMiddleware,
  dataImportExportController.cancelDataJob.bind(dataImportExportController),
);

/**
 * @route   POST /api/data-jobs/:jobId/execute-import
 * @desc    Executa um job de importação manualmente
 * @access  Private (Admin ou o criador)
 */
router.post(
  '/:jobId/execute-import',
  authMiddleware,
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
  authMiddleware,
  roleMiddleware([UserRole.ADMIN]),
  rateLimit('execute_export_job', 5, 60 * 60), // 5 por hora
  dataImportExportController.executeExportJob.bind(dataImportExportController),
);

export default router;
