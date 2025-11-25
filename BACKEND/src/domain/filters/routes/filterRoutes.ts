import { Router } from 'express';
import { FilterController } from '../controllers/FilterController';
import { SubFilterController } from '../controllers/SubFilterController';
import {
  validateCreateFilter,
  validateUpdateFilter,
  validateCreateSubFilter,
  validateUpdateSubFilter,
} from '../validators/filterValidators';

export function createFilterRoutes(
  filterController: FilterController,
  subFilterController: SubFilterController,
): Router {
  const router = Router();

  // NÃO aplicar middlewares aqui - eles já são aplicados no nível /admin
  // router.use(authMiddleware);
  // router.use(adminMiddleware);

  // Rotas de filtros
  router.get('/', filterController.list.bind(filterController));
  router.get('/:id', filterController.getById.bind(filterController));
  router.post(
    '/',
    validateCreateFilter,
    filterController.create.bind(filterController),
  );
  router.put(
    '/:id',
    validateUpdateFilter,
    filterController.update.bind(filterController),
  );
  router.delete(
    '/:id',
    filterController.delete.bind(filterController),
  );

  // Rotas de subfiltros
  router.get(
    '/subfilters/all',
    subFilterController.listAll.bind(subFilterController),
  );
  router.get(
    '/:filterId/subfilters',
    subFilterController.listByFilterId.bind(subFilterController),
  );
  router.get(
    '/subfilters/:id',
    subFilterController.getById.bind(subFilterController),
  );
  router.get(
    '/subfilters/:id/category',
    subFilterController.getParentFilterCategory.bind(subFilterController),
  );
  router.post(
    '/:filter_id/subfilters',
    validateCreateSubFilter,
    subFilterController.create.bind(subFilterController),
  );
  router.put(
    '/subfilters/:id',
    validateUpdateSubFilter,
    subFilterController.update.bind(subFilterController),
  );
  router.delete(
    '/subfilters/:id',
    subFilterController.delete.bind(subFilterController),
  );

  return router;
}
