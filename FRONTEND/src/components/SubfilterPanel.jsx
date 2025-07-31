import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ChevronDown, ChevronRight, Eye, Clock, BookOpen } from 'lucide-react';
import { CustomSearchIcon, CustomFilterIcon, CustomFolderIcon, CustomFolderOpenIcon, CustomHeartIcon } from '../components/CustomIcons';
import { getSubFiltersByFilterId } from '../services/subFilterService';
import { getSubFiltersForSelectedFilters } from '../services/optimizedFilterService';
import { cacheService } from '../services/cacheService';
import { CACHE_CONFIG, SUBFILTER_PANEL_CONFIG, ConfigUtils } from '../config/cacheConfig';

import { VariableSizeList as List } from 'react-window';
import '../styles/tree.css';

// ✅ CONFIGURAÇÕES CENTRALIZADAS
const CACHE_TTL = CACHE_CONFIG.TTL;
const DEBOUNCE_DELAY = CACHE_CONFIG.DEBOUNCE.FILTER_CHANGE;
const SEARCH_DEBOUNCE = CACHE_CONFIG.DEBOUNCE.SEARCH;
const VIRTUALIZATION_THRESHOLD = CACHE_CONFIG.VIRTUALIZATION.THRESHOLD;

// Debounce otimizado para evitar chamadas excessivas
const useDebounce = (value, delay = DEBOUNCE_DELAY) => {
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

// Componente TreeNode para renderizar cada nó da árvore de forma regular
const TreeNode = React.memo(({ node, level = 0, selectedItems, onToggle, expandedNodes, onExpandToggle, parentFilter, toggleSubFilterCascade, nodeRef, getAllDescendantIds }) => {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedNodes.has(node.id);
  
  // ✅ LÓGICA CORRIGIDA PARA ESTADO DO CHECKBOX - Verificar apenas filhos diretos
  const checkboxState = useMemo(() => {
    // ✅ CORREÇÃO: Para nós com filhos, verificar se o próprio nó está selecionado primeiro
    if (hasChildren && node.children && node.children.length > 0) {
      // Se o próprio nó está selecionado (filtro principal), mostrar como selecionado
      if (selectedItems.includes(node.id)) {
        return { checked: true, indeterminate: false };
      }
      
      // Caso contrário, verificar filhos
      const directChildrenIds = node.children.map(child => child.id);
      const selectedDirectChildren = directChildrenIds.filter(id => selectedItems.includes(id));
      
      if (selectedDirectChildren.length === 0) {
        // Nenhum filho direto selecionado
        return { checked: false, indeterminate: false };
      } else if (selectedDirectChildren.length === directChildrenIds.length) {
        // Todos os filhos diretos selecionados
        return { checked: true, indeterminate: false };
      } else {
        // Alguns filhos diretos selecionados - INDETERMINADO
        return { checked: false, indeterminate: true };
      }
    }
    
    // Para nós SEM filhos, verificar se está selecionado
    if (selectedItems.includes(node.id)) {
      return { checked: true, indeterminate: false };
    }
    
    return { checked: false, indeterminate: false };
  }, [selectedItems, node.id, hasChildren, node]);

  const handleExpandClick = (e) => {
    e.stopPropagation();
    if (hasChildren) {
      onExpandToggle(node.id);
    }
  };

  const handleCheckboxChange = (e) => {
    e.stopPropagation();
    if (toggleSubFilterCascade) {
      toggleSubFilterCascade(node);
    }
  };

  // ✅ REFERÊNCIA PARA DEFINIR ESTADO INDETERMINADO
  const checkboxRef = useRef(null);
  
  useEffect(() => {
    if (checkboxRef.current) {
      // Remover todas as classes personalizadas primeiro
      checkboxRef.current.classList.remove('custom-indeterminate', 'custom-checked');
      
      if (checkboxState.indeterminate) {
        // ESTADO INDETERMINADO - traço roxo
        checkboxRef.current.checked = false;
        checkboxRef.current.indeterminate = false;
        checkboxRef.current.classList.add('custom-indeterminate');
      } else if (checkboxState.checked) {
        // ESTADO SELECIONADO - check roxo
        checkboxRef.current.checked = true;
        checkboxRef.current.indeterminate = false;
        checkboxRef.current.classList.add('custom-checked');
      } else {
        // ESTADO NORMAL - sem seleção
        checkboxRef.current.checked = false;
        checkboxRef.current.indeterminate = false;
      }
    }
  }, [checkboxState.checked, checkboxState.indeterminate]);

  return (
    <div 
      className="tree-node" 
      style={{ paddingLeft: `${level * 16}px` }}
      ref={nodeRef}
    >
      <div className="tree-node-content">
        {/* Botão de expansão */}
        <button
          className="tree-expand-button"
          onClick={handleExpandClick}
          disabled={!hasChildren}
          style={{ visibility: hasChildren ? 'visible' : 'hidden' }}
        >
          {hasChildren && (
            isExpanded ? <ChevronDown /> : <ChevronRight />
          )}
        </button>

        {/* Ícone de pasta */}
        <div className="mr-2">
          {hasChildren ? (
            isExpanded ? <CustomFolderOpenIcon className="w-4 h-4" /> : <CustomFolderIcon className="w-4 h-4" />
          ) : (
            <div className="w-4 h-4" />
          )}
        </div>

        {/* Checkbox com estado indeterminado CORRIGIDO */}
        <input
          ref={checkboxRef}
          type="checkbox"
          className="tree-checkbox"
          checked={checkboxState.checked && !checkboxState.indeterminate}
          onChange={handleCheckboxChange}
        />

        {/* Label */}
        <span className="tree-label">{node.name}</span>

        {/* Contador (se disponível) */}
        {node.count && (
          <span className="tree-count">{node.count}</span>
        )}
      </div>

      {/* Filhos */}
      {hasChildren && isExpanded && (
        <div className="tree-children">
          {node.children.map(child => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              selectedItems={selectedItems}
              onToggle={onToggle}
              expandedNodes={expandedNodes}
              onExpandToggle={onExpandToggle}
              parentFilter={parentFilter}
              toggleSubFilterCascade={toggleSubFilterCascade}
              nodeRef={(el) => nodeRef && nodeRef(child.id, el)}
              getAllDescendantIds={getAllDescendantIds}
            />
          ))}
        </div>
      )}
    </div>
  );
});

