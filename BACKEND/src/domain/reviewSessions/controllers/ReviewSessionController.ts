import { Request, Response } from 'express';
import { ReviewSessionService } from '../services/ReviewSessionService';
import { PlannerService } from '../../planner/services/PlannerService';

export class ReviewSessionController {
  constructor(
    private reviewSessionService: ReviewSessionService,
    private plannerService: PlannerService
  ) {}

  createSession = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Não autenticado' });
      }

      const { content_type, review_ids, date } = req.body;

      if (!content_type || !review_ids || !Array.isArray(review_ids)) {
        return res.status(400).json({ success: false, message: 'content_type e review_ids são obrigatórios' });
      }

      // Validar que a data não é futura
      if (date) {
        const sessionDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        sessionDate.setHours(0, 0, 0, 0);
        
        if (sessionDate > today) {
          return res.status(400).json({ 
            success: false, 
            message: 'Não é possível criar sessões de revisão para datas futuras' 
          });
        }
      }

      const session = await this.reviewSessionService.createSession(userId, content_type, review_ids, date);

      return res.status(201).json({ success: true, data: { session } });
    } catch (error: any) {
      console.error('Erro ao criar sessão:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  };

  getActiveSession = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Não autenticado' });
      }

      const { contentType } = req.query;

      if (!contentType) {
        return res.status(400).json({ success: false, message: 'contentType é obrigatório' });
      }

      const session = await this.reviewSessionService.getActiveSession(userId, contentType as string);

      return res.json({ success: true, data: { session } });
    } catch (error: any) {
      console.error('Erro ao buscar sessão:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  };

  markItemCompleted = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Não autenticado' });
      }

      const { sessionId } = req.params;
      const { item_id } = req.body;

      if (!item_id) {
        return res.status(400).json({ success: false, message: 'item_id é obrigatório' });
      }

      const session = await this.reviewSessionService.markItemCompleted(userId, sessionId, item_id);

      // Atualizar progresso no planner para TODAS as datas dos cards da sessão
      await this.updatePlannerProgressForSession(userId, session);

      return res.json({ success: true, data: { session } });
    } catch (error: any) {
      console.error('Erro ao marcar item:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  };

  completeSession = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Não autenticado' });
      }

      const { sessionId } = req.params;

      const session = await this.reviewSessionService.completeSession(userId, sessionId);

      // Atualizar progresso no planner para TODAS as datas dos cards da sessão
      await this.updatePlannerProgressForSession(userId, session);

      return res.json({ success: true, data: { session } });
    } catch (error: any) {
      console.error('Erro ao finalizar sessão:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  };

  getSessionById = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Não autenticado' });
      }

      const { sessionId } = req.params;

      const session = await this.reviewSessionService.getSessionById(userId, sessionId);

      if (!session) {
        return res.status(404).json({ success: false, message: 'Sessão não encontrada' });
      }

      return res.json({ success: true, data: { session } });
    } catch (error: any) {
      console.error('Erro ao buscar sessão:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  };

  listSessions = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Não autenticado' });
      }

      const { contentType, date, status } = req.query;

      const sessions = await this.reviewSessionService.listSessions(
        userId,
        contentType as string | undefined,
        date as string | undefined,
        status as string | undefined
      );

      return res.json({ success: true, data: { sessions } });
    } catch (error: any) {
      console.error('Erro ao listar sessões:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  };

  updateProgress = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Não autenticado' });
      }

      const { sessionId } = req.params;
      const { current_index } = req.body;

      if (current_index === undefined) {
        return res.status(400).json({ success: false, message: 'current_index é obrigatório' });
      }

      const session = await this.reviewSessionService.updateProgress(userId, sessionId, current_index);

      return res.json({ success: true, data: { session } });
    } catch (error: any) {
      console.error('Erro ao atualizar progresso:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  };

  /**
   * Atualiza o progresso do planner para todas as datas dos cards da sessão
   * Isso permite atualizar eventos de dias atrasados quando completados
   */
  private async updatePlannerProgressForSession(userId: string, session: any) {
    try {
      const { supabase } = await import('../../../config/supabaseAdmin');
      
      // Buscar os cards da sessão para obter suas datas de due
      // IMPORTANTE: session.review_ids contém IDs de fsrs_cards, não content_id
      // Usando supabaseAdmin (service role) que bypassa RLS
      const { data: cards, error } = await supabase
        .from('fsrs_cards')
        .select('id, content_id, due')
        .in('id', session.review_ids);

      if (error || !cards) {
        console.error('Erro ao buscar cards da sessão:', error);
        return;
      }

      // Agrupar cards por data de due (usando ID do fsrs_card)
      const cardsByDate: Record<string, string[]> = {};
      cards.forEach(card => {
        const dueDate = new Date(card.due).toISOString().split('T')[0];
        if (!cardsByDate[dueDate]) {
          cardsByDate[dueDate] = [];
        }
        cardsByDate[dueDate].push(card.id); // Usar ID do fsrs_card, não content_id
      });

      // Atualizar progresso para cada data
      for (const [date, fsrsCardIds] of Object.entries(cardsByDate)) {
        const plannerEvent = await this.plannerService.getEventByDateAndType(
          userId,
          date,
          session.content_type
        );

        if (plannerEvent) {
          // Contar quantos cards desta data foram completados
          // Agora comparando IDs corretos (fsrs_card.id com session.completed_ids)
          const completedInSession = fsrsCardIds.filter(id => 
            session.completed_ids.includes(id)
          ).length;

          // Incrementar completed_count do evento existente
          const newCompletedCount = (plannerEvent.completed_count || 0) + completedInSession;
          
          // Manter total_count existente ou usar o da sessão se for maior
          const totalCount = Math.max(plannerEvent.total_count || 0, newCompletedCount);

          await this.plannerService.updateProgress(
            userId,
            plannerEvent.id!,
            newCompletedCount,
            totalCount
          );
        }
      }
    } catch (error) {
      console.error('Erro ao atualizar progresso do planner:', error);
      // Não lançar erro para não quebrar o fluxo
    }
  }
}
