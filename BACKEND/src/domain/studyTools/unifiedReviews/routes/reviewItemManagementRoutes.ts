import { Router } from 'express';
import { ReviewItemManagementController } from '../controllers/ReviewItemManagementController';
import { ReviewItemManagementService } from '../services/ReviewItemManagementService';
import { supabaseAuthMiddleware } from '../../../auth/middleware/supabaseAuth.middleware';
import { supabase } from '../../../../config/supabase';

const router = Router();
const service = new ReviewItemManagementService(supabase);

// UnifiedReviewService será injetado depois
let controller: ReviewItemManagementController;

export const createReviewItemManagementRoutes = (unifiedReviewService: any) => {
  controller = new ReviewItemManagementController(service, unifiedReviewService);
  
  // Todas as rotas requerem autenticação
  router.delete('/items/:contentId', supabaseAuthMiddleware, controller.removeItem.bind(controller));
  router.post('/items/:contentId/restore', supabaseAuthMiddleware, controller.restoreItem.bind(controller));
  router.get('/removed-items', supabaseAuthMiddleware, controller.getRemovedItems.bind(controller));
  router.delete('/removed-items/:removedItemId', supabaseAuthMiddleware, controller.deleteRemovedItemPermanently.bind(controller));
  router.post('/items/add-manual', supabaseAuthMiddleware, controller.addManually.bind(controller));
  
  return router;
};

export default router;
