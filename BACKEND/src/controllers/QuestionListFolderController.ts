import { Request, Response } from 'express';
import questionListFolderService from '../services/questionListFolderService';

export class QuestionListFolderController {
  async listFolders(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const folders = await questionListFolderService.listUserFolders(userId);

      return res.json({
        success: true,
        data: folders,
      });
    } catch (error: any) {
      console.error('[QuestionListFolderController] Error listing folders:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to list folders',
      });
    }
  }

  async createFolder(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { name, description, parent_id, color, icon } = req.body;

      if (!name || name.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Folder name is required',
        });
      }

      const folder = await questionListFolderService.createFolder(userId, {
        name: name.trim(),
        description,
        parent_id,
        color,
        icon,
      });

      return res.status(201).json({
        success: true,
        data: folder,
      });
    } catch (error: any) {
      console.error('[QuestionListFolderController] Error creating folder:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to create folder',
      });
    }
  }

  async updateFolder(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { folderId } = req.params;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const updates = req.body;

      const folder = await questionListFolderService.updateFolder(folderId, userId, updates);

      return res.json({
        success: true,
        data: folder,
      });
    } catch (error: any) {
      console.error('[QuestionListFolderController] Error updating folder:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to update folder',
      });
    }
  }

  async deleteFolder(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { folderId } = req.params;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await questionListFolderService.deleteFolder(folderId, userId);

      return res.json({
        success: true,
        message: 'Folder deleted successfully',
      });
    } catch (error: any) {
      console.error('[QuestionListFolderController] Error deleting folder:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete folder',
      });
    }
  }
}

export default new QuestionListFolderController();
