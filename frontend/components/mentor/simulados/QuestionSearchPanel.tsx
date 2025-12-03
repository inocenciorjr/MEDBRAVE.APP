'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { SelectedQuestion } from '@/app/mentor/simulados/criar/page';
import api from '@/services/api';
import Checkbox from '@/components/ui/Checkbox';
import { TabGroup } from '@/components/ui/TabGroup';
import EmptyState from '@/components/ui/EmptyState';
import { useToast } from '@/lib/contexts/ToastContext';
import CustomQuestionEditor, { CustomQuestionData } from './CustomQuestionEditor';
import QuestionDetailModal from './QuestionDetailModal';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface QuestionSearchPanelProps {
  onAddQuestion: (question: SelectedQuestion) => void;
  onFiltersLoaded?: (filtersMap: Map<string, string>) => void;
  selectedQuestionIds?: string[];
}

interface SearchFilters {
  query: string;
}

interface QuestionResult {
  id: string;
  content: string;
  title?: string;
  filter_ids?: string[];
  sub_filter_ids?: string[];
  tags?: string[];
  difficulty?: number;
  options?: any[];
  correct_answer?: string;
  explanation?: string;
  professor_comment?: string;
  is_annulled?: boolean;
  is_outdated?: boolean;
}

interface FilterNode {
  id: string;
  name: string;
  level: number;
  children?: FilterNode[];
}

interface InstitutionNode {
  id: string;
  name: string;
  state?: string;
  children?: InstitutionNode[];
}

