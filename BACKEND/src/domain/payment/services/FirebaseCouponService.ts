import { firestore } from '../../../config/firebaseAdmin';
import {
  Coupon,
  CreateCouponPayload,
  CouponValidationResult,
} from '../types';
import { ICouponService } from '../interfaces/ICouponService';
import logger from '../../../utils/logger';
import { AppError, ErrorCodes, ErrorStatusCodes } from '../../../utils/errors';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * Coleção do Firestore para cupons
 */
const COUPONS_COLLECTION = 'coupons';

/**
 * Implementação do serviço de cupons utilizando Firebase
 */
export class FirebaseCouponService implements ICouponService {
  private couponsCollection: FirebaseFirestore.CollectionReference;

  /**
   * Construtor da classe FirebaseCouponService
   */
  constructor() {
    this.couponsCollection = firestore.collection(COUPONS_COLLECTION);
  }

  /**
   * Cria um novo cupom
   * @param couponData Dados do cupom
   * @returns Cupom criado
   */
  async createCoupon(couponData: CreateCouponPayload): Promise<Coupon> {
    try {
      // Validação básica de dados
      if (!couponData.code) {
        throw new AppError(ErrorStatusCodes[ErrorCodes.VALIDATION_ERROR], 'Código do cupom é obrigatório', ErrorCodes.VALIDATION_ERROR);
      }

      if (!couponData.discountType) {
        throw new AppError(ErrorStatusCodes[ErrorCodes.VALIDATION_ERROR], 'Tipo de desconto é obrigatório', ErrorCodes.VALIDATION_ERROR);
      }

      if (typeof couponData.discountValue !== 'number' || couponData.discountValue <= 0) {
        throw new AppError(
          ErrorStatusCodes[ErrorCodes.VALIDATION_ERROR],
          'Valor do desconto deve ser um número positivo',
          ErrorCodes.VALIDATION_ERROR
        );
      }

      if (
        couponData.discountType === 'percentage' &&
        couponData.discountValue > 100
      ) {
        throw new AppError(
          ErrorStatusCodes[ErrorCodes.VALIDATION_ERROR],
          'Desconto percentual não pode ser maior que 100%',
          ErrorCodes.VALIDATION_ERROR
        );
      }

      // Verificar se já existe um cupom com o mesmo código
      const existingCoupon = await this.getCouponByCode(couponData.code);
      if (existingCoupon) {
        throw new AppError(
          ErrorStatusCodes[ErrorCodes.CONFLICT],
          `Já existe um cupom com o código '${couponData.code}'`,
          ErrorCodes.CONFLICT
        );
      }

      // Criar referência do documento
      const couponRef = this.couponsCollection.doc();
      const now = Timestamp.now();

      // Converter data de expiração para timestamp se presente
      let expirationDate = null;
      if (couponData.expirationDate) {
        expirationDate =
          couponData.expirationDate instanceof Date
            ? Timestamp.fromDate(couponData.expirationDate)
            : couponData.expirationDate;
      }

      // Criar o objeto do cupom
      const newCoupon: Coupon = {
        id: couponRef.id,
        code: couponData.code.toUpperCase(),
        description: couponData.description || null,
        discountType: couponData.discountType,
        discountValue: couponData.discountValue,
        maxUses: couponData.maxUses || null,
        timesUsed: 0,
        isActive: couponData.isActive !== undefined ? couponData.isActive : true,
        expirationDate: expirationDate,
        createdBy: couponData.createdBy || '',
        applicablePlanIds: couponData.applicablePlanIds || [],
        createdAt: now,
        updatedAt: now,
      };

      await couponRef.set(newCoupon);
      logger.info(`Cupom ${newCoupon.code} (ID: ${newCoupon.id}) criado com sucesso.`);
      return newCoupon;
    } catch (error) {
      logger.error(`Erro ao criar cupom: ${error}`);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(ErrorStatusCodes[ErrorCodes.INTERNAL_SERVER_ERROR], `Erro ao criar cupom: ${error}`, ErrorCodes.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Obtém um cupom pelo seu ID
   * @param couponId ID do cupom
   * @returns Cupom encontrado ou null
   */
  async getCouponById(couponId: string): Promise<Coupon | null> {
    try {
      const couponDoc = await this.couponsCollection.doc(couponId).get();

      if (!couponDoc.exists) {
        return null;
      }

      return couponDoc.data() as Coupon;
    } catch (error) {
      logger.error(`Erro ao buscar cupom por ID ${couponId}: ${error}`);
      throw new AppError(ErrorStatusCodes[ErrorCodes.INTERNAL_SERVER_ERROR], `Erro ao buscar cupom: ${error}`, ErrorCodes.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Obtém um cupom pelo seu código
   * @param code Código do cupom
   * @returns Cupom encontrado ou null
   */
  async getCouponByCode(code: string): Promise<Coupon | null> {
    try {
      const normalizedCode = code.toUpperCase();
      const snapshot = await this.couponsCollection
        .where('code', '==', normalizedCode)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      return snapshot.docs[0].data() as Coupon;
    } catch (error) {
      logger.error(`Erro ao buscar cupom pelo código ${code}: ${error}`);
      throw new AppError(ErrorStatusCodes[ErrorCodes.INTERNAL_SERVER_ERROR], `Erro ao buscar cupom por código: ${error}`, ErrorCodes.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Atualiza um cupom existente
   * @param couponId ID do cupom
   * @param updates Dados a serem atualizados
   * @returns Cupom atualizado ou null
   */
  async updateCoupon(couponId: string, updates: Partial<CreateCouponPayload> | Record<string, any>): Promise<Coupon | null> {
    try {
      const couponRef = this.couponsCollection.doc(couponId);
      const couponDoc = await couponRef.get();

      if (!couponDoc.exists) {
        return null;
      }

      // Validações específicas para atualização
      if (
        updates.discountValue !== undefined &&
        (typeof updates.discountValue !== 'number' || updates.discountValue <= 0)
      ) {
        throw new AppError(
          ErrorStatusCodes[ErrorCodes.VALIDATION_ERROR],
          'Valor do desconto deve ser um número positivo',
          ErrorCodes.VALIDATION_ERROR
        );
      }

      if (
        updates.discountType === 'percentage' &&
        updates.discountValue !== undefined &&
        updates.discountValue > 100
      ) {
        throw new AppError(
          ErrorStatusCodes[ErrorCodes.VALIDATION_ERROR],
          'Desconto percentual não pode ser maior que 100%',
          ErrorCodes.VALIDATION_ERROR
        );
      }

      const updateData: Record<string, any> = {
        ...updates,
        updatedAt: Timestamp.now(),
      };

      // Converter data de expiração para timestamp se presente
      if (updates.expirationDate instanceof Date) {
        updateData.expirationDate = Timestamp.fromDate(updates.expirationDate);
      } else if (updates.expirationDate === null) {
        updateData.expirationDate = null;
      }

      await couponRef.update(updateData);

      const updatedCouponDoc = await couponRef.get();
      return updatedCouponDoc.data() as Coupon;
    } catch (error) {
      logger.error(`Erro ao atualizar cupom ${couponId}: ${error}`);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(ErrorStatusCodes[ErrorCodes.INTERNAL_SERVER_ERROR], `Erro ao atualizar cupom: ${error}`, ErrorCodes.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Incrementa o contador de uso de um cupom
   * @param couponId ID do cupom
   * @returns Cupom atualizado ou null
   */
  async incrementCouponUsage(couponId: string): Promise<Coupon> {
    try {
      const couponRef = this.couponsCollection.doc(couponId);

      // Usar transação para garantir atomicidade
      const result = await firestore.runTransaction(async transaction => {
        const couponDoc = await transaction.get(couponRef);

        if (!couponDoc.exists) {
          throw new AppError(ErrorStatusCodes[ErrorCodes.NOT_FOUND], `Cupom (ID: ${couponId}) não encontrado`, ErrorCodes.NOT_FOUND);
        }

        const coupon = couponDoc.data() as Coupon;

        // Verificar se o cupom está ativo
        if (!coupon.isActive) {
          throw new AppError(
            ErrorStatusCodes[ErrorCodes.CONFLICT],
            `Cupom (ID: ${couponId}, Código: ${coupon.code}) está inativo`,
            ErrorCodes.CONFLICT
          );
        }

        // Verificar se o cupom expirou
        if (coupon.expirationDate && coupon.expirationDate.toDate() < new Date()) {
          throw new AppError(
            ErrorStatusCodes[ErrorCodes.CONFLICT],
            `Cupom (ID: ${couponId}, Código: ${coupon.code}) expirou em ${coupon.expirationDate.toDate().toISOString()}`,
            ErrorCodes.CONFLICT
          );
        }

        // Verificar se o cupom atingiu o limite de usos
        if (typeof coupon.maxUses === 'number' && coupon.timesUsed >= coupon.maxUses) {
          throw new AppError(
            ErrorStatusCodes[ErrorCodes.CONFLICT],
            `Cupom (ID: ${couponId}, Código: ${coupon.code}) atingiu o limite de ${coupon.maxUses} usos`,
            ErrorCodes.CONFLICT
          );
        }

        // Incrementar o contador de uso
        const newTimesUsed = coupon.timesUsed + 1;
        transaction.update(couponRef, {
          timesUsed: newTimesUsed,
          updatedAt: Timestamp.now(),
        });

        // Se atingiu o limite de usos, desativar o cupom
        if (typeof coupon.maxUses === 'number' && newTimesUsed >= coupon.maxUses) {
          transaction.update(couponRef, { isActive: false });
        }

        return {
          ...coupon,
          timesUsed: newTimesUsed,
        };
      });

      logger.info(`Uso do cupom (ID: ${couponId}) incrementado com sucesso.`);
      return result as Coupon;
    } catch (error) {
      logger.error(`Erro ao incrementar uso do cupom ${couponId}: ${error}`);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(ErrorStatusCodes[ErrorCodes.INTERNAL_SERVER_ERROR], `Erro ao incrementar uso do cupom: ${error}`, ErrorCodes.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Valida um cupom para uso
   * @param code Código do cupom
   * @param planId ID do plano (opcional)
   * @param orderValue Valor do pedido (opcional)
   * @returns Resultado da validação
   */
  async validateCoupon(
    code: string,
    planId?: string,
    orderValue?: number,
  ): Promise<CouponValidationResult> {
    try {
      const coupon = await this.getCouponByCode(code);

      if (!coupon) {
        return {
          valid: false,
          errorMessage: `Cupom com código '${code}' não encontrado`,
        };
      }

      if (!coupon.isActive) {
        return {
          valid: false,
          errorMessage: 'Cupom está inativo',
        };
      }

      if (coupon.expirationDate && coupon.expirationDate.toDate() < new Date()) {
        return {
          valid: false,
          errorMessage: `Cupom expirou em ${coupon.expirationDate.toDate().toISOString()}`,
        };
      }

      if (typeof coupon.maxUses === 'number' && coupon.timesUsed >= coupon.maxUses) {
        return {
          valid: false,
          errorMessage: `Cupom atingiu o limite de ${coupon.maxUses} usos`,
        };
      }

      if (planId && coupon.applicablePlanIds && coupon.applicablePlanIds.length > 0) {
        if (!coupon.applicablePlanIds.includes(planId)) {
          return {
            valid: false,
            errorMessage: 'Cupom não é aplicável ao plano selecionado',
          };
        }
      }

      if (orderValue !== undefined && coupon.discountValue && orderValue < coupon.discountValue) {
        return {
          valid: false,
          errorMessage: `Cupom só é válido para compras acima de ${coupon.discountValue}`,
        };
      }

      return { valid: true, coupon };
    } catch (error) {
      logger.error(`Erro ao validar cupom com código '${code}': ${error}`);
      throw new AppError(ErrorStatusCodes[ErrorCodes.INTERNAL_SERVER_ERROR], `Erro ao validar cupom: ${error}`, ErrorCodes.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Calcula o valor do desconto para um determinado valor e cupom
   * @param originalAmount Valor original
   * @param coupon Cupom a ser aplicado
   * @returns Valor do desconto e valor final
   */
  calculateDiscount(
    originalAmount: number,
    coupon: Coupon,
  ): { discountAmount: number; finalAmount: number } {
    let discountAmount = 0;

    if (coupon.discountType === 'percentage') {
      // Desconto percentual
      discountAmount = (originalAmount * coupon.discountValue) / 100;
    } else {
      // Desconto de valor fixo
      discountAmount = coupon.discountValue;
    }

    // Limitar desconto ao valor máximo de desconto (se especificado)
    if (coupon.discountValue !== null && discountAmount > coupon.discountValue) {
      discountAmount = coupon.discountValue;
    }

    // Garantir que o desconto não seja maior que o valor original
    discountAmount = Math.min(discountAmount, originalAmount);

    // Arredondar para 2 casas decimais
    discountAmount = Math.round(discountAmount * 100) / 100;

    const finalAmount = originalAmount - discountAmount;

    return { discountAmount, finalAmount };
  }

  /**
   * Obtém cupons ativos
   * @returns Lista de cupons ativos
   */
  async getActiveCoupons(): Promise<Coupon[]> {
    try {
      const snapshot = await this.couponsCollection.where('isActive', '==', true).get();

      return snapshot.docs.map(doc => doc.data() as Coupon);
    } catch (error) {
      logger.error(`Erro ao buscar cupons ativos: ${error}`);
      throw new AppError(ErrorStatusCodes[ErrorCodes.INTERNAL_SERVER_ERROR], `Erro ao buscar cupons ativos: ${error}`, ErrorCodes.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Obtém todos os cupons com opções de filtro
   * @param options Opções de filtragem
   * @returns Lista de cupons filtrados
   */
  async getCoupons(
    options: {
      isActive?: boolean;
      createdBy?: string;
      applicablePlanId?: string;
    } = {},
  ): Promise<Coupon[]> {
    try {
      let query: FirebaseFirestore.Query = this.couponsCollection;

      if (options.isActive !== undefined) {
        query = query.where('isActive', '==', options.isActive);
      }

      if (options.createdBy) {
        query = query.where('createdBy', '==', options.createdBy);
      }

      const snapshot = await query.get();

      let coupons = snapshot.docs.map(doc => doc.data() as Coupon);

      // Filtrar por plano aplicável em memória (pois não é possível fazer isso diretamente no Firestore)
      if (options.applicablePlanId) {
        coupons = coupons.filter(
          coupon =>
            coupon.applicablePlanIds &&
            coupon.applicablePlanIds.includes(options.applicablePlanId!),
        );
      }

      return coupons;
    } catch (error) {
      logger.error(`Erro ao buscar cupons com filtros: ${error}`);
      throw new AppError(ErrorStatusCodes[ErrorCodes.INTERNAL_SERVER_ERROR], `Erro ao buscar cupons: ${error}`, ErrorCodes.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Exclui um cupom
   * @param couponId ID do cupom
   */
  async deleteCoupon(couponId: string): Promise<boolean> {
    try {
      const couponRef = this.couponsCollection.doc(couponId);
      const couponDoc = await couponRef.get();

      if (!couponDoc.exists) {
        logger.warn(`Cupom (ID: ${couponId}) não encontrado para exclusão.`);
        return false;
      }

      await couponRef.delete();
      logger.info(`Cupom (ID: ${couponId}) excluído com sucesso.`);
      return true;
    } catch (error) {
      logger.error(`Erro ao excluir cupom ${couponId}: ${error}`);
      throw new AppError(ErrorStatusCodes[ErrorCodes.INTERNAL_SERVER_ERROR], `Erro ao excluir cupom: ${error}`, ErrorCodes.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Implementação do método calculateDiscountAmount
   * @param couponId ID do cupom
   * @param originalAmount Valor original
   * @returns Objeto com o valor final, desconto e porcentagem do desconto
   */
  async calculateDiscountAmount(
    couponId: string,
    originalAmount: number,
  ): Promise<{ finalAmount: number; discountAmount: number; discountPercentage: number }> {
    const coupon = await this.getCouponById(couponId);
    if (!coupon) {
      throw new AppError(ErrorStatusCodes[ErrorCodes.NOT_FOUND], `Cupom (ID: ${couponId}) não encontrado`, ErrorCodes.NOT_FOUND);
    }
    let discountAmount = 0;
    let discountPercentage = 0;
    if (coupon.discountType === 'percentage') {
      discountAmount = (originalAmount * coupon.discountValue) / 100;
      discountPercentage = coupon.discountValue;
    } else {
      discountAmount = coupon.discountValue;
      discountPercentage = (discountAmount / originalAmount) * 100;
    }
    discountAmount = Math.min(discountAmount, originalAmount);
    discountAmount = Math.round(discountAmount * 100) / 100;
    const finalAmount = originalAmount - discountAmount;
    return { finalAmount, discountAmount, discountPercentage };
  }
}
