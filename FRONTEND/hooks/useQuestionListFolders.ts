import { useState, useEffect } from 'react';
import api from '@/services/api';

export interface QuestionList {
  id: string;
  name: string;
  question_count: number;
  created_at: string;
}

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
  created_at: string;
  updated_at: string;
  children?: QuestionListFolder[];
  lists?: QuestionList[];
}

export function useQuestionListFolders() {
  const [folders, setFolders] = useState<QuestionListFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFolders = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Buscando pastas e listas...');
      const [foldersResponse, listsResponse] = await Promise.all([
        api.get('/banco-questoes/folders'),
        api.get('/question-lists')
      ]);
      
      console.log('📦 Resposta de pastas:', foldersResponse.data);
      console.log('📄 Resposta de listas:', listsResponse.data);
      
      if (foldersResponse.data.success) {
        // Organizar em hierarquia
        const folderMap = new Map<string, QuestionListFolder>();
        const rootFolders: QuestionListFolder[] = [];

        console.log('📁 Total de pastas recebidas:', foldersResponse.data.data.length);

        // Primeiro, criar o mapa de todas as pastas
        foldersResponse.data.data.forEach((folder: QuestionListFolder) => {
          folderMap.set(folder.id, { ...folder, children: [], lists: [] });
        });

        // Adicionar listas às pastas
        if (listsResponse.data.success) {
          console.log('📄 Total de listas recebidas:', listsResponse.data.data.length);
          
          listsResponse.data.data.forEach((list: any) => {
            // Ignorar listas sem ID (dados corrompidos)
            if (!list.id) {
              console.warn('⚠️ Lista sem ID encontrada:', list);
              return;
            }

            if (list.folder_id) {
              const folder = folderMap.get(list.folder_id);
              if (folder) {
                folder.lists = folder.lists || [];
                folder.lists.push({
                  id: list.id,
                  name: list.name,
                  question_count: list.question_count,
                  created_at: typeof list.created_at === 'object' && list.created_at?.value 
                    ? list.created_at.value 
                    : list.created_at,
                });
              } else {
                console.warn('⚠️ Pasta não encontrada para lista:', list.name, 'folder_id:', list.folder_id);
              }
            } else {
              console.log('📄 Lista sem pasta:', list.name);
            }
          });
        }

        // Depois, organizar a hierarquia
        foldersResponse.data.data.forEach((folder: QuestionListFolder) => {
          const folderWithChildren = folderMap.get(folder.id)!;
          
          if (folder.parent_id) {
            const parent = folderMap.get(folder.parent_id);
            if (parent) {
              parent.children = parent.children || [];
              parent.children.push(folderWithChildren);
            } else {
              // Se o pai não existe, adicionar como raiz
              console.warn('⚠️ Pasta pai não encontrada, adicionando como raiz:', folder.name);
              rootFolders.push(folderWithChildren);
            }
          } else {
            rootFolders.push(folderWithChildren);
          }
        });

        console.log('✅ Pastas raiz organizadas:', rootFolders.length);
        console.log('📊 Estrutura final:', rootFolders);

        setFolders(rootFolders);
      }
    } catch (err: any) {
      console.error('Error fetching folders:', err);
      setError(err.response?.data?.error || 'Failed to load folders');
    } finally {
      setLoading(false);
    }
  };

  const createFolder = async (data: {
    name: string;
    description?: string;
    parent_id?: string;
    color?: string;
    icon?: string;
  }) => {
    try {
      const response = await api.post('/banco-questoes/folders', data);
      
      if (response.data.success) {
        const newFolder: QuestionListFolder = {
          ...response.data.data,
          children: [],
          lists: [],
        };

        // Adicionar a pasta localmente sem recarregar tudo
        setFolders((prevFolders) => {
          if (!data.parent_id) {
            // Adicionar como pasta raiz
            return [...prevFolders, newFolder];
          } else {
            // Adicionar como subpasta
            const addToParent = (folders: QuestionListFolder[]): QuestionListFolder[] => {
              return folders.map((folder) => {
                if (folder.id === data.parent_id) {
                  return {
                    ...folder,
                    children: [...(folder.children || []), newFolder],
                  };
                }
                if (folder.children && folder.children.length > 0) {
                  return {
                    ...folder,
                    children: addToParent(folder.children),
                  };
                }
                return folder;
              });
            };
            return addToParent(prevFolders);
          }
        });

        return newFolder;
      }
    } catch (err: any) {
      console.error('Error creating folder:', err);
      throw new Error(err.response?.data?.error || 'Failed to create folder');
    }
  };

  const updateFolder = async (folderId: string, data: Partial<QuestionListFolder>) => {
    try {
      const response = await api.put(`/banco-questoes/folders/${folderId}`, data);
      
      if (response.data.success) {
        await fetchFolders(); // Recarregar lista
        return response.data.data;
      }
    } catch (err: any) {
      console.error('Error updating folder:', err);
      throw new Error(err.response?.data?.error || 'Failed to update folder');
    }
  };

  const deleteFolder = async (folderId: string) => {
    try {
      const response = await api.delete(`/banco-questoes/folders/${folderId}`);
      
      if (response.data.success) {
        await fetchFolders(); // Recarregar lista
      }
    } catch (err: any) {
      console.error('Error deleting folder:', err);
      throw new Error(err.response?.data?.error || 'Failed to delete folder');
    }
  };

  useEffect(() => {
    fetchFolders();
  }, []);

  return {
    folders,
    loading,
    error,
    createFolder,
    updateFolder,
    deleteFolder,
    refetch: fetchFolders,
  };
}
