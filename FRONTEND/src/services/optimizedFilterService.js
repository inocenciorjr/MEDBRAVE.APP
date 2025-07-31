import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from '../config/firebase';
import { buildHierarchy } from '../utils/hierarchyUtils';
import { cacheService } from './cacheService';
import { CACHE_CONFIG } from '../config/cacheConfig';

// 🔍 MONITOR DE REQUISIÇÕES FIREBASE
let filterRequestCount = 0;
const logFilterRequest = (operation, details) => {
  filterRequestCount++;
  const timestamp = new Date().toISOString();
  console.warn(`🔥 [Filter Request #${filterRequestCount}] ${timestamp} - ${operation}: ${details}`);
};

// Cache global para todos os filtros e subfiltros
let globalFiltersCache = null;
let globalCacheTimestamp = null;
const GLOBAL_CACHE_TTL = CACHE_CONFIG.TTL.OPTIMIZED_DATA;

/**
 * 🚀 FUNÇÃO OTIMIZADA: Carrega TODOS os filtros e subfiltros de uma vez
 * Similar ao getAllFiltersAndSubFilters do arquivo antigo
 * Reduz de 50+ consultas para apenas 2 consultas ao Firestore
 */
export const getAllFiltersAndSubFiltersOptimized = async () => {
  try {
    console.time('getAllFiltersAndSubFiltersOptimized');
    
    // Verificar cache global primeiro
    if (globalFiltersCache && globalCacheTimestamp) {
      const isCacheValid = (Date.now() - globalCacheTimestamp) < GLOBAL_CACHE_TTL;
      if (isCacheValid) {
        console.timeEnd('getAllFiltersAndSubFiltersOptimized');
        return globalFiltersCache;
      }
    }
    
    // Verificar cache do cacheService
    const cachedData = await cacheService.get('all_filters_and_subfilters');
    if (cachedData) {
      globalFiltersCache = cachedData;
      globalCacheTimestamp = Date.now();
      console.timeEnd('getAllFiltersAndSubFiltersOptimized');
      return cachedData;
    }
    
    // Buscar todos os filtros e subfiltros em paralelo (apenas 2 consultas)
    logFilterRequest('getDocs', 'Buscando TODOS os filtros e subfiltros (2 consultas)');
    const [filtersSnap, subFiltersSnap] = await Promise.all([
      getDocs(query(
        collection(db, 'filters'),
        where('isGlobal', '==', true),
        where('status', '==', 'ACTIVE')
      )),
      getDocs(query(
        collection(db, 'subFilters'),
        where('isActive', '==', true)
      ))
    ]);
    
    const filters = filtersSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    const subFilters = subFiltersSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    if (filters.length === 0) {
      console.error('Nenhum filtro encontrado');
      return [];
    }
    
    // Criar mapa de filtros por ID
    const filterMap = {};
    filters.forEach(f => {
      filterMap[f.id] = f;
    });
    
    // Criar mapa de subfiltros com hierarquia
    const subFilterMap = {};
    subFilters.forEach(sf => {
      subFilterMap[sf.id] = { ...sf, children: [] };
    });
    
    // Construir hierarquia recursiva
    subFilters.forEach(sf => {
      if (sf.parentId && subFilterMap[sf.parentId]) {
        subFilterMap[sf.parentId].children.push(subFilterMap[sf.id]);
      }
    });
    
    // Organizar subfiltros por filtro principal
    const subFiltersByFilter = {};
    const subFilterIds = new Set(subFilters.map(sf => sf.id));
    
    subFilters.forEach(sf => {
      if (sf.filterId && filterMap[sf.filterId]) {
        // É raiz se: não tem parentId OU parentId não existe nos subfiltros
        const isRoot = !sf.parentId || !subFilterIds.has(sf.parentId);
        
        if (isRoot) {
          if (!subFiltersByFilter[sf.filterId]) {
            subFiltersByFilter[sf.filterId] = [];
          }
          subFiltersByFilter[sf.filterId].push(subFilterMap[sf.id]);
        }
      }
    });
    
    // Montar árvore final de filtros com subfiltros
    const tree = filters.map(f => ({
      ...f,
      children: subFiltersByFilter[f.id] || []
    }));
    
    // Separar por categoria
    const result = {
      institutional: tree
        .filter(f => f.category === 'INSTITUTIONAL')
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
      educational: tree
        .filter(f => f.category === 'EDUCATIONAL')
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
      medicalSpecialty: tree
        .filter(f => f.category === 'MEDICAL_SPECIALTY')
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
      all: tree
    };
    
    // Armazenar em cache global e persistente
    globalFiltersCache = result;
    globalCacheTimestamp = Date.now();
    await cacheService.set('all_filters_and_subfilters', result, GLOBAL_CACHE_TTL);
    
    console.timeEnd('getAllFiltersAndSubFiltersOptimized');
    
    return result;
    
  } catch (error) {
    console.error('❌ Erro ao carregar filtros e subfiltros:', error);
    throw error;
  }
};

