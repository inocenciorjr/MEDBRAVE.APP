/**
 * Types para gerenciamento de usuários no admin
 */

export enum UserRole {
  STUDENT = 'STUDENT',
  ADMIN = 'ADMIN',
  MODERATOR = 'MODERATOR',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  BANNED = 'BANNED',
}

export interface User {
  id: string;
  email: string;
  display_name: string;
  photo_url?: string;
  role: UserRole;
  biography?: string;
  specialties?: string[];
  is_blocked: boolean;
  is_banned?: boolean;
  block_reason?: string;
  blocked_by?: string;
  blocked_at?: string;
  suspended_until?: string;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
  current_streak?: number;
  user_plans?: UserPlanInfo[];
}

export interface UserPlanInfo {
  id: string;
  plan_id: string;
  status: string;
  start_date: string;
  end_date: string;
  auto_renew: boolean;
  payment_method: string;
  created_at: string;
  plans?: {
    id: string;
    name: string;
    price: number;
    duration_days: number;
  };
}

export interface UserStatistics {
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  studyTime: number; // em segundos
  lastActivity: string | null;
  streak: number;
}

export interface UserLog {
  id: string;
  user_id: string;
  action: string;
  description: string;
  metadata?: Record<string, any>;
  created_at: string;
  ip_address?: string;
}

export interface UserNote {
  id: string;
  user_id: string;
  note: string;
  created_by: string;
  created_at: string;
  creator?: {
    id: string;
    display_name: string;
    email: string;
  };
}

export interface UserSession {
  id: string;
  user_id: string;
  device: string;
  browser: string;
  ip_address: string;
  last_activity: string;
  created_at: string;
  is_active?: boolean; // Status de presença em tempo real (do Redis)
  socket_id?: string | null; // ID do socket conectado
  metadata?: {
    page?: string; // Página atual do usuário
    device?: string;
    browser?: string;
    [key: string]: any;
  };
}

export interface UserFilters {
  search: string;
  role: UserRole | 'ALL';
  status: UserStatus | 'ALL';
  planId?: string;
}

export type UserSortField = 
  | 'display_name' 
  | 'email' 
  | 'role' 
  | 'created_at' 
  | 'last_login_at';

export interface GetUsersParams {
  search?: string;
  role?: string;
  status?: string;
  planId?: string;
  limit?: number;
  offset?: number;
  sortBy?: UserSortField;
  sortOrder?: 'asc' | 'desc';
}

export interface UpdateUserPayload {
  display_name?: string;
  email?: string;
  role?: UserRole;
  biography?: string;
  specialties?: string[];
  photo_url?: string;
}

export interface SuspendUserPayload {
  reason: string;
  duration?: number; // em dias
}

export interface BanUserPayload {
  reason: string;
}

export interface SendEmailPayload {
  subject: string;
  message: string;
}

export interface BulkUpdatePayload {
  userIds: string[];
  updates: {
    role?: string;
    status?: string;
  };
}

/**
 * Helper function to get user status from flags
 */
export function getUserStatus(user: User): UserStatus {
  if (user.is_banned) return UserStatus.BANNED;
  if (user.is_blocked) return UserStatus.SUSPENDED;
  return UserStatus.ACTIVE;
}

/**
 * Helper function to check if user matches status filter
 */
export function matchesStatusFilter(user: User, statusFilter: UserStatus | 'ALL'): boolean {
  if (statusFilter === 'ALL') return true;
  return getUserStatus(user) === statusFilter;
}
