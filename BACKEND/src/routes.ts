import * as express from "express";
import { SupabaseClient } from "@supabase/supabase-js";
import contentRoutes from "./domain/content/routes/contentRoutes";
// Error notebook routes serão importadas dinamicamente com configuração da Fase 3

import dataImportExportRoutes from "./domain/integration/routes/dataImportExportRoutes";

// ETAPA 1: Importar createStudyToolsModule para centralizar todas as ferramentas de estudo
import { createStudyToolsModule } from "./domain/studyTools/factories/createStudyToolsModule";
import unifiedQuestionRoutes from "./domain/questions/routes/unifiedQuestionRoutes";
// Imports removidos: axios, FormData, fs, path (não utilizados)

import { supabaseAuthMiddleware as authMiddleware } from "./domain/auth/middleware/supabaseAuth.middleware";
// import { createTermoGameRoutes } from "./routes/termoGameRoutes"; // Removido para usar import dinâmico

/**
 * Cria e configura todas as rotas da API
 * @param supabase Instância do SupabaseClient
 * @returns Router configurado com todas as rotas da API
 */
export const createRouter = async (supabase: SupabaseClient): Promise<express.Router> => {
  const router = express.Router();

  // Rotas de autenticação
  try {
    const authRoutes =
      require("./domain/auth/routes/authRoutes").createAuthRoutes(supabase);
    router.use("/auth", authRoutes);
  } catch (error) {
    console.warn("Erro ao carregar rotas de autenticação:", error);
  }

  // Rotas de usuários
  try {
    const userRoutes =
      require("./domain/user/routes/userRoutes").createUserRoutes();
    router.use("/user", userRoutes);
    console.log('✅ Rotas de usuários registradas em /user');
  } catch (error) {
    console.error("❌ Erro ao carregar rotas de usuários:", error);
  }

  // Rotas de rastreamento de atividade
  try {
    const activityRoutes = require("./domain/user/routes/activityRoutes").default;
    router.use("/activity", activityRoutes);
    console.log('✅ Rotas de atividade registradas em /activity');
  } catch (error) {
    console.error("❌ Erro ao carregar rotas de atividade:", error);
  }

  // Rotas de questões
  router.use("/questions", unifiedQuestionRoutes);

  // Rotas de histórico de questões
  try {
    const questionHistoryRoutes = require("./domain/questions/routes/questionHistoryRoutes").default;
    router.use("/questions", questionHistoryRoutes);
    console.log('✅ Rotas de histórico de questões registradas');
  } catch (error) {
    console.error("❌ Erro ao carregar rotas de histórico:", error);
  }

  // Rotas de comentários de questões
  try {
    const { createCommentRoutes } = require("./domain/questions/routes/commentRoutes");
    const commentRoutes = createCommentRoutes(supabase);
    router.use("/comments", commentRoutes);
    console.log('✅ Rotas de comentários registradas em /comments');
  } catch (error) {
    console.error("❌ Erro ao carregar rotas de comentários:", error);
  }

  // Rotas de interações com questões (likes, estilos)
  try {
    const { createQuestionInteractionRoutes } = require("./domain/questions/routes/questionInteractionRoutes");
    const questionInteractionRoutes = createQuestionInteractionRoutes(supabase);
    router.use("/questions", questionInteractionRoutes);
    console.log('✅ Rotas de interações com questões registradas');
  } catch (error) {
    console.error("❌ Erro ao carregar rotas de interações:", error);
  }

  // Rotas de avaliações de explicações
  try {
    const { createExplanationRatingRoutes } = require("./domain/questions/routes/explanationRatingRoutes");
    const explanationRatingRoutes = createExplanationRatingRoutes(supabase);
    router.use("/explanation-ratings", explanationRatingRoutes);
    console.log('✅ Rotas de avaliações de explicações registradas em /explanation-ratings');
  } catch (error) {
    console.error("❌ Erro ao carregar rotas de avaliações:", error);
  }

  // Rotas de notas de atualização
  try {
    const { createUpdateNoteRoutes } = require("./domain/questions/routes/updateNoteRoutes");
    const updateNoteRoutes = createUpdateNoteRoutes(supabase);
    router.use("/update-notes", updateNoteRoutes);
    console.log('✅ Rotas de notas de atualização registradas em /update-notes');
  } catch (error) {
    console.error("❌ Erro ao carregar rotas de notas de atualização:", error);
  }

  // REMOVIDO: Listas de questões foram integradas ao sistema unificado
  // As funcionalidades de listas agora estão em /api/questions/lists/:id/items

  // Rotas de exames simulados
  try {
    const {
      createSimulatedExamModule,
    } = require("./domain/simulatedExam/factory/createSimulatedExamModule");
    const simulatedExamRoutes = createSimulatedExamModule({
      supabase: supabase,
    });

    router.use("/simulated-exams", simulatedExamRoutes);
  } catch (error) {
    console.warn("Erro ao carregar rotas de exames simulados:", error);
  }

  // Rotas de perfil
  try {
    const profileRoutes =
      require("./domain/profile/routes/profileRoutes").createProfileRoutes(
        supabase,
      );
    router.use("/profiles", profileRoutes);
  } catch (error) {
    console.warn("Erro ao carregar rotas de perfis:", error);
  }

  // Rotas de conteúdo
  router.use("/content", contentRoutes);

  // FASE 5: Rotas de retenção e estatísticas avançadas
  try {
    // Retention routes removed - FSRS specific logic deprecated
  } catch (error) {
    console.warn("Erro ao carregar rotas de retenção:", error);
  }

  // ETAPA 1: Rotas de ferramentas de estudo centralizadas via createStudyToolsModule
  try {
    const studyToolsModule = createStudyToolsModule({
      supabaseClient: supabase,
    });

    // Registrar rotas de flashcards (já inclui rotas de coleções internamente)
    router.use("/flashcards", studyToolsModule.studyToolsRoutes.flashcards);

    // Rotas de busca otimizada removidas - agora usa GIN index diretamente

    // Registrar rotas de caderno de erros
    router.use(
      "/error-notebook",
      studyToolsModule.studyToolsRoutes.errorNotebooks,
    );

    // ETAPA 1: Registrar rotas unificadas de revisão (/api/unified-reviews)
    // authMiddleware já aplicado individualmente em cada rota
    router.use(
      "/unified-reviews",
      studyToolsModule.studyToolsRoutes.unifiedReviews,
    );

    // Rotas de preferências de revisão
    try {
      const reviewPreferencesRoutes = require("./domain/studyTools/unifiedReviews/routes/reviewPreferencesRoutes").default;
      router.use("/review-preferences", reviewPreferencesRoutes);
      console.log('✅ Rotas de preferências de revisão registradas em /review-preferences');
    } catch (error) {
      console.error("❌ Erro ao carregar rotas de preferências:", error);
    }

    // Rotas de gerenciamento de items de revisão
    try {
      const { createReviewItemManagementRoutes } = require("./domain/studyTools/unifiedReviews/routes/reviewItemManagementRoutes");
      const reviewItemRoutes = createReviewItemManagementRoutes(studyToolsModule.unifiedReviewService);
      router.use("/unified-reviews", reviewItemRoutes);
      console.log('✅ Rotas de gerenciamento de items de revisão registradas');
    } catch (error) {
      console.error("❌ Erro ao carregar rotas de gerenciamento:", error);
    }

    // Rotas de dashboard de revisões
    try {
      const { ReviewDashboardService } = require("./domain/studyTools/unifiedReviews/services/ReviewDashboardService");
      const { ReviewDashboardController } = require("./domain/studyTools/unifiedReviews/controllers/ReviewDashboardController");
      const { ReviewPreferencesService } = require("./domain/studyTools/unifiedReviews/services/ReviewPreferencesService");

      const prefsService = new ReviewPreferencesService(supabase);
      const dashboardService = new ReviewDashboardService(supabase, studyToolsModule.unifiedReviewService, prefsService);
      const dashboardController = new ReviewDashboardController(dashboardService);

      const dashboardRouter = require("express").Router();
      dashboardRouter.get('/dashboard', authMiddleware, dashboardController.getDashboard.bind(dashboardController));
      dashboardRouter.post('/activate-cramming', authMiddleware, dashboardController.activateCramming.bind(dashboardController));

      router.use("/unified-reviews", dashboardRouter);

      // Rotas de preview de revisões
      const { createReviewPreviewRoutes, createReviewManagementRoutes } = require('./domain/studyTools/unifiedReviews/routes/unifiedReviewRoutes');
      const previewRouter = createReviewPreviewRoutes();
      const managementRouter = createReviewManagementRoutes();
      router.use("/unified-reviews", previewRouter);
      router.use("/unified-reviews", managementRouter);
      console.log('✅ Rotas de dashboard de revisões registradas');
    } catch (error) {
      console.error("❌ Erro ao carregar rotas de dashboard:", error);
    }

    // NOVA FUNCIONALIDADE: Rotas de Smart Scheduling
    try {
      const smartSchedulingRoutes = require("./domain/studyTools/unifiedReviews/routes/smartSchedulingRoutes").default;
      router.use("/unified-reviews", smartSchedulingRoutes);
      console.log('✅ Rotas de smart scheduling registradas');
    } catch (error) {
      console.warn("Erro ao carregar rotas de smart scheduling:", error);
    }

    // NOVA FUNCIONALIDADE: Rotas de Ações em Lote (Bulk Actions)
    try {
      const { createReviewBulkActionsRoutes } = require("./domain/studyTools/unifiedReviews/routes/reviewBulkActionsRoutes");
      const bulkActionsRoutes = createReviewBulkActionsRoutes();
      router.use("/unified-reviews/bulk", bulkActionsRoutes);
      console.log('✅ Rotas de ações em lote de revisões registradas');
    } catch (error) {
      console.warn("Erro ao carregar rotas de ações em lote:", error);
    }

    // NOVA FUNCIONALIDADE: Rotas de Gerenciamento de Revisões
    try {
      const { createReviewManageRoutes } = require("./domain/studyTools/unifiedReviews/routes/reviewManageRoutes");
      const { ReviewManageController } = require("./domain/studyTools/unifiedReviews/controllers/ReviewManageController");

      const reviewManageController = new ReviewManageController(studyToolsModule.unifiedReviewService);
      const reviewManageRoutes = createReviewManageRoutes(reviewManageController);
      router.use("/reviews", reviewManageRoutes);
      console.log('✅ Rotas de gerenciamento de revisões registradas em /reviews');
    } catch (error) {
      console.warn("Erro ao carregar rotas de gerenciamento de revisões:", error);
    }

    // DESENVOLVIMENTO: Rotas de Teste (apenas em dev)
    if (process.env.NODE_ENV !== 'production') {
      try {
        const { createDevTestingRoutes } = require("./domain/studyTools/unifiedReviews/routes/devTestingRoutes");
        const devTestingRoutes = createDevTestingRoutes();
        router.use("/unified-reviews/dev", devTestingRoutes);
        console.log('🧪 Rotas de teste de desenvolvimento registradas');
      } catch (error) {
        console.warn("Erro ao carregar rotas de teste:", error);
      }
    }

    // Rotas de FSRS Cards
    try {
      const { createFsrsCardsRoutes } = require("./domain/studyTools/unifiedReviews/routes/fsrsCardsRoutes");
      const fsrsCardsRoutes = createFsrsCardsRoutes();
      router.use("/fsrs", fsrsCardsRoutes);
      console.log('✅ Rotas de FSRS cards registradas em /fsrs');
    } catch (error) {
      console.warn("Erro ao carregar rotas de FSRS cards:", error);
    }

    // Registrar rotas de flashcards para compatibilidade com frontend (REMOVIDO: duplicava as rotas e causava dupla execução)
    // router.use("/flashcards", studyToolsModule.studyToolsRoutes.flashcards);

  } catch (error) {
    console.warn("Erro ao carregar módulo de ferramentas de estudo:", error);
    // Fallback removido para evitar conflito de rotas
    console.warn(
      "⚠️ Módulo de ferramentas de estudo não pôde ser carregado. Verifique as dependências.",
    );
  }

  // ETAPA 1: Caderno de Erros agora é registrado via createStudyToolsModule (ver acima)
  // Configuração de dependências removida - agora usa Supabase
  // TODO: Migrar setupErrorNotebookDependencies para usar Supabase

  // ETAPA 1: Sessões de Estudo agora são registradas via createStudyToolsModule (ver acima)
  // Seção removida para evitar duplicação de rotas

  // ===== NOVAS ROTAS DA FASE 2: Funcionalidades Avançadas =====
  try {
    const advancedFeaturesRoutes =
      require("./domain/studyTools/unifiedReviews/routes/advancedFeaturesRoutes").default;
    router.use("/advanced", authMiddleware as any, advancedFeaturesRoutes);
  } catch (error) {
    console.warn("Erro ao carregar rotas avançadas:", error);
  }

  // Rotas de SRS (Sistema de Repetição Espaçada) - REMOVIDO: SM-2 Legacy na Fase 2

  // Rotas de filtros movidas para /admin/filters (ver AdminFactory)

  // Rotas de relatórios e análises
  try {
    const reportRoutes =
      require("./domain/analytics/routes/reportRoutes").createReportRoutes(
        supabase,
      );
    router.use("/reports", reportRoutes);
  } catch (error) {
    console.warn("Erro ao carregar rotas de relatórios:", error);
  }

  // Rotas administrativas - REMOVIDO: duplicado na linha 500

  // Rotas administrativas de flashcards - REMOVIDO: já incluídas no AdminFactory

  // Rotas de integração
  router.use("/integration", dataImportExportRoutes);

  // Rotas do R2 (Cloudflare Storage)
  try {
    const r2Routes = require("./routes/r2Routes").default;
    router.use("/r2", r2Routes);
  } catch (error) {
    console.warn("Erro ao carregar rotas do R2:", error);
  }

  // Rotas de imagens temporárias (scraper)
  try {
    const tempImagesRoutes = require("./routes/tempImagesRoutes").default;
    router.use("/temp-images", tempImagesRoutes);
  } catch (error) {
    console.warn("Erro ao carregar rotas de imagens temporárias:", error);
  }

  // Rotas do MEDBRAVE AI
  try {
    const { medbraveAIRoutes } = require("./domain/medbraveAI/routes/medbraveAIRoutes");
    router.use("/medbrave-ai", medbraveAIRoutes);
  } catch (error) {
    console.warn("Erro ao carregar rotas do MEDBRAVE AI:", error);
  }

  // Rotas de notificações
  try {
    const {
      createNotificationsModule,
    } = require("./domain/notifications/factories/createNotificationsModule");
    const { notificationController } = createNotificationsModule();
    const { createNotificationRoutes } = require("./domain/notifications/routes/notificationRoutes");
    const notificationRoutes = createNotificationRoutes(notificationController);
    router.use("/notifications", notificationRoutes);
  } catch (error) {
    console.warn("Erro ao carregar rotas de notificações:", error);
  }

  // Rotas de mídia
  try {
    const mediaRoutes = require("./domain/media/routes/mediaRoutes").default;
    router.use("/media", mediaRoutes);
  } catch (error) {
    console.warn("Erro ao carregar rotas de mídia:", error);
  }

  // Termo Game Routes
  try {
    const { createTermoGameRoutes } = await import('./routes/termoGameRoutes');
    const termoGameRoutes = createTermoGameRoutes(supabase);
    router.use('/games/termo', termoGameRoutes);
  } catch (error) {
    console.error('Erro ao carregar rotas do jogo Termo:', error);
  }

  // Termo Game Admin Routes
  try {
    const { createTermoAdminRoutes } = await import('./domain/studyTools/games/termo/routes/termoAdminRoutes');
    const termoAdminRoutes = createTermoAdminRoutes(supabase);
    router.use('/admin/games/termo', termoAdminRoutes);
  } catch (error) {
    console.error('Erro ao carregar rotas administrativas do jogo Termo:', error);
  }

  // Schulte Game Routes
  try {
    const { default: schulteGameRouter } = await import('./domain/studyTools/games/schulte/controllers/SchulteGameController');
    router.use('/games/schulte', authMiddleware as any, schulteGameRouter);
  } catch (error) {
    console.error('Erro ao carregar rotas do jogo Schulte:', error);
  }

  // Rotas de estatísticas do usuário (REMOVIDO - agora usa statisticsRoutes em app.ts)
  // As rotas de statistics estão em /api/statistics (ver app.ts linha 136)

  // Rotas de monitoramento
  try {
    // console.log('🔧 Registrando rotas de monitoramento...');
    const monitoringRoutes = require("./routes/monitoringRoutes").default;
    router.use("/monitoring", monitoringRoutes);
    // console.log('✅ Rotas de monitoramento registradas em /monitoring');
  } catch (error) {
    console.warn("Erro ao carregar rotas de monitoramento:", error);
  }

  // Rotas de scraper
  try {
    const scraperRoutes = require("./routes/scraperRoutes").default;
    router.use("/admin/scraper", scraperRoutes);
    console.log('✅ Rotas de scraper registradas em /admin/scraper');
  } catch (error) {
    console.error("❌ Erro ao carregar rotas de scraper:", error);
  }

  // Rotas de categorização por IA
  try {
    const categorizationRoutes = require("./routes/categorizationRoutes").default;
    router.use("/categorization", categorizationRoutes);
    console.log('✅ Rotas de categorização registradas em /categorization');
  } catch (error) {
    console.error("❌ Erro ao carregar rotas de categorização:", error);
  }

  // Rotas de provas oficiais
  try {
    const { createOfficialExamModule } = require("./domain/officialExam/factory/createOfficialExamModule");
    const { SupabaseQuestionService } = require("./infra/questions/supabase/SupabaseQuestionService");
    const { SupabaseSimulatedExamService } = require("./infra/simulatedExam/supabase");

    // Create question service
    const questionService = new SupabaseQuestionService(supabase);

    // Create simulated exam service
    const simulatedExamService = new SupabaseSimulatedExamService(supabase);

    const officialExamRoutes = createOfficialExamModule({
      supabaseClient: supabase,
      questionService: questionService,
      simulatedExamService: simulatedExamService
    });
    router.use("/official-exams", officialExamRoutes);
    console.log('✅ Rotas de provas oficiais registradas em /official-exams');
  } catch (error) {
    console.error("❌ Erro ao carregar rotas de provas oficiais:", error);
  }

  // Rotas de conquistas (achievements)
  try {
    const {
      createAchievementModule,
    } = require("./domain/achievements/factory/createAchievementModule");
    const achievementRoutes = createAchievementModule(supabase);

    router.use("/achievements", achievementRoutes);
  } catch (error) {
    console.warn("Erro ao carregar rotas de conquistas:", error);
  }

  // Rotas públicas do banco de questões (requer autenticação, não requer admin)
  try {
    const { createPublicFilterModule } = require("./domain/filters/factories/PublicFilterFactory");
    const publicFilterModule = createPublicFilterModule();
    router.use("/banco-questoes", publicFilterModule.router);
    console.log('✅ Rotas do banco de questões registradas em /banco-questoes');
  } catch (error) {
    console.error("❌ Erro ao carregar rotas do banco de questões:", error);
  }

  // Rotas de pastas de listas de questões (requer autenticação)
  try {
    const questionListFolderRoutes = require("./routes/questionListFolderRoutes").default;
    router.use("/banco-questoes", questionListFolderRoutes);
    console.log('✅ Rotas de pastas de listas registradas em /banco-questoes/folders');
  } catch (error) {
    console.error("❌ Erro ao carregar rotas de pastas de listas:", error);
  }

  // Rotas de listas de questões (requer autenticação, não requer admin)
  try {
    const questionListRoutes = require("./routes/questionListRoutes").default;
    router.use("/question-lists", questionListRoutes);
    console.log('✅ Rotas de listas de questões registradas em /question-lists');
  } catch (error) {
    console.error("❌ Erro ao carregar rotas de listas de questões:", error);
  }

  // Rota para salvar respostas de questões (requer autenticação)
  try {
    const { supabaseAuthMiddleware } = require("./domain/auth/middleware/supabaseAuth.middleware");
    const { QuestionListController } = require("./controllers/QuestionListController");
    const responseController = new QuestionListController();

    router.post("/question-responses", supabaseAuthMiddleware, responseController.saveQuestionResponse.bind(responseController));
    console.log('✅ Rota de respostas de questões registrada em /question-responses');
  } catch (error) {
    console.error("❌ Erro ao carregar rota de respostas:", error);
  }

  // Rotas de administração (admin)
  try {
    const { AdminFactory } = require("./domain/admin/factories/AdminFactory");
    const adminModule = AdminFactory.create({ supabaseClient: supabase });
    router.use("/admin", adminModule.routes);
  } catch (error) {
    console.error("❌ Erro ao carregar rotas de administração:", error);
  }

  // Endpoint específico para dashboard stats - usando sistema avançado
  router.get("/dashboard/stats", authMiddleware as any, async (req: any, res: any) => {
    try {

      const userId = req.user?.id;

      if (!userId) {
        return res
          .status(401)
          .json({ success: false, error: "Usuário não autenticado" });
      }

      // Usar o sistema avançado de estatísticas
      const {
        createUserStatisticsFactory,
      } = require("./domain/userStatistics/factory/UserStatisticsFactory");
      const userStatisticsService = createUserStatisticsFactory();

      // Obter estatísticas completas do sistema avançado
      const fullStats = await userStatisticsService.getOrCreateUserStatistics(
        userId,
        {
          includeFilterStats: true,
          includePeerComparison: false, // Para performance
          includeRecommendations: false, // Para performance
        },
      );

      // Calcular dados mais realistas baseados na atividade real
      const questionsAnswered = fullStats.totalQuestionsAnswered;
      const correctAnswers = fullStats.correctAnswers;
      const accuracy = Math.round(fullStats.overallAccuracy * 100);

      // Cálculos mais realistas
      const calculatedXP = questionsAnswered * 10; // 10 XP por questão
      const calculatedLevel = Math.floor(calculatedXP / 100) + 1; // 100 XP por nível
      const estimatedStudyTime = questionsAnswered * 2; // 2 minutos por questão estimado
      const currentStreak =
        questionsAnswered > 0
          ? Math.max(1, Math.floor(questionsAnswered / 5))
          : 0; // Streak baseado na atividade
      const longestStreak = Math.max(
        currentStreak,
        Math.floor(questionsAnswered / 3),
      );
      const sessionsCount = Math.max(1, Math.floor(questionsAnswered / 4)); // Estima sessões
      const avgSessionDuration =
        sessionsCount > 0 ? Math.round(estimatedStudyTime / sessionsCount) : 0;
      const consistencyScore =
        questionsAnswered > 0 ? Math.min(90, 20 + questionsAnswered * 2) : 0;

      // Tópicos baseados no desempenho (para uso futuro)
      // const topicsBasedOnPerformance = accuracy >= 70 ?
      //   ['Medicina Interna', 'Cardiologia'] :
      //   accuracy >= 50 ?
      //   ['Farmacologia'] :
      //   ['Conceitos Básicos', 'Anatomia'];

      const weakTopics = accuracy < 70 ? ["Medicina Interna", "Cirurgia"] : [];
      const strongTopics = accuracy >= 70 ? ["Farmacologia", "Pediatria"] : [];

      // Extrair dados específicos para o dashboard
      const dashboardStats = {
        questionsAnswered: questionsAnswered,
        correctAnswers: correctAnswers,
        accuracy: accuracy,
        simulatedExams: 0, // Simulados serão implementados separadamente
        studyStreak: currentStreak,
        totalStudyTime: estimatedStudyTime,
        srsReviews: Math.floor(questionsAnswered / 2), // Estimativa de revisões
        weakTopics: weakTopics,
        strongTopics: strongTopics,
        lastActivity:
          fullStats.updatedAt instanceof Date
            ? fullStats.updatedAt.toISOString()
            : new Date(fullStats.updatedAt).toISOString(),
        // Dados extras calculados realisticamente
        currentLevel: calculatedLevel,
        totalXP: calculatedXP,
        longestStreak: longestStreak,
        averageExamScore: accuracy, // Score médio igual à acurácia
        studyEfficiency: consistencyScore,
        // Novos dados para estatísticas detalhadas
        sessionsCount: sessionsCount,
        averageSessionDuration: avgSessionDuration,
        estimatedRanking: Math.max(
          1,
          Math.min(5, 6 - Math.floor(accuracy / 20)),
        ), // Ranking entre 1-5 baseado na performance
      };

      res.status(200).json({
        success: true,
        data: dashboardStats,
      });
    } catch (error) {
      console.error("Erro ao buscar estatísticas do dashboard:", error);
      res
        .status(500)
        .json({ success: false, error: "Erro interno do servidor" });
    }
  });

  // Novo endpoint para dados de especialidades reais
  router.get(
    "/dashboard/specialty-performance/:userId",
    authMiddleware as any,
    async (req: any, res: any) => {
      try {
        const userId = req.params.userId;

        // Primeiro, buscar apenas os filtros de MEDICAL_SPECIALTY
        const { data: filtersData } = await supabase
          .from("filters")
          .select("*")
          .eq("category", "MEDICAL_SPECIALTY");
        const filtersSnapshot = { data: filtersData };

        const medicalSpecialtyFilters: Record<string, string> = {};
        if (filtersSnapshot.data) {
          filtersSnapshot.data.forEach((filter) => {
            medicalSpecialtyFilters[filter.id] = filter.name;
          });
        }

        // Buscar respostas do usuário agrupadas por especialidade
        const { data: responsesData } = await supabase
          .from("question_responses")
          .select("*")
          .eq("user_id", userId);
        const responsesSnapshot = { data: responsesData };

        const specialtyPerformance: Record<
          string,
          { total: number; correct: number; accuracy: number }
        > = {};

        if (responsesSnapshot.data && responsesSnapshot.data.length > 0) {
          for (const response of responsesSnapshot.data) {
            const questionId = response.question_id;

            // Buscar a questão para obter os filter_ids
            const questionDoc = await supabase
              .from("questions")
              .select("*")
              .eq("id", questionId)
              .single();
            if (questionDoc.data) {
              const questionData = questionDoc.data;
              const filterIds = questionData?.filter_ids || []; // Array de IDs

              // Verificar se algum filterId é de MEDICAL_SPECIALTY

              for (const filterId of filterIds) {
                if (medicalSpecialtyFilters[filterId]) {
                  const specialtyName = medicalSpecialtyFilters[filterId];

                  if (!specialtyPerformance[specialtyName]) {
                    specialtyPerformance[specialtyName] = {
                      total: 0,
                      correct: 0,
                      accuracy: 0,
                    };
                  }

                  specialtyPerformance[specialtyName].total++;
                  // Usar is_correct_on_first_attempt ao invés de is_correct
                  if (response.is_correct_on_first_attempt === true) {
                    specialtyPerformance[specialtyName].correct++;
                  }
                  // Quebrar o loop - uma questão só conta uma vez por especialidade
                  break;
                }
              }
            }
          }

          // Calcular accuracy para cada especialidade
          Object.keys(specialtyPerformance).forEach((specialty) => {
            const data = specialtyPerformance[specialty];
            data.accuracy =
              data.total > 0 ? (data.correct / data.total) * 100 : 0;
          });
        }

        res.status(200).json({
          success: true,
          data: specialtyPerformance,
        });
      } catch (error) {
        console.error("Erro ao buscar performance por especialidade:", error);
        res
          .status(500)
          .json({ success: false, error: "Erro interno do servidor" });
      }
    },
  );

  // Novo endpoint para histórico temporal real
  router.get(
    "/dashboard/performance-history/:userId",
    authMiddleware as any,
    async (req: any, res: any) => {
      try {
        const userId = req.params.userId;
        const days = parseInt(req.query.days as string) || 30;

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // Buscar respostas do usuário dos últimos X dias
        const { data: responsesData } = await supabase
          .from("question_responses")
          .select("*")
          .eq("user_id", userId)
          .gte("timestamp", startDate)
          .order("timestamp", { ascending: false });

        const responsesSnapshot = { data: responsesData };

        const dailyPerformance: Record<
          string,
          { total: number; correct: number; accuracy: number; date: string }
        > = {};

        if (responsesSnapshot.data && responsesSnapshot.data.length > 0) {
          responsesSnapshot.data.forEach((response) => {
            const date = new Date(response.timestamp || response.created_at);
            const dateKey = date.toISOString().split("T")[0]; // YYYY-MM-DD

            if (!dailyPerformance[dateKey]) {
              dailyPerformance[dateKey] = {
                total: 0,
                correct: 0,
                accuracy: 0,
                date: dateKey,
              };
            }

            dailyPerformance[dateKey].total++;
            // Usar is_correct_on_first_attempt ao invés de is_correct
            if (response.is_correct_on_first_attempt === true) {
              dailyPerformance[dateKey].correct++;
            }
          });

          // Calcular accuracy para cada dia
          Object.keys(dailyPerformance).forEach((dateKey) => {
            const data = dailyPerformance[dateKey];
            data.accuracy =
              data.total > 0 ? (data.correct / data.total) * 100 : 0;
          });
        }

        const historyArray = Object.values(dailyPerformance).sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        );

        res.status(200).json({
          success: true,
          data: historyArray,
        });
      } catch (error) {
        console.error("Erro ao buscar histórico de performance:", error);
        res
          .status(500)
          .json({ success: false, error: "Erro interno do servidor" });
      }
    },
  );

  // Novo endpoint para tempo de estudo real
  router.get(
    "/dashboard/study-time/:userId",
    authMiddleware as any,
    async (req: any, res: any) => {
      try {
        const userId = req.params.userId;

        // Buscar sessões de estudo reais primeiro
        const { data: sessionsData } = await supabase
          .from("study_sessions")
          .select("*")
          .eq("user_id", userId);
        const sessionsSnapshot = { data: sessionsData || [] };

        let totalMinutes = 0;
        let sessionCount = 0;
        const sessionDurations: number[] = [];

        if (sessionsSnapshot.data && sessionsSnapshot.data.length > 0) {
          sessionsSnapshot.data.forEach((session) => {
            if (session.duration) {
              const duration = session.duration / 60000; // Convert ms to minutes
              totalMinutes += duration;
              sessionDurations.push(duration);
              sessionCount++;
            }
          });
        }

        // Se não houver sessões reais, usar estimativa inteligente baseada em atividade
        if (sessionCount === 0) {
          const { data: responsesData } = await supabase.from('question_responses')
            .select("*")
            .eq("user_id", userId)
            .order("timestamp", { ascending: false });

          const responsesSnapshot = { data: responsesData || [] };

          if (responsesSnapshot.data && responsesSnapshot.data.length > 0) {


            // Analisar padrões temporais das respostas para estimar sessões
            const sessionGroups: { [key: string]: number } = {};
            let lastTimestamp: any = null;
            let currentSessionKey = "";

            responsesSnapshot.data.reverse().forEach((response) => {
              // Ordenar cronologicamente
              const timestamp = response.timestamp;
              const dateTime = new Date(timestamp);

              // Se há mais de 30 minutos entre respostas, considerar nova sessão
              if (
                lastTimestamp &&
                dateTime.getTime() - lastTimestamp.getTime() > 30 * 60 * 1000
              ) {
                currentSessionKey =
                  dateTime.toISOString().split("T")[0] +
                  "-" +
                  Math.floor(dateTime.getTime() / (30 * 60 * 1000));
              } else if (!currentSessionKey) {
                currentSessionKey =
                  dateTime.toISOString().split("T")[0] +
                  "-" +
                  Math.floor(dateTime.getTime() / (30 * 60 * 1000));
              }

              sessionGroups[currentSessionKey] =
                (sessionGroups[currentSessionKey] || 0) + 1;
              lastTimestamp = dateTime;
            });

            // Calcular duração estimada por sessão baseada no número de questões
            const estimatedSessionCount = Object.keys(sessionGroups).length;
            sessionCount = Math.max(1, estimatedSessionCount);

            // Tempo estimado mais realista: 1.5-3 min por questão dependendo da complexidade
            Object.values(sessionGroups).forEach((questionsInSession) => {
              const estimatedDuration =
                questionsInSession * (Math.random() * 1.5 + 1.5); // 1.5-3 min por questão
              sessionDurations.push(estimatedDuration);
              totalMinutes += estimatedDuration;
            });
          }
        }

        const averageSessionDuration =
          sessionCount > 0 ? totalMinutes / sessionCount : 0;
        const longestSession =
          sessionDurations.length > 0 ? Math.max(...sessionDurations) : 0;
        const shortestSession =
          sessionDurations.length > 0 ? Math.min(...sessionDurations) : 0;

        const studyTimeData = {
          totalMinutesStudied: Math.round(totalMinutes),
          sessionsCount: sessionCount,
          averageSessionDuration: Math.round(averageSessionDuration),
          longestSession: Math.round(longestSession),
          shortestSession: Math.round(shortestSession),
          consistencyScore:
            sessionCount > 0 ? Math.min(90, 20 + sessionCount * 5) : 0,
          isRealData: sessionsSnapshot.data && sessionsSnapshot.data.length > 0, // Indicar se são dados reais ou estimados
        };

        res.status(200).json({
          success: true,
          data: studyTimeData,
        });
      } catch (error) {
        console.error("Erro ao buscar tempo de estudo:", error);
        res
          .status(500)
          .json({ success: false, error: "Erro interno do servidor" });
      }
    },
  );

  // ❌ ROTAS ANTIGAS REMOVIDAS - Agora usam studySessionRoutes.ts
  // Essas rotas estavam conflitando com as novas rotas em /domain/studySessions
  // As novas rotas são registradas em app.ts com app.use('/api/study-sessions', studySessionRoutes)

  // Rota para registrar tempo de estudo (mantida para compatibilidade)
  router.post(
    "/record-study-time",
    authMiddleware as any,
    async (req: any, res: any) => {
      try {
        const { userId, minutes, sessionType } = req.body;

        if (!userId || !minutes) {
          return res.status(400).json({
            success: false,
            error: "userId e minutes são obrigatórios",
          });
        }

        // Usar o serviço de estatísticas para registrar o tempo
        const {
          createUserStatisticsFactory,
        } = require("./domain/userStatistics/factory/UserStatisticsFactory");
        const userStatisticsService = createUserStatisticsFactory();

        const updatedStats = await userStatisticsService.recordStudyTime(
          userId,
          parseInt(minutes),
          sessionType || "other",
        );

        res.status(200).json({
          success: true,
          data: {
            minutesRecorded: parseInt(minutes),
            totalMinutesStudied:
              updatedStats.studyTimeAnalysis?.totalMinutesStudied || 0,
          },
        });
      } catch (error) {
        console.error("❌ [Record Study Time] Erro ao registrar tempo:", error);
        res.status(500).json({
          success: false,
          error: "Erro interno do servidor",
        });
      }
    },
  );

  // ===== ROTAS DE PAYMENT (PLANOS E PAGAMENTOS) =====
  try {
    const { createPaymentModule } = require("./domain/payment/factory");
    const paymentRoutes = createPaymentModule();
    
    // A factory já retorna um Router com todas as rotas configuradas
    router.use("/", paymentRoutes);
    console.log('✅ Rotas de payment registradas: /api/plans, /api/user-plans, /api/payments, /api/invoices, /api/coupons');
  } catch (error) {
    console.error("❌ Erro ao carregar rotas de payment:", error);
  }

  return router;
};
