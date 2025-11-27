'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useNewQuestion } from '@/lib/contexts/NewQuestionContext';
import type { Filter as FilterType, SubFilter as SubFilterType } from '@/types/admin/filter';
import { createQuestion } from '@/services/questionApi';
import { getAllFilters } from '@/services/admin/filterService';
import Checkbox from '@/components/ui/Checkbox';

type Filter = FilterType & { children?: SubFilter[] };
type SubFilter = SubFilterType & { children?: SubFilter[] };

// Componente de resumo da questão
const QuestionSummary: React.FC<{ questionData: any }> = ({ questionData }) => {
  // Remove HTML tags para preview
  const stripHtml = (html: string) => {
    if (typeof window === 'undefined') return html;
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  return (
    <div className="bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20 rounded-xl p-6 border border-primary/20">
      <h3 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary mb-4 flex items-center gap-2">
        <span className="material-symbols-outlined">description</span>
        Resumo da Questão
      </h3>
      
      <div className="space-y-4">
        {/* Statement Preview */}
        <div>
          <p className="text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-1">Enunciado:</p>
          <p className="text-sm text-text-light-primary dark:text-text-dark-primary bg-white/50 dark:bg-black/20 rounded-lg p-3 line-clamp-3">
            {stripHtml(questionData.statement) || 'Sem enunciado'}
          </p>
        </div>

        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/50 dark:bg-black/20 rounded-lg p-3">
            <p className="text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary">Tipo</p>
            <p className="text-sm text-text-light-primary dark:text-text-dark-primary font-semibold capitalize">{questionData.type}</p>
          </div>
          <div className="bg-white/50 dark:bg-black/20 rounded-lg p-3">
            <p className="text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary">Status</p>
            <p className="text-sm text-text-light-primary dark:text-text-dark-primary font-semibold">{questionData.status}</p>
          </div>
          <div className="bg-white/50 dark:bg-black/20 rounded-lg p-3">
            <p className="text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary">Dificuldade</p>
            <p className="text-sm text-text-light-primary dark:text-text-dark-primary font-semibold">{questionData.difficulty}</p>
          </div>
          <div className="bg-white/50 dark:bg-black/20 rounded-lg p-3">
            <p className="text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary">Alternativas</p>
            <p className="text-sm text-text-light-primary dark:text-text-dark-primary font-semibold">{questionData.alternatives?.length || 0}</p>
          </div>
        </div>

        {/* Tags */}
        {questionData.tags && questionData.tags.length > 0 && (
          <div>
            <p className="text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-2">Tags:</p>
            <div className="flex flex-wrap gap-1">
              {questionData.tags.map((tag: string, idx: number) => (
                <span key={idx} className="bg-primary/20 text-primary px-2 py-1 rounded text-xs font-medium">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Special Flags */}
        <div className="flex gap-2">
          {questionData.isAnnulled && (
            <span className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">block</span>
              Anulada
            </span>
          )}
          {questionData.isOutdated && (
            <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">schedule</span>
              Desatualizada
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// Componente para chip de filtro selecionado
const FilterChip: React.FC<{ 
  name: string; 
  onRemove: () => void; 
  color?: 'blue' | 'green' | 'purple' | 'orange' 
}> = ({ name, onRemove, color = 'blue' }) => {
  const colorClasses = {
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-800'
  };

  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border ${colorClasses[color]} transition-all hover:shadow-sm`}>
      {name}
      <button
        onClick={onRemove}
        type="button"
        className="w-4 h-4 rounded-full bg-current opacity-20 hover:opacity-40 flex items-center justify-center transition-opacity"
      >
        <span className="material-symbols-outlined text-xs">close</span>
      </button>
    </span>
  );
};

// Componente para seção de filtros
const FilterSection: React.FC<{
  title: string;
  icon: string;
  color: string;
  filters: Filter[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  loading?: boolean;
  emptyMessage?: string;
}> = ({ title, icon, color, filters, selectedIds, onToggle, loading, emptyMessage }) => {
  return (
    <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-6 shadow-sm border border-border-light dark:border-border-dark">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center`}>
          <span className="material-symbols-outlined text-white text-lg">{icon}</span>
        </div>
        <div>
          <h3 className="font-bold text-text-light-primary dark:text-text-dark-primary">{title}</h3>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">{filters.length} filtros disponíveis</p>
        </div>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        )}
        
        {!loading && filters.length === 0 && (
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary italic py-4 text-center">
            {emptyMessage || 'Nenhum filtro disponível'}
          </p>
        )}
        
        {!loading && filters.map((filter) => (
          <label
            key={filter.id}
            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all border-2 ${
              selectedIds.includes(filter.id)
                ? 'bg-primary/10 border-primary/20 shadow-sm'
                : 'bg-gray-50 dark:bg-gray-900/50 border-transparent hover:bg-gray-100 dark:hover:bg-gray-900'
            }`}
          >
            <Checkbox
              checked={selectedIds.includes(filter.id)}
              onChange={() => onToggle(filter.id)}
            />
            <span className={`text-sm font-medium ${selectedIds.includes(filter.id) ? 'text-primary' : 'text-text-light-primary dark:text-text-dark-primary'}`}>
              {filter.name}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
};

export default FilterSection;


// Componente principal
const QuestionFiltersStep: React.FC = () => {
  const router = useRouter();
  const { questionData, setQuestionData, resetQuestion } = useNewQuestion();
  
  // Debug: verificar dados do contexto ao montar o componente
  useEffect(() => {
    console.log('🔍 QuestionFiltersStep - Dados do contexto ao montar:', JSON.stringify(questionData, null, 2));
  }, []);
  
  // Estados para filtros e subfiltros
  const [filterIdsList, setFilterIdsList] = useState<Filter[]>([]);
  const [educationalFilters, setEducationalFilters] = useState<Filter[]>([]);
  const [medicalSpecialtyFilters, setMedicalSpecialtyFilters] = useState<Filter[]>([]);
  const [subFilterIdsList, setSubFilterIdsList] = useState<SubFilter[]>([]);
  const [expandedFilters, setExpandedFilters] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Estados para seleção
  const [selectedFilterIds, setSelectedFilterIds] = useState<string[]>(
    questionData.filterIds || []
  );
  const [selectedEducational, setSelectedEducational] = useState<string[]>([]);
  const [selectedMedicalSpecialty, setSelectedMedicalSpecialty] = useState<string[]>([]);
  const [selectedSubFilterIds, setSelectedSubFilterIds] = useState<string[]>(
    questionData.subFilterIds || []
  );

  // Buscar filtros ao montar o componente
  useEffect(() => {
    const loadFilters = async () => {
      setLoading(true);
      try {
        const allFilters = await getAllFilters();
        // Separar filtros por categoria
        const institutional = allFilters.filter((f: Filter) => f.category === 'INSTITUTIONAL');
        const educational = allFilters.filter((f: Filter) => f.category === 'EDUCATIONAL');
        const medicalSpecialty = allFilters.filter((f: Filter) => f.category === 'MEDICAL_SPECIALTY');
        
        setFilterIdsList(institutional);
        setEducationalFilters(educational);
        setMedicalSpecialtyFilters(medicalSpecialty);
        setError('');
        
        console.log('📊 Filtros carregados:', {
          institutional: institutional.length,
          educational: educational.length,
          medicalSpecialty: medicalSpecialty.length
        });
      } catch (err) {
        setError('Erro ao carregar filtros');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadFilters();
  }, []);

  // Atualizar subfiltros sempre que filtros selecionados mudarem
  useEffect(() => {
    function buildSubFilterTreeFromFlat(flat: SubFilter[]): SubFilter[] {
      const map: Record<string, SubFilter & { children?: SubFilter[] }> = {};
      flat.forEach(sf => { map[sf.id] = { ...sf, children: [] }; });
      const roots: SubFilter[] = [];
      flat.forEach(sf => {
        if (sf.parentId && map[sf.parentId]) {
          map[sf.parentId].children!.push(map[sf.id]);
        } else {
          roots.push(map[sf.id]);
        }
      });
      return roots;
    }
    
    let allSubFiltersFlat: SubFilter[] = [];
    const allSelected = [...selectedFilterIds, ...selectedEducational, ...selectedMedicalSpecialty];
    
    for (const filterId of allSelected) {
      const allFilters = [...filterIdsList, ...educationalFilters, ...medicalSpecialtyFilters];
      const filter = allFilters.find(f => f.id === filterId);
      
      if (filter && filter.children) {
        function collectAllSubFilters(nodes: SubFilter[]): SubFilter[] {
          let result: SubFilter[] = [];
          for (const node of nodes) {
            result.push(node);
            if (node.children && node.children.length > 0) {
              result = result.concat(collectAllSubFilters(node.children));
            }
          }
          return result;
        }
        allSubFiltersFlat = allSubFiltersFlat.concat(collectAllSubFilters(filter.children));
      }
    }
    
    // Remover duplicatas
    const uniqueSubFiltersFlat = Array.from(new Map(allSubFiltersFlat.map(sf => [sf.id, sf])).values());
    const tree = buildSubFilterTreeFromFlat(uniqueSubFiltersFlat);
    setSubFilterIdsList(tree);
  }, [selectedFilterIds, selectedEducational, selectedMedicalSpecialty, filterIdsList, educationalFilters, medicalSpecialtyFilters]);

  // Atualizar o contexto sempre que a seleção mudar
  useEffect(() => {
    setQuestionData({
      ...questionData,
      filterIds: [...selectedFilterIds, ...selectedEducational, ...selectedMedicalSpecialty],
      subFilterIds: selectedSubFilterIds
    });
  }, [selectedFilterIds, selectedEducational, selectedMedicalSpecialty, selectedSubFilterIds]);

  // Handlers para filtros
  const toggleInstitutionalFilter = (filterId: string) => {
    setSelectedFilterIds(prev => 
      prev.includes(filterId)
        ? prev.filter(id => id !== filterId)
        : [...prev, filterId]
    );
  };

  const toggleEducationalFilter = (filterId: string) => {
    setSelectedEducational(prev => 
      prev.includes(filterId)
        ? prev.filter(id => id !== filterId)
        : [...prev, filterId]
    );
  };

  const toggleMedicalSpecialtyFilter = (filterId: string) => {
    setSelectedMedicalSpecialty(prev => 
      prev.includes(filterId)
        ? prev.filter(id => id !== filterId)
        : [...prev, filterId]
    );
  };

  const toggleSubFilter = (subFilterId: string) => {
    setSelectedSubFilterIds(prev => 
      prev.includes(subFilterId)
        ? prev.filter(id => id !== subFilterId)
        : [...prev, subFilterId]
    );
  };

  const toggleExpand = (filterId: string) => {
    setExpandedFilters(prev => 
      prev.includes(filterId)
        ? prev.filter(id => id !== filterId)
        : [...prev, filterId]
    );
  };

  // Função para obter nome do filtro por ID
  const getFilterNameById = (id: string) => {
    const allFilters = [...filterIdsList, ...educationalFilters, ...medicalSpecialtyFilters];
    const filter = allFilters.find(f => f.id === id);
    if (filter) return filter.name;
    
    // Buscar em subfiltros
    function findSubFilterNameById(nodes: SubFilter[]): string | null {
      for (const node of nodes) {
        if (node.id === id) return node.name;
        if (node.children && node.children.length > 0) {
          const found = findSubFilterNameById(node.children);
          if (found) return found;
        }
      }
      return null;
    }
    
    for (const f of allFilters) {
      if (f.children) {
        const found = findSubFilterNameById(f.children);
        if (found) return found;
      }
    }
    
    return id;
  };

  // Limpar filtros
  const resetFilters = () => {
    setSelectedFilterIds([]);
    setSelectedEducational([]);
    setSelectedMedicalSpecialty([]);
    setSelectedSubFilterIds([]);
    setExpandedFilters([]);
    setSearchQuery('');
  };

  // Enviar questão
  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      console.log('🔍 Dados da questão para criar:', JSON.stringify(questionData, null, 2));
      
      if (!questionData.statement.trim()) {
        throw new Error('Enunciado da questão é obrigatório');
      }
      
      if (questionData.type === 'objetiva' && (!questionData.alternatives || questionData.alternatives.length === 0)) {
        throw new Error('Alternativas são obrigatórias para questões objetivas');
      }
      
      const questionToSave = {
        ...questionData,
        tags: questionData.tags || [],
        filterIds: questionData.filterIds || [],
        subFilterIds: questionData.subFilterIds || [],
        educationalFilters: questionData.educationalFilters || [],
        isAnnulled: questionData.isAnnulled || false,
        isOutdated: questionData.isOutdated || false,
        alternatives: questionData.alternatives.map((alt, index) => ({
          ...alt,
          order: index
        }))
      };
      
      console.log('📤 Enviando questão:', JSON.stringify(questionToSave, null, 2));
      const result = await createQuestion(questionToSave);
      console.log('✅ Questão criada com sucesso:', result);
      
      resetQuestion();
      router.push('/admin/questions');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao criar questão';
      setError(errorMessage);
      console.error('❌ Erro ao criar questão:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Função para renderizar árvore de subfiltros
  const SubFilterTreeNode: React.FC<{
    subFilter: SubFilter;
    level: number;
  }> = ({ subFilter, level }) => {
    const isExpanded = expandedFilters.includes(subFilter.id);
    const hasChildren = subFilter.children && subFilter.children.length > 0;
    const isSelected = selectedSubFilterIds.includes(subFilter.id);

    return (
      <div className="mb-1">
        <div className={`flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-all border ${
          isSelected ? 'bg-primary/10 border-primary/20 shadow-sm' : 'bg-gray-50 dark:bg-gray-900/50 border-transparent hover:bg-gray-100 dark:hover:bg-gray-900'
        }`} style={{ marginLeft: `${level * 20}px` }}>
          {hasChildren && (
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); toggleExpand(subFilter.id); }}
              className="w-6 h-6 flex items-center justify-center text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition-colors"
            >
              <span className="material-symbols-outlined text-xs">{isExpanded ? 'expand_more' : 'chevron_right'}</span>
            </button>
          )}
          {!hasChildren && <div className="w-6"></div>}
          
          <label className="flex items-center gap-3 cursor-pointer flex-1">
            <Checkbox
              checked={isSelected}
              onChange={() => toggleSubFilter(subFilter.id)}
            />
            <span className={`text-sm ${isSelected ? 'font-medium text-primary' : 'text-text-light-primary dark:text-text-dark-primary'} flex-1`}>
              {subFilter.name}
            </span>
            {hasChildren && (
              <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary bg-gray-200 dark:bg-gray-800 px-2 py-1 rounded">
                {subFilter.children!.length}
              </span>
            )}
          </label>
        </div>
        
        {hasChildren && isExpanded && (
          <div className="ml-3 border-l-2 border-border-light dark:border-border-dark pl-3 mt-1">
            {subFilter.children!.map(child => (
              <SubFilterTreeNode
                key={child.id}
                subFilter={child}
                level={level + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  // Filtrar subfiltros por busca
  const filteredSubFilters = subFilterIdsList.filter(sf => 
    !searchQuery.trim() || sf.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      {/* Header */}
      <div className="bg-surface-light dark:bg-surface-dark border-b border-border-light dark:border-border-dark shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary">Filtros da Questão</h1>
              <p className="text-text-light-secondary dark:text-text-dark-secondary mt-1">Selecione os filtros e subfiltros para categorizar a questão</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/admin/questions/create')}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-text-light-primary dark:text-text-dark-primary rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <span className="material-symbols-outlined">arrow_back</span>
                Voltar
              </button>
              <button
                onClick={resetFilters}
                className="flex items-center gap-2 px-4 py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-lg hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors"
              >
                <span className="material-symbols-outlined">delete</span>
                Limpar Todos
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Column - Filter Categories */}
          <div className="lg:col-span-2 space-y-6">
            <FilterSection
              title="Filtros Institucionais"
              icon="account_balance"
              color="bg-blue-500"
              filters={filterIdsList}
              selectedIds={selectedFilterIds}
              onToggle={toggleInstitutionalFilter}
              loading={loading}
              emptyMessage="Nenhum filtro institucional disponível"
            />
            
            <FilterSection
              title="Filtros Educacionais"
              icon="school"
              color="bg-green-500"
              filters={educationalFilters}
              selectedIds={selectedEducational}
              onToggle={toggleEducationalFilter}
              loading={loading}
              emptyMessage="Nenhum filtro educacional disponível"
            />
            
            <FilterSection
              title="Especialidades Médicas"
              icon="medical_services"
              color="bg-purple-500"
              filters={medicalSpecialtyFilters}
              selectedIds={selectedMedicalSpecialty}
              onToggle={toggleMedicalSpecialtyFilter}
              loading={loading}
              emptyMessage="Nenhuma especialidade médica disponível"
            />
          </div>

          {/* Right Column - Subfiltros e Resumo */}
          <div className="lg:col-span-2 space-y-6">
            {/* Subfiltros */}
            <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-6 shadow-sm border border-border-light dark:border-border-dark">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-indigo-500 flex items-center justify-center">
                  <span className="material-symbols-outlined text-white text-lg">filter_alt</span>
                </div>
                <div>
                  <h3 className="font-bold text-text-light-primary dark:text-text-dark-primary">Subfiltros</h3>
                  <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                    {filteredSubFilters.length} subfiltros disponíveis
                  </p>
                </div>
              </div>
              
              {/* Busca de subfiltros */}
              <div className="mb-4">
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 transform -translate-y-1/2 text-text-light-secondary dark:text-text-dark-secondary">search</span>
                  <input
                    type="text"
                    className="pl-10 pr-3 py-2 border border-border-light dark:border-border-dark rounded-lg w-full focus:ring-2 focus:ring-primary focus:border-primary bg-surface-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary"
                    placeholder="Buscar subfiltros..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              
              {/* Lista de subfiltros */}
              <div className="max-h-96 overflow-y-auto space-y-1">
                {filteredSubFilters.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="bg-gray-100 dark:bg-gray-800 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                      <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary text-xl">filter_alt</span>
                    </div>
                    <h4 className="font-medium text-text-light-secondary dark:text-text-dark-secondary mb-2">Nenhum subfiltro disponível</h4>
                    <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary leading-relaxed">
                      Selecione ao menos um filtro nas categorias ao lado<br />
                      ou use a busca para encontrar subfiltros específicos
                    </p>
                  </div>
                ) : (
                  filteredSubFilters.map(subFilter => (
                    <SubFilterTreeNode
                      key={subFilter.id}
                      subFilter={subFilter}
                      level={0}
                    />
                  ))
                )}
              </div>
            </div>
            
            {/* Selected Filters Summary */}
            <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-6 shadow-sm border border-border-light dark:border-border-dark">
              <h3 className="font-bold text-text-light-primary dark:text-text-dark-primary mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined">label</span>
                Filtros Selecionados
              </h3>
              
              <div className="space-y-4">
                {/* Institucionais */}
                {selectedFilterIds.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-2">Institucionais:</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedFilterIds.map(id => (
                        <FilterChip
                          key={id}
                          name={getFilterNameById(id)}
                          color="blue"
                          onRemove={() => setSelectedFilterIds(prev => prev.filter(fId => fId !== id))}
                        />
                      ))}
                    </div>
                  </div>
                )}
      
                {/* Educacionais */}
                {selectedEducational.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-2">Educacionais:</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedEducational.map(id => (
                        <FilterChip
                          key={id}
                          name={getFilterNameById(id)}
                          color="green"
                          onRemove={() => setSelectedEducational(prev => prev.filter(fId => fId !== id))}
                        />
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Médicos */}
                {selectedMedicalSpecialty.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-2">Especialidades:</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedMedicalSpecialty.map(id => (
                        <FilterChip
                          key={id}
                          name={getFilterNameById(id)}
                          color="purple"
                          onRemove={() => setSelectedMedicalSpecialty(prev => prev.filter(fId => fId !== id))}
                        />
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Subfiltros */}
                {selectedSubFilterIds.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-2">Subfiltros:</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedSubFilterIds.map(id => (
                        <FilterChip
                          key={id}
                          name={getFilterNameById(id)}
                          color="orange"
                          onRemove={() => setSelectedSubFilterIds(prev => prev.filter(fId => fId !== id))}
                        />
                      ))}
                    </div>
                  </div>
                )}
                
                {selectedFilterIds.length === 0 && selectedEducational.length === 0 && 
                 selectedMedicalSpecialty.length === 0 && selectedSubFilterIds.length === 0 && (
                  <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary italic">Nenhum filtro selecionado</p>
                )}
              </div>
            </div>

            {/* Resumo da Questão */}
            <QuestionSummary questionData={questionData} />

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-red-600 dark:text-red-400">error</span>
                  <span className="text-red-700 dark:text-red-300 font-medium">Erro:</span>
                  <span className="text-red-600 dark:text-red-400">{error}</span>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button 
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full flex items-center justify-center gap-3 py-4 bg-gradient-to-r from-primary to-primary/80 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                  Criando Questão...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">check_circle</span>
                  Finalizar e Criar Questão
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export { QuestionFiltersStep };
