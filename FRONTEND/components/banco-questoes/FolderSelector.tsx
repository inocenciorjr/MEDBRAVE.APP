'use client';

import { useState, useEffect } from 'react';
import { useQuestionListFolders, QuestionListFolder } from '@/hooks/useQuestionListFolders';
import { useToast } from '@/lib/contexts/ToastContext';

interface FolderSelectorProps {
  selectedFolder: string | null;
  onSelectFolder: (folderId: string) => void;
  showLists?: boolean;
  onSelectList?: (listId: string) => void;
}

export default function FolderSelector({
  selectedFolder,
  onSelectFolder,
  showLists = false,
  onSelectList,
}: FolderSelectorProps) {
  const { folders, loading, createFolder } = useQuestionListFolders();
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const toast = useToast();
  const [mounted, setMounted] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState<string | null>(null); // ID da pasta pai ou 'root'
  const [newFolderName, setNewFolderName] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        // Ao colapsar, remover também todas as subpastas
        newSet.delete(folderId);
        const removeChildren = (folder: QuestionListFolder) => {
          if (folder.children) {
            folder.children.forEach((child) => {
              newSet.delete(child.id);
              removeChildren(child);
            });
          }
        };
        const folder = findFolder(folders, folderId);
        if (folder) {
          removeChildren(folder);
        }
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  const findFolder = (folderList: QuestionListFolder[], folderId: string): QuestionListFolder | null => {
    for (const folder of folderList) {
      if (folder.id === folderId) {
        return folder;
      }
      if (folder.children) {
        const found = findFolder(folder.children, folderId);
        if (found) return found;
      }
    }
    return null;
  };

  const handleCreateFolder = async (parentId?: string) => {
    if (!newFolderName.trim()) return;

    try {
      await createFolder({
        name: newFolderName.trim(),
        parent_id: parentId || undefined,
        color: '#8B5CF6',
        icon: 'folder',
      });
      setCreatingFolder(null);
      setNewFolderName('');
    } catch (error) {
      console.error('Failed to create folder:', error);
      toast.error('Erro ao criar pasta. Tente novamente.');
    }
  };

  const renderFolder = (folder: QuestionListFolder, level: number = 0) => {
    const isExpanded = mounted && expandedFolders.has(folder.id);
    const isSelected = selectedFolder === folder.id;
    const hasChildren = folder.children && folder.children.length > 0;
    const hasLists = showLists && folder.lists && folder.lists.length > 0;
    const hasContent = hasChildren || hasLists;

    return (
      <li key={folder.id}>
        <div className="flex items-center gap-1">
          <div
            className={`flex items-center flex-1 p-2 rounded-md cursor-pointer transition-colors ${
              isSelected
                ? 'bg-primary/10 dark:bg-primary/20'
                : 'hover:bg-gray-100 dark:hover:bg-zinc-700'
            }`}
            style={{ paddingLeft: `${level * 1.5 + 0.5}rem` }}
            onClick={() => onSelectFolder(folder.id)}
          >
            {hasContent ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFolder(folder.id);
                }}
                className="mr-1"
              >
                <span className="material-symbols-outlined text-xl text-text-light-secondary dark:text-text-dark-secondary">
                  {isExpanded ? 'expand_more' : 'chevron_right'}
                </span>
              </button>
            ) : (
              <span className="w-6 mr-1"></span>
            )}
            <span className={`material-symbols-outlined text-xl mr-2 ${
              isSelected ? 'text-primary dark:text-purple-400' : 'text-primary dark:text-purple-400'
            }`}>
              {isExpanded ? 'folder_open' : 'folder'}
            </span>
            <span className={`font-medium text-sm ${
              isSelected ? 'text-primary dark:text-white font-semibold' : 'text-text-light-primary dark:text-text-dark-primary'
            }`}>
              {folder.name}
            </span>
          </div>
          
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setCreatingFolder(folder.id);
              setNewFolderName('');
              // Expandir automaticamente a pasta ao criar subpasta
              if (!isExpanded) {
                setExpandedFolders((prev) => {
                  const newSet = new Set(prev);
                  newSet.add(folder.id);
                  return newSet;
                });
              }
            }}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-zinc-600 transition-colors"
            title="Criar subpasta"
          >
            <span className="material-symbols-outlined text-base text-text-light-secondary dark:text-text-dark-secondary">
              create_new_folder
            </span>
          </button>
        </div>

        {/* Formulário de criação de subpasta */}
        {creatingFolder === folder.id && (
          <div className="mt-1" style={{ paddingLeft: `${(level + 1) * 1.5 + 0.5}rem` }}>
            <div className="flex items-center gap-2 p-2">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateFolder(folder.id);
                  } else if (e.key === 'Escape') {
                    setCreatingFolder(null);
                    setNewFolderName('');
                  }
                }}
                placeholder="Nome da pasta"
                className="flex-1 px-2 py-1 text-sm border border-border-light dark:border-border-dark rounded bg-background-light dark:bg-background-dark text-text-light-primary dark:text-text-dark-primary"
                autoFocus
              />
              <button
                type="button"
                onClick={() => handleCreateFolder(folder.id)}
                className="p-1 text-green-600 hover:bg-green-100 dark:hover:bg-green-900 rounded"
              >
                <span className="material-symbols-outlined text-base">check</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setCreatingFolder(null);
                  setNewFolderName('');
                }}
                className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900 rounded"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>
          </div>
        )}

        {/* Listas e Pastas filhas */}
        {isExpanded && (
          <>
            {/* Listas dentro da pasta */}
            {showLists && folder.lists && folder.lists.length > 0 && (
              <ul className="space-y-1 mt-1">
                {folder.lists.map((list) => (
                  <li key={list.id}>
                    <div
                      className="flex items-center p-2 rounded-md cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-zinc-800"
                      style={{ paddingLeft: `${(level + 1) * 1.5 + 0.5}rem` }}
                      onClick={() => onSelectList?.(list.id)}
                    >
                      <span className="material-symbols-outlined text-lg mr-2 text-violet-500 dark:text-violet-400">
                        list_alt
                      </span>
                      <span className="text-sm text-text-light-primary dark:text-text-dark-primary flex-1">
                        {list.name}
                      </span>
                      <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                        {list.question_count} questões
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {/* Subpastas */}
            {folder.children && folder.children.length > 0 && (
              <ul className="space-y-1 mt-1">
                {folder.children.map((child) => renderFolder(child, level + 1))}
              </ul>
            )}
          </>
        )}
      </li>
    );
  };

  if (loading) {
    return (
      <div className="border border-border-light dark:border-border-dark rounded-lg p-4 shadow-sm">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-border-light dark:border-border-dark rounded-lg p-4 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={() => {
            setCreatingFolder('root');
            setNewFolderName('');
          }}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-primary dark:text-white bg-primary/10 dark:bg-primary/20 rounded-md hover:bg-primary/20 dark:hover:bg-primary/30 transition-colors shadow-sm"
          type="button"
        >
          <span className="material-symbols-outlined text-base">create_new_folder</span>
          <span>Nova Pasta</span>
        </button>
      </div>

      {creatingFolder === 'root' && (
        <div className="mb-3">
          <div className="flex items-center gap-2 p-2 border border-border-light dark:border-border-dark rounded-md">
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreateFolder();
                } else if (e.key === 'Escape') {
                  setCreatingFolder(null);
                  setNewFolderName('');
                }
              }}
              placeholder="Nome da pasta"
              className="flex-1 px-2 py-1 text-sm border-0 bg-transparent text-text-light-primary dark:text-text-dark-primary focus:outline-none"
              autoFocus
            />
            <button
              type="button"
              onClick={() => handleCreateFolder()}
              className="p-1 text-green-600 hover:bg-green-100 dark:hover:bg-green-900 rounded"
            >
              <span className="material-symbols-outlined text-base">check</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setCreatingFolder(null);
                setNewFolderName('');
              }}
              className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900 rounded"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>
        </div>
      )}

      <ul className="space-y-1 text-text-light-primary dark:text-text-dark-primary">
        {folders.length === 0 ? (
          <li className="text-sm text-text-light-secondary dark:text-text-dark-secondary text-center py-4">
            Nenhuma pasta criada. Clique em "Nova Pasta" para começar.
          </li>
        ) : (
          folders.map((folder) => renderFolder(folder))
        )}
      </ul>
    </div>
  );
}
