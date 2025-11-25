import { Request, Response } from 'express';
import { CommentService } from '../services/CommentService';
import logger from '../../../utils/logger';

export class CommentController {
  constructor(private commentService: CommentService) {}

  /**
   * Criar um novo comentário
   */
  createComment = async (req: any, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Usuário não autenticado',
        });
      }

      const { content_id, content_type, parent_id, content } = req.body;

      if (!content_id || !content_type || !content) {
        return res.status(400).json({
          success: false,
          error: 'Dados incompletos',
        });
      }

      // Verificar se é staff reply (apenas admins)
      const isStaffReply = req.user?.role === 'ADMIN';

      const comment = await this.commentService.createComment(
        userId,
        { content_id, content_type, parent_id, content },
        isStaffReply
      );

      return res.status(201).json({
        success: true,
        data: comment,
      });
    } catch (error: any) {
      logger.error('[CommentController] Erro ao criar comentário:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Erro ao criar comentário',
      });
    }
  };

  /**
   * Buscar comentários de uma questão
   */
  getQuestionComments = async (req: Request, res: Response) => {
    try {
      const { questionId } = req.params;

      const comments = await this.commentService.getQuestionComments(questionId);

      res.status(200).json({
        success: true,
        data: comments,
      });
    } catch (error: any) {
      logger.error('[CommentController] Erro ao buscar comentários:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Erro ao buscar comentários',
      });
    }
  };

  /**
   * Atualizar um comentário
   */
  updateComment = async (req: any, res: Response) => {
    try {
      const userId = req.user?.id;
      const isAdmin = req.user?.role === 'ADMIN';
      const { commentId } = req.params;
      const { content, is_approved, is_deleted } = req.body;

      const comment = await this.commentService.updateComment(
        commentId,
        userId,
        { content, is_approved, is_deleted },
        isAdmin
      );

      res.status(200).json({
        success: true,
        data: comment,
      });
    } catch (error: any) {
      logger.error('[CommentController] Erro ao atualizar comentário:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Erro ao atualizar comentário',
      });
    }
  };

  /**
   * Deletar um comentário
   */
  deleteComment = async (req: any, res: Response) => {
    try {
      const userId = req.user?.id;
      const isAdmin = req.user?.role === 'ADMIN';
      const { commentId } = req.params;

      await this.commentService.deleteComment(commentId, userId, isAdmin);

      res.status(200).json({
        success: true,
        message: 'Comentário deletado com sucesso',
      });
    } catch (error: any) {
      logger.error('[CommentController] Erro ao deletar comentário:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Erro ao deletar comentário',
      });
    }
  };

  /**
   * Curtir um comentário
   */
  likeComment = async (req: Request, res: Response) => {
    try {
      const { commentId } = req.params;

      await this.commentService.likeComment(commentId);

      res.status(200).json({
        success: true,
        message: 'Comentário curtido com sucesso',
      });
    } catch (error: any) {
      logger.error('[CommentController] Erro ao curtir comentário:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Erro ao curtir comentário',
      });
    }
  };


}
