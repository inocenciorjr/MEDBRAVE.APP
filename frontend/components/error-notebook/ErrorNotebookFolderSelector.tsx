'use client';

import { useState, useEffect } from 'react';
import { useErrorNotebookFolders } from '@/hooks/useErrorNotebookFolders';
import { ErrorNotebookFolder } from '@/services/errorNotebookFolderService';
import { useToast } from '@/lib/contexts/ToastContext';

interface ErrorNotebookFolderSelectorProps {
  selectedFolder: string | null;
  onSelectFolder: (folderId: string | null) => void;
}

export default function ErrorNotebookFolderSelector({
  selectedFolder,
  onSelectFolder,
}: ErrorNotebookFolderSelectorProps) {
  const { folders, loading, createFolder } = useErrorNotebookFolders();
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const toast = useToast();
  const [mounted, setMounted] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
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
      toast.success('Pasta criada com sucesso!');
    } catch (error) {
      console.error('Failed to create folder:', error);
      toast.error('Erro ao criar pasta. Tente novamente.');
    }
  };

  const renderFolder = (folder: ErrorNotebookFolder, level: number = 0) => {
    const isExpanded = mounted && expandedFolders.has(folder.id);
    const isSelected = selectedFolder === folder.id;

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
            {folder.entry_count > 0 && (
              <span className="ml-auto text-xs text-text-light-secondary dark:text-text-dark-secondary">
                {folder.entry_count}
              </span>
            )}
          </div>
          
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setCreatingFolder(folder.id);
              setNewFolderName('');
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
          onClick={() => onSelectFolder(null)}
          className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            selectedFolder === null
              ? 'bg-primary/10 dark:bg-primary/20 text-primary'
              : 'hover:bg-gray-100 dark:hover:bg-zinc-700 text-text-light-primary dark:text-text-dark-primary'
          }`}
          type="button"
        >
          <span className="material-symbols-outlined text-base">folder_off</span>
          <span>Sem pasta (Raiz)</span>
        </button>
        
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
