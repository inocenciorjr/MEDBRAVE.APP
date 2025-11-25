import { Router } from 'express';
import { PlannerController } from '../controllers/PlannerController';
import { PlannerService } from '../services/PlannerService';
import { supabaseAuthMiddleware as authMiddleware } from '../../auth/middleware/supabaseAuth.middleware';

const router = Router();
const plannerService = new PlannerService();
const controller = new PlannerController(plannerService);

// Listar eventos (com filtros opcionais de data)
router.get('/events', authMiddleware, controller.getEvents);

// Criar evento
router.post('/events', authMiddleware, controller.createEvent);

// Atualizar evento
router.put('/events/:eventId', authMiddleware, controller.updateEvent);

// Deletar evento
router.delete('/events/:eventId', authMiddleware, controller.deleteEvent);

// Atualizar progresso
router.patch('/events/:eventId/progress', authMiddleware, controller.updateProgress);

// Buscar evento por data e tipo
router.get('/events/by-date-type', authMiddleware, controller.getEventByDateAndType);

export default router;
