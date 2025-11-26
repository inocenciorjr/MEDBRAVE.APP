import { Router } from 'express';
import { SupabaseClient } from '@supabase/supabase-js';
import { enhancedAuthMiddleware } from '../../domain/auth/middleware/enhancedAuth.middleware';
import { logger } from '../../utils/logger';
import { supabase } from '../../config/supabaseAdmin';

export function createReportRoutes(client?: SupabaseClient): Router {
  const router = Router();
  const db = client || supabase;

  // Middleware para autenticação + plano em todas as rotas
  router.use(enhancedAuthMiddleware);

  // Dashboard principal com resumo de progresso
  router.get('/dashboard', (req, res) => {
    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Usuário não autenticado',
      });
    }

    // Aqui implementaria a lógica para gerar dashboard no Supabase
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
          { subject: 'Cirurgia Geral', progress: 42 },
        ],
      },
    });
  });

  // Análise detalhada de questões
  router.get('/questions-analysis', (req, res) => {
    const userId = (req as any).userId;
    const { timeframe: _timeframe = 'all' } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Usuário não autenticado',
      });
    }

    // Implementação simulada - na versão real, consultaria Supabase
    return res.status(200).json({
      success: true,
      data: {
        totalQuestions: 1250,
        correctAnswers: 987,
        incorrectAnswers: 263,
        accuracy: 78.96,
        averageTimePerQuestion: 45.2,
        difficultyBreakdown: {
          easy: { total: 425, correct: 398, accuracy: 93.6 },
          medium: { total: 520, correct: 389, accuracy: 74.8 },
          hard: { total: 305, correct: 200, accuracy: 65.6 },
        },
        subjectBreakdown: [
          { subject: 'Cardiologia', total: 245, correct: 198, accuracy: 80.8 },
          { subject: 'Neurologia', total: 189, correct: 142, accuracy: 75.1 },
          { subject: 'Pediatria', total: 167, correct: 125, accuracy: 74.9 },
        ],
        weeklyProgress: [
          { week: '2024-01-01', questionsAnswered: 45, accuracy: 76.2 },
          { week: '2024-01-08', questionsAnswered: 52, accuracy: 78.8 },
          { week: '2024-01-15', questionsAnswered: 48, accuracy: 81.3 },
        ],
      },
    });
  });

  // Relatório de tempo de estudo
  router.get('/study-time', async (req, res) => {
    try {
      const userId = (req as any).userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Usuário não autenticado',
        });
      }

      // Buscar estatísticas do usuário no Supabase
      const { data: userStats, error } = await db
        .from('user_statistics')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        logger.error(
          'ReportRoutes',
          'study-time',
          'Erro ao buscar estatísticas',
          error,
        );
        return res.status(500).json({
          success: false,
          error: 'Erro interno do servidor',
        });
      }

      if (!userStats) {
        logger.info(
          'ReportRoutes',
          'study-time',
          `Nenhuma estatística encontrada para ${userId}, retornando dados zerados`,
        );

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
            totalSessions: 0,
            avgSessionMinutes: 0,
            dailyAverage: 0,
            weeklyTrend: [],
            monthlyBreakdown: [],
          },
        });
      }

      // Processar dados existentes
      const data = {
        totalMinutesStudied: userStats.total_minutes_studied || 0,
        sessionsCount: userStats.sessions_count || 0,
        averageSessionDuration: userStats.average_session_duration || 0,
        longestSession: userStats.longest_session || 0,
        shortestSession: userStats.shortest_session || 0,
        consistencyScore: userStats.consistency_score || 0,
        // Propriedades adicionais para compatibilidade
        totalMinutes: userStats.total_minutes_studied || 0,
        totalSessions: userStats.sessions_count || 0,
        avgSessionMinutes: userStats.average_session_duration || 0,
        dailyAverage: Math.round((userStats.total_minutes_studied || 0) / 30), // Aproximação para 30 dias
        weeklyTrend: userStats.weekly_trend || [],
        monthlyBreakdown: userStats.monthly_breakdown || [],
      };

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      logger.error('ReportRoutes', 'study-time', 'Erro inesperado', error);
      return res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      });
    }
  });

  // Relatório de simulados
  router.get('/simulated-exams', (req, res) => {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Usuário não autenticado',
      });
    }

    // Implementação simulada - na versão real, consultaria Supabase
    return res.status(200).json({
      success: true,
      data: {
        totalExams: 12,
        averageScore: 78.4,
        bestScore: 92.1,
        worstScore: 65.3,
        improvementTrend: 'positive',
        recentExams: [
          {
            id: 'exam_001',
            date: '2024-01-15',
            score: 85.2,
            totalQuestions: 100,
            correctAnswers: 85,
            timeSpent: 180, // minutos
            subject: 'Medicina Geral',
          },
          {
            id: 'exam_002',
            date: '2024-01-08',
            score: 78.0,
            totalQuestions: 100,
            correctAnswers: 78,
            timeSpent: 175,
            subject: 'Cardiologia',
          },
        ],
        subjectPerformance: [
          { subject: 'Cardiologia', avgScore: 82.1, examsCount: 3 },
          { subject: 'Neurologia', avgScore: 76.8, examsCount: 2 },
          { subject: 'Pediatria', avgScore: 74.2, examsCount: 2 },
        ],
      },
    });
  });

  return router;
}
