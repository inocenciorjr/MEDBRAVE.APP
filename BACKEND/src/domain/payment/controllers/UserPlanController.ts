import { Response, NextFunction } from 'express';
import { IUserPlanService } from '../interfaces/IUserPlanService';
import { IPlanService } from '../interfaces/IPlanService';
import { CreateUserPlanPayload, UserPlanStatus, PaymentMethod } from '../types';
import { AppError, ErrorCodes, ErrorStatusCodes } from '../../../utils/errors';
import { AuthenticatedRequest } from '../../auth/middleware/supabaseAuth.middleware';

/**
 * Controlador responsável por gerenciar os planos dos usuários
 */
export class UserPlanController {
  private userPlanService: IUserPlanService;
  private planService: IPlanService;

  /**
   * Construtor do controlador de planos de usuário
   * @param userPlanService Serviço de planos de usuário
   * @param planService Serviço de planos
   */
  constructor(userPlanService: IUserPlanService, planService: IPlanService) {
    this.userPlanService = userPlanService;
    this.planService = planService;
  }

  /**
   * Verifica se o usuário é um administrador
   * @param req Objeto de requisição
   * @throws {AppError} Erro se o usuário não for administrador
   */
  private ensureAdmin(req: AuthenticatedRequest): void {
    const role = ((req.user as any)?.role || req.user?.user_role || '').toUpperCase();
    if (role !== 'ADMIN') {
      throw new AppError(
        ErrorStatusCodes[ErrorCodes.FORBIDDEN],
        'Acesso negado. Apenas administradores podem realizar esta operação.',
        ErrorCodes.FORBIDDEN,
      );
    }
  }

