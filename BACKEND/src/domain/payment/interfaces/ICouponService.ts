import { CreateCouponPayload, Coupon, CouponListOptions, CouponValidationResult } from '../types';

/**
 * Interface para o serviço de cupons
 */
export interface ICouponService {
  /**
   * Cria um novo cupom
   * @param data Dados do cupom
   * @returns Cupom criado
   */
  createCoupon(data: CreateCouponPayload): Promise<Coupon>;

  /**
   * Obtém um cupom pelo ID
   * @param couponId ID do cupom
   * @returns Cupom encontrado ou null
   */
  getCouponById(couponId: string): Promise<Coupon | null>;

  /**
   * Obtém um cupom pelo código
   * @param code Código do cupom
   * @returns Cupom encontrado ou null
   */
  getCouponByCode(code: string): Promise<Coupon | null>;

  /**
   * Lista cupons com base nos filtros
   * @param options Opções de filtro
   * @returns Lista de cupons
   */
  getCoupons(options: CouponListOptions): Promise<Coupon[]>;

  /**
   * Atualiza um cupom
   * @param couponId ID do cupom
   * @param updates Atualizações a serem aplicadas
   * @returns Cupom atualizado ou null se não encontrado
   */
  updateCoupon(couponId: string, updates: Partial<Coupon>): Promise<Coupon | null>;

  /**
   * Remove um cupom
   * @param couponId ID do cupom
   * @returns true se removido com sucesso, false caso contrário
   */
  deleteCoupon(couponId: string): Promise<boolean>;

  /**
   * Valida um cupom
   * @param code Código do cupom
   * @param planId ID do plano (opcional)
   * @returns Resultado da validação
   */
  validateCoupon(code: string, planId?: string): Promise<CouponValidationResult>;

  /**
   * Incrementa o contador de usos de um cupom
   * @param couponId ID do cupom
   * @returns Cupom atualizado
   */
  incrementCouponUsage(couponId: string): Promise<Coupon>;

  /**
   * Calcula o valor do desconto com base no cupom
   * @param couponId ID do cupom
   * @param originalAmount Valor original
   * @returns Valor descontado e informações do desconto
   */
  calculateDiscountAmount(
    couponId: string,
    originalAmount: number,
  ): Promise<{
    finalAmount: number;
    discountAmount: number;
    discountPercentage: number;
  }>;
}
