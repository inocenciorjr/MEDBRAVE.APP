import { Router } from 'express';
import { ReviewItemManagementController } from '../controllers/ReviewItemManagementController';
import { ReviewItemManagementService } from '../services/ReviewItemManagementService';
import { enhancedAuthMiddleware } from '../../../auth/middleware/enhancedAuth.middleware';
import { supabase } from '../../../../config/supabase';

const router = Router();
const service = new ReviewItemManagementService(supabase);

// UnifiedReviewService será injetado depois
let controller: ReviewItemManagementController;

export const createReviewItemManagementRoutes = (unifiedReviewService: any) => {
  controller = new ReviewItemManagementController(service, unifiedReviewService);
  
  // Todas as rotas requerem autenticação + plano ativo
  router.delete('/items/:contentId', enhancedAuthMiddleware, controller.removeItem.bind(controller));
  router.post('/items/:contentId/restore', enhancedAuthMiddleware, controller.restoreItem.bind(controller));
  router.get('/removed-items', enhancedAuthMiddleware, controller.getRemovedItems.bind(controller));
  router.delete('/removed-items/:removedItemId', enhancedAuthMiddleware, controller.deleteRemovedItemPermanently.bind(controller));
  router.post('/items/add-manual', enhancedAuthMiddleware, controller.addManually.bind(controller));
  
  return router;
};

export default router;