  /**
   * Obtém o ID do usuário autenticado
   * @param req Objeto de requisição
   * @returns ID do usuário autenticado
   * @throws {AppError} Erro se o usuário não estiver autenticado
   */
  private getAuthenticatedUserId(req: AuthenticatedRequest): string {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError(
        ErrorStatusCodes[ErrorCodes.UNAUTHORIZED],
        'Usuário não autenticado',
        ErrorCodes.UNAUTHORIZED,
      );
    }
    return userId;
  }

  /**
   * Verifica se o usuário tem permissão para acessar um plano de usuário
   * @param userId ID do usuário
   * @param userPlanUserId ID do usuário dono do plano
   * @param role Role do usuário
   * @throws {AppError} Erro se o usuário não tiver permissão
   */
  private checkUserPlanAccess(
    userId: string,
    userPlanUserId: string,
    role: string,
  ): void {
    if (userId !== userPlanUserId && role !== 'ADMIN') {
      throw new AppError(
        ErrorStatusCodes[ErrorCodes.FORBIDDEN],
        'Você não tem permissão para acessar este plano',
        ErrorCodes.FORBIDDEN,
      );
    }
  }

  /**
   * Cria um novo plano de usuário (apenas para administradores)
   * @param req Objeto de requisição
   * @param res Objeto de resposta
   * @param next Função para passar para o próximo middleware
   */
  createUserPlan = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      this.ensureAdmin(req);

      const {
        userId,
        planId,
        startDate,
        endDate,
        paymentMethod,
        autoRenew,
        metadata,
      } = req.body;

      // Validar se o plano existe
      const plan = await this.planService.getPlanById(planId);
      if (!plan) {
        throw new AppError(
          ErrorStatusCodes[ErrorCodes.NOT_FOUND],
          'Plano não encontrado',
          ErrorCodes.NOT_FOUND,
        );
      }

      const userPlanData: CreateUserPlanPayload = {
        userId,
        planId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status: UserPlanStatus.ACTIVE,
        paymentMethod: paymentMethod || PaymentMethod.ADMIN,
        autoRenew: autoRenew !== undefined ? autoRenew : false,
        metadata,
      };

      const newUserPlan =
        await this.userPlanService.createUserPlan(userPlanData);

      res.status(201).json({
        success: true,
        data: newUserPlan,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Obtém um plano de usuário pelo ID
   * @param req Objeto de requisição
   * @param res Objeto de resposta
   * @param next Função para passar para o próximo middleware
   */
  getUserPlanById = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userPlanId = req.params.userPlanId;
      const userPlan = await this.userPlanService.getUserPlanById(userPlanId);

      if (!userPlan) {
        throw new AppError(
          ErrorStatusCodes[ErrorCodes.NOT_FOUND],
          'Plano de usuário não encontrado',
          ErrorCodes.NOT_FOUND,
        );
      }

      const userId = this.getAuthenticatedUserId(req);
      const role = ((req.user as any)?.role || req.user?.user_role || '').toUpperCase();
      this.checkUserPlanAccess(userId, userPlan.userId, role);

      res.status(200).json({
        success: true,
        data: userPlan,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Lista todos os planos de um usuário
   * @param req Objeto de requisição
   * @param res Objeto de resposta
   * @param next Função para passar para o próximo middleware
   */
  listUserPlans = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      let userId = req.params.userId || (req.query.userId as string);
      const authenticatedUserId = this.getAuthenticatedUserId(req);
      const role = ((req.user as any)?.role || req.user?.user_role || '').toUpperCase();

      if (!userId) {
        userId = authenticatedUserId;
      } else if (userId !== authenticatedUserId && role !== 'ADMIN') {
        throw new AppError(
          ErrorStatusCodes[ErrorCodes.FORBIDDEN],
          'Você não tem permissão para visualizar planos de outros usuários',
          ErrorCodes.FORBIDDEN,
        );
      }

      const userPlans = await this.userPlanService.getUserPlansByUserId(userId);

      res.status(200).json({
        success: true,
        data: userPlans,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Lista planos ativos de um usuário
   * @param req Objeto de requisição
   * @param res Objeto de resposta
   * @param next Função para passar para o próximo middleware
   */
  listActiveUserPlans = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      let userId = req.params.userId || (req.query.userId as string);
      const authenticatedUserId = this.getAuthenticatedUserId(req);
      const role = ((req.user as any)?.role || req.user?.user_role || '').toUpperCase();

      if (!userId) {
        userId = authenticatedUserId;
      } else if (userId !== authenticatedUserId && role !== 'ADMIN') {
        throw new AppError(
          ErrorStatusCodes[ErrorCodes.FORBIDDEN],
          'Você não tem permissão para visualizar planos de outros usuários',
          ErrorCodes.FORBIDDEN,
        );
      }

      const activePlans = await this.userPlanService.getUserActivePlans(userId);

      res.status(200).json({
        success: true,
        data: activePlans,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Lista todos os planos de usuário com paginação e filtros (apenas para administradores)
   * @param req Objeto de requisição
   * @param res Objeto de resposta
   * @param next Função para passar para o próximo middleware
   */
  listAllUserPlans = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      this.ensureAdmin(req);

      const options = {
        userId: req.query.userId as string,
        planId: req.query.planId as string,
        status: req.query.status as UserPlanStatus,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 100,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
      };

      const result = await this.userPlanService.listUserPlans(options);

      const page = result.limit
        ? Math.floor(result.offset / result.limit) + 1
        : 1;
      const totalPages = result.limit
        ? Math.ceil(result.total / result.limit)
        : 1;
      res.status(200).json({
        success: true,
        data: result.items,
        meta: {
          total: result.total,
          page,
          totalPages,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Cancela um plano de usuário
   * @param req Objeto de requisição
   * @param res Objeto de resposta
   * @param next Função para passar para o próximo middleware
   */
  cancelUserPlan = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userPlanId = req.params.userPlanId;
      const { reason } = req.body;

      const userPlan = await this.userPlanService.getUserPlanById(userPlanId);
      if (!userPlan) {
        throw new AppError(
          ErrorStatusCodes[ErrorCodes.NOT_FOUND],
          'Plano de usuário não encontrado',
          ErrorCodes.NOT_FOUND,
        );
      }

      if (userPlan.status === UserPlanStatus.EXPIRED) {
        throw new AppError(
          ErrorStatusCodes[ErrorCodes.VALIDATION_ERROR],
          'Não é possível cancelar um plano já expirado',
          ErrorCodes.VALIDATION_ERROR,
        );
      }

      if (userPlan.status === UserPlanStatus.CANCELLED) {
        throw new AppError(
          ErrorStatusCodes[ErrorCodes.VALIDATION_ERROR],
          'Este plano já está cancelado',
          ErrorCodes.VALIDATION_ERROR,
        );
      }

      const userId = this.getAuthenticatedUserId(req);
      const role = ((req.user as any)?.role || req.user?.user_role || '').toUpperCase();
      this.checkUserPlanAccess(userId, userPlan.userId, role);

      const cancelledPlan = await this.userPlanService.cancelUserPlan(
        userPlanId,
        reason,
      );

      res.status(200).json({
        success: true,
        data: cancelledPlan,
        message: 'Plano cancelado com sucesso',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Renova um plano de usuário (apenas para administradores)
   * @param req Objeto de requisição
   * @param res Objeto de resposta
   * @param next Função para passar para o próximo middleware
   */
  renewUserPlan = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      this.ensureAdmin(req);

      const userPlanId = req.params.userPlanId;
      const { durationDays, paymentId, paymentMethod } = req.body;

      // Verificar se o plano existe
      const userPlan = await this.userPlanService.getUserPlanById(userPlanId);
      if (!userPlan) {
        throw new AppError(
          ErrorStatusCodes[ErrorCodes.NOT_FOUND],
          'Plano de usuário não encontrado',
          ErrorCodes.NOT_FOUND,
        );
      }

      const renewedPlan = await this.userPlanService.renewUserPlan(
        userPlanId,
        durationDays,
        paymentId,
        paymentMethod,
      );

      res.status(200).json({
        success: true,
        data: renewedPlan,
        message: 'Plano renovado com sucesso',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Atualiza o status de um plano de usuário (apenas para administradores)
   * @param req Objeto de requisição
   * @param res Objeto de resposta
   * @param next Função para passar para o próximo middleware
   */
  updateUserPlanStatus = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      this.ensureAdmin(req);

      const userPlanId = req.params.userPlanId;
      const { status, reason } = req.body;

      if (!Object.values(UserPlanStatus).includes(status)) {
        throw new AppError(
          ErrorStatusCodes[ErrorCodes.VALIDATION_ERROR],
          'Status inválido',
          ErrorCodes.VALIDATION_ERROR,
        );
      }

      // Verificar se o plano existe
      const userPlan = await this.userPlanService.getUserPlanById(userPlanId);
      if (!userPlan) {
        throw new AppError(
          ErrorStatusCodes[ErrorCodes.NOT_FOUND],
          'Plano de usuário não encontrado',
          ErrorCodes.NOT_FOUND,
        );
      }

      const updatedPlan = await this.userPlanService.updateUserPlanStatus(
        userPlanId,
        status,
        reason,
      );

      res.status(200).json({
        success: true,
        data: updatedPlan,
        message: 'Status do plano atualizado com sucesso',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Atualiza os metadados de um plano de usuário (apenas para administradores)
   * @param req Objeto de requisição
   * @param res Objeto de resposta
   * @param next Função para passar para o próximo middleware
   */
  updateUserPlanMetadata = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      this.ensureAdmin(req);

      const userPlanId = req.params.userPlanId;
      const { metadata } = req.body;

      if (!metadata || typeof metadata !== 'object') {
        throw new AppError(
          ErrorStatusCodes[ErrorCodes.VALIDATION_ERROR],
          'Metadata inválido',
          ErrorCodes.VALIDATION_ERROR,
        );
      }

      // Verificar se o plano existe
      const userPlan = await this.userPlanService.getUserPlanById(userPlanId);
      if (!userPlan) {
        throw new AppError(
          ErrorStatusCodes[ErrorCodes.NOT_FOUND],
          'Plano de usuário não encontrado',
          ErrorCodes.NOT_FOUND,
        );
      }

      const updatedPlan = await this.userPlanService.updateUserPlanMetadata(
        userPlanId,
        metadata,
      );

      res.status(200).json({
        success: true,
        data: updatedPlan,
        message: 'Metadata do plano atualizado com sucesso',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Atualiza as datas de um plano de usuário (apenas para administradores)
   * @param req Objeto de requisição
   * @param res Objeto de resposta
   * @param next Função para passar para o próximo middleware
   */
  updateUserPlanDates = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      this.ensureAdmin(req);

      const userPlanId = req.params.userPlanId;
      const { startDate, endDate } = req.body;

      if (!startDate || !endDate) {
        throw new AppError(
          ErrorStatusCodes[ErrorCodes.VALIDATION_ERROR],
          'Data de início e término são obrigatórias',
          ErrorCodes.VALIDATION_ERROR,
        );
      }

      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new AppError(
          ErrorStatusCodes[ErrorCodes.VALIDATION_ERROR],
          'Datas inválidas',
          ErrorCodes.VALIDATION_ERROR,
        );
      }

      if (end <= start) {
        throw new AppError(
          ErrorStatusCodes[ErrorCodes.VALIDATION_ERROR],
          'Data de término deve ser posterior à data de início',
          ErrorCodes.VALIDATION_ERROR,
        );
      }

      // Verificar se o plano existe
      const userPlan = await this.userPlanService.getUserPlanById(userPlanId);
      if (!userPlan) {
        throw new AppError(
          ErrorStatusCodes[ErrorCodes.NOT_FOUND],
          'Plano de usuário não encontrado',
          ErrorCodes.NOT_FOUND,
        );
      }

      const updatedPlan = await this.userPlanService.updateUserPlan(
        userPlanId,
        {
          startDate: start,
          endDate: end,
        },
      );

      res.status(200).json({
        success: true,
        data: updatedPlan,
        message: 'Datas do plano atualizadas com sucesso',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Executa a verificação de planos expirados (apenas para administradores ou uso interno)
   * @param req Objeto de requisição
   * @param res Objeto de resposta
   * @param next Função para passar para o próximo middleware
   */
  checkExpiredPlans = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      this.ensureAdmin(req);

      const result = await this.userPlanService.checkAndExpireUserPlans();

      res.status(200).json({
        success: true,
        data: result,
        message: `${result.expiredCount} planos foram atualizados`,
      });
    } catch (error) {
      next(error);
    }
  };
}
