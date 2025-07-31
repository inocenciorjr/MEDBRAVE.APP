import React, { useEffect, useState } from "react";
import {
  createFilter,
  updateFilter,
  deleteFilter,
  createSubFilter,
  updateSubFilter,
  deleteSubFilter,
  updateFilterIdAndReferences,
} from "../../services/firebaseFilterService";
import { getAllFiltersAndSubFiltersOptimized } from "../../services/optimizedFilterService";
import type { Filter, SubFilter } from "../../services/firebaseFilterService";

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Ativo" },
  { value: "INACTIVE", label: "Inativo" },
];

const CATEGORY_OPTIONS = [
  { value: "INSTITUTIONAL", label: "Institucional" },
  { value: "EDUCATIONAL", label: "Educacional" },
  { value: "MEDICAL_SPECIALTY", label: "Especialidade Médica" },
];

// Componente para estatísticas
const StatsCard: React.FC<{ title: string; value: number; icon: string; color: string }> = ({ title, value, icon, color }) => (
  <div className={`bg-gradient-to-br ${color} rounded-xl p-6 text-white shadow-lg`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-white/80 text-sm font-medium">{title}</p>
        <p className="text-3xl font-bold mt-1">{value}</p>
      </div>
      <div className="bg-white/20 rounded-lg p-3">
        <i className={`${icon} text-2xl`}></i>
      </div>
    </div>
  </div>
);

// Componente para chip de status
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const colors = {
    ACTIVE: 'bg-green-100 text-green-800 border-green-200',
    INACTIVE: 'bg-red-100 text-red-800 border-red-200'
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${colors[status as keyof typeof colors] || colors.ACTIVE}`}>
      {status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
    </span>
  );
};

// Componente para chip de categoria
const CategoryBadge: React.FC<{ category: string }> = ({ category }) => {
  const colors = {
    INSTITUTIONAL: 'bg-blue-100 text-blue-800',
    EDUCATIONAL: 'bg-green-100 text-green-800',
    MEDICAL_SPECIALTY: 'bg-purple-100 text-purple-800'
  };
  const label = CATEGORY_OPTIONS.find(c => c.value === category)?.label || category;
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[category as keyof typeof colors] || colors.INSTITUTIONAL}`}>
      {label}
    </span>
  );
};

// Componente para contador de subfilters
const SubFilterCounter: React.FC<{ count: number }> = ({ count }) => {
  if (count === 0) {
    return (
      <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
        <i className="fas fa-tags text-xs mr-1"></i>
        0 subfilters
      </span>
    );
  }
  
  return (
    <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
      <i className="fas fa-tags text-xs mr-1"></i>
      {count} subfilter{count > 1 ? 's' : ''}
    </span>
  );
};