/**
 * 🎯 FUNÇÃO OTIMIZADA: Obter subfiltros para filtros específicos
 * Filtra os dados já carregados ao invés de fazer novas consultas
 */
export const getSubFiltersForSelectedFilters = async (selectedFilterIds) => {
  try {
    if (!selectedFilterIds || selectedFilterIds.length === 0) {
      return [];
    }
    
    // Carregar todos os dados se não estiverem em cache
    const allData = await getAllFiltersAndSubFiltersOptimized();
    
    // Filtrar apenas os filtros selecionados
    const selectedFilters = allData.all.filter(f => selectedFilterIds.includes(f.id));
    
    // Transformar para o formato esperado pelo SubfilterPanel
    const result = selectedFilters.map(filter => ({
      id: `parent-${filter.id}`,
      name: filter.name,
      filterId: filter.id,
      isParent: true,
      children: filter.children || [],
      count: (filter.children || []).reduce((total, sub) => {
        return total + countSubFiltersRecursively([sub]);
      }, 0)
    }));
    
    return result;
    
  } catch (error) {
    console.error('❌ Erro ao obter subfiltros para filtros selecionados:', error);
    throw error;
  }
};

/**
 * 🔍 FUNÇÃO AUXILIAR: Contar subfiltros recursivamente
 */
const countSubFiltersRecursively = (subFilters) => {
  let count = 0;
  subFilters.forEach(sf => {
    count++; // Conta o próprio subfiltro
    if (sf.children && sf.children.length > 0) {
      count += countSubFiltersRecursively(sf.children);
    }
  });
  return count;
};

/**
 * 🔍 FUNÇÃO OTIMIZADA: Busca global em subfiltros
 * Busca nos dados já carregados ao invés de fazer consultas
 */
export const searchSubFiltersGlobally = async (searchTerm, maxResults = 20) => {
  try {
    if (!searchTerm || searchTerm.trim().length < 2) {
      return [];
    }
    
    const normalizedSearchTerm = searchTerm.toLowerCase().trim();
    
    // Verificar cache de busca
    const cacheKey = `search_${normalizedSearchTerm}_${maxResults}`;
    const cachedResults = await cacheService.get(cacheKey);
    if (cachedResults) {
      return cachedResults;
    }
    
    // Carregar todos os dados
    const allData = await getAllFiltersAndSubFiltersOptimized();
    
    const results = [];
    
    // Função para calcular relevância do resultado
    const calculateRelevance = (subfilterName, filterName, searchTerm) => {
      const subfilterLower = subfilterName.toLowerCase();
      const filterLower = filterName.toLowerCase();
      const termLower = searchTerm.toLowerCase();
      
      let score = 0;
      
      // Pontuação alta para correspondência exata
      if (subfilterLower === termLower) score += 100;
      
      // Pontuação alta para início da palavra
      if (subfilterLower.startsWith(termLower)) score += 80;
      
      // Pontuação média para correspondência no meio
      if (subfilterLower.includes(termLower)) score += 50;
      
      // Pontuação extra se o filtro pai também contém o termo
      if (filterLower.includes(termLower)) score += 30;
      
      // PENALIZAÇÃO SEVERA para filtros genéricos
      const genericFilters = ['variado', 'geral', 'outros', 'diversos', 'miscelânea', 'complementar'];
      if (genericFilters.some(generic => filterLower.includes(generic))) {
        score -= 60; // Penalização muito maior
      }
      
      // Bonificar especialidades médicas relevantes
      const medicalTerms = ['psiquiatria', 'cardiologia', 'neurologia', 'pediatria', 'ginecologia', 'ortopedia', 'dermatologia'];
      if (medicalTerms.some(term => filterLower.includes(term) || subfilterLower.includes(term))) {
        score += 25;
      }
      
      return score;
    };
    
    // Função para verificar se um resultado deve ser incluído
    const shouldIncludeResult = (subfilterName, filterName, searchTerm, relevance) => {
      const subfilterLower = subfilterName.toLowerCase();
      const filterLower = filterName.toLowerCase();
      const termLower = searchTerm.toLowerCase();
      
      // Sempre incluir correspondências exatas ou que começam com o termo
      if (subfilterLower === termLower || subfilterLower.startsWith(termLower)) {
        return true;
      }
      
      // Para filtros genéricos, só incluir se a relevância for muito alta
      const genericFilters = ['variado', 'geral', 'outros', 'diversos', 'miscelânea', 'complementar'];
      if (genericFilters.some(generic => filterLower.includes(generic))) {
        return relevance >= 70; // Threshold muito alto para genéricos
      }
      
      // Para outros filtros, incluir se relevância for razoável
      return relevance >= 40;
    };
    
    // Buscar recursivamente em todos os subfiltros
    const searchInTree = (nodes, parentNames = [], rootFilterId = '', rootFilterName = '') => {
      for (const node of nodes) {
        const currentPath = [...parentNames, node.name];
        
        // Verificar se o nome contém o termo de busca
        if (node.name.toLowerCase().includes(normalizedSearchTerm)) {
          const relevance = calculateRelevance(node.name, rootFilterName, normalizedSearchTerm);
          
          // Só incluir se passar no filtro de relevância
          if (shouldIncludeResult(node.name, rootFilterName, normalizedSearchTerm, relevance)) {
            results.push({
              id: node.id,
              name: node.name,
              path: currentPath,
              parentNames: [rootFilterName, ...parentNames.slice(1)],
              filterId: rootFilterId,
              parentId: rootFilterId,
              filterName: rootFilterName,
              relevance: relevance
            });
          }
        }
        
        // Buscar nos filhos
        if (node.children && node.children.length > 0) {
          searchInTree(node.children, currentPath, rootFilterId, rootFilterName);
        }
      }
    };
    
    // Buscar em todos os filtros
    allData.all.forEach(filter => {
      if (filter.children && filter.children.length > 0) {
        searchInTree(filter.children, [filter.name], filter.id, filter.name);
      }
    });
    
    // Ordenar por relevância (maior primeiro) e depois alfabeticamente
    const sortedResults = results
      .sort((a, b) => {
        // Primeiro por relevância (decrescente)
        if (b.relevance !== a.relevance) {
          return b.relevance - a.relevance;
        }
        // Depois alfabeticamente
        return a.name.localeCompare(b.name, 'pt-BR');
      })
      .slice(0, maxResults)
      .map(result => {
        // Remover o campo relevance do resultado final
        const { relevance, ...finalResult } = result;
        return finalResult;
      });
    
    // Armazenar em cache
    await cacheService.set(cacheKey, sortedResults, 10 * 60 * 1000); // 10 minutos
    
    return sortedResults;
    
  } catch (error) {
    console.error('❌ Erro na busca global de subfiltros:', error);
    throw error;
  }
};

