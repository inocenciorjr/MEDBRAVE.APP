import { useState, useEffect, useCallback } from 'react';
import { errorNotebookFolderService, ErrorNotebookFolder } from '@/services/errorNotebookFolderService';

export function useErrorNotebookFolders() {
  const [folders, setFolders] = useState<ErrorNotebookFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFolders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await errorNotebookFolderService.listFolders();
      setFolders(data);
    } catch (err) {
      console.error('Erro ao carregar pastas:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar pastas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  const createFolder = useCallback(async (payload: Parameters<typeof errorNotebookFolderService.createFolder>[0]) => {
    const newFolder = await errorNotebookFolderService.createFolder(payload);
    setFolders(prev => [...prev, newFolder]);
    return newFolder;
  }, []);

  const updateFolder = useCallback(async (id: string, payload: Parameters<typeof errorNotebookFolderService.updateFolder>[1]) => {
    const updatedFolder = await errorNotebookFolderService.updateFolder(id, payload);
    setFolders(prev => prev.map(f => f.id === id ? updatedFolder : f));
    return updatedFolder;
  }, []);

  const deleteFolder = useCallback(async (id: string) => {
    await errorNotebookFolderService.deleteFolder(id);
    setFolders(prev => prev.filter(f => f.id !== id));
  }, []);

  const refetch = useCallback(() => {
    return fetchFolders();
  }, [fetchFolders]);

  return {
    folders,
    loading,
    error,
    createFolder,
    updateFolder,
    deleteFolder,
    refetch,
  };
}
