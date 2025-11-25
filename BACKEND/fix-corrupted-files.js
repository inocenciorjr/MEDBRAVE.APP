const fs = require('fs');
const path = require('path');

const BACKEND_DIR = 'C:\\MEDBRAVE.APP\\MEDBRAVE.APP\\BACKEND';
const FRONTEND_DIR = 'C:\\MEDBRAVE.APP\\MEDBRAVE.APP\\FRONTEND';

const CORRUPTED_FILES = [
  // Backend files from erro.md
  'processador-apkg-completo.backup.js',
  'processador-apkg-completo.js',
  'scripts/migrate-processador-to-supabase.js',
  'scripts/migration-camel-to-snake.sql',
  'scripts/MIGRATION_GUIDE.md',
  'src/domain/studyTools/flashcards/routes/apkgImportRoutes.ts',
  'src/domain/userStatistics/controllers/UserStatisticsController.ts',
  'src/infra/achievements/supabase/SupabaseAchievementService.ts',
  'tabelas e colunas.md',
  'src/domain/auth/middleware/self.middleware.ts',
  'src/domain/auth/routes/test-auth.ts',
  'src/domain/auth/services/AuthService.ts',
  'src/domain/content/interfaces/ILikeService.ts',
  'src/domain/goals/routes/goalRoutes.ts',
  'src/domain/integration/controller/dataImportExportController.ts',
  'src/domain/media/services/mediaService.ts',
  'src/domain/mentorship/controllers/MentorshipController.ts',
  'src/domain/mentorship/controllers/MentorshipMeetingController.ts',
  'src/domain/mentorship/interfaces/IMentorProfileService.ts',
  'src/domain/mentorship/interfaces/IMentorshipFeedbackService.ts',
  'src/domain/mentorship/interfaces/IMentorshipResourceService.ts',
  'src/domain/mentorship/interfaces/IMentorshipSimulatedExamService.ts',
  'src/domain/mentorship/middlewares/authMiddleware.ts',
  'src/domain/mentorship/routes/mentorProfileRoutes.ts',
  'src/domain/notifications/controllers/DeviceController.ts',
  'src/domain/notifications/controllers/NotificationController.ts',
  'src/domain/notifications/controllers/NotificationPreferencesController.ts',
  'src/domain/notifications/interfaces/IDeviceService.ts',
  'src/domain/notifications/interfaces/IEmailVerificationTokenService.ts',
  'src/domain/notifications/interfaces/INotificationService.ts',
  'src/domain/notifications/README.md',
  'src/domain/notifications/types/index.ts',
  'src/domain/notifications/use-cases/GetNotificationPreferencesUseCase.ts',
  'src/domain/notifications/use-cases/GetUserNotificationsUseCase.ts',
  'src/domain/payment/controllers/InvoiceController.ts',
  'src/domain/payment/controllers/PaymentController.ts',
  'src/domain/payment/controllers/UserPlanController.ts',
  'src/domain/payment/interfaces/IInvoiceService.ts',
  'src/domain/payment/interfaces/IPaymentService.ts',
  'src/domain/payment/interfaces/IUserPlanService.ts',
  'src/domain/payment/routes/invoiceRoutes.ts',
  'src/domain/payment/routes/paymentRoutes.ts',
  'src/domain/payment/routes/userPlanRoutes.ts',
  'src/domain/payment/types/index.ts',
  'src/domain/questions/controllers/RetentionController.ts',
  'src/domain/questions/interfaces/IQuestionService.ts',
  'src/domain/questions/types/index.ts',
  'src/domain/simulatedExam/controllers/SimulatedExamController.ts',
  'src/domain/simulatedExam/interfaces/ISimulatedExamService.ts',
  'src/domain/simulatedExam/routes/simulatedExamRoutes.ts',
  'src/domain/studyTools/errorNotebook/controllers/errorNotebookEntryController.ts',
  'src/domain/studyTools/errorNotebook/use-cases/CreateErrorEntryUseCase.ts',
  'src/domain/studyTools/errorNotebook/use-cases/CreateErrorNotebookUseCase.ts',
  'src/domain/studyTools/errorNotebook/use-cases/GetErrorEntriesByNotebookUseCase.ts',
  'src/domain/studyTools/errorNotebook/use-cases/GetErrorNotebookByIdUseCase.ts',
  'src/domain/studyTools/errorNotebook/use-cases/GetErrorNotebookStatsUseCase.ts',
  'src/domain/studyTools/flashcards/controllers/deckController.ts',
  'src/domain/studyTools/flashcards/controllers/flashcardController.ts',
  'src/domain/studyTools/flashcards/controllers/optimizedSearchController.ts',
  'src/domain/studyTools/flashcards/middleware/searchIndexMiddleware.ts',
  'src/domain/studyTools/flashcards/repositories/IDeckRepository.ts',
  'src/domain/studyTools/flashcards/routes/apkgImportFSRSRoutes.ts',
  'src/domain/studyTools/flashcards/routes/flashcardRoutes.ts',
  'src/domain/studyTools/flashcards/use-cases/CreateFlashcardUseCase.ts',
  'src/domain/studyTools/flashcards/use-cases/__tests__/CreateFlashcardUseCase.firebase.test.ts',
  'src/domain/studyTools/studySessions/use-cases/CreateStudySessionUseCase.ts',
  'src/domain/studyTools/unifiedReviews/docs/OTIMIZACOES_IMPLEMENTADAS.md',
  'src/domain/studyTools/unifiedReviews/README.md',
  'src/domain/user/routes/userRoutes.ts',
  'src/domain/userStatistics/routes/userStatisticsRoutes.ts',
  'src/infra/admin/supabase/SupabaseAdminService.ts',
  'src/infra/analytics/reportRoutes.ts',
  'src/infra/analytics/SpecialtyAnalyticsService.ts',
  'src/infra/cache/firebase/FirebaseCacheService.ts',
  'src/infra/factory.ts',
  'src/infra/http/controllers/DeckController.ts',
  'src/infra/http/controllers/FlashcardController.ts',
  'src/infra/media/supabase/SupabaseMediaService.ts',
  'src/infra/mentorship/supabase/SupabaseMentorshipMeetingService.ts',
  'src/infra/monitoring/types.d.ts',
  'src/infra/notificationLogs/SupabaseNotificationLogger.ts',
  'src/infra/notifications/supabase/SupabaseNotificationRepository.ts',
  'src/infra/notifications/supabase/SupabaseNotificationService.ts',
  'src/infra/payment/supabase/SupabaseInvoiceService.ts',
  'src/infra/payment/supabase/SupabasePaymentNotificationService.ts',
  'src/infra/payment/supabase/SupabasePaymentService.ts',
  'src/infra/payment/supabase/SupabaseUserPlanService.ts',
  'src/infra/planner/supabase/SupabasePlannerService.ts',
  'src/infra/pulseAI/supabase/SupabasePulseAILogger.ts',
  'src/infra/questions/supabase/SupabaseQuestionFSRSService.ts',
  'src/infra/questions/supabase/SupabaseQuestionService.ts',
  'src/infra/questions/supabase/SupabaseUnifiedQuestionResponseService.ts',
  'src/infra/srs/supabase/SupabaseFSRSService.ts',
  'src/infra/studyTools/supabase/SupabaseApkgReaderService.ts',
  'src/infra/studyTools/supabase/SupabaseDeckRepository.ts',
  'src/infra/studyTools/supabase/SupabaseDeckService.ts',
  'src/infra/studyTools/supabase/SupabaseFlashcardRepository.ts',
  'src/infra/studyTools/supabase/SupabasePerformanceMonitoringService.ts',
  'src/infra/studyTools/supabase/SupabaseReviewManagementService.ts',
  'src/infra/studyTools/supabase/SupabaseSearchIndexService.ts',
  'src/infra/studyTools/supabase/SupabaseStudySessionService.ts',
  'src/infra/userStatistics/SupabaseUserStatisticsService.ts',
  'src/middleware/requestMonitor.ts',
  'src/routes/monitoringRoutes.ts',
  'src/routes.ts',
  'src/scripts/migrate-admin-flashcard-controller.ts',
  'src/utils/idGenerator.ts',
  'src/utils/tests/idGenerator.test.ts',
  'src/websocket/webSocketServer.ts'
];

