import { Router, Request, Response } from 'express';
import { MentorAnalyticsService } from '../services/MentorAnalyticsService';
import { enhancedAuthMiddleware } from '../../auth/middleware/enhancedAuth.middleware';
import { requireFeature } from '../../auth/middleware/enhancedAuth.middleware';
import { authenticate, isMentor } from '../middlewares/authMiddleware';

const router = Router();
const analyticsService = new MentorAnalyticsService();

// Middleware de autenticação para todas as rotas de mentorship
router.use(enhancedAuthMiddleware as any);
router.use(requireFeature('canAccessMentorship') as any);

/**
 * GET /api/mentorship/analytics/overview
 * Obtém visão geral de analytics do mentor
 */
router.get('/overview', authenticate, isMentor, async (req: any, res: Response) => {
  try {
    const mentorId = (req as any).user?.id;
    if (!mentorId) {
      return res.status(401).json({ success: false, error: 'Não autorizado' });
    }

    const overview = await analyticsService.getMentorOverview(mentorId);
    res.json({ success: true, data: overview });
  } catch (error: any) {
    console.error('Erro ao buscar overview:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/mentorship/analytics/simulados
 * Lista simulados do mentor com estatísticas
 */
router.get('/simulados', authenticate, isMentor, async (req: any, res: Response) => {
  try {
    const mentorId = (req as any).user?.id;
    if (!mentorId) {
      return res.status(401).json({ success: false, error: 'Não autorizado' });
    }

    const simulados = await analyticsService.getMentorSimulados(mentorId);
    res.json({ success: true, data: simulados });
  } catch (error: any) {
    console.error('Erro ao buscar simulados:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});


/**
 * GET /api/mentorship/analytics/simulados/:id/stats
 * Obtém estatísticas de um simulado específico
 */
router.get('/simulados/:id/stats', authenticate, isMentor, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const stats = await analyticsService.getSimuladoStats(id);
    res.json({ success: true, data: stats });
  } catch (error: any) {
    console.error('Erro ao buscar stats do simulado:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/mentorship/analytics/simulados/:id/subjects
 * Obtém desempenho por especialidade de um simulado
 */
router.get('/simulados/:id/subjects', authenticate, isMentor, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const performance = await analyticsService.getSimuladoPerformanceBySubject(id);
    res.json({ success: true, data: performance });
  } catch (error: any) {
    console.error('Erro ao buscar performance por assunto:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/mentorship/analytics/simulados/:id/ranking
 * Obtém ranking de um simulado
 */
router.get('/simulados/:id/ranking', authenticate, isMentor, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const ranking = await analyticsService.getSimuladoRanking(id);
    res.json({ success: true, data: ranking });
  } catch (error: any) {
    console.error('Erro ao buscar ranking:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/mentorship/analytics/simulados/:id/questions
 * Obtém análise detalhada de questões de um simulado
 */
router.get('/simulados/:id/questions', authenticate, isMentor, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const analysis = await analyticsService.getSimuladoQuestionAnalysis(id);
    res.json({ success: true, data: analysis });
  } catch (error: any) {
    console.error('Erro ao buscar análise de questões:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});


/**
 * GET /api/mentorship/analytics/mentees/:id/performance
 * Obtém desempenho de um mentorado específico
 */
router.get('/mentees/:id/performance', authenticate, isMentor, async (req: any, res: Response) => {
  try {
    const mentorId = (req as any).user?.id;
    const { id: menteeId } = req.params;

    if (!mentorId) {
      return res.status(401).json({ success: false, error: 'Não autorizado' });
    }

    const performance = await analyticsService.getMenteePerformance(mentorId, menteeId);
    res.json({ success: true, data: performance });
  } catch (error: any) {
    console.error('Erro ao buscar performance do mentorado:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/mentorship/analytics/simulados/:id/compare
 * Compara desempenho de múltiplos mentorados em um simulado
 */
router.post('/simulados/:id/compare', authenticate, isMentor, async (req: any, res: Response) => {
  try {
    const { id: simuladoId } = req.params;
    const { menteeIds } = req.body;

    if (!menteeIds || !Array.isArray(menteeIds)) {
      return res.status(400).json({ 
        success: false, 
        error: 'menteeIds deve ser um array de IDs' 
      });
    }

    const comparison = await analyticsService.compareSimuladoPerformance(simuladoId, menteeIds);
    res.json({ success: true, data: comparison });
  } catch (error: any) {
    console.error('Erro ao comparar performance:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// ROTAS DE ANALYTICS GLOBAIS
// ============================================

/**
 * GET /api/mentorship/analytics/global/summary
 * Obtém resumo geral de analytics globais
 */
router.get('/global/summary', authenticate, isMentor, async (req: any, res: Response) => {
  try {
    const mentorId = (req as any).user?.id;
    if (!mentorId) {
      return res.status(401).json({ success: false, error: 'Não autorizado' });
    }

    const summary = await analyticsService.getGlobalAnalyticsSummary(mentorId);
    res.json({ success: true, data: summary });
  } catch (error: any) {
    console.error('Erro ao buscar resumo global:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/mentorship/analytics/global/ranking
 * Obtém ranking global cumulativo de todos os simulados
 */
router.get('/global/ranking', authenticate, isMentor, async (req: any, res: Response) => {
  try {
    const mentorId = (req as any).user?.id;
    if (!mentorId) {
      return res.status(401).json({ success: false, error: 'Não autorizado' });
    }

    const { limit, period } = req.query;
    const ranking = await analyticsService.getGlobalRanking(mentorId, {
      limit: limit ? parseInt(limit as string) : 50,
      period: (period as 'all' | '30d' | '60d' | '90d') || 'all'
    });
    res.json({ success: true, data: ranking });
  } catch (error: any) {
    console.error('Erro ao buscar ranking global:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/mentorship/analytics/global/specialties
 * Obtém estatísticas globais por especialidade
 */
router.get('/global/specialties', authenticate, isMentor, async (req: any, res: Response) => {
  try {
    const mentorId = (req as any).user?.id;
    if (!mentorId) {
      return res.status(401).json({ success: false, error: 'Não autorizado' });
    }

    const stats = await analyticsService.getGlobalSpecialtyStats(mentorId);
    res.json({ success: true, data: stats });
  } catch (error: any) {
    console.error('Erro ao buscar estatísticas por especialidade:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/mentorship/analytics/global/compare
 * Compara estatísticas entre simulados selecionados
 */
router.post('/global/compare', authenticate, isMentor, async (req: any, res: Response) => {
  try {
    const mentorId = (req as any).user?.id;
    if (!mentorId) {
      return res.status(401).json({ success: false, error: 'Não autorizado' });
    }

    const { simuladoIds } = req.body;
    if (!simuladoIds || !Array.isArray(simuladoIds)) {
      return res.status(400).json({ 
        success: false, 
        error: 'simuladoIds deve ser um array de IDs' 
      });
    }

    const comparison = await analyticsService.compareSimulados(mentorId, simuladoIds);
    res.json({ success: true, data: comparison });
  } catch (error: any) {
    console.error('Erro ao comparar simulados:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/mentorship/analytics/global/evolution
 * Obtém dados de evolução ao longo do tempo
 */
router.get('/global/evolution', authenticate, isMentor, async (req: any, res: Response) => {
  try {
    const mentorId = (req as any).user?.id;
    if (!mentorId) {
      return res.status(401).json({ success: false, error: 'Não autorizado' });
    }

    const evolution = await analyticsService.getEvolutionOverTime(mentorId);
    res.json({ success: true, data: evolution });
  } catch (error: any) {
    console.error('Erro ao buscar evolução:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
