// Types para o sistema de planos

export interface PlanLimits {
  // Limites numéricos (null = ilimitado)
  maxQuestionsPerDay: number | null;
  maxQuestionListsPerDay: number | null;
  maxSimulatedExamsPerMonth: number | null;
  maxFlashcardsCreated: number | null;
  maxFlashcardDecks: number | null;
  maxReviewsPerDay: number | null;
  maxFSRSCards: number | null;
  maxPulseAIQueriesPerDay: number | null;
  maxQuestionExplanationsPerDay: number | null;
  maxContentGenerationPerMonth: number | null;
  maxSupportTicketsPerMonth: number | null;
  
  // Features booleanas
  canExportData: boolean;
  canCreateCustomLists: boolean;
  canAccessAdvancedStatistics: boolean;
  canUseErrorNotebook: boolean;
  canAccessMentorship: boolean;
  canUseOfflineMode: boolean;
  canCustomizeInterface: boolean;
  
  // Outros
  supportLevel: 'basic' | 'standard' | 'premium';
}

export interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  durationDays: number;
  interval: 'daily' | 'weekly' | 'monthly' | 'yearly';
  isActive: boolean;
  isPublic: boolean;
  features: string[];
  limits: PlanLimits;
  metadata: Record<string, any>;
  badge?: string;
  highlight: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserPlan {
  id: string;
  userId: string;
  planId: string;
  planName: string;
  status: 'PENDING_PAYMENT' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'SUSPENDED' | 'TRIAL';
  startDate: string;
  endDate: string;
  lastPaymentId?: string;
  paymentMethod?: string;
  autoRenew: boolean;
  metadata: Record<string, any>;
  cancellationReason?: string;
  cancelledAt?: string;
  nextBillingDate?: string;
  trialEndsAt?: string;
  createdAt: string;
  updatedAt: string;
  
  // Dados do plano (desnormalizados para cache)
  limits: PlanLimits;
  features: string[];
}

export interface FeatureAccessResult {
  hasAccess: boolean;
  reason?: string;
  upgradeRequired: boolean;
  currentPlan?: string;
  requiredPlan?: string;
}

export interface LimitUsageResult {
  allowed: boolean;
  current: number;
  limit: number | null;
  remaining: number | null;
  percentage: number;
  reason?: string;
}

export type PlanFeature = keyof Pick<
  PlanLimits,
  | 'canExportData'
  | 'canCreateCustomLists'
  | 'canAccessAdvancedStatistics'
  | 'canUseErrorNotebook'
  | 'canAccessMentorship'
  | 'canUseOfflineMode'
  | 'canCustomizeInterface'
>;

export type PlanLimit = keyof Pick<
  PlanLimits,
  | 'maxQuestionsPerDay'
  | 'maxQuestionListsPerDay'
  | 'maxSimulatedExamsPerMonth'
  | 'maxFlashcardsCreated'
  | 'maxFlashcardDecks'
  | 'maxReviewsPerDay'
  | 'maxFSRSCards'
  | 'maxPulseAIQueriesPerDay'
  | 'maxQuestionExplanationsPerDay'
  | 'maxContentGenerationPerMonth'
  | 'maxSupportTicketsPerMonth'
>;
