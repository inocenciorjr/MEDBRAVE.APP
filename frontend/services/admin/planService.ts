/**
 * Admin Plan Service
 * Handles all plan management operations for administrators
 */

import { get, post, put, del, buildQueryString } from './baseService';
import type {
  Plan,
  CreatePlanPayload,
  UpdatePlanPayload,
  PlanListOptions,
  PlanListResult,
} from '@/types/admin/plan';

/**
 * Get all plans with optional filters
 * @param options Filter options
 * @returns List of plans with pagination info
 */
export async function getAllPlans(options?: PlanListOptions): Promise<PlanListResult> {
  const queryString = options ? buildQueryString(options) : '';
  const response = await get<{ success: boolean; data: Plan[]; meta: any }>(
    `/plans${queryString}`
  );
  
  return {
    items: response.data,
    total: response.meta?.total || response.data.length,
    limit: response.meta?.limit || options?.limit || 100,
    offset: response.meta?.offset || 0,
  };
}

/**
 * Get public active plans (for reference)
 * @returns List of public plans
 */
export async function getPublicPlans(): Promise<Plan[]> {
  const response = await get<{ success: boolean; data: Plan[] }>(
    '/plans/public'
  );
  return response.data;
}

/**
 * Get plan by ID
 * @param id Plan ID
 * @returns Plan details
 */
export async function getPlanById(id: string): Promise<Plan> {
  const response = await get<{ success: boolean; data: Plan }>(
    `/plans/${id}`
  );
  return response.data;
}

/**
 * Create a new plan
 * @param data Plan data
 * @returns Created plan
 */
export async function createPlan(data: CreatePlanPayload): Promise<Plan> {
  const response = await post<{ success: boolean; data: Plan }>(
    '/plans',
    data
  );
  return response.data;
}

/**
 * Update an existing plan
 * @param id Plan ID
 * @param data Updated plan data
 * @returns Updated plan
 */
export async function updatePlan(id: string, data: UpdatePlanPayload): Promise<Plan> {
  const response = await put<{ success: boolean; data: Plan }>(
    `/plans/${id}`,
    data
  );
  
  // Limpar cache de planos após atualização
  try {
    await post('/admin/cache/clear-all-plans', {});
    console.log('✅ Cache de planos limpo após atualização');
  } catch (error) {
    console.warn('⚠️ Erro ao limpar cache de planos:', error);
  }
  
  return response.data;
}

/**
 * Delete a plan
 * @param id Plan ID
 */
export async function deletePlan(id: string): Promise<void> {
  await del<{ success: boolean; message: string }>(`/plans/${id}`);
}

/**
 * Toggle plan status (active/inactive)
 * @param id Plan ID
 * @param isActive New status
 * @returns Updated plan
 */
export async function togglePlanStatus(id: string, isActive: boolean): Promise<Plan> {
  return updatePlan(id, { isActive });
}

/**
 * Toggle plan visibility (public/private)
 * @param id Plan ID
 * @param isPublic New visibility
 * @returns Updated plan
 */
export async function togglePlanVisibility(id: string, isPublic: boolean): Promise<Plan> {
  return updatePlan(id, { isPublic });
}

/**
 * Duplicate a plan
 * Creates a copy of an existing plan with "(Cópia)" suffix
 * @param id Plan ID to duplicate
 * @returns New plan
 */
export async function duplicatePlan(id: string): Promise<Plan> {
  const plan = await getPlanById(id);
  
  const newPlan: CreatePlanPayload = {
    name: `${plan.name} (Cópia)`,
    description: plan.description,
    price: plan.price,
    currency: plan.currency,
    durationDays: plan.durationDays,
    isActive: false, // Start as inactive
    isPublic: false, // Start as private
    features: [...plan.features],
    interval: plan.interval,
    limits: { ...plan.limits },
    badge: plan.badge,
    highlight: false, // Don't highlight copies
    metadata: plan.metadata ? { ...plan.metadata } : undefined,
  };
  
  return createPlan(newPlan);
}

/**
 * Get plans statistics
 * @returns Statistics about plans
 */
export async function getPlanStats(): Promise<{
  total: number;
  active: number;
  inactive: number;
  public: number;
  private: number;
}> {
  const plans = await getAllPlans();
  
  return {
    total: plans.items.length,
    active: plans.items.filter(p => p.isActive).length,
    inactive: plans.items.filter(p => !p.isActive).length,
    public: plans.items.filter(p => p.isPublic).length,
    private: plans.items.filter(p => !p.isPublic).length,
  };
}

/**
 * Get plans by interval
 * @param interval Plan interval (monthly/yearly)
 * @returns List of plans
 */
export async function getPlansByInterval(interval: 'monthly' | 'yearly'): Promise<Plan[]> {
  const result = await getAllPlans();
  return result.items.filter(p => p.interval === interval);
}

/**
 * Search plans by name
 * @param query Search query
 * @returns List of matching plans
 */
export async function searchPlans(query: string): Promise<Plan[]> {
  const result = await getAllPlans();
  const lowerQuery = query.toLowerCase();
  
  return result.items.filter(p => 
    p.name.toLowerCase().includes(lowerQuery) ||
    p.description.toLowerCase().includes(lowerQuery)
  );
}
