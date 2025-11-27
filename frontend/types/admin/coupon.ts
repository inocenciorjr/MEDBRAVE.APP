/**
 * Types for Admin Coupon Management
 */

export type DiscountType = 'percentage' | 'fixed_amount';

export interface Coupon {
  id: string;
  code: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  expirationDate?: string;
  maxUses?: number;
  timesUsed: number;
  isActive: boolean;
  applicablePlanIds?: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  // Populated fields
  creator?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface CreateCouponPayload {
  code: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  expirationDate?: string;
  maxUses?: number;
  isActive?: boolean;
  applicablePlanIds?: string[];
}

export interface UpdateCouponPayload extends Partial<Omit<CreateCouponPayload, 'code'>> {}

export interface CouponListOptions {
  isActive?: boolean;
  code?: string;
  createdBy?: string;
  applicablePlanId?: string;
  limit?: number;
  page?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CouponValidationResult {
  valid: boolean;
  coupon?: Coupon;
  errorCode?: string;
  errorMessage?: string;
  discountAmount?: number;
  discountPercentage?: number;
  finalPrice?: number;
}

export interface ValidateCouponPayload {
  code: string;
  planId?: string;
  amount?: number;
}

export interface CouponUsageStats {
  couponId: string;
  code: string;
  totalUses: number;
  maxUses?: number;
  usagePercentage: number;
  totalRevenue: number;
  totalDiscount: number;
  averageDiscount: number;
  usageByPlan: {
    planId: string;
    planName: string;
    uses: number;
  }[];
  usageOverTime: {
    date: string;
    uses: number;
  }[];
}
