import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, X, Filter, Clock, BookOpen, Eye, Heart, Tag, ChevronDown, Loader, AlertTriangle, CheckCircle, TrendingDown, TrendingUp } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { flashcardService } from '../services/flashcardService';
import FSRSChip from './FSRSChip';

/**
 * 🔍 COMPONENTE: Busca Global de Flashcards com Filtros FSRS
 * 
 * Features:
 * - Busca global em todas as coleções
 * - Filtros FSRS avançados
 * - Chips visuais de status
 * - Debounce para performance
 * - Design do dashboard
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
      const response = await flashcardService.getFSRSStatus();
      
      if (response.success) {
        setFSRSStatus(response.data);
      }
    } catch (error) {
      // Erro silencioso - não é crítico para o funcionamento
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

      const response = await flashcardService.globalFlashcardSearch(query, {
        filters,
        limit: 200
      });
      
      if (response.success) {
        const searchData = {
          directResults: response.data.directResults || [],
          folderResults: response.data.folderResults || [],
          stats: response.data.stats || {},
          query: response.data.query || query
        };
        
        setSearchResults(searchData);
        onResultsChange && onResultsChange(searchData);
      } else {
        const emptyResults = { directResults: [], folderResults: [], stats: {}, query };
        setSearchResults(emptyResults);
        onResultsChange && onResultsChange(emptyResults);
      }
    } catch (error) {
      // Erro silencioso na busca - retorna resultados vazios
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
      <div className="flex gap-4 text-sm mb-4" style={{color: 'var(--text-secondary)'}}>
        <div className="flex items-center gap-1">
          <Clock className="w-4 h-4" style={{color: 'var(--color-orange)'}} />
          <span>{fsrsStatus.pendingCards} pendentes</span>
        </div>
        <div className="flex items-center gap-1">
          <AlertTriangle className="w-4 h-4" style={{color: 'var(--color-red)'}} />
          <span>{fsrsStatus.overdueCards} vencidas</span>
        </div>
        <div className="flex items-center gap-1">
          <CheckCircle className="w-4 h-4" style={{color: 'var(--color-green)'}} />
          <span>{fsrsStatus.upToDateCards} em dia</span>
        </div>
      </div>
    );
  };

  return (
    <div className="dashboard-card">
      <div className="card-header">
        <h3 className="text-xl font-semibold" style={{color: 'var(--text-primary)'}}>
          Busca Global
        </h3>
      </div>

      <div className="card-content space-y-4">
        {/* Barra de busca principal */}
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" style={{color: 'var(--text-muted)'}} />
            <input
              type="text"
              placeholder="Buscar em todas as coleções..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-16 py-3 border rounded-lg focus:ring-2 focus:ring-opacity-50"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
                '--tw-ring-color': 'var(--color-primary)'
              }}
            />
            {isSearching && (
              <div className="absolute right-12 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2" style={{borderColor: 'var(--color-primary)'}}></div>
              </div>
            )}
          </div>

          {/* Botão de filtros */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`absolute right-2 top-1/2 transform -translate-y-1/2 p-2 rounded-md transition-colors ${
              activeFilters.length > 0 || showFilters ? 'filter-active' : 'filter-inactive'
            }`}
          >
            <Filter className="w-4 h-4" />
            {activeFilters.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center text-xs rounded-full" 
                    style={{backgroundColor: 'var(--color-primary)', color: 'var(--text-on-primary)'}}>
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
          <div className="border rounded-lg p-4 shadow-sm" style={{
            backgroundColor: 'var(--bg-secondary)',
            borderColor: 'var(--border-color)'
          }}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium" style={{color: 'var(--text-primary)'}}>Filtros FSRS</h3>
              <button
                onClick={() => setShowFilters(false)}
                className="hover:opacity-70 transition-opacity"
                style={{color: 'var(--text-muted)'}}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filtros por categoria */}
            {['status', 'performance', 'priority'].map(category => (
              <div key={category} className="mb-4">
                <h4 className="text-sm font-medium mb-2 capitalize" style={{color: 'var(--text-secondary)'}}>
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
                            isActive ? 'filter-option-active' : 'filter-option-inactive'
                          }`}
                        >
                          <Icon className={`w-4 h-4 ${isActive ? 'filter-icon-active' : 'filter-icon-inactive'}`} />
                          <div className="text-left">
                            <div className="text-sm font-medium">{option.label}</div>
                            <div className="text-xs" style={{color: 'var(--text-muted)'}}>{option.description}</div>
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>
            ))}

            {/* Ações dos filtros */}
            <div className="flex justify-between pt-4 border-t" style={{borderColor: 'var(--border-color)'}}>
              <button
                onClick={clearFilters}
                className="px-4 py-2 hover:opacity-70 transition-opacity"
                style={{color: 'var(--text-secondary)'}}
              >
                Limpar tudo
              </button>
              <div className="space-x-2">
                <button
                  onClick={() => setShowFilters(false)}
                  className="px-4 py-2 hover:opacity-70 transition-opacity"
                  style={{color: 'var(--text-secondary)'}}
                >
                  Cancelar
                </button>
                <button
                  onClick={applyFilters}
                  className="px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
                  style={{
                    backgroundColor: 'var(--color-primary)',
                    color: 'var(--text-on-primary)'
                  }}
                >
                  Aplicar ({tempFilters.length})
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Resultados da busca */}
        {searchQuery.trim().length >= 2 && (
          <div className="text-sm" style={{color: 'var(--text-secondary)'}}>
            {isSearching ? (
              'Buscando...'
            ) : (
              `${searchResults.directResults?.length || 0} resultado${(searchResults.directResults?.length || 0) !== 1 ? 's' : ''} encontrado${(searchResults.directResults?.length || 0) !== 1 ? 's' : ''}`
            )}
          </div>
        )}
      </div>
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