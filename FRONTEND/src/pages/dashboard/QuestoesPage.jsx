import React, { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react';
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Eye, Clock, CheckCircle, XCircle, AlertCircle, X, BookOpen, Filter, BarChart3, Search, Play, RotateCcw } from 'lucide-react';
import { CustomSearchIcon, CustomFilterIcon, CustomStatsIcon, CustomHeartIcon } from '../../components/CustomIcons';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Checkbox } from '../../components/ui/checkbox';
import { Separator } from '../../components/ui/separator';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../components/ui/collapsible';
import SubfilterPanel from '../../components/SubfilterPanel';
import { getAllFilters, FilterCategory } from '../../services/filterService';
import { getSubFiltersByFilterId } from '../../services/subFilterService';
import { searchSubFiltersGlobally } from '../../services/optimizedFilterService';
import { getQuestions, countQuestions, clearQuestionCache } from '../../services/questionService';
import { cacheService } from '../../services/cacheService';
import VisualizarQuestoesModal from '../../components/modals/VisualizarQuestoesModal';
import CriarListaModal from '../../components/modals/CriarListaModal';
import CriarListaModalSimple from '../../components/modals/CriarListaModalSimple';
import CriarSimuladoModal from '../../components/modals/CriarSimuladoModal';
import useSelectiveRefresh from '../../hooks/useSelectiveRefresh';

import '../../styles/tree.css';
import '../../styles/modal-fixes.css';
import '../../utils/modalUtils';

// ✅ ERROR BOUNDARY COMPONENT
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('QuestoesPage Error:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 text-center">
            <div className="text-red-500 mb-4">
              <AlertCircle className="w-12 h-12 mx-auto" />
            </div>
            <h2 className="text-xl font-semibold mb-2" style={{color: 'var(--text-primary)'}}>
              Ops! Algo deu errado
            </h2>
            <p className="text-sm mb-4" style={{color: 'var(--text-secondary)'}}>
              Ocorreu um erro inesperado. Por favor, recarregue a página.
            </p>
            <Button 
              onClick={() => window.location.reload()}
              className="w-full"
            >
              Recarregar Página
            </Button>
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm text-gray-500">
                  Detalhes do erro (desenvolvimento)
                </summary>
                <pre className="mt-2 text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded overflow-auto">
                  {this.state.error && this.state.error.toString()}
                  <br />
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// ✅ COMPONENTE OTIMIZADO - Memoizado para evitar re-renders desnecessários
const QuestionCard = memo(({ questao, onClick }) => (
  <div 
    className="dashboard-card cursor-pointer transition-colors duration-200 hover:shadow-lg"
    onClick={() => onClick(questao)}
  >
    <div className="flex justify-between items-start mb-4">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
            {questao.materia}
          </span>
          <span className={`text-xs px-2 py-1 rounded-full ${
            questao.dificuldade === 'Fácil' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
            questao.dificuldade === 'Médio' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' :
            'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
          }`}>
            {questao.dificuldade}
          </span>
          {questao.respondida && (
            <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
              Respondida
            </span>
          )}
        </div>
        <h3 className="text-lg font-semibold mb-2" style={{color: 'var(--text-primary)'}}>
          {questao.titulo}
        </h3>
        <p className="text-sm mb-3" style={{color: 'var(--text-secondary)'}}>
          {questao.enunciado.substring(0, 120)}...
        </p>
        <div className="flex items-center gap-4 text-xs" style={{color: 'var(--text-muted)'}}>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {questao.tempo}
          </div>
          <div className="flex items-center gap-1">
            <BookOpen className="w-3 h-3" />
            {questao.tipo}
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <button 
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
            questao.favorita ? 'bg-red-500 text-white' : 'hover:bg-red-100 dark:hover:bg-red-900'
          }`}
          onClick={(e) => {
            e.stopPropagation();
            // Toggle favorita
          }}
        >
          <CustomHeartIcon className={`w-4 h-4 ${questao.favorita ? 'fill-current' : ''}`} />
        </button>
        <button className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-purple-100 dark:hover:bg-purple-900 transition-all duration-300">
          <Eye className="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>
));

// ✅ COMPONENTE FILTROS OTIMIZADO - Memoizado para evitar re-renders
const FilterPanel = memo(({ filtros, setFiltros, filters, onFilterToggle }) => {
  const [expandedCategories, setExpandedCategories] = useState({
    [FilterCategory.INSTITUTIONAL]: true,
    [FilterCategory.EDUCATIONAL]: true,
    [FilterCategory.MEDICAL_SPECIALTY]: true
  });

  // ✅ TOGGLE OTIMIZADO - Memoizado para evitar re-renders
  const toggleCategory = useCallback((category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  }, []);

  const getCategoryTitle = (category) => {
    switch (category) {
      case FilterCategory.INSTITUTIONAL:
        return 'Institucionais';
      case FilterCategory.EDUCATIONAL:
        return 'Educacionais';
      case FilterCategory.MEDICAL_SPECIALTY:
        return 'Especialidades Médicas';
      default:
        return category;
    }
  };

  // ✅ FILTROS POR CATEGORIA OTIMIZADOS - Memoizado para evitar recálculos
  const getFiltersForCategory = useCallback((category) => {
    return filters
      .filter(filter => filter.category === category)
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [filters]);

  // ✅ CATEGORIAS MEMOIZADAS - Evita recálculo desnecessário
  const categoriesWithFilters = useMemo(() => {
    return Object.values(FilterCategory).filter(category => {
      const categoryFilters = getFiltersForCategory(category);
      return categoryFilters.length > 0;
    });
  }, [getFiltersForCategory]);

  return (
    <div className="dashboard-card h-full flex flex-col">
      <div className="card-header flex items-center gap-2 mb-6">
        <div className="w-6 h-6 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
          <CustomFilterIcon className="w-3 h-3" />
        </div>
        <h3 className="text-xl font-semibold" style={{color: 'var(--text-primary)'}}>Filtros</h3>
      </div>
      
      {/* ✅ CATEGORIAS OTIMIZADAS - Usando lista memoizada */}
      <div className="card-content space-y-4 overflow-y-auto flex-1 pr-1">
        {categoriesWithFilters.map(category => {
          const categoryFilters = getFiltersForCategory(category);

          return (
            <div key={category}>
              <Collapsible 
                open={expandedCategories[category]} 
                onOpenChange={() => toggleCategory(category)}
              >
                <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-300">
                  <h4 className="text-lg font-medium" style={{color: 'var(--text-primary)'}}>
                    {getCategoryTitle(category)}
                  </h4>
                  {expandedCategories[category] ? 
                    <ChevronUp className="w-4 h-4" style={{color: 'var(--text-muted)'}} /> : 
                    <ChevronDown className="w-4 h-4" style={{color: 'var(--text-muted)'}} />
                  }
                </CollapsibleTrigger>
                
                <CollapsibleContent className="mt-3 space-y-2 pr-2">
                  {categoryFilters.map(filter => {
                    return (
                      <div key={filter.id} className="ml-3 mr-2">
                        {/* Filtro Principal */}
                        <button
                          onClick={() => onFilterToggle(filter.id, null)}
                          className={`w-full text-left p-2 rounded-lg transition-all duration-300 ${
                            filtros.selectedFilters?.includes(filter.id) 
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' 
                              : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                        >
                          <span className="text-sm font-medium">{filter.name}</span>
                        </button>
                      </div>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
            </div>
          );
        })}

        {/* Filtros Avançados */}
        <div className="pt-6 border-t pr-2" style={{borderColor: 'var(--border-primary)'}}>
          <h4 className="text-lg font-medium mb-4" style={{color: 'var(--text-primary)'}}>
            Filtros Avançados
          </h4>
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input 
                type="checkbox" 
                checked={filtros.excluirAnuladas || false}
                onChange={(e) => setFiltros({...filtros, excluirAnuladas: e.target.checked})}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm" style={{color: 'var(--text-secondary)'}}>Excluir Anuladas</span>
            </label>
            <label className="flex items-center gap-3">
              <input 
                type="checkbox" 
                checked={filtros.excluirDesatualizadas || false}
                onChange={(e) => setFiltros({...filtros, excluirDesatualizadas: e.target.checked})}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm" style={{color: 'var(--text-secondary)'}}>Excluir Desatualizadas</span>
            </label>
          </div>
        </div>
      </div>

      <div className="card-footer mt-6 pt-4 border-t" style={{borderColor: 'var(--border-primary)'}}>
        <button 
          onClick={() => setFiltros({
            selectedFilters: [],
            selectedSubFilters: [],
            excluirAnuladas: false,
            excluirDesatualizadas: false
          })}
          className="w-full py-2 px-4 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <span className="text-sm font-medium" style={{color: 'var(--text-primary)'}}>Limpar Filtros</span>
        </button>
      </div>
    </div>
  );
});