const FRONTEND_CORRUPTED_FILES = [
  'src/components/FlashcardsList.jsx',
  'src/components/ImageUpload.jsx',
  'src/components/planner/PlannerCalendar.jsx',
  'src/components/planner/PlannerCard.jsx',
  'src/components/planner/PlannerDashboard.jsx',
  'src/components/PlannerStats.jsx',
  'src/config/r2Config.js',
  'src/docs/OTIMIZACAO_REVISOES.md',
  'src/features/admin/AdminAuditLogsPage.tsx',
  'src/features/admin/AdminNotificationsPage.tsx',
  'src/features/admin/flashcards/AdminFlashcardsPage.jsx',
  'src/features/admin/flashcards/FlashcardDeckList.jsx',
  'src/features/admin/flashcards/FlashcardLibrary.jsx',
  'src/features/admin/flashcards/FlashcardsList.jsx',
  'src/features/admin/UsersAdminPage.tsx',
  'src/services/achievementService.ts',
  'src/services/plannerApi.js',
  'src/services/requestMonitor.js',
  'src/services/userStatisticsService.ts',
  'src/utils/hierarchyUtils.js',
  'src/utils/idGenerator.ts'
];

// Patterns to identify and fix corruption
const CORRUPTION_PATTERNS = [
  // Remove duplicated import statements with numbers
  /\d+user_id\s*import\s*\{[^}]*\}\s*from\s*['"][^'"]*['"];?/g,
  // Remove invalid control characters and numbers before imports
  /\d+[a-zA-Z_]+\s*(?=import|export|const|let|var|function|class)/g,
  // Remove standalone numbers followed by identifiers
  /^\d+[a-zA-Z_][a-zA-Z0-9_]*$/gm,
  // Remove invalid string length patterns
  /Invalid string length/g,
  // Remove corrupted line breaks with numbers
  /\d+\r?\n/g
];

