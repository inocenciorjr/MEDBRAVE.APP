import { Router } from 'express';
import { authMiddleware } from '../../auth/middleware/auth.middleware';
import { adminMiddleware } from '../../auth/middleware/admin.middleware';
import { FilterController } from '../controllers/FilterController';
import { SubFilterController } from '../controllers/SubFilterController';
import { validateCreateFilter, validateUpdateFilter, validateCreateSubFilter, validateUpdateSubFilter } from '../validators/filterValidators';

export function createFilterRoutes(
  filterController: FilterController,
  subFilterController: SubFilterController
): Router {
  const router = Router();
  
  // Rotas públicas (sem autenticação)
  router.get('/', filterController.list.bind(filterController));
  router.get('/:id', filterController.getById.bind(filterController));
  router.get('/:filterId/subfilters', subFilterController.listByFilterId.bind(subFilterController));
  router.get('/subfilters/:id', subFilterController.getById.bind(subFilterController));
  router.get('/subfilters/:id/category', subFilterController.getParentFilterCategory.bind(subFilterController));
  
  // Rotas administrativas (com autenticação)
  router.post('/', authMiddleware, adminMiddleware, validateCreateFilter, filterController.create.bind(filterController));
  router.put('/:id', authMiddleware, adminMiddleware, validateUpdateFilter, filterController.update.bind(filterController));
  router.delete('/:id', authMiddleware, adminMiddleware, filterController.delete.bind(filterController));
  router.post('/:filterId/subfilters', authMiddleware, adminMiddleware, validateCreateSubFilter, subFilterController.create.bind(subFilterController));
  router.put('/subfilters/:id', authMiddleware, adminMiddleware, validateUpdateSubFilter, subFilterController.update.bind(subFilterController));
  router.delete('/subfilters/:id', authMiddleware, adminMiddleware, subFilterController.delete.bind(subFilterController));
  
  return router;
}