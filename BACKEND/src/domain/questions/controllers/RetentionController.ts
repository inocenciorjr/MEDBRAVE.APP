import { Request, Response } from 'express';
import { QuestionRetentionService } from '../services/QuestionRetentionService';
import { UnifiedQuestionResponseService } from '../services/UnifiedQuestionResponseService';

export class RetentionController {
  constructor(
    private retentionService: QuestionRetentionService,
    private unifiedService: UnifiedQuestionResponseService
  ) {}

  async getListCompletionStatistics(req: Request, res: Response): Promise<void> {
    try {
      const { listId, userId } = req.params;
      
      if (!listId || !userId) {
        res.status(400).json({ error: 'listId e userId são obrigatórios' });
        return;
      }

      const statistics = await this.unifiedService.generateListStatistics(listId, userId);
      res.json(statistics);
    } catch (error) {
      console.error('Erro ao obter estatísticas de conclusão:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async getRetentionDashboard(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      
      if (!userId) {
        res.status(400).json({ error: 'userId é obrigatório' });
        return;
      }

      const dashboard = await this.retentionService.getRetentionDashboard(userId);
      res.json(dashboard);
    } catch (error) {
      console.error('Erro ao obter dashboard de retenção:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async getPerformancePrediction(_req: Request, res: Response): Promise<void> {
    try {
      const prediction = await this.retentionService.predictPerformance();
      res.json(prediction);
    } catch (error) {
      console.error('Erro ao obter predição de performance:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async getQuestionRetentionHistory(req: Request, res: Response): Promise<void> {
    try {
      const { questionId, userId } = req.params;
      
      if (!questionId || !userId) {
        res.status(400).json({ error: 'questionId e userId são obrigatórios' });
        return;
      }

      const retention = await this.retentionService.getRetentionRecord(userId, questionId);
      
      if (!retention) {
        res.status(404).json({ error: 'Histórico de retenção não encontrado' });
        return;
      }

      res.json(retention);
    } catch (error) {
      console.error('Erro ao obter histórico de retenção:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async addQuestionsToFSRS(req: Request, res: Response): Promise<void> {
    try {
      const { questionIds, userId } = req.body;
      
      if (!questionIds || !userId) {
        res.status(400).json({ error: 'questionIds e userId são obrigatórios' });
        return;
      }

      const result = await this.unifiedService.addSelectedQuestionsToFSRS(questionIds);

      res.json(result);
    } catch (error) {
      console.error('Erro ao adicionar questões ao FSRS:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async recordQuestionAnswer(req: Request, res: Response): Promise<void> {
    try {
      const payload = req.body;
      
      if (!payload.userId || !payload.questionId) {
        res.status(400).json({ error: 'userId e questionId são obrigatórios' });
        return;
      }

      const result = await this.unifiedService.recordQuestionAnswer(payload);
      res.json(result);
    } catch (error) {
      console.error('Erro ao registrar resposta:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async getUserRetentionSummary(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      
      if (!userId) {
        res.status(400).json({ error: 'userId é obrigatório' });
        return;
      }

      const summary = await this.retentionService.getUserRetentions(userId);
      res.json(summary);
    } catch (error) {
      console.error('Erro ao obter resumo de retenção:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async getRetentionAlerts(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.query;
      
      if (!userId) {
        res.status(400).json({ error: 'userId é obrigatório' });
        return;
      }

      const dashboard = await this.retentionService.getRetentionDashboard(userId as string);
      res.json(dashboard.alerts || []);
    } catch (error) {
      console.error('Erro ao obter alertas de retenção:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async getStudyRecommendations(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.query;
      
      if (!userId) {
        res.status(400).json({ error: 'userId é obrigatório' });
        return;
      }

      const dashboard = await this.retentionService.getRetentionDashboard(userId as string);
      res.json(dashboard.recommendations || []);
    } catch (error) {
      console.error('Erro ao obter recomendações de estudo:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async getMeaningfulAchievements(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.query;
      
      if (!userId) {
        res.status(400).json({ error: 'userId é obrigatório' });
        return;
      }

      // Implementação básica - retorna conquistas mockadas
      const achievements = [
        {
          id: '1',
          title: 'Primeira Conquista',
          description: 'Completou sua primeira sessão de estudos',
          type: 'MILESTONE',
          earnedAt: new Date().toISOString(),
          value: 'Parabéns por começar sua jornada!'
        }
      ];

      res.json(achievements);
    } catch (error) {
      console.error('Erro ao obter conquistas:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async updateGamificationSettings(req: Request, res: Response): Promise<void> {
    try {
      const { userId, settings } = req.body;
      
      if (!userId || !settings) {
        res.status(400).json({ error: 'userId e settings são obrigatórios' });
        return;
      }

      // Implementação básica - apenas confirma a atualização
      res.json({ 
        success: true, 
        message: 'Configurações de gamificação atualizadas',
        settings 
      });
    } catch (error) {
      console.error('Erro ao atualizar configurações de gamificação:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
}