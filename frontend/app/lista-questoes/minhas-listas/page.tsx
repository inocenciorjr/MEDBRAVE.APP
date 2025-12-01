'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { useQuestionListFolders } from '@/hooks/useQuestionListFolders';
import ListItemMenu from '@/components/lista-questoes/ListItemMenu';
import DeleteConfirmModal from '@/components/lista-questoes/DeleteConfirmModal';
import EditItemModal from '@/components/lista-questoes/EditItemModal';
import api from '@/services/api';
import { useToast } from '@/lib/contexts/ToastContext';
import { CreateSimulatedModal } from '@/components/lista-questoes/CreateSimulatedModal';
import { MinhasListasSkeleton } from '@/components/skeletons/MinhasListasSkeleton';
import Checkbox from '@/components/ui/Checkbox';
import { SearchInput } from '@/components/flashcards/SearchInput';
import { MobileListCard } from '@/components/lista-questoes/MobileListCard';
import { useIsMobile } from '@/hooks/useMediaQuery';

interface ListStats {
  answered: number;
  correct: number;
  incorrect: number;
  total: number;
}

// Tipos de items: pastas, listas de questões e simulados
interface ListItem {
  id: string;
  name: string;
  type: 'folder' | 'list' | 'simulado';
  created_at: string;
  question_count?: number;
  stats?: ListStats;
  parent_id?: string;
  title?: string;
  description?: string;
  userResult?: {
    id: string;
    status: 'in_progress' | 'completed' | 'abandoned';
    score: number;
    correct_count: number;
    incorrect_count: number;
    total_questions: number;
    completed_at?: string;
    time_taken_seconds: number;
  };
}

