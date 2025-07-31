import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Filter, X, Clock, AlertTriangle, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react';
import fetchWithAuth from '../../../services/fetchWithAuth';
import FSRSChip from './FSRSChip';

/**
 * 🔍 COMPONENTE: Busca Global de Flashcards com Filtros FSRS
 * 
 * Features:
 * - Busca global em todas as coleções
 * - Filtros FSRS avançados
 * - Chips visuais de status
 * - Debounce para performance
 * - Cache inteligente
 */
const FlashcardGlobalSearch = ({ onResultsChange, onLoadingChange }) => {
  // Estados principais
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState({ directResults: [], folderResults: [], stats: {}, query: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState([]);
  const [fsrsStatus, setFSRSStatus] = useState(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);

  // Estados do formulário de filtros
  const [tempFilters, setTempFilters] = useState([]);

  // Opções de filtros FSRS
  const filterOptions = useMemo(() => [
    {
      id: 'pendentes',
      label: 'Pendentes',
      description: 'Cards que precisam ser revisados',
      icon: Clock,
      color: 'orange',
      category: 'status'
    },
    {
      id: 'vencidas',
      label: 'Vencidas',
      description: 'Cards vencidos há mais de 7 dias',
      icon: AlertTriangle,
      color: 'red',
      category: 'status'
    },
    {
      id: 'em-dia',
      label: 'Em Dia',
      description: 'Cards com revisão em dia',
      icon: CheckCircle,
      color: 'green',
      category: 'status'
    },
    {
      id: 'nunca-estudadas',
      label: 'Nunca Estudadas',
      description: 'Cards que nunca foram revisados',
      icon: Clock,
      color: 'gray',
      category: 'status'
    },
    {
      id: 'baixo',
      label: 'Desempenho Baixo',
      description: 'Cards com dificuldade alta',
      icon: TrendingDown,
      color: 'red',
      category: 'performance'
    },
    {
      id: 'medio',
      label: 'Desempenho Médio',
      description: 'Cards com dificuldade média',
      icon: TrendingUp,
      color: 'yellow',
      category: 'performance'
    },
    {
      id: 'alto',
      label: 'Desempenho Alto',
      description: 'Cards com baixa dificuldade',
      icon: TrendingUp,
      color: 'green',
      category: 'performance'
    },
    {
      id: 'alta-prioridade',
      label: 'Alta Prioridade',
      description: 'Cards vencidos + baixo desempenho',
      icon: AlertTriangle,
      color: 'red',
      category: 'priority'
    }
  ], []);

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((query, filters) => {
      if (query.trim().length >= 2) {
        performSearch(query, filters);
      } else {
        const emptyResults = { directResults: [], folderResults: [], stats: {}, query: '' };
        setSearchResults(emptyResults);
        onResultsChange && onResultsChange(emptyResults);
      }
    }, 300),
    []
  );

  // Efeito para busca com debounce
  useEffect(() => {
    debouncedSearch(searchQuery, activeFilters);
  }, [searchQuery, activeFilters, debouncedSearch]);

  // Carregar status FSRS inicial
  useEffect(() => {
    loadFSRSStatus();
  }, []);

  /**
   * 📊 Carregar status FSRS
   */
  const loadFSRSStatus = async () => {
    try {
      setIsLoadingStatus(true);
      const response = await fetchWithAuth('http://localhost:5000/api/flashcards/fsrs-stats');
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setFSRSStatus(data.data);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar status FSRS:', error);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  /**
   * 🔍 Executar busca
   */
  const performSearch = async (query, filters) => {
    try {
      setIsSearching(true);
      onLoadingChange && onLoadingChange(true);

      const params = new URLSearchParams({
        q: query,
        limit: '200'
      });

      if (filters.length > 0) {
        params.set('filters', filters.join(','));
      }

      const response = await fetchWithAuth(`http://localhost:5000/api/admin/flashcards/search?${params}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Nova estrutura: duas seções
          const searchData = {
            directResults: data.data.directResults || [],
            folderResults: data.data.folderResults || [],
            stats: data.data.stats || {},
            query: data.data.query || query
          };
          
          setSearchResults(searchData);
          onResultsChange && onResultsChange(searchData);
        } else {
          const emptyResults = { directResults: [], folderResults: [], stats: {}, query };
          setSearchResults(emptyResults);
          onResultsChange && onResultsChange(emptyResults);
        }
      } else {
        const emptyResults = { directResults: [], folderResults: [], stats: {}, query };
        setSearchResults(emptyResults);
        onResultsChange && onResultsChange(emptyResults);
      }
    } catch (error) {
      console.error('Erro na busca:', error);
      const emptyResults = { directResults: [], folderResults: [], stats: {}, query };
      setSearchResults(emptyResults);
      onResultsChange && onResultsChange(emptyResults);
    } finally {
      setIsSearching(false);
      onLoadingChange && onLoadingChange(false);
    }
  };

  /**
   * 🎛️ Gerenciar filtros
   */
  const handleFilterToggle = (filterId) => {
    setTempFilters(prev => 
      prev.includes(filterId)
        ? prev.filter(f => f !== filterId)
        : [...prev, filterId]
    );
  };

  const applyFilters = () => {
    setActiveFilters(tempFilters);
    setShowFilters(false);
  };

  const clearFilters = () => {
    setActiveFilters([]);
    setTempFilters([]);
    setShowFilters(false);
  };

  const removeFilter = (filterId) => {
    setActiveFilters(prev => prev.filter(f => f !== filterId));
  };

  /**
   * 📊 Estatísticas rápidas
   */
  const getQuickStats = () => {
    if (!fsrsStatus) return null;

    return (
      <div className="flex gap-4 text-sm text-gray-600 mb-4">
        <div className="flex items-center gap-1">
          <Clock className="w-4 h-4 text-orange-500" />
          <span>{fsrsStatus.pendingCards} pendentes</span>
        </div>
        <div className="flex items-center gap-1">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <span>{fsrsStatus.overdueCards} vencidas</span>
        </div>
        <div className="flex items-center gap-1">
          <CheckCircle className="w-4 h-4 text-green-500" />
          <span>{fsrsStatus.upToDateCards} em dia</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Barra de busca principal */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar em todas as coleções..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {isSearching && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
            </div>
          )}
        </div>

        {/* Botão de filtros */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`absolute right-2 top-1/2 transform -translate-y-1/2 p-2 rounded-md transition-colors ${
            activeFilters.length > 0 || showFilters
              ? 'bg-blue-100 text-blue-600'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <Filter className="w-4 h-4" />
          {activeFilters.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {activeFilters.length}
            </span>
          )}
        </button>
      </div>

      {/* Estatísticas rápidas */}
      {!isLoadingStatus && getQuickStats()}

      {/* Filtros ativos */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeFilters.map(filterId => {
            const filter = filterOptions.find(f => f.id === filterId);
            return (
              <FSRSChip
                key={filterId}
                filter={filter}
                onRemove={() => removeFilter(filterId)}
                removable
              />
            );
          })}
        </div>
      )}

      {/* Painel de filtros */}
      {showFilters && (
        <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium text-gray-900">Filtros FSRS</h3>
            <button
              onClick={() => setShowFilters(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Filtros por categoria */}
          {['status', 'performance', 'priority'].map(category => (
            <div key={category} className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2 capitalize">
                {category === 'status' ? 'Status de Revisão' : 
                 category === 'performance' ? 'Desempenho' : 'Prioridade'}
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {filterOptions
                  .filter(option => option.category === category)
                  .map(option => {
                    const Icon = option.icon;
                    const isActive = tempFilters.includes(option.id);
                    
                    return (
                      <button
                        key={option.id}
                        onClick={() => handleFilterToggle(option.id)}
                        className={`flex items-center gap-2 p-3 rounded-lg border transition-all ${
                          isActive
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                        <div className="text-left">
                          <div className="text-sm font-medium">{option.label}</div>
                          <div className="text-xs text-gray-500">{option.description}</div>
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>
          ))}

          {/* Ações dos filtros */}
          <div className="flex justify-between pt-4 border-t">
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Limpar tudo
            </button>
            <div className="space-x-2">
              <button
                onClick={() => setShowFilters(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={applyFilters}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Aplicar ({tempFilters.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resultados da busca */}
      {searchQuery.trim().length >= 2 && (
        <div className="text-sm text-gray-600">
          {isSearching ? (
            'Buscando...'
          ) : (
            `${searchResults.length} resultado${searchResults.length !== 1 ? 's' : ''} encontrado${searchResults.length !== 1 ? 's' : ''}`
          )}
        </div>
      )}
    </div>
  );
};

/**
 * 🚀 Função utilitária: Debounce
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export default FlashcardGlobalSearch;