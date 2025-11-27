/**
 * Admin User Plan Service
 * Handles all user plan management operations for administrators
 */

import { get, post, put, buildQueryString } from './baseService';
import type {
  UserPlan,
  CreateUserPlanPayload,
  UpdateUserPlanPayload,
  UserPlanListOptions,
  UserPlanListResult,
  RenewUserPlanPayload,
  CancelUserPlanPayload,
  UpdateUserPlanStatusPayload,
  ExpiredPlansCheckResult,
  UserPlanStatus,
} from '@/types/admin/plan';

/**
 * Get all user plans with optional filters
 * @param options Filter options
 * @returns List of user plans with pagination info
 */
export async function getAllUserPlans(options?: UserPlanListOptions): Promise<UserPlanListResult> {
  const queryString = options ? buildQueryString(options) : '';
  const response = await get<{ success: boolean; data: UserPlan[]; meta: any }>(
    `/api/user-plans${queryString}`
  );
  
  return {
    items: response.data,
    total: response.meta?.total || response.data.length,
    limit: response.meta?.limit || options?.limit || 100,
    offset: response.meta?.offset || 0,
  };
}

/**
 * Get user plan by ID
 * @param id User plan ID
 * @returns User plan details
 */
export async function getUserPlanById(id: string): Promise<UserPlan> {
  const response = await get<{ success: boolean; data: UserPlan }>(
    `/api/user-plans/${id}`
  );
  return response.data;
}

/**
 * Get all plans for a specific user
 * @param userId User ID
 * @returns List of user plans
 */
export async function getUserPlansByUserId(userId: string): Promise<UserPlan[]> {
  const response = await get<{ success: boolean; data: UserPlan[] }>(
    `/api/user-plans/user/${userId}`
  );
  return response.data;
}

/**
 * Get active plans for a specific user
 * @param userId User ID
 * @returns List of active user plans
 */
export async function getActiveUserPlans(userId: string): Promise<UserPlan[]> {
  const response = await get<{ success: boolean; data: UserPlan[] }>(
    `/api/user-plans/user/${userId}/active`
  );
  return response.data;
}

/**
 * Create a new user plan (manual assignment)
 * @param data User plan data
 * @returns Created user plan
 */
export async function createUserPlan(data: CreateUserPlanPayload): Promise<UserPlan> {
  const response = await post<{ success: boolean; data: UserPlan }>(
    '/api/user-plans',
    data
  );
  return response.data;
}

/**
 * Update user plan
 * @param id User plan ID
 * @param data Updated data
 * @returns Updated user plan
 */
export async function updateUserPlan(id: string, data: UpdateUserPlanPayload): Promise<UserPlan> {
  const response = await put<{ success: boolean; data: UserPlan }>(
    `/api/user-plans/${id}`,
    data
  );
  return response.data;
}

/**
 * Cancel a user plan
 * @param id User plan ID
 * @param payload Cancellation data
 * @returns Updated user plan
 */
export async function cancelUserPlan(
  id: string,
  payload: CancelUserPlanPayload
): Promise<UserPlan> {
  const response = await post<{ success: boolean; data: UserPlan }>(
    `/api/user-plans/${id}/cancel`,
    payload
  );
  return response.data;
}

/**
 * Renew a user plan
 * @param id User plan ID
 * @param payload Renewal data
 * @returns Updated user plan
 */
export async function renewUserPlan(
  id: string,
  payload: RenewUserPlanPayload
): Promise<UserPlan> {
  const response = await post<{ success: boolean; data: UserPlan }>(
    `/api/user-plans/${id}/renew`,
    payload
  );
  return response.data;
}

/**
 * Update user plan status
 * @param id User plan ID
 * @param payload Status update data
 * @returns Updated user plan
 */
export async function updateUserPlanStatus(
  id: string,
  payload: UpdateUserPlanStatusPayload
): Promise<UserPlan> {
  const response = await put<{ success: boolean; data: UserPlan }>(
    `/api/user-plans/${id}/status`,
    payload
  );
  return response.data;
}

/**
 * Update user plan metadata
 * @param id User plan ID
 * @param metadata New metadata
 * @returns Updated user plan
 */
export async function updateUserPlanMetadata(
  id: string,
  metadata: Record<string, any>
): Promise<UserPlan> {
  const response = await put<{ success: boolean; data: UserPlan }>(
    `/api/user-plans/${id}/metadata`,
    { metadata }
  );
  return response.data;
}

/**
 * Check and expire user plans
 * Runs the expiration check process
 * @returns Result of the check
 */
export async function checkExpiredPlans(): Promise<ExpiredPlansCheckResult> {
  const response = await post<{ success: boolean; data: ExpiredPlansCheckResult }>(
    '/api/user-plans/check-expired'
  );
  return response.data;
}

/**
 * Get user plans statistics
 * @returns Statistics about user plans
 */
export async function getUserPlanStats(): Promise<{
  total: number;
  active: number;
  expired: number;
  cancelled: number;
  trial: number;
  pendingPayment: number;
  suspended: number;
}> {
  const result = await getAllUserPlans();
  
  return {
    total: result.items.length,
    active: result.items.filter(p => p.status === 'ACTIVE').length,
    expired: result.items.filter(p => p.status === 'EXPIRED').length,
    cancelled: result.items.filter(p => p.status === 'CANCELLED').length,
    trial: result.items.filter(p => p.status === 'TRIAL').length,
    pendingPayment: result.items.filter(p => p.status === 'PENDING_PAYMENT').length,
    suspended: result.items.filter(p => p.status === 'SUSPENDED').length,
  };
}

/**
 * Get user plans by status
 * @param status User plan status
 * @returns List of user plans
 */
export async function getUserPlansByStatus(status: UserPlanStatus): Promise<UserPlan[]> {
  const result = await getAllUserPlans({ status });
  return result.items;
}

/**
 * Get expiring soon user plans (< 7 days)
 * @returns List of expiring user plans
 */
export async function getExpiringSoonUserPlans(): Promise<UserPlan[]> {
  const result = await getAllUserPlans({ status: 'ACTIVE' });
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  return result.items.filter(p => {
    const endDate = new Date(p.endDate);
    return endDate > now && endDate <= sevenDaysFromNow;
  });
}

/**
 * Get user plans by plan ID
 * @param planId Plan ID
 * @returns List of user plans
 */
export async function getUserPlansByPlanId(planId: string): Promise<UserPlan[]> {
  const result = await getAllUserPlans({ planId });
  return result.items;
}

/**
 * Search user plans by user email or name
 * @param query Search query
 * @returns List of matching user plans
 */
export async function searchUserPlans(query: string): Promise<UserPlan[]> {
  const result = await getAllUserPlans();
  const lowerQuery = query.toLowerCase();
  
  return result.items.filter(p => 
    p.user?.email?.toLowerCase().includes(lowerQuery) ||
    p.user?.name?.toLowerCase().includes(lowerQuery)
  );
}
