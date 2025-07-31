// === TYPES ===
export * from './types';

// === INTERFACES ===
export * from './interfaces/IAchievementService';

// === SERVICES ===
export { FirebaseAchievementService } from './services/FirebaseAchievementService';
export { AchievementHelpers } from './services/AchievementHelpers';

// === CONTROLLERS ===
export { AchievementController } from './controllers/AchievementController';

// === ROUTES ===
export { createAchievementRoutes } from './routes/achievementRoutes';

// === RE-EXPORTS FOR CONVENIENCE ===
export type {
  Achievement,
  UserAchievement,
  UserAchievementStats,
  AchievementLeaderboard,
  AchievementNotification,
  AchievementEvent,
  AchievementConfig,
  AchievementTemplate,
  AchievementCheckPayload,
  AchievementCheckResult,
  AchievementFilters,
  AchievementCondition,
  AchievementProgress,
  AchievementReward
} from './types';

export {
  AchievementCategory,
  AchievementTriggerType,
  AchievementRarity,
  AchievementStatus,
  RewardType
} from './types'; 