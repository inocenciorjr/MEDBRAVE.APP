import { Request, Response } from 'express';
import { PlannerService } from '../services/PlannerService';

export class PlannerController {
  constructor(private plannerService: PlannerService) {}

  // Listar eventos do planner
  getEvents = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Não autenticado' });
      }

      const { startDate, endDate } = req.query;
      
      const events = await this.plannerService.getEvents(
        userId,
        startDate as string,
        endDate as string
      );

      return res.json({ success: true, data: { events } });
    } catch (error: any) {
      console.error('Erro ao buscar eventos:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  };

  // Criar evento
  createEvent = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Não autenticado' });
      }

      console.log('[PlannerController] Dados recebidos:', JSON.stringify(req.body, null, 2));
      const event = await this.plannerService.createEvent(userId, req.body);
      console.log('[PlannerController] Evento criado:', JSON.stringify(event, null, 2));

      return res.status(201).json({ success: true, data: { event } });
    } catch (error: any) {
      console.error('Erro ao criar evento:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  };

  // Atualizar evento
  updateEvent = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Não autenticado' });
      }

      const { eventId } = req.params;
      const event = await this.plannerService.updateEvent(userId, eventId, req.body);

      return res.json({ success: true, data: { event } });
    } catch (error: any) {
      console.error('Erro ao atualizar evento:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  };

  // Deletar evento
  deleteEvent = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Não autenticado' });
      }

      const { eventId } = req.params;
      await this.plannerService.deleteEvent(userId, eventId);

      return res.json({ success: true, message: 'Evento deletado com sucesso' });
    } catch (error: any) {
      console.error('Erro ao deletar evento:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  };

  // Atualizar progresso de um evento
  updateProgress = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Não autenticado' });
      }

      const { eventId } = req.params;
      const { completedCount, totalCount } = req.body;

      if (typeof completedCount !== 'number' || typeof totalCount !== 'number') {
        return res.status(400).json({ success: false, message: 'completedCount e totalCount são obrigatórios' });
      }

      const event = await this.plannerService.updateProgress(userId, eventId, completedCount, totalCount);

      return res.json({ success: true, data: { event } });
    } catch (error: any) {
      console.error('Erro ao atualizar progresso:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  };

  // Buscar evento por data e tipo
  getEventByDateAndType = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Não autenticado' });
      }

      const { date, contentType } = req.query;

      if (!date || !contentType) {
        return res.status(400).json({ success: false, message: 'date e contentType são obrigatórios' });
      }

      const event = await this.plannerService.getEventByDateAndType(userId, date as string, contentType as string);

      return res.json({ success: true, data: { event } });
    } catch (error: any) {
      console.error('Erro ao buscar evento:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  };
}
