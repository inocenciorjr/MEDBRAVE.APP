'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import ReviewFilters from '@/components/revisoes/gerenciar/ReviewFilters';
import ReviewTypeCard from '@/components/revisoes/gerenciar/ReviewTypeCard';
import EmptyState from '@/components/ui/EmptyState';
import { GerenciarRevisoesPageSkeleton } from '@/components/skeletons/GerenciarRevisoesPageSkeleton';
import { RescheduleModal } from '@/components/revisoes/gerenciar/RescheduleModal';
import { ReviewHistoryModal } from '@/components/revisoes/gerenciar/ReviewHistoryModal';
import { QuestionReviewHistoryModal } from '@/components/revisoes/gerenciar/QuestionReviewHistoryModal';
import { useReviewsMetadata } from '@/hooks/queries';

interface ReviewFilters {
  search: string;
  type: string;
  dateRange: string;
  specificDate?: string;
}

interface ReviewItem {
  id: string;
  content_id: string;
  content_type: 'FLASHCARD' | 'QUESTION' | 'ERROR_NOTEBOOK';
  title: string;
  due: string;
  last_review: string | null;
  review_count: number;
  state: string;
  stability: number;
  difficulty: number;
  university?: string;
  year?: string;
}

interface GroupedReviews {
  [key: string]: ReviewItem[];
}

export default function GerenciarRevisoesPage() {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [filteredReviews, setFilteredReviews] = useState<ReviewItem[]>([]);
  const [filters, setFilters] = useState<ReviewFilters>({
    search: '',
    type: 'Todos',
    dateRange: 'Todos',
  });
  
  // Usar React Query para metadados
  const { data: metadata, isLoading: loading } = useReviewsMetadata();
  
  // Ler parâmetros da URL ao carregar
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const filterParam = params.get('filter');
    
    if (filterParam === 'overdue') {
      setFilters(prev => ({
        ...prev,
        dateRange: 'Atrasadas',
      }));
    }
  }, []);
  
  const [loadedTypes, setLoadedTypes] = useState<Set<string>>(new Set());
  const [loadingTypes, setLoadingTypes] = useState<Set<string>>(new Set());
  const [selectedReviews, setSelectedReviews] = useState<Set<string>>(new Set());
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<ReviewItem | null>(null);

  // Estados do menu dropdown global
  const [openMenuReviewId, setOpenMenuReviewId] = useState<string | null>(null);
  const [isMenuAnimating, setIsMenuAnimating] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // Aplicar filtros
  useEffect(() => {
    applyFilters();
  }, [filters, reviews]);

  // Carregar todas as revisões quando aplicar filtros
  useEffect(() => {
    if (filters.dateRange !== 'Todos' || filters.type !== 'Todos' || filters.search.trim() !== '') {
      // Carregar todos os tipos se ainda não foram carregados
      ['ERROR_NOTEBOOK', 'FLASHCARD', 'QUESTION'].forEach(type => {
        // Verifica tanto loadedTypes quanto loadingTypes para evitar duplicação
        if (!loadedTypes.has(type) && !loadingTypes.has(type)) {
          loadReviewsByType(type);
        }
      });
    }
  }, [filters.dateRange, filters.type, filters.search, loadedTypes, loadingTypes]);

  const loadReviewsByType = async (contentType: string) => {
    // Se já carregou este tipo, não carrega novamente
    if (loadedTypes.has(contentType)) {
      return;
    }

    try {
      setLoadingTypes(prev => new Set([...prev, contentType]));
      const { fetchWithAuth } = await import('@/lib/utils/fetchWithAuth');
      
      const response = await fetchWithAuth(`/reviews/manage?contentType=${contentType}`);
      const result = await response.json();
      
      if (result.success) {
        const newReviews = result.data.reviews;
        // Evita adicionar reviews duplicados
        setReviews(prev => {
          const existingIds = new Set(prev.map(r => r.id));
          const uniqueNewReviews = newReviews.filter((r: ReviewItem) => !existingIds.has(r.id));
          return [...prev, ...uniqueNewReviews];
        });
        setLoadedTypes(prev => new Set([...prev, contentType]));
      }
    } catch (error) {
      console.error(`Erro ao carregar revisões de ${contentType}:`, error);
    } finally {
      setLoadingTypes(prev => {
        const newSet = new Set(prev);
        newSet.delete(contentType);
        return newSet;
      });
    }
  };

  const applyFilters = () => {
    let filtered = [...reviews];

    // Filtro de busca
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(r => {
        // Buscar no título
        if (r.title.toLowerCase().includes(searchLower)) return true;
        
        // Buscar na universidade (questões e caderno)
        if (r.university && r.university.toLowerCase().includes(searchLower)) return true;
        
        // Buscar no ano (questões e caderno)
        if (r.year && r.year.toLowerCase().includes(searchLower)) return true;
        
        // Para flashcards, buscar no caminho completo (coleção/deck)
        if (r.content_type === 'FLASHCARD') {
          const parts = r.title.split(' / ');
          // Buscar em cada parte do caminho
          if (parts.some(part => part.toLowerCase().includes(searchLower))) return true;
        }
        
        return false;
      });
    }

    // Filtro de tipo
    if (filters.type !== 'Todos') {
      filtered = filtered.filter(r => r.content_type === filters.type);
    }

    // Filtro de data
    if (filters.dateRange !== 'Todos') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      filtered = filtered.filter(r => {
        // Parse da data considerando timezone
        const dueDate = new Date(r.due);
        const due = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
        
        switch (filters.dateRange) {
          case 'Atrasadas':
            return due < today;
          case 'Hoje':
            return due.getTime() === today.getTime();
          case 'Específica':
            if (filters.specificDate) {
              const specificDate = new Date(filters.specificDate + 'T00:00:00');
              const specific = new Date(specificDate.getFullYear(), specificDate.getMonth(), specificDate.getDate());
              return due.getTime() === specific.getTime();
            }
            return true;
          default:
            return true;
        }
      });
    }

    setFilteredReviews(filtered);
  };

  // Agrupar por tipo
  const groupedReviews: GroupedReviews = filteredReviews.reduce((acc, review) => {
    const type = review.content_type;
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(review);
    return acc;
  }, {} as GroupedReviews);

  // Handlers de seleção
  const toggleReviewSelection = (reviewId: string) => {
    setSelectedReviews(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(reviewId)) {
        newSelected.delete(reviewId);
      } else {
        newSelected.add(reviewId);
      }
      return newSelected;
    });
  };

  const toggleMultipleReviews = (reviewIds: string[], shouldSelect: boolean) => {
    setSelectedReviews(prev => {
      const newSelected = new Set(prev);
      reviewIds.forEach(id => {
        if (shouldSelect) {
          newSelected.add(id);
        } else {
          newSelected.delete(id);
        }
      });
      return newSelected;
    });
  };

  const selectAllReviews = () => {
    setSelectedReviews(new Set(filteredReviews.map(r => r.id)));
  };

  const deselectAllReviews = () => {
    setSelectedReviews(new Set());
  };

  // Handlers do menu
  const handleMenuClick = (review: ReviewItem, buttonElement: HTMLButtonElement) => {
    buttonRefs.current.set(review.id, buttonElement);
    
    if (openMenuReviewId === review.id) {
      setIsMenuAnimating(false);
      setTimeout(() => setOpenMenuReviewId(null), 300);
    } else {
      const rect = buttonElement.getBoundingClientRect();
      const menuHeight = 200;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      
      const shouldOpenUpward = spaceBelow < menuHeight && spaceAbove > spaceBelow;
      
      setMenuPosition({
        top: shouldOpenUpward ? rect.top - menuHeight - 8 : rect.bottom + 8,
        left: rect.right - 224,
      });
      setSelectedReview(review);
      setOpenMenuReviewId(review.id);
      setTimeout(() => setIsMenuAnimating(true), 10);
    }
  };

  const handleViewHistory = (review: ReviewItem) => {
    console.log('[handleViewHistory] Review:', review);
    if (!review.content_id) {
      console.error('[handleViewHistory] content_id está undefined!', review);
      alert('Erro: ID do conteúdo não encontrado');
      return;
    }
    setSelectedReview(review);
    setIsHistoryModalOpen(true);
    setOpenMenuReviewId(null);
  };

  const handleReschedule = (review: ReviewItem) => {
    setSelectedReview(review);
    setIsRescheduleModalOpen(true);
    setOpenMenuReviewId(null);
  };

  const handleDelete = async (review: ReviewItem) => {
    if (!confirm('Tem certeza que deseja remover esta revisão?\n\nIsso irá deletar permanentemente o card FSRS e todo o histórico de revisões.')) return;
    
    try {
      const { fetchWithAuth } = await import('@/lib/utils/fetchWithAuth');
      const response = await fetchWithAuth(`/reviews/${review.id}`, { method: 'DELETE' });
      
      if (response.ok) {
        // Remover da lista local
        setReviews(prev => prev.filter(r => r.id !== review.id));
        setFilteredReviews(prev => prev.filter(r => r.id !== review.id));
        
        alert('Revisão removida com sucesso!');
      } else {
        throw new Error('Erro ao remover revisão');
      }
      
      setOpenMenuReviewId(null);
    } catch (error) {
      console.error('Erro ao remover revisão:', error);
      alert('Erro ao remover revisão. Tente novamente.');
    }
  };

  // Fechar menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      if (menuRef.current && menuRef.current.contains(target)) {
        return;
      }
      
      let clickedButton = false;
      buttonRefs.current.forEach((button) => {
        if (button.contains(target)) {
          clickedButton = true;
        }
      });
      
      if (!clickedButton) {
        setOpenMenuReviewId(null);
      }
    };

    if (openMenuReviewId) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openMenuReviewId]);

  const typeLabels: Record<string, string> = {
    'FLASHCARD': 'Flashcards',
    'QUESTION': 'Questões',
    'ERROR_NOTEBOOK': 'Caderno de Erros',
  };

  return (
    <>
      {/* Breadcrumb */}
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
        <Breadcrumb
          items={[
            { label: 'Revisões', icon: 'layers', href: '/revisoes' },
            { label: 'Gerenciar', icon: 'tune', href: '/revisoes/gerenciar' }
          ]}
        />
      </div>

      {/* Content */}
      <div className="w-full max-w-[1800px] 2xl:max-w-[2000px] mx-auto py-6 md:py-8 px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
          <div className="mb-6 md:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-700 dark:text-slate-200">
              Gerenciar Revisões
            </h1>

            {selectedReviews.size > 0 && (
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <span className="text-xs sm:text-sm text-text-light-secondary dark:text-text-dark-secondary">
                  {selectedReviews.size} selecionada{selectedReviews.size > 1 ? 's' : ''}
                </span>
                <button
                  onClick={() => {
                    setSelectedReview(null); // Limpar selectedReview para usar os selecionados
                    setIsRescheduleModalOpen(true);
                  }}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-xs sm:text-sm font-medium"
                >
                  Reagendar
                </button>
                <button
                  onClick={deselectAllReviews}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg hover:bg-background-light dark:hover:bg-background-dark transition-colors text-xs sm:text-sm font-medium"
                >
                  Limpar
                </button>
              </div>
            )}
          </div>

          <ReviewFilters
            filters={filters}
            onFilterChange={setFilters}
          />

          {loading ? (
            <GerenciarRevisoesPageSkeleton />
          ) : metadata && metadata.total === 0 ? (
            <EmptyState
              icon="search_off"
              title="Nenhuma revisão encontrada"
              description="Você ainda não tem revisões agendadas"
            />
          ) : (
            <div className="space-y-4">
              {metadata && ['ERROR_NOTEBOOK', 'FLASHCARD', 'QUESTION'].map((type) => {
                const items = groupedReviews[type] || [];
                const count = metadata[type as keyof typeof metadata] as number;
                const isTypeLoaded = loadedTypes.has(type);
                
                // Se tem filtro de tipo aplicado, só mostra o tipo filtrado
                if (filters.type !== 'Todos' && filters.type !== type) {
                  return null;
                }
                
                // Só mostra o card se:
                // 1. Houver revisões no metadata (total geral) OU
                // 2. O tipo foi carregado e tem items filtrados
                if (count === 0 && (!isTypeLoaded || items.length === 0)) return null;
                
                // Se tem filtros aplicados E foi carregado, usa items.length
                // Senão, usa count do metadata
                const hasFilters = filters.search.trim() !== '' || filters.dateRange !== 'Todos';
                const displayCount = (isTypeLoaded && hasFilters) ? items.length : count;
                
                return (
                  <ReviewTypeCard
                    key={type}
                    type={type as 'FLASHCARD' | 'QUESTION' | 'ERROR_NOTEBOOK'}
                    label={typeLabels[type]}
                    reviews={items}
                    totalCount={displayCount}
                    selectedReviews={selectedReviews}
                    onToggleSelection={toggleReviewSelection}
                    onToggleMultiple={toggleMultipleReviews}
                    onMenuClick={handleMenuClick}
                    openMenuReviewId={openMenuReviewId}
                    onExpand={() => loadReviewsByType(type)}
                    isLoading={loadingTypes.has(type)}
                    defaultExpanded={filters.type !== 'Todos'}
                  />
                );
              })}
            </div>
          )}
      </div>

      {/* Dropdown Menu Global */}
      {openMenuReviewId && selectedReview && typeof window !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          className={`fixed z-[9999] w-56 bg-surface-light dark:bg-surface-dark
                     border-2 border-primary/20 rounded-xl shadow-2xl dark:shadow-dark-xl
                     backdrop-blur-sm overflow-hidden
                     transition-all duration-300 ease-in-out origin-top
                     ${isMenuAnimating ? 'max-h-72 opacity-100 scale-y-100' : 'max-h-0 opacity-0 scale-y-0 border-0'}`}
          style={{
            top: `${menuPosition.top}px`,
            left: `${menuPosition.left}px`,
            boxShadow: isMenuAnimating ? '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(139, 92, 246, 0.1)' : 'none'
          }}
        >
          <div className="py-2">
            <button
              type="button"
              onClick={() => handleViewHistory(selectedReview)}
              className="w-full px-4 py-3 text-left text-sm font-medium transition-all duration-150
                         flex items-center gap-3 group/item rounded-t-lg
                         text-text-light-primary dark:text-text-dark-primary hover:bg-background-light dark:hover:bg-surface-dark 
                         hover:pl-6 border-l-4 border-transparent hover:border-primary/30"
            >
              <span className="material-symbols-outlined text-primary text-base">history</span>
              <span className="flex-1">Ver Histórico</span>
              <svg className="w-4 h-4 opacity-0 group-hover/item:opacity-100 transition-opacity duration-150 flex-shrink-0"
                   fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <button
              type="button"
              onClick={() => handleReschedule(selectedReview)}
              className="w-full px-4 py-3 text-left text-sm font-medium transition-all duration-150
                         flex items-center gap-3 group/item
                         border-t border-border-light/30 dark:border-border-dark/30
                         text-text-light-primary dark:text-text-dark-primary hover:bg-background-light dark:hover:bg-surface-dark 
                         hover:pl-6 border-l-4 border-transparent hover:border-primary/30"
            >
              <span className="material-symbols-outlined text-primary text-base">event</span>
              <span className="flex-1">Reagendar</span>
              <svg className="w-4 h-4 opacity-0 group-hover/item:opacity-100 transition-opacity duration-150 flex-shrink-0"
                   fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <button
              type="button"
              onClick={() => handleDelete(selectedReview)}
              className="w-full px-4 py-3 text-left text-sm font-medium transition-all duration-150
                         flex items-center gap-3 group/item rounded-b-lg
                         border-t border-border-light/30 dark:border-border-dark/30
                         text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 
                         hover:pl-6 border-l-4 border-transparent hover:border-red-500/30"
            >
              <span className="material-symbols-outlined text-base">delete</span>
              <span className="flex-1">Remover</span>
              <svg className="w-4 h-4 opacity-0 group-hover/item:opacity-100 transition-opacity duration-150 flex-shrink-0"
                   fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Modais */}
      <RescheduleModal
        isOpen={isRescheduleModalOpen}
        onClose={() => {
          setIsRescheduleModalOpen(false);
          setSelectedReview(null);
        }}
        selectedReviews={selectedReview ? [selectedReview.id] : Array.from(selectedReviews)}
        onSuccess={() => {
          // Recarregar os tipos que já foram carregados
          loadedTypes.forEach(type => {
            loadReviewsByType(type);
          });
          setSelectedReviews(new Set());
        }}
      />

      {selectedReview && (
        selectedReview.content_type === 'FLASHCARD' ? (
          <ReviewHistoryModal
            isOpen={isHistoryModalOpen}
            onClose={() => {
              setIsHistoryModalOpen(false);
              // Aguardar animação antes de limpar selectedReview
              setTimeout(() => setSelectedReview(null), 300);
            }}
            reviewId={selectedReview.content_id}
            reviewTitle={selectedReview.title}
            reviewType={selectedReview.content_type}
          />
        ) : (
          <QuestionReviewHistoryModal
            isOpen={isHistoryModalOpen}
            onClose={() => {
              setIsHistoryModalOpen(false);
              // Aguardar animação antes de limpar selectedReview
              setTimeout(() => setSelectedReview(null), 300);
            }}
            reviewId={selectedReview.content_id}
            contentId={selectedReview.content_id}
            reviewType={selectedReview.content_type as 'QUESTION' | 'ERROR_NOTEBOOK'}
          />
        )
      )}
    </>
  );
}
