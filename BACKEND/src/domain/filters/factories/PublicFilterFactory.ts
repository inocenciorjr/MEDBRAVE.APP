import { Router } from 'express';
import { FilterService } from '../services/FilterService';
import { PublicFilterController } from '../controllers/PublicFilterController';
import { createPublicFilterRoutes } from '../routes/publicFilterRoutes';

/**
 * Factory para criar o módulo público de filtros (banco de questões)
 */
export function createPublicFilterModule(): { router: Router } {
  // Criar serviço
  const filterService = new FilterService();

  // Criar controller
  const controller = new PublicFilterController(filterService);

  // Criar rotas
  const router = createPublicFilterRoutes(controller);

  return { router };
}
