import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../auth/middleware/supabaseAuth.middleware';
import { FilterService } from '../services/FilterService';
import logger from '../../../utils/logger';

export class PublicFilterController {
  constructor(private filterService: FilterService) {}

  /**
   * GET /api/banco-questoes/filters
   * Busca todos os filtros raiz (level = 0)
   */
  async getRootFilters(
    _req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const filters = await this.filterService.getRootFilters();
      res.json({ success: true, data: filters });
    } catch (error) {
      logger.error('[PublicFilterController] Erro ao buscar filtros raiz:', error);
      next(error);
    }
  }

  /**
   * GET /api/banco-questoes/filters/:filterId/subfilters
   * Busca subfiltros de um filtro específico
   */
  async getSubfiltersByFilter(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { filterId } = req.params;
      const { level } = req.query;

      const subfilters = await this.filterService.getSubfiltersByFilter(
        filterId,
        level ? parseInt(level as string) : undefined,
      );

      res.json({ success: true, data: subfilters });
    } catch (error) {
      logger.error('[PublicFilterController] Erro ao buscar subfiltros:', error);
      next(error);
    }
  }

  /**
   * GET /api/banco-questoes/filters/hierarchy
   * Busca hierarquia completa de filtros
   */
  async getFilterHierarchy(
    _req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const hierarchy = await this.filterService.getFilterHierarchy();
      res.json({ success: true, data: hierarchy });
    } catch (error) {
      logger.error('[PublicFilterController] Erro ao buscar hierarquia:', error);
      next(error);
    }
  }

  /**
   * GET /api/banco-questoes/filters/:filterId/questions/count
   * Conta questões por filtro
   */
  async countQuestionsByFilter(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { filterId } = req.params;
      const count = await this.filterService.countQuestionsByFilter(filterId);
      res.json({ success: true, data: { count } });
    } catch (error) {
      logger.error('[PublicFilterController] Erro ao contar questões:', error);
      next(error);
    }
  }

  /**
   * GET /api/banco-questoes/years
   * Busca anos disponíveis
   */
  async getAvailableYears(
    _req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const years = await this.filterService.getAvailableYears();
      res.json({ success: true, data: years });
    } catch (error) {
      logger.error('[PublicFilterController] Erro ao buscar anos:', error);
      next(error);
    }
  }

  /**
   * GET /api/banco-questoes/institutions
   * Busca hierarquia de instituições (estados e universidades)
   */
  async getInstitutionHierarchy(
    _req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const hierarchy = await this.filterService.getInstitutionHierarchy();
      res.json({ success: true, data: hierarchy });
    } catch (error) {
      logger.error('[PublicFilterController] Erro ao buscar hierarquia de instituições:', error);
      next(error);
    }
  }


  /**
   * POST /api/banco-questoes/questions/search
   * Busca questões por filtros e subfiltros
   */
  async searchQuestions(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { filterIds, subFilterIds, years, institutions, page = 1, limit = 20 } = req.body;

      const result = await this.filterService.searchQuestions({
        filterIds,
        subFilterIds,
        years,
        institutions,
        page,
        limit,
      });

      res.json({ success: true, data: result });
    } catch (error) {
      logger.error('[PublicFilterController] Erro ao buscar questões:', error);
      next(error);
    }
  }

  /**
   * POST /api/banco-questoes/questions/count
   * Conta questões baseado nos filtros selecionados
   */
  async countQuestionsByFilters(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const params = req.body;
      const count = await this.filterService.countQuestionsByFilters(params);
      res.json({ success: true, data: { count } });
    } catch (error) {
      logger.error('[PublicFilterController] Erro ao contar questões por filtros:', error);
      next(error);
    }
  }

  /**
   * POST /api/banco-questoes/questions/by-ids
   * Busca questões por lista de IDs
   */
  async getQuestionsByIds(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { questionIds } = req.body;

      if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
        res.status(400).json({ 
          success: false, 
          error: 'questionIds deve ser um array não vazio' 
        });
        return;
      }

      const questions = await this.filterService.getQuestionsByIds(questionIds);
      res.json({ success: true, data: questions });
    } catch (error) {
      logger.error('[PublicFilterController] Erro ao buscar questões por IDs:', error);
      next(error);
    }
  }
}
