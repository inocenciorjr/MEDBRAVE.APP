import api from '@/services/api';

export interface Comment {
  id: string;
  user_id: string;
  content_id: string;
  content_type: string;
  parent_id: string | null;
  content: string;
  is_approved: boolean;
  is_deleted: boolean;
  is_staff_reply: boolean;
  like_count: number;
  reply_count: number;
  created_at: string;
  updated_at: string;
  user_name?: string;
  user_photo?: string;
  replies: Comment[];
}

export interface CreateCommentDTO {
  content_id: string;
  content_type: string;
  parent_id?: string | null;
  content: string;
}

export interface UpdateCommentDTO {
  content?: string;
  is_approved?: boolean;
  is_deleted?: boolean;
}

/**
 * Buscar comentários de uma questão
 */
export async function getQuestionComments(
  questionId: string
): Promise<Comment[]> {
  try {
    const response = await api.get(`/comments/question/${questionId}`);
    return response.data.data || [];
  } catch (error) {
    console.error('Erro ao buscar comentários:', error);
    throw error;
  }
}

/**
 * Criar um novo comentário
 */
export async function createComment(data: CreateCommentDTO): Promise<Comment> {
  try {
    const response = await api.post('/comments', data);
    return response.data.data;
  } catch (error) {
    console.error('Erro ao criar comentário:', error);
    throw error;
  }
}

/**
 * Atualizar um comentário
 */
export async function updateComment(
  commentId: string,
  data: UpdateCommentDTO
): Promise<Comment> {
  try {
    const response = await api.put(`/comments/${commentId}`, data);
    return response.data.data;
  } catch (error) {
    console.error('Erro ao atualizar comentário:', error);
    throw error;
  }
}

/**
 * Deletar um comentário
 */
export async function deleteComment(commentId: string): Promise<void> {
  try {
    await api.delete(`/comments/${commentId}`);
  } catch (error) {
    console.error('Erro ao deletar comentário:', error);
    throw error;
  }
}

/**
 * Curtir um comentário
 */
export async function likeComment(commentId: string): Promise<void> {
  try {
    await api.post(`/comments/${commentId}/like`);
  } catch (error) {
    console.error('Erro ao curtir comentário:', error);
    throw error;
  }
}


