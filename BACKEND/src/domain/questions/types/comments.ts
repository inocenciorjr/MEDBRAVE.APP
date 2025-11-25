/**
 * Types for Question Comments System
 */

export interface Comment {
  id: string;
  user_id: string;
  content_id: string; // question_id
  content_type: string; // 'question'
  parent_id: string | null;
  content: string;
  is_approved: boolean;
  is_deleted: boolean;
  is_staff_reply: boolean;
  like_count: number;
  reply_count: number;
  created_at: string;
  updated_at: string;
  // Dados do usuário (join)
  user_name?: string;
  user_photo?: string;
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

export interface CommentWithReplies extends Comment {
  replies: Comment[];
}

export interface UpdateNote {
  id: string;
  title: string;
  content: string;
  created_by: string;
  filter_ids: string[];
  sub_filter_ids: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_updated_date: string;
  // Dados do criador (join)
  creator_name?: string;
}

export interface CreateUpdateNoteDTO {
  title: string;
  content: string;
  filter_ids: string[];
  sub_filter_ids: string[];
}

export interface UpdateUpdateNoteDTO {
  title?: string;
  content?: string;
  filter_ids?: string[];
  sub_filter_ids?: string[];
  is_active?: boolean;
  last_updated_date?: string;
}
