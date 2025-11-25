import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export interface QuestionListFolder {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  parent_id?: string;
  color?: string;
  icon?: string;
  order: number;
  list_count: number;
  status: string;
  created_at: Date;
  updated_at: Date;
}

class QuestionListFolderService {
  async listUserFolders(userId: string): Promise<QuestionListFolder[]> {
    const { data, error } = await supabase
      .from('question_list_folders')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('order', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async createFolder(userId: string, folderData: Partial<QuestionListFolder>): Promise<QuestionListFolder> {
    const { data, error } = await supabase
      .from('question_list_folders')
      .insert({
        id: `folder-${Date.now()}`,
        user_id: userId,
        name: folderData.name,
        description: folderData.description || '',
        parent_id: folderData.parent_id || null,
        color: folderData.color || '#8B5CF6',
        icon: folderData.icon || 'folder',
        order: folderData.order || 0,
        list_count: 0,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateFolder(folderId: string, userId: string, updates: Partial<QuestionListFolder>): Promise<QuestionListFolder> {
    const { data, error } = await supabase
      .from('question_list_folders')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', folderId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteFolder(folderId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('question_list_folders')
      .update({ status: 'deleted', updated_at: new Date().toISOString() })
      .eq('id', folderId)
      .eq('user_id', userId);

    if (error) throw error;
  }
}

export default new QuestionListFolderService();