export default function MinhasListasPage() {
  const router = useRouter();
  const toast = useToast();
  const isMobile = useIsMobile();
  const { folders, loading: loadingFolders, deleteFolder, updateFolder, refetch } = useQuestionListFolders();
  const [searchTerm, setSearchTerm] = useState('');
  const [showFolders, setShowFolders] = useState(true);
  const [showLists, setShowLists] = useState(true);
  const [showSimulados, setShowSimulados] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [sortBy, setSortBy] = useState<'name' | 'type' | 'date' | 'quantity' | 'status' | 'answered' | 'correct' | 'incorrect'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [items, setItems] = useState<ListItem[]>([]);
  const [simulados, setSimulados] = useState<any[]>([]);
  const [loadingSimulados, setLoadingSimulados] = useState(false);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<Array<{ id: string | null; name: string }>>([
    { id: null, name: 'Todas as Listas' }
  ]);

  // Estados para modais
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; item: ListItem | null }>({
    isOpen: false,
    item: null
  });
  const [editModal, setEditModal] = useState<{ isOpen: boolean; item: ListItem | null }>({
    isOpen: false,
    item: null
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [simulatedModal, setSimulatedModal] = useState<{ isOpen: boolean; item: ListItem | null }>({
    isOpen: false,
    item: null
  });

  // Debug: Log quando folders mudar
  useEffect(() => {
    console.log('📦 Folders atualizados:', { 
      count: folders.length, 
      loading: loadingFolders,
      folders: folders 
    });
  }, [folders, loadingFolders]);

  // Carregar simulados do usuário
  useEffect(() => {
    const loadSimulados = async () => {
      try {
        setLoadingSimulados(true);
        const { simulatedExamService } = await import('@/services/simulatedExamService');
        const data = await simulatedExamService.getUserSimulatedExams();
        console.log('📊 Simulados carregados:', data);
        setSimulados(data || []);
      } catch (error) {
        console.error('Erro ao carregar simulados:', error);
      } finally {
        setLoadingSimulados(false);
      }
    };
    
    loadSimulados();
  }, []);



  // Buscar estatísticas das listas - OTIMIZADO: todas em paralelo
  const fetchListStats = async (listIds: string[]) => {
    if (listIds.length === 0) return {};
    
    try {
      console.log(`📊 Buscando stats para ${listIds.length} listas em paralelo...`);
      const startTime = Date.now();
      
      // Fazer TODAS as requisições em paralelo (não sequencial)
      const statsPromises = listIds.map(async (listId) => {
        try {
          const response = await api.get(`/question-lists/${listId}/stats`);
          return { listId, stats: response.data.data };
        } catch (error) {
          console.error(`Error fetching stats for list ${listId}:`, error);
          return { listId, stats: null };
        }
      });

      const results = await Promise.all(statsPromises);
      const statsMap: Record<string, ListStats> = {};
      
      results.forEach(({ listId, stats }) => {
        if (stats) {
          statsMap[listId] = {
            answered: stats.answered || 0,
            correct: stats.correct || 0,
            incorrect: stats.incorrect || 0,
            total: stats.total || 0
          };
        }
      });

      const endTime = Date.now();
      console.log(`✅ Stats carregadas em ${endTime - startTime}ms`);
      return statsMap;
    } catch (error) {
      console.error('Error fetching list stats:', error);
      return {};
    }
  };

  // Organizar itens (pastas e listas) baseado na pasta atual
  useEffect(() => {
    const organizeItems = async () => {
      console.log('🔍 Organizando itens...', { 
        foldersCount: folders.length, 
        currentFolder, 
        loadingFolders 
      });

      const allItems: ListItem[] = [];

      // Função recursiva para encontrar pasta e seus filhos
      const findFolderAndChildren = (folderList: any[], targetId: string | null): any[] => {
        if (targetId === null) {
          // Retornar pastas raiz
          const rootFolders = folderList.filter(f => !f.parent_id);
          console.log('📁 Pastas raiz encontradas:', rootFolders.length);
          return rootFolders;
        }

        for (const folder of folderList) {
          if (folder.id === targetId) {
            console.log('📁 Subpastas encontradas:', folder.children?.length || 0);
            return folder.children || [];
          }
          if (folder.children && folder.children.length > 0) {
            const found = findFolderAndChildren(folder.children, targetId);
            if (found.length > 0) return found;
          }
        }
        return [];
      };

      // Função recursiva para encontrar listas de uma pasta
      const findListsInFolder = (folderList: any[], targetId: string | null): any[] => {
        if (targetId === null) {
          // Na raiz, mostrar listas SEM PASTA (folder_id = null)
          // Buscar todas as listas que não estão em nenhuma pasta
          return [];
        }

        for (const folder of folderList) {
          if (folder.id === targetId) {
            console.log('📄 Listas na pasta encontradas:', folder.lists?.length || 0);
            return folder.lists || [];
          }
          if (folder.children && folder.children.length > 0) {
            const found = findListsInFolder(folder.children, targetId);
            if (found.length > 0) return found;
          }
        }
        return [];
      };

      // Buscar listas sem pasta (folder_id = null) para mostrar na raiz
      const findOrphanLists = async (): Promise<any[]> => {
        if (currentFolder !== null) return [];
        
        try {
          const response = await api.get('/question-lists');
          if (response.data.success) {
            const orphanLists = response.data.data.filter((list: any) => 
              list.id && !list.folder_id
            );
            console.log('📄 Listas sem pasta encontradas:', orphanLists.length);
            return orphanLists;
          }
        } catch (error) {
          console.error('Erro ao buscar listas sem pasta:', error);
        }
        return [];
      };

      // Adicionar subpastas
      const subfolders = findFolderAndChildren(folders, currentFolder);
      subfolders.forEach(folder => {
        allItems.push({
          id: folder.id,
          name: folder.name,
          type: 'folder',
          created_at: folder.created_at,
          parent_id: folder.parent_id
        });
      });

      // Adicionar listas da pasta atual OU listas sem pasta (se estiver na raiz)
      let lists: any[] = [];
      
      if (currentFolder === null) {
        // Na raiz: buscar listas sem pasta
        lists = await findOrphanLists();
      } else {
        // Dentro de uma pasta: buscar listas da pasta
        lists = findListsInFolder(folders, currentFolder);
      }

      const listIds = lists.map(l => l.id);
      const statsMap = await fetchListStats(listIds);

      lists.forEach(list => {
        allItems.push({
          id: list.id,
          name: list.name,
          type: 'list',
          created_at: typeof list.created_at === 'object' && list.created_at?.value 
            ? list.created_at.value 
            : list.created_at,
          question_count: list.question_count || 0,
          stats: statsMap[list.id] || { answered: 0, correct: 0, incorrect: 0, total: list.question_count || 0 },
          parent_id: list.folder_id
        });
      });

      console.log('✅ Total de itens organizados:', allItems.length, { 
        folders: allItems.filter(i => i.type === 'folder').length,
        lists: allItems.filter(i => i.type === 'list').length
      });

      setItems(allItems);
    };

    if (!loadingFolders) {
      organizeItems();
    }
  }, [folders, loadingFolders, currentFolder]);

  // Combinar listas e simulados
  const allItems = useMemo(() => {
    const combined: ListItem[] = [...items];
    
    // Adicionar simulados como items
    console.log('🔄 Combinando items:', { items: items.length, simulados: simulados.length });
    simulados.forEach(sim => {
      combined.push({
        id: sim.id,
        name: sim.title || sim.name,
        type: 'simulado',
        created_at: sim.created_at,
        question_count: sim.question_count,
        description: sim.description,
        userResult: sim.userResult
      });
    });
    
    console.log('✅ Items combinados:', combined.length);
    return combined;
  }, [items, simulados]);

  // Filtrar e ordenar itens
  const filteredItems = useMemo(() => {
    let filtered = allItems;

    // Filtrar por tipo usando checkboxes
    filtered = filtered.filter(item => {
      if (item.type === 'folder' && !showFolders) return false;
      if (item.type === 'list' && !showLists) return false;
      if (item.type === 'simulado' && !showSimulados) return false;
      return true;
    });

    // Filtrar por busca
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
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
        case 'quantity':
          const qtyA = a.question_count || (a.userResult?.total_questions) || 0;
          const qtyB = b.question_count || (b.userResult?.total_questions) || 0;
          comparison = qtyA - qtyB;
          break;
        case 'status':
          const statusA = a.type === 'list' ? getProgressStatus(a.stats) : (a.userResult?.status || '');
          const statusB = b.type === 'list' ? getProgressStatus(b.stats) : (b.userResult?.status || '');
          comparison = statusA.localeCompare(statusB);
          break;
        case 'answered':
          const answeredA = a.stats?.answered || (a.userResult?.total_questions) || 0;
          const answeredB = b.stats?.answered || (b.userResult?.total_questions) || 0;
          comparison = answeredA - answeredB;
          break;
        case 'correct':
          const correctA = a.stats?.correct || (a.userResult?.correct_count) || 0;
          const correctB = b.stats?.correct || (b.userResult?.correct_count) || 0;
          comparison = correctA - correctB;
          break;
        case 'incorrect':
          const incorrectA = a.stats?.incorrect || (a.userResult?.incorrect_count) || 0;
          const incorrectB = b.stats?.incorrect || (b.userResult?.incorrect_count) || 0;
          comparison = incorrectA - incorrectB;
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [allItems, showFolders, showLists, showSimulados, searchTerm, sortBy, sortOrder]);

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
  }, [searchTerm, showFolders, showLists, showSimulados]);

  const handleCreateList = () => {
    router.push('/banco-questoes/criar/geral');
  };

  const handleItemClick = (item: ListItem) => {
    if (item.type === 'folder') {
      // Navegar para dentro da pasta
      setCurrentFolder(item.id);
      setBreadcrumbs([...breadcrumbs, { id: item.id, name: item.name }]);
    } else if (item.type === 'simulado') {
      // Se o simulado já foi completado, ir para resultados
      if (item.userResult?.status === 'completed') {
        router.push(`/simulados/${item.id}/resultado?resultId=${item.userResult.id}`);
      } else if (item.userResult?.status === 'in_progress') {
        // Se está em andamento, continuar de onde parou
        router.push(`/simulados/${item.id}/resolver?resultId=${item.userResult.id}`);
      } else {
        // Se não iniciou, ir para configuração
        router.push(`/simulados/${item.id}/configurar`);
      }
    } else {
      // Abrir lista de questões
      router.push(`/resolucao-questoes/${item.id}`);
    }
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

  // Funções de manipulação
  const handleEdit = (item: ListItem) => {
    setEditModal({ isOpen: true, item });
  };

  const handleDelete = (item: ListItem) => {
    setDeleteModal({ isOpen: true, item });
  };

  const handleSaveEdit = async (name: string, description?: string) => {
    if (!editModal.item) return;

    try {
      setIsSaving(true);
      
      if (editModal.item.type === 'folder') {
        await updateFolder(editModal.item.id, { name, description });
      } else {
        // Atualizar lista
        await api.put(`/question-lists/${editModal.item.id}`, { name, description });
      }

      // Recarregar dados
      await refetch();
      setEditModal({ isOpen: false, item: null });
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar', error.message || 'Não foi possível salvar as alterações');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.item) return;

    try {
      setIsDeleting(true);
      
      if (deleteModal.item.type === 'folder') {
        await deleteFolder(deleteModal.item.id);
      } else {
        // Deletar lista
        await api.delete(`/question-lists/${deleteModal.item.id}`);
      }

      // Recarregar dados
      await refetch();
      setDeleteModal({ isOpen: false, item: null });
    } catch (error: any) {
      console.error('Erro ao excluir:', error);
      toast.error('Erro ao excluir', error.message || 'Não foi possível excluir o item');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDuplicate = async (item: ListItem) => {
    if (item.type !== 'list') return;

    try {
      // Buscar a lista original
      const response = await api.get(`/question-lists/${item.id}`);
      const originalList = response.data.data;

      // Criar cópia com progresso zerado
      const newListName = `${originalList.name} (Cópia)`;
      
      await api.post('/question-lists', {
        name: newListName,
        title: newListName,
        description: originalList.description,
        folder_id: originalList.folder_id,
        is_public: false,
        tags: originalList.tags || [],
        status: 'active',
        question_count: originalList.question_count,
        questions: originalList.questions || []
      });

      // Recarregar dados
      await refetch();
      toast.success('Lista duplicada!', 'A lista foi duplicada com sucesso');
    } catch (error: any) {
      console.error('Erro ao duplicar lista:', error);
      toast.error('Erro ao duplicar', error.message || 'Não foi possível duplicar a lista');
    }
  };

  const handleCreateSimulated = (item: ListItem) => {
    setSimulatedModal({ isOpen: true, item });
  };

  const handleDuplicateErrors = async (item: ListItem) => {
    if (item.type !== 'list') return;

    try {
      // Buscar a lista original
      const listResponse = await api.get(`/question-lists/${item.id}`);
      const originalList = listResponse.data.data;

      if (!originalList.questions || originalList.questions.length === 0) {
        toast.warning('Lista vazia', 'Esta lista não possui questões');
        return;
      }

      // Buscar questões incorretas usando o endpoint específico
      const incorrectResponse = await api.get(`/question-lists/${item.id}/incorrect`);
      const incorrectQuestions = incorrectResponse.data.data || [];

      if (incorrectQuestions.length === 0) {
        toast.info('Sem erros', 'Você não tem erros nesta lista ainda!');
        return;
      }

      // Criar nova lista apenas com questões erradas
      const newListName = `${originalList.name} (Somente Erros)`;
      
      await api.post('/question-lists', {
        name: newListName,
        title: newListName,
        description: `Lista com ${incorrectQuestions.length} questões erradas de "${originalList.name}"`,
        folder_id: originalList.folder_id,
        is_public: false,
        tags: [...(originalList.tags || []), 'erros'],
        status: 'active',
        question_count: incorrectQuestions.length,
        questions: incorrectQuestions
      });

      // Recarregar dados
      await refetch();
      toast.success('Lista de erros criada!', `${incorrectQuestions.length} questões erradas adicionadas`);
    } catch (error: any) {
      console.error('Erro ao duplicar erros:', error);
      toast.error('Erro ao criar lista', error.message || 'Não foi possível duplicar a lista de erros');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  const getProgressStatus = (stats?: ListStats) => {
    if (!stats || stats.total === 0) return 'Não iniciada';
    if (stats.answered === 0) return 'Não iniciada';
    if (stats.answered === stats.total) return 'Concluída';
    return `${Math.round((stats.answered / stats.total) * 100)}% concluída`;
  };

  // Mostrar skeleton enquanto está carregando folders OU simulados OU items ainda não foram organizados
  const isLoading = loadingFolders || loadingSimulados || (items.length === 0 && allItems.length === 0 && !loadingFolders);
  
  if (isLoading && allItems.length === 0) {
    return (
      <div className="w-full py-8">
        <MinhasListasSkeleton />
      </div>
    );
  }

  // Construir breadcrumb dinâmico baseado na navegação de pastas
  const breadcrumbItems = breadcrumbs.map((crumb, index) => {
    // Primeiro item sempre é "Listas de Questões" com link
    if (index === 0) {
      return { 
        label: 'Listas de Questões', 
        icon: 'list_alt', 
        href: '/lista-questoes/minhas-listas',
        onClick: () => {
          setCurrentFolder(null);
          setBreadcrumbs([{ id: null, name: 'Todas as Listas' }]);
        }
      };
    }
    
    // Último item não tem href (página atual)
    if (index === breadcrumbs.length - 1) {
      return {
        label: crumb.name,
        icon: 'folder_open'
      };
    }
    
    // Items intermediários podem ser clicados para navegar
    return {
      label: crumb.name,
      icon: 'folder_open',
      onClick: () => handleBreadcrumbClick(index)
    };
  });

  return (
    <>
      {/* Breadcrumb */}
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <Breadcrumb items={breadcrumbItems} />
      </div>

      <div className="w-full py-8">
        {/* Header */}
        <header className="mb-6">
            <h1 className="text-3xl font-semibold text-slate-700 dark:text-slate-200">
              Listas de Questões
            </h1>
          </header>

        {/* Search and Actions Bar */}
        <div className="mb-6 bg-surface-light dark:bg-surface-dark rounded-lg shadow-md p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search Input */}
            <div className="flex-1">
              <SearchInput
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Buscar por nome..."
                fullWidth
              />
            </div>

            {/* Create Button */}
            <button
              onClick={handleCreateList}
              className="flex items-center justify-center gap-2 px-6 py-2.5 bg-primary text-white font-semibold rounded-lg shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300 whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-xl">add</span>
              <span>Nova Lista</span>
            </button>
          </div>
        </div>

        {/* Filters Section */}
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
                label="Listas"
                checked={showLists}
                onChange={(e) => setShowLists(e.target.checked)}
              />
              <Checkbox
                label="Simulados"
                checked={showSimulados}
                onChange={(e) => setShowSimulados(e.target.checked)}
              />
            </div>
          </div>
        </div>

        {/* Mobile: Cards Grid */}
        {isMobile ? (
          <div className="space-y-4">
            {paginatedItems.length === 0 ? (
              <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-md p-12 text-center">
                <span className="material-symbols-outlined text-5xl text-text-light-secondary dark:text-text-dark-secondary mb-4">
                  inbox
                </span>
                <p className="text-text-light-secondary dark:text-text-dark-secondary">
                  {filteredItems.length === 0 ? 'Nenhum item encontrado' : 'Nenhum item nesta página'}
                </p>
              </div>
            ) : (
              paginatedItems.map((item) => (
                <MobileListCard
                  key={item.id}
                  id={item.id}
                  name={item.name}
                  type={item.type}
                  created_at={item.created_at}
                  question_count={item.question_count}
                  stats={item.stats}
                  userResult={item.userResult}
                  onClick={() => handleItemClick(item)}
                  onEdit={() => handleEdit(item)}
                  onDelete={() => handleDelete(item)}
                  onDuplicate={item.type === 'list' ? () => handleDuplicate(item) : undefined}
                  onDuplicateErrors={item.type === 'list' ? () => handleDuplicateErrors(item) : undefined}
                  onCreateSimulated={item.type === 'list' ? () => handleCreateSimulated(item) : undefined}
                />
              ))
            )}

            {/* Mobile Pagination */}
            {filteredItems.length > 0 && (
              <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-md p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                    {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredItems.length)} de {filteredItems.length}
                  </span>
                  <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                    Pág. {currentPage} de {totalPages}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="flex-1 px-4 py-2 bg-background-light dark:bg-background-dark rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-base">chevron_left</span>
                    Anterior
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages || 1, currentPage + 1))}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="flex-1 px-4 py-2 bg-background-light dark:bg-background-dark rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                  >
                    Próxima
                    <span className="material-symbols-outlined text-base">chevron_right</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Desktop + Tablet: Table */
          <div className="bg-surface-light dark:bg-surface-dark rounded-lg shadow-xl dark:shadow-dark-xl overflow-hidden">
            <table className="w-full text-left text-sm table-fixed">
              <thead className="text-text-light-secondary dark:text-text-dark-secondary border-b border-border-light dark:border-border-dark">
                <tr>
                  <th className="py-3 px-4 font-medium w-[28%]">
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
                  <th className="py-3 px-3 font-medium w-[11%]">
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
                  <th className="py-3 px-3 font-medium w-[11%]">
                    <button 
                      onClick={() => handleSort('status')}
                      className="flex items-center gap-1 hover:text-primary transition-colors"
                    >
                      <span className="material-symbols-outlined text-base">bar_chart</span>
                      Progresso
                      {sortBy === 'status' && (
                        <span className="material-symbols-outlined text-base">
                          {sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                        </span>
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-3 font-medium text-center w-[9%]">
                    <button 
                      onClick={() => handleSort('quantity')}
                      className="flex items-center justify-center gap-1 hover:text-primary transition-colors w-full"
                    >
                      <span className="material-symbols-outlined text-base">format_list_numbered</span>
                      Quantidade
                      {sortBy === 'quantity' && (
                        <span className="material-symbols-outlined text-base">
                          {sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                        </span>
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-2 font-medium text-center w-[9%]">
                    <button 
                      onClick={() => handleSort('answered')}
                      className="flex items-center justify-center gap-1 hover:text-primary transition-colors w-full"
                    >
                      <span className="material-symbols-outlined text-base text-text-light-secondary dark:text-text-dark-secondary">help</span>
                      Respondidas
                      {sortBy === 'answered' && (
                        <span className="material-symbols-outlined text-base">
                          {sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                        </span>
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-2 font-medium text-center w-[8%]">
                    <button 
                      onClick={() => handleSort('correct')}
                      className="flex items-center justify-center gap-1 hover:text-primary transition-colors w-full"
                    >
                      <span className="material-symbols-outlined text-base text-green-500">check_circle</span>
                      Acertos
                      {sortBy === 'correct' && (
                        <span className="material-symbols-outlined text-base">
                          {sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                        </span>
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-2 font-medium text-center w-[8%]">
                    <button 
                      onClick={() => handleSort('incorrect')}
                      className="flex items-center justify-center gap-1 hover:text-primary transition-colors w-full"
                    >
                      <span className="material-symbols-outlined text-base text-red-500">cancel</span>
                      Erros
                      {sortBy === 'incorrect' && (
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
                    <td colSpan={9} className="py-12 text-center text-text-light-secondary dark:text-text-dark-secondary">
                      {filteredItems.length === 0 ? 'Nenhum item encontrado' : 'Nenhum item nesta página'}
                    </td>
                  </tr>
                ) : (
                  paginatedItems.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-sidebar-active-light dark:hover:bg-sidebar-active-dark/20 cursor-pointer transition-all duration-200 hover:shadow-md dark:hover:shadow-dark-lg"
                      onClick={() => handleItemClick(item)}
                    >
                      {/* Nome */}
                      <td className="py-5 px-4">
                        <div className="flex items-center gap-2 truncate">
                          <span className="material-symbols-outlined text-base text-text-light-secondary dark:text-text-dark-secondary">
                            {item.type === 'folder' ? 'folder_open' : item.type === 'simulado' ? 'schedule' : 'article'}
                          </span>
                          <span className="font-medium truncate">{item.name}</span>
                          {item.type === 'list' && !item.parent_id && currentFolder === null && (
                            <span className="text-xs px-2 py-0.5 bg-background-light dark:bg-background-dark text-text-light-secondary dark:text-text-dark-secondary rounded">
                              Sem pasta
                            </span>
                          )}
                        </div>
                      </td>
                      
                      {/* Tipo */}
                      <td className="py-5 px-3 text-sm text-text-light-secondary dark:text-text-dark-secondary">
                        {item.type === 'folder' ? 'Pasta' : item.type === 'simulado' ? 'Simulado' : 'Lista'}
                      </td>
                      
                      {/* Data */}
                      <td className="py-5 px-3 text-sm">{formatDate(item.created_at)}</td>
                      
                      {/* Progresso */}
                      <td className="py-5 px-3 text-text-light-secondary dark:text-text-dark-secondary text-sm truncate">
                        {item.type === 'list' 
                          ? getProgressStatus(item.stats) 
                          : item.type === 'simulado' 
                          ? (item.userResult?.status === 'completed' 
                            ? 'Concluído' 
                            : item.userResult?.status === 'in_progress' 
                            ? 'Em andamento' 
                            : 'Não iniciado')
                          : '-'}
                      </td>
                      
                      {/* Quantidade */}
                      <td className="py-5 px-3 text-center">
                        {item.type === 'list' 
                          ? item.question_count || 0 
                          : item.type === 'simulado' 
                          ? item.question_count || 0 
                          : '-'}
                      </td>
                      <td className="py-5 px-2 text-center">
                        {item.type === 'list' && item.stats ? (
                          <span className="text-sm font-medium">
                            {item.stats.answered}
                          </span>
                        ) : item.type === 'simulado' && item.userResult ? (
                          <span className="text-sm font-medium">
                            {item.userResult.total_questions}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-5 px-2 text-center">
                        {item.type === 'list' && item.stats ? (
                          <span className="text-sm font-medium text-green-600 dark:text-green-400">
                            {item.stats.correct}
                          </span>
                        ) : item.type === 'simulado' && item.userResult ? (
                          <span className="text-sm font-medium text-green-600 dark:text-green-400">
                            {item.userResult.correct_count}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-5 px-2 text-center">
                        {item.type === 'list' && item.stats ? (
                          <span className="text-sm font-medium text-red-600 dark:text-red-400">
                            {item.stats.incorrect}
                          </span>
                        ) : item.type === 'simulado' && item.userResult ? (
                          <span className="text-sm font-medium text-red-600 dark:text-red-400">
                            {item.userResult.incorrect_count}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-5 px-2">
                        <ListItemMenu
                          itemType={item.type}
                          onEdit={() => handleEdit(item)}
                          onDelete={() => handleDelete(item)}
                          onShare={item.type === 'list' ? () => {
                            // TODO: Implementar compartilhamento
                            toast.info('Em desenvolvimento', 'Funcionalidade de compartilhamento em breve');
                          } : undefined}
                          onMove={() => {
                            // TODO: Implementar mover
                            toast.info('Em desenvolvimento', 'Funcionalidade de mover em breve');
                          }}
                          onDuplicate={item.type === 'list' ? () => handleDuplicate(item) : undefined}
                          onDuplicateErrors={item.type === 'list' ? () => handleDuplicateErrors(item) : undefined}
                          onCreateSimulated={item.type === 'list' ? () => handleCreateSimulated(item) : undefined}
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
              
              <div className="flex items-center">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="p-2 text-text-light-secondary dark:text-text-dark-secondary rounded-md hover:bg-sidebar-active-light dark:hover:bg-sidebar-active-dark/20 hover:shadow-md hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>
                
                <span className="mx-4 text-sm text-text-light-secondary dark:text-text-dark-secondary">
                  Pág.
                </span>
                
                <input
                  type="number"
                  min="1"
                  max={totalPages || 1}
                  value={currentPage}
                  onChange={(e) => setCurrentPage(Math.max(1, Math.min(totalPages || 1, parseInt(e.target.value) || 1)))}
                  className="w-16 text-center border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark rounded-md shadow-md hover:shadow-lg py-1 focus:ring-2 focus:ring-primary focus:border-primary text-text-light-primary dark:text-text-dark-primary transition-all duration-200"
                />
                
                <span className="mx-4 text-sm text-text-light-secondary dark:text-text-dark-secondary">
                  de {totalPages || 1}
                </span>
                
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages || 1, currentPage + 1))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="p-2 text-text-light-secondary dark:text-text-dark-secondary rounded-md hover:bg-sidebar-active-light dark:hover:bg-sidebar-active-dark/20 hover:shadow-md hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
            </div>
          )}
          </div>
        )}
      </div>

      {/* Modais */}
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, item: null })}
        onConfirm={handleConfirmDelete}
        itemName={deleteModal.item?.name || ''}
        itemType={deleteModal.item?.type || 'list'}
        isDeleting={isDeleting}
      />

      <EditItemModal
        isOpen={editModal.isOpen}
        onClose={() => setEditModal({ isOpen: false, item: null })}
        onSave={handleSaveEdit}
        itemName={editModal.item?.name || ''}
        itemDescription=""
        itemType={editModal.item?.type || 'list'}
        isSaving={isSaving}
      />

      {/* Modal de Criar Simulado */}
      {simulatedModal.item && (
        <CreateSimulatedModal
          listId={simulatedModal.item.id}
          listName={simulatedModal.item.name}
          questionCount={simulatedModal.item.question_count || 0}
          isOpen={simulatedModal.isOpen}
          onClose={() => setSimulatedModal({ isOpen: false, item: null })}
        />
      )}
    </>
  );
}
