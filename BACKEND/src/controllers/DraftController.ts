/**
 * Draft Controller
 * Handles HTTP requests for draft management
 */
import { Request, Response } from 'express';
import { draftService, DraftService } from '../services/draftService';
import logger from '../utils/logger';

export class DraftController {
  private draftService: DraftService;

  constructor(service?: DraftService) {
    this.draftService = service || draftService;
  }

  /**
   * GET /drafts/:id
   * Get draft by ID
   */
  getById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Draft ID is required',
        });
        return;
      }

      const draft = await this.draftService.getById(id);

      if (!draft) {
        res.status(404).json({
          success: false,
          error: 'Draft not found or expired',
        });
        return;
      }

      res.json({
        success: true,
        data: draft,
      });
    } catch (error) {
      logger.error('[DraftController] Error in getById:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  };

  /**
   * DELETE /drafts/:id
   * Delete draft by ID
   */
  delete = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Draft ID is required',
        });
        return;
      }

      await this.draftService.delete(id);

      res.status(204).send();
    } catch (error) {
      logger.error('[DraftController] Error in delete:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  };

  /**
   * GET /drafts
   * List all drafts (optionally filter by jobId)
   */
  list = async (req: Request, res: Response): Promise<void> => {
    try {
      const { jobId } = req.query;

      const drafts = await this.draftService.list(jobId as string | undefined);

      res.json({
        success: true,
        data: drafts,
      });
    } catch (error) {
      logger.error('[DraftController] Error in list:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  };
}

// Export singleton instance
export const draftController = new DraftController();
