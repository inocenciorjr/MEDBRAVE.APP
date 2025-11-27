/**
 * Admin Coupon Service
 * Handles all coupon management operations for administrators
 */

import { get, post, put, del, buildQueryString } from './baseService';
import type {
  Coupon,
  CreateCouponPayload,
  UpdateCouponPayload,
  CouponListOptions,
  CouponValidationResult,
  ValidateCouponPayload,
  CouponUsageStats,
} from '@/types/admin/coupon';

/**
 * Get all coupons with optional filters
 * @param options Filter options
 * @returns List of coupons
 */
export async function getAllCoupons(options?: CouponListOptions): Promise<Coupon[]> {
  const queryString = options ? buildQueryString(options) : '';
  const response = await get<{ success: boolean; data: Coupon[] }>(
    `/api/coupons${queryString}`
  );
  return response.data;
}

/**
 * Get coupon by ID
 * @param id Coupon ID
 * @returns Coupon details
 */
export async function getCouponById(id: string): Promise<Coupon> {
  const response = await get<{ success: boolean; data: Coupon }>(
    `/api/coupons/${id}`
  );
  return response.data;
}

/**
 * Get coupon by code
 * @param code Coupon code
 * @returns Coupon details
 */
export async function getCouponByCode(code: string): Promise<Coupon> {
  const coupons = await getAllCoupons({ code });
  if (coupons.length === 0) {
    throw new Error('Cupom não encontrado');
  }
  return coupons[0];
}

/**
 * Create a new coupon
 * @param data Coupon data
 * @returns Created coupon
 */
export async function createCoupon(data: CreateCouponPayload): Promise<Coupon> {
  const response = await post<{ success: boolean; data: Coupon }>(
    '/api/coupons',
    data
  );
  return response.data;
}

/**
 * Update an existing coupon
 * @param id Coupon ID
 * @param data Updated coupon data
 * @returns Updated coupon
 */
export async function updateCoupon(id: string, data: UpdateCouponPayload): Promise<Coupon> {
  const response = await put<{ success: boolean; data: Coupon }>(
    `/api/coupons/${id}`,
    data
  );
  return response.data;
}

/**
 * Delete a coupon
 * @param id Coupon ID
 */
export async function deleteCoupon(id: string): Promise<void> {
  await del<{ success: boolean; message: string }>(`/api/coupons/${id}`);
}

/**
 * Toggle coupon status (active/inactive)
 * @param id Coupon ID
 * @param isActive New status
 * @returns Updated coupon
 */
export async function toggleCouponStatus(id: string, isActive: boolean): Promise<Coupon> {
  return updateCoupon(id, { isActive });
}

/**
 * Validate a coupon
 * @param payload Validation data
 * @returns Validation result
 */
export async function validateCoupon(payload: ValidateCouponPayload): Promise<CouponValidationResult> {
  const response = await post<{ success: boolean; data: CouponValidationResult }>(
    '/api/coupons/validate',
    payload
  );
  return response.data;
}

/**
 * Get coupon usage statistics
 * Note: This might need to be implemented in the backend
 * For now, returns basic stats from the coupon data
 * @param id Coupon ID
 * @returns Usage statistics
 */
export async function getCouponUsageStats(id: string): Promise<CouponUsageStats> {
  const coupon = await getCouponById(id);
  
  // Basic stats from coupon data
  // In a real implementation, this would fetch detailed stats from backend
  const usagePercentage = coupon.maxUses 
    ? (coupon.timesUsed / coupon.maxUses) * 100 
    : 0;
  
  return {
    couponId: coupon.id,
    code: coupon.code,
    totalUses: coupon.timesUsed,
    maxUses: coupon.maxUses,
    usagePercentage,
    totalRevenue: 0, // Would come from backend
    totalDiscount: 0, // Would come from backend
    averageDiscount: 0, // Would come from backend
    usageByPlan: [], // Would come from backend
    usageOverTime: [], // Would come from backend
  };
}

/**
 * Get coupons statistics
 * @returns Statistics about coupons
 */
export async function getCouponStats(): Promise<{
  total: number;
  active: number;
  inactive: number;
  expired: number;
  fullyUsed: number;
}> {
  const coupons = await getAllCoupons();
  const now = new Date();
  
  return {
    total: coupons.length,
    active: coupons.filter(c => c.isActive).length,
    inactive: coupons.filter(c => !c.isActive).length,
    expired: coupons.filter(c => 
      c.expirationDate && new Date(c.expirationDate) < now
    ).length,
    fullyUsed: coupons.filter(c => 
      c.maxUses && c.timesUsed >= c.maxUses
    ).length,
  };
}

/**
 * Get active coupons
 * @returns List of active coupons
 */
export async function getActiveCoupons(): Promise<Coupon[]> {
  return getAllCoupons({ isActive: true });
}

/**
 * Get expired coupons
 * @returns List of expired coupons
 */
export async function getExpiredCoupons(): Promise<Coupon[]> {
  const coupons = await getAllCoupons();
  const now = new Date();
  
  return coupons.filter(c => 
    c.expirationDate && new Date(c.expirationDate) < now
  );
}

/**
 * Get coupons by discount type
 * @param discountType Discount type
 * @returns List of coupons
 */
export async function getCouponsByDiscountType(
  discountType: 'percentage' | 'fixed_amount'
): Promise<Coupon[]> {
  const coupons = await getAllCoupons();
  return coupons.filter(c => c.discountType === discountType);
}

/**
 * Get coupons applicable to a specific plan
 * @param planId Plan ID
 * @returns List of applicable coupons
 */
export async function getCouponsForPlan(planId: string): Promise<Coupon[]> {
  const coupons = await getAllCoupons();
  
  return coupons.filter(c => 
    !c.applicablePlanIds || 
    c.applicablePlanIds.length === 0 || 
    c.applicablePlanIds.includes(planId)
  );
}

/**
 * Search coupons by code
 * @param query Search query
 * @returns List of matching coupons
 */
export async function searchCoupons(query: string): Promise<Coupon[]> {
  const coupons = await getAllCoupons();
  const lowerQuery = query.toLowerCase();
  
  return coupons.filter(c => 
    c.code.toLowerCase().includes(lowerQuery) ||
    c.description?.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Check if coupon is valid
 * @param coupon Coupon to check
 * @returns True if valid
 */
export function isCouponValid(coupon: Coupon): boolean {
  if (!coupon.isActive) return false;
  
  if (coupon.expirationDate) {
    const now = new Date();
    const expirationDate = new Date(coupon.expirationDate);
    if (now > expirationDate) return false;
  }
  
  if (coupon.maxUses && coupon.timesUsed >= coupon.maxUses) {
    return false;
  }
  
  return true;
}

/**
 * Calculate discount amount
 * @param coupon Coupon
 * @param amount Original amount
 * @returns Discount amount and final price
 */
export function calculateDiscount(
  coupon: Coupon,
  amount: number
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
