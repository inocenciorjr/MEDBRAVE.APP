/**
 * Batch Controller
 * Handles batch processing requests with SSE
 */
import { Request, Response } from 'express';
import { batchProcessorService, BatchProcessorService } from '../services/batchProcessorService';
import logger from '../utils/logger';

export class BatchController {
  private batchProcessor: BatchProcessorService;

  constructor(batchProcessorInstance?: BatchProcessorService) {
    this.batchProcessor = batchProcessorInstance || batchProcessorService;
  }

  /**
   * POST /batch/process
   * Start batch processing with SSE
   */
  processBatch = async (req: Request, res: Response): Promise<void> => {
    try {
      const { urls, configs, options } = req.body;
      const userId = (req as any).user?.id;

      // Validation
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      if (!urls || !Array.isArray(urls) || urls.length === 0) {
        res.status(400).json({
          success: false,
          error: 'URLs array is required and must not be empty',
        });
        return;
      }

      // Validate each URL
      for (const url of urls) {
        if (typeof url !== 'string' || !url.trim()) {
          res.status(400).json({
            success: false,
            error: 'All URLs must be valid strings',
          });
          return;
        }
      }

      logger.info(`[BatchController] Starting batch process for ${urls.length} URLs`);

      // Process batch with SSE (this will handle the response)
      await this.batchProcessor.processBatch(
        urls,
        configs || {},
        res,
        options || {}
      );

    } catch (error) {
      logger.error('[BatchController] Error in processBatch:', error);
      
      // If headers not sent yet, send error response
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Internal server error',
        });
      } else {
        // If SSE already started, send error event
        try {
          res.write(`data: ${JSON.stringify({
            type: 'error',
            error: error instanceof Error ? error.message : 'Internal server error',
            timestamp: new Date().toISOString(),
          })}\n\n`);
          res.end();
        } catch (writeError) {
          logger.error('[BatchController] Error sending error event:', writeError);
        }
      }
    }
  };
}

// Export singleton instance
export const batchController = new BatchController();
