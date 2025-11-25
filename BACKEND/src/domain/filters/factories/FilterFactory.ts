import { Router } from 'express';
import { SupabaseFilterRepository } from '../repositories/SupabaseFilterRepository';
import { SupabaseSubFilterRepository } from '../repositories/SupabaseSubFilterRepository';
import { FilterController } from '../controllers/FilterController';
import { SubFilterController } from '../controllers/SubFilterController';
import { CreateFilterUseCase } from '../useCases/CreateFilterUseCase';
import { GetFilterByIdUseCase } from '../useCases/GetFilterByIdUseCase';
import { ListFiltersUseCase } from '../useCases/ListFiltersUseCase';
import { UpdateFilterUseCase } from '../useCases/UpdateFilterUseCase';
import { DeleteFilterUseCase } from '../useCases/DeleteFilterUseCase';
import { CreateSubFilterUseCase } from '../useCases/CreateSubFilterUseCase';
import { GetSubFilterByIdUseCase } from '../useCases/GetSubFilterByIdUseCase';
import { ListSubFiltersByFilterIdUseCase } from '../useCases/ListSubFiltersByFilterIdUseCase';
import { UpdateSubFilterUseCase } from '../useCases/UpdateSubFilterUseCase';
import { DeleteSubFilterUseCase } from '../useCases/DeleteSubFilterUseCase';
import { GetParentFilterCategoryUseCase } from '../useCases/GetParentFilterCategoryUseCase';
import { createFilterRoutes } from '../routes/filterRoutes';

export function createFilterModule(): { router: Router } {
  // Inicializar repositórios
  const filterRepository = new SupabaseFilterRepository();
  const subFilterRepository = new SupabaseSubFilterRepository();

  // Inicializar casos de uso de filtros
  const createFilterUseCase = new CreateFilterUseCase(filterRepository);
  const getFilterByIdUseCase = new GetFilterByIdUseCase(filterRepository);
  const listFiltersUseCase = new ListFiltersUseCase(filterRepository);
  const updateFilterUseCase = new UpdateFilterUseCase(filterRepository);
  const deleteFilterUseCase = new DeleteFilterUseCase(filterRepository);

  // Inicializar casos de uso de subfiltros
  const createSubFilterUseCase = new CreateSubFilterUseCase(
    subFilterRepository,
  );
  const getSubFilterByIdUseCase = new GetSubFilterByIdUseCase(
    subFilterRepository,
  );
  const listSubFiltersByFilterIdUseCase = new ListSubFiltersByFilterIdUseCase(
    subFilterRepository,
  );
  const updateSubFilterUseCase = new UpdateSubFilterUseCase(
    subFilterRepository,
  );
  const deleteSubFilterUseCase = new DeleteSubFilterUseCase(
    subFilterRepository,
  );
  const getParentFilterCategoryUseCase = new GetParentFilterCategoryUseCase(
    subFilterRepository,
  );

  // Inicializar controladores
  const filterController = new FilterController(
    createFilterUseCase,
    getFilterByIdUseCase,
    listFiltersUseCase,
    updateFilterUseCase,
    deleteFilterUseCase,
  );

  const subFilterController = new SubFilterController(
    createSubFilterUseCase,
    getSubFilterByIdUseCase,
    listSubFiltersByFilterIdUseCase,
    updateSubFilterUseCase,
    deleteSubFilterUseCase,
    getParentFilterCategoryUseCase,
  );

  // Criar rotas
  const router = createFilterRoutes(filterController, subFilterController);

  return { router };
}
