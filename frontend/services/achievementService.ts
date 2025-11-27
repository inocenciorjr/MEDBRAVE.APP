import { fetchWithAuth } from '@/lib/utils/fetchWithAuth';

// Types para Achievements
export enum AchievementCategory {
  GENERAL = 'GENERAL',
  CARDIOLOGY = 'CARDIOLOGY',
  NEUROLOGY = 'NEUROLOGY',
  DERMATOLOGY = 'DERMATOLOGY',
  PEDIATRICS = 'PEDIATRICS',
  PSYCHIATRY = 'PSYCHIATRY',
  SURGERY = 'SURGERY',
  GYNECOLOGY = 'GYNECOLOGY',
  ORTHOPEDICS = 'ORTHOPEDICS',
  OPHTHALMOLOGY = 'OPHTHALMOLOGY',
  EMERGENCY = 'EMERGENCY',
  RADIOLOGY = 'RADIOLOGY',
  PATHOLOGY = 'PATHOLOGY',
  PHARMACOLOGY = 'PHARMACOLOGY'
}

export enum AchievementRarity {
  COMMON = 'COMMON',
  UNCOMMON = 'UNCOMMON',
  RARE = 'RARE',
  EPIC = 'EPIC',
  LEGENDARY = 'LEGENDARY',
  MYTHICAL = 'MYTHICAL'
}

export enum AchievementStatus {
  LOCKED = 'LOCKED',
  AVAILABLE = 'AVAILABLE',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED'
}

export enum RewardType {
  XP = 'XP',
  POINTS = 'POINTS',
  BADGE = 'BADGE',
  TITLE = 'TITLE',
  STREAK_FREEZE = 'STREAK_FREEZE'
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
  rewards: Array<{
    type: RewardType;
    value: any;
    description: string;
  }>;
  isHidden: boolean;
  isRepeatable: boolean;
  tags: string[];
  isActive: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievementId: string;
  status: AchievementStatus;
  progress: {
    current: number;
    target: number;
    percentage: number;
    lastUpdated: Date;
  };
  completionCount: number;
  rewardsCollected: boolean;
  firstSeenAt: Date;
  completedAt?: Date;
  collectedAt?: Date;
  last_updated_at: Date;
  achievement?: Achievement;
}

export interface UserAchievementStats {
  user_id: string;
  totalAchievements: number;
  completedAchievements: number;
  inProgressAchievements: number;
  categoryStats: Record<AchievementCategory, {
    total: number;
    completed: number;
    percentage: number;
  }>;
  rarityStats: Record<AchievementRarity, {
    total: number;
    completed: number;
  }>;
  totalXpEarned: number;
  totalPointsEarned: number;
  globalRank: number;
  categoryRanks: Record<AchievementCategory, number>;
  recentCompletions: Array<{
    achievementId: string;
    completedAt: Date;
    rarity: AchievementRarity;
  }>;
  lastCalculated: Date;
  completionRate: number;
}

export interface AchievementLeaderboard {
  id: string;
  type: 'global' | 'category' | 'weekly';
  category?: AchievementCategory;
  entries: Array<{
    user_id: string;
    userDisplayName: string;
    userAvatarUrl?: string;
    score: number;
    rank: number;
    achievements: number;
    rareAchievements: number;
  }>;
  lastUpdated: Date;
  nextUpdate: Date;
}

export interface AchievementNotification {
  id: string;
  user_id: string;
  achievementId: string;
  type: 'completed' | 'progress' | 'unlocked';
  title: string;
  message: string;
  isRead: boolean;
  isImportant: boolean;
  created_at: Date;
  readAt?: Date;
  achievement?: Achievement;
}

export interface AchievementSuggestion {
  achievementId: string;
  achievement: Achievement;
  probability: number;
  estimatedDays: number;
  tips: string[];
}

// Serviço Principal
class AchievementService {
  private readonly API_BASE = '/api/achievements';

  // === CONQUISTAS ===