interface YearNode {
  id: string;
  name: string;
  children?: { id: string; name: string }[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STATE_NAMES: Record<string, string> = {
  'AC': 'Acre', 'AL': 'Alagoas', 'AP': 'Amapá', 'AM': 'Amazonas',
  'BA': 'Bahia', 'CE': 'Ceará', 'DF': 'Distrito Federal', 'ES': 'Espírito Santo',
  'GO': 'Goiás', 'MA': 'Maranhão', 'MT': 'Mato Grosso', 'MS': 'Mato Grosso do Sul',
  'MG': 'Minas Gerais', 'PA': 'Pará', 'PB': 'Paraíba', 'PR': 'Paraná',
  'PE': 'Pernambuco', 'PI': 'Piauí', 'RJ': 'Rio de Janeiro', 'RN': 'Rio Grande do Norte',
  'RS': 'Rio Grande do Sul', 'RO': 'Rondônia', 'RR': 'Roraima', 'SC': 'Santa Catarina',
  'SP': 'São Paulo', 'SE': 'Sergipe', 'TO': 'Tocantins',
};



const TABS = [
  { id: 'search', label: 'Buscar', icon: 'search' },
  { id: 'filters', label: 'Filtros', icon: 'filter_list' },
  { id: 'custom', label: 'Autoral', icon: 'edit' },
];

// ============================================================================
// COMPONENT
// ============================================================================

export default function QuestionSearchPanel({ onAddQuestion, onFiltersLoaded, selectedQuestionIds = [] }: QuestionSearchPanelProps) {
  const toast = useToast();
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'search' | 'filters' | 'custom'>('search');
  
  // Search state
  const [filters, setFilters] = useState<SearchFilters>({ query: '' });
  const [searchType, setSearchType] = useState<'id' | 'text'>('text');
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const resultsContainerRef = useRef<HTMLDivElement | null>(null);
  const ITEMS_PER_PAGE = 20;

  // Help modal state
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [isHelpAnimating, setIsHelpAnimating] = useState(false);
  const [shouldRenderHelp, setShouldRenderHelp] = useState(false);
  
  // Question card expanded filters
  const [expandedFilters, setExpandedFilters] = useState<Set<string>>(new Set());
  
  // Question detail modal
  const [selectedQuestionForDetail, setSelectedQuestionForDetail] = useState<QuestionResult | null>(null);

  // Filter data
  const [specialties, setSpecialties] = useState<FilterNode[]>([]);
  const [institutions, setInstitutions] = useState<InstitutionNode[]>([]);
  const [years, setYears] = useState<YearNode[]>([]);
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [subFiltersMap, setSubFiltersMap] = useState<Map<string, string>>(new Map());

  // Selected filters
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [selectedInstitutions, setSelectedInstitutions] = useState<string[]>([]);
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  
  // Expanded filter sections
  const [expandedSpecialties, setExpandedSpecialties] = useState<Set<string>>(new Set());
  const [expandedInstitutions, setExpandedInstitutions] = useState<Set<string>>(new Set());
  const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set());
  
  // Filter search
  const [specialtySearch, setSpecialtySearch] = useState('');
  const [institutionSearch, setInstitutionSearch] = useState('');

  // Filter results
  const [filterResults, setFilterResults] = useState<QuestionResult[]>([]);
  const [filterResultsCount, setFilterResultsCount] = useState(0);
  const [isLoadingFilterResults, setIsLoadingFilterResults] = useState(false);

  // Custom question state
  const [showCustomEditor, setShowCustomEditor] = useState(false);
  const [pendingCustomQuestions, setPendingCustomQuestions] = useState<Array<{
    id: string;
    content: string;
    alternatives: any[];
    explanation?: string;
    subFilterIds?: string[];
    difficulty?: number;
    tempData: CustomQuestionData;
  }>>([]);

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  useEffect(() => {
    loadFilterData();
  }, []);

  // Help modal animation
  useEffect(() => {
    if (showHelpModal) {
      setShouldRenderHelp(true);
      setTimeout(() => setIsHelpAnimating(true), 10);
    } else {
      setIsHelpAnimating(false);
      const timer = setTimeout(() => setShouldRenderHelp(false), 300);
      return () => clearTimeout(timer);
    }
  }, [showHelpModal]);

  const loadFilterData = async () => {
    setLoadingFilters(true);
    try {
      const [specialtiesRes, institutionsRes, yearsRes] = await Promise.all([
        api.get('/banco-questoes/filters/hierarchy'),
        api.get('/banco-questoes/institutions'),
        api.get('/banco-questoes/years'),
      ]);
      
      setSpecialties(specialtiesRes.data.data || []);
      setInstitutions(institutionsRes.data.data || []);
      setYears(yearsRes.data.data || []);
      
      // Build names map
      const namesMap = new Map<string, string>();
      
      const institutionsData = institutionsRes.data.data || [];
      institutionsData.forEach((state: InstitutionNode) => {
        namesMap.set(state.id, state.name);
        state.children?.forEach((inst) => namesMap.set(inst.id, inst.name));
      });
      
      const yearsData = yearsRes.data.data || [];
      yearsData.forEach((year: YearNode) => {
        namesMap.set(year.id, year.name);
        year.children?.forEach((subYear) => namesMap.set(subYear.id, subYear.name));
      });
      
      const addSpecialtiesToMap = (nodes: FilterNode[]) => {
        nodes.forEach((node) => {
          namesMap.set(node.id, node.name);
          if (node.children) addSpecialtiesToMap(node.children);
        });
      };
      addSpecialtiesToMap(specialtiesRes.data.data || []);
      
      setSubFiltersMap(namesMap);
      // Notificar o componente pai sobre os filtros carregados
      onFiltersLoaded?.(namesMap);
    } catch (error) {
      console.error('Erro ao carregar filtros:', error);
      toast.error('Erro ao carregar filtros');
    } finally {
      setLoadingFilters(false);
    }
  };

  // ============================================================================
  // SEARCH FUNCTIONS
  // ============================================================================

  const searchQuestions = async (page: number = 1) => {
    if (!filters.query || filters.query.length < 2) {
      setResults([]);
      setTotalResults(0);
      setCurrentPage(1);
      setTotalPages(0);
      setSearchType('text');
      return;
    }

    setIsSearching(true);
    try {
      // Endpoint unificado - detecta automaticamente se é ID ou texto
      const response = await api.post('/banco-questoes/questions/search-unified', {
        query: filters.query,
        limit: ITEMS_PER_PAGE,
        page,
      });
      
      setResults(response.data.data?.questions || []);
      setTotalResults(response.data.data?.total || 0);
      setCurrentPage(response.data.data?.page || 1);
      setTotalPages(response.data.data?.totalPages || 0);
      setSearchType(response.data.data?.searchType || 'text');
    } catch (error) {
      console.error('Erro ao buscar questões:', error);
      setResults([]);
      setTotalResults(0);
      setCurrentPage(1);
      setTotalPages(0);
    } finally {
      setIsSearching(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      searchQuestions(newPage);
      // Scroll para o topo dos resultados
      resultsContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Debounced search - reset to page 1 when query changes
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => searchQuestions(1), 500);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [filters.query]);

  const searchByFilters = async () => {
    const hasFilters = selectedSpecialties.length > 0 || 
                       selectedInstitutions.length > 0 || 
                       selectedYears.length > 0;
    
    if (!hasFilters) {
      setFilterResults([]);
      setFilterResultsCount(0);
      return;
    }

    setIsLoadingFilterResults(true);
    try {
      const yearNumbers = selectedYears
        .map(y => y.match(/\d{4}/)?.[0])
        .filter(Boolean)
        .map(Number);

      const response = await api.post('/banco-questoes/questions/search', {
        subFilterIds: selectedSpecialties,
        institutions: selectedInstitutions,
        years: yearNumbers,
        limit: 50,
        page: 1,
      });
      
      setFilterResults(response.data.data?.questions || []);
      setFilterResultsCount(response.data.data?.total || 0);
    } catch (error) {
      console.error('Erro ao buscar questões por filtros:', error);
      setFilterResults([]);
      setFilterResultsCount(0);
    } finally {
      setIsLoadingFilterResults(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'filters') {
      const timer = setTimeout(searchByFilters, 300);
      return () => clearTimeout(timer);
    }
  }, [selectedSpecialties, selectedInstitutions, selectedYears, activeTab]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleAddFromBank = (question: QuestionResult) => {
    // Extrair informações dos sub_filter_ids
    const subFilters = question.sub_filter_ids || [];
    
    // Encontrar instituição
    const institutionId = subFilters.find(id => id.startsWith('Universidade_'));
    const university = institutionId ? subFiltersMap.get(institutionId) || institutionId.split('_').pop() : undefined;
    
    // Encontrar ano
    const yearId = subFilters.find(id => id.startsWith('Ano da Prova_'));
    const year = yearId ? parseInt(yearId.match(/\d{4}/)?.[0] || '') : undefined;
    
    // Encontrar especialidade principal
    const specialtyId = subFilters.find(id => 
      !id.startsWith('Universidade_') && !id.startsWith('Ano da Prova_')
    );
    const specialty = specialtyId ? subFiltersMap.get(specialtyId) || specialtyId.split('_')[0] : undefined;

    // Verificar se já foi adicionada
    if (selectedQuestionIds.includes(question.id)) {
      toast.warning('Questão já adicionada');
      return;
    }

    onAddQuestion({
      id: question.id,
      type: 'bank',
      enunciado: question.content || question.title || '',
      specialty,
      university,
      year: year || undefined,
      subFilterIds: subFilters,
    });
    
    toast.success('Questão adicionada!');
  };

  const handleSaveCustomQuestion = (questionData: CustomQuestionData) => {
    // Criar questão pendente (será criada no banco quando o simulado for salvo)
    const pendingQuestion = {
      id: `pending-${Date.now()}`,
      content: questionData.content,
      alternatives: questionData.alternatives,
      explanation: questionData.explanation,
      subFilterIds: questionData.subFilterIds,
      difficulty: questionData.difficulty,
      tempData: questionData
    };

    setPendingCustomQuestions(prev => [...prev, pendingQuestion]);
    
    // Adicionar ao simulado
    onAddQuestion({
      id: pendingQuestion.id,
      type: 'custom',
      enunciado: questionData.content,
      alternatives: questionData.alternatives,
      tempData: questionData
    } as SelectedQuestion);

    setShowCustomEditor(false);
    toast.success('Questão autoral adicionada! Será criada no banco quando o simulado for salvo.');
  };

  const handleRemovePendingQuestion = (id: string) => {
    setPendingCustomQuestions(prev => prev.filter(q => q.id !== id));
  };

  const copyIdToClipboard = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success('ID copiado!');
  };

  const toggleExpandFilters = (questionId: string) => {
    setExpandedFilters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) newSet.delete(questionId);
      else newSet.add(questionId);
      return newSet;
    });
  };


  // ============================================================================
  // FILTER TOGGLE FUNCTIONS
  // ============================================================================

  const toggleSpecialty = useCallback((id: string) => {
    setSelectedSpecialties(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  }, []);

  const toggleInstitution = useCallback((id: string) => {
    setSelectedInstitutions(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  }, []);

  const toggleYear = useCallback((id: string) => {
    setSelectedYears(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  }, []);

  const toggleExpandSpecialty = useCallback((id: string) => {
    setExpandedSpecialties(prev => {
      const newSet = new Set(prev);
      newSet.has(id) ? newSet.delete(id) : newSet.add(id);
      return newSet;
    });
  }, []);

  const toggleExpandInstitution = useCallback((id: string) => {
    setExpandedInstitutions(prev => {
      const newSet = new Set(prev);
      newSet.has(id) ? newSet.delete(id) : newSet.add(id);
      return newSet;
    });
  }, []);

  const toggleExpandYear = useCallback((id: string) => {
    setExpandedYears(prev => {
      const newSet = new Set(prev);
      newSet.has(id) ? newSet.delete(id) : newSet.add(id);
      return newSet;
    });
  }, []);

  const getAllDescendantIds = useCallback((node: FilterNode): string[] => {
    const ids = [node.id];
    node.children?.forEach(child => ids.push(...getAllDescendantIds(child)));
    return ids;
  }, []);

  const toggleAllDescendants = useCallback((node: FilterNode, selected: string[], toggle: (id: string) => void) => {
    const allIds = getAllDescendantIds(node);
    const allSelected = allIds.every(id => selected.includes(id));
    allIds.forEach(id => {
      if (allSelected ? selected.includes(id) : !selected.includes(id)) toggle(id);
    });
  }, [getAllDescendantIds]);

  // ============================================================================
  // MEMOIZED DATA
  // ============================================================================

  const filteredSpecialties = useMemo(() => {
    if (!specialtySearch.trim()) return specialties;
    const search = specialtySearch.toLowerCase();
    const filterNodes = (nodes: FilterNode[]): FilterNode[] => {
      return nodes.reduce((acc: FilterNode[], node) => {
        const matches = node.name.toLowerCase().includes(search);
        const filteredChildren = node.children ? filterNodes(node.children) : [];
        if (matches || filteredChildren.length > 0) {
          acc.push({ ...node, children: filteredChildren.length > 0 ? filteredChildren : node.children });
        }
        return acc;
      }, []);
    };
    return filterNodes(specialties);
  }, [specialties, specialtySearch]);

  const filteredInstitutions = useMemo(() => {
    if (!institutionSearch.trim()) return institutions;
    const search = institutionSearch.toLowerCase();
    return institutions.filter(inst => 
      inst.name.toLowerCase().includes(search) ||
      inst.state?.toLowerCase().includes(search) ||
      inst.children?.some(c => c.name.toLowerCase().includes(search))
    );
  }, [institutions, institutionSearch]);

  const totalSelectedFilters = selectedSpecialties.length + selectedInstitutions.length + selectedYears.length;

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  const getIdSuffix = (id: string) => {
    const parts = id.split('-');
    return parts[parts.length - 1]?.toUpperCase() || id.slice(-6).toUpperCase();
  };

  const isHtmlContent = (content: string): boolean => /<[a-z][\s\S]*>/i.test(content);

  const highlightText = (text: string, search: string) => {
    if (!search.trim()) return text;
    const parts = text.split(new RegExp(`(${search})`, 'gi'));
    return parts.map((part, index) =>
      part.toLowerCase() === search.toLowerCase() 
        ? <mark key={index} className="bg-primary/20 rounded-sm px-0.5">{part}</mark> 
        : part
    );
  };

  const getInstitutionFromQuestion = (question: QuestionResult): string | null => {
    const institutionId = question.sub_filter_ids?.find(id => 
      id.includes('Universidade_') || id.includes('universidade_')
    );
    if (institutionId) {
      return subFiltersMap.get(institutionId) || institutionId.split('_').pop() || null;
    }
    return null;
  };

  const getYearFromQuestion = (question: QuestionResult): string | null => {
    const yearId = question.sub_filter_ids?.find(id => 
      id.includes('Ano da Prova_') || id.includes('ano_')
    );
    if (yearId) {
      return subFiltersMap.get(yearId) || yearId.match(/\d{4}/)?.[0] || null;
    }
    return null;
  };

  const getSpecialtyFilters = (question: QuestionResult): Array<{id: string, name: string}> => {
    const specialtyIds = (question.sub_filter_ids || []).filter(id => 
      !id.includes('Ano da Prova_') && !id.includes('Universidade_') &&
      !id.includes('ano_') && !id.includes('universidade_')
    );
    return specialtyIds.map(id => ({
      id,
      name: subFiltersMap.get(id) || id.split('_').pop()?.replace(/([A-Z])/g, ' $1').trim() || id
    }));
  };


  // ============================================================================
  // RENDER FUNCTIONS
  // ============================================================================

  const renderSpecialtyNode = (node: FilterNode, depth: number = 0) => {
    const isExpanded = expandedSpecialties.has(node.id);
    const isSelected = selectedSpecialties.includes(node.id);
    const hasChildren = node.children && node.children.length > 0;
    
    return (
      <div key={node.id} className="animate-in fade-in duration-200">
        <div 
          className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors
            hover:bg-primary/5 dark:hover:bg-primary/10 ${depth > 0 ? 'ml-4' : ''}`}
          onClick={() => hasChildren && toggleExpandSpecialty(node.id)}
        >
          {hasChildren ? (
            <span className={`material-symbols-outlined text-sm text-text-light-secondary 
              dark:text-text-dark-secondary transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
              chevron_right
            </span>
          ) : <span className="w-5" />}
          <div onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={isSelected}
              onChange={() => hasChildren 
                ? toggleAllDescendants(node, selectedSpecialties, toggleSpecialty)
                : toggleSpecialty(node.id)
              }
            />
          </div>
          <span 
            className="text-sm text-text-light-primary dark:text-text-dark-primary cursor-pointer
              hover:text-primary transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              hasChildren 
                ? toggleAllDescendants(node, selectedSpecialties, toggleSpecialty)
                : toggleSpecialty(node.id);
            }}
          >
            {highlightText(node.name, specialtySearch)}
          </span>
        </div>
        {hasChildren && isExpanded && (
          <div className="pl-2">
            {node.children!.map(child => renderSpecialtyNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderInstitutionNode = (node: InstitutionNode) => {
    const isExpanded = expandedInstitutions.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const stateName = node.state ? (STATE_NAMES[node.state] || node.state) : node.name;
    
    if (hasChildren) {
      const allSelected = node.children!.every(c => selectedInstitutions.includes(c.id));
      const someSelected = node.children!.some(c => selectedInstitutions.includes(c.id));
      
      return (
        <div key={node.id} className="animate-in fade-in duration-200">
          <div 
            className="flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors
              hover:bg-primary/5 dark:hover:bg-primary/10"
            onClick={() => toggleExpandInstitution(node.id)}
          >
            <span className={`material-symbols-outlined text-sm text-text-light-secondary 
              dark:text-text-dark-secondary transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
              chevron_right
            </span>
            <div onClick={(e) => e.stopPropagation()}>
              <Checkbox
                checked={allSelected}
                indeterminate={someSelected && !allSelected}
                onChange={() => {
                  node.children!.forEach(c => {
                    if (allSelected ? selectedInstitutions.includes(c.id) : !selectedInstitutions.includes(c.id)) 
                      toggleInstitution(c.id);
                  });
                }}
              />
            </div>
            <span className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
              {highlightText(stateName, institutionSearch)}
            </span>
          </div>
          {isExpanded && (
            <div className="pl-8 space-y-1">
              {node.children!.map(child => (
                <div 
                  key={child.id}
                  className="flex items-center gap-2 p-2 rounded-lg transition-colors
                    hover:bg-primary/5 dark:hover:bg-primary/10"
                >
                  <Checkbox
                    checked={selectedInstitutions.includes(child.id)}
                    onChange={() => toggleInstitution(child.id)}
                  />
                  <span 
                    className="text-sm text-text-light-primary dark:text-text-dark-primary cursor-pointer
                      hover:text-primary transition-colors"
                    onClick={() => toggleInstitution(child.id)}
                  >
                    {highlightText(child.name, institutionSearch)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    
    return (
      <div 
        key={node.id}
        className="flex items-center gap-2 p-2 rounded-lg transition-colors
          hover:bg-primary/5 dark:hover:bg-primary/10"
      >
        <Checkbox
          checked={selectedInstitutions.includes(node.id)}
          onChange={() => toggleInstitution(node.id)}
        />
        <span 
          className="text-sm text-text-light-primary dark:text-text-dark-primary cursor-pointer
            hover:text-primary transition-colors"
          onClick={() => toggleInstitution(node.id)}
        >
          {highlightText(node.name, institutionSearch)}
        </span>
      </div>
    );
  };

  const renderYearNode = (node: YearNode) => {
    const isExpanded = expandedYears.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    
    if (hasChildren) {
      const allSelected = node.children!.every(c => selectedYears.includes(c.id));
      const someSelected = node.children!.some(c => selectedYears.includes(c.id));
      
      return (
        <div key={node.id} className="animate-in fade-in duration-200">
          <div 
            className="flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors
              hover:bg-primary/5 dark:hover:bg-primary/10"
            onClick={() => toggleExpandYear(node.id)}
          >
            <span className={`material-symbols-outlined text-sm text-text-light-secondary 
              dark:text-text-dark-secondary transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
              chevron_right
            </span>
            <div onClick={(e) => e.stopPropagation()}>
              <Checkbox
                checked={allSelected}
                indeterminate={someSelected && !allSelected}
                onChange={() => {
                  node.children!.forEach(c => {
                    if (allSelected ? selectedYears.includes(c.id) : !selectedYears.includes(c.id)) 
                      toggleYear(c.id);
                  });
                }}
              />
            </div>
            <span className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
              {node.name}
            </span>
          </div>
          {isExpanded && (
            <div className="pl-8 flex flex-wrap gap-2 py-2">
              {node.children!.map(child => (
                <button
                  key={child.id}
                  onClick={() => toggleYear(child.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200
                    ${selectedYears.includes(child.id)
                      ? 'bg-primary text-white shadow-md'
                      : 'bg-background-light dark:bg-background-dark text-text-light-primary dark:text-text-dark-primary hover:bg-primary/10'
                    }`}
                >
                  {child.name}
                </button>
              ))}
            </div>
          )}
        </div>
      );
    }
    
    return (
      <button
        key={node.id}
        onClick={() => toggleYear(node.id)}
        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200
          ${selectedYears.includes(node.id)
            ? 'bg-primary text-white shadow-md'
            : 'bg-background-light dark:bg-background-dark text-text-light-primary dark:text-text-dark-primary hover:bg-primary/10'
          }`}
      >
        {node.name}
      </button>
    );
  };


  // ============================================================================
  // QUESTION CARD COMPONENT
  // ============================================================================

  const renderQuestionCard = (question: QuestionResult) => {
    const institution = getInstitutionFromQuestion(question);
    const year = getYearFromQuestion(question);
    const specialtyFilters = getSpecialtyFilters(question);
    const isExpanded = expandedFilters.has(question.id);
    const content = question.content || question.title || '';
    const isHtml = isHtmlContent(content);
    const visibleFilters = isExpanded ? specialtyFilters : specialtyFilters.slice(0, 4);
    const hiddenCount = specialtyFilters.length - 4;
    const isAlreadyAdded = selectedQuestionIds.includes(question.id);

    return (
      <div
        key={question.id}
        className={`bg-surface-light dark:bg-surface-dark rounded-xl p-5
          border transition-all duration-300 group cursor-pointer
          ${isAlreadyAdded 
            ? 'border-green-500 dark:border-green-500 shadow-lg shadow-green-500/20 dark:shadow-green-500/20' 
            : 'border-border-light dark:border-border-dark shadow-lg dark:shadow-dark-lg hover:shadow-xl dark:hover:shadow-dark-xl'
          }`}
        onClick={() => setSelectedQuestionForDetail(question)}
      >
        {/* Header */}
        <div className="flex flex-col gap-3 mb-4">
          {/* ID e Botão Adicionar */}
          <div className="flex items-center justify-between">
            <button
              onClick={(e) => {
                e.stopPropagation();
                copyIdToClipboard(question.id);
              }}
              className="group/id relative flex items-center gap-1.5 px-2.5 py-1.5 
                bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-mono 
                text-text-light-secondary dark:text-text-dark-secondary
                hover:bg-slate-200 dark:hover:bg-slate-700 transition-all duration-200"
              title="Clique para copiar"
            >
              <span className="material-symbols-outlined text-sm">tag</span>
              <span>{getIdSuffix(question.id)}</span>
              <span className="material-symbols-outlined text-xs opacity-0 group-hover/id:opacity-100 transition-opacity">
                content_copy
              </span>
            </button>

            {isAlreadyAdded ? (
              <div className="px-4 py-2 bg-green-500 text-white text-sm rounded-xl font-semibold
                flex items-center gap-1.5 shadow-lg">
                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                Adicionada
              </div>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddFromBank(question);
                }}
                className="px-4 py-2 bg-primary text-white text-sm rounded-xl font-semibold
                  opacity-0 group-hover:opacity-100 transition-all duration-300
                  hover:bg-primary/90 shadow-lg hover:shadow-xl shadow-primary/20
                  flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                Adicionar
              </button>
            )}
          </div>

          {/* Status Badges, Instituição e Ano */}
          {((question as any).is_annulled || (question as any).is_outdated || institution || year) && (
            <div className="flex items-center gap-2 flex-wrap">
              {(question as any).is_annulled && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 
                  bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 
                  rounded-lg text-xs text-red-700 dark:text-red-300 font-semibold">
                  <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>cancel</span>
                  Anulada
                </span>
              )}
              {(question as any).is_outdated && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 
                  bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 
                  rounded-lg text-xs text-orange-700 dark:text-orange-300 font-semibold">
                  <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>schedule</span>
                  Desatualizada
                </span>
              )}
              {institution && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 
                  bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 
                  rounded-lg text-xs text-blue-700 dark:text-blue-300 font-medium">
                  <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
                  {institution}
                </span>
              )}
              {year && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 
                  bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 
                  rounded-lg text-xs text-amber-700 dark:text-amber-300 font-medium">
                  <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>calendar_today</span>
                  {year}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Conteúdo */}
        <div className="mb-4">
          {isHtml ? (
            <div 
              className="text-sm text-text-light-primary dark:text-text-dark-primary 
                prose prose-sm dark:prose-invert max-w-none
                [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_img]:my-2"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          ) : (
            <p className="text-sm text-text-light-primary dark:text-text-dark-primary whitespace-pre-wrap">
              {content}
            </p>
          )}
        </div>

        {/* Filtros de especialidade */}
        {specialtyFilters.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-border-light dark:border-border-dark">
            {visibleFilters.map((filter, idx) => (
              <span key={idx} className="px-2.5 py-1 bg-primary/10 text-primary text-xs rounded-full font-medium">
                {filter.name}
              </span>
            ))}
            {hiddenCount > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpandFilters(question.id);
                }}
                className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-xs rounded-full
                  text-text-light-secondary dark:text-text-dark-secondary font-medium
                  hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                {isExpanded ? (
                  <span className="material-symbols-outlined text-xs">expand_less</span>
                ) : (
                  `+${hiddenCount}`
                )}
              </button>
            )}
          </div>
        )}
      </div>
    );
  };


  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div className="bg-gradient-to-br from-surface-light via-surface-light to-primary/5 
      dark:from-surface-dark dark:via-surface-dark dark:to-primary/10 
      rounded-2xl overflow-hidden border border-border-light dark:border-border-dark
      shadow-xl dark:shadow-dark-xl">
      
      {/* Header */}
      <div className="p-6 border-b border-border-light dark:border-border-dark">
        <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary mb-1">
          Banco de Questões
        </h2>
        <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
          Busque questões do banco ou crie questões autorais
        </p>
      </div>

      {/* Tabs */}
      <div className="px-6 pt-6">
        <TabGroup
          tabs={TABS}
          activeTab={activeTab}
          onChange={(tabId) => setActiveTab(tabId as 'search' | 'filters' | 'custom')}
        />
      </div>

      {/* Content */}
      <div className="p-6">
        {/* ================================================================ */}
        {/* SEARCH TAB */}
        {/* ================================================================ */}
        {activeTab === 'search' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Search Input with Help Button */}
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2
                  text-text-light-secondary dark:text-text-dark-secondary pointer-events-none">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Buscar por texto, ID, ano (2020) ou instituição (USP, SURCE)..."
                  value={filters.query}
                  onChange={(e) => setFilters(f => ({ ...f, query: e.target.value }))}
                  className="w-full h-12 pl-12 pr-4 bg-background-light dark:bg-background-dark
                    border-2 border-border-light dark:border-border-dark rounded-xl
                    text-text-light-primary dark:text-text-dark-primary text-sm
                    placeholder:text-text-light-secondary dark:placeholder:text-text-dark-secondary
                    focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary
                    shadow-sm hover:shadow-md transition-all duration-200"
                />
                {isSearching && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              
              {/* Help Button */}
              <button
                onClick={() => setShowHelpModal(true)}
                className="h-12 px-4 flex items-center gap-2 bg-primary/10 hover:bg-primary/20 
                  border-2 border-primary/30 rounded-xl text-primary font-medium text-sm
                  transition-all duration-200 hover:scale-105 shadow-sm hover:shadow-md"
              >
                <span className="material-symbols-outlined text-lg">help</span>
                <span className="hidden sm:inline">Como buscar</span>
              </button>
            </div>
            
            {/* Search type indicator */}
            {filters.query.length >= 2 && searchType === 'id' && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 
                border border-slate-200 dark:border-slate-700 rounded-lg w-fit">
                <span className="material-symbols-outlined text-sm">tag</span>
                <span className="text-xs font-mono text-text-light-secondary dark:text-text-dark-secondary">
                  Buscando por ID
                </span>
              </div>
            )}
            
            {/* Results count and suggestion */}
            {totalResults > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-4 py-2 bg-primary/5 dark:bg-primary/10 
                  border border-primary/20 rounded-lg">
                  <span className="material-symbols-outlined text-primary text-base">check_circle</span>
                  <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                    <span className="font-semibold text-text-light-primary dark:text-text-dark-primary">
                      {totalResults}
                    </span> questão(ões) encontrada(s)
                    {totalPages > 1 && (
                      <span className="ml-2">
                        (página {currentPage} de {totalPages})
                      </span>
                    )}
                  </span>
                </div>
                
                {/* Suggestion for many results */}
                {totalResults > 50 && (
                  <div className="flex items-start gap-2 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 
                    border border-amber-200 dark:border-amber-800 rounded-lg">
                    <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-base mt-0.5">lightbulb</span>
                    <div className="text-sm text-amber-700 dark:text-amber-300">
                      <span className="font-medium">Dica:</span> Muitos resultados! Seja mais específico adicionando:
                      <ul className="mt-1 ml-4 list-disc text-xs">
                        <li>Ano da prova (ex: <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">2020</code>)</li>
                        <li>Instituição (ex: <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">USP</code>, <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">SURCE</code>)</li>
                        <li>Combine termos (ex: <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">USP 2020 diabetes</code>)</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Results */}
            {results.length === 0 ? (
              <EmptyState
                icon={filters.query ? 'search_off' : 'search'}
                title={filters.query ? 'Nenhuma questão encontrada' : 'Busque questões'}
                description={filters.query 
                  ? 'Tente outros termos de busca'
                  : 'Digite texto, ID, ano (2020) ou instituição (USP, SURCE)'
                }
              />
            ) : (
              <div className="space-y-4" ref={resultsContainerRef}>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-2">
                  {results.map(renderQuestionCard)}
                </div>
                
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-4 border-t border-border-light dark:border-border-dark">
                    <button
                      onClick={() => handlePageChange(1)}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg hover:bg-primary/10 disabled:opacity-40 disabled:cursor-not-allowed
                        text-text-light-secondary dark:text-text-dark-secondary transition-colors"
                      title="Primeira página"
                    >
                      <span className="material-symbols-outlined text-lg">first_page</span>
                    </button>
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg hover:bg-primary/10 disabled:opacity-40 disabled:cursor-not-allowed
                        text-text-light-secondary dark:text-text-dark-secondary transition-colors"
                      title="Página anterior"
                    >
                      <span className="material-symbols-outlined text-lg">chevron_left</span>
                    </button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum: number;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            className={`w-9 h-9 rounded-lg text-sm font-medium transition-all duration-200
                              ${currentPage === pageNum
                                ? 'bg-primary text-white shadow-md'
                                : 'hover:bg-primary/10 text-text-light-secondary dark:text-text-dark-secondary'
                              }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg hover:bg-primary/10 disabled:opacity-40 disabled:cursor-not-allowed
                        text-text-light-secondary dark:text-text-dark-secondary transition-colors"
                      title="Próxima página"
                    >
                      <span className="material-symbols-outlined text-lg">chevron_right</span>
                    </button>
                    <button
                      onClick={() => handlePageChange(totalPages)}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg hover:bg-primary/10 disabled:opacity-40 disabled:cursor-not-allowed
                        text-text-light-secondary dark:text-text-dark-secondary transition-colors"
                      title="Última página"
                    >
                      <span className="material-symbols-outlined text-lg">last_page</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ================================================================ */}
        {/* FILTERS TAB */}
        {/* ================================================================ */}
        {activeTab === 'filters' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {loadingFilters ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                {/* Filter Sections Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Especialidades */}
                  <div className="bg-background-light dark:bg-background-dark rounded-xl p-4 
                    border border-border-light dark:border-border-dark shadow-md">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary 
                        flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg text-primary">medical_services</span>
                        Especialidades
                      </h3>
                      {selectedSpecialties.length > 0 && (
                        <button onClick={() => setSelectedSpecialties([])} className="text-xs text-primary hover:underline">
                          Limpar ({selectedSpecialties.length})
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder="Buscar especialidade..."
                      value={specialtySearch}
                      onChange={(e) => setSpecialtySearch(e.target.value)}
                      className="w-full px-3 py-2 mb-3 bg-surface-light dark:bg-surface-dark
                        border border-border-light dark:border-border-dark rounded-lg text-sm
                        focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {filteredSpecialties.map(node => renderSpecialtyNode(node))}
                    </div>
                  </div>

                  {/* Universidades */}
                  <div className="bg-background-light dark:bg-background-dark rounded-xl p-4 
                    border border-border-light dark:border-border-dark shadow-md">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary 
                        flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg text-primary">school</span>
                        Universidades
                      </h3>
                      {selectedInstitutions.length > 0 && (
                        <button onClick={() => setSelectedInstitutions([])} className="text-xs text-primary hover:underline">
                          Limpar ({selectedInstitutions.length})
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder="Buscar universidade..."
                      value={institutionSearch}
                      onChange={(e) => setInstitutionSearch(e.target.value)}
                      className="w-full px-3 py-2 mb-3 bg-surface-light dark:bg-surface-dark
                        border border-border-light dark:border-border-dark rounded-lg text-sm
                        focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {filteredInstitutions.map(node => renderInstitutionNode(node))}
                    </div>
                  </div>

                  {/* Anos */}
                  <div className="bg-background-light dark:bg-background-dark rounded-xl p-4 
                    border border-border-light dark:border-border-dark shadow-md">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary 
                        flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg text-primary">calendar_month</span>
                        Anos
                      </h3>
                      {selectedYears.length > 0 && (
                        <button onClick={() => setSelectedYears([])} className="text-xs text-primary hover:underline">
                          Limpar ({selectedYears.length})
                        </button>
                      )}
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {years.map(node => renderYearNode(node))}
                    </div>
                  </div>
                </div>

                {/* Filter Results */}
                <div className="pt-6 border-t border-border-light dark:border-border-dark">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">
                      Questões Encontradas
                    </h3>
                    {filterResultsCount > 0 && (
                      <span className="px-3 py-1.5 bg-primary/10 text-primary text-sm rounded-full font-semibold">
                        {filterResultsCount} questão(ões)
                      </span>
                    )}
                  </div>
                  
                  {isLoadingFilterResults ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : filterResults.length === 0 ? (
                    <EmptyState
                      icon="filter_list"
                      title={totalSelectedFilters === 0 ? 'Selecione filtros' : 'Nenhuma questão encontrada'}
                      description={totalSelectedFilters === 0 
                        ? 'Selecione especialidades, universidades ou anos para buscar questões'
                        : 'Tente outros filtros'
                      }
                    />
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-2">
                      {filterResults.map(renderQuestionCard)}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}


        {/* ================================================================ */}
        {/* CUSTOM TAB */}
        {/* ================================================================ */}
        {activeTab === 'custom' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {showCustomEditor ? (
              <CustomQuestionEditor
                onSave={handleSaveCustomQuestion}
                onCancel={() => setShowCustomEditor(false)}
              />
            ) : (
              <>
                {/* Questões Pendentes */}
                {pendingCustomQuestions.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">
                        Questões Autorais Criadas
                      </h3>
                      <span className="px-3 py-1.5 bg-primary/10 text-primary text-sm rounded-full font-semibold">
                        {pendingCustomQuestions.length} questão(ões)
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-4 max-h-[400px] overflow-y-auto pr-2">
                      {pendingCustomQuestions.map((question) => (
                        <div
                          key={question.id}
                          className="bg-surface-light dark:bg-surface-dark rounded-xl p-4
                            border border-border-light dark:border-border-dark
                            shadow-lg dark:shadow-dark-lg"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="px-2.5 py-1 bg-violet-100 dark:bg-violet-900/30 
                                  text-violet-700 dark:text-violet-300 text-xs rounded-lg font-semibold">
                                  Autoral
                                </span>
                                <span className="px-2.5 py-1 bg-amber-100 dark:bg-amber-900/30 
                                  text-amber-700 dark:text-amber-300 text-xs rounded-lg font-semibold">
                                  Pendente
                                </span>
                                {question.difficulty && (
                                  <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 
                                    text-slate-600 dark:text-slate-400 text-xs rounded-lg">
                                    Dificuldade: {question.difficulty}
                                  </span>
                                )}
                              </div>
                              <div 
                                className="text-sm text-text-light-primary dark:text-text-dark-primary 
                                  line-clamp-3 prose prose-sm dark:prose-invert max-w-none"
                                dangerouslySetInnerHTML={{ __html: question.content }}
                              />
                              <div className="mt-3 pt-3 border-t border-border-light dark:border-border-dark
                                flex items-center gap-4 text-xs text-text-light-secondary dark:text-text-dark-secondary">
                                <span className="flex items-center gap-1">
                                  <span className="material-symbols-outlined text-sm">list</span>
                                  {question.alternatives?.length || 0} alternativas
                                </span>
                                {question.explanation && (
                                  <span className="flex items-center gap-1">
                                    <span className="material-symbols-outlined text-sm">description</span>
                                    Com explicação
                                  </span>
                                )}
                                {question.subFilterIds && question.subFilterIds.length > 0 && (
                                  <span className="flex items-center gap-1">
                                    <span className="material-symbols-outlined text-sm">filter_list</span>
                                    {question.subFilterIds.length} filtro(s)
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => handleRemovePendingQuestion(question.id)}
                              className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg
                                text-slate-400 hover:text-red-500 transition-colors flex-shrink-0"
                              title="Remover questão"
                            >
                              <span className="material-symbols-outlined">delete</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Criar Nova Questão */}
                <div className={`text-center ${pendingCustomQuestions.length > 0 ? 'pt-6 border-t border-border-light dark:border-border-dark' : ''} py-12`}>
                  <div className="mb-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-violet-500/20 
                      rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                      <span className="material-symbols-outlined text-3xl text-primary">edit_note</span>
                    </div>
                    <h3 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary mb-2">
                      Criar Questão Autoral
                    </h3>
                    <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary max-w-md mx-auto">
                      Use o editor avançado para criar questões com formatação rica, imagens, 
                      explicações e categorização por especialidade
                    </p>
                  </div>
                  <button
                    onClick={() => setShowCustomEditor(true)}
                    className="px-8 py-3.5 bg-gradient-to-r from-primary to-violet-600 text-white rounded-xl font-semibold
                      hover:from-primary/90 hover:to-violet-600/90 transition-all duration-200
                      shadow-lg hover:shadow-xl shadow-primary/30
                      flex items-center gap-2 mx-auto"
                  >
                    <span className="material-symbols-outlined">add</span>
                    Criar Nova Questão
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Question Detail Modal */}
      {selectedQuestionForDetail && (
        <QuestionDetailModal
          question={selectedQuestionForDetail}
          subFiltersMap={subFiltersMap}
          isAlreadyAdded={selectedQuestionIds.includes(selectedQuestionForDetail.id)}
          onAdd={() => handleAddFromBank(selectedQuestionForDetail)}
          onClose={() => setSelectedQuestionForDetail(null)}
        />
      )}

      {/* Help Modal */}
      {shouldRenderHelp && typeof window !== 'undefined' && createPortal(
        <>
          {/* Overlay */}
          <div
            className={`fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
              isHelpAnimating ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ zIndex: 99999 }}
            onClick={() => setShowHelpModal(false)}
          />

          {/* Modal */}
          <div
            className={`fixed right-0 top-0 h-full w-full md:w-[550px] bg-surface-light dark:bg-surface-dark 
              shadow-2xl dark:shadow-dark-2xl transform transition-transform duration-300 ease-out ${
              isHelpAnimating ? 'translate-x-0' : 'translate-x-full'
            }`}
            style={{ zIndex: 100000 }}
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-border-light dark:border-border-dark 
                bg-background-light dark:bg-background-dark">
                <div>
                  <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary">
                    Como montar seu simulado
                  </h2>
                  <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">
                    Guia completo para encontrar e organizar questões
                  </p>
                </div>
                <button
                  onClick={() => setShowHelpModal(false)}
                  className="p-2.5 hover:bg-surface-light dark:hover:bg-surface-dark rounded-xl 
                    transition-all duration-200 hover:scale-110 group"
                >
                  <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary 
                    group-hover:text-primary transition-colors">
                    close
                  </span>
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5 text-text-light-secondary dark:text-text-dark-secondary">
                
                {/* Intro */}
                <p className="text-sm">
                  O MedBRAVE oferece diversas formas de encontrar e organizar questões para seus simulados.
                  Entenda como aproveitar ao máximo cada funcionalidade.
                </p>

                {/* Busca Inteligente */}
                <div className="bg-background-light dark:bg-background-dark rounded-xl p-4 space-y-3 
                  border border-border-light dark:border-border-dark">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">search</span>
                    <p className="font-semibold text-text-light-primary dark:text-text-dark-primary">
                      Busca Inteligente
                    </p>
                  </div>
                  <p className="text-sm">
                    O campo de busca detecta automaticamente o que você está procurando:
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <div>
                        <span className="font-medium text-text-light-primary dark:text-text-dark-primary">Por ID:</span>
                        {' '}Clique no badge de ID da questão para copiar, depois cole o ID completo aqui
                        <div className="mt-2 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-800 
                              rounded text-xs font-mono text-text-light-secondary dark:text-text-dark-secondary">
                              <span className="material-symbols-outlined text-xs">tag</span>
                              A1B2C3
                            </span>
                            <span className="text-xs">← Clique para copiar o ID completo</span>
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded text-xs font-mono break-all">
                            mulher-de-58-anos-com-diagnostico-<span className="text-primary font-bold">MVYXAD</span>
                          </div>
                          <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">
                            O ID completo é copiado automaticamente ao clicar no badge
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <div>
                        <span className="font-medium text-text-light-primary dark:text-text-dark-primary">Por ano:</span>
                        {' '}Digite o ano (ex: <code className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 rounded text-xs">2020</code>)
                        para filtrar questões daquele ano
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <div>
                        <span className="font-medium text-text-light-primary dark:text-text-dark-primary">Por instituição:</span>
                        {' '}Digite o nome (ex: <code className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 rounded text-xs">USP</code>,
                        <code className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 rounded text-xs ml-1">SURCE</code>,
                        <code className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 rounded text-xs ml-1">ENARE</code>)
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <div>
                        <span className="font-medium text-text-light-primary dark:text-text-dark-primary">Por especialidade:</span>
                        {' '}Digite o assunto (ex: <code className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 rounded text-xs">cardiologia</code>,
                        <code className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 rounded text-xs ml-1">pediatria</code>,
                        <code className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 rounded text-xs ml-1">trauma</code>)
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <div>
                        <span className="font-medium text-text-light-primary dark:text-text-dark-primary">Por texto:</span>
                        {' '}Busque por palavras no enunciado (ex: <code className="px-1.5 py-0.5 bg-surface-light dark:bg-surface-dark rounded text-xs">diabetes gestacional</code>)
                      </div>
                    </div>
                  </div>
                </div>

                {/* Combinando termos */}
                <div className="bg-primary/5 dark:bg-primary/10 rounded-xl p-4 space-y-3 border border-primary/20">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">merge</span>
                    <p className="font-semibold text-text-light-primary dark:text-text-dark-primary">
                      Combinando Termos
                    </p>
                  </div>
                  <p className="text-sm">
                    Combine diferentes critérios em uma única busca para resultados mais precisos:
                  </p>
                  <div className="space-y-2">
                    <div className="bg-surface-light dark:bg-surface-dark p-3 rounded-lg font-mono text-xs space-y-1.5">
                      <div><span className="text-primary">USP 2020</span> → Questões da USP de 2020</div>
                      <div><span className="text-primary">cardiologia 2020</span> → Questões de Cardiologia de 2020</div>
                      <div><span className="text-primary">SURCE pediatria</span> → Questões da SURCE de Pediatria</div>
                      <div><span className="text-primary">trauma USP 2020</span> → Questões de Trauma da USP de 2020</div>
                    </div>
                    <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary mt-2">
                      💡 Especialidades como "cardiologia", "pediatria", "trauma" são detectadas automaticamente e filtram pelo assunto da questão, não apenas pelo texto do enunciado.
                    </p>
                  </div>
                </div>

                {/* Aba de Filtros */}
                <div className="bg-background-light dark:bg-background-dark rounded-xl p-4 space-y-3 
                  border border-border-light dark:border-border-dark">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">filter_list</span>
                    <p className="font-semibold text-text-light-primary dark:text-text-dark-primary">
                      Aba de Filtros
                    </p>
                  </div>
                  <p className="text-sm">
                    Para buscas mais estruturadas, use a aba <strong>Filtros</strong> onde você pode:
                  </p>
                  <ul className="space-y-1.5 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>Navegar pela hierarquia completa de especialidades</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>Selecionar múltiplas universidades por estado</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>Filtrar por anos específicos</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>Combinar todos os filtros para resultados precisos</span>
                    </li>
                  </ul>
                </div>

                {/* Questões Autorais */}
                <div className="bg-violet-50 dark:bg-violet-900/20 rounded-xl p-4 space-y-3 
                  border border-violet-200 dark:border-violet-800">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-violet-600 dark:text-violet-400">edit_note</span>
                    <p className="font-semibold text-text-light-primary dark:text-text-dark-primary">
                      Questões Autorais
                    </p>
                  </div>
                  <p className="text-sm">
                    Na aba <strong>Autoral</strong>, crie suas próprias questões com um editor robusto:
                  </p>
                  <ul className="space-y-1.5 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-violet-600 dark:text-violet-400 mt-0.5">•</span>
                      <span><strong>Editor HTML completo</strong> com formatação rica (negrito, itálico, listas)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-violet-600 dark:text-violet-400 mt-0.5">•</span>
                      <span><strong>Suporte a imagens</strong> - arraste ou cole imagens diretamente</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-violet-600 dark:text-violet-400 mt-0.5">•</span>
                      <span><strong>Alternativas ilimitadas</strong> com marcação da correta</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-violet-600 dark:text-violet-400 mt-0.5">•</span>
                      <span><strong>Explicação detalhada</strong> para feedback ao aluno</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-violet-600 dark:text-violet-400 mt-0.5">•</span>
                      <span><strong>Categorização</strong> por especialidade e dificuldade</span>
                    </li>
                  </ul>
                </div>

                {/* Organizando o Simulado */}
                <div className="bg-background-light dark:bg-background-dark rounded-xl p-4 space-y-3 
                  border border-border-light dark:border-border-dark">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">reorder</span>
                    <p className="font-semibold text-text-light-primary dark:text-text-dark-primary">
                      Organizando o Simulado
                    </p>
                  </div>
                  <p className="text-sm">
                    Após adicionar questões, você pode:
                  </p>
                  <ul className="space-y-1.5 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span><strong>Arrastar para reordenar</strong> - organize as questões na ordem desejada</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span><strong>Remover questões</strong> - clique no X para remover</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span><strong>Visualizar resumo</strong> - veja o total de questões e distribuição</span>
                    </li>
                  </ul>
                </div>

                {/* Dica Final */}
                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
                  <div className="flex gap-3">
                    <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-xl flex-shrink-0">
                      lightbulb
                    </span>
                    <div className="space-y-1 text-sm">
                      <p className="font-semibold text-green-800 dark:text-green-200">
                        Dica: Muitos resultados?
                      </p>
                      <p className="text-green-700 dark:text-green-300">
                        Se sua busca retornar muitos resultados, seja mais específico combinando termos.
                        Por exemplo, ao invés de buscar apenas "diabetes", tente "USP 2020 diabetes gestacional".
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-border-light dark:border-border-dark 
                bg-background-light dark:bg-background-dark">
                <button
                  onClick={() => setShowHelpModal(false)}
                  className="w-full px-4 py-3 bg-primary text-white rounded-xl font-semibold 
                    hover:bg-primary/90 transition-all duration-200 hover:scale-[1.02] 
                    shadow-lg hover:shadow-xl"
                >
                  Entendi, vamos começar!
                </button>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
