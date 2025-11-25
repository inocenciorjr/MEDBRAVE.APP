// Re-export Supabase implementations
export { SupabaseUnifiedReviewService as UnifiedReviewService } from '../../../../infra/studyTools/supabase/SupabaseUnifiedReviewService';

export { SupabaseDailyLimitsService as DailyLimitsService } from '../../../../infra/studyTools/supabase/SupabaseDailyLimitsService';

export { SupabaseDayCompletionService as DayCompletionService } from '../../../../infra/studyTools/supabase/SupabaseDayCompletionService';

// Export domain services
export { ReviewPreferencesService } from './ReviewPreferencesService';
export { SmartSchedulingService } from './SmartSchedulingService';
export { ReviewItemManagementService } from './ReviewItemManagementService';
export { ReviewDashboardService } from './ReviewDashboardService';

// Export types and interfaces
export type { ReviewPreferences } from './ReviewPreferencesService';
export type { BacklogStatus } from './SmartSchedulingService';
export type {
  UnifiedReviewItem,
  DailyReviewSummary,
} from '../types';

export type {
  DailyLimits,
  DailyProgress,
  DailyLimitStatus,
} from '../../../../infra/studyTools/supabase/SupabaseDailyLimitsService';

export type {
  DayCompletion,
  CompletionSuggestion,
} from '../../../../infra/studyTools/supabase/SupabaseDayCompletionService';
export { CompletionType } from '../../../../infra/studyTools/supabase/SupabaseDayCompletionService';
