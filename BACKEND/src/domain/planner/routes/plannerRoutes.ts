import { Router } from 'express';
import { PlannerController } from '../controllers/PlannerController';
import { PlannerService } from '../services/PlannerService';
import { enhancedAuthMiddleware } from '../../auth/middleware/enhancedAuth.middleware';

const router = Router();
const plannerService = new PlannerService();
const controller = new PlannerController(plannerService);

// Listar eventos (com filtros opcionais de data)
router.get('/events', enhancedAuthMiddleware, controller.getEvents);

// Criar evento
router.post('/events', enhancedAuthMiddleware, controller.createEvent);

// Atualizar evento
router.put('/events/:eventId', enhancedAuthMiddleware, controller.updateEvent);

// Deletar evento
router.delete('/events/:eventId', enhancedAuthMiddleware, controller.deleteEvent);

// Atualizar progresso
router.patch('/events/:eventId/progress', enhancedAuthMiddleware, controller.updateProgress);

// Buscar evento por data e tipo
router.get('/events/by-date-type', enhancedAuthMiddleware, controller.getEventByDateAndType);

export default router;
