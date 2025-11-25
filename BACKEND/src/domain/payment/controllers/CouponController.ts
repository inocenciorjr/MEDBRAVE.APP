import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../auth/middleware/supabaseAuth.middleware';
import { ICouponService } from '../interfaces/ICouponService';
import { CreateCouponPayload } from '../types';
import { AppError, ErrorCodes, ErrorStatusCodes } from '../../../utils/errors';

/**
 * Controlador responsável por gerenciar os cupons de desconto
 */
export class CouponController {
  private couponService: ICouponService;

  /**
   * Construtor do controlador de cupons
   * @param couponService Serviço de cupons
   */
  constructor(couponService: ICouponService) {
    this.couponService = couponService;
  }

  /**
   * Verifica se o usuário é um administrador
   * @param req Objeto de requisição
   * @throws {AppError} Erro se o usuário não for administrador
   */
  private ensureAdmin(req: AuthenticatedRequest): void {
    const role = (req.user?.user_role || '').toUpperCase();
    if (role !== 'ADMIN') {
      throw new AppError(
        ErrorStatusCodes[ErrorCodes.FORBIDDEN],
        'Acesso negado. Apenas administradores podem realizar esta operação.',
        ErrorCodes.FORBIDDEN,
      );
    }
  }

  /**
   * Cria um novo cupom (apenas para administradores)
   * @param req Objeto de requisição
   * @param res Objeto de resposta
   * @param next Função para passar para o próximo middleware
   */
  createCoupon = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      this.ensureAdmin(req);

      const adminId = req.user!.id;
      const {
        code,
        description,
        discountType,
        discountValue,
        expirationDate,
        maxUses,
        isActive,
        applicablePlanIds,
      } = req.body;

      // Validação básica
      if (!code || !discountType || discountValue === undefined) {
        throw new AppError(
          ErrorStatusCodes[ErrorCodes.VALIDATION_ERROR],
          'Código, tipo de desconto e valor são obrigatórios',
          ErrorCodes.VALIDATION_ERROR,
        );
      }

      // Validar tipo de desconto
      if (discountType !== 'percentage' && discountType !== 'fixed_amount') {
        throw new AppError(
          ErrorStatusCodes[ErrorCodes.VALIDATION_ERROR],
          'Tipo de desconto inválido. Valores permitidos: percentage, fixed_amount',
          ErrorCodes.VALIDATION_ERROR,
        );
      }

      // Validar valor do desconto
      if (
        discountType === 'percentage' &&
        (discountValue <= 0 || discountValue > 100)
      ) {
        throw new AppError(
          ErrorStatusCodes[ErrorCodes.VALIDATION_ERROR],
          'Para descontos percentuais, o valor deve ser maior que 0 e menor ou igual a 100',
          ErrorCodes.VALIDATION_ERROR,
        );
      } else if (discountType === 'fixed_amount' && discountValue <= 0) {
        throw new AppError(
          ErrorStatusCodes[ErrorCodes.VALIDATION_ERROR],
          'Para descontos de valor fixo, o valor deve ser maior que 0',
          ErrorCodes.VALIDATION_ERROR,
        );
      }

      const couponData: CreateCouponPayload = {
        code: code.toUpperCase().trim(),
        description,
        discountType,
        discountValue,
        expirationDate: expirationDate ? new Date(expirationDate) : undefined,
        maxUses,
        isActive: isActive !== undefined ? isActive : true,
        applicablePlanIds,
        createdBy: adminId,
      };

      const newCoupon = await this.couponService.createCoupon(couponData);

