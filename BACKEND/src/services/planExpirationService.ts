/**
 * Plan Expiration Service
 * Handles automatic expiration of user plans
 */
import { supabase } from '../config/supabaseAdmin';
import { SupabaseUserPlanService } from '../infra/payment/supabase/SupabaseUserPlanService';
import { SupabasePlanService } from '../infra/payment/supabase/SupabasePlanService';
import logger from '../utils/logger';

export class PlanExpirationService {
  private userPlanService: SupabaseUserPlanService;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  constructor() {
    const planService = new SupabasePlanService(supabase);
    this.userPlanService = new SupabaseUserPlanService(supabase, planService);
  }

  /**
   * Start automatic plan expiration check
   * Runs every hour by default
   */
  start(intervalHours: number = 1): void {
    if (this.isRunning) {
      return;
    }

    this.runExpiration();

    // Schedule periodic expiration check
    const intervalMs = intervalHours * 60 * 60 * 1000;
    this.intervalId = setInterval(() => {
      this.runExpiration();
    }, intervalMs);

    this.isRunning = true;
  }

  /**
   * Stop automatic plan expiration check
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
  }

  /**
   * Run expiration check manually
   */
  async runExpiration(): Promise<{ processedCount: number; expiredCount: number }> {
    try {
      const result = await this.userPlanService.checkAndExpireUserPlans();
      
      if (result.expiredCount > 0) {
        logger.info(`[PlanExpiration] Expired ${result.expiredCount} plans`);
      }

      return result;
    } catch (error) {
      logger.error('[PlanExpiration] Error during expiration check:', error);
      throw error;
    }
  }

  /**
   * Check if service is running
   */
  isServiceRunning(): boolean {
    return this.isRunning;
  }
}

// Export singleton instance
export const planExpirationService = new PlanExpirationService();