// Componente para card de filtro
const FilterCard: React.FC<{
  filter: Filter;
  level: number;
  expanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onCreateSubFilter: () => void;
  children?: React.ReactNode;
  subFilterCount?: number; // Novo prop para contar subfilters
}> = ({ filter, level, expanded, onToggleExpand, onEdit, onDelete, onCreateSubFilter, children, subFilterCount = 0 }) => {
  const hasChildren = filter.children && filter.children.length > 0;
  
  return (
    <div className="mb-4" style={{ marginLeft: level > 0 ? `${level * 1.5}rem` : '0' }}>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {hasChildren && (
              <button
                onClick={onToggleExpand}
                className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <i className={`fas fa-chevron-${expanded ? 'down' : 'right'} text-gray-600`}></i>
              </button>
            )}
            <div className="bg-blue-50 rounded-lg p-2">
              <i className="fas fa-filter text-blue-600"></i>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{filter.name}</h3>
              {filter.description && (
                <p className="text-sm text-gray-500 mt-1">{filter.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SubFilterCounter count={subFilterCount} />
            <StatusBadge status={filter.status || 'ACTIVE'} />
            {filter.category && <CategoryBadge category={filter.category} />}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
          <button
            onClick={onCreateSubFilter}
            className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
          >
            <i className="fas fa-plus text-xs"></i>
            Subfiltro
          </button>
          <button
            onClick={onEdit}
            className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
          >
            <i className="fas fa-edit text-xs"></i>
            Editar
          </button>
          <button
            onClick={onDelete}
            className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
          >
            <i className="fas fa-trash text-xs"></i>
            Excluir
          </button>
        </div>
      </div>
      
      {/* Children */}
      {hasChildren && expanded && (
        <div className="mt-4 pl-6 border-l-2 border-gray-200">
          {children}
        </div>
      )}
    </div>
  );
};

// Componente para card de subfiltro
const SubFilterCard: React.FC<{
  subFilter: SubFilter;
  level: number;
  expanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onCreateSubFilter: () => void;
  children?: React.ReactNode;
  subFilterCount?: number; // Contador de subfilters aninhados
}> = ({ subFilter, level, expanded, onToggleExpand, onEdit, onDelete, onCreateSubFilter, children, subFilterCount = 0 }) => {
  const hasChildren = subFilter.children && subFilter.children.length > 0;
  
  return (
    <div className="mb-3">
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200 hover:shadow-sm transition-all">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {hasChildren && (
              <button
                onClick={onToggleExpand}
                className="w-6 h-6 flex items-center justify-center bg-white rounded hover:bg-gray-50 transition-colors"
              >
                <i className={`fas fa-chevron-${expanded ? 'down' : 'right'} text-gray-500 text-xs`}></i>
              </button>
            )}
            <div className="bg-orange-100 rounded p-2">
              <i className="fas fa-tag text-orange-600 text-sm"></i>
            </div>
            <div>
              <h4 className="font-medium text-gray-800">{subFilter.name}</h4>
              {subFilter.description && (
                <p className="text-xs text-gray-600 mt-1">{subFilter.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {subFilterCount > 0 && <SubFilterCounter count={subFilterCount} />}
            <StatusBadge status={subFilter.status || 'ACTIVE'} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onCreateSubFilter}
            className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium hover:bg-green-200 transition-colors"
          >
            <i className="fas fa-plus text-xs"></i>
            Sub
          </button>
          <button
            onClick={onEdit}
            className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium hover:bg-blue-200 transition-colors"
          >
            <i className="fas fa-edit text-xs"></i>
            Editar
          </button>
          <button
            onClick={onDelete}
            className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium hover:bg-red-200 transition-colors"
          >
            <i className="fas fa-trash text-xs"></i>
            Excluir
          </button>
        </div>
      </div>
      
      {/* Children */}
      {hasChildren && expanded && (
        <div className="mt-3 pl-4 border-l border-gray-300">
          {children}
        </div>
      )}
    </div>
  );
};

const AdminFiltersPage: React.FC = () => {
  const [filters, setFilters] = useState<Filter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [currentFilter, setCurrentFilter] = useState<Partial<Filter & SubFilter> | null>(null);
  const [parentForNew, setParentForNew] = useState<string | undefined>(undefined);
  const [parentType, setParentType] = useState<'filter' | 'subfilter' | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Função para contar todos os subfilters recursivamente
  function countAllSubFilters(filter: Filter): number {
    if (!filter.children || filter.children.length === 0) return 0;
    
    let count = filter.children.length;
    filter.children.forEach(subFilter => {
      count += countSubFiltersRecursive(subFilter);
    });
    
    return count;
  }

  function countSubFiltersRecursive(subFilter: SubFilter): number {
    if (!subFilter.children || subFilter.children.length === 0) return 0;
    
    let count = subFilter.children.length;
    subFilter.children.forEach(child => {
      count += countSubFiltersRecursive(child);
    });
    
    return count;
  }

  useEffect(() => {
    fetchFilters();
  }, []);

  async function fetchFilters() {
    setLoading(true);
    setError(null);
    try {
      const tree = await getAllFiltersAndSubFiltersOptimized();
      setFilters(tree);
    } catch (e: any) {
      setError(e.message);
      setFilters([]);
    } finally {
      setLoading(false);
    }
  }

  function filterTree(tree: Filter[], search: string): Filter[] {
    if (!search) return sortNodes(tree);
    const match = (f: { name: string; description?: string }) => 
      f.name.toLowerCase().includes(search.toLowerCase()) || 
      (f.description?.toLowerCase().includes(search.toLowerCase()));
    
    function filterNode(node: Filter): Filter | null {
      if (match(node)) return node;
      const filteredChildren = (node.children || []).map(filterNodeSub).filter(Boolean) as SubFilter[];
      if (filteredChildren.length > 0) return { ...node, children: sortNodes(filteredChildren) };
      return null;
    }
    
    function filterNodeSub(node: SubFilter): SubFilter | null {
      if (match(node)) return node;
      const filteredChildren = (node.children || []).map(filterNodeSub).filter(Boolean) as SubFilter[];
      if (filteredChildren.length > 0) return { ...node, children: sortNodes(filteredChildren) };
      return null;
    }
    
    return sortNodes(tree.map(filterNode).filter(Boolean) as Filter[]);
  }

  function handleExpand(id: string) {
    setExpanded(prev => prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]);
  }

  function openCreateModal(parentId?: string, parentType?: 'filter' | 'subfilter') {
    setModalMode('create');
    setCurrentFilter({ status: 'ACTIVE', category: '', parentId });
    setParentForNew(parentId);
    setParentType(parentType);
    setShowModal(true);
  }

  function openEditModal(filter: Filter | SubFilter, isSubFilter: boolean) {
    setModalMode('edit');
    setCurrentFilter({ ...filter });
    setParentType(isSubFilter ? 'subfilter' : 'filter');
    setShowModal(true);
  }

  function removeUndefinedFields<T extends object>(obj: T): T {
    return Object.fromEntries(
      Object.entries(obj).filter(([_, v]) => v !== undefined)
    ) as T;
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      if (modalMode === 'create') {
        if (parentForNew && parentType) {
          let subfilter: Omit<SubFilter, 'createdAt' | 'updatedAt' | 'children'> = {
            id: currentFilter?.name || '',
            filterId: parentType === 'filter' ? parentForNew : (currentFilter?.filterId as string),
            parentId: parentType === 'subfilter' ? parentForNew : undefined,
            name: currentFilter?.name || '',
            description: currentFilter?.description,
            order: currentFilter?.order || 0,
            isActive: currentFilter?.status === 'ACTIVE',
            status: currentFilter?.status || 'ACTIVE',
          };
          subfilter = removeUndefinedFields(subfilter);
          await createSubFilter(subfilter);
          setSuccessMsg("Subfiltro criado com sucesso!");
        } else {
          let filter: Omit<Filter, 'createdAt' | 'updatedAt' | 'children'> = {
            id: currentFilter?.name || '',
            name: currentFilter?.name || '',
            description: currentFilter?.description,
            category: currentFilter?.category || '',
            status: currentFilter?.status || 'ACTIVE',
            isGlobal: false,
            filterType: 'CONTENT',
          };
          filter = removeUndefinedFields(filter);
          await createFilter(filter);
          setSuccessMsg("Filtro criado com sucesso!");
        }
      } else if (modalMode === 'edit' && currentFilter?.id) {
        if (parentType === 'subfilter') {
          await updateSubFilter(currentFilter as SubFilter);
          setSuccessMsg("Subfiltro atualizado com sucesso!");
        } else {
          const oldFilter = filters.find(f => f.id === currentFilter.id);
          const newName = currentFilter.name || '';
          const newId = newName;
          if (oldFilter && oldFilter.id !== newId) {
            await updateFilterIdAndReferences(oldFilter, newName, newId);
            setSuccessMsg("Filtro e subfiltros atualizados com sucesso!");
          } else {
            await updateFilter(currentFilter as Filter);
            setSuccessMsg("Filtro atualizado com sucesso!");
          }
        }
      }
      setShowModal(false);
      await fetchFilters();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(filter: Filter | SubFilter, isSubFilter: boolean) {
    if (!window.confirm(`Tem certeza que deseja excluir "${filter.name}"?`)) return;
    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      if (isSubFilter) {
        await deleteSubFilter(filter.id);
        setSuccessMsg("Subfiltro excluído com sucesso!");
      } else {
        await deleteFilter(filter.id);
        setSuccessMsg("Filtro excluído com sucesso!");
      }
      await fetchFilters();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  // Função para ordenar filtros/subfiltros
  function sortNodes<T extends { name: string }>(nodes: T[]): T[] {
    return [...nodes].sort((a, b) => {
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();
      
      // Verificar se são números
      const numA = parseFloat(nameA);
      const numB = parseFloat(nameB);
      
      // Se ambos são números válidos, ordenar em ordem decrescente
      if (!isNaN(numA) && !isNaN(numB)) {
        return numB - numA;
      }
      
      // Se apenas um é número, o número vem primeiro
      if (!isNaN(numA) && isNaN(numB)) {
        return -1;
      }
      if (isNaN(numA) && !isNaN(numB)) {
        return 1;
      }
      
      // Se ambos são texto, ordenar alfabeticamente
      return nameA.localeCompare(nameB, 'pt-BR', { numeric: true });
    });
  }

  function renderSubTree(nodes: SubFilter[], level = 0) {
    const sortedNodes = sortNodes(nodes);
    return sortedNodes.map(node => (
      <SubFilterCard
        key={node.id}
        subFilter={node}
        level={level}
        expanded={expanded.includes(node.id)}
        onToggleExpand={() => handleExpand(node.id)}
        onEdit={() => openEditModal(node, true)}
        onDelete={() => handleDelete(node, true)}
        onCreateSubFilter={() => openCreateModal(node.id, 'subfilter')}
        subFilterCount={countSubFiltersRecursive(node)}
      >
        {node.children && node.children.length > 0 && expanded.includes(node.id) && 
          renderSubTree(node.children, level + 1)
        }
      </SubFilterCard>
    ));
  }

  function renderTree(nodes: Filter[], level = 0) {
    const sortedNodes = sortNodes(nodes);
    return sortedNodes.map(node => (
      <FilterCard
        key={node.id}
        filter={node}
        level={level}
        expanded={expanded.includes(node.id)}
        onToggleExpand={() => handleExpand(node.id)}
        onEdit={() => openEditModal(node, false)}
        onDelete={() => handleDelete(node, false)}
        onCreateSubFilter={() => openCreateModal(node.id, 'filter')}
        subFilterCount={countAllSubFilters(node)}
      >
        {node.children && node.children.length > 0 && expanded.includes(node.id) && 
          renderSubTree(node.children, level + 1)
        }
      </FilterCard>
    ));
  }

  const filteredTree = filterTree(filters, search);
  
  // Calcular estatísticas
  const totalFilters = filters.length;
  const totalSubFilters = filters.reduce((acc, filter) => {
    const countSubFilters = (subFilters: SubFilter[]): number => {
      return subFilters.reduce((count, sub) => {
        return count + 1 + (sub.children ? countSubFilters(sub.children) : 0);
      }, 0);
    };
    return acc + (filter.children ? countSubFilters(filter.children) : 0);
  }, 0);
  const activeFilters = filters.filter(f => f.status === 'ACTIVE').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-blue-600 rounded-xl p-3">
              <i className="fas fa-filter text-white text-2xl"></i>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Gestão de Filtros</h1>
              <p className="text-gray-600">Organize e gerencie filtros e subfiltros do sistema</p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <StatsCard
              title="Total de Filtros"
              value={totalFilters}
              icon="fas fa-filter"
              color="from-blue-500 to-blue-600"
            />
            <StatsCard
              title="Subfiltros"
              value={totalSubFilters}
              icon="fas fa-tags"
              color="from-green-500 to-green-600"
            />
            <StatsCard
              title="Filtros Ativos"
              value={activeFilters}
              icon="fas fa-check-circle"
              color="from-purple-500 to-purple-600"
            />
          </div>

          {/* Search and Actions */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex items-center gap-4 flex-1">
                <div className="relative flex-1 max-w-md">
                  <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                  <input
                    type="text"
                    placeholder="Buscar filtros e subfiltros..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <button 
                onClick={() => openCreateModal()}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all"
              >
                <i className="fas fa-plus"></i>
                Novo Filtro
              </button>
            </div>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center gap-2">
              <i className="fas fa-exclamation-triangle text-red-600"></i>
              <span className="text-red-700 font-medium">Erro:</span>
              <span className="text-red-600">{error}</span>
            </div>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center gap-2">
              <i className="fas fa-check-circle text-green-600"></i>
              <span className="text-green-700 font-medium">Sucesso:</span>
              <span className="text-green-600">{successMsg}</span>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="space-y-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Carregando filtros...</p>
              </div>
            </div>
          )}

          {!loading && filteredTree.length === 0 && (
            <div className="text-center py-12">
              <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-filter text-gray-400 text-2xl"></i>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum filtro encontrado</h3>
              <p className="text-gray-500 mb-6">
                {search ? `Nenhum filtro corresponde à busca "${search}"` : "Não há filtros cadastrados ainda"}
              </p>
              {!search && (
                <button 
                  onClick={() => openCreateModal()}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg mx-auto hover:bg-blue-700 transition-colors"
                >
                  <i className="fas fa-plus"></i>
                  Criar Primeiro Filtro
                </button>
              )}
            </div>
          )}

          {!loading && filteredTree.length > 0 && (
            <div className="space-y-4">
              {renderTree(filteredTree)}
            </div>
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 rounded-lg p-2">
                    <i className="fas fa-filter text-blue-600"></i>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {modalMode === 'create' ? 
                      (parentForNew ? 'Novo Subfiltro' : 'Novo Filtro') : 
                      'Editar Filtro'
                    }
                  </h2>
                </div>
              </div>

              <form onSubmit={handleSave} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome *
                  </label>
                  <input
                    type="text"
                    required
                    value={currentFilter?.name || ''}
                    onChange={e => setCurrentFilter({ ...currentFilter, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Nome do filtro"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descrição
                  </label>
                  <textarea
                    value={currentFilter?.description || ''}
                    onChange={e => setCurrentFilter({ ...currentFilter, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Descrição opcional"
                    rows={3}
                  />
                </div>

                {(!parentForNew || parentType === undefined) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Categoria *
                    </label>
                    <select
                      required
                      value={currentFilter?.category || ''}
                      onChange={e => setCurrentFilter({ ...currentFilter, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Selecione a categoria</option>
                      {CATEGORY_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status *
                  </label>
                  <select
                    required
                    value={currentFilter?.status || 'ACTIVE'}
                    onChange={e => setCurrentFilter({ ...currentFilter, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {STATUS_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    disabled={saving}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Salvando...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-save"></i>
                        Salvar
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminFiltersPage;