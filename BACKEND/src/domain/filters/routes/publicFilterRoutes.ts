import { Router } from 'express';
import { supabaseAuthMiddleware as authMiddleware } from '../../auth/middleware/supabaseAuth.middleware';
import { PublicFilterController } from '../controllers/PublicFilterController';

/**
 * Cria rotas públicas para o banco de questões
 * Requer autenticação mas não requer admin
 */
export function createPublicFilterRoutes(
  controller: PublicFilterController,
): Router {
  const router = Router();

  // Aplicar middleware de autenticação em todas as rotas
  router.use(authMiddleware);

  // GET /api/banco-questoes/filters - Lista filtros raiz
  router.get('/filters', controller.getRootFilters.bind(controller));

  // GET /api/banco-questoes/filters/hierarchy - Hierarquia completa
  router.get('/filters/hierarchy', controller.getFilterHierarchy.bind(controller));

  // GET /api/banco-questoes/filters/:filterId/subfilters - Subfiltros de um filtro
  router.get('/filters/:filterId/subfilters', controller.getSubfiltersByFilter.bind(controller));

  // GET /api/banco-questoes/filters/:filterId/questions/count - Conta questões
  router.get('/filters/:filterId/questions/count', controller.countQuestionsByFilter.bind(controller));

  // GET /api/banco-questoes/years - Anos disponíveis
  router.get('/years', controller.getAvailableYears.bind(controller));

  // GET /api/banco-questoes/institutions - Hierarquia de instituições
  router.get('/institutions', controller.getInstitutionHierarchy.bind(controller));

  // POST /api/banco-questoes/questions/search - Busca questões
  router.post('/questions/search', controller.searchQuestions.bind(controller));

  // POST /api/banco-questoes/questions/count - Conta questões por filtros
  router.post('/questions/count', controller.countQuestionsByFilters.bind(controller));

  // POST /api/banco-questoes/questions/by-ids - Busca questões por IDs
  router.post('/questions/by-ids', controller.getQuestionsByIds.bind(controller));

  return router;
}