// ✅ COMPONENTE ESTATÍSTICAS OTIMIZADO - Memoizado para evitar re-renders
const StatsPanel = memo(({ selectedSubFilters }) => {
  // ✅ ESTATÍSTICAS MEMOIZADAS - Evita recálculos desnecessários
  const stats = useMemo(() => {
    // Aqui seria feito o cálculo real baseado nos subfiltros
    // Por enquanto vamos usar dados fictícios 
    return {
      questoesTotais: 1247,
      questoesFiltradas: selectedSubFilters.length > 0 ? 239 : 1247,
      respondidas: 167,
      acertos: 133,
      taxaAcerto: 80,
      favoritas: 11
    };
  }, [selectedSubFilters]);

  return (
    <div className="dashboard-card h-full flex flex-col">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-6 h-6 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
          <CustomStatsIcon className="w-3 h-3" />
        </div>
        <h3 className="text-xl font-semibold" style={{color: 'var(--text-primary)'}}>
          Estatísticas
        </h3>
      </div>

      <div className="flex-1 space-y-4 mb-6">
        <div className="flex justify-between items-center">
          <span className="text-sm" style={{color: 'var(--text-secondary)'}}>Total de Questões</span>
          <span className="text-lg font-semibold" style={{color: 'var(--text-primary)'}}>{stats.questoesTotais.toLocaleString()}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm" style={{color: 'var(--text-secondary)'}}>Questões Filtradas</span>
          <span className="text-lg font-semibold text-purple-600">{stats.questoesFiltradas.toLocaleString()}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm" style={{color: 'var(--text-secondary)'}}>Respondidas</span>
          <span className="text-lg font-semibold text-gray-600">{stats.respondidas.toLocaleString()}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm" style={{color: 'var(--text-secondary)'}}>Acertos</span>
          <span className="text-lg font-semibold text-purple-600">{stats.acertos.toLocaleString()}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm" style={{color: 'var(--text-secondary)'}}>Taxa de Acerto</span>
          <span className="text-lg font-semibold text-purple-600">{stats.taxaAcerto}%</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm" style={{color: 'var(--text-secondary)'}}>Favoritas</span>
          <span className="text-lg font-semibold text-red-600">{stats.favoritas}</span>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t" style={{borderColor: 'var(--border-primary)'}}>
        <h4 className="text-lg font-semibold mb-4" style={{color: 'var(--text-primary)'}}>Performance por Matéria</h4>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span style={{color: 'var(--text-secondary)'}}>Cardiologia</span>
              <span style={{color: 'var(--text-primary)'}}>85%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div className="bg-purple-600 h-2 rounded-full" style={{width: '85%'}}></div>
            </div>
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span style={{color: 'var(--text-secondary)'}}>Pneumologia</span>
              <span style={{color: 'var(--text-primary)'}}>78%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div className="bg-purple-600 h-2 rounded-full" style={{width: '78%'}}></div>
            </div>
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span style={{color: 'var(--text-secondary)'}}>Farmacologia</span>
              <span style={{color: 'var(--text-primary)'}}>92%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div className="bg-purple-600 h-2 rounded-full" style={{width: '92%'}}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

// Componente de resultados da busca com categorias melhoradas
const SearchResults = ({ results, onSelect, onClose }) => {
  // Agrupar resultados por categoria
  const groupedResults = results.reduce((acc, result) => {
    const categoryName = result.category || result.path[0] || 'Outros';
    if (!acc[categoryName]) {
      acc[categoryName] = [];
    }
    acc[categoryName].push(result);
    return acc;
  }, {});

  // Ordenar categorias e resultados dentro de cada categoria
  const sortedCategories = Object.keys(groupedResults).sort();

  return (
    <div className="absolute z-10 w-full mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-300 dark:border-gray-600 overflow-hidden max-h-96 overflow-y-auto">
      <div className="p-4 flex justify-between items-center border-b border-gray-300 dark:border-gray-600">
        <h3 className="font-semibold" style={{color: 'var(--text-primary)'}}>
          {results.length} resultado(s) encontrado(s)
        </h3>
        <button 
          className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"
          onClick={onClose}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      
      {results.length === 0 ? (
        <div className="p-4 text-center text-gray-500 dark:text-gray-400">
          Nenhum resultado encontrado
        </div>
      ) : (
        <div>
          {sortedCategories.map((category) => (
            <div key={category} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
              <div className="px-4 py-2 bg-gray-100 dark:bg-gray-750 font-medium text-sm" style={{color: 'var(--text-secondary)'}}>
                {category}
              </div>
              <div>
                {groupedResults[category].map((result) => (
                  <div
                    key={result.id}
                    className="px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-750 cursor-pointer transition-colors"
                    onClick={() => onSelect(result.id, result.path, result.parentId)}
                  >
                    <div className="font-medium" style={{color: 'var(--text-primary)'}}>
                      {result.name}
                    </div>
                    {result.path && result.path.length > 1 && (
                      <div className="text-sm mt-1 flex items-center" style={{color: 'var(--text-muted)'}}>
                        <span>{result.path.slice(0, -1).join(' → ')}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ✅ HOOK DEBOUNCE OTIMIZADO - Reutilizado do SubfilterPanel
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// ✅ COMPONENTE PRINCIPAL OTIMIZADO
const QuestoesPage = () => {
  const [filtros, setFiltros] = useState({
    busca: '',
    selectedFilters: [],
    selectedSubFilters: [],
    excluirAnuladas: false,
    excluirDesatualizadas: false
  });
  
  const [globalSearch, setGlobalSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [questaoSelecionada, setQuestaoSelecionada] = useState(null);
  const [subFilterToScroll, setSubFilterToScroll] = useState(null);
  const [expandedParentFilters, setExpandedParentFilters] = useState(() => new Set());
  
  // Memoizar expandedParentFilters para evitar re-renders
  const memoizedExpandedParentFilters = useMemo(() => expandedParentFilters, [expandedParentFilters]);

  const [filters, setFilters] = useState([]);
  
  // Memoizar filters para evitar re-renders desnecessários
  const memoizedFilters = useMemo(() => filters, [filters]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [questoes, setQuestoes] = useState([]);
  const [questionCount, setQuestionCount] = useState(0);
  const [loadingQuestoes, setLoadingQuestoes] = useState(false);
  const [error, setError] = useState(null);

  // ✅ DEBOUNCE OTIMIZADO - Para evitar chamadas excessivas à API
  const debouncedGlobalSearch = useDebounce(globalSearch, 800);

  // Estados dos modais
  const [visualizarQuestoesModalOpen, setVisualizarQuestoesModalOpen] = useState(false);
  const [criarListaModalOpen, setCriarListaModalOpen] = useState(false);
  const [criarSimuladoModalOpen, setCriarSimuladoModalOpen] = useState(false);
  const debouncedSelectedSubFilters = useDebounce(filtros.selectedSubFilters, 300); // Reduzido para resposta mais rápida
  const debouncedSelectedFilters = useDebounce(filtros.selectedFilters, 300); // Aplicar debounce também aos filtros principais

  const searchRef = useRef(null);

  // ✅ CARREGAMENTO DE FILTROS COM CACHE INTELIGENTE
  useEffect(() => {
    const loadFilters = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Tentar buscar do cache primeiro
        let data = await cacheService.getFilters();
        
        if (!data) {
          data = await getAllFilters();
          await cacheService.setFilters(data, 30 * 60 * 1000); // Cache por 30 minutos
        }
        
        // Validar se data é um array válido
        if (!Array.isArray(data)) {
          throw new Error('Dados de filtros inválidos recebidos');
        }
        
        setFilters(data);
      } catch (error) {
        console.error('Erro ao carregar filtros:', error);
        setError(`Erro ao carregar filtros: ${error.message}`);
        setFilters([]); // Fallback para array vazio
      } finally {
        setLoading(false);
      }
    };

    loadFilters();
  }, []);

  // ✅ CARREGAMENTO ULTRA OTIMIZADO - Reduzir recarregamentos desnecessários
  useEffect(() => {
    const loadQuestoes = async () => {
      const hasMainFilters = debouncedSelectedFilters && debouncedSelectedFilters.length > 0;
      const hasSubFilters = debouncedSelectedSubFilters.length > 0;
      const hasSearch = filtros.busca && filtros.busca.trim().length > 0;
      
      // ✅ OTIMIZAÇÃO: Se não há filtros, mostrar contagem total uma vez
      if (!hasMainFilters && !hasSubFilters && !hasSearch) {
        if (questionCount !== 0) { // Só atualizar se realmente mudou
        setQuestoes([]);
        setQuestionCount(0);
        }
        return;
      }

      try {
        setLoadingQuestoes(true);
        
        // ✅ REMOVIDO: clearQuestionCache() - Deixar o cache funcionar!
        // O cache já tem TTL e limpeza inteligente implementada
        
        // ✅ FILTRO OTIMIZADO - Remover IDs inválidos
        const validSubFilters = debouncedSelectedSubFilters.filter(id => 
          !id.startsWith('parent-') && id !== 'parent'
        );
        
        // ✅ CONTAGEM OTIMIZADA
        const filterData = {
          selectedSubFilters: validSubFilters.sort(),
          selectedFilters: (debouncedSelectedFilters || []).sort(),
          busca: filtros.busca || ''
        };
        
        const questionCount = await countQuestions(filterData);
        
        // ✅ VALIDAÇÃO: Garantir que questionCount seja sempre um número válido
        const validQuestionCount = typeof questionCount === 'number' && !isNaN(questionCount) ? questionCount : 0;
        
        setQuestoes([]);
        setQuestionCount(validQuestionCount);
        
      } catch (error) {
        console.error('❌ Erro ao carregar questões:', error);
        setError(`Erro ao carregar questões: ${error.message}`);
        setQuestionCount(0);
        setQuestoes([]);
      } finally {
        setLoadingQuestoes(false);
      }
    };

    loadQuestoes();
  }, [debouncedSelectedSubFilters, debouncedSelectedFilters, filtros.busca]); // Dependências otimizadas
  
  // Refresh seletivo - só atualiza quando navegar para esta página
  useSelectiveRefresh(() => {
    // ✅ REMOVIDO: clearQuestionCache() - Deixar o cache funcionar!
    // Apenas força re-render se necessário, sem limpar cache
    setFiltros(prev => ({ ...prev })); // Força re-render
  }, 'questoes');
  
  // ✅ BUSCA OTIMIZADA - Memoizada e com cache inteligente
  const handleSearchSubfilters = useCallback(async (searchTerm) => {
    if (!searchTerm.trim() || searchTerm.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    const normalizedSearchTerm = searchTerm.toLowerCase();
    let results = [];
    
    try {
      // ✅ CACHE OTIMIZADO - Usar cacheService ao invés de sessionStorage
      const cacheKey = `search_${normalizedSearchTerm}`;
      let cachedResults = await cacheService.get(cacheKey);
      
      if (cachedResults) {

        setSearchResults(cachedResults);
        setShowSearchResults(cachedResults.length > 0);
        return;
      }
      
      // ✅ BUSCA OTIMIZADA - Usar apenas a função otimizada com filtros de relevância
      try {

        const allResults = await searchSubFiltersGlobally(searchTerm, 20);
        
        if (allResults && allResults.length > 0) {
          // Processar resultados para formato adequado
          results = allResults.map(result => {
            return {
              id: result.id,
              name: result.name,
              path: result.path || [result.filterName, result.name],
              parentId: result.filterId,
              category: result.filterName,
              matchType: 'name'
            };
          });
        }
      } catch (err) {
        console.error(`Erro na busca global otimizada:`, err);
        results = [];
      }
      
      // Os resultados já vêm ordenados por relevância da função otimizada
      
      // ✅ CACHE OTIMIZADO - Armazenar resultados no cacheService
      await cacheService.set(cacheKey, results, 10 * 60 * 1000); // Cache por 10 minutos
      

      setSearchResults(results);
      setShowSearchResults(results.length > 0);
    } catch (error) {
      console.error("Erro na busca:", error);
      setError(`Erro na busca: ${error.message}`);
      setSearchResults([]);
      setShowSearchResults(false);
    }
  }, [filters]); // ✅ DEPENDÊNCIAS OTIMIZADAS



  // ✅ EFEITO OTIMIZADO - Usar debounce para busca
  useEffect(() => {
    if (debouncedGlobalSearch.trim().length >= 2) {
      handleSearchSubfilters(debouncedGlobalSearch);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  }, [debouncedGlobalSearch, handleSearchSubfilters]);

  // ✅ FUNÇÃO PARA SELECIONAR RESULTADO DE BUSCA - Implementação robusta com async/await
  const handleSelectSearchResult = useCallback(async (subFilterId, path, parentId) => {

    
    try {
      // Validar parâmetros
      if (!subFilterId) {
        throw new Error('ID do filtro não fornecido');
      }

      // Se for um filtro principal (sem parentId)
      if (!parentId) {
        if (!filtros.selectedFilters.includes(subFilterId)) {

          const updatedFilters = [...filtros.selectedFilters, subFilterId];
          setFiltros(prev => ({
            ...prev,
            selectedFilters: updatedFilters
          }));
        }
      } else {
        // É um subfiltro

        
        // Selecionar o filtro pai se não estiver selecionado
        if (!filtros.selectedFilters.includes(parentId)) {

          const updatedFilters = [...filtros.selectedFilters, parentId];
          setFiltros(prev => ({
            ...prev,
            selectedFilters: updatedFilters
          }));
          
          // Aguardar atualização do estado
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Expandir o nó pai imediatamente
        const parentKey = `parent_${parentId}`;

        setExpandedParentFilters(prev => {
          const newSet = new Set(prev);
          newSet.add(parentKey);
          return newSet;
        });
        
        // Aguardar renderização
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Aguardar mais um pouco antes de configurar o scroll
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Configurar subfiltro para scroll e seleção (isso vai expandir a árvore)

        setSubFilterToScroll({
          id: subFilterId,
          parentId: parentId,
          selectCascade: true // Flag para indicar seleção em cascata
        });
        
        // Aguardar um pouco mais para garantir que a árvore foi expandida
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Agora selecionar o subfiltro e seus filhos usando a lógica de cascata
        console.log(`✅ Selecionando subfiltro em cascata: ${subFilterId}`);
        // A seleção será feita pelo SubfilterPanel quando detectar o scroll
        
        console.log(`🎉 Processo completo para subfiltro ${subFilterId}`);
      }
      
      setGlobalSearch('');
      setShowSearchResults(false);
      
    } catch (error) {
      console.error('❌ Erro ao selecionar resultado de busca:', error);
      setError(`Erro ao selecionar filtro: ${error.message}`);
    }
  }, [filtros.selectedFilters, filtros.selectedSubFilters]); // ✅ DEPENDÊNCIAS OTIMIZADAS

  // Fechar resultados quando clicado fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // ✅ FUNÇÃO DE TOGGLE FILTRO OTIMIZADA - Reutilizada para toggle direto e interno
  const handleFilterToggle = useCallback(async (filterId, subFilterId = null, allIds = null, isSelected = null) => {
    try {
  
      
      // ✅ VALIDAÇÃO: Verificar se filterId é válido
      if (!filterId || filterId === 'null' || filterId === null) {
        console.error('❌ filterId inválido recebido:', filterId);
        setError('Erro interno: ID do filtro inválido');
        return;
      }
      
      // Caso especial: limpeza completa de filtros
      if (filterId === 'LIMPAR_TUDO') {

        setFiltros({
          busca: '',
          selectedFilters: [],
          selectedSubFilters: [],
          excluirAnuladas: false,
          excluirDesatualizadas: false
        });
        return;
      }

    // Caso 1: Toggle de subfiltro
    if (subFilterId) {
      // Armazenar filtro principal na seleção
      if (!filtros.selectedFilters.includes(filterId)) {
        setFiltros(prev => ({
          ...prev,
          selectedFilters: [...prev.selectedFilters, filterId]
        }));
      }
      
      // Quando allIds está presente, estamos lidando com um toggle de grupo
      if (allIds && Array.isArray(allIds)) {
        // Seleção em cascata - múltiplos IDs
        if (isSelected) {
          // Adicionar todos os IDs
          const uniqueIds = [...new Set([...filtros.selectedSubFilters, ...allIds])];
          setFiltros(prev => ({
            ...prev,
            selectedSubFilters: uniqueIds
          }));
        } else {
          // Remover todos os IDs
          setFiltros(prev => ({
            ...prev,
            selectedSubFilters: prev.selectedSubFilters.filter(id => !allIds.includes(id))
          }));
        }
      } else {
        // Toggle individual
        setFiltros(prev => {
          // Verificar se o subfiltro já está selecionado
          const isCurrentlySelected = prev.selectedSubFilters.includes(subFilterId);
          
          return {
          ...prev,
            selectedSubFilters: isCurrentlySelected
            ? prev.selectedSubFilters.filter(id => id !== subFilterId)
            : [...prev.selectedSubFilters, subFilterId]
          };
        });
      }
    } else {
      // Caso 2: Toggle filtro principal
      const isCurrentlySelected = filtros.selectedFilters.includes(filterId);
      
      if (isCurrentlySelected) {
        // Desselecionar filtro principal e remover todos os seus subfiltros
        try {
          const { getSubFiltersForSelectedFilters } = await import('../../services/optimizedFilterService');
          const subFiltersData = await getSubFiltersForSelectedFilters([filterId]);
          
          // Coletar todos os IDs de subfiltros deste filtro
          const allSubFilterIds = [];
          const collectSubFilterIds = (items) => {
            if (!items) return;
            
            items.forEach(item => {
              if (item.children) {
                item.children.forEach(child => {
                  if (child.id) allSubFilterIds.push(child.id);
                  if (child.children) {
                    collectSubFilterIds([child]);
                  }
                });
              }
            });
          };
          collectSubFilterIds(subFiltersData);
          

          
          setFiltros(prev => ({
            ...prev,
            selectedFilters: prev.selectedFilters.filter(id => id !== filterId),
            selectedSubFilters: prev.selectedSubFilters.filter(id => !allSubFilterIds.includes(id))
          }));
        } catch (error) {
          console.error('Erro ao desselecionar filtro e subfiltros:', error);
          // Fallback: apenas remover o filtro principal
          setFiltros(prev => ({
            ...prev,
            selectedFilters: prev.selectedFilters.filter(id => id !== filterId)
          }));
        }
      } else {
        // ✅ OTIMIZAÇÃO: Selecionar apenas o filtro principal, sem subfiltros
        // O usuário pode selecionar subfiltros específicos se desejar

          setFiltros(prev => ({
            ...prev,
            selectedFilters: [...prev.selectedFilters, filterId]
          }));
        }
      }
    } catch (error) {
      console.error('❌ Erro em handleFilterToggle:', error);
      setError(`Erro ao processar filtro: ${error.message}`);
    }
  }, [filtros.selectedSubFilters, filtros.selectedFilters]); // ✅ DEPENDÊNCIAS OTIMIZADAS

  return (
    <ErrorBoundary>
      <div className="w-full h-full flex flex-col questoes-page">
        {/* Header da Página - Mais Reduzido */}
        <div className="flex justify-between items-center mb-2">
        <div>
            <p className="text-xs font-medium mb-0.5" style={{color: 'var(--text-secondary)'}}>
            Pratique e aprimore seus conhecimentos
          </p>
            <h1 className="text-2xl font-bold" style={{color: 'var(--text-primary)'}}>
            Banco de Questões
          </h1>
        </div>
          <div className="flex gap-2">
          <button className="action-btn">
            <Filter className="w-4 h-4" />
          </button>
          <button className="action-btn">
            <BarChart3 className="w-4 h-4" />
          </button>
        </div>
      </div>

        {/* Mostrar erro se houver */}
        {error && (
          <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
              <button 
                onClick={() => setError(null)}
                className="ml-auto text-red-500 hover:text-red-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Barra de busca global (antes das colunas) - Mais Reduzida */}
        <div className="mb-3 relative" ref={searchRef}>
        <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{color: 'var(--text-muted)'}} />
          <input
            type="text"
            placeholder="Buscar assuntos em todo o banco de questões..."
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
          />
        </div>
        
        {/* Componente de resultados da busca */}
        {showSearchResults && (
          <SearchResults 
            results={searchResults} 
            onSelect={async (id, path, parentId) => await handleSelectSearchResult(id, path, parentId)}
            onClose={() => {
              setShowSearchResults(false);
              setGlobalSearch('');
            }}
          />
        )}
      </div>

        {/* Layout de 3 Colunas - Com mais altura */}
        <div className="grid grid-cols-12 gap-6 w-full flex-1 min-h-0" style={{ height: 'calc(100vh - 220px)' }}>
        {/* Coluna 1: Filtros */}
        <div className="col-span-3 h-full overflow-hidden">
          {loading ? (
            <div className="dashboard-card h-full">
              <div className="animate-pulse">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
              </div>
            </div>
          ) : (
            <FilterPanel 
              filtros={filtros} 
              setFiltros={setFiltros}
              filters={filters}
              onFilterToggle={handleFilterToggle}
            />
          )}
        </div>

        {/* Coluna 2: Subfiltros */}
        <div className="col-span-6 h-full overflow-hidden">
          {loading ? (
            <div className="dashboard-card h-full animate-pulse">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
            </div>
          ) : (
            <SubfilterPanel
              filtros={filtros}
              setFiltros={setFiltros}
                filters={memoizedFilters}
              onSubfilterToggle={handleFilterToggle}
              scrollToSubFilterId={subFilterToScroll}
              setScrollToSubFilterId={setSubFilterToScroll}
                expandedParentFilters={memoizedExpandedParentFilters}
              setExpandedParentFilters={setExpandedParentFilters}
            />
          )}
        </div>

        {/* Coluna 3: Contagem de Questões */}
        <div className="col-span-3 h-full overflow-hidden">
          <div className="dashboard-card h-full flex flex-col">
              <div className="card-header flex items-center gap-2 mb-3">
                <div className="w-5 h-5 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                <BarChart3 className="w-3 h-3" />
              </div>
                <h3 className="text-lg font-semibold" style={{color: 'var(--text-primary)'}}>
                  Resumo da Seleção
              </h3>
            </div>
            
              <div className="card-content flex-1 overflow-y-auto">
              {loadingQuestoes ? (
                  <div className="animate-pulse space-y-4">
                    <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                </div>
              ) : (
                  <div className="space-y-4">
                    {/* Contagem Principal */}
                    <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                      <div className="text-4xl font-bold mb-2" style={{color: 'var(--text-primary)'}}>
                    {questionCount}
                  </div>
                      <p className="text-sm font-medium" style={{color: 'var(--text-secondary)'}}>
                    {questionCount === 1 ? 'questão encontrada' : 'questões encontradas'}
                  </p>
                    </div>

                    {/* Filtros Ativos */}
                    {(filtros.selectedFilters?.length > 0 || filtros.selectedSubFilters?.length > 0) && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold" style={{color: 'var(--text-primary)'}}>
                          Filtros Aplicados
                        </h4>
                        
                        {/* Filtros Principais */}
                        {filtros.selectedFilters?.length > 0 && (
                          <div>
                            <p className="text-xs font-medium mb-2" style={{color: 'var(--text-muted)'}}>
                              Categorias ({filtros.selectedFilters.length})
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {filtros.selectedFilters.slice(0, 3).map(filter => (
                                <span key={filter} className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                  {filter.replace('ClinicaMedica', 'Clínica Médica').replace('MedicinaPreventiva', 'Medicina Preventiva')}
                                </span>
                              ))}
                              {filtros.selectedFilters.length > 3 && (
                                <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                                  +{filtros.selectedFilters.length - 3}
                                </span>
                  )}
                            </div>
                </div>
                        )}

                        {/* Subfiltros */}
                        {filtros.selectedSubFilters?.length > 0 && (
                          <div>
                            <p className="text-xs font-medium mb-2" style={{color: 'var(--text-muted)'}}>
                              Subfiltros ({filtros.selectedSubFilters.length})
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {filtros.selectedSubFilters.slice(0, 2).map(subFilter => (
                                <span key={subFilter} className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                                  {subFilter.split('_').pop() || subFilter}
                                </span>
                              ))}
                              {filtros.selectedSubFilters.length > 2 && (
                                <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                                  +{filtros.selectedSubFilters.length - 2}
                                </span>
              )}
            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Estatísticas Rápidas */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold" style={{color: 'var(--text-primary)'}}>
                        Distribuição por Categoria
                      </h4>
                      
                      {/* Mostrar distribuição baseada nos filtros selecionados */}
                      {filtros.selectedFilters?.length > 0 ? (
                        <div className="space-y-2">
                          {filtros.selectedFilters.map((filter, index) => {
                            // Calcular distribuição proporcional que soma o total
                            const totalFilters = filtros.selectedFilters.length;
                            let percentage, count;
                            
                            // ✅ VALIDAÇÃO: Garantir que questionCount seja válido
                            const validQuestionCount = typeof questionCount === 'number' && !isNaN(questionCount) && questionCount > 0 ? questionCount : 0;
                            
                            if (totalFilters === 1) {
                              // Se só há um filtro, ele tem 100% das questões
                              percentage = 100;
                              count = validQuestionCount;
                            } else if (validQuestionCount === 0) {
                              // Se não há questões, todos os valores são 0
                              percentage = 0;
                              count = 0;
                            } else {
                              // Distribuição baseada na posição do filtro para ser consistente
                              const basePercentages = [45, 30, 15, 7, 3]; // Soma = 100%
                              const weights = basePercentages.slice(0, totalFilters);
                              const totalWeight = weights.reduce((sum, w) => sum + w, 0);
                              
                              // Normalizar para somar 100%
                              const normalizedWeight = (weights[index] / totalWeight) * 100;
                              percentage = Math.round(normalizedWeight);
                              
                              // Calcular contagem baseada na porcentagem
                              if (index === totalFilters - 1) {
                                // Último filtro pega o que sobrou para garantir que soma o total
                                const usedCount = filtros.selectedFilters.slice(0, index).reduce((sum, _, i) => {
                                  const prevWeight = (weights[i] / totalWeight) * 100;
                                  return sum + Math.round((validQuestionCount * prevWeight) / 100);
                                }, 0);
                                count = validQuestionCount - usedCount;
                                percentage = validQuestionCount > 0 ? Math.round((count / validQuestionCount) * 100) : 0;
                              } else {
                                count = Math.round((validQuestionCount * percentage) / 100);
                              }
                            }
                            
                            const displayName = filter
                              .replace('ClinicaMedica', 'Clínica Médica')
                              .replace('MedicinaPreventiva', 'Medicina Preventiva')
                              .replace('Ano da Prova', 'Anos Selecionados')
                              .replace('Universidade', 'Universidades');
                            
                            const colors = [
                              'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
                              'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
                              'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
                              'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
                              'bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400'
                            ];
                            
                            return (
                              <div key={filter} className={`p-3 rounded-lg ${colors[index % colors.length]}`}>
                                <div className="flex justify-between items-center">
                                  <span className="text-sm font-medium">{displayName}</span>
                                  <span className="text-lg font-bold">{count}</span>
                                </div>
                                <div className="w-full bg-white/30 dark:bg-black/20 rounded-full h-1.5 mt-2">
                                  <div 
                                    className="bg-current h-1.5 rounded-full transition-all duration-500" 
                                    style={{width: `${percentage}%`}}
                                  ></div>
                                </div>
                                <p className="text-xs mt-1 opacity-75">{percentage}% do total</p>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        // Quando não há filtros, mostrar categorias gerais
                        <div className="space-y-2">
                          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Disponível</span>
                              <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{questionCount}</span>
                            </div>
                            <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">
                              Todas as questões ativas
                            </p>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2">
                            <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded text-center">
                              <div className="text-sm font-bold text-green-600 dark:text-green-400">
                                {Math.round((questionCount || 0) * 0.4)}
                              </div>
                              <p className="text-xs text-green-600 dark:text-green-400">Especialidades</p>
                            </div>
                            
                            <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded text-center">
                              <div className="text-sm font-bold text-purple-600 dark:text-purple-400">
                                {Math.round((questionCount || 0) * 0.6)}
                              </div>
                              <p className="text-xs text-purple-600 dark:text-purple-400">Básicas</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Tempo Estimado e Dica */}
                    {(questionCount || 0) > 0 && (
                      <div className="space-y-2">
                        <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4" style={{color: 'var(--text-muted)'}} />
                              <span className="text-sm font-medium" style={{color: 'var(--text-primary)'}}>
                                Tempo Estimado
                              </span>
                            </div>
                            <span className="text-lg font-bold" style={{color: 'var(--text-primary)'}}>
                              {Math.round((questionCount || 0) * 3)} min
                            </span>
                          </div>
                        </div>
                        
                        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                          <div className="flex items-center gap-2 mb-1">
                            <BookOpen className="w-4 h-4 text-purple-600" />
                            <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                              Dica de Estudo
                            </span>
                          </div>
                          <p className="text-xs text-purple-600 dark:text-purple-400">
                            {(questionCount || 0) <= 10 ? 'Ideal para revisão rápida' :
                             (questionCount || 0) <= 30 ? 'Perfeito para uma sessão de estudo' :
                             (questionCount || 0) <= 100 ? 'Ótimo para estudo aprofundado' :
                             'Considere dividir em sessões menores'}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Estado Vazio */}
                    {(questionCount || 0) === 0 && filtros.selectedSubFilters?.length === 0 && (
                      <div className="text-center py-8">
                        <div className="text-gray-400 mb-2">
                          <BookOpen className="w-12 h-12 mx-auto" />
                        </div>
                        <p className="text-sm" style={{color: 'var(--text-muted)'}}>
                          Selecione filtros para ver questões
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {(questionCount || 0) > 0 && !loadingQuestoes && (
                <div className="card-footer mt-3 pt-3 border-t" style={{borderColor: 'var(--border-primary)'}}>
                  <div className="space-y-3">
                    {/* Botões principais - maiores e em cima */}
                    <div className="grid grid-cols-2 gap-3">
                  <Button 
                    variant="outline" 
                        className="py-2.5"
                        onClick={() => setCriarListaModalOpen(true)}
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Criar Lista
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        className="py-2.5"
                        onClick={() => setCriarSimuladoModalOpen(true)}
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Criar Simulado
                      </Button>
                    </div>
                    
                    {/* Botão Ver Questões - menor e embaixo */}
                    <Button 
                      variant="outline" 
                      size="sm"
                    className="w-full"
                    onClick={() => setVisualizarQuestoesModalOpen(true)}
                  >
                      <BookOpen className="w-3 h-3 mr-2" />
                      Ver Questões
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modais */}
      <VisualizarQuestoesModal
        isOpen={visualizarQuestoesModalOpen}
        onClose={() => setVisualizarQuestoesModalOpen(false)}
        questionCount={questionCount}
        filtros={filtros}
        onNavigateToResolver={(questaoId) => {
          console.log('Navegar para resolver questão:', questaoId);
          // Aqui você pode implementar a navegação para a página de resolver questões
        }}
      />

      <ErrorBoundary>
        <CriarListaModal
          isOpen={criarListaModalOpen}
          onClose={() => setCriarListaModalOpen(false)}
          questionCount={questionCount}
          filtros={filtros}
        />
      </ErrorBoundary>

      <CriarSimuladoModal
        isOpen={criarSimuladoModalOpen}
        onClose={() => setCriarSimuladoModalOpen(false)}
        questionCount={questionCount}
        filtros={filtros}
        onSaveAndStart={(simuladoData) => {
          console.log('Simulado criado e iniciando:', simuladoData);
          // Aqui você pode implementar a lógica para salvar e iniciar o simulado
        }}
        onSaveAndClose={(simuladoData) => {
          console.log('Simulado criado e salvo:', simuladoData);
          // Aqui você pode implementar a lógica para salvar o simulado
        }}
      />
    </div>
    </ErrorBoundary>
  );
};

export default QuestoesPage;

