import { SupabaseClient } from '@supabase/supabase-js';
import {
  Comment,
  CreateCommentDTO,
  UpdateCommentDTO,
  CommentWithReplies,
} from '../types/comments';
import logger from '../../../utils/logger';

export class CommentService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Criar um novo comentário
   */
  async createComment(
    userId: string,
    data: CreateCommentDTO,
    isStaffReply: boolean = false
  ): Promise<Comment> {
    try {
      const now = new Date().toISOString();
      const { v4: uuidv4 } = require('uuid');
      
      const commentData = {
        id: uuidv4(),
        user_id: userId,
        content_id: data.content_id,
        content_type: data.content_type,
        parent_id: data.parent_id || null,
        content: data.content,
        is_staff_reply: isStaffReply,
        is_approved: true, // Todos os comentários são aprovados automaticamente
        is_deleted: false,
        like_count: 0,
        reply_count: 0,
        created_at: now,
        updated_at: now,
      };

      const { data: comment, error } = await this.supabase
        .from('comments')
        .insert(commentData)
        .select()
        .single();

      if (error) throw error;

      // Se for uma resposta, incrementar reply_count do pai
      if (data.parent_id) {
        await this.incrementReplyCount(data.parent_id);
      }

      return this.formatComment(comment);
    } catch (error) {
      logger.error('[CommentService] Erro ao criar comentário:', error);
      throw error;
    }
  }

  /**
   * Buscar comentários de uma questão
   */
  async getQuestionComments(
    questionId: string
  ): Promise<CommentWithReplies[]> {
    try {
      // Todos os comentários são aprovados automaticamente, então não precisa filtrar
      const query = this.supabase
        .from('comments')
        .select('*')
        .eq('content_id', questionId)
        .eq('content_type', 'question')
        .eq('is_deleted', false)
        .is('parent_id', null)
        .order('created_at', { ascending: false });

      const { data: comments, error } = await query;

      if (error) throw error;

      if (!comments || comments.length === 0) return [];

      // OTIMIZAÇÃO: Buscar TODOS os dados necessários em paralelo
      const [repliesData, usersData] = await Promise.all([
        // Buscar TODAS as replies de uma vez
        this.supabase
          .from('comments')
          .select('*')
          .in('parent_id', comments.map(c => c.id))
          .eq('is_deleted', false)
          .order('created_at', { ascending: true }),
        
        // Buscar TODOS os usuários de uma vez (comentários + replies)
        (async () => {
          const allUserIds = [...new Set(comments.map(c => c.user_id).filter(Boolean))];
          if (allUserIds.length === 0) return { data: [] };
          
          return this.supabase
            .from('users')
            .select('id, display_name, photo_url')
            .in('id', allUserIds);
        })()
      ]);

      // Criar mapa de usuários para lookup rápido
      const usersMap = new Map(
        (usersData.data || []).map(u => [u.id, u])
      );

      // Agrupar replies por parent_id
      const repliesByParent = new Map<string, any[]>();
      (repliesData.data || []).forEach(reply => {
        if (!repliesByParent.has(reply.parent_id)) {
          repliesByParent.set(reply.parent_id, []);
        }
        repliesByParent.get(reply.parent_id)!.push(reply);
      });

      // Buscar usuários das replies (se houver)
      const replyUserIds = [...new Set((repliesData.data || []).map(r => r.user_id).filter(Boolean))];
      if (replyUserIds.length > 0) {
        const { data: replyUsers } = await this.supabase
          .from('users')
          .select('id, display_name, photo_url')
          .in('id', replyUserIds);
        
        (replyUsers || []).forEach(u => usersMap.set(u.id, u));
      }

      // Montar comentários com replies e dados de usuários
      const commentsWithReplies = comments.map(comment => {
        const user = usersMap.get(comment.user_id);
        const replies = (repliesByParent.get(comment.id) || []).map(reply => {
          const replyUser = usersMap.get(reply.user_id);
          return {
            ...this.formatComment(reply),
            user_name: replyUser?.display_name || 'Usuário Anônimo',
            user_photo: replyUser?.photo_url || null,
          };
        });

        return {
          ...this.formatComment(comment),
          user_name: user?.display_name || 'Usuário Anônimo',
          user_photo: user?.photo_url || null,
          replies,
        };
      });

      return commentsWithReplies;
    } catch (error) {
      logger.error('[CommentService] Erro ao buscar comentários:', error);
      throw error;
    }
  }



  /**
   * Atualizar um comentário
   */
  async updateComment(
    commentId: string,
    userId: string,
    data: UpdateCommentDTO,
    isAdmin: boolean = false
  ): Promise<Comment> {
    try {
      // Verificar se o usuário é o dono do comentário ou admin
      const { data: comment, error: fetchError } = await this.supabase
        .from('comments')
        .select('*')
        .eq('id', commentId)
        .single();

      if (fetchError) throw fetchError;
      if (!comment) throw new Error('Comentário não encontrado');

      if (comment.user_id !== userId && !isAdmin) {
        throw new Error('Sem permissão para editar este comentário');
      }

      const updateData: any = {
        ...data,
        updated_at: new Date().toISOString(),
      };

      const { data: updated, error } = await this.supabase
        .from('comments')
        .update(updateData)
        .eq('id', commentId)
        .select()
        .single();

      if (error) throw error;

      return this.formatComment(updated);
    } catch (error) {
      logger.error('[CommentService] Erro ao atualizar comentário:', error);
      throw error;
    }
  }

  /**
   * Deletar um comentário (soft delete)
   */
  async deleteComment(
    commentId: string,
    userId: string,
    isAdmin: boolean = false
  ): Promise<void> {
    try {
      const { data: comment, error: fetchError } = await this.supabase
        .from('comments')
        .select('*')
        .eq('id', commentId)
        .single();

      if (fetchError) throw fetchError;
      if (!comment) throw new Error('Comentário não encontrado');

      if (comment.user_id !== userId && !isAdmin) {
        throw new Error('Sem permissão para deletar este comentário');
      }

      const { error } = await this.supabase
        .from('comments')
        .update({
          is_deleted: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', commentId);

      if (error) throw error;

      // Se for uma resposta, decrementar reply_count do pai
      if (comment.parent_id) {
        await this.decrementReplyCount(comment.parent_id);
      }
    } catch (error) {
      logger.error('[CommentService] Erro ao deletar comentário:', error);
      throw error;
    }
  }

  /**
   * Curtir um comentário
   */
  async likeComment(commentId: string): Promise<void> {
    try {
      const { error } = await this.supabase.rpc('increment_comment_likes', {
        comment_id: commentId,
      });

      if (error) {
        // Fallback se a função não existir
        const { data: comment } = await this.supabase
          .from('comments')
          .select('like_count')
          .eq('id', commentId)
          .single();

        if (comment) {
          await this.supabase
            .from('comments')
            .update({ like_count: (comment.like_count || 0) + 1 })
            .eq('id', commentId);
        }
      }
    } catch (error) {
      logger.error('[CommentService] Erro ao curtir comentário:', error);
      throw error;
    }
  }



  // Métodos auxiliares privados

  private async incrementReplyCount(parentId: string): Promise<void> {
    const { data: parent } = await this.supabase
      .from('comments')
      .select('reply_count')
      .eq('id', parentId)
      .single();

    if (parent) {
      await this.supabase
        .from('comments')
        .update({ reply_count: (parent.reply_count || 0) + 1 })
        .eq('id', parentId);
    }
  }

  private async decrementReplyCount(parentId: string): Promise<void> {
    const { data: parent } = await this.supabase
      .from('comments')
      .select('reply_count')
      .eq('id', parentId)
      .single();

    if (parent && parent.reply_count > 0) {
      await this.supabase
        .from('comments')
        .update({ reply_count: parent.reply_count - 1 })
        .eq('id', parentId);
    }
  }

  private formatComment(comment: any): Comment {
    return {
      id: comment.id,
      user_id: comment.user_id,
      content_id: comment.content_id,
      content_type: comment.content_type,
      parent_id: comment.parent_id,
      content: comment.content,
      is_approved: comment.is_approved,
      is_deleted: comment.is_deleted,
      is_staff_reply: comment.is_staff_reply || false,
      like_count: comment.like_count || 0,
      reply_count: comment.reply_count || 0,
      created_at:
        typeof comment.created_at === 'object'
          ? new Date(comment.created_at._seconds * 1000).toISOString()
          : comment.created_at,
      updated_at:
        typeof comment.updated_at === 'object'
          ? new Date(comment.updated_at._seconds * 1000).toISOString()
          : comment.updated_at,
    };
  }
}
