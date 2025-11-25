import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export interface ErrorNotebookFolder {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  parent_id?: string;
  color?: string;
  icon?: string;
  order: number;
  entry_count: number;
  status: string;
  created_at: Date;
  updated_at: Date;
}

class ErrorNotebookFolderService {
  async listUserFolders(userId: string): Promise<ErrorNotebookFolder[]> {
    const { data, error } = await supabase
      .from('error_notebook_folders')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('order', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async createFolder(userId: string, folderData: Partial<ErrorNotebookFolder>): Promise<ErrorNotebookFolder> {
    const { data, error } = await supabase
      .from('error_notebook_folders')
      .insert({
        user_id: userId,
        name: folderData.name,
        description: folderData.description || '',
        parent_id: folderData.parent_id || null,
        color: folderData.color || '#6366f1',
        icon: folderData.icon || 'folder',
        order: folderData.order || 0,
        entry_count: 0,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateFolder(folderId: string, userId: string, updates: Partial<ErrorNotebookFolder>): Promise<ErrorNotebookFolder> {
    const { data, error } = await supabase
      .from('error_notebook_folders')
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
    // Soft delete
    const { error } = await supabase
      .from('error_notebook_folders')
      .update({ status: 'deleted', updated_at: new Date().toISOString() })
      .eq('id', folderId)
      .eq('user_id', userId);

    if (error) throw error;
  }

  async getFolderById(folderId: string, userId: string): Promise<ErrorNotebookFolder | null> {
    const { data, error } = await supabase
      .from('error_notebook_folders')
      .select('*')
      .eq('id', folderId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return data;
  }

  async updateFolderEntryCounts(userId: string): Promise<void> {
    // Atualizar contagem de entries em cada pasta
    const { error } = await supabase.rpc('update_error_notebook_folder_counts', {
      p_user_id: userId
    });

    if (error) throw error;
  }
}

export default new ErrorNotebookFolderService();
