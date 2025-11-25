'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { useErrorNotebookFolders } from '@/hooks/useErrorNotebookFolders';
import { errorNotebookService, ErrorNotebookEntry } from '@/services/errorNotebookService';
import { useToast } from '@/lib/contexts/ToastContext';
import Checkbox from '@/components/ui/Checkbox';
import { SearchInput } from '@/components/flashcards/SearchInput';
import { ErrorNotebookItemMenu } from '@/components/error-notebook/ErrorNotebookItemMenu';
import { DeleteConfirmModal } from '@/components/error-notebook/DeleteConfirmModal';
import { EditItemModal } from '@/components/error-notebook/EditItemModal';
import { MoveToFolderModal } from '@/components/error-notebook/MoveToFolderModal';
import { useCadernoErrosEntries } from '@/hooks/queries';

interface NotebookItem {
  id: string;
  name: string;
  type: 'folder' | 'entry';
  created_at: string;
  parent_id?: string;
  // Campos específicos de entry
  question_subject?: string;
  difficulty?: string;
  year?: number;
  institution?: string;
  exam_type?: string;
}

export default function CadernoErrosPage() {
  const router = useRouter();
  const toast = useToast();
  const { folders, loading: loadingFolders, deleteFolder, updateFolder, refetch } = useErrorNotebookFolders();
  const [searchTerm, setSearchTerm] = useState('');
  const [showFolders, setShowFolders] = useState(true);
  const [showEntries, setShowEntries] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [sortBy, setSortBy] = useState<'name' | 'type' | 'date' | 'year' | 'institution' | 'exam_type'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [items, setItems] = useState<NotebookItem[]>([]);
  const [entries, setEntries] = useState<ErrorNotebookEntry[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<Array<{ id: string | null; name: string }>>([
    { id: null, name: 'Todos os Cadernos' }
  ]);

  // Estados para modais
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; item: NotebookItem | null }>({
    isOpen: false,
    item: null,
  });
  const [editFolderModal, setEditFolderModal] = useState<{ isOpen: boolean; item: NotebookItem | null }>({
    isOpen: false,
    item: null,
  });
  const [moveModal, setMoveModal] = useState<{ isOpen: boolean; item: NotebookItem | null }>({
    isOpen: false,
    item: null,
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [selectedEntries, setSelectedEntries] = useState<string[]>([]);

  // Usar React Query para carregar entries
  const { data: entriesData, isLoading: loadingEntries } = useCadernoErrosEntries();
  
  useEffect(() => {
    if (entriesData) {
      setEntries(entriesData);
    }
  }, [entriesData]);

  // Organizar itens (pastas e entries) baseado na pasta atual
  useEffect(() => {
    const organizeItems = () => {
      const allItems: NotebookItem[] = [];

      // Garantir que folders é um array
      const folderArray = Array.isArray(folders) ? folders : [];

      // Função recursiva para encontrar pasta e seus filhos
      const findFolderAndChildren = (folderList: any[], targetId: string | null): any[] => {
        if (targetId === null) {
          return folderList.filter(f => !f.parent_id);
        }

        for (const folder of folderList) {
          if (folder.id === targetId) {
            return folder.children || [];
          }
          if (folder.children && folder.children.length > 0) {
            const found = findFolderAndChildren(folder.children, targetId);
            if (found.length > 0) return found;
          }
        }
        return [];
      };

      // Adicionar subpastas
      const subfolders = findFolderAndChildren(folderArray, currentFolder);
      subfolders.forEach(folder => {
        allItems.push({
          id: folder.id,
          name: folder.name,
          type: 'folder',
          created_at: folder.created_at,
          parent_id: folder.parent_id
        });
      });

      // Adicionar entries da pasta atual
      const folderEntries = currentFolder === null
        ? entries.filter(e => !e.folder_id)
        : entries.filter(e => e.folder_id === currentFolder);

      folderEntries.forEach(entry => {
        allItems.push({
          id: entry.id,
          name: entry.question_statement.replace(/<[^>]*>/g, '').substring(0, 100), // Remove HTML e limita
          type: 'entry',
          created_at: entry.created_at,
          parent_id: entry.folder_id || undefined,
          question_subject: entry.question_subject,
          difficulty: entry.difficulty,
          year: entry.question_data?.year,
          institution: entry.question_data?.institution,
          exam_type: getExamType(entry.tags),
        });
      });

      setItems(allItems);
    };

    if (!loadingFolders && !loadingEntries) {
      organizeItems();
    }
  }, [folders, entries, loadingFolders, loadingEntries, currentFolder]);

  const getExamType = (tags: string[]): string => {
    if (tags.includes('Revalida')) return 'Revalida';
    if (tags.includes('Residência Médica')) return 'Residência';
    if (tags.includes('R3')) return 'R3';
    return '-';
  };

  // Filtrar e ordenar itens
  const filteredItems = useMemo(() => {
    let filtered = items;

    // Filtrar por tipo
    filtered = filtered.filter(item => {
      if (item.type === 'folder' && !showFolders) return false;
      if (item.type === 'entry' && !showEntries) return false;
      return true;
    });

    // Filtrar por busca
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.institution?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Ordenar
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
        case 'date':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'year':
          comparison = (a.year || 0) - (b.year || 0);
          break;
        case 'institution':
          comparison = (a.institution || '').localeCompare(b.institution || '');
          break;
        case 'exam_type':
          comparison = (a.exam_type || '').localeCompare(b.exam_type || '');
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [items, showFolders, showEntries, searchTerm, sortBy, sortOrder]);

  // Paginação
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredItems.slice(startIndex, endIndex);
  }, [filteredItems, currentPage, itemsPerPage]);

  // Reset para página 1 quando filtros mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, showFolders, showEntries]);

  const handleItemClick = (item: NotebookItem) => {
    if (item.type === 'folder') {
      setCurrentFolder(item.id);
      setBreadcrumbs([...breadcrumbs, { id: item.id, name: item.name }]);
    } else {
      // Abrir modal de revisão
      router.push(`/caderno-erros/${item.id}`);
    }
  };

  const handleEdit = (item: NotebookItem) => {
    if (item.type === 'folder') {
      setEditFolderModal({ isOpen: true, item });
    } else {
      // Redirecionar para a página de revisão da entry
      router.push(`/caderno-erros/${item.id}`);
    }
  };

  const handleDelete = (item: NotebookItem) => {
    setDeleteModal({ isOpen: true, item });
  };

  const handleReview = (item: NotebookItem) => {
    router.push(`/caderno-erros/${item.id}`);
  };

  const handleSaveEditFolder = async (name: string, description?: string) => {
    if (!editFolderModal.item) return;

    try {
      setIsSaving(true);
      await updateFolder(editFolderModal.item.id, { name, description });
      await refetch();
      setEditFolderModal({ isOpen: false, item: null });
      toast.success('Pasta atualizada com sucesso!');
    } catch (error: any) {
      console.error('Erro ao salvar pasta:', error);
      toast.error(error.message || 'Erro ao salvar pasta');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.item || isDeleting) return;

    try {
      setIsDeleting(true);
      
      if (deleteModal.item.type === 'folder') {
        await deleteFolder(deleteModal.item.id);
        toast.success('Pasta excluída com sucesso!');
      } else {
        await errorNotebookService.deleteEntry(deleteModal.item.id);
        // Recarregar entries
        const data = await errorNotebookService.getUserEntries({});
        setEntries(data.entries || []);
        toast.success('Caderno excluído com sucesso!');
      }

      await refetch();
      setDeleteModal({ isOpen: false, item: null });
    } catch (error: any) {
      console.error('Erro ao excluir:', error);
      // Ignorar erro de status 204 (é sucesso, mas o fetch está reclamando)
      if (error.message?.includes('204')) {
        // Recarregar entries mesmo assim
        try {
          const data = await errorNotebookService.getUserEntries({});
          setEntries(data.entries || []);
          await refetch();
          setDeleteModal({ isOpen: false, item: null });
          toast.success('Caderno excluído com sucesso!');
        } catch (reloadError) {
          console.error('Erro ao recarregar:', reloadError);
        }
      } else {
        toast.error(error.message || 'Erro ao excluir item');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMove = (item: NotebookItem) => {
    setMoveModal({ isOpen: true, item });
  };

  const handleConfirmMove = async (folderId: string | null) => {
    if (!moveModal.item) return;

    try {
      setIsMoving(true);

      if (moveModal.item.type === 'folder') {
        await updateFolder(moveModal.item.id, { parent_id: folderId || undefined });
        toast.success('Pasta movida com sucesso!');
      } else {
        await errorNotebookService.updateEntry(moveModal.item.id, {
          folder_id: folderId || undefined,
        });
        // Recarregar entries
        const data = await errorNotebookService.getUserEntries({});
        setEntries(data.entries || []);
        toast.success('Caderno movido com sucesso!');
      }

      await refetch();
      setMoveModal({ isOpen: false, item: null });
    } catch (error: any) {
      console.error('Erro ao mover:', error);
      toast.error(error.message || 'Erro ao mover item');
    } finally {
      setIsMoving(false);
    }
  };

  const handleToggleSelect = (itemId: string, itemType: 'folder' | 'entry') => {
    if (itemType === 'folder') return; // Não permitir selecionar pastas

    setSelectedEntries(prev => {
      if (prev.includes(itemId)) {
        return prev.filter(id => id !== itemId);
      } else {
        return [...prev, itemId];
      }
    });
  };

  const handleReviewSelected = () => {
    if (selectedEntries.length === 0) return;
    // Redirecionar para página de revisão em lote
    const ids = selectedEntries.join(',');
    router.push(`/caderno-erros/revisar?ids=${ids}`);
  };

  const handleBreadcrumbClick = (index: number) => {
    const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
    setBreadcrumbs(newBreadcrumbs);
    setCurrentFolder(newBreadcrumbs[newBreadcrumbs.length - 1].id);
  };

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'EASY': return 'Fácil';
      case 'MEDIUM': return 'Média';
      case 'HARD': return 'Difícil';
      case 'VERY_HARD': return 'Muito Difícil';
      default: return difficulty;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'EASY': return 'text-green-600 dark:text-green-400';
      case 'MEDIUM': return 'text-yellow-600 dark:text-yellow-400';
      case 'HARD': return 'text-orange-600 dark:text-orange-400';
      case 'VERY_HARD': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  if (loadingFolders || loadingEntries) {
    return null;
  }

  // Construir breadcrumb
  const breadcrumbItems = breadcrumbs.map((crumb, index) => {
    if (index === 0) {
      return { 
        label: 'Caderno de Erros', 
        icon: 'book', 
        href: '/caderno-erros',
        onClick: () => {
          setCurrentFolder(null);
          setBreadcrumbs([{ id: null, name: 'Todos os Cadernos' }]);
        }
      };
    }
    
    if (index === breadcrumbs.length - 1) {
      return {
        label: crumb.name,
        icon: 'folder_open'
      };
    }
    
    return {
      label: crumb.name,
      icon: 'folder_open',
      onClick: () => handleBreadcrumbClick(index)
    };
  });

  return (
    <>
      {/* Breadcrumb */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Breadcrumb items={breadcrumbItems} />
      </div>

      <div className="-m-4 md:-m-8 min-h-screen bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100 dark:from-black dark:via-background-dark dark:to-black">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <header className="mb-6">
            <h1 className="text-3xl font-semibold text-slate-700 dark:text-slate-200">
              Caderno de Erros
            </h1>
          </header>

          {/* Search and Actions Bar */}
          <div className="mb-6 bg-surface-light dark:bg-surface-dark rounded-lg shadow-md p-4">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <SearchInput
                  value={searchTerm}
                  onChange={setSearchTerm}
                  placeholder="Buscar por nome, instituição..."
                  fullWidth
                />
              </div>
              {selectedEntries.length > 0 && (
                <button
                  onClick={handleReviewSelected}
                  className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white font-semibold rounded-lg shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all whitespace-nowrap"
                >
                  <span className="material-symbols-outlined text-xl">visibility</span>
                  <span>Revisar ({selectedEntries.length})</span>
                </button>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="mb-6 bg-surface-light dark:bg-surface-dark rounded-lg shadow-md p-4">
            <div className="flex items-center gap-6">
              <span className="text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary">
                Exibir:
              </span>
              <div className="flex items-center gap-6">
                <Checkbox
                  label="Pastas"
                  checked={showFolders}
                  onChange={(e) => setShowFolders(e.target.checked)}
                />
                <Checkbox
                  label="Cadernos"
                  checked={showEntries}
                  onChange={(e) => setShowEntries(e.target.checked)}
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-surface-light dark:bg-surface-dark rounded-lg shadow-xl dark:shadow-dark-xl overflow-hidden">
            <table className="w-full text-left text-sm table-fixed">
              <thead className="text-text-light-secondary dark:text-text-dark-secondary border-b border-border-light dark:border-border-dark">
                <tr>
                  <th className="py-3 px-4 font-medium w-[30%]">
                    <button 
                      onClick={() => handleSort('name')}
                      className="flex items-center gap-2 hover:text-primary transition-colors"
                    >
                      <span className="material-symbols-outlined text-base">folder_open</span>
                      Nome
                      {sortBy === 'name' && (
                        <span className="material-symbols-outlined text-base">
                          {sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                        </span>
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-3 font-medium w-[10%]">
                    <button 
                      onClick={() => handleSort('type')}
                      className="flex items-center gap-1 hover:text-primary transition-colors"
                    >
                      <span className="material-symbols-outlined text-base">widgets</span>
                      Tipo
                      {sortBy === 'type' && (
                        <span className="material-symbols-outlined text-base">
                          {sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                        </span>
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-3 font-medium w-[12%]">
                    <button 
                      onClick={() => handleSort('date')}
                      className="flex items-center gap-1 hover:text-primary transition-colors"
                    >
                      <span className="material-symbols-outlined text-base">event</span>
                      Data
                      {sortBy === 'date' && (
                        <span className="material-symbols-outlined text-base">
                          {sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                        </span>
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-3 font-medium w-[10%]">
                    <button 
                      onClick={() => handleSort('year')}
                      className="flex items-center gap-1 hover:text-primary transition-colors"
                    >
                      <span className="material-symbols-outlined text-base">calendar_today</span>
                      Ano
                      {sortBy === 'year' && (
                        <span className="material-symbols-outlined text-base">
                          {sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                        </span>
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-3 font-medium w-[18%]">
                    <button 
                      onClick={() => handleSort('institution')}
                      className="flex items-center gap-1 hover:text-primary transition-colors"
                    >
                      <span className="material-symbols-outlined text-base">school</span>
                      Universidade
                      {sortBy === 'institution' && (
                        <span className="material-symbols-outlined text-base">
                          {sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                        </span>
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-3 font-medium w-[14%]">
                    <button 
                      onClick={() => handleSort('exam_type')}
                      className="flex items-center gap-1 hover:text-primary transition-colors"
                    >
                      <span className="material-symbols-outlined text-base">assignment</span>
                      Tipo de Prova
                      {sortBy === 'exam_type' && (
                        <span className="material-symbols-outlined text-base">
                          {sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                        </span>
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-2 font-medium w-[6%]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light dark:divide-border-dark">
                {paginatedItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-text-light-secondary dark:text-text-dark-secondary">
                      {filteredItems.length === 0 ? 'Nenhum caderno encontrado' : 'Nenhum item nesta página'}
                    </td>
                  </tr>
                ) : (
                  paginatedItems.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-sidebar-active-light dark:hover:bg-sidebar-active-dark/20 cursor-pointer transition-all duration-200 hover:shadow-md dark:hover:shadow-dark-lg"
                      onClick={() => handleItemClick(item)}
                    >
                      <td className="py-5 px-4">
                        <div className="flex items-center gap-3">
                          {item.type === 'entry' && (
                            <div onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={selectedEntries.includes(item.id)}
                                onChange={() => handleToggleSelect(item.id, item.type)}
                              />
                            </div>
                          )}
                          <span className="material-symbols-outlined text-base text-text-light-secondary dark:text-text-dark-secondary">
                            {item.type === 'folder' ? 'folder_open' : 'book'}
                          </span>
                          <span className="font-medium truncate">{item.name}</span>
                        </div>
                      </td>
                      <td className="py-5 px-3 text-sm text-text-light-secondary dark:text-text-dark-secondary">
                        {item.type === 'folder' ? 'Pasta' : 'Caderno'}
                      </td>
                      <td className="py-5 px-3 text-sm">{formatDate(item.created_at)}</td>
                      <td className="py-5 px-3 text-sm">{item.year || '-'}</td>
                      <td className="py-5 px-3 text-sm truncate">{item.institution || '-'}</td>
                      <td className="py-5 px-3 text-sm">{item.exam_type || '-'}</td>
                      <td className="py-5 px-2" onClick={(e) => e.stopPropagation()}>
                        <ErrorNotebookItemMenu
                          itemType={item.type}
                          onEdit={() => handleEdit(item)}
                          onDelete={() => handleDelete(item)}
                          onMove={() => handleMove(item)}
                          onReview={item.type === 'entry' ? () => handleReview(item) : undefined}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Pagination */}
            {filteredItems.length > 0 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-border-light dark:border-border-dark">
                <div className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                  Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, filteredItems.length)} de {filteredItems.length} itens
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 rounded-lg border border-border-light dark:border-border-dark hover:bg-background-light dark:hover:bg-background-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Anterior
                  </button>
                  <span className="text-sm">
                    Página {currentPage} de {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 rounded-lg border border-border-light dark:border-border-dark hover:bg-background-light dark:hover:bg-background-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modais */}
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        itemType={deleteModal.item?.type || 'entry'}
        itemName={deleteModal.item?.name || ''}
        onClose={() => setDeleteModal({ isOpen: false, item: null })}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />

      <EditItemModal
        isOpen={editFolderModal.isOpen}
        itemType="folder"
        itemName={editFolderModal.item?.name || ''}
        itemDescription=""
        onClose={() => setEditFolderModal({ isOpen: false, item: null })}
        onSave={handleSaveEditFolder}
        isSaving={isSaving}
      />



      <MoveToFolderModal
        isOpen={moveModal.isOpen}
        itemType={moveModal.item?.type || 'entry'}
        itemName={moveModal.item?.name || ''}
        currentFolderId={moveModal.item?.parent_id}
        onClose={() => setMoveModal({ isOpen: false, item: null })}
        onMove={handleConfirmMove}
        isMoving={isMoving}
      />
    </>
  );
}