  // Obter todas as conquistas
  async getAllAchievements(filters?: {
    category?: AchievementCategory;
    rarity?: AchievementRarity;
    tags?: string[];
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<Achievement[]> {
    try {
      let url = this.API_BASE;
      const searchParams = new URLSearchParams();
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            value.forEach(v => searchParams.append(key, String(v)));
          } else if (value !== undefined && value !== null) {
            searchParams.append(key, String(value));
          }
        });
      }
      
      if (searchParams.toString()) {
        url += '?' + searchParams.toString();
      }
      
      const response = await fetchWithAuth(url);
      
      if (!response.ok) {
        throw new Error(`Erro ao buscar conquistas: ${response.status}`);
      }
      
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Erro ao buscar conquistas:', error);
      throw error;
    }
  }

  // Obter conquista por ID
  async getAchievementById(achievementId: string): Promise<Achievement | null> {
    try {
      const response = await fetchWithAuth(`${this.API_BASE}/${achievementId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Erro ao buscar conquista: ${response.status}`);
      }
      
      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Erro ao buscar conquista:', error);
      throw error;
    }
  }

  // === CONQUISTAS DO USUÁRIO ===

  // Obter conquistas do usuário
  async getUserAchievements(user_id: string, status?: AchievementStatus[]): Promise<UserAchievement[]> {
    try {
      let url = `${this.API_BASE}/user/${user_id}`;
      const searchParams = new URLSearchParams();
      
      if (status && status.length > 0) {
        status.forEach(s => searchParams.append('status', s));
      }
      
      if (searchParams.toString()) {
        url += '?' + searchParams.toString();
      }
      
      const response = await fetchWithAuth(url);
      
      if (!response.ok) {
        throw new Error(`Erro ao buscar conquistas do usuário: ${response.status}`);
      }
      
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Erro ao buscar conquistas do usuário:', error);
      throw error;
    }
  }

  // Obter estatísticas do usuário
  async getUserAchievementStats(user_id: string): Promise<UserAchievementStats | null> {
    try {
      const response = await fetchWithAuth(`${this.API_BASE}/user/${user_id}/stats`);
      
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Erro ao buscar estatísticas: ${response.status}`);
      }
      
      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Erro ao buscar estatísticas de conquistas:', error);
      throw error;
    }
  }

  // Coletar recompensas
  async collectRewards(user_id: string, achievementId: string): Promise<{
    success: boolean;
    rewards: Array<{type: RewardType; value: any; description: string}>;
    newUserState: any;
  }> {
    try {
      const response = await fetchWithAuth(`${this.API_BASE}/user/${user_id}/collect/${achievementId}`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(`Erro ao coletar recompensas: ${response.status}`);
      }
      
      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Erro ao coletar recompensas:', error);
      throw error;
    }
  }

  // Obter recompensas pendentes
  async getPendingRewards(user_id: string): Promise<Array<{
    achievementId: string;
    achievement: Achievement;
    rewards: any[];
  }>> {
    try {
      const response = await fetchWithAuth(`${this.API_BASE}/user/${user_id}/pending-rewards`);
      
      if (!response.ok) {
        throw new Error(`Erro ao buscar recompensas pendentes: ${response.status}`);
      }
      
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Erro ao buscar recompensas pendentes:', error);
      throw error;
    }
  }

  // === LEADERBOARDS ===

  // Obter leaderboard global
  async getGlobalLeaderboard(limitNum: number = 200): Promise<AchievementLeaderboard> {
    try {
      const response = await fetchWithAuth(`${this.API_BASE}/leaderboard/global?limit=${limitNum}`);
      
      if (!response.ok) {
        throw new Error(`Erro ao buscar leaderboard global: ${response.status}`);
      }
      
      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Erro ao buscar leaderboard global:', error);
      throw error;
    }
  }

  // Obter leaderboard por categoria
  async getCategoryLeaderboard(category: AchievementCategory, limitNum: number = 200): Promise<AchievementLeaderboard> {
    try {
      const response = await fetchWithAuth(`${this.API_BASE}/leaderboard/category/${category}?limit=${limitNum}`);
      
      if (!response.ok) {
        throw new Error(`Erro ao buscar leaderboard da categoria: ${response.status}`);
      }
      
      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Erro ao buscar leaderboard da categoria:', error);
      throw error;
    }
  }

  // Obter ranking do usuário
  async getUserRanking(user_id: string): Promise<{
    global: number;
    categoryRanks: Record<AchievementCategory, number>;
    percentile: number;
  }> {
    try {
      const response = await fetchWithAuth(`${this.API_BASE}/user/${user_id}/ranking`);
      
      if (!response.ok) {
        throw new Error(`Erro ao buscar ranking: ${response.status}`);
      }
      
      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Erro ao buscar ranking do usuário:', error);
      throw error;
    }
  }

  // === NOTIFICAÇÕES ===

  // Obter notificações do usuário
  async getUserNotifications(user_id: string, includeRead: boolean = false): Promise<AchievementNotification[]> {
    try {
      const response = await fetchWithAuth(`${this.API_BASE}/user/${user_id}/notifications?includeRead=${includeRead}`);
      
      if (!response.ok) {
        throw new Error(`Erro ao buscar notificações: ${response.status}`);
      }
      
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
      throw error;
    }
  }

  // Marcar notificação como lida
  async markNotificationAsRead(notificationId: string): Promise<boolean> {
    try {
      const response = await fetchWithAuth(`${this.API_BASE}/notifications/${notificationId}/read`, {
        method: 'PUT'
      });
      
      if (!response.ok) {
        throw new Error(`Erro ao marcar notificação: ${response.status}`);
      }
      
      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
      return false;
    }
  }

  // Marcar todas as notificações como lidas
  async markAllNotificationsAsRead(user_id: string): Promise<number> {
    try {
      const response = await fetchWithAuth(`${this.API_BASE}/user/${user_id}/notifications/read-all`, {
        method: 'PUT'
      });
      
      if (!response.ok) {
        throw new Error(`Erro ao marcar notificações: ${response.status}`);
      }
      
      const data = await response.json();
      return data.data.markedCount || 0;
    } catch (error) {
      console.error('Erro ao marcar todas as notificações como lidas:', error);
      return 0;
    }
  }

  // === IA E SUGESTÕES ===

  // Gerar sugestões de conquistas
  async generateAchievementSuggestions(user_id: string): Promise<AchievementSuggestion[]> {
    try {
      const response = await fetchWithAuth(`${this.API_BASE}/user/${user_id}/suggestions`);
      
      if (!response.ok) {
        throw new Error(`Erro ao gerar sugestões: ${response.status}`);
      }
      
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Erro ao gerar sugestões de conquistas:', error);
      throw error;
    }
  }

  // Analisar padrões do usuário
  async analyzeUserAchievementPatterns(user_id: string): Promise<{
    preferredCategories: AchievementCategory[];
    averageCompletionTime: number;
    strengths: string[];
    recommendations: string[];
  }> {
    try {
      const response = await fetchWithAuth(`${this.API_BASE}/user/${user_id}/patterns`);
      
      if (!response.ok) {
        throw new Error(`Erro ao analisar padrões: ${response.status}`);
      }
      
      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Erro ao analisar padrões do usuário:', error);
      throw error;
    }
  }

  // === MÉTODOS AUXILIARES ===

  // Obter leaderboard semanal
  async getWeeklyLeaderboard(limitNum: number = 200): Promise<AchievementLeaderboard> {
    try {
      const response = await fetchWithAuth(`${this.API_BASE}/leaderboard/weekly?limit=${limitNum}`);
      
      if (!response.ok) {
        throw new Error(`Erro ao buscar leaderboard semanal: ${response.status}`);
      }
      
      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Erro ao buscar leaderboard semanal:', error);
      throw error;
    }
  }
}

export const achievementService = new AchievementService();
export default achievementService;