// Versão otimizada para virtual rendering
const VirtualItem = React.memo(({ data, index, style }) => {
  const { 
    flattenedNodes, 
    selectedItems, 
    onToggle, 
    expandedNodes, 
    onExpandToggle,
    toggleSubFilterCascade,
    nodeRefs,
    getAllDescendantIds
  } = data;
  const node = flattenedNodes[index];

  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedNodes.has(node.id);
  
  // ✅ LÓGICA CORRIGIDA PARA ESTADO DO CHECKBOX - Verificar apenas filhos diretos
  const checkboxState = useMemo(() => {
    // ✅ CORREÇÃO: Para nós com filhos, verificar se o próprio nó está selecionado primeiro
    if (hasChildren && node.children && node.children.length > 0) {
      // Se o próprio nó está selecionado (filtro principal), mostrar como selecionado
      if (selectedItems.includes(node.id)) {
        return { checked: true, indeterminate: false };
      }
      
      // Caso contrário, verificar filhos
      const directChildrenIds = node.children.map(child => child.id);
      const selectedDirectChildren = directChildrenIds.filter(id => selectedItems.includes(id));
      
      if (selectedDirectChildren.length === 0) {
        // Nenhum filho direto selecionado
        return { checked: false, indeterminate: false };
      } else if (selectedDirectChildren.length === directChildrenIds.length) {
        // Todos os filhos diretos selecionados
        return { checked: true, indeterminate: false };
      } else {
        // Alguns filhos diretos selecionados - INDETERMINADO
        return { checked: false, indeterminate: true };
      }
    }
    
    // Para nós SEM filhos, verificar se está selecionado
    if (selectedItems.includes(node.id)) {
      return { checked: true, indeterminate: false };
    }
    
    return { checked: false, indeterminate: false };
  }, [selectedItems, node.id, hasChildren, node]);

  const handleExpandClick = (e) => {
    e.stopPropagation();
    if (hasChildren) {
      onExpandToggle(node.id);
    }
  };

  const handleCheckboxChange = (e) => {
    e.stopPropagation();
    if (toggleSubFilterCascade) {
      toggleSubFilterCascade(node);
    }
  };

  // ✅ REFERÊNCIA PARA DEFINIR ESTADO INDETERMINADO
  const checkboxRef = useRef(null);
  
  // ✅ APLICAR ESTADO INDETERMINADO CUSTOMIZADO
  useEffect(() => {
    if (checkboxRef.current) {
      // Remover todas as classes personalizadas primeiro
      checkboxRef.current.classList.remove('custom-indeterminate', 'custom-checked');
      
      if (checkboxState.indeterminate) {
        // ESTADO INDETERMINADO - traço roxo
        checkboxRef.current.checked = false;
        checkboxRef.current.indeterminate = false;
        checkboxRef.current.classList.add('custom-indeterminate');
      } else if (checkboxState.checked) {
        // ESTADO SELECIONADO - check roxo
        checkboxRef.current.checked = true;
        checkboxRef.current.indeterminate = false;
        checkboxRef.current.classList.add('custom-checked');
      } else {
        // ESTADO NORMAL - sem seleção
        checkboxRef.current.checked = false;
        checkboxRef.current.indeterminate = false;
      }
    }
  }, [checkboxState.checked, checkboxState.indeterminate]);

  return (
    <div 
      className="virtual-tree-item" 
      ref={el => nodeRefs && nodeRefs.current && (nodeRefs.current[node.id] = el)}
      style={{
        ...style,
        display: 'flex',
        alignItems: 'center',
        padding: '8px 4px',
        paddingLeft: `${(node.level * 16) + 4}px`,
        borderRadius: '0.5rem',
        transition: 'background-color 0.2s'
      }}
    >
      <button
        className="tree-expand-button"
        onClick={handleExpandClick}
        disabled={!hasChildren}
        style={{ visibility: hasChildren ? 'visible' : 'hidden' }}
      >
        {hasChildren && (isExpanded ? <ChevronDown /> : <ChevronRight />)}
      </button>

      <div className="mr-2">
        {hasChildren ? (
          isExpanded ? <CustomFolderOpenIcon className="w-4 h-4" /> : <CustomFolderIcon className="w-4 h-4" />
        ) : (
          <div className="w-4 h-4" />
        )}
      </div>

      <input
        ref={checkboxRef}
        type="checkbox"
        className="tree-checkbox"
        checked={checkboxState.checked && !checkboxState.indeterminate}
        onChange={handleCheckboxChange}
      />

      <span className="tree-label">{node.name}</span>

      {node.count && (
        <span className="tree-count ml-2">{node.count}</span>
      )}
    </div>
  );
});

