'use client';

import React, { useState, useEffect } from 'react';
import { getAllFilters } from '@/services/admin/filterService';
import type { Filter, SubFilter } from '@/types/admin/filter';

interface FilterNode {
  id: string;
  name: string;
  level: number;
  parentId: string | null;
  children: FilterNode[];
  type: 'filter' | 'subfilter';
}

interface FilterTreePanelProps {
  isOpen: boolean;
  onClose: () => void;
  selectedFilterIds: string[];
  selectedSubFilterIds: string[];
  onAddFilter: (filterId: string, filterName: string) => void;
  onRemoveFilter: (filterId: string) => void;
  onAddSubFilter: (subFilterId: string, subFilterName: string, parentPath: string[]) => void;
  onRemoveSubFilter: (subFilterId: string) => void;
}

export const FilterTreePanel: React.FC<FilterTreePanelProps> = ({
  isOpen,
  onClose,
  selectedFilterIds,
  selectedSubFilterIds,
  onAddFilter,
  onRemoveFilter,
  onAddSubFilter,
  onRemoveSubFilter,
}) => {
  const [filterTree, setFilterTree] = useState<FilterNode[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadFilters();
    }
  }, [isOpen]);

  const loadFilters = async () => {
    try {
      setLoading(true);
      const filters = await getAllFilters();
      const tree = buildFilterTree(filters);
      setFilterTree(tree);
    } catch (error) {
      console.error('Erro ao carregar filtros:', error);
    } finally {
      setLoading(false);
    }
  };

  const buildFilterTree = (filters: Filter[]): FilterNode[] => {
    const nodeMap: { [key: string]: FilterNode } = {};
    const tree: FilterNode[] = [];

    // Criar nós para filtros principais
    filters.forEach(filter => {
      const node: FilterNode = {
        id: filter.id,
        name: filter.name,
        level: 0,
        parentId: null,
        children: [],
        type: 'filter',
      };
      nodeMap[filter.id] = node;
      tree.push(node);

      // Adicionar subfiltros
      if (filter.children && filter.children.length > 0) {
        console.log(`[FilterTreePanel] Filtro ${filter.name} tem ${filter.children.length} children, primeiro:`, {
          id: filter.children[0].id,
          name: filter.children[0].name,
          hasChildren: filter.children[0].children && filter.children[0].children.length > 0
        });
        addSubFilters(filter.children, node, nodeMap, 1);
      }
    });

    // Log detalhado de Clínica Médica para debug
    const clinicaMedica = tree.find(n => n.name === 'Clínica Médica');
    if (clinicaMedica) {
      console.log('[FilterTreePanel] Clínica Médica detalhada:', {
        childrenCount: clinicaMedica.children.length,
        children: clinicaMedica.children.map(c => ({
          id: c.id,
          name: c.name,
          childrenCount: c.children?.length || 0,
          hasChildrenArray: Array.isArray(c.children),
          childrenIsEmpty: c.children?.length === 0
        }))
      });
    }

    return tree;
  };

  const addSubFilters = (
    subFilters: SubFilter[],
    parentNode: FilterNode,
    nodeMap: { [key: string]: FilterNode },
    level: number
  ) => {
    subFilters.forEach(subFilter => {
      const node: FilterNode = {
        id: subFilter.id,
        name: subFilter.name,
        level,
        parentId: parentNode.id,
        children: [],
        type: 'subfilter',
      };
      nodeMap[subFilter.id] = node;
      parentNode.children.push(node);

      // Recursivamente adicionar sub-subfiltros
      if (subFilter.children && subFilter.children.length > 0) {
        console.log(`[FilterTreePanel] Subfiltro ${subFilter.name} (level ${level}) tem ${subFilter.children.length} children, adicionando recursivamente...`);
        addSubFilters(subFilter.children, node, nodeMap, level + 1);
        console.log(`[FilterTreePanel] Após adicionar, node ${node.name} tem ${node.children.length} children`);
      }
    });
  };

  const toggleNode = (nodeId: string) => {
    // Desabilitar scroll restoration do navegador temporariamente
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    
    // Salvar posição atual do scroll
    const scrollPosition = window.scrollY;
    
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
    
    // Forçar manutenção da posição em múltiplos momentos
    const maintainPosition = () => {
      window.scrollTo({ top: scrollPosition, left: 0, behavior: 'instant' });
    };
    
    maintainPosition();
    requestAnimationFrame(maintainPosition);
    setTimeout(maintainPosition, 0);
    setTimeout(maintainPosition, 10);
    setTimeout(maintainPosition, 50);
    setTimeout(maintainPosition, 100);
    
    // Reabilitar scroll restoration após 200ms
    setTimeout(() => {
      if ('scrollRestoration' in window.history) {
        window.history.scrollRestoration = 'auto';
      }
    }, 200);
  };

  // Memoizar o componente FilterTreeNode para evitar re-renders desnecessários
  const FilterTreeNode = React.memo<{ node: FilterNode; level: number; path: string[] }>(({
    node,
    level,
    path,
  }) => {
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id);
    const selected = isSelected(node);
    const currentPath = [...path, node.name];

    return (
      <div className="select-none">
        <div
          className={`flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer ${
            selected ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-600' : ''
          }`}
          style={{ paddingLeft: `${level * 1.5 + 0.75}rem` }}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleNode(node.id);
              }}
              className="flex-shrink-0 w-5 h-5 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
            >
              {isExpanded ? (
                <span className="material-symbols-outlined text-gray-600 dark:text-gray-400 text-base">expand_more</span>
              ) : (
                <span className="material-symbols-outlined text-gray-600 dark:text-gray-400 text-base">chevron_right</span>
              )}
            </button>
          )}
          {!hasChildren && <div className="w-5" />}

          <div
            className="flex-1 flex items-center justify-between"
            onClick={() => handleToggleSelection(node, currentPath)}
          >
            <span
              className={`text-sm ${
                selected
                  ? 'font-semibold text-blue-700 dark:text-blue-300'
                  : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              {node.type === 'filter' ? '🏷️' : '🔖'} {node.name}
            </span>

            {selected ? (
              <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-base">close</span>
            ) : (
              <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-base">add</span>
            )}
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div>
            {node.children.map(child => (
              <FilterTreeNode key={child.id} node={child} level={level + 1} path={currentPath} />
            ))}
          </div>
        )}
      </div>
    );
  });

  const isSelected = (node: FilterNode) => {
    if (node.type === 'filter') {
      return selectedFilterIds.includes(node.id);
    } else {
      return selectedSubFilterIds.includes(node.id);
    }
  };

  const handleToggleSelection = (node: FilterNode, path: string[]) => {
    const selected = isSelected(node);

    if (node.type === 'filter') {
      if (selected) {
        onRemoveFilter(node.id);
      } else {
        onAddFilter(node.id, node.name);
      }
    } else {
      if (selected) {
        onRemoveSubFilter(node.id);
      } else {
        onAddSubFilter(node.id, node.name, path);
      }
    }
  };

  const filterNodes = (nodes: FilterNode[], search: string): FilterNode[] => {
    if (!search) return nodes;

    const filtered: FilterNode[] = [];
    const searchLower = search.toLowerCase();

    for (const node of nodes) {
      const matches = node.name.toLowerCase().includes(searchLower);
      const filteredChildren = filterNodes(node.children, search);

      if (matches || filteredChildren.length > 0) {
        filtered.push({
          ...node,
          children: filteredChildren,
        });

        // Auto-expandir nós que têm matches
        if (filteredChildren.length > 0) {
          setExpandedNodes(prev => new Set([...prev, node.id]));
        }
      }
    }

    return filtered;
  };

  if (!isOpen) return null;

  const filteredTree = filterNodes(filterTree, searchTerm);

  return (
    <div className="bg-white dark:bg-gray-800 border-2 border-purple-500 dark:border-purple-600 rounded-xl shadow-xl mb-6 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            🏷️ Filtros Hierárquicos
          </h3>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg p-1 transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base">search</span>
          <input
            type="text"
            placeholder="Buscar filtros..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/30"
          />
        </div>
      </div>

      {/* Tree */}
      <div className="p-4 max-h-96 overflow-y-auto">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Carregando filtros...</p>
          </div>
        ) : filteredTree.length > 0 ? (
          <div className="space-y-1">
            {filteredTree.map(node => (
              <FilterTreeNode key={node.id} node={node} level={0} path={[]} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {searchTerm ? 'Nenhum filtro encontrado' : 'Nenhum filtro disponível'}
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-gray-50 dark:bg-gray-700/50 p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">
            {selectedFilterIds.length} filtros, {selectedSubFilterIds.length} subfiltros selecionados
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
