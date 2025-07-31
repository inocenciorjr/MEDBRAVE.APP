import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNewQuestion } from './NewQuestionContext';
import type { Filter as FilterType, SubFilter as SubFilterType } from '../../../services/firebaseFilterService';
import { createQuestion } from '../../../services/firebaseQuestionService';
import { getAllFiltersAndSubFiltersOptimized } from '../../../services/optimizedFilterService';

type Filter = FilterType & { children?: SubFilter[] };
type SubFilter = SubFilterType & { children?: SubFilter[] };

// Componente de resumo da questão
const QuestionSummary: React.FC<{ questionData: any }> = ({ questionData }) => {
  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl p-6 border border-blue-200">
      <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
        <i className="fas fa-file-alt"></i>
        Resumo da Questão
      </h3>
      
      <div className="space-y-4">
        {/* Statement Preview */}
        <div>
          <p className="text-sm font-medium text-blue-800 mb-1">Enunciado:</p>
          <p className="text-sm text-blue-700 bg-white/50 rounded-lg p-3 line-clamp-3">
            {questionData.statement || 'Sem enunciado'}
          </p>
        </div>

        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/50 rounded-lg p-3">
            <p className="text-xs font-medium text-blue-800">Tipo</p>
            <p className="text-sm text-blue-900 font-semibold capitalize">{questionData.type}</p>
          </div>
          <div className="bg-white/50 rounded-lg p-3">
            <p className="text-xs font-medium text-blue-800">Status</p>
            <p className="text-sm text-blue-900 font-semibold">{questionData.status}</p>
          </div>
          <div className="bg-white/50 rounded-lg p-3">
            <p className="text-xs font-medium text-blue-800">Dificuldade</p>
            <p className="text-sm text-blue-900 font-semibold">{questionData.difficulty}</p>
          </div>
          <div className="bg-white/50 rounded-lg p-3">
            <p className="text-xs font-medium text-blue-800">Alternativas</p>
            <p className="text-sm text-blue-900 font-semibold">{questionData.alternatives?.length || 0}</p>
          </div>
        </div>

        {/* Tags */}
        {questionData.tags && questionData.tags.length > 0 && (
          <div>
            <p className="text-sm font-medium text-blue-800 mb-2">Tags:</p>
            <div className="flex flex-wrap gap-1">
              {questionData.tags.map((tag: string, idx: number) => (
                <span key={idx} className="bg-blue-200 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Special Flags */}
        <div className="flex gap-2">
          {questionData.isAnnulled && (
            <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
              <i className="fas fa-ban text-xs"></i>
              Anulada
            </span>
          )}
          {questionData.isOutdated && (
            <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
              <i className="fas fa-clock text-xs"></i>
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
    blue: 'bg-blue-100 text-blue-800 border-blue-200',
    green: 'bg-green-100 text-green-800 border-green-200',
    purple: 'bg-purple-100 text-purple-800 border-purple-200',
    orange: 'bg-orange-100 text-orange-800 border-orange-200'
  };

  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border ${colorClasses[color]} transition-all hover:shadow-sm`}>
      {name}
      <button
        onClick={onRemove}
        className="w-4 h-4 rounded-full bg-current opacity-20 hover:opacity-40 flex items-center justify-center transition-opacity"
      >
        <i className="fas fa-times text-xs"></i>
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
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center`}>
          <i className={`${icon} text-white text-lg`}></i>
        </div>
        <div>
          <h3 className="font-bold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500">{filters.length} filtros disponíveis</p>
        </div>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        )}
        
        {!loading && filters.length === 0 && (
          <p className="text-sm text-gray-500 italic py-4 text-center">
            {emptyMessage || 'Nenhum filtro disponível'}
          </p>
        )}
        
        {!loading && filters.map((filter) => (
          <label
            key={filter.id}
            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all border-2 ${
              selectedIds.includes(filter.id)
                ? 'bg-blue-50 border-blue-200 shadow-sm'
                : 'bg-gray-50 border-transparent hover:bg-gray-100'
            }`}
          >
            <input
              type="checkbox"
              checked={selectedIds.includes(filter.id)}
              onChange={() => onToggle(filter.id)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className={`text-sm font-medium ${selectedIds.includes(filter.id) ? 'text-blue-900' : 'text-gray-700'}`}>
              {filter.name}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
};

// Componente principal
const QuestionFiltersStep: React.FC = () => {
  const navigate = useNavigate();
  const { questionData, setQuestionData, resetQuestion } = useNewQuestion();
  
  // Debug: verificar dados do contexto ao montar o componente
  useEffect(() => {
    console.log('🔍 QuestionFiltersStep - Dados do contexto ao montar:', JSON.stringify(questionData, null, 2));
    console.log('🔍 QuestionFiltersStep - Statement:', questionData.statement);
    console.log('🔍 QuestionFiltersStep - Statement length:', questionData.statement?.length);
    console.log('🔍 QuestionFiltersStep - Alternatives:', questionData.alternatives?.length);
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
        const allFilters = await getAllFiltersAndSubFiltersOptimized();
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
      // Buscar em todas as categorias
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
      };
      
      console.log('📤 Enviando questão:', JSON.stringify(questionToSave, null, 2));
      const result = await createQuestion(questionToSave);
      console.log('✅ Questão criada com sucesso:', result);
      
      resetQuestion();
      navigate('/admin/questions');
      
      // Toast notification
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
      toast.innerHTML = `
        <div class="flex items-center gap-2">
          <i class="fas fa-check-circle"></i>
          <span>Questão criada com sucesso!</span>
        </div>
      `;
      document.body.appendChild(toast);
      setTimeout(() => document.body.removeChild(toast), 3000);
      
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
          isSelected ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-gray-50 border-transparent hover:bg-gray-100'
        }`} style={{ marginLeft: `${level * 20}px` }}>
          {hasChildren && (
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); toggleExpand(subFilter.id); }}
              className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors"
            >
              <i className={`fas fa-chevron-${isExpanded ? 'down' : 'right'} text-xs`}></i>
            </button>
          )}
          {!hasChildren && <div className="w-6"></div>}
          
          <label className="flex items-center gap-3 cursor-pointer flex-1">
          <input
            type="checkbox"
              checked={isSelected}
              onChange={() => toggleSubFilter(subFilter.id)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className={`text-sm ${isSelected ? 'font-medium text-blue-900' : 'text-gray-700'} flex-1`}>
            {subFilter.name}
          </span>
            {hasChildren && (
              <span className="text-xs text-gray-400 bg-gray-200 px-2 py-1 rounded">
                {subFilter.children!.length}
              </span>
            )}
          </label>
        </div>
        
        {hasChildren && isExpanded && (
          <div className="ml-3 border-l-2 border-gray-200 pl-3 mt-1">
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Filtros da Questão</h1>
              <p className="text-gray-600 mt-1">Selecione os filtros e subfiltros para categorizar a questão</p>
        </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/admin/questions/create')}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <i className="fas fa-arrow-left"></i>
                Voltar
              </button>
              <button
                onClick={resetFilters}
                className="flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors"
              >
                <i className="fas fa-trash"></i>
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
              icon="fas fa-university"
              color="bg-blue-500"
              filters={filterIdsList}
              selectedIds={selectedFilterIds}
              onToggle={toggleInstitutionalFilter}
              loading={loading}
              emptyMessage="Nenhum filtro institucional disponível"
            />
            
            <FilterSection
              title="Filtros Educacionais"
              icon="fas fa-graduation-cap"
              color="bg-green-500"
              filters={educationalFilters}
              selectedIds={selectedEducational}
              onToggle={toggleEducationalFilter}
              loading={loading}
              emptyMessage="Nenhum filtro educacional disponível"
            />
            
            <FilterSection
              title="Especialidades Médicas"
              icon="fas fa-stethoscope"
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
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-indigo-500 flex items-center justify-center">
                  <i className="fas fa-filter text-white text-lg"></i>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Subfiltros</h3>
                  <p className="text-sm text-gray-500">
                    {(() => {
                      const hasSelectedFilters = selectedFilterIds.length > 0 || selectedEducational.length > 0 || selectedMedicalSpecialty.length > 0;
                      const hasSearch = searchQuery.trim().length > 0;
                      
                      if (!hasSelectedFilters && !hasSearch) {
                        return "Selecione filtros ou pesquise para ver subfiltros";
                      }
                      
                      if (hasSearch && !hasSelectedFilters) {
                        // Buscar em todos os subfiltros disponíveis
                        const allFilters = [...filterIdsList, ...educationalFilters, ...medicalSpecialtyFilters];
                        let allSubFiltersFlat: SubFilter[] = [];
                        for (const filter of allFilters) {
                          if (filter.children) {
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
                        const uniqueSubFilters = Array.from(new Map(allSubFiltersFlat.map(sf => [sf.id, sf])).values());
                        const searchResults = uniqueSubFilters.filter(sf => 
                          sf.name.toLowerCase().includes(searchQuery.toLowerCase())
                        );
                        return `${searchResults.length} resultados para "${searchQuery}"`;
                      }
                      
                      return `${filteredSubFilters.length} subfiltros disponíveis`;
                    })()}
                  </p>
                </div>
        </div>
        
        {/* Busca de subfiltros */}
        <div className="mb-4">
                <div className="relative">
                  <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
            <input
              type="text"
                    className="pl-10 pr-3 py-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Buscar subfiltros..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        {/* Lista de subfiltros */}
              <div className="max-h-96 overflow-y-auto space-y-1">
                {(() => {
                  const hasSelectedFilters = selectedFilterIds.length > 0 || selectedEducational.length > 0 || selectedMedicalSpecialty.length > 0;
                  const hasSearch = searchQuery.trim().length > 0;
                  
                  // Se não há filtros selecionados E não há busca, não mostrar nada
                  if (!hasSelectedFilters && !hasSearch) {
                    return (
                      <div className="text-center py-12">
                        <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                          <i className="fas fa-filter text-gray-400 text-xl"></i>
                        </div>
                        <h4 className="font-medium text-gray-600 mb-2">Nenhum subfiltro disponível</h4>
                        <p className="text-sm text-gray-500 leading-relaxed">
                          Selecione ao menos um filtro nas categorias ao lado<br />
                          ou use a busca para encontrar subfiltros específicos
                        </p>
                      </div>
                    );
                  }
                  
                  // Se há busca ativa mas sem filtros selecionados, buscar em todos os subfiltros
                  if (hasSearch && !hasSelectedFilters) {
                    const allFilters = [...filterIdsList, ...educationalFilters, ...medicalSpecialtyFilters];
                    let allSubFiltersFlat: SubFilter[] = [];
                    for (const filter of allFilters) {
                      if (filter.children) {
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
                    const uniqueSubFilters = Array.from(new Map(allSubFiltersFlat.map(sf => [sf.id, sf])).values());
                    const searchResults = uniqueSubFilters.filter(sf => 
                      sf.name.toLowerCase().includes(searchQuery.toLowerCase())
                    );
                    
                    if (searchResults.length === 0) {
                      return (
                        <div className="text-center py-8">
                          <div className="bg-orange-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                            <i className="fas fa-search text-orange-500"></i>
                          </div>
                          <p className="text-sm text-gray-500">
                            Nenhum subfiltro encontrado para "{searchQuery}"
                          </p>
                        </div>
                      );
                    }
                    
                    return searchResults.map(subFilter => (
                      <div key={subFilter.id} className="mb-1">
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                          <input
                            type="checkbox"
                            checked={selectedSubFilterIds.includes(subFilter.id)}
                            onChange={() => toggleSubFilter(subFilter.id)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700 flex-1">
                            {subFilter.name}
                          </span>
                          <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded">
                            Resultado da busca
                          </span>
                        </div>
                      </div>
                    ));
                  }
                  
                  // Mostrar subfiltros normalmente (com filtros selecionados)
                  if (filteredSubFilters.length === 0) {
                    return (
                      <div className="text-center py-8">
                        <div className="bg-gray-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                          <i className="fas fa-info-circle text-gray-400"></i>
                        </div>
                        <p className="text-sm text-gray-500">
                          {hasSearch ? `Nenhum subfiltro encontrado para "${searchQuery}"` : "Nenhum subfiltro disponível para os filtros selecionados"}
                        </p>
                      </div>
                    );
                  }
                  
                  return filteredSubFilters.map(subFilter => (
                    <SubFilterTreeNode
                      key={subFilter.id}
                      subFilter={subFilter}
                      level={0}
                    />
                  ));
                })()}
              </div>
        </div>
        
            {/* Selected Filters Summary */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <i className="fas fa-tags"></i>
                Filtros Selecionados
              </h3>
              
              <div className="space-y-4">
                {/* Institucionais */}
                {selectedFilterIds.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Institucionais:</p>
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
                    <p className="text-sm font-medium text-gray-700 mb-2">Educacionais:</p>
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
                    <p className="text-sm font-medium text-gray-700 mb-2">Especialidades:</p>
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
                    <p className="text-sm font-medium text-gray-700 mb-2">Subfiltros:</p>
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
                  <p className="text-sm text-gray-500 italic">Nenhum filtro selecionado</p>
                )}
              </div>
            </div>

            {/* Resumo da Questão */}
            <QuestionSummary questionData={questionData} />

            {/* Error Display */}
        {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <i className="fas fa-exclamation-triangle text-red-600"></i>
                  <span className="text-red-700 font-medium">Erro:</span>
                  <span className="text-red-600">{error}</span>
                </div>
              </div>
            )}

            {/* Submit Button */}
          <button 
            onClick={handleSubmit}
            disabled={submitting}
              className="w-full flex items-center justify-center gap-3 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                  Criando Questão...
                </>
              ) : (
                <>
                  <i className="fas fa-check-circle"></i>
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

export default QuestionFiltersStep;