function createBackup(filePath) {
  const backupPath = filePath + '.backup-' + Date.now();
  try {
    fs.copyFileSync(filePath, backupPath);
    console.log(`✓ Backup criado: ${backupPath}`);
    return backupPath;
  } catch (error) {
    console.error(`✗ Erro ao criar backup de ${filePath}:`, error.message);
    return null;
  }
}

function fixFileCorruption(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠ Arquivo não encontrado: ${filePath}`);
      return false;
    }

    // Create backup
    const backupPath = createBackup(filePath);
    if (!backupPath) {
      return false;
    }

    // Read file content
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;

    // Apply corruption fixes
    CORRUPTION_PATTERNS.forEach(pattern => {
      content = content.replace(pattern, '');
    });

    // Normalize line breaks
    content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Remove excessive empty lines
    content = content.replace(/\n{3,}/g, '\n\n');

    // Trim whitespace
    content = content.trim();

    // Only write if content changed
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✓ Arquivo corrigido: ${filePath}`);
      return true;
    } else {
      console.log(`- Nenhuma correção necessária: ${filePath}`);
      // Remove backup if no changes were made
      fs.unlinkSync(backupPath);
      return false;
    }
  } catch (error) {
    console.error(`✗ Erro ao corrigir ${filePath}:`, error.message);
    return false;
  }
}

function fixCorruptedFiles() {
  console.log('🔧 Iniciando correção de arquivos corrompidos...');
  console.log(`📁 Total de arquivos para corrigir: ${CORRUPTED_FILES.length + FRONTEND_CORRUPTED_FILES.length}`);
  
  let fixedCount = 0;
  let errorCount = 0;

  // Fix backend files
  console.log('\n📂 Corrigindo arquivos do BACKEND...');
  CORRUPTED_FILES.forEach(file => {
    const fullPath = path.join(BACKEND_DIR, file);
    if (fixFileCorruption(fullPath)) {
      fixedCount++;
    } else {
      errorCount++;
    }
  });

  // Fix frontend files
  console.log('\n📂 Corrigindo arquivos do FRONTEND...');
  FRONTEND_CORRUPTED_FILES.forEach(file => {
    const fullPath = path.join(FRONTEND_DIR, file);
    if (fixFileCorruption(fullPath)) {
      fixedCount++;
    } else {
      errorCount++;
    }
  });

  console.log('\n📊 RESUMO DA CORREÇÃO:');
  console.log(`✓ Arquivos corrigidos: ${fixedCount}`);
  console.log(`✗ Arquivos com erro: ${errorCount}`);
  console.log(`📁 Total processado: ${fixedCount + errorCount}`);
  
  if (fixedCount > 0) {
    console.log('\n🎉 Correção concluída! Execute o projeto para verificar se os erros foram resolvidos.');
  } else {
    console.log('\n⚠ Nenhum arquivo foi corrigido. Verifique se os arquivos existem e têm as permissões adequadas.');
  }
}

// Execute the fix
if (require.main === module) {
  fixCorruptedFiles();
}

module.exports = {
  fixCorruptedFiles,
  fixFileCorruption,
  CORRUPTED_FILES,
  FRONTEND_CORRUPTED_FILES
};