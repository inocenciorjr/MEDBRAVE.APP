import { Router } from 'express';
import { AdvancedFeaturesController } from '../controllers/AdvancedFeaturesController';
import { DailyLimitsService } from '../services/DailyLimitsService';
import { DayCompletionService } from '../services/DayCompletionService';
import { ReviewRemovalService } from '../services/ReviewRemovalService';
import { firestore } from 'firebase-admin';

const router = Router();

// Instanciar services
const dailyLimitsService = new DailyLimitsService(firestore());
const dayCompletionService = new DayCompletionService(firestore());
const reviewRemovalService = new ReviewRemovalService(firestore());

// Instanciar controller
const advancedFeaturesController = new AdvancedFeaturesController(
  dailyLimitsService,
  dayCompletionService,
  reviewRemovalService
);

// ===== DAILY LIMITS ROUTES =====
router.get('/daily-limits', advancedFeaturesController.getDailyLimits);
router.put('/daily-limits', advancedFeaturesController.setDailyLimits);
router.get('/daily-limits/status', advancedFeaturesController.getDailyLimitStatus);
router.get('/daily-limits/progress', advancedFeaturesController.getTodayProgress);

// ===== DAY COMPLETION ROUTES =====
router.post('/day-completion/complete', advancedFeaturesController.completeDayStudy);
router.get('/day-completion/today', advancedFeaturesController.getTodayCompletion);
router.get('/day-completion/stats', advancedFeaturesController.getCompletionStats);
router.post('/day-completion/suggest', advancedFeaturesController.suggestDayCompletion);
router.get('/day-completion/history', advancedFeaturesController.getCompletionHistory);

// ===== REVIEW REMOVAL ROUTES =====
router.delete('/review-removal/:contentType/:contentId', advancedFeaturesController.removeFromReviewSystem);
router.post('/review-removal/bulk', advancedFeaturesController.bulkRemoveFromReviewSystem);
router.post('/review-removal/restore/:removedItemId', advancedFeaturesController.restoreToReviewSystem);
router.get('/review-removal/removed', advancedFeaturesController.getRemovedItems);
router.get('/review-removal/stats', advancedFeaturesController.getRemovalStats);

// ===== ADMIN ROUTES =====
router.post('/admin/cleanup', advancedFeaturesController.cleanupOldRemovedItems);

export default router; 