import { SupabaseClient } from '@supabase/supabase-js';
import { ICouponService } from '../../../domain/payment/interfaces/ICouponService';
import {
  Coupon,
  CreateCouponPayload,
  CouponValidationResult,
  CouponListOptions,
} from '../../../domain/payment/types';

export class SupabaseCouponService implements ICouponService {
  constructor(private supabase: SupabaseClient) {}

  async create(payload: CreateCouponPayload): Promise<Coupon> {
    const couponData = {
      code: payload.code,
      description: payload.description || null,
      discount_type: payload.discountType,
      discount_value: payload.discountValue,
      expiration_date: payload.expirationDate || null,
      max_uses: payload.maxUses || null,
      times_used: 0,
      is_active: payload.isActive ?? true,
      applicable_plan_ids: payload.applicablePlanIds || null,
      created_by: payload.createdBy,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const { data, error } = await this.supabase
      .from('coupons')
      .insert(couponData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create coupon: ${error.message}`);
    }

    return this.mapToEntity(data);
  }

  async getById(id: string): Promise<Coupon | null> {
    const { data, error } = await this.supabase
      .from('coupons')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to get coupon: ${error.message}`);
    }

    return this.mapToEntity(data);
  }

  async getByCode(code: string): Promise<Coupon | null> {
    const { data, error } = await this.supabase
      .from('coupons')
      .select('*')
      .eq('code', code)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to get coupon by code: ${error.message}`);
    }

    return this.mapToEntity(data);
  }

  async update(id: string, updates: Partial<Coupon>): Promise<Coupon> {
    const updateData = {
      ...updates,
      updated_at: new Date(),
    };

    // Remove fields that shouldn't be updated directly
    delete updateData.id;
    delete updateData.createdAt;

    const { data, error } = await this.supabase
      .from('coupons')
      .update(this.mapToDatabase(updateData))
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update coupon: ${error.message}`);
    }

    return this.mapToEntity(data);
  }

  async incrementUsage(id: string): Promise<void> {
    const { error } = await this.supabase.rpc('increment_coupon_usage', {
      coupon_id: id,
    });

    if (error) {
      throw new Error(`Failed to increment coupon usage: ${error.message}`);
    }
  }

  async validate(
    code: string,
    planId: string,
    amount: number,
  ): Promise<CouponValidationResult> {
    try {
      const coupon = await this.getByCode(code);

      if (!coupon) {
        return {
          valid: false,
          errorCode: 'COUPON_NOT_FOUND',
          errorMessage: 'Cupom não encontrado',
        };
      }

      if (!coupon.isActive) {
        return {
          valid: false,
          errorCode: 'COUPON_INACTIVE',
          errorMessage: 'Cupom inativo',
        };
      }

      if (coupon.expirationDate && new Date() > coupon.expirationDate) {
        return {
          valid: false,
          errorCode: 'COUPON_EXPIRED',
          errorMessage: 'Cupom expirado',
        };
      }

      if (coupon.maxUses && coupon.timesUsed >= coupon.maxUses) {
        return {
          valid: false,
          errorCode: 'COUPON_MAX_USES_REACHED',
          errorMessage: 'Cupom atingiu o limite de uso',
        };
      }

      if (
        coupon.applicablePlanIds &&
        !coupon.applicablePlanIds.includes(planId)
      ) {
        return {
          valid: false,
          errorCode: 'COUPON_NOT_APPLICABLE',
          errorMessage: 'Cupom não aplicável a este plano',
        };
      }

      const { discountAmount, finalPrice } = this.calculateDiscount(
        coupon,
        amount,
      );

      return {
        valid: true,
        coupon,
        discountAmount,
        discountPercentage:
          coupon.discountType === 'percentage'
            ? coupon.discountValue
            : undefined,
        finalPrice,
      };
    } catch (error) {
      return {
        valid: false,
        errorCode: 'VALIDATION_ERROR',
        errorMessage: 'Erro ao validar cupom',
      };
    }
  }

  calculateDiscount(
    coupon: Coupon,
    amount: number,
  ): { discountAmount: number; finalPrice: number } {
    let discountAmount = 0;

    if (coupon.discountType === 'percentage') {
      discountAmount = (amount * coupon.discountValue) / 100;
    } else {
      discountAmount = coupon.discountValue;
    }

    // Ensure discount doesn't exceed the original amount
    discountAmount = Math.min(discountAmount, amount);
    const finalPrice = Math.max(0, amount - discountAmount);

    return { discountAmount, finalPrice };
  }

  async getActiveCoupons(options?: CouponListOptions): Promise<Coupon[]> {
    let query = this.supabase.from('coupons').select('*').eq('is_active', true);

    if (options?.code) {
      query = query.ilike('code', `%${options.code}%`);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(
        options.offset,
        options.offset + (options.limit || 10) - 1,
      );
    }

    if (options?.sortBy) {
      const order = options.sortOrder || 'asc';
      query = query.order(options.sortBy, { ascending: order === 'asc' });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get active coupons: ${error.message}`);
    }

    return data.map((item) => this.mapToEntity(item));
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase.from('coupons').delete().eq('id', id);

    if (error) {
      throw new Error(`Failed to delete coupon: ${error.message}`);
    }
  }

  private mapToEntity(data: any): Coupon {
    return {
      id: data.id,
      code: data.code,
      description: data.description,
      discountType: data.discount_type,
      discountValue: data.discount_value,
      expirationDate: data.expiration_date
        ? new Date(data.expiration_date)
        : null,
      maxUses: data.max_uses,
      timesUsed: data.times_used,
      isActive: data.is_active,
      applicablePlanIds: data.applicable_plan_ids,
      createdBy: data.created_by,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  private mapToDatabase(entity: Partial<Coupon>): any {
    const data: any = {};

    if (entity.code !== undefined) {
data.code = entity.code;
}
    if (entity.description !== undefined) {
data.description = entity.description;
}
    if (entity.discountType !== undefined) {
      data.discount_type = entity.discountType;
    }
    if (entity.discountValue !== undefined) {
      data.discount_value = entity.discountValue;
    }
    if (entity.expirationDate !== undefined) {
      data.expiration_date = entity.expirationDate;
    }
    if (entity.maxUses !== undefined) {
      data.max_uses = entity.maxUses;
    }
    if (entity.timesUsed !== undefined) {
      data.times_used = entity.timesUsed;
    }
    if (entity.isActive !== undefined) {
      data.is_active = entity.isActive;
    }
    if (entity.applicablePlanIds !== undefined) {
      data.applicable_plan_ids = entity.applicablePlanIds;
    }
    if (entity.createdBy !== undefined) {
      data.created_by = entity.createdBy;
    }
    if (entity.updatedAt !== undefined) {
      data.updated_at = entity.updatedAt;
    }

    return data;
  }
  
  async createCoupon(data: CreateCouponPayload): Promise<Coupon> {
    return this.create(data);
  }

  async getCouponById(couponId: string): Promise<Coupon | null> {
    return this.getById(couponId);
  }

  async getCouponByCode(code: string): Promise<Coupon | null> {
    return this.getByCode(code);
  }

  async getCoupons(options: CouponListOptions): Promise<Coupon[]> {
    return this.getActiveCoupons(options);
  }

  async updateCoupon(couponId: string, updates: Partial<Coupon>): Promise<Coupon | null> {
    const updated = await this.update(couponId, updates);
    return updated || null;
  }

  async deleteCoupon(couponId: string): Promise<boolean> {
    await this.delete(couponId);
    return true;
  }

  async validateCoupon(code: string, planId?: string): Promise<CouponValidationResult> {
    return this.validate(code, planId || '', 0);
  }

  async incrementCouponUsage(couponId: string): Promise<Coupon> {
    await this.incrementUsage(couponId);
    const updated = await this.getById(couponId);
    if (!updated) throw new Error('Cupom não encontrado após incremento');
    return updated;
  }

  async calculateDiscountAmount(couponId: string, originalAmount: number): Promise<{ finalAmount: number; discountAmount: number; discountPercentage: number; }> {
    const coupon = await this.getById(couponId);
    if (!coupon) throw new Error('Cupom não encontrado');
    const { discountAmount, finalPrice } = this.calculateDiscount(coupon, originalAmount);
    return {
      finalAmount: finalPrice,
      discountAmount,
      discountPercentage: coupon.discountType === 'percentage' ? coupon.discountValue : 0,
    };
  }
}
