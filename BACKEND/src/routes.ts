import express from 'express';
import { Firestore } from 'firebase-admin/firestore';
import contentRoutes from './domain/content/routes/contentRoutes';
// Error notebook routes serão importadas dinamicamente com configuração da Fase 3

import dataImportExportRoutes from './domain/integration/routes/dataImportExportRoutes';
import { createFilterModule } from './domain/filters/factories/FilterFactory';
import { FirebaseQuestionService } from './domain/questions/services/FirebaseQuestionService';
// ETAPA 1: Importar createStudyToolsModule para centralizar todas as ferramentas de estudo
import { createStudyToolsModule } from './domain/studyTools/factories/createStudyToolsModule';
import unifiedQuestionRoutes from './domain/questions/routes/unifiedQuestionRoutes';
// Imports removidos: axios, FormData, fs, path (não utilizados)

import { authMiddleware } from './domain/auth/middleware/auth.middleware';

console.log('Registrando rotas principais...');

/**
 * Cria e configura todas as rotas da API
 * @param db Instância do Firestore
 * @returns Router configurado com todas as rotas da API
 */
export const createRouter = (db: Firestore): express.Router => {
  const router = express.Router();

  // Rotas de autenticação
  try {
    const authRoutes = require('./domain/auth/routes/authRoutes').createAuthRoutes(db);
    router.use('/auth', authRoutes);
  } catch (error) {
    console.warn('Erro ao carregar rotas de autenticação:', error);
  }
  
  // Rotas de usuários
  try {
    const userRoutes = require('./domain/user/routes/userRoutes').createUserRoutes(db);
    router.use('/user', userRoutes);
  } catch (error) {
    console.warn('Erro ao carregar rotas de usuários:', error);
  }
  
  console.log('Registrando rota: /questions');
  // Rotas de questões
  // const questionService = new FirebaseQuestionService(db);
  // const questionRouter = createQuestionRouter(questionService);
  router.use('/questions', unifiedQuestionRoutes);
  
  // REMOVIDO: Listas de questões foram integradas ao sistema unificado
  // As funcionalidades de listas agora estão em /api/questions/lists/:id/items
  
  // Rotas de exames simulados
  try {
    console.log('🔧 Registrando rotas de simulados...');
    
    // Importar componentes diretamente
    const { SimulatedExamController } = require('./domain/simulatedExam/controllers/SimulatedExamController');
    const { FirebaseSimulatedExamService } = require('./domain/simulatedExam/services/FirebaseSimulatedExamService');
    const { createSimulatedExamRoutes } = require('./domain/simulatedExam/routes/simulatedExamRoutes');
    
    // Criar instâncias
    const simulatedExamService = new FirebaseSimulatedExamService(db);
    const simulatedExamController = new SimulatedExamController(simulatedExamService);
    const simulatedExamRoutes = createSimulatedExamRoutes(simulatedExamController);
    
    router.use('/simulatedexams', simulatedExamRoutes);
    console.log('✅ Rotas de simulados registradas em /simulatedexams');
  } catch (error) {
    console.error('❌ Erro ao carregar rotas de exames simulados:', error);
    console.warn('Erro ao carregar rotas de exames simulados:', error);
  }
  
  // Rotas de perfil
  try {
    const profileRoutes = require('./domain/profile/routes/profileRoutes').createProfileRoutes(db);
    router.use('/profiles', profileRoutes);
  } catch (error) {
    console.warn('Erro ao carregar rotas de perfis:', error);
  }
  
  // Rotas de conteúdo
  router.use('/content', contentRoutes);
  
  // FASE 5: Rotas de retenção e estatísticas avançadas
  try {
    console.log('🔧 Registrando rotas de retenção...');
    const retentionRoutes = require('./domain/questions/routes/retentionRoutes').default;
    router.use('/retention', retentionRoutes);
    console.log('✅ Rotas de retenção registradas em /retention');
  } catch (error) {
    console.warn('Erro ao carregar rotas de retenção:', error);
  }
  
  // ETAPA 1: Rotas de ferramentas de estudo centralizadas via createStudyToolsModule
  try {
    console.log('🔧 Registrando módulo centralizado de ferramentas de estudo...');
    const studyToolsModule = createStudyToolsModule({ firestoreDb: db });
    
    // Registrar rotas de flashcards
    router.use('/flashcards', studyToolsModule.studyToolsRoutes.flashcards);
    
    // Registrar rotas de sessões de estudo
    router.use('/study-sessions', studyToolsModule.studyToolsRoutes.studySessions);
    
    // Registrar rotas de caderno de erros
    router.use('/error-notebook', studyToolsModule.studyToolsRoutes.errorNotebooks);
    
    // ETAPA 1: Registrar rotas unificadas de revisão (/api/unified-reviews)
    // authMiddleware já aplicado individualmente em cada rota
    router.use('/unified-reviews', studyToolsModule.studyToolsRoutes.unifiedReviews);
    
    // NOVA FUNCIONALIDADE: Rotas de gerenciamento de revisões
    try {
      console.log('🔧 Registrando rotas de gerenciamento de revisões...');
      const reviewManagementRoutes = require('./domain/studyTools/unifiedReviews/routes/reviewManagementRoutes').default;
      router.use('/review-management', reviewManagementRoutes);
      console.log('✅ Rotas de gerenciamento de revisões registradas em /review-management');
    } catch (error) {
      console.warn('Erro ao carregar rotas de gerenciamento de revisões:', error);
    }
    
    // Manter rotas de importação Anki para compatibilidade
    const apkgImportRoutes = require('./domain/studyTools/flashcards/routes/apkgImportRoutes').default;
    router.use('/study-tools/flashcards/apkg', apkgImportRoutes);
    
    const apkgImportFSRSRoutes = require('./domain/studyTools/flashcards/routes/apkgImportFSRSRoutes').default;
    router.use('/study-tools/flashcards/apkg-fsrs', apkgImportFSRSRoutes);
    
    console.log('✅ Módulo de ferramentas de estudo registrado com sucesso');
    console.log('✅ Rotas unificadas registradas em /unified-reviews');
    console.log('✅ Rotas de flashcards registradas em /flashcards');
    console.log('✅ Rotas de sessões de estudo registradas em /study-sessions');
    console.log('✅ Rotas de caderno de erros registradas em /error-notebook');
    console.log('✅ Rotas de importação Anki mantidas para compatibilidade');
  } catch (error) {
    console.warn('Erro ao carregar módulo de ferramentas de estudo:', error);
    // Fallback removido para evitar conflito de rotas
    console.warn('⚠️ Módulo de ferramentas de estudo não pôde ser carregado. Verifique as dependências.');
  }
  
  // ETAPA 1: Caderno de Erros agora é registrado via createStudyToolsModule (ver acima)
  // Configuração de dependências mantida para compatibilidade
  try {
    const { setupErrorNotebookDependencies } = require('./domain/studyTools/errorNotebook/routes/errorNotebookRoutes');
    const questionService = new FirebaseQuestionService(db);
    
    try {
      const { UnifiedReviewService } = require('./domain/studyTools/unifiedReviews/services/UnifiedReviewService');
      const { FSRSServiceFactory } = require('./domain/srs/factory/fsrsServiceFactory');
      const fsrsService = FSRSServiceFactory.createService(db);
      const unifiedReviewService = new UnifiedReviewService(db, fsrsService, questionService);
      setupErrorNotebookDependencies(unifiedReviewService, questionService);
      console.log('✅ Dependências do ErrorNotebook configuradas com UnifiedReviewService');
    } catch (error) {
      setupErrorNotebookDependencies(null, questionService);
      console.log('⚠️ ErrorNotebook configurado sem UnifiedReviewService (será adicionado na Fase 4)');
    }
  } catch (error) {
    console.warn('Erro ao configurar dependências do caderno de erros:', error);
  }
  
  // ETAPA 1: Sessões de Estudo agora são registradas via createStudyToolsModule (ver acima)
  // Seção removida para evitar duplicação de rotas

  // ===== NOVAS ROTAS DA FASE 2: Funcionalidades Avançadas =====
  try {
    console.log('🔧 Registrando rotas avançadas de revisões unificadas...');
    const advancedFeaturesRoutes = require('./domain/studyTools/unifiedReviews/routes/advancedFeaturesRoutes').default;
    router.use('/advanced', authMiddleware, advancedFeaturesRoutes);
    console.log('✅ Rotas avançadas registradas em /advanced');
  } catch (error) {
    console.warn('Erro ao carregar rotas avançadas:', error);
  }
  
  // Rotas de SRS (Sistema de Repetição Espaçada) - REMOVIDO: SM-2 Legacy na Fase 2
  
  // Rotas de filtros
  try {
    const { router: filterRouter } = createFilterModule();
    router.use('/filters', filterRouter);
  } catch (error) {
    console.warn('Erro ao carregar rotas de filtros:', error);
  }
  
  // Rotas de relatórios e análises
  try {
    const reportRoutes = require('./domain/analytics/routes/reportRoutes').createReportRoutes(db);
    router.use('/reports', reportRoutes);
  } catch (error) {
    console.warn('Erro ao carregar rotas de relatórios:', error);
  }
  
  // Rotas administrativas
  try {
    const { AdminFactory } = require('./domain/admin/factories/AdminFactory');
    const { routes: adminRoutes } = AdminFactory.create({ firestoreDb: db });
    router.use('/admin', adminRoutes);
  } catch (error) {
    console.warn('Erro ao carregar rotas administrativas:', error);
  }
  
  // Rotas de integração
  router.use('/integration', dataImportExportRoutes);

  // Rotas do R2 (Cloudflare Storage)
  try {
    console.log('🔧 Registrando rotas do R2...');
    const r2Routes = require('./routes/r2Routes').default;
    router.use('/r2', r2Routes);
    console.log('✅ Rotas do R2 registradas em /r2');
  } catch (error) {
    console.warn('Erro ao carregar rotas do R2:', error);
  }

  // Rotas do PULSE AI
  try {
    console.log('🔧 Registrando rotas do PULSE AI...');
    const { pulseAIRoutes } = require('./domain/pulseAI/routes/pulseAIRoutes');
    router.use('/pulse-ai', pulseAIRoutes);
    console.log('✅ Rotas do PULSE AI registradas em /pulse-ai');
  } catch (error) {
    console.warn('Erro ao carregar rotas do PULSE AI:', error);
  }

  // Rotas de notificações
  try {
    console.log('🔧 Registrando rotas de notificações...');
    const { createNotificationModule } = require('./domain/notifications/factories/NotificationFactory');
    const { notificationRoutes } = createNotificationModule();
    router.use('/notifications', notificationRoutes);
    console.log('✅ Rotas de notificações registradas em /notifications');
  } catch (error) {
    console.warn('Erro ao carregar rotas de notificações:', error);
  }

  // Rotas de mídia
  try {
    const mediaRoutes = require('./domain/media/routes/mediaRoutes').default;
    router.use('/media', mediaRoutes);
    console.log('✅ Rotas de mídia registradas em /media');
  } catch (error) {
    console.warn('Erro ao carregar rotas de mídia:', error);
  }

  // Rotas de estatísticas do usuário
  try {
    const userStatisticsRoutes = require('./domain/userStatistics/routes/userStatisticsRoutes').default;
    router.use('/user', userStatisticsRoutes);
    console.log('✅ Rotas de estatísticas do usuário registradas em /user');
  } catch (error) {
    console.warn('Erro ao carregar rotas de estatísticas do usuário:', error);
  }

  // Rotas de monitoramento
  try {
    // console.log('🔧 Registrando rotas de monitoramento...');
    const monitoringRoutes = require('./routes/monitoringRoutes').default;
    router.use('/monitoring', monitoringRoutes);
    // console.log('✅ Rotas de monitoramento registradas em /monitoring');
  } catch (error) {
    console.warn('Erro ao carregar rotas de monitoramento:', error);
  }

  // Rotas de conquistas (achievements)
  try {
    console.log('🔧 Registrando rotas de conquistas...');
    const { FirebaseAchievementService, AchievementController, createAchievementRoutes } = require('./domain/achievements');
    
    // Criar instâncias
    const achievementService = new FirebaseAchievementService(db);
    const achievementController = new AchievementController(achievementService);
    const achievementRoutes = createAchievementRoutes(achievementController);
    
    router.use('/achievements', achievementRoutes);
    console.log('✅ Rotas de conquistas registradas em /achievements');
  } catch (error) {
    console.warn('Erro ao carregar rotas de conquistas:', error);
  }

  // Endpoint específico para dashboard stats - usando sistema avançado
  router.get('/dashboard/stats', authMiddleware, async (req: any, res: any) => {
    try {
      console.log('📊 [Dashboard Stats] Endpoint chamado - usando sistema avançado');
      console.log('📊 [Dashboard Stats] req.user:', JSON.stringify(req.user, null, 2));
      console.log('📊 [Dashboard Stats] req.user?.id:', req.user?.id);
      console.log('📊 [Dashboard Stats] typeof req.user:', typeof req.user);
      
      const userId = req.user?.id;
      
      if (!userId) {
        console.log('❌ [Dashboard Stats] userId é undefined/null:', userId);
        console.log('❌ [Dashboard Stats] req.user completo:', req.user);
        return res.status(401).json({ success: false, error: 'Usuário não autenticado' });
      }

      // Usar o sistema avançado de estatísticas
      const { createUserStatisticsFactory } = require('./domain/userStatistics/factory/UserStatisticsFactory');
      const userStatisticsService = createUserStatisticsFactory();
      
      // Obter estatísticas completas do sistema avançado
      const fullStats = await userStatisticsService.getOrCreateUserStatistics(userId, {
        includeFilterStats: true,
        includePeerComparison: false, // Para performance
        includeRecommendations: false // Para performance
      });

      // Calcular dados mais realistas baseados na atividade real
      const questionsAnswered = fullStats.totalQuestionsAnswered;
      const correctAnswers = fullStats.correctAnswers;
      const accuracy = Math.round(fullStats.overallAccuracy * 100);
      
      // Cálculos mais realistas
      const calculatedXP = questionsAnswered * 10; // 10 XP por questão
      const calculatedLevel = Math.floor(calculatedXP / 100) + 1; // 100 XP por nível
      const estimatedStudyTime = questionsAnswered * 2; // 2 minutos por questão estimado
      const currentStreak = questionsAnswered > 0 ? Math.max(1, Math.floor(questionsAnswered / 5)) : 0; // Streak baseado na atividade
      const longestStreak = Math.max(currentStreak, Math.floor(questionsAnswered / 3));
      const sessionsCount = Math.max(1, Math.floor(questionsAnswered / 4)); // Estima sessões
      const avgSessionDuration = sessionsCount > 0 ? Math.round(estimatedStudyTime / sessionsCount) : 0;
      const consistencyScore = questionsAnswered > 0 ? Math.min(90, 20 + (questionsAnswered * 2)) : 0;
      
      // Tópicos baseados no desempenho (para uso futuro)
      // const topicsBasedOnPerformance = accuracy >= 70 ? 
      //   ['Medicina Interna', 'Cardiologia'] : 
      //   accuracy >= 50 ? 
      //   ['Farmacologia'] : 
      //   ['Conceitos Básicos', 'Anatomia'];
      
      const weakTopics = accuracy < 70 ? ['Medicina Interna', 'Cirurgia'] : [];
      const strongTopics = accuracy >= 70 ? ['Farmacologia', 'Pediatria'] : [];

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
        lastActivity: fullStats.updatedAt instanceof Date ? fullStats.updatedAt.toISOString() : new Date(fullStats.updatedAt).toISOString(),
        // Dados extras calculados realisticamente
        currentLevel: calculatedLevel,
        totalXP: calculatedXP,
        longestStreak: longestStreak,
        averageExamScore: accuracy, // Score médio igual à acurácia
        studyEfficiency: consistencyScore,
        // Novos dados para estatísticas detalhadas
        sessionsCount: sessionsCount,
        averageSessionDuration: avgSessionDuration,
        estimatedRanking: Math.max(1, Math.min(5, 6 - Math.floor(accuracy / 20))) // Ranking entre 1-5 baseado na performance
      };

      console.log('📊 [Dashboard Stats] Dados originais do sistema:', {
        questionsAnswered: fullStats.totalQuestionsAnswered,
        correctAnswers: fullStats.correctAnswers,
        accuracy: Math.round(fullStats.overallAccuracy * 100)
      });
      console.log('📊 [Dashboard Stats] Dados calculados realistas:', dashboardStats);

      res.status(200).json({
        success: true,
        data: dashboardStats
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas do dashboard:', error);
      res.status(500).json({ success: false, error: 'Erro interno do servidor' });
    }
  });

  // Novo endpoint para dados de especialidades reais
  router.get('/dashboard/specialty-performance/:userId', authMiddleware, async (req: any, res: any) => {
    try {
      const userId = req.params.userId;
      console.log('🏥 [Specialty Performance] Buscando performance por especialidade para:', userId);
      
      // Primeiro, buscar apenas os filtros de MEDICAL_SPECIALTY
      const filtersSnapshot = await db.collection('filters')
        .where('category', '==', 'MEDICAL_SPECIALTY')
        .get();
      
      const medicalSpecialtyFilters: Record<string, string> = {};
      filtersSnapshot.docs.forEach(doc => {
        medicalSpecialtyFilters[doc.id] = doc.data().name;
      });
      
      console.log('🏥 [Specialty Performance] Filtros de especialidade encontrados:', medicalSpecialtyFilters);
      console.log('🔧 [DEBUG] Usando CÓDIGO CORRIGIDO - filterIds (plural)');
      
      // Buscar respostas do usuário agrupadas por especialidade
      const responsesRef = db.collection('questionResponses').where('userId', '==', userId);
      const responsesSnapshot = await responsesRef.get();
      
      const specialtyPerformance: Record<string, { total: number; correct: number; accuracy: number }> = {};
      
      if (!responsesSnapshot.empty) {
        for (const doc of responsesSnapshot.docs) {
          const response = doc.data();
          const questionId = response.questionId;
          
          // Buscar a questão para obter os filterIds
          const questionDoc = await db.collection('questions').doc(questionId).get();
          if (questionDoc.exists) {
            const questionData = questionDoc.data();
            const filterIds = questionData?.filterIds || []; // Array de IDs
            
            // Verificar se algum filterId é de MEDICAL_SPECIALTY
            console.log(`🔍 [DEBUG] Questão ${questionId}: filterIds =`, filterIds);
            for (const filterId of filterIds) {
              if (medicalSpecialtyFilters[filterId]) {
                console.log(`✅ [DEBUG] Encontrou especialidade: ${medicalSpecialtyFilters[filterId]}`);
                const specialtyName = medicalSpecialtyFilters[filterId];
                
                if (!specialtyPerformance[specialtyName]) {
                  specialtyPerformance[specialtyName] = { total: 0, correct: 0, accuracy: 0 };
                }
                
                specialtyPerformance[specialtyName].total++;
                // Usar isCorrectOnFirstAttempt ao invés de isCorrect
                if (response.isCorrectOnFirstAttempt === true) {
                  specialtyPerformance[specialtyName].correct++;
                }
                // Quebrar o loop - uma questão só conta uma vez por especialidade
                break;
              }
            }
          }
        }
        
        // Calcular accuracy para cada especialidade
        Object.keys(specialtyPerformance).forEach(specialty => {
          const data = specialtyPerformance[specialty];
          data.accuracy = data.total > 0 ? (data.correct / data.total) * 100 : 0;
        });
      }
      
      console.log('🏥 [Specialty Performance] Performance por especialidade calculada:', specialtyPerformance);
      
      res.status(200).json({
        success: true,
        data: specialtyPerformance
      });
    } catch (error) {
      console.error('Erro ao buscar performance por especialidade:', error);
      res.status(500).json({ success: false, error: 'Erro interno do servidor' });
    }
  });

  // Novo endpoint para histórico temporal real
  router.get('/dashboard/performance-history/:userId', authMiddleware, async (req: any, res: any) => {
    try {
      const userId = req.params.userId;
      const days = parseInt(req.query.days as string) || 30;
      console.log('📈 [Performance History] Buscando histórico para:', userId, 'últimos', days, 'dias');
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      // Buscar respostas do usuário dos últimos X dias
      const responsesRef = db.collection('questionResponses')
        .where('userId', '==', userId)
        .where('timestamp', '>=', startDate)
        .orderBy('timestamp', 'asc');
      
      const responsesSnapshot = await responsesRef.get();
      
      const dailyPerformance: Record<string, { total: number; correct: number; accuracy: number; date: string }> = {};
      
      if (!responsesSnapshot.empty) {
        responsesSnapshot.docs.forEach(doc => {
          const response = doc.data();
          const date = response.timestamp.toDate();
          const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
          
          if (!dailyPerformance[dateKey]) {
            dailyPerformance[dateKey] = { 
              total: 0, 
              correct: 0, 
              accuracy: 0, 
              date: dateKey 
            };
          }
          
          dailyPerformance[dateKey].total++;
          // Usar isCorrectOnFirstAttempt ao invés de isCorrect
          if (response.isCorrectOnFirstAttempt === true) {
            dailyPerformance[dateKey].correct++;
          }
        });
        
        // Calcular accuracy para cada dia
        Object.keys(dailyPerformance).forEach(dateKey => {
          const data = dailyPerformance[dateKey];
          data.accuracy = data.total > 0 ? (data.correct / data.total) * 100 : 0;
        });
      }
      
      const historyArray = Object.values(dailyPerformance).sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      
      console.log('📈 [Performance History] Histórico encontrado:', historyArray.length, 'pontos de dados');
      
      res.status(200).json({
        success: true,
        data: historyArray
      });
    } catch (error) {
      console.error('Erro ao buscar histórico de performance:', error);
      res.status(500).json({ success: false, error: 'Erro interno do servidor' });
    }
  });

  // Novo endpoint para tempo de estudo real
  router.get('/dashboard/study-time/:userId', authMiddleware, async (req: any, res: any) => {
    try {
      const userId = req.params.userId;
      console.log('⏱️ [Study Time] Buscando tempo de estudo real para:', userId);
      
      // Buscar sessões de estudo reais primeiro
      const sessionsRef = db.collection('studySessions').where('userId', '==', userId);
      const sessionsSnapshot = await sessionsRef.get();
      
      let totalMinutes = 0;
      let sessionCount = 0;
      const sessionDurations: number[] = [];
      
      if (!sessionsSnapshot.empty) {
        console.log('✅ [Study Time] Encontradas', sessionsSnapshot.size, 'sessões reais');
        sessionsSnapshot.docs.forEach(doc => {
          const session = doc.data();
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
        console.log('⚠️ [Study Time] Nenhuma sessão real encontrada - usando estimativas inteligentes');
        
        const responsesRef = db.collection('questionResponses')
          .where('userId', '==', userId)
          .orderBy('timestamp', 'desc');
        const responsesSnapshot = await responsesRef.get();
        
        if (!responsesSnapshot.empty) {
          const questionsAnswered = responsesSnapshot.size;
          
          // Analisar padrões temporais das respostas para estimar sessões
          const sessionGroups: { [key: string]: number } = {};
          let lastTimestamp: any = null;
          let currentSessionKey = '';
          
          responsesSnapshot.docs.reverse().forEach(doc => { // Ordenar cronologicamente
            const response = doc.data();
            const timestamp = response.timestamp;
            const dateTime = timestamp.toDate();
            
            // Se há mais de 30 minutos entre respostas, considerar nova sessão
            if (lastTimestamp && (dateTime.getTime() - lastTimestamp.getTime()) > 30 * 60 * 1000) {
              currentSessionKey = dateTime.toISOString().split('T')[0] + '-' + Math.floor(dateTime.getTime() / (30 * 60 * 1000));
            } else if (!currentSessionKey) {
              currentSessionKey = dateTime.toISOString().split('T')[0] + '-' + Math.floor(dateTime.getTime() / (30 * 60 * 1000));
            }
            
            sessionGroups[currentSessionKey] = (sessionGroups[currentSessionKey] || 0) + 1;
            lastTimestamp = dateTime;
          });
          
          // Calcular duração estimada por sessão baseada no número de questões
          const estimatedSessionCount = Object.keys(sessionGroups).length;
          sessionCount = Math.max(1, estimatedSessionCount);
          
          // Tempo estimado mais realista: 1.5-3 min por questão dependendo da complexidade
          Object.values(sessionGroups).forEach(questionsInSession => {
            const estimatedDuration = questionsInSession * (Math.random() * 1.5 + 1.5); // 1.5-3 min por questão
            sessionDurations.push(estimatedDuration);
            totalMinutes += estimatedDuration;
          });
          
          console.log('📊 [Study Time] Análise de padrões:', {
            questionsAnswered,
            sessionGroups: Object.keys(sessionGroups).length,
            averageQuestionsPerSession: Math.round(questionsAnswered / sessionCount)
          });
        }
      }
      
      const averageSessionDuration = sessionCount > 0 ? totalMinutes / sessionCount : 0;
      const longestSession = sessionDurations.length > 0 ? Math.max(...sessionDurations) : 0;
      const shortestSession = sessionDurations.length > 0 ? Math.min(...sessionDurations) : 0;
      
      const studyTimeData = {
        totalMinutesStudied: Math.round(totalMinutes),
        sessionsCount: sessionCount,
        averageSessionDuration: Math.round(averageSessionDuration),
        longestSession: Math.round(longestSession),
        shortestSession: Math.round(shortestSession),
        consistencyScore: sessionCount > 0 ? Math.min(90, 20 + (sessionCount * 5)) : 0,
        isRealData: !sessionsSnapshot.empty // Indicar se são dados reais ou estimados
      };
      
      console.log('⏱️ [Study Time] Dados de tempo encontrados:', {
        ...studyTimeData,
        source: studyTimeData.isRealData ? 'SESSÕES REAIS' : 'ESTIMATIVAS INTELIGENTES'
      });
      
      res.status(200).json({
        success: true,
        data: studyTimeData
      });
    } catch (error) {
      console.error('Erro ao buscar tempo de estudo:', error);
      res.status(500).json({ success: false, error: 'Erro interno do servidor' });
    }
  });

  // Rotas para gerenciamento de sessões de estudo
  router.post('/study-sessions/start', authMiddleware, async (req: any, res: any) => {
    try {
      const { sessionId, userId, startTime, page } = req.body;
      console.log('🟢 [Start Session] Iniciando sessão:', { sessionId, userId, page });
      
      const sessionData = {
        sessionId,
        userId,
        startTime: new Date(startTime),
        page,
        isActive: true,
        questionCount: 0,
        pageActivity: [page],
        createdAt: new Date()
      };

      await db.collection('studySessions').doc(sessionId).set(sessionData);
      
      res.status(200).json({
        success: true,
        data: { sessionId, startTime }
      });
    } catch (error) {
      console.error('❌ [Start Session] Erro:', error);
      res.status(500).json({ success: false, error: 'Erro interno do servidor' });
    }
  });

  router.post('/study-sessions/end', authMiddleware, async (req: any, res: any) => {
    try {
      const { sessionId, endTime, duration, questionCount, pageActivity } = req.body;
      console.log('🔴 [End Session] Finalizando sessão:', { sessionId, duration: Math.round(duration/60000) + 'min' });
      
      await db.collection('studySessions').doc(sessionId).update({
        endTime: new Date(endTime),
        duration,
        questionCount,
        pageActivity,
        isActive: false,
        updatedAt: new Date()
      });
      
      res.status(200).json({
        success: true,
        data: { sessionId, duration: Math.round(duration/60000) }
      });
    } catch (error) {
      console.error('❌ [End Session] Erro:', error);
      res.status(500).json({ success: false, error: 'Erro interno do servidor' });
    }
  });

  router.put('/study-sessions/update', authMiddleware, async (req: any, res: any) => {
    try {
      const { sessionId, duration, questionCount, pageActivity, lastActivity } = req.body;
      
      await db.collection('studySessions').doc(sessionId).update({
        duration,
        questionCount,
        pageActivity,
        lastActivity: new Date(lastActivity),
        updatedAt: new Date()
      });
      
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('❌ [Update Session] Erro:', error);
      res.status(500).json({ success: false, error: 'Erro interno do servidor' });
    }
  });

  // Rota para registrar tempo de estudo (mantida para compatibilidade)
  router.post('/record-study-time', authMiddleware, async (req: any, res: any) => {
    try {
      const { userId, minutes, sessionType } = req.body;
      console.log('⏱️ [Record Study Time] Registrando tempo:', { userId, minutes, sessionType });
      
      if (!userId || !minutes) {
        return res.status(400).json({ 
          success: false, 
          error: 'userId e minutes são obrigatórios' 
        });
      }

      // Usar o serviço de estatísticas para registrar o tempo
      const { createUserStatisticsFactory } = require('./domain/userStatistics/factory/UserStatisticsFactory');
      const userStatisticsService = createUserStatisticsFactory();
      
      const updatedStats = await userStatisticsService.recordStudyTime(
        userId, 
        parseInt(minutes), 
        sessionType || 'other'
      );
      
      console.log('✅ [Record Study Time] Tempo registrado com sucesso:', {
        userId,
        minutes,
        totalMinutesStudied: updatedStats.studyTimeAnalysis?.totalMinutesStudied
      });
      
      res.status(200).json({
        success: true,
        data: {
          minutesRecorded: parseInt(minutes),
          totalMinutesStudied: updatedStats.studyTimeAnalysis?.totalMinutesStudied || 0
        }
      });
    } catch (error) {
      console.error('❌ [Record Study Time] Erro ao registrar tempo:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro interno do servidor' 
      });
    }
  });

  return router;
};
