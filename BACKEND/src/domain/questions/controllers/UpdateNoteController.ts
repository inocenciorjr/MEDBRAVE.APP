import { Request, Response } from 'express';
import { UpdateNoteService } from '../services/UpdateNoteService';
import logger from '../../../utils/logger';

export class UpdateNoteController {
  constructor(private updateNoteService: UpdateNoteService) {}

  /**
   * Criar uma nova nota de atualização (admin)
   */
  createUpdateNote = async (req: any, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Usuário não autenticado',
        });
      }

      const { title, content, filter_ids, sub_filter_ids } = req.body;

      if (!title || !content) {
        return res.status(400).json({
          success: false,
          error: 'Título e conteúdo são obrigatórios',
        });
      }

      const note = await this.updateNoteService.createUpdateNote(userId, {
        title,
        content,
        filter_ids: filter_ids || [],
        sub_filter_ids: sub_filter_ids || [],
      });

      return res.status(201).json({
        success: true,
        data: note,
      });
    } catch (error: any) {
      logger.error('[UpdateNoteController] Erro ao criar nota:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Erro ao criar nota',
      });
    }
  };

  /**
   * Buscar todas as notas (admin)
   */
  getAllUpdateNotes = async (req: Request, res: Response) => {
    try {
      const includeInactive = req.query.includeInactive === 'true';

      const notes = await this.updateNoteService.getAllUpdateNotes(includeInactive);

      res.status(200).json({
        success: true,
        data: notes,
      });
    } catch (error: any) {
      logger.error('[UpdateNoteController] Erro ao buscar notas:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Erro ao buscar notas',
      });
    }
  };

  /**
   * Buscar nota por ID
   */
  getUpdateNoteById = async (req: Request, res: Response) => {
    try {
      const { noteId } = req.params;

      const note = await this.updateNoteService.getUpdateNoteById(noteId);

      if (!note) {
        return res.status(404).json({
          success: false,
          error: 'Nota não encontrada',
        });
      }

      return res.status(200).json({
        success: true,
        data: note,
      });
    } catch (error: any) {
      logger.error('[UpdateNoteController] Erro ao buscar nota:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Erro ao buscar nota',
      });
    }
  };

  /**
   * Buscar notas aplicáveis a uma questão
   */
  getNotesForQuestion = async (req: Request, res: Response) => {
    try {
      const { questionId } = req.params;

      const notes = await this.updateNoteService.getNotesForQuestion(questionId);

      res.status(200).json({
        success: true,
        data: notes,
      });
    } catch (error: any) {
      logger.error('[UpdateNoteController] Erro ao buscar notas para questão:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Erro ao buscar notas',
      });
    }
  };

  /**
   * Atualizar uma nota (admin)
   */
  updateUpdateNote = async (req: Request, res: Response) => {
    try {
      const { noteId } = req.params;
      const { title, content, filter_ids, sub_filter_ids, is_active, last_updated_date } = req.body;

      const note = await this.updateNoteService.updateUpdateNote(noteId, {
        title,
        content,
        filter_ids,
        sub_filter_ids,
        is_active,
        last_updated_date,
      });

      res.status(200).json({
        success: true,
        data: note,
      });
    } catch (error: any) {
      logger.error('[UpdateNoteController] Erro ao atualizar nota:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Erro ao atualizar nota',
      });
    }
  };

  /**
   * Deletar uma nota (admin)
   */
  deleteUpdateNote = async (req: Request, res: Response) => {
    try {
      const { noteId } = req.params;

      await this.updateNoteService.deleteUpdateNote(noteId);

      res.status(200).json({
        success: true,
        message: 'Nota deletada com sucesso',
      });
    } catch (error: any) {
      logger.error('[UpdateNoteController] Erro ao deletar nota:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Erro ao deletar nota',
      });
    }
  };

  /**
   * Buscar questões que se aplicam a uma nota (admin)
   */
  getQuestionsForNote = async (req: Request, res: Response) => {
    try {
      const { noteId } = req.params;

      const questions = await this.updateNoteService.getQuestionsForNote(noteId);

      res.status(200).json({
        success: true,
        data: questions,
        count: questions.length,
      });
    } catch (error: any) {
      logger.error('[UpdateNoteController] Erro ao buscar questões para nota:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Erro ao buscar questões',
      });
    }
  };
}
