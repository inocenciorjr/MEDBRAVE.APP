/**
 * Draft Cleanup Service
 * Handles automatic cleanup of expired drafts
 */
import { draftService, DraftService } from './draftService';
import logger from '../utils/logger';

export class DraftCleanupService {
  private draftService: DraftService;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  constructor(draftServiceInstance?: DraftService) {
    this.draftService = draftServiceInstance || draftService;
  }

  /**
   * Start automatic cleanup
   * Runs cleanup every 24 hours by default
   */
  start(intervalHours: number = 24): void {
    if (this.isRunning) {
      logger.warn('[DraftCleanup] Cleanup service is already running');
      return;
    }

    logger.info(`[DraftCleanup] Starting cleanup service (interval: ${intervalHours}h)`);

    // Run immediately on start
    this.runCleanup();

    // Schedule periodic cleanup
    const intervalMs = intervalHours * 60 * 60 * 1000;
    this.intervalId = setInterval(() => {
      this.runCleanup();
    }, intervalMs);

    this.isRunning = true;
  }

  /**
   * Stop automatic cleanup
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    logger.info('[DraftCleanup] Cleanup service stopped');
  }

  /**
   * Run cleanup manually
   */
  async runCleanup(): Promise<number> {
    try {
      logger.info('[DraftCleanup] Running cleanup of expired drafts...');
      
      const deletedCount = await this.draftService.deleteExpired();
      
      if (deletedCount > 0) {
        logger.info(`[DraftCleanup] Deleted ${deletedCount} expired drafts`);
      } else {
        logger.info('[DraftCleanup] No expired drafts to delete');
      }

      return deletedCount;
    } catch (error) {
      logger.error('[DraftCleanup] Error during cleanup:', error);
      throw error;
    }
  }

  /**
   * Check if cleanup service is running
   */
  isServiceRunning(): boolean {
    return this.isRunning;
  }
}

// Export singleton instance
export const draftCleanupService = new DraftCleanupService();
