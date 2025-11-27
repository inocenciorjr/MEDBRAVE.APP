/**
 * Types for Admin Plan Management
 */

export interface PlanLimits {
  // Questões
  maxQuestionsPerDay: number | null;
  maxQuestionListsPerDay: number | null;
  maxSimulatedExamsPerMonth: number | null;

  // FSRS/SRS
  maxFSRSCards: number | null;
  maxReviewsPerDay: number | null;

  // Flashcards
  maxFlashcardsCreated: number | null;
  maxFlashcardDecks: number | null;

  // IA Features
  maxPulseAIQueriesPerDay: number | null;
  maxQuestionExplanationsPerDay: number | null;
  maxContentGenerationPerMonth: number | null;

  // Funcionalidades Premium
  canExportData: boolean;
  canCreateCustomLists: boolean;
  canAccessAdvancedStatistics: boolean;
  canUseErrorNotebook: boolean;
  canAccessMentorship: boolean;
  canUseOfflineMode: boolean;
  canCustomizeInterface: boolean;

  // Suporte
  supportLevel: 'basic' | 'priority' | 'premium';
  maxSupportTicketsPerMonth: number | null;
}

export type PlanInterval = 'monthly' | 'yearly';

export interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  durationDays: number;
  isActive: boolean;
  isPublic: boolean;
  features: string[];
  interval: PlanInterval;
  limits: PlanLimits;
  badge?: string;
  highlight?: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePlanPayload {
  name: string;
  description: string;
  price: number;
  currency?: string;
  durationDays: number;
  isActive?: boolean;
  isPublic?: boolean;
  features: string[];
  interval?: PlanInterval;
  limits?: Partial<PlanLimits>;
  badge?: string;
  highlight?: boolean;
  metadata?: Record<string, any>;
}

export interface UpdatePlanPayload extends Partial<CreatePlanPayload> {}

export interface PlanListOptions {
  isActive?: boolean;
  isPublic?: boolean;
  limit?: number;
  page?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PlanListResult {
  items: Plan[];
  total: number;
  limit: number;
  offset: number;
}

// User Plan Types
export type UserPlanStatus = 
  | 'PENDING_PAYMENT'
  | 'ACTIVE'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'SUSPENDED'
  | 'TRIAL';

export type PaymentMethod = 
  | 'CREDIT_CARD'
  | 'PIX'
  | 'ADMIN'
  | 'FREE'
  | 'BANK_SLIP'
  | 'OTHER';

export interface UserPlan {
  id: string;
  userId: string;
  planId: string;
  startDate: string;
  endDate: string;
  status: UserPlanStatus;
  lastPaymentId: string | null;
  paymentMethod: PaymentMethod;
  autoRenew: boolean;
  metadata?: Record<string, any>;
  cancellationReason: string | null;
  cancelledAt: string | null;
  nextBillingDate: string | null;
  trialEndsAt: string | null;
  createdAt: string;
  updatedAt: string;
  // Populated fields
  plan?: Plan;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface CreateUserPlanPayload {
  userId: string;
  planId: string;
  startDate: string;
  endDate: string;
  paymentMethod?: PaymentMethod;
  autoRenew?: boolean;
  metadata?: Record<string, any>;
  trialEndsAt?: string;
}

export interface UpdateUserPlanPayload {
  startDate?: string;
  endDate?: string;
  status?: UserPlanStatus;
  lastPaymentId?: string;
  paymentMethod?: PaymentMethod;
  autoRenew?: boolean;
  metadata?: Record<string, any>;
  cancellationReason?: string;
  cancelledAt?: string;
  nextBillingDate?: string;
  trialEndsAt?: string;
}

export interface UserPlanListOptions {
  userId?: string;
  planId?: string;
  status?: UserPlanStatus | UserPlanStatus[];
  active?: boolean;
  startDate?: string;
  endDate?: string;
  limit?: number;
  page?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface UserPlanListResult {
  items: UserPlan[];
  total: number;
  limit: number;
  offset: number;
}

export interface RenewUserPlanPayload {
  durationDays: number;
  paymentId?: string;
  paymentMethod?: PaymentMethod;
}

export interface CancelUserPlanPayload {
  reason: string;
}

export interface UpdateUserPlanStatusPayload {
  status: UserPlanStatus;
  reason?: string;
}

export interface ExpiredPlansCheckResult {
  processedCount: number;
  expiredCount: number;
  error?: string;
}