      res.status(201).json({
        success: true,
        data: newCoupon,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Obtém um cupom pelo ID (apenas para administradores)
   * @param req Objeto de requisição
   * @param res Objeto de resposta
   * @param next Função para passar para o próximo middleware
   */
  getCouponById = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      this.ensureAdmin(req);

      const couponId = req.params.couponId;
      const coupon = await this.couponService.getCouponById(couponId);

      if (!coupon) {
        throw new AppError(
          ErrorStatusCodes[ErrorCodes.NOT_FOUND],
          'Cupom não encontrado',
          ErrorCodes.NOT_FOUND,
        );
      }

      res.status(200).json({
        success: true,
        data: coupon,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Lista todos os cupons (apenas para administradores)
   * @param req Objeto de requisição
   * @param res Objeto de resposta
   * @param next Função para passar para o próximo middleware
   */
  listCoupons = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      this.ensureAdmin(req);

      // Opções de filtro
      const options = {
        isActive: req.query.isActive === 'true',
        createdBy: req.query.createdBy as string,
        applicablePlanId: req.query.applicablePlanId as string,
      };

      const coupons = await this.couponService.getCoupons(options);

      res.status(200).json({
        success: true,
        data: coupons,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Atualiza um cupom existente (apenas para administradores)
   * @param req Objeto de requisição
   * @param res Objeto de resposta
   * @param next Função para passar para o próximo middleware
   */
  updateCoupon = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      this.ensureAdmin(req);

      const couponId = req.params.couponId;
      const updates = req.body;

      // Remover campos que não devem ser atualizados
      delete updates.id;
      delete updates.code;
      delete updates.createdBy;
      delete updates.createdAt;
      delete updates.timesUsed;

      // Validar tipo de desconto se fornecido
      if (
        updates.discountType &&
        updates.discountType !== 'percentage' &&
        updates.discountType !== 'fixed_amount'
      ) {
        throw new AppError(
          ErrorStatusCodes[ErrorCodes.VALIDATION_ERROR],
          'Tipo de desconto inválido. Valores permitidos: percentage, fixed_amount',
          ErrorCodes.VALIDATION_ERROR,
        );
      }

      // Validar valor do desconto se fornecido
      if (updates.discountValue !== undefined) {
        const coupon = await this.couponService.getCouponById(couponId);
        if (!coupon) {
          throw new AppError(
            ErrorStatusCodes[ErrorCodes.NOT_FOUND],
            'Cupom não encontrado',
            ErrorCodes.NOT_FOUND,
          );
        }

        const discountType = updates.discountType || coupon.discountType;

        if (
          discountType === 'percentage' &&
          (updates.discountValue <= 0 || updates.discountValue > 100)
        ) {
          throw new AppError(
            ErrorStatusCodes[ErrorCodes.VALIDATION_ERROR],
            'Para descontos percentuais, o valor deve ser maior que 0 e menor ou igual a 100',
            ErrorCodes.VALIDATION_ERROR,
          );
        } else if (
          discountType === 'fixed_amount' &&
          updates.discountValue <= 0
        ) {
          throw new AppError(
            ErrorStatusCodes[ErrorCodes.VALIDATION_ERROR],
            'Para descontos de valor fixo, o valor deve ser maior que 0',
            ErrorCodes.VALIDATION_ERROR,
          );
        }
      }

      // Converter data de expiração se fornecida
      if (updates.expirationDate) {
        updates.expirationDate = new Date(updates.expirationDate);
      }

      const updatedCoupon = await this.couponService.updateCoupon(
        couponId,
        updates,
      );

      if (!updatedCoupon) {
        throw new AppError(
          ErrorStatusCodes[ErrorCodes.NOT_FOUND],
          'Cupom não encontrado',
          ErrorCodes.NOT_FOUND,
        );
      }

      res.status(200).json({
        success: true,
        data: updatedCoupon,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Remove um cupom (apenas para administradores)
   * @param req Objeto de requisição
   * @param res Objeto de resposta
   * @param next Função para passar para o próximo middleware
   */
  deleteCoupon = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      this.ensureAdmin(req);

      const couponId = req.params.couponId;
      await this.couponService.deleteCoupon(couponId);

      res.status(200).json({
        success: true,
        message: 'Cupom removido com sucesso',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Valida um cupom pelo código (disponível para todos os usuários)
   * @param req Objeto de requisição
   * @param res Objeto de resposta
   * @param next Função para passar para o próximo middleware
   */
  validateCoupon = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { code, planId } = req.body;

      if (!code) {
        throw new AppError(
          ErrorStatusCodes[ErrorCodes.VALIDATION_ERROR],
          'Código do cupom é obrigatório',
          ErrorCodes.VALIDATION_ERROR,
        );
      }

      const result = await this.couponService.validateCoupon(
        code.toUpperCase().trim(),
        planId,
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}
