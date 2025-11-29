/**
 * Statistics service for admin dashboard
 */

import { get } from './baseService';

export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalQuestions: number;
  publishedQuestions: number;
  totalPosts: number;
  reportedContent: number;
  totalRevenue: number;
  monthlyRevenue: number;
  // Financial stats
  totalPlans?: number;
  activePlans?: number;
  totalCoupons?: number;
  totalPayments?: number;
  approvedPayments?: number;
  pendingPayments?: number;
}

export interface FinancialStats {
  totalRevenue: number;
  monthlyRevenue: number;
  totalPayments: number;
  approvedPayments: number;
  pendingPayments: number;
  failedPayments: number;
  totalPlans: number;
  activePlans: number;
  totalUserPlans: number;
  activeUserPlans: number;
  expiringUserPlans: number;
  totalCoupons: number;
  activeCoupons: number;
  couponsUsed: number;
}

export interface RevenueChartData {
  date: string;
  revenue: number;
  payments: number;
}

export interface TopPlan {
  planId: string;
  planName: string;
  subscribers: number;
  revenue: number;
}

let statsCache: { data: DashboardStats; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Debounce: prevenir múltiplas chamadas simultâneas
let fetchPromise: Promise<DashboardStats> | null = null;

/**
 * Get dashboard statistics with caching
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const now = Date.now();
  
  // Return cached data if still valid
  if (statsCache && now - statsCache.timestamp < CACHE_TTL) {
    console.log('📊 Using cached dashboard stats');
    return statsCache.data;
  }

  // Se já tem uma requisição em andamento, aguardar ela
  if (fetchPromise) {
    console.log('⏳ Aguardando requisição em andamento...');
    return fetchPromise;
  }

  console.log('🔄 Fetching fresh dashboard stats');
  
  // Criar promise de fetch
  fetchPromise = get<DashboardStats>('/admin/dashboard/stats')
    .then(stats => {
      // Update cache
      statsCache = {
        data: stats,
        timestamp: now,
      };
      return stats;
    })
    .finally(() => {
      // Limpar promise após completar
      fetchPromise = null;
    });

  return fetchPromise;
}

/**
 * Clear stats cache (useful after data changes)
 */
export function clearStatsCache(): void {
  statsCache = null;
}

/**
 * Get financial statistics
 */
export async function getFinancialStats(): Promise<FinancialStats> {
  // For now, calculate from services
  // In production, this should be a dedicated backend endpoint
  const { getAllPlans, getPlanStats } = await import('./planService');
  const { getAllUserPlans, getUserPlanStats } = await import('./userPlanService');
  const { getAllCoupons, getCouponStats } = await import('./couponService');
  const { getAllPayments, getPaymentStats } = await import('./paymentService');

  const [planStats, userPlanStats, couponStats, paymentStats] = await Promise.all([
    getPlanStats(),
    getUserPlanStats(),
    getCouponStats(),
    getPaymentStats(),
  ]);

  return {
    totalRevenue: paymentStats.approvedAmount,
    monthlyRevenue: paymentStats.approvedAmount, // TODO: filter by month
    totalPayments: paymentStats.totalPayments,
    approvedPayments: paymentStats.approvedPayments,
    pendingPayments: paymentStats.paymentsByStatus.PENDING?.count || 0,
    failedPayments: paymentStats.rejectedPayments,
    totalPlans: planStats.total,
    activePlans: planStats.active,
    totalUserPlans: userPlanStats.total,
    activeUserPlans: userPlanStats.active,
    expiringUserPlans: 0, // TODO: calculate
    totalCoupons: couponStats.total,
    activeCoupons: couponStats.active,
    couponsUsed: couponStats.total - couponStats.active,
  };
}

/**
 * Get revenue chart data for the last 30 days
 */
export async function getRevenueChartData(days: number = 30): Promise<RevenueChartData[]> {
  const { getAllPayments } = await import('./paymentService');
  const result = await getAllPayments();
  const payments = result.items.filter(p => p.status === 'APPROVED');

  // Group by date
  const dataMap = new Map<string, { revenue: number; count: number }>();
  
  payments.forEach(payment => {
    const date = new Date(payment.paidAt || payment.createdAt).toISOString().split('T')[0];
    const current = dataMap.get(date) || { revenue: 0, count: 0 };
    dataMap.set(date, {
      revenue: current.revenue + payment.amount,
      count: current.count + 1,
    });
  });

  // Convert to array and sort
  return Array.from(dataMap.entries())
    .map(([date, data]) => ({
      date,
      revenue: data.revenue,
      payments: data.count,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-days);
}

/**
 * Get top plans by subscribers
 */
export async function getTopPlans(limit: number = 5): Promise<TopPlan[]> {
  const { getAllUserPlans } = await import('./userPlanService');
  const { getAllPlans } = await import('./planService');

  const [userPlansResult, plansResult] = await Promise.all([
    getAllUserPlans({ status: 'ACTIVE' }),
    getAllPlans(),
  ]);

  const userPlans = userPlansResult.items;
  const plans = plansResult.items;

  // Count subscribers per plan
  const planMap = new Map<string, { count: number; revenue: number }>();
  
  userPlans.forEach(userPlan => {
    const current = planMap.get(userPlan.planId) || { count: 0, revenue: 0 };
    const plan = plans.find(p => p.id === userPlan.planId);
    planMap.set(userPlan.planId, {
      count: current.count + 1,
      revenue: current.revenue + (plan?.price || 0),
    });
  });

  // Convert to array and sort
  return Array.from(planMap.entries())
    .map(([planId, data]) => {
      const plan = plans.find(p => p.id === planId);
      return {
        planId,
        planName: plan?.name || 'Unknown',
        subscribers: data.count,
        revenue: data.revenue,
      };
    })
    .sort((a, b) => b.subscribers - a.subscribers)
    .slice(0, limit);
}
