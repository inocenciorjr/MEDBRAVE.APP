import { fetchWithAuth } from '@/lib/utils/fetchWithAuth';

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
  created_at: string;
  updated_at: string;
}

export interface CreateFolderPayload {
  name: string;
  description?: string;
  parent_id?: string;
  color?: string;
  icon?: string;
  order?: number;
}

export interface UpdateFolderPayload {
  name?: string;
  description?: string;
  parent_id?: string;
  color?: string;
  icon?: string;
  order?: number;
}

class ErrorNotebookFolderService {
  async listFolders(): Promise<ErrorNotebookFolder[]> {
    const response = await fetchWithAuth('/error-notebook-folders');
    const data = await response.json();
    // O backend retorna direto o array de pastas
    if (Array.isArray(data)) {
      return data;
    }
    return [];
  }

  async getFolder(id: string): Promise<ErrorNotebookFolder> {
    const response = await fetchWithAuth(`/error-notebook-folders/${id}`);
    return await response.json();
  }

  async createFolder(payload: CreateFolderPayload): Promise<ErrorNotebookFolder> {
    const response = await fetchWithAuth('/error-notebook-folders', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return await response.json();
  }

  async updateFolder(id: string, payload: UpdateFolderPayload): Promise<ErrorNotebookFolder> {
    const response = await fetchWithAuth(`/error-notebook-folders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return await response.json();
  }

  async deleteFolder(id: string): Promise<void> {
    await fetchWithAuth(`/error-notebook-folders/${id}`, {
      method: 'DELETE',
    });
  }

  async updateCounts(): Promise<void> {
    await fetchWithAuth('/error-notebook-folders/update-counts', {
      method: 'POST',
    });
  }
}

export const errorNotebookFolderService = new ErrorNotebookFolderService();
