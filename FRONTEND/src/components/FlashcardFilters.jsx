import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { ChevronDown, ChevronUp, Filter, Tag, Eye, Clock, TrendingUp } from 'lucide-react';
import { CustomFilterIcon } from './CustomIcons';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import FSRSChip from './FSRSChip';
import { flashcardService } from '../services/flashcardService';
import { useAuth } from '../contexts/AuthContext';

const FlashcardFilters = ({ selectedFilters, onFiltersChange, availableTags = [] }) => {
  const { user } = useAuth();
  const [expandedSections, setExpandedSections] = useState({
    deck: false,
    tags: false,
    status: false,
    difficulty: false,
    date: false
  });
      const [dynamicTags, setDynamicTags] = useState([]);
    const [loadingTags, setLoadingTags] = useState(false);

  // ✅ TOGGLE SEÇÃO
  const toggleSection = useCallback((section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  }, []);

  // ✅ HANDLERS DE FILTROS
  const handleStatusChange = useCallback((status) => {
    onFiltersChange(prev => ({
      ...prev,
      status: prev.status === status ? 'all' : status
    }));
  }, [onFiltersChange]);

  const handleTagToggle = useCallback((tag) => {
    onFiltersChange(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  }, [onFiltersChange]);

  const handleClearFilters = useCallback(() => {
    onFiltersChange({
      tags: [],
      status: 'all',
      difficulty: 'all'
    });
  }, [onFiltersChange]);

  // ✅ CARREGAR TAGS DINÂMICAS
  const loadAvailableTags = useCallback(async () => {
    try {
      setLoadingTags(true);
      const tags = await flashcardService.getAvailableTags();
      setDynamicTags(tags);
    } catch (error) {
      // Erro silencioso - usa array vazio como fallback
      setDynamicTags([]);
    } finally {
      setLoadingTags(false);
    }
  }, []);

  // ✅ USAR TAGS DISPONÍVEIS (prioridade: props > dinâmicas)
  const tagsToShow = useMemo(() => {
    return availableTags.length > 0 ? availableTags : dynamicTags;
  }, [availableTags, dynamicTags]);

  // ✅ FILTROS ATIVOS
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedFilters.status !== 'all') count++;
    if (selectedFilters.tags.length > 0) count += selectedFilters.tags.length;
    if (selectedFilters.difficulty !== 'all') count++;
    return count;
  }, [selectedFilters]);

  // ✅ EFFECT PARA CARREGAR TAGS
  useEffect(() => {
    const fetchFilterData = async () => {
      if (!user?.uid) return;
      
             try {
         // ✅ CORRIGIDO: Buscar tags disponíveis
         const tagsData = await flashcardService.getAvailableTags();
         setDynamicTags(Array.isArray(tagsData) ? tagsData : []);
         
       } catch (error) {
         console.error('Erro ao carregar dados dos filtros:', error);
       }
    };

    fetchFilterData();
  }, [user]);

  // ✅ OPÇÕES DE STATUS
  const statusOptions = [
    { 
      id: 'all', 
      label: 'Todos os Decks', 
      icon: Filter,
      color: 'gray',
      count: null
    },
    { 
      id: 'due', 
      label: 'Para Revisar', 
      icon: Clock,
      color: 'red',
      description: 'Decks com cards para revisar'
    },
    { 
      id: 'public', 
      label: 'Públicos', 
      icon: Eye,
      color: 'green',
      description: 'Decks compartilhados na comunidade'
    },
    { 
      id: 'private', 
      label: 'Privados', 
      icon: TrendingUp,
      color: 'blue',
      description: 'Decks apenas para você'
    }
  ];

  return (
    <div className="dashboard-card h-full flex flex-col">
      {/* ✅ HEADER */}
      <div className="card-header flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
            <CustomFilterIcon className="w-3 h-3" />
          </div>
          <h3 className="text-xl font-semibold" style={{color: 'var(--text-primary)'}}>
            Filtros
          </h3>
        </div>
        {activeFiltersCount > 0 && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {activeFiltersCount}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="text-xs h-6 px-2"
            >
              Limpar
            </Button>
          </div>
        )}
      </div>

      <div className="card-content flex-1 space-y-6">
        {/* ✅ SEÇÃO STATUS */}
        <Collapsible
          open={expandedSections.status}
          onOpenChange={() => toggleSection('status')}
        >
          <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4" style={{color: 'var(--text-secondary)'}} />
              <span className="font-medium text-sm" style={{color: 'var(--text-primary)'}}>
                Status do Deck
              </span>
            </div>
            {expandedSections.status ? (
              <ChevronUp className="w-4 h-4" style={{color: 'var(--text-muted)'}} />
            ) : (
              <ChevronDown className="w-4 h-4" style={{color: 'var(--text-muted)'}} />
            )}
          </CollapsibleTrigger>
          
          <CollapsibleContent className="space-y-2 mt-2">
            {statusOptions.map((option) => (
              <div
                key={option.id}
                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all duration-200 ${
                  selectedFilters.status === option.id
                    ? 'bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
                onClick={() => handleStatusChange(option.id)}
              >
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={selectedFilters.status === option.id}
                    onChange={() => handleStatusChange(option.id)}
                    className="pointer-events-none"
                  />
                  <div className="flex items-center gap-2">
                    <option.icon className="w-4 h-4" style={{color: 'var(--text-secondary)'}} />
                    <span className="text-sm" style={{color: 'var(--text-primary)'}}>
                      {option.label}
                    </span>
                  </div>
                </div>
                {selectedFilters.status === option.id && (
                  <FSRSChip
                    filter={{
                      label: 'Ativo',
                      color: option.color,
                      icon: option.icon
                    }}
                  />
                )}
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        {/* ✅ SEÇÃO TAGS */}
        {(tagsToShow.length > 0 || loadingTags) && (
          <>
            <Collapsible
              open={expandedSections.tags}
              onOpenChange={() => toggleSection('tags')}
            >
              <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4" style={{color: 'var(--text-secondary)'}} />
                  <span className="font-medium text-sm" style={{color: 'var(--text-primary)'}}>
                    Tags
                  </span>
                  {selectedFilters.tags.length > 0 && (
                    <Badge variant="secondary" className="text-xs ml-1">
                      {selectedFilters.tags.length}
                    </Badge>
                  )}
                </div>
                {expandedSections.tags ? (
                  <ChevronUp className="w-4 h-4" style={{color: 'var(--text-muted)'}} />
                ) : (
                  <ChevronDown className="w-4 h-4" style={{color: 'var(--text-muted)'}} />
                )}
              </CollapsibleTrigger>
              
              <CollapsibleContent className="space-y-2 mt-2">
                {loadingTags ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="text-sm" style={{color: 'var(--text-muted)'}}>
                      Carregando tags...
                    </div>
                  </div>
                ) : (
                  tagsToShow.map((tag) => (
                    <div
                      key={tag}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all duration-200 ${
                        selectedFilters.tags.includes(tag)
                          ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                      onClick={() => handleTagToggle(tag)}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedFilters.tags.includes(tag)}
                          onChange={() => handleTagToggle(tag)}
                          className="pointer-events-none"
                        />
                        <span className="text-sm" style={{color: 'var(--text-primary)'}}>
                          {tag}
                        </span>
                      </div>
                      {selectedFilters.tags.includes(tag) && (
                        <FSRSChip
                          filter={{
                            label: tag,
                            color: 'blue',
                            icon: Tag
                          }}
                        />
                      )}
                    </div>
                  ))
                )}
              </CollapsibleContent>
            </Collapsible>

            <Separator />
          </>
        )}

        {/* ✅ FILTROS ATIVOS */}
        {activeFiltersCount > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium" style={{color: 'var(--text-primary)'}}>
                Filtros Ativos
              </span>
              <Badge variant="secondary" className="text-xs">
                {activeFiltersCount}
              </Badge>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {/* Status ativo */}
              {selectedFilters.status !== 'all' && (
                <FSRSChip
                  filter={{
                    label: statusOptions.find(opt => opt.id === selectedFilters.status)?.label || selectedFilters.status,
                    color: statusOptions.find(opt => opt.id === selectedFilters.status)?.color || 'gray',
                    icon: statusOptions.find(opt => opt.id === selectedFilters.status)?.icon || Filter
                  }}
                  removable
                  onRemove={() => handleStatusChange(selectedFilters.status)}
                />
              )}

              {/* Tags ativas */}
              {selectedFilters.tags.map(tag => (
                <FSRSChip
                  key={tag}
                  filter={{
                    label: tag,
                    color: 'blue',
                    icon: Tag
                  }}
                  removable
                  onRemove={() => handleTagToggle(tag)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FlashcardFilters; 