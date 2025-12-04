// Serviço de API para planos
import axios from 'axios';
import type { Plan, UserPlan, FeatureAccessResult, LimitUsageResult, PlanFeature, PlanLimit } from '@/types/plan';

// Detectar Edge Mobile
const isEdgeMobile = typeof navigator !== 'undefined' && 
  /Edg|Edge/i.test(navigator.userAgent) && 
  /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent);

// No Edge Mobile, SEMPRE usar proxy local para evitar problemas de CORS
// Em outros navegadores, usar API externa diretamente
const API_URL = isEdgeMobile ? '/api' : (process.env.NEXT_PUBLIC_API_URL || '/api');

// Remove /api do final se existir para evitar duplicação
const BASE_URL = API_URL.replace(/\/api$/, '');

// Log para debug
if (typeof window !== 'undefined') {
  console.log('[PlanService] Edge Mobile:', isEdgeMobile, 'BASE_URL:', BASE_URL);
}

/**
 * Wrapper para fazer requisições HTTP
 * No Edge Mobile, usa fetch nativo pois Axios/XMLHttpRequest pode falhar
 */
async function httpGet<T>(url: string, token?: string): Promise<T> {
  if (isEdgeMobile) {
    // Edge Mobile: usar fetch nativo
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(url, { 
      method: 'GET',
      headers,
      credentials: 'include',
    });
    
    if (!response.ok) {
      const error: any = new Error(`HTTP ${response.status}`);
      error.response = { status: response.status };
      throw error;
    }
    
    return response.json();
  } else {
    // Outros navegadores: usar Axios
    const config: any = {};
    if (token) {
      config.headers = { Authorization: `Bearer ${token}` };
    }
    const response = await axios.get(url, config);
    return response.data;
  }
}

async function httpPost<T>(url: string, data: any, token?: string): Promise<T> {
  if (isEdgeMobile) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(url, { 
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const error: any = new Error(`HTTP ${response.status}`);
      error.response = { status: response.status };
      throw error;
    }
    
    return response.json();
  } else {
    const config: any = {};
    if (token) {
      config.headers = { Authorization: `Bearer ${token}` };
    }
    const response = await axios.post(url, data, config);
    return response.data;
  }
}

async function httpPatch<T>(url: string, data: any, token?: string): Promise<T> {
  if (isEdgeMobile) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(url, { 
      method: 'PATCH',
      headers,
      credentials: 'include',
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const error: any = new Error(`HTTP ${response.status}`);
      error.response = { status: response.status };
      throw error;
    }
    
    return response.json();
  } else {
    const config: any = {};
    if (token) {
      config.headers = { Authorization: `Bearer ${token}` };
    }
    const response = await axios.patch(url, data, config);
    return response.data;
  }
}

class PlanService {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 30000; // 30 segundos (sincronizado com backend)

  /**
   * Limpa cache específico ou todo o cache
   */
  clearCache(key?: string) {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Obtém dados do cache se válidos
   */
  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  /**
   * Salva dados no cache
   */
  private setCache(key: string, data: any) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Lista todos os planos ativos e públicos
   */
  async getActivePlans(): Promise<Plan[]> {
    const cacheKey = 'active-plans';
    const cached = this.getFromCache<Plan[]>(cacheKey);
    if (cached) return cached;

    const data = await httpGet<Plan[]>(`${BASE_URL}/api/plans/public`);
    this.setCache(cacheKey, data);
    return data;
  }

  /**
   * Obtém o plano ativo do usuário
   */
  async getUserPlan(token: string): Promise<UserPlan | null> {
    const cacheKey = `user-plan-${token}`;
    const cached = this.getFromCache<UserPlan>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Decodificar o token para pegar o user_id
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.sub || payload.user_id;

      const data = await httpGet<any>(`${BASE_URL}/api/user-plans/user/${userId}/active`, token);

      // A rota retorna { success: true, data: [...] }
      const plans = data?.data || data;
      const activePlan = Array.isArray(plans) && plans.length > 0 ? plans[0] : null;

      this.setCache(cacheKey, activePlan);
      return activePlan;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null; // Usuário sem plano
      }
      throw error;
    }
  }

  /**
   * Verifica se o usuário tem acesso a uma feature
   */
  async checkFeatureAccess(
    token: string,
    feature: PlanFeature
  ): Promise<FeatureAccessResult> {
    const userPlan = await this.getUserPlan(token);

    if (!userPlan) {
      return {
        hasAccess: false,
        reason: 'Nenhum plano ativo',
        upgradeRequired: true,
        currentPlan: 'NONE',
      };
    }

    const hasAccess = userPlan.limits[feature] === true;

    return {
      hasAccess,
      reason: hasAccess ? undefined : `Feature não disponível no plano ${userPlan.planName}`,
      upgradeRequired: !hasAccess,
      currentPlan: userPlan.planName,
      requiredPlan: hasAccess ? undefined : 'PRO',
    };
  }

  /**
   * Verifica uso de um limite
   */
  async checkLimitUsage(
    token: string,
    limit: PlanLimit,
    currentUsage: number
  ): Promise<LimitUsageResult> {
    const userPlan = await this.getUserPlan(token);

    if (!userPlan) {
      return {
        allowed: false,
        current: currentUsage,
        limit: 0,
        remaining: 0,
        percentage: 100,
        reason: 'Nenhum plano ativo',
      };
    }

    const limitValue = userPlan.limits[limit];

    // null = ilimitado
    if (limitValue === null) {
      return {
        allowed: true,
        current: currentUsage,
        limit: null,
        remaining: null,
        percentage: 0,
      };
    }

    const allowed = currentUsage < limitValue;
    const remaining = Math.max(0, limitValue - currentUsage);
    const percentage = (currentUsage / limitValue) * 100;

    return {
      allowed,
      current: currentUsage,
      limit: limitValue,
      remaining,
      percentage,
      reason: allowed ? undefined : `Limite de ${limitValue} atingido`,
    };
  }

  /**
   * Faz upgrade do plano
   */
  async upgradePlan(token: string, planId: string): Promise<UserPlan> {
    const data = await httpPost<UserPlan>(`${BASE_URL}/api/user-plans`, { planId }, token);

    // Limpa cache após upgrade
    this.clearCache();

    return data;
  }

  /**
   * Cancela o plano atual
   */
  async cancelPlan(token: string, reason?: string): Promise<void> {
    const userPlan = await this.getUserPlan(token);
    if (!userPlan) throw new Error('Nenhum plano ativo para cancelar');

    await httpPatch<void>(`${BASE_URL}/api/user-plans/${userPlan.id}/cancel`, { reason }, token);

    // Limpa cache após cancelamento
    this.clearCache();
  }

  /**
   * Obtém histórico de mudanças de status do plano
   */
  async getPlanHistory(token: string): Promise<any[]> {
    return httpGet<any[]>(`${BASE_URL}/api/user-plans/history`, token);
  }

  /**
   * Verifica se o plano está próximo de expirar (< 7 dias)
   */
  isExpiringSoon(userPlan: UserPlan): boolean {
    if (!userPlan.endDate) return false;

    const endDate = new Date(userPlan.endDate);
    const now = new Date();
    const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return daysRemaining <= 7 && daysRemaining > 0;
  }

  /**
   * Verifica se o plano expirou
   */
  isExpired(userPlan: UserPlan): boolean {
    if (!userPlan.endDate) return false;

    const endDate = new Date(userPlan.endDate);
    const now = new Date();

    return now > endDate;
  }

  /**
   * Formata o nome do plano para exibição
   */
  formatPlanName(planName: string): string {
    const names: Record<string, string> = {
      FREE: 'Gratuito',
      TRIAL: 'Trial',
      'TRIAL PRO': 'Trial Pro',
      PRO: 'Pro',
      PREMIUM: 'Premium',
    };

    return names[planName] || planName;
  }

  /**
   * Obtém cor do plano
   */
  getPlanColor(planName: string): string {
    const colors: Record<string, string> = {
      FREE: '#6366f1', // Indigo
      TRIAL: '#f59e0b', // Amber
      'TRIAL PRO': '#f59e0b', // Amber
      PRO: '#10b981', // Emerald
      PREMIUM: '#8b5cf6', // Purple
    };

    return colors[planName] || '#6366f1';
  }

  /**
   * Obtém ícone do plano
   */
  getPlanIcon(planName: string): string {
    const icons: Record<string, string> = {
      FREE: '🆓',
      TRIAL: '⚡',
      'TRIAL PRO': '⚡',
      PRO: '⭐',
      PREMIUM: '👑',
    };

    return icons[planName] || '📦';
  }
}

export const planService = new PlanService();