/**
 * 🧹 FUNÇÃO UTILITÁRIA: Limpar cache
 */
export const clearOptimizedCache = () => {
  globalFiltersCache = null;
  globalCacheTimestamp = null;
  cacheService.invalidateFiltersCache();
};

/**
 * 🎯 Extrai TODOS os IDs de filtros e subfiltros para a IA
 * Usa o cache otimizado para evitar requisições desnecessárias
 */
export const getAllFilterIdsForAIOptimized = async () => {
  logFilterRequest('getAllFilterIdsForAIOptimized', 'Buscando IDs para IA');
  
  const tree = await getAllFiltersAndSubFiltersOptimized();
  
  // Extrair APENAS filtros de especialidades médicas
  const medicalFilters = tree.filter(f => f.category === 'MEDICAL_SPECIALTY');
  
  // Função recursiva para extrair TODOS os IDs de subfiltros
  const extractAllSubFilterIds = (subFilters) => {
    const ids = [];
    subFilters.forEach(sf => {
      ids.push(sf.id);
      if (sf.children && sf.children.length > 0) {
        ids.push(...extractAllSubFilterIds(sf.children));
      }
    });
    return ids;
  };
  
  // Função recursiva para manter estrutura hierárquica
  const buildHierarchicalStructure = (subFilters, level = 1) => {
    return subFilters.map(sf => ({
      id: sf.id,
      name: sf.name,
      description: sf.description,
      level,
      parentId: sf.parentId,
      filterId: sf.filterId,
      children: sf.children && sf.children.length > 0 ?
        buildHierarchicalStructure(sf.children, level + 1) : []
    }));
  };
  
  const medicalSpecialtyFilters = medicalFilters.map(filter => {
    const allSubFilterIds = extractAllSubFilterIds(filter.children || []);
    const hierarchicalStructure = buildHierarchicalStructure(filter.children || []);
    
    return {
      id: filter.id,
      name: filter.name,
      category: filter.category,
      allSubFilterIds,
      hierarchicalStructure
    };
  });
  
  // Criar lista de TODOS os IDs válidos (filtros + subfiltros)
  const allValidIds = [];
  
  // Adicionar IDs dos filtros principais
  medicalSpecialtyFilters.forEach(f => {
    allValidIds.push(f.id);
    allValidIds.push(...f.allSubFilterIds);
  });
  
  const totalSubFilters = medicalSpecialtyFilters.reduce((sum, f) => sum + f.allSubFilterIds.length, 0);
  
  return {
    medicalSpecialtyFilters,
    totalFilters: medicalSpecialtyFilters.length,
    totalSubFilters,
    allValidIds
  };
};

export default {
  getAllFiltersAndSubFiltersOptimized,
  getSubFiltersForSelectedFilters,
  searchSubFiltersGlobally,
  getAllFilterIdsForAIOptimized,
  clearOptimizedCache
};