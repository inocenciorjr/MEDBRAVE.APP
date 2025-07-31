import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listQuestions, listAllQuestions, deleteQuestion, updateQuestion, type Question, createQuestion, type ListQuestionsOptions } from "../../services/firebaseQuestionService";
import { getAllFiltersAndSubFiltersOptimized } from "../../services/optimizedFilterService";
import type { Filter as FilterTypeImport, SubFilter as SubFilterTypeImport } from "../../services/firebaseFilterService";
import { formatDate } from "../../utils/dateUtils";

// Componente para estatísticas
const StatsCard: React.FC<{ title: string; value: number; icon: string; color: string }> = ({ title, value, icon, color }) => (
  <div className={`bg-[var(--color-bg-card)] rounded-xl p-6 text-[var(--color-text-main)] shadow-lg`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-[var(--color-text-secondary)] text-sm font-medium">{title}</p>
        <p className="text-3xl font-bold mt-1">{value}</p>
      </div>
      <div className="bg-[var(--color-bg-interactive-hover-subtle)] rounded-lg p-3">
        <i className={`${icon} text-2xl text-[var(--color-brand-primary)]`}></i>
      </div>
    </div>
  </div>
);

// Componente para card de questão
const QuestionCard: React.FC<{ 
  question: Question; 
  onEdit: (question: Question) => void; 
  onDelete: (id: string) => void;
}> = ({ question, onEdit, onDelete }) => {
  const getStatusBadge = (status: string) => {
    const colors = {
      PUBLISHED: 'bg-[var(--color-badge-success-bg)] text-[var(--color-badge-success-text)]',
      DRAFT: 'bg-[var(--color-badge-warning-bg)] text-[var(--color-badge-warning-text)]',
      ARCHIVED: 'bg-[var(--color-badge-neutral-bg)] text-[var(--color-badge-neutral-text)]'
    };
    return colors[status as keyof typeof colors] || colors.DRAFT;
  };

  const getDifficultyBadge = (difficulty: string) => {
    const colors = {
      EASY: 'bg-[var(--color-badge-info-bg)] text-[var(--color-badge-info-text)]',
      MEDIUM: 'bg-[var(--color-badge-warning-bg)] text-[var(--color-badge-warning-text)]',
      HARD: 'bg-[var(--color-badge-error-bg)] text-[var(--color-badge-error-text)]'
    };
    return colors[difficulty as keyof typeof colors] || colors.MEDIUM;
  };

  return (
    <div className="bg-[var(--color-bg-card)] rounded-xl shadow-sm border border-[var(--color-border)] p-6 hover:shadow-md">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-[var(--color-bg-interactive-hover-subtle)] rounded-lg p-2">
            <i className="fas fa-question-circle text-[var(--color-brand-primary)]"></i>
          </div>
          <div>
            <h3 className="font-semibold text-[var(--color-text-main)] text-sm">
              Questão #{question.id?.slice(-8)}
            </h3>
            <p className="text-xs text-[var(--color-text-tertiary)]">
              {new Date(question.createdAt || '').toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(question.status || 'DRAFT')}`}> 
            {question.status || 'DRAFT'}
          </span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyBadge(question.difficulty || 'MEDIUM')}`}> 
            {question.difficulty || 'MEDIUM'}
          </span>
        </div>
      </div>

      {/* Statement */}
      <div className="mb-4">
        <p className="text-[var(--color-text-secondary)] text-sm leading-relaxed line-clamp-3">
          {question.statement || 'Sem enunciado'}
        </p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-4 mb-4 py-3 bg-[var(--color-bg-main)] rounded-lg">
        <div className="text-center">
          <p className="text-lg font-bold text-[var(--color-text-main)]">{question.alternatives?.length || 0}</p>
          <p className="text-xs text-[var(--color-text-tertiary)]">Alternativas</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-[var(--color-text-main)]">{question.tags?.length || 0}</p>
          <p className="text-xs text-[var(--color-text-tertiary)]">Tags</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-[var(--color-text-main)]">{question.filterIds?.length || 0}</p>
          <p className="text-xs text-[var(--color-text-tertiary)]">Filtros</p>
        </div>
      </div>

      {/* Tags */}
      {question.tags && question.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {question.tags.slice(0, 3).map((tag, idx) => (
            <span key={idx} className="bg-[var(--color-bg-badge-info)] text-[var(--color-badge-info)] px-2 py-1 rounded text-xs font-medium">
              {tag}
            </span>
          ))}
          {question.tags.length > 3 && (
            <span className="bg-[var(--color-bg-badge-neutral)] text-[var(--color-badge-neutral)] px-2 py-1 rounded text-xs font-medium">
              +{question.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Special flags */}
      <div className="flex items-center gap-2 mb-4">
        {question.isAnnulled && (
          <span className="bg-[var(--color-badge-error-bg)] text-[var(--color-badge-error-text)] px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
            <i className="fas fa-ban text-xs"></i>
            Anulada
          </span>
        )}
        {question.isOutdated && (
          <span className="bg-[var(--color-badge-warning-bg)] text-[var(--color-badge-warning-text)] px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
            <i className="fas fa-clock text-xs"></i>
            Desatualizada
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-[var(--color-border)]">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onEdit(question)}
            className="flex items-center gap-2 px-3 py-2 bg-[var(--color-bg-interactive)] text-[var(--color-brand-primary)] rounded-lg hover:bg-[var(--color-bg-interactive-hover-subtle)] text-sm font-medium"
          >
            <i className="fas fa-edit text-xs"></i>
            Editar
          </button>
          <button
            onClick={() => onDelete(question.id)}
            className="flex items-center gap-2 px-3 py-2 bg-[var(--color-bg-error)] text-[var(--color-feedback-error)] rounded-lg hover:bg-[var(--color-bg-error-hover)] text-sm font-medium"
          >
            <i className="fas fa-trash text-xs"></i>
            Excluir
          </button>
        </div>
        <div className="flex items-center gap-1 text-xs text-[var(--color-text-tertiary)]">
          <i className="fas fa-clock"></i>
          {new Date(question.updatedAt || question.createdAt || '').toLocaleString()}
        </div>
      </div>
    </div>
  );
};

// Componentes de UI
const Card = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-[var(--color-bg-card)] rounded-lg shadow-sm border border-[var(--color-border)] ${className}`}>
    {children}
  </div>
);

const Button = ({ 
  children, 
  onClick, 
  variant = "primary", 
  size = "md",
  disabled = false,
  className = ""
}: { 
  children: React.ReactNode, 
  onClick?: () => void, 
  variant?: "primary" | "secondary" | "outline" | "danger", 
  size?: "sm" | "md" | "lg",
  disabled?: boolean,
  className?: string
}) => {
  const baseClasses = "inline-flex items-center justify-center font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2";
  
  const sizeClasses = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-5 py-2.5 text-base"
  };
  
  const variantClasses = {
    primary: "bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary-hover)] text-[var(--color-text-on-primary)] focus:ring-[var(--color-brand-primary)]",
    secondary: "bg-[var(--color-brand-secondary)] hover:bg-[var(--color-brand-secondary-hover)] text-[var(--color-text-on-primary)] focus:ring-[var(--color-brand-secondary)]",
    outline: "bg-transparent border border-[var(--color-border)] text-[var(--color-text-main)] hover:bg-[var(--color-bg-interactive-hover-subtle)]",
    danger: "bg-[var(--color-feedback-error)] hover:bg-[var(--color-feedback-error-hover)] text-[var(--color-text-on-primary)] focus:ring-[var(--color-feedback-error)]"
  };
  
  const disabledClasses = disabled 
    ? "opacity-50 cursor-not-allowed" 
    : "cursor-pointer";
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${disabledClasses} ${className}`}
    >
      {children}
    </button>
  );
};

// Badge component para status
const Badge = ({ 
  status, 
  children 
}: { 
  status: "published" | "draft" | "review" | "annulled" | "outdated" | string, 
  children: React.ReactNode 
}) => {
  const statusMap: Record<string, string> = {
    published: "bg-[var(--color-bg-success-subtle)] text-[var(--color-feedback-success)]",
    draft: "bg-[var(--color-bg-interactive-hover-subtle)] text-[var(--color-text-tertiary)]",
    review: "bg-[var(--color-bg-warning-subtle)] text-[var(--color-feedback-warning)]",
    annulled: "bg-[var(--color-bg-error-subtle)] text-[var(--color-feedback-error)]",
    outdated: "bg-[var(--color-bg-warning-subtle)] text-[var(--color-feedback-warning)]",
    PUBLISHED: "bg-[var(--color-bg-success-subtle)] text-[var(--color-feedback-success)]",
    DRAFT: "bg-[var(--color-bg-interactive-hover-subtle)] text-[var(--color-text-tertiary)]",
    REVIEW: "bg-[var(--color-bg-warning-subtle)] text-[var(--color-feedback-warning)]",
    ARCHIVED: "bg-[var(--color-bg-interactive-hover-subtle)] text-[var(--color-text-tertiary)]"
  };
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusMap[status] || "bg-[var(--color-bg-interactive-hover-subtle)] text-[var(--color-text-tertiary)]"}`}>
      {children}
    </span>
  );
};

// Interfaces para filtros
interface FilterNode {
  id: string;
  name: string;
  category?: string;
  description?: string;
  parentId?: string;
  level: number;
  children?: FilterNode[];
  isExpanded?: boolean;
}

const AdminQuestionsPage: React.FC = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<Partial<Question> | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [saving, setSaving] = useState(false);
  
  // Estados para ordenação
  const [sortField, setSortField] = useState<'date' | 'status' | 'id' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Estados para edição em massa
  const [selectedQuestions, setSelectedQuestions] = useState<Set<number>>(new Set());
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [filters, setFilters] = useState<FilterTypeImport[]>([]);
  const [filterTree, setFilterTree] = useState<FilterNode[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [loadingFilters, setLoadingFilters] = useState(false);
  
  const navigate = useNavigate();

  // Função para lidar com ordenação por cabeçalhos
  const handleSort = (field: 'date' | 'status' | 'id') => {
    if (sortField === field) {
      // Se já está ordenando por este campo, inverte a direção
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Se é um novo campo, define como descendente por padrão
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Função para ordenar as questões
  const sortQuestions = (questionsToSort: Question[]) => {
    if (!sortField) return questionsToSort;

    return [...questionsToSort].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'date':
          aValue = new Date(a.createdAt || 0).getTime();
          bValue = new Date(b.createdAt || 0).getTime();
          break;
        case 'status':
          aValue = a.status || 'DRAFT';
          bValue = b.status || 'DRAFT';
          break;
        case 'id':
          aValue = a.id || '';
          bValue = b.id || '';
          break;
        default:
          return 0;
      }

      if (aValue < bValue) {
        return sortDirection === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  // Busca questões do Firestore
  useEffect(() => {
    async function fetchQuestions() {
      setLoading(true);
      setError(null);
      try {
        console.log('🔍 Buscando questões...');
        let data = await listAllQuestions(); // TODO: Implementar paginação adequada
        console.log('📋 Questões encontradas:', data.length);
        
        // Aplicar filtros
        if (search.trim()) {
          const q = search.trim().toLowerCase();
          data = data.filter(qst =>
            qst.statement.toLowerCase().includes(q) ||
            (qst.tags && qst.tags.some(tag => tag.toLowerCase().includes(q)))
          );
        }
        
        if (statusFilter !== 'all') {
          data = data.filter(q => q.status === statusFilter);
        }
        
        if (difficultyFilter !== 'all') {
          data = data.filter(q => q.difficulty === difficultyFilter);
        }
        
        // Aplicar ordenação se houver
        const sortedData = sortQuestions(data);
        setQuestions(sortedData);
        // Limpar seleções quando a lista muda
        setSelectedQuestions(new Set());
      } catch (e: any) {
        console.error('❌ Erro ao buscar questões:', e);
        setError(e.message);
        setQuestions([]);
      } finally {
        setLoading(false);
      }
    }
    fetchQuestions();
  }, [search, statusFilter, difficultyFilter, sortField, sortDirection]);

  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault();
    if (!currentQuestion?.id) return;
    setSaving(true);
    setError(null);
    try {
      await updateQuestion(currentQuestion as Question);
      setShowModal(false);
      // Recarregar lista
      const data = await listAllQuestions(); // TODO: Implementar paginação adequada
      setQuestions(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja excluir esta questão?')) return;
    
    setLoading(true);
    try {
      await deleteQuestion(id);
      const data = await listAllQuestions(); // TODO: Implementar paginação adequada
      setQuestions(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteSelected() {
    if (selectedQuestions.size === 0) return;
    
    const confirmMessage = `Tem certeza que deseja excluir ${selectedQuestions.size} questão(ões) selecionada(s)? Esta ação não pode ser desfeita.`;
    if (!confirm(confirmMessage)) return;
    
    setLoading(true);
    try {
      const promises = Array.from(selectedQuestions).map(idx => {
        const question = questions[idx];
        return deleteQuestion(question.id);
      });
      
      await Promise.all(promises);
      setSelectedQuestions(new Set());
      const data = await listAllQuestions(); // TODO: Implementar paginação adequada
      setQuestions(data);
    } catch (e: any) {
      setError('Erro ao excluir questões: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  const navigateToCreateQuestion = () => {
    navigate('/admin/questions/create');
  };

  // Funções auxiliares para editar tags e alternativas
  const handleTagChange = (idx: number, value: string) => {
    if (!currentQuestion) return;
    const tags = [...(currentQuestion.tags || [])];
    tags[idx] = value;
    setCurrentQuestion({ ...currentQuestion, tags });
  };

  const handleAddTag = () => {
    if (!currentQuestion) return;
    setCurrentQuestion({ ...currentQuestion, tags: [...(currentQuestion.tags || []), ""] });
  };

  const handleRemoveTag = (idx: number) => {
    if (!currentQuestion) return;
    const tags = [...(currentQuestion.tags || [])];
    tags.splice(idx, 1);
    setCurrentQuestion({ ...currentQuestion, tags });
  };

  const handleAltChange = (idx: number, field: 'text' | 'isCorrect' | 'explanation', value: string | boolean) => {
    if (!currentQuestion) return;
    const alternatives = [...(currentQuestion.alternatives || [])];
    alternatives[idx] = { ...alternatives[idx], [field]: value };
    setCurrentQuestion({ ...currentQuestion, alternatives });
  };

  const handleAddAlt = () => {
    if (!currentQuestion) return;
    setCurrentQuestion({ 
      ...currentQuestion, 
      alternatives: [...(currentQuestion.alternatives || []), { text: '', isCorrect: false, explanation: '' }] 
    });
  };

  const handleRemoveAlt = (idx: number) => {
    if (!currentQuestion) return;
    const alternatives = [...(currentQuestion.alternatives || [])];
    alternatives.splice(idx, 1);
    setCurrentQuestion({ ...currentQuestion, alternatives });
  };

  // Funções para edição em massa
  const loadFilters = async () => {
    if (loadingFilters) return;
    setLoadingFilters(true);
    try {
      const filtersData = await getAllFiltersAndSubFiltersOptimized();
      setFilters(filtersData);
      setFilterTree(buildFilterTree(filtersData));
      console.log('🎯 Filtros carregados:', filtersData.length);
    } catch (e: any) {
      console.error('❌ Erro ao carregar filtros:', e);
      setError('Erro ao carregar filtros: ' + e.message);
    } finally {
      setLoadingFilters(false);
    }
  };

  const buildFilterTree = (filtersData: FilterTypeImport[]): FilterNode[] => {
    const nodeMap: Record<string, FilterNode> = {};
    const tree: FilterNode[] = [];
    
    filtersData.forEach(filter => {
      nodeMap[filter.id] = {
        id: filter.id,
        name: filter.name,
        description: filter.description,
        level: 0,
        children: [],
        isExpanded: false
      };
      
      if (filter.children) {
        filter.children.forEach((subFilter: SubFilterTypeImport) => {
          nodeMap[subFilter.id] = {
            id: subFilter.id,
            name: subFilter.name,
            description: subFilter.description,
            parentId: filter.id,
            level: 1,
            children: [],
            isExpanded: false
          };
        });
      }
    });
    
    Object.values(nodeMap).forEach(node => {
      if (node.parentId && nodeMap[node.parentId]) {
        nodeMap[node.parentId].children?.push(node);
      } else if (node.level === 0) {
        tree.push(node);
      }
    });
    
    return tree.sort((a, b) => a.name.localeCompare(b.name));
  };

  const handleSelectQuestion = (index: number) => {
    setSelectedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const handleSelectAllQuestions = () => {
    setSelectedQuestions(prev =>
      prev.size === questions.length ? new Set() : new Set(questions.map((_, index) => index))
    );
  };

  const toggleNodeExpansion = (nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  const applyFilterToSelected = (filterId: string, isSubFilter: boolean = false) => {
    if (selectedQuestions.size === 0) return;
    
    const updatedQuestions = [...questions];
    selectedQuestions.forEach(idx => {
      const question = updatedQuestions[idx];
      
      if (isSubFilter) {
        const subFilterIds = [...(question.subFilterIds || [])];
        if (!subFilterIds.includes(filterId)) {
          subFilterIds.push(filterId);
          question.subFilterIds = subFilterIds;
        }
      } else {
        const filterIds = [...(question.filterIds || [])];
        if (!filterIds.includes(filterId)) {
          filterIds.push(filterId);
          question.filterIds = filterIds;
        }
      }
    });
    
    setQuestions(updatedQuestions);
  };

  const removeFilterFromSelected = (filterId: string, isSubFilter: boolean = false) => {
    if (selectedQuestions.size === 0) return;
    
    const updatedQuestions = [...questions];
    selectedQuestions.forEach(idx => {
      const question = updatedQuestions[idx];
      
      if (isSubFilter) {
        question.subFilterIds = (question.subFilterIds || []).filter(id => id !== filterId);
      } else {
        question.filterIds = (question.filterIds || []).filter(id => id !== filterId);
      }
    });
    
    setQuestions(updatedQuestions);
  };

  const removeAllFiltersFromSelected = () => {
    if (selectedQuestions.size === 0) return;
    
    const updatedQuestions = [...questions];
    selectedQuestions.forEach(idx => {
      const question = updatedQuestions[idx];
      question.filterIds = [];
      question.subFilterIds = [];
    });
    
    setQuestions(updatedQuestions);
  };

  const saveBulkChanges = async () => {
    if (selectedQuestions.size === 0) return;
    
    setSaving(true);
    try {
      const promises = Array.from(selectedQuestions).map(idx => {
        const question = questions[idx];
        return updateQuestion(question);
      });
      
      await Promise.all(promises);
      setShowBulkEditModal(false);
      setSelectedQuestions(new Set());
      
      // Recarregar lista
      const data = await listAllQuestions(); // TODO: Implementar paginação adequada
      setQuestions(data);
    } catch (e: any) {
      setError('Erro ao salvar alterações: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  // Estatísticas
  const stats = {
    total: questions.length,
    published: questions.filter(q => q.status === 'PUBLISHED').length,
    draft: questions.filter(q => q.status === 'DRAFT').length,
    archived: questions.filter(q => q.status === 'ARCHIVED').length,
  };

  return (
    <div className="container mx-auto pb-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-[var(--color-text-main)]">Questões</h1>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={() => navigate('/admin/questions/bulk')}
          >
            <i className="fas fa-layer-group mr-2"></i>
            Bulk de Questões
          </Button>
          {selectedQuestions.size > 0 && (
            <>
              <Button 
                variant="outline"
                onClick={() => {
                  if (filters.length === 0) {
                    loadFilters();
                  }
                  setShowBulkEditModal(true);
                }}
              >
                <i className="fas fa-edit mr-2"></i>
                Editar Filtros ({selectedQuestions.size})
              </Button>
              <Button 
                variant="outline"
                onClick={handleDeleteSelected}
                className="bg-red-50 text-red-600 border-red-200 hover:bg-red-100 hover:border-red-300"
              >
                <i className="fas fa-trash mr-2"></i>
                Remover ({selectedQuestions.size})
              </Button>
            </>
          )}
          <Button 
            onClick={() => navigate('/admin/questions/create')}
          >
            <i className="fas fa-plus mr-2"></i>
            Nova Questão
          </Button>
        </div>
      </div>

      <Card className="mb-6 p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="w-full md:w-1/3">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i className="fas fa-search text-[var(--color-text-tertiary)]"></i>
              </div>
              <input
                type="text"
                placeholder="Buscar questões..."
                className="block w-full pl-10 pr-3 py-2 border border-[var(--color-border)] rounded-md text-[var(--color-text-main)] placeholder-[var(--color-text-tertiary)]"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              className="px-3 py-2 border border-[var(--color-border)] rounded-md text-[var(--color-text-main)]"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="all">Todos os status</option>
              <option value="published">Publicado</option>
              <option value="draft">Rascunho</option>
              <option value="review">Em revisão</option>
              <option value="annulled">Anulada</option>
              <option value="outdated">Desatualizada</option>
            </select>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[var(--color-bg-interactive-hover-subtle)]">
                <th className="px-6 py-3 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedQuestions.size === questions.length && questions.length > 0}
                    onChange={handleSelectAllQuestions}
                    className="w-4 h-4 text-[var(--color-brand-primary)] border-[var(--color-border)] rounded focus:ring-[var(--color-brand-primary)]"
                  />
                </th>
                <th 
                  className="px-6 py-3 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider cursor-pointer hover:bg-[var(--color-bg-interactive-hover)] transition-colors"
                  onClick={() => handleSort('id')}
                >
                  <div className="flex items-center gap-1">
                    ID
                    {sortField === 'id' && (
                      <i className={`fas fa-chevron-${sortDirection === 'asc' ? 'up' : 'down'} text-xs`}></i>
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Questão</th>
                <th className="px-6 py-3 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Especialidade</th>
                <th 
                  className="px-6 py-3 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider cursor-pointer hover:bg-[var(--color-bg-interactive-hover)] transition-colors"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-1">
                    Status
                    {sortField === 'status' && (
                      <i className={`fas fa-chevron-${sortDirection === 'asc' ? 'up' : 'down'} text-xs`}></i>
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider cursor-pointer hover:bg-[var(--color-bg-interactive-hover)] transition-colors"
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center gap-1">
                    Data
                    {sortField === 'date' && (
                      <i className={`fas fa-chevron-${sortDirection === 'asc' ? 'up' : 'down'} text-xs`}></i>
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-[var(--color-text-secondary)]">
                    <i className="fas fa-circle-notch fa-spin mr-2"></i> Carregando questões...
                  </td>
                </tr>
              ) : questions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-[var(--color-text-secondary)]">
                    Nenhuma questão encontrada.
                  </td>
                </tr>
              ) : (
                questions.map((question, index) => (
                  <tr key={question.id} className="hover:bg-[var(--color-bg-interactive-hover-subtle)]">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedQuestions.has(index)}
                        onChange={() => handleSelectQuestion(index)}
                        className="w-4 h-4 text-[var(--color-brand-primary)] border-[var(--color-border)] rounded focus:ring-[var(--color-brand-primary)]"
                      />
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--color-text-tertiary)]">{question.id.substring(0, 8)}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-[var(--color-text-main)]">
                        {question.statement.substring(0, 80)}...
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--color-text-secondary)]">
                      {(question.educationalFilters && question.educationalFilters.length > 0) 
                        ? question.educationalFilters.join(', ') 
                        : (question.filterIds && question.filterIds.length > 0) 
                          ? question.filterIds.join(', ') 
                          : "Não especificado"}
                    </td>
                    <td className="px-6 py-4">
                      <Badge status={question.status || "draft"}>
                        {question.status || "Rascunho"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--color-text-secondary)]">
                      {formatDate(question.createdAt || '')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => navigate(`/admin/questions/${question.id}`)}
                        >
                          <i className="fas fa-eye"></i>
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setCurrentQuestion(question);
                            setShowModal(true);
                          }}
                        >
                          <i className="fas fa-pencil-alt"></i>
                        </Button>
                        <Button 
                          variant="danger" 
                          size="sm"
                          onClick={() => handleDelete(question.id)}
                        >
                          <i className="fas fa-trash"></i>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 bg-[var(--color-bg-interactive-hover-subtle)] border-t border-[var(--color-border)]">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <span className="text-sm text-[var(--color-text-secondary)]">
                Mostrando {questions.length} de {questions.length} questões
              </span>
              {selectedQuestions.size > 0 && (
                <span className="text-sm font-medium text-[var(--color-brand-primary)]">
                  {selectedQuestions.size} selecionada(s)
                </span>
              )}
            </div>
            <div className="flex gap-2">
              {selectedQuestions.size > 0 && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectedQuestions(new Set())}
                >
                  Limpar Seleção
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm"
                disabled={questions.length === 0}
                onClick={() => {
                  setSearch('');
                  setStatusFilter('all');
                  setDifficultyFilter('all');
                }}
              >
                Limpar Filtros
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Modal de edição moderno */}
      {showModal && currentQuestion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--color-bg-card)] rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-[var(--color-border)]">
              <div>
                <h2 className="text-xl font-bold text-[var(--color-text-main)]">Editar Questão</h2>
                <p className="text-[var(--color-text-tertiary)] text-sm">ID: {currentQuestion.id}</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-lg bg-[var(--color-bg-main)] hover:bg-[var(--color-bg-interactive-hover-subtle)] flex items-center justify-center"
              >
                <i className="fas fa-times text-[var(--color-text-tertiary)] text-lg"></i>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <form onSubmit={handleEditSave} className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-main)] mb-2">Status</label>
                    <select
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-brand-primary)] focus:border-[var(--color-brand-primary)] bg-[var(--color-bg-main)] text-[var(--color-text-main)]"
                      value={currentQuestion.status || 'DRAFT'}
                      onChange={e => setCurrentQuestion({ ...currentQuestion, status: e.target.value })}
                    >
                      <option value="DRAFT">Rascunho</option>
                      <option value="PUBLISHED">Publicada</option>
                      <option value="ARCHIVED">Arquivada</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-main)] mb-2">Dificuldade</label>
                    <select
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-brand-primary)] focus:border-[var(--color-brand-primary)] bg-[var(--color-bg-main)] text-[var(--color-text-main)]"
                      value={currentQuestion.difficulty || 'MEDIUM'}
                      onChange={e => setCurrentQuestion({ ...currentQuestion, difficulty: e.target.value })}
                    >
                      <option value="EASY">Fácil</option>
                      <option value="MEDIUM">Médio</option>
                      <option value="HARD">Difícil</option>
                    </select>
                  </div>
                </div>

                {/* Statement */}
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-main)] mb-2">Enunciado</label>
                  <textarea
                    className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-brand-primary)] resize-none"
                    rows={4}
                    placeholder="Digite o enunciado da questão..."
                    value={currentQuestion?.statement || ''}
                    onChange={e => setCurrentQuestion({ ...currentQuestion, statement: e.target.value })}
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-main)] mb-2">Descrição/Explicação</label>
                  <textarea
                    className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-brand-primary)] resize-none"
                    rows={3}
                    placeholder="Descrição ou explicação adicional..."
                    value={currentQuestion?.description || ''}
                    onChange={e => setCurrentQuestion({ ...currentQuestion, description: e.target.value })}
                  />
                </div>

                {/* Special Flags */}
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex items-center gap-3 p-3 border border-[var(--color-border)] rounded-lg cursor-pointer hover:bg-[var(--color-bg-interactive-hover-subtle)]">
                    <input
                      type="checkbox"
                      checked={currentQuestion.isAnnulled || false}
                      onChange={e => setCurrentQuestion({ ...currentQuestion, isAnnulled: e.target.checked })}
                      className="w-4 h-4 text-[var(--color-brand-primary)] border-[var(--color-border)] rounded focus:ring-[var(--color-brand-primary)]"
                    />
                    <div>
                      <span className="font-medium text-[var(--color-text-main)]">Questão Anulada</span>
                      <p className="text-sm text-[var(--color-text-tertiary)]">Marcar como anulada</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 border border-[var(--color-border)] rounded-lg cursor-pointer hover:bg-[var(--color-bg-interactive-hover-subtle)]">
                    <input
                      type="checkbox"
                      checked={currentQuestion.isOutdated || false}
                      onChange={e => setCurrentQuestion({ ...currentQuestion, isOutdated: e.target.checked })}
                      className="w-4 h-4 text-[var(--color-brand-primary)] border-[var(--color-border)] rounded focus:ring-[var(--color-brand-primary)]"
                    />
                    <div>
                      <span className="font-medium text-[var(--color-text-main)]">Questão Desatualizada</span>
                      <p className="text-sm text-[var(--color-text-tertiary)]">Marcar como desatualizada</p>
                    </div>
                  </label>
                </div>

                {/* Tags */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-[var(--color-text-main)]">Tags</label>
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="flex items-center gap-1 px-3 py-1 bg-[var(--color-bg-interactive-hover-subtle)] text-[var(--color-text-main)] rounded-lg hover:bg-[var(--color-bg-interactive)] text-sm"
                    >
                      <i className="fas fa-plus text-xs"></i>
                      Adicionar Tag
                    </button>
                  </div>
                  <div className="space-y-2">
                    {(currentQuestion?.tags || []).map((tag, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          className="flex-1 px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-brand-primary)] focus:border-[var(--color-brand-primary)] bg-[var(--color-bg-main)] text-[var(--color-text-main)]"
                          placeholder="Digite a tag..."
                          value={tag}
                          onChange={e => handleTagChange(idx, e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(idx)}
                          className="w-8 h-8 rounded-lg bg-[var(--color-bg-interactive-hover-subtle)] hover:bg-[var(--color-bg-interactive)] flex items-center justify-center"
                        >
                          <i className="fas fa-times text-[var(--color-text-tertiary)] text-xs"></i>
                        </button>
                      </div>
                    ))}
                    {(currentQuestion?.tags || []).length === 0 && (
                      <p className="text-sm text-[var(--color-text-tertiary)] italic">Nenhuma tag adicionada</p>
                    )}
                  </div>
                </div>

                {/* Alternatives */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-[var(--color-text-main)]">Alternativas</label>
                    <button
                      type="button"
                      onClick={handleAddAlt}
                      className="flex items-center gap-1 px-3 py-1 bg-[var(--color-bg-interactive-hover-subtle)] text-[var(--color-text-main)] rounded-lg hover:bg-[var(--color-bg-interactive)] text-sm"
                    >
                      <i className="fas fa-plus text-xs"></i>
                      Adicionar Alternativa
                    </button>
                  </div>
                  <div className="space-y-4">
                    {(currentQuestion?.alternatives || []).map((alt, idx) => (
                      <div key={idx} className="border border-[var(--color-border)] rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 rounded-full bg-[var(--color-brand-primary)] text-[var(--color-text-on-primary)] flex items-center justify-center font-bold text-sm">
                              {String.fromCharCode(65 + idx)}
                            </span>
                            <span className="font-medium text-[var(--color-text-main)]">Alternativa {String.fromCharCode(65 + idx)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                              {(currentQuestion.isAnnulled || currentQuestion.isOutdated) ? (
                                <input
                                  type="checkbox"
                                  checked={alt.isCorrect}
                                  onChange={(e) => {
                                    handleAltChange(idx, 'isCorrect', e.target.checked);
                                  }}
                                  className="w-4 h-4 text-[var(--color-brand-primary)] border-[var(--color-border)] rounded focus:ring-[var(--color-brand-primary)]"
                                />
                              ) : (
                                <input
                                  type="radio"
                                  name="correctAnswer"
                                  checked={alt.isCorrect}
                                  onChange={() => {
                                    const alternatives = [...(currentQuestion.alternatives || [])];
                                    alternatives.forEach((a, i) => a.isCorrect = i === idx);
                                    setCurrentQuestion({ ...currentQuestion, alternatives });
                                  }}
                                  className="w-4 h-4 text-[var(--color-brand-primary)] border-[var(--color-border)] focus:ring-[var(--color-brand-primary)]"
                                />
                              )}
                              <span className="text-sm text-[var(--color-text-main)] font-medium">
                                {(currentQuestion.isAnnulled || currentQuestion.isOutdated) ? 'Correta' : 'Correta (única)'}
                              </span>
                            </label>
                            <button
                              type="button"
                              onClick={() => handleRemoveAlt(idx)}
                              className="w-6 h-6 rounded bg-[var(--color-bg-interactive-hover-subtle)] hover:bg-[var(--color-bg-interactive)] flex items-center justify-center"
                            >
                              <i className="fas fa-times text-[var(--color-text-tertiary)] text-xs"></i>
                            </button>
                          </div>
                        </div>
                        
                        {(currentQuestion.isAnnulled || currentQuestion.isOutdated) && idx === 0 && (
                          <div className="mb-3 p-3 bg-[var(--color-bg-warning-subtle)] border border-[var(--color-border-warning)] rounded-lg">
                            <div className="flex items-center gap-2 text-[var(--color-feedback-warning)]">
                              <i className="fas fa-info-circle"></i>
                              <span className="text-sm font-medium">
                                {currentQuestion.isAnnulled ? 'Questão anulada:' : 'Questão desatualizada:'} múltiplas respostas permitidas
                              </span>
                            </div>
                            <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                              Você pode marcar várias alternativas como corretas e explicar no comentário.
                            </p>
                          </div>
                        )}
                        
                        <div className="space-y-3">
                          <input
                            type="text"
                            className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-brand-primary)] focus:border-[var(--color-brand-primary)] bg-[var(--color-bg-main)] text-[var(--color-text-main)]"
                            placeholder="Texto da alternativa..."
                            value={alt.text}
                            onChange={e => handleAltChange(idx, 'text', e.target.value)}
                          />
                          <textarea
                            className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-brand-primary)] resize-none"
                            rows={2}
                            placeholder="Explicação da alternativa (opcional)..."
                            value={alt.explanation || ''}
                            onChange={e => handleAltChange(idx, 'explanation', e.target.value)}
                          />
                        </div>
                      </div>
                    ))}
                    {(currentQuestion?.alternatives || []).length === 0 && (
                      <p className="text-sm text-[var(--color-text-tertiary)] italic">Nenhuma alternativa adicionada</p>
                    )}
                  </div>
                </div>
              </form>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-[var(--color-border)] bg-[var(--color-bg-main)]">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                disabled={saving}
                className="px-4 py-2 border border-[var(--color-border)] text-[var(--color-text-main)] rounded-lg hover:bg-[var(--color-bg-interactive-hover-subtle)]"
              >
                Cancelar
              </button>
              <button
                onClick={handleEditSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-[var(--color-brand-primary)] text-[var(--color-text-on-primary)] rounded-lg hover:bg-[var(--color-brand-primary-hover)] disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--color-text-on-primary)]"></div>
                    Salvando...
                  </>
                ) : (
                  <>
                    <i className="fas fa-save"></i>
                    Salvar Alterações
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de edição em massa de filtros */}
      {showBulkEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--color-bg-card)] rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-[var(--color-border)]">
              <div>
                <h2 className="text-xl font-bold text-[var(--color-text-main)]">Edição em Massa de Filtros</h2>
                <p className="text-[var(--color-text-tertiary)] text-sm">
                  {selectedQuestions.size} questão(ões) selecionada(s)
                </p>
              </div>
              <button
                onClick={() => setShowBulkEditModal(false)}
                className="w-8 h-8 rounded-lg bg-[var(--color-bg-main)] hover:bg-[var(--color-bg-interactive-hover-subtle)] flex items-center justify-center"
              >
                <i className="fas fa-times text-[var(--color-text-tertiary)] text-lg"></i>
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              {loadingFilters ? (
                <div className="text-center py-8">
                  <i className="fas fa-circle-notch fa-spin mr-2"></i>
                  Carregando filtros...
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Ações rápidas */}
                  <div className="bg-[var(--color-bg-main)] rounded-lg p-4">
                    <h3 className="font-semibold text-[var(--color-text-main)] mb-3">Ações Rápidas</h3>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={removeAllFiltersFromSelected}
                      >
                        <i className="fas fa-trash mr-2"></i>
                        Remover Todos os Filtros
                      </Button>
                    </div>
                  </div>

                  {/* Árvore de filtros */}
                  <div className="bg-[var(--color-bg-main)] rounded-lg p-4">
                    <h3 className="font-semibold text-[var(--color-text-main)] mb-3">Filtros Disponíveis</h3>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                       {filterTree.map(node => (
                         <FilterTreeNode 
                           key={node.id} 
                           node={node} 
                           level={0}
                           expandedNodes={expandedNodes}
                           selectedQuestions={selectedQuestions}
                           toggleNodeExpansion={toggleNodeExpansion}
                           applyFilterToSelected={applyFilterToSelected}
                           removeFilterFromSelected={removeFilterFromSelected}
                         />
                       ))}
                     </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-[var(--color-border)] bg-[var(--color-bg-main)]">
              <button
                type="button"
                onClick={() => setShowBulkEditModal(false)}
                disabled={saving}
                className="px-4 py-2 border border-[var(--color-border)] text-[var(--color-text-main)] rounded-lg hover:bg-[var(--color-bg-interactive-hover-subtle)]"
              >
                Cancelar
              </button>
              <button
                onClick={saveBulkChanges}
                disabled={saving || selectedQuestions.size === 0}
                className="flex items-center gap-2 px-6 py-2 bg-[var(--color-brand-primary)] text-[var(--color-text-on-primary)] rounded-lg hover:bg-[var(--color-brand-primary-hover)] disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--color-text-on-primary)]"></div>
                    Salvando...
                  </>
                ) : (
                  <>
                    <i className="fas fa-save"></i>
                    Salvar Alterações
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Componente para nó da árvore de filtros
const FilterTreeNode: React.FC<{ 
  node: FilterNode; 
  level: number;
  expandedNodes: Set<string>;
  selectedQuestions: Set<number>;
  toggleNodeExpansion: (nodeId: string) => void;
  applyFilterToSelected: (filterId: string, isSubFilter: boolean) => void;
  removeFilterFromSelected: (filterId: string, isSubFilter: boolean) => void;
}> = ({ node, level, expandedNodes, selectedQuestions, toggleNodeExpansion, applyFilterToSelected, removeFilterFromSelected }) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id);
    const indentWidth = level * 20;
    
    return (
      <div className="filter-tree-node">
        <div 
          className={`flex items-center py-2 px-3 hover:bg-gray-50 rounded-lg border transition-all mb-1 ${
            hasChildren ? 'border-gray-200 bg-white' : 'border-transparent bg-gray-50'
          }`} 
          style={{ marginLeft: `${indentWidth}px` }}
        >
          {/* Botão de expansão */}
          {hasChildren && (
            <button 
              className={`w-6 h-6 rounded-md flex items-center justify-center border mr-2 ${
                isExpanded 
                  ? 'bg-[var(--color-brand-primary)] border-[var(--color-brand-primary-hover)] text-[var(--color-text-on-primary)]' 
                  : 'bg-[var(--color-bg-card)] border-[var(--color-border)] text-[var(--color-text-main)]'
              }`}
              onClick={(e) => { 
                e.preventDefault(); 
                e.stopPropagation(); 
                toggleNodeExpansion(node.id); 
              }}
              title={isExpanded ? 'Recolher' : 'Expandir'}
            >
              {isExpanded ? '−' : '+'}
            </button>
          )}
          
          {/* Informações do filtro */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className="text-sm font-medium text-gray-900 truncate" title={node.name}>
                {node.name}
              </div>
              {hasChildren && (
                <span className={`text-xs px-2 py-1 rounded-full ${
                  isExpanded ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'
                }`}>
                  {node.children!.length} {node.children!.length === 1 ? 'item' : 'itens'}
                </span>
              )}
              {level > 0 && (
                <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-600">
                  Nível {level}
                </span>
              )}
            </div>
          </div>
          
          {/* Botões de ação */}
          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                applyFilterToSelected(node.id, level > 0);
              }}
              disabled={selectedQuestions.size === 0}
              className={`px-2 py-1 text-xs font-medium rounded-lg transition-colors ${
                selectedQuestions.size === 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-[var(--color-bg-accent)] text-[var(--color-text-on-primary)] hover:bg-[var(--color-bg-accent-hover)]'
              }`}
              title={`Aplicar "${node.name}" às ${selectedQuestions.size} questões selecionadas`}
            >
              <i className="fas fa-plus mr-1"></i>
              Aplicar
            </button>
            
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                removeFilterFromSelected(node.id, level > 0);
              }}
              disabled={selectedQuestions.size === 0}
              className={`px-2 py-1 text-xs font-medium rounded-lg transition-colors ${
                selectedQuestions.size === 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-red-100 text-red-600 hover:bg-red-200'
              }`}
              title={`Remover "${node.name}" das ${selectedQuestions.size} questões selecionadas`}
            >
              <i className="fas fa-minus mr-1"></i>
              Remover
            </button>
          </div>
        </div>
        
        {/* Filhos */}
        {hasChildren && isExpanded && (
          <div className="ml-4">
            {node.children!.map(child => (
              <FilterTreeNode 
                key={child.id} 
                node={child} 
                level={level + 1}
                expandedNodes={expandedNodes}
                selectedQuestions={selectedQuestions}
                toggleNodeExpansion={toggleNodeExpansion}
                applyFilterToSelected={applyFilterToSelected}
                removeFilterFromSelected={removeFilterFromSelected}
              />
            ))}
          </div>
        )}
      </div>
     );
   };

export default AdminQuestionsPage;