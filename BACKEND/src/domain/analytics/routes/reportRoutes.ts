import { Router } from 'express';
import { firestore } from 'firebase-admin';
import { authMiddleware } from '../../auth/middleware/auth.middleware';
import { logger } from '../../../utils/logger';

export function createReportRoutes(db?: firestore.Firestore): Router {
  const router = Router();
  
  // Middleware para autenticação em todas as rotas
  router.use(authMiddleware);
  
  // Dashboard principal com resumo de progresso
  router.get('/dashboard', (req, res) => {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false,
        error: 'Usuário não autenticado' 
      });
    }
    
    // Aqui implementaria a lógica para gerar dashboard no Firestore
    // Por enquanto, apenas retornamos uma resposta simulada
    return res.status(200).json({
      success: true,
      data: {
        questionsSolved: 1250,
        flashcardsReviewed: 532,
        studyHours: 87,
        simulatedExamsCompleted: 12,
        avgSimulatedExamScore: 78.4,
        lastActivity: new Date().toISOString(),
        progressBySubject: [
          { subject: 'Cardiologia', progress: 85 },
          { subject: 'Neurologia', progress: 72 },
          { subject: 'Pediatria', progress: 64 },
          { subject: 'Ginecologia', progress: 58 },
          { subject: 'Cirurgia Geral', progress: 42 }
        ]
      }
    });
  });
  
  // Análise detalhada de questões
  router.get('/questions-analysis', (req, res) => {
    const userId = req.user?.id;
    // Parâmetros para filtrar a análise (seriam utilizados na implementação real)
    const { timeframe = 'all' } = req.query;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false,
        error: 'Usuário não autenticado' 
      });
    }
    
    // Aqui implementaria a lógica para análise de questões no Firestore
    // Por enquanto, apenas retornamos uma resposta simulada
    return res.status(200).json({
      success: true,
      data: {
        totalQuestions: 1500,
        answeredQuestions: 1250,
        correctAnswers: 875,
        incorrectAnswers: 375,
        accuracy: 70,
        timeframe,
        subjectsAnalysis: [
          { subject: 'Cardiologia', accuracy: 75, totalAnswered: 250 },
          { subject: 'Neurologia', accuracy: 68, totalAnswered: 220 },
          { subject: 'Pediatria', accuracy: 72, totalAnswered: 180 },
          { subject: 'Ginecologia', accuracy: 65, totalAnswered: 150 },
          { subject: 'Cirurgia Geral', accuracy: 62, totalAnswered: 120 }
        ]
      }
    });
  });
  
  // Análise de simulados
  router.get('/simulated-exams', (req, res) => {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false,
        error: 'Usuário não autenticado' 
      });
    }
    
    // Aqui implementaria a lógica para análise de simulados no Firestore
    // Por enquanto, apenas retornamos uma resposta simulada
    return res.status(200).json({
      success: true,
      data: {
        totalExams: 12,
        averageScore: 78.4,
        highestScore: 92,
        lowestScore: 65,
        scoreProgression: [
          { date: '2023-01-15', score: 65 },
          { date: '2023-02-10', score: 68 },
          { date: '2023-03-05', score: 72 },
          { date: '2023-04-20', score: 76 },
          { date: '2023-05-15', score: 81 },
          { date: '2023-06-10', score: 85 },
          { date: '2023-07-05', score: 79 },
          { date: '2023-08-20', score: 84 },
          { date: '2023-09-15', score: 86 },
          { date: '2023-10-10', score: 89 },
          { date: '2023-11-05', score: 91 },
          { date: '2023-12-20', score: 92 }
        ]
      }
    });
  });
  
  // Análise de tempo de estudo - IMPLEMENTAÇÃO ROBUSTA COM FIRESTORE
  router.get('/study-time/:userId', async (req, res) => {
    try {
      const userId = req.params.userId;
      
      if (!userId) {
        logger.warn('ReportRoutes', 'study-time', 'Tentativa de acesso sem userId');
        return res.status(401).json({ 
          success: false,
          error: 'Usuário não autenticado' 
        });
      }
      
      logger.info('ReportRoutes', 'study-time', `Buscando dados de tempo de estudo para usuário ${userId}`);
      
      // Verificar se temos acesso ao Firestore
      if (!db) {
        logger.error('ReportRoutes', 'study-time', 'Firestore não disponível');
        return res.status(500).json({
          success: false,
          error: 'Erro interno do servidor: Banco de dados não disponível'
        });
      }
      
      // Buscar estatísticas do usuário no Firestore
      const userStatsRef = db.collection('userStatistics').doc(userId);
      const userStatsDoc = await userStatsRef.get();
      
      if (!userStatsDoc.exists) {
        logger.info('ReportRoutes', 'study-time', `Nenhuma estatística encontrada para ${userId}, retornando dados zerados`);
        
        // Retornar estrutura zerada mas válida
        return res.status(200).json({
          success: true,
          data: {
            totalMinutesStudied: 0,
            sessionsCount: 0,
            averageSessionDuration: 0,
            longestSession: 0,
            shortestSession: 0,
            consistencyScore: 0,
            // Propriedades adicionais para compatibilidade com frontend
            totalMinutes: 0,
            sessions: 0,
            goalMinutes: 300 // Meta padrão de 5 horas
          }
        });
      }
      
      // Extrair dados de tempo de estudo
      const userStats = userStatsDoc.data();
      const studyTimeAnalysis = userStats?.studyTimeAnalysis || {};
      
      // Garantir que todos os campos necessários existam
      const studyTimeData = {
        totalMinutesStudied: studyTimeAnalysis.totalMinutesStudied || 0,
        sessionsCount: studyTimeAnalysis.sessionsCount || 0,
        averageSessionDuration: studyTimeAnalysis.averageSessionDuration || 0,
        longestSession: studyTimeAnalysis.longestSession || 0,
        shortestSession: studyTimeAnalysis.shortestSession || 0,
        consistencyScore: studyTimeAnalysis.consistencyScore || 0,
        
        // Propriedades adicionais para compatibilidade com frontend
        totalMinutes: studyTimeAnalysis.totalMinutesStudied || 0,
        sessions: studyTimeAnalysis.sessionsCount || 0,
        goalMinutes: 300 // Meta padrão de 5 horas
      };
      
      // Buscar dados adicionais de sessões de estudo se necessário
      // Isso poderia ser expandido para incluir distribuição por dia da semana, etc.
      
      logger.info('ReportRoutes', 'study-time', `Dados de tempo de estudo recuperados com sucesso para ${userId}`);
      
      return res.status(200).json({
        success: true,
        data: studyTimeData
      });
    } catch (error) {
      logger.error('ReportRoutes', 'study-time', `Erro ao buscar dados de tempo de estudo: ${error}`);
      
      // Retornar erro detalhado
      return res.status(500).json({
        success: false,
        error: 'Erro interno do servidor ao processar dados de tempo de estudo',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  });
  
  return router;
}
