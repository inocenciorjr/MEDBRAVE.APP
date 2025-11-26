import { Router } from 'express';
import { UnifiedQuestionController } from '../controllers/UnifiedQuestionController';
import { SupabaseQuestionService } from '../../../infra/questions/supabase/SupabaseQuestionService';

import { supabase } from "../../../config/supabase";
import { enhancedAuthMiddleware } from '../../auth/middleware/enhancedAuth.middleware';
import { checkQuestionsPerDayLimit } from '../../auth/middleware/usageMiddlewares';

const router = Router();
const questionService = new SupabaseQuestionService(supabase);
const controller = new UnifiedQuestionController(questionService);

// Listagem e busca (DEVEM VIR ANTES DAS ROTAS COM :id)
router.get('/', enhancedAuthMiddleware, (req, res, next) => controller.listQuestions(req, res, next));
router.get('/stats', enhancedAuthMiddleware, (req, res, next) => controller.getQuestionStats(req, res, next));
router.post('/search', enhancedAuthMiddleware, (req, res, next) =>
  controller.searchQuestions(req, res, next),
);
router.get('/search', enhancedAuthMiddleware, (req, res, next) =>
  controller.searchQuestions(req, res, next),
);
router.get('/count', enhancedAuthMiddleware, (req, res, next) =>
  controller.countQuestions(req, res, next),
);
router.post('/count', enhancedAuthMiddleware, (req, res, next) =>
  controller.countQuestions(req, res, next),
);

// CRUD (rotas com :id devem vir DEPOIS das rotas específicas)
router.post('/', enhancedAuthMiddleware, (req, res, next) =>
  controller.createQuestion(req, res, next),
);
router.post('/bulk', enhancedAuthMiddleware, (req, res, next) =>
  controller.bulkCreateQuestions(req, res, next),
);
router.get('/:id', enhancedAuthMiddleware, checkQuestionsPerDayLimit as any, (req, res, next) =>
  controller.getQuestionById(req, res, next),
);
router.put('/:id', enhancedAuthMiddleware, (req, res, next) =>
  controller.updateQuestion(req, res, next),
);
router.delete('/:id', enhancedAuthMiddleware, (req, res, next) =>
  controller.deleteQuestion(req, res, next),
);

// Tags, status, rating
router.post('/:id/rate', enhancedAuthMiddleware, (req, res, next) =>
  controller.rateQuestion(req, res, next),
);
router.post('/:id/tags', enhancedAuthMiddleware, (req, res, next) =>
  controller.addTags(req, res, next),
);
router.delete('/:id/tags', enhancedAuthMiddleware, (req, res, next) =>
  controller.removeTags(req, res, next),
);
router.patch('/:id/status', enhancedAuthMiddleware, (req, res, next) =>
  controller.changeStatus(req, res, next),
);

// Filtros, relacionados, bulk
router.get('/filters', enhancedAuthMiddleware, (req, res, next) =>
  controller.listQuestionsByFilters(req, res, next),
);
router.get('/:id/related', enhancedAuthMiddleware, (req, res, next) =>
  controller.listRelatedQuestions(req, res, next),
);
router.get('/lists/:id/items', enhancedAuthMiddleware, (req, res, next) =>
  controller.getQuestionsFromList(req, res, next),
);
router.get('/lists/:id/batch', enhancedAuthMiddleware, (req, res, next) =>
  controller.getQuestionsFromListBatch(req, res, next),
);
router.post('/bulk-get', enhancedAuthMiddleware, (req, res, next) =>
  controller.getBulkQuestions(req, res, next),
);
router.post('/batch-counts', enhancedAuthMiddleware, (req, res, next) =>
  controller.batchCountQuestions(req, res, next),
);

// Performance por especialidade
router.get('/user-performance-by-specialty', enhancedAuthMiddleware, (req, res, next) =>
  controller.getUserPerformanceBySpecialty(req, res, next),
);

export default router;