// Componente principal SubfilterPanel
const SubfilterPanel = ({
  filtros, 
  setFiltros, 
  filters, 
  onSubfilterToggle,
  scrollToSubFilterId,
  setScrollToSubFilterId,
  expandedParentFilters,
  setExpandedParentFilters
}) => {
  const [currentSubFilters, setCurrentSubFilters] = useState([]);
  const [loading, setLoading] = useState(false);
  // ✅ REMOVIDO - flattenedNodes agora é um useMemo para melhor performance
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const listRef = React.useRef(null);
  const nodeRefs = useRef({});

  // Função auxiliar para obter descendentes de um subfiltro
  const getAllDescendantIds = useCallback((node) => {
    let ids = [node.id];
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        ids = ids.concat(getAllDescendantIds(child));
      }
    }
    return ids;
  }, []);

  // ✅ FUNÇÃO AUXILIAR: Encontrar o filtro raiz percorrendo a hierarquia
  const findRootFilterId = useCallback((node) => {
    // Se o node tem filterId direto, usar ele
    if (node.filterId) {
      return node.filterId;
    }
    
    // Se é um parent node, extrair o ID
    if (node.isParent && node.id.startsWith('parent-')) {
      const filterId = node.id.replace('parent-', '');
      return filterId;
    }
    
    // Percorrer a árvore para encontrar o filtro raiz
    const findInTree = (nodes, targetId) => {
      for (const rootNode of nodes) {
        if (rootNode.id === targetId) {
          return rootNode.filterId;
        }
        
        if (rootNode.children) {
          const found = findInTree(rootNode.children, targetId);
          if (found) return found;
        }
      }
      return null;
    };
    
    // Buscar em currentSubFilters
    const foundFilterId = findInTree(currentSubFilters, node.id);
    if (foundFilterId) {
      return foundFilterId;
    }
    
    // Fallbacks baseados em padrões conhecidos
    if (/^\d{4}(\.\d+)?$/.test(node.id)) {
      return 'Ano da Prova';
    }
    
    // Padrões de especialidades médicas
    const specialtyPatterns = {
      'ClinicaMedica': ['ClinicaMedica', 'Cardiologia', 'Pneumologia', 'Gastroenterologia', 'Nefrologia', 'Endocrinologia'],
      'Cirurgia': ['Cirurgia', 'CirurgiaGeral', 'CirurgiaCardiovascular', 'Neurocirurgia'],
      'Pediatria': ['Pediatria', 'Neonatologia', 'PediatriaGeral'],
      'Ginecologia': ['Ginecologia', 'Obstetricia'],
      'MedicinaPreventiva': ['MedicinaPreventiva', 'SaudePublica', 'Epidemiologia']
    };
    
    for (const [filterId, patterns] of Object.entries(specialtyPatterns)) {
      for (const pattern of patterns) {
        if (node.id.includes(pattern) || node.name?.includes(pattern)) {
          return filterId;
        }
      }
    }
    
    // Último recurso: usar o primeiro filtro selecionado
    const selectedMainFilters = filtros.selectedFilters || [];
    if (selectedMainFilters.length > 0) {
      return selectedMainFilters[0];
    }
    
    return null;
  }, [currentSubFilters, filtros.selectedFilters]);

  // ✅ FUNÇÃO CORRIGIDA: Seleção/deseleção em cascata dos subfiltros
  const toggleSubFilterCascade = useCallback((node) => {
    // ✅ VALIDAÇÃO: Verificar se o node é válido
    if (!node || !node.id) {
      return;
    }
    
    const hasChildren = node.children && node.children.length > 0;
    const allIds = hasChildren ? getAllDescendantIds(node) : [node.id];

    // ✅ VALIDAÇÃO: Verificar se allIds é válido
    if (!allIds || allIds.length === 0) {
      return;
    }

    // ✅ NOVA LÓGICA: Usar função auxiliar para encontrar o filtro raiz
    const filterIdToUse = findRootFilterId(node);

    // ✅ VALIDAÇÃO: Garantir que filterIdToUse nunca seja null
    if (!filterIdToUse) {
      return; // Sair da função se não conseguir determinar o filtro pai
    }

    // ✅ CORREÇÃO: Lógica mais robusta
    const currentSelectedSubFilters = filtros.selectedSubFilters || [];
    
    // Verificar quantos dos IDs já estão selecionados
    const selectedIds = allIds.filter(id => currentSelectedSubFilters.includes(id));
    const selectedCount = selectedIds.length;
    const totalCount = allIds.length;
    
    // Se todos estão selecionados, desselecionar todos
    // Se nenhum ou apenas alguns estão selecionados, selecionar todos
    const shouldSelectAll = selectedCount < totalCount;

    try {
      // ✅ ATUALIZAÇÃO ATÔMICA DO ESTADO - Fazer tudo em uma única atualização
      setFiltros(prev => {
        let newSelectedFilters = [...prev.selectedFilters];
        let newSelectedSubFilters = [...prev.selectedSubFilters];
        
        if (shouldSelectAll) {
          // SELECIONAR: Adicionar todos que não estão presentes ainda
          const newIds = allIds.filter(id => !newSelectedSubFilters.includes(id));
          newSelectedSubFilters = [...newSelectedSubFilters, ...newIds];
          
          // Garantir que o filtro principal também seja selecionado
          if (filterIdToUse && !newSelectedFilters.includes(filterIdToUse)) {
            newSelectedFilters.push(filterIdToUse);
          }
          
    } else {
          // DESSELECIONAR: Remover todos os IDs
          newSelectedSubFilters = newSelectedSubFilters.filter(id => !allIds.includes(id));
        }
        
        return {
        ...prev,
          selectedFilters: newSelectedFilters,
          selectedSubFilters: newSelectedSubFilters
        };
      });
      
    } catch (error) {
      console.error('❌ Erro em toggleSubFilterCascade:', error);
    }
  }, [filtros, setFiltros, onSubfilterToggle, getAllDescendantIds, filters]);

  // Processamento recursivo dos subfilters para garantir que a estrutura aninhada seja preservada
  // ✅ PROCESSAMENTO SIMPLIFICADO DE SUBFILTROS - Mantém hierarquia do buildHierarchy
  const processSubFilters = useCallback((subFiltersData, filterCategory) => {
    
    // Função recursiva para processar nós e seus filhos
    const processNode = (node) => {
      if (!node || typeof node !== 'object') {
        console.warn('❌ Node inválido encontrado:', node);
        return null;
      }

      // Processar filhos recursivamente se existirem
      let processedChildren = [];
      if (node.children && Array.isArray(node.children) && node.children.length > 0) {
        processedChildren = node.children
          .map(processNode)
          .filter(Boolean)
          .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
      }

      return {
        ...node,
        children: processedChildren
      };
    };

    // Se os dados já vêm como array hierárquico (do buildHierarchy), apenas processar
    if (Array.isArray(subFiltersData)) {
      const processedData = subFiltersData
        .map(processNode)
        .filter(Boolean)
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
      

      return processedData;
    }
    
    return [];
  }, []);

  // ✅ DEBOUNCE INTELIGENTE - Evitar carregamentos desnecessários
  const debouncedSelectedFilters = useDebounce(filtros.selectedFilters, DEBOUNCE_DELAY);
  
  // 🚀 CARREGAMENTO OTIMIZADO - Usar serviço otimizado para carregamento único
  useEffect(() => {

    const loadSubFiltersOptimized = async () => {
      if (!debouncedSelectedFilters || debouncedSelectedFilters.length === 0) {
        setCurrentSubFilters([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // ✅ CARREGAMENTO ÚNICO - Uma única chamada para todos os subfiltros
        const subFiltersData = await getSubFiltersForSelectedFilters(debouncedSelectedFilters);
        
        // Processar os dados se necessário
        const processedSubFilters = subFiltersData.map(parent => ({
          ...parent,
          children: processSubFilters(parent.children || [], parent.category || 'MEDICAL_SPECIALTY')
        }));
        
        // Ordenar subfiltros por ordem alfabética
        const sortedSubFilters = processedSubFilters.sort((a, b) => 
          a.name.localeCompare(b.name, 'pt-BR')
        );
        
        setCurrentSubFilters(sortedSubFilters);
        
        // ✅ CORREÇÃO: NÃO resetar expandedNodes automaticamente - manter estado da árvore
        // Apenas colapsar se realmente necessário
        if (sortedSubFilters.length === 0) {
        setExpandedNodes(new Set());
        }
        
      } catch (error) {
        console.error('❌ Erro ao carregar subfiltros otimizados:', error);
        // Fallback para o método antigo em caso de erro
        try {
          const selectedFiltersData = filters.filter(f => debouncedSelectedFilters.includes(f.id));
          const allSubFilters = [];
          
          for (const filter of selectedFiltersData) {
            const result = await getSubFiltersByFilterId(filter.id);
            if (result.subFilters && result.subFilters.length > 0) {
              const subFiltersData = processSubFilters(result.subFilters, filter.category);
              allSubFilters.push({
                id: `parent-${filter.id}`,
                name: filter.name,
                filterId: filter.id,
                isParent: true,
                children: subFiltersData,
                count: subFiltersData.reduce((total, sub) => total + (sub.count || 0), 0)
              });
            }
          }
          
          setCurrentSubFilters(allSubFilters.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')));
        } catch (fallbackError) {
          console.error('❌ Erro no fallback:', fallbackError);
          setCurrentSubFilters([]);
        }
      } finally {
        setLoading(false);
      }
    };

    loadSubFiltersOptimized();
  }, [debouncedSelectedFilters, filters]);

  // Busca removida - agora gerenciada pela QuestoesPage
  // para evitar conflitos entre implementações

  // Filtrar subfiltros baseado no termo de busca
  const filteredSubFilters = currentSubFilters;

  // Ref para currentSubFilters para evitar dependência no useCallback
  const currentSubFiltersRef = useRef(currentSubFilters);
  currentSubFiltersRef.current = currentSubFilters;

  // ✅ TOGGLE OTIMIZADO - Memoizado para evitar re-renders
  const handleExpandToggle = useCallback((nodeId) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        // Ao colapsar um nó, também colapsar todos os seus filhos recursivamente
        const collapsedDescendants = [];
        
        // ✅ FUNÇÃO OTIMIZADA - Busca mais eficiente
        const findNodeByIdAndGetDescendants = (nodes, id, descendants = []) => {
          for (const node of nodes) {
            if (node.id === id) {
              const collectDescendants = (n) => {
                if (n.children && n.children.length > 0) {
                  n.children.forEach(child => {
                    descendants.push(child.id);
                    collectDescendants(child);
                  });
                }
              };
              collectDescendants(node);
              return descendants;
            }
            if (node.children && node.children.length > 0) {
              const found = findNodeByIdAndGetDescendants(node.children, id, descendants);
              if (found.length > 0) return found;
            }
          }
          return descendants;
        };
        
        const descendants = findNodeByIdAndGetDescendants(currentSubFiltersRef.current, nodeId);
        
        // Remover o nó atual e todos os seus descendentes
        newSet.delete(nodeId);
        descendants.forEach(id => newSet.delete(id));
      } else {
        // Ao expandir, apenas adicionar este nó específico
        newSet.add(nodeId);
      }
      return newSet;
    });

    // ✅ OTIMIZAÇÃO - Reset da lista virtualizada apenas quando necessário
    if (listRef.current && listRef.current.resetAfterIndex && typeof listRef.current.resetAfterIndex === 'function') {
      requestAnimationFrame(() => {
        try {
          if (listRef.current && listRef.current.resetAfterIndex) {
            listRef.current.resetAfterIndex(0);
          }
        } catch (error) {
          console.warn('Erro ao resetar lista virtualizada:', error);
        }
      });
    }
  }, []);

  // ✅ TOGGLE SUBFILTRO OTIMIZADO - Reduz re-renders e melhora performance
  const handleSubfilterToggle = useCallback((subFilterId) => {
    if (onSubfilterToggle) {
      onSubfilterToggle(null, subFilterId);
    }
  }, [onSubfilterToggle]);

  // ✅ ACHATAMENTO OTIMIZADO - Memoizado para evitar recálculos desnecessários
  const flattenedNodes = useMemo(() => {
    if (currentSubFilters.length === 0) {
      return [];
    }

    const flattened = [];
    
    const flattenTree = (nodes, level = 0) => {
      nodes.forEach(node => {
        // Adicionar nó com seu nível de indentação
        flattened.push({
          ...node,
          level
        });
        
        // Adicionar filhos se expandido
        if (node.children && node.children.length > 0 && expandedNodes.has(node.id)) {
          flattenTree(node.children, level + 1);
        }
      });
    };
    
    flattenTree(currentSubFilters);
    return flattened;
  }, [currentSubFilters, expandedNodes]);

  // Função para calcular a altura de cada item na lista virtualizada
  const getItemSize = useCallback((index) => {
    return 40; // Altura fixa para cada item
  }, []);

  // Lista virtualized data 
  const itemData = useMemo(() => ({
    flattenedNodes,
    selectedItems: filtros.selectedSubFilters || [],
    onToggle: handleSubfilterToggle,
    expandedNodes,
    onExpandToggle: handleExpandToggle,
    toggleSubFilterCascade: toggleSubFilterCascade,
    nodeRefs,
    getAllDescendantIds
  }), [flattenedNodes, filtros.selectedSubFilters, handleSubfilterToggle, expandedNodes, handleExpandToggle, toggleSubFilterCascade, nodeRefs, getAllDescendantIds]);

  // Função removida - a busca agora é gerenciada pela QuestoesPage
  // para evitar conflitos entre implementações

  // Efeito para scroll automático para subfiltro selecionado via busca
  useEffect(() => {
    if (scrollToSubFilterId) {
      
      // Se for um objeto com ID e parentID
      if (typeof scrollToSubFilterId === 'object' && scrollToSubFilterId.id) {
        const { id, parentId, selectCascade } = scrollToSubFilterId;
        
        // Expandir o parentId (filtro principal)
        const parentNodeId = `parent-${parentId}`;
        
        // Função recursiva para encontrar o caminho até o nó
        const findNodePath = (nodes, targetId, currentPath = []) => {
          for (const node of nodes) {
            if (node.id === targetId) {
              return [...currentPath, node.id];
            }
            
            if (node.children && node.children.length > 0) {
              const result = findNodePath(node.children, targetId, [...currentPath, node.id]);
              if (result.length > 0) {
                return result;
              }
            }
          }
          return [];
        };
        
        // Buscar o filtro pai pelo parentId
        const parentFilter = currentSubFiltersRef.current.find(sf => sf.filterId === parentId);
        
        if (parentFilter) {
          // Expandir o nó pai principal
          setExpandedParentFilters(prev => {
            const newSet = new Set(prev);
            newSet.add(parentNodeId);
            return newSet;
          });
          
          setExpandedNodes(prev => {
            const newSet = new Set(prev);
            
            // IMPORTANTE: Expandir o filtro principal primeiro
            newSet.add(parentFilter.id);
            
            // Buscar caminho até o nó alvo
            if (parentFilter.children) {
              const nodePath = findNodePath(parentFilter.children, id);
              
              // Expandir todos os nós no caminho (incluindo nós intermediários)
              nodePath.forEach(nodeId => {
                newSet.add(nodeId);
              });
            }
            return newSet;
          });
          
          // Esperar mais tempo para garantir que os nós foram renderizados e expandidos
          setTimeout(() => {
            // Se selectCascade for true, selecionar o subfiltro e seus filhos
            if (selectCascade) {
              // Encontrar o nó no currentSubFilters para usar toggleSubFilterCascade
              const findNodeById = (nodes, targetId) => {
                for (const node of nodes) {
                  if (node.id === targetId) {
                    return node;
                  }
                  if (node.children && node.children.length > 0) {
                    const found = findNodeById(node.children, targetId);
                    if (found) return found;
                  }
                }
                return null;
              };
              
              const targetNode = findNodeById(currentSubFiltersRef.current, id);
              if (targetNode) {
                toggleSubFilterCascade(targetNode);
              }
            }
            
            // Scroll para o nó
            const nodeElement = nodeRefs.current[id];
            if (nodeElement) {
              nodeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
              
              // Destacar visualmente o elemento
              nodeElement.style.backgroundColor = 'rgba(139, 69, 19, 0.2)';
              setTimeout(() => {
                if (nodeElement) {
                  nodeElement.style.backgroundColor = '';
                }
              }, 3000);
            } else {
              // Tentar novamente após mais tempo
              setTimeout(() => {
                const retryElement = nodeRefs.current[id];
                if (retryElement) {
                  retryElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  retryElement.style.backgroundColor = 'rgba(139, 69, 19, 0.2)';
                  setTimeout(() => {
                    if (retryElement) {
                      retryElement.style.backgroundColor = '';
                    }
                  }, 3000);
                  
                  // Se selectCascade for true e ainda não foi executado, executar aqui
                  if (selectCascade) {
                    const findNodeById = (nodes, targetId) => {
                      for (const node of nodes) {
                        if (node.id === targetId) {
                          return node;
                        }
                        if (node.children && node.children.length > 0) {
                          const found = findNodeById(node.children, targetId);
                          if (found) return found;
                        }
                      }
                      return null;
                    };
                    
                    const targetNode = findNodeById(currentSubFiltersRef.current, id);
                    if (targetNode) {
                      toggleSubFilterCascade(targetNode);
                    }
                  }
                }
              }, 800);
            }
          }, 1500);
        }
      } else if (typeof scrollToSubFilterId === 'string') {
        // Caso seja apenas o ID como string
        // Expandir todos os nós pais
        setExpandedNodes(prev => {
          const newSet = new Set(prev);
          
          // Para cada filtro, buscar nó recursivamente
          for (const sf of currentSubFiltersRef.current) {
            const findAndExpandParents = (nodes, targetId, path = []) => {
              for (const node of nodes) {
                if (node.id === targetId) {
                  // Encontrou o nó, expandir todos os pais
                  return [...path, node.id];
                }
                
                if (node.children && node.children.length > 0) {
                  const result = findAndExpandParents(node.children, targetId, [...path, node.id]);
                  if (result.length) {
                    return result;
                  }
                }
              }
              return [];
            };
            
            if (sf.children) {
              const nodePath = findAndExpandParents(sf.children, scrollToSubFilterId);
              if (nodePath.length) {
                // Expandir o nó pai do filtro
                newSet.add(sf.id);
                
                // Expandir todos os nós no caminho
                nodePath.forEach(id => {
                  newSet.add(id);
                });
                break;
              }
            }
          }
          
          return newSet;
        });
        
        // Scroll para o elemento
        setTimeout(() => {
          const nodeElement = nodeRefs.current[scrollToSubFilterId];
          if (nodeElement) {
            nodeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Destacar visualmente o elemento
            nodeElement.style.backgroundColor = 'rgba(var(--purple-main-light-rgb), 0.2)';
            setTimeout(() => {
              if (nodeElement) {
                nodeElement.style.backgroundColor = '';
              }
            }, 2000);
          }
        }, 500);
      }
      
      // Limpar após processamento
      setTimeout(() => {
        setScrollToSubFilterId(null);
      }, 1000);
    }
  }, [scrollToSubFilterId, filtros.selectedFilters, setExpandedParentFilters, toggleSubFilterCascade]);



  return (
    <div className="dashboard-card h-full flex flex-col">
      {/* Header */}
      <div className="card-header flex items-center gap-2 mb-6">
        <div className="w-6 h-6 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
          <CustomFilterIcon className="w-3 h-3" />
        </div>
        <h3 className="text-xl font-semibold" style={{color: 'var(--text-primary)'}}>
          Subfiltros
        </h3>
      </div>

      {/* Busca removida - use a busca global no topo da página */}
      {filtros.selectedFilters.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
            <CustomSearchIcon className="w-4 h-4" />
            <span className="text-sm font-medium">Use a busca global no topo da página para encontrar filtros</span>
          </div>
        </div>
      )}

      {/* Conteúdo da árvore */}
      <div className="card-content flex-1 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        ) : filtros.selectedFilters.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-500 dark:text-gray-400">
            <p>Selecione um filtro para ver os subfiltros</p>
          </div>
        ) : filteredSubFilters.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-500 dark:text-gray-400">
            <p>Nenhum subfiltro encontrado</p>
          </div>
        ) : ConfigUtils.shouldUseVirtualization(flattenedNodes.length) ? (
          // Usar virtualização para muitos nós
          <div className="virtual-tree-container" style={{ height: 400 }}>
            <List
              ref={listRef}
              height={400}
              width="100%"
              itemCount={flattenedNodes.length}
              itemSize={getItemSize}
              itemData={itemData}
              overscanCount={10}
              className="virtual-tree-list"
            >
              {VirtualItem}
            </List>
          </div>
        ) : (
          <div className="tree-container">
            {filteredSubFilters.map(subFilter => (
              <TreeNode
                key={subFilter.id}
                node={subFilter}
                selectedItems={filtros.selectedSubFilters || []}
                onToggle={handleSubfilterToggle}
                expandedNodes={expandedNodes}
                onExpandToggle={handleExpandToggle}
                parentFilter={subFilter.isParent ? subFilter : null}
                toggleSubFilterCascade={toggleSubFilterCascade}
                nodeRef={(el) => nodeRefs.current[subFilter.id] = el}
                getAllDescendantIds={getAllDescendantIds}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer com informações */}
      {filteredSubFilters.length > 0 && (
        <div className="card-footer mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {`${filteredSubFilters.length} categoria(s) de subfiltro(s) encontrada(s)`}
          </p>
          {filtros.selectedSubFilters && filtros.selectedSubFilters.length > 0 && (
            <p className="text-sm text-purple-600 dark:text-purple-400">
              {filtros.selectedSubFilters.length} subfiltro(s) selecionado(s)
            </p>
          )}
        </div>
      )}
    </div>
  );
};

// Comparador personalizado para React.memo
const arePropsEqual = (prevProps, nextProps) => {
  const keys = Object.keys(nextProps);
  
  for (const key of keys) {
    if (key === 'filtros') {
      // Comparação profunda para filtros
      if (JSON.stringify(prevProps.filtros) !== JSON.stringify(nextProps.filtros)) {
        return false;
      }
    } else if (key === 'filters') {
      // Comparação para filters
      if (prevProps.filters !== nextProps.filters) {
        return false;
      }
    } else if (key === 'expandedParentFilters') {
      // Comparação para Set
      if (prevProps.expandedParentFilters !== nextProps.expandedParentFilters) {
        return false;
      }
    } else if (prevProps[key] !== nextProps[key]) {
      return false;
    }
  }
  
  return true;
};

export default React.memo(SubfilterPanel, arePropsEqual);

