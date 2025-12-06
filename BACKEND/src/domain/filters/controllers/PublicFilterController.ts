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
      const { filterIds, subFilterIds, years, institutions, page = 1, limit = 20, excludeOutdated, excludeAnnulled, unansweredFilter } = req.body;

      // Adicionar userId se necessário para filtro de questões não respondidas
      const userId = req.user?.id && unansweredFilter && unansweredFilter !== 'all' ? req.user.id : undefined;

      const result = await this.filterService.searchQuestions({
        filterIds,
        subFilterIds,
        years,
        institutions,
        page,
        limit,
        excludeOutdated,
        excludeAnnulled,
        unansweredFilter,
        userId,
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
   * Suporta filtro de questões não respondidas (unansweredFilter)
   */
  async countQuestionsByFilters(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const params = req.body;
      // Adicionar userId do usuário autenticado para filtro de questões não respondidas
      if (req.user?.id && params.unansweredFilter && params.unansweredFilter !== 'all') {
        params.userId = req.user.id;
      }
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

  /**
   * POST /api/banco-questoes/questions/search
   * Busca unificada - detecta automaticamente se é ID ou texto
   * Suporta paginação com page e limit
   */
  async searchQuestionsUnified(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { query, limit = 20, page = 1 } = req.body;

      if (!query || typeof query !== 'string') {
        res.status(400).json({
          success: false,
          error: 'query é obrigatório e deve ser uma string',
        });
        return;
      }

      const result = await this.filterService.searchQuestionsUnified(query, limit, page);
      res.json({ success: true, data: result });
    } catch (error) {
      logger.error('[PublicFilterController] Erro na busca unificada:', error);
      next(error);
    }
  }

  /**
   * POST /api/banco-questoes/questions/search-by-text
   * Busca questões por texto (full-text search no enunciado)
   * Suporta paginação com page e limit
   * @deprecated Use searchQuestionsUnified instead
   */
  async searchQuestionsByText(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { textQuery, limit = 20, page = 1 } = req.body;

      if (!textQuery || typeof textQuery !== 'string') {
        res.status(400).json({
          success: false,
          error: 'textQuery é obrigatório e deve ser uma string',
        });
        return;
      }

      const result = await this.filterService.searchQuestionsByText(textQuery, limit, page);
      res.json({ success: true, data: result });
    } catch (error) {
      logger.error('[PublicFilterController] Erro ao buscar questões por texto:', error);
      next(error);
    }
  }

  /**
   * POST /api/banco-questoes/questions/search-by-id
   * Busca questões por ID (parcial ou completo)
   * @deprecated Use searchQuestionsUnified instead
   */
  async searchQuestionsById(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { idQuery, limit = 20 } = req.body;

      if (!idQuery || typeof idQuery !== 'string') {
        res.status(400).json({
          success: false,
          error: 'idQuery é obrigatório e deve ser uma string',
        });
        return;
      }

      const result = await this.filterService.searchQuestionsById(idQuery, limit);
      res.json({ success: true, data: result });
    } catch (error) {
      logger.error('[PublicFilterController] Erro ao buscar questões por ID:', error);
      next(error);
    }
  }
}
