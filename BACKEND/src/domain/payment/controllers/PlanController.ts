import { Request, Response, NextFunction } from 'express';
import { IPlanService } from '../interfaces/IPlanService';
import { CreatePlanPayload, PlanInterval } from '../types';
import { AppError, ErrorCodes } from '../../../utils/errors';

/**
 * Controlador responsável por gerenciar os planos do sistema
 */
export class PlanController {
  private planService: IPlanService;

  /**
   * Construtor do controlador de planos
   * @param planService Serviço de planos
   */
  constructor(planService: IPlanService) {
    this.planService = planService;
  }

  /**
   * Verifica se o usuário é um administrador
   * @param req Objeto de requisição
   * @throws {AppError} Erro se o usuário não for administrador
   */
  private ensureAdmin(req: Request): void {
    const role = (req.user?.role || req.user?.user_role || '').toUpperCase();
    if (role !== 'ADMIN') {
      throw new AppError(
        403,
        'Acesso negado. Apenas administradores podem acessar este recurso.',
        ErrorCodes.FORBIDDEN,
      );
    }
  }

  /**
   * Cria um novo plano
   * @param req Objeto de requisição
   * @param res Objeto de resposta
   * @param next Função para passar para o próximo middleware
   */
  createPlan = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      this.ensureAdmin(req);

      const planData: CreatePlanPayload = {
        name: req.body.name,
        description: req.body.description,
        price: req.body.price,
        currency: req.body.currency || 'BRL',
        durationDays: req.body.durationDays,
        isActive: req.body.isActive !== undefined ? req.body.isActive : true,
        isPublic: req.body.isPublic !== undefined ? req.body.isPublic : true,
        features: req.body.features || [],
        interval: req.body.interval || PlanInterval.MONTHLY,
        metadata: req.body.metadata,
      };

      const newPlan = await this.planService.createPlan(
        planData,
        req.body.planId,
      );

      res.status(201).json({
        success: true,
        data: newPlan,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Obtém um plano pelo ID
   * @param req Objeto de requisição
   * @param res Objeto de resposta
   * @param next Função para passar para o próximo middleware
   */
  getPlanById = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const planId = req.params.planId;
      const plan = await this.planService.getPlanById(planId);

      if (!plan) {
        throw new AppError(404, 'Plano não encontrado');
      }

      // Se o plano não for público, apenas administradores podem vê-lo
      if (!plan.isPublic) {
        const role = (req.user?.role || req.user?.user_role || '').toUpperCase();
        if (role !== 'ADMIN') {
          throw new AppError(
            403,
            'Acesso negado a este plano',
            ErrorCodes.FORBIDDEN,
          );
        }
      }

      res.status(200).json({
        success: true,
        data: plan,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Lista todos os planos disponíveis para usuários comuns
   * @param req Objeto de requisição
   * @param res Objeto de resposta
   * @param next Função para passar para o próximo middleware
   */
  listPublicPlans = async (
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const plans = await this.planService.getActivePublicPlans();

      res.status(200).json({
        success: true,
        data: plans,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Lista todos os planos (apenas para administradores)
   * @param req Objeto de requisição
   * @param res Objeto de resposta
   * @param next Função para passar para o próximo middleware
   */
  listAllPlans = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      console.log('[PlanController] listAllPlans called');
      console.log('[PlanController] User:', req.user);
      console.log('[PlanController] Query params:', req.query);
      
      this.ensureAdmin(req);

      // Opções de filtro
      const options: any = {
        limit: req.query.limit ? parseInt(req.query.limit as string) : 100,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
      };

      // Apenas adicionar filtros se forem explicitamente passados
      if (req.query.isActive !== undefined) {
        options.isActive = req.query.isActive === 'true';
      }
      
      if (req.query.isPublic !== undefined) {
        options.isPublic = req.query.isPublic === 'true';
      }

      console.log('[PlanController] Options:', options);

      const result = await this.planService.listPlans(options);
      
      console.log('[PlanController] Result:', { total: result.total, items: result.items.length });

      res.status(200).json({
        success: true,
        data: result.items,
        meta: {
          total: result.total,
          limit: result.limit,
          offset: result.offset,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Atualiza um plano existente (apenas para administradores)
   * @param req Objeto de requisição
   * @param res Objeto de resposta
   * @param next Função para passar para o próximo middleware
   */
  updatePlan = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      this.ensureAdmin(req);

      const planId = req.params.planId;
      const updates = req.body;

      // Remover campos que não devem ser atualizados
      delete updates.id;
      delete updates.createdAt;
      delete updates.updatedAt;

      const updatedPlan = await this.planService.updatePlan(planId, updates);

      if (!updatedPlan) {
        throw new AppError(404, 'Plano não encontrado');
      }

      res.status(200).json({
        success: true,
        data: updatedPlan,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Remove um plano (apenas para administradores)
   * @param req Objeto de requisição
   * @param res Objeto de resposta
   * @param next Função para passar para o próximo middleware
   */
  deletePlan = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      this.ensureAdmin(req as any);

      const planId = req.params.planId;
      await this.planService.deletePlan(planId);

      res.status(200).json({
        success: true,
        message: 'Plano removido com sucesso',
      });
    } catch (error) {
      next(error);
    }
  };
}
