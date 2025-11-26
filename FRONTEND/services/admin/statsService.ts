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
  fetchPromise = get<DashboardStats>('/api/admin/dashboard/stats')
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
