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
}

let statsCache: { data: DashboardStats; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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

  console.log('🔄 Fetching fresh dashboard stats');
  const stats = await get<DashboardStats>('/api/admin/dashboard/stats');
  
  // Update cache
  statsCache = {
    data: stats,
    timestamp: now,
  };

  return stats;
}

/**
 * Clear stats cache (useful after data changes)
 */
export function clearStatsCache(): void {
  statsCache = null;
}
