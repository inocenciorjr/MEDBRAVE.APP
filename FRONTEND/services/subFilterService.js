import { createClient } from "@/lib/supabase/client";
import { buildHierarchy } from "../utils/hierarchyUtils";

const supabase = createClient();

// Cache para armazenar subfiltros já carregados por filterId
const subfiltrosCache = new Map();
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutos de validade do cache

// Cache para buscas globais
const searchCache = new Map();

export const getSubFiltersByFilterId = async (filterId) => {
  try {
    console.time(`fetch-subfiltros-${filterId}`);
  
  // Verificar se existe cache válido para este filterId
  if (subfiltrosCache.has(filterId)) {
    const cachedData = subfiltrosCache.get(filterId);
    const isCacheValid = (Date.now() - cachedData.timestamp) < CACHE_EXPIRY_MS;
    
    if (isCacheValid) {
      console.log(`Usando cache para subfiltros do filtro ${filterId}`);
      console.timeEnd(`fetch-subfiltros-${filterId}`);
      return { subFilters: cachedData.data, fromCache: true };
    }
  }
  
  // Consulta usando Supabase
  const { data: directSubFilters, error } = await supabase
    .from('subFilters')
    .select('*')
    .eq('filterId', filterId)
    .eq('isActive', true);
  
  if (error) throw error;
  
  // Obter IDs dos subfiltros diretos
  const subfilterIds = directSubFilters.map(sf => sf.id);
  
  // Array para armazenar todos os subfiltros, iniciando com os diretos
  let allSubFilters = [...directSubFilters];
  const processedIds = new Set(directSubFilters.map(sf => sf.id)); // Evitar duplicatas
  
  // Se houver subfiltros diretos, buscar seus filhos (nível 2 e 3)
  if (subfilterIds.length > 0) {
    // Buscar todos os filhos de uma vez usando Supabase
    const { data: allChildren, error: childrenError } = await supabase
      .from('subFilters')
      .select('*')
      .in('parentId', subfilterIds)
      .eq('isActive', true);
    
    if (childrenError) throw childrenError;
    
    // Filtrar duplicatas e adicionar à lista
    const children = (allChildren || []).filter(child => !processedIds.has(child.id));
    children.forEach(child => {
      allSubFilters.push(child);
      processedIds.add(child.id);
    });
    
    // Buscar nível 3 se necessário
    if (children.length > 0) {
      const childrenIds = children.map(child => child.id);
      const { data: grandchildren, error: grandchildrenError } = await supabase
        .from('subFilters')
        .select('*')
        .in('parentId', childrenIds)
        .eq('isActive', true);
      
      if (grandchildrenError) throw grandchildrenError;
      
      // Filtrar duplicatas e adicionar à lista
       const filteredGrandchildren = (grandchildren || []).filter(grandchild => !processedIds.has(grandchild.id));
       filteredGrandchildren.forEach(grandchild => {
         allSubFilters.push(grandchild);
         processedIds.add(grandchild.id);
       });
     }
   }
  
  // Construir a hierarquia
  const hierarchicalSubFilters = buildHierarchy(allSubFilters);
  
  // Armazenar em cache
  subfiltrosCache.set(filterId, {
    data: hierarchicalSubFilters,
    timestamp: Date.now()
  });
  
  console.log(`Encontrados ${allSubFilters.length} subfiltros para o filtro ${filterId}`);
  console.timeEnd(`fetch-subfiltros-${filterId}`);
  
  return { subFilters: hierarchicalSubFilters };
} catch (error) {
  console.error(`Erro ao obter subfiltros para o filtro ${filterId}:`, error);
  throw error; // Propagar o erro ao invés de mascarar
}
};

/**
 * Função otimizada para buscar subfiltros por termo de busca em uma única consulta
 * @param {string} searchTerm - Termo para busca
 * @param {number} maxResults - Número máximo de resultados (padrão: 50)
 * @returns {Promise<Array>} - Lista de subfiltros que correspondem à busca
 */
export const getSubFiltersBySearchTerm = async (searchTerm, maxResults = 50) => {
  try {
    console.time('search-subfiltros');
  
  // Verificar se existe cache válido para este termo de busca
  const cacheKey = `search_${searchTerm}_${maxResults}`;
  if (searchCache.has(cacheKey)) {
    const cachedData = searchCache.get(cacheKey);
    const isCacheValid = (Date.now() - cachedData.timestamp) < CACHE_EXPIRY_MS;
    
    if (isCacheValid) {
      console.log(`Usando cache para busca "${searchTerm}"`);
      console.timeEnd('search-subfiltros');
      return cachedData.data;
    }
  }
  
  // Normalizar o termo de busca para melhorar os resultados
  const normalizedTerm = searchTerm.toLowerCase().trim();
  
  // Buscar TODOS os subfiltros ativos usando Supabase
  const { data: allSubFilters, error } = await supabase
    .from('subFilters')
    .select('*')
    .eq('isActive', true);
  
  if (error) throw error;
  
  // Construir hierarquia completa para busca mais eficiente
  const hierarchicalData = buildHierarchy(allSubFilters || []);
  
  // Função recursiva para buscar em toda a hierarquia
  const searchInHierarchy = (nodes, results = [], parentPath = []) => {
    for (const node of nodes) {
      const currentPath = [...parentPath, node.name];
      const fullPath = currentPath.join(' ');
      
      // Verificar múltiplos critérios de busca
      const nameMatches = node.name && node.name.toLowerCase().includes(normalizedTerm);
      const descMatches = node.description && node.description.toLowerCase().includes(normalizedTerm);
      const pathMatches = fullPath.toLowerCase().includes(normalizedTerm);
      const metadataMatches = node.metadata && typeof node.metadata === 'object' &&
        Object.values(node.metadata).some(value => 
          typeof value === 'string' && value.toLowerCase().includes(normalizedTerm)
        );
      
      // Busca por palavras-chave relacionadas (ex: "cardio" deve encontrar "cardiologia")
      const keywordMatches = (
        (normalizedTerm.includes('cardio') && node.name.toLowerCase().includes('cardiovascular')) ||
        (normalizedTerm.includes('cardio') && node.name.toLowerCase().includes('cardiologia')) ||
        (normalizedTerm.includes('neuro') && node.name.toLowerCase().includes('neurologia')) ||
        (normalizedTerm.includes('gastro') && node.name.toLowerCase().includes('gastroenterologia'))
      );
      
      if (nameMatches || descMatches || pathMatches || metadataMatches || keywordMatches) {
        // Evitar duplicatas
        if (!results.some(r => r.id === node.id)) {
          results.push({
            id: node.id,
            name: node.name,
            filterId: node.filterId,
            parentId: node.parentId,
            description: node.description,
            metadata: node.metadata,
            path: currentPath,
            matchType: nameMatches ? 'name' : 
                      keywordMatches ? 'keyword' :
                      descMatches ? 'description' : 
                      pathMatches ? 'path' : 'metadata'
          });
        }
      }
      
      // Continuar busca nos filhos
      if (node.children && node.children.length > 0) {
        searchInHierarchy(node.children, results, currentPath);
      }
    }
    
    return results;
  };
  
  // Buscar em toda a hierarquia
  let results = [];
  searchInHierarchy(hierarchicalData, results);
  
  // Ordenar resultados por relevância
  results = results.sort((a, b) => {
    // Priorizar matches exatos no nome
    if (a.matchType === 'name' && b.matchType !== 'name') return -1;
    if (a.matchType !== 'name' && b.matchType === 'name') return 1;
    
    // Priorizar matches de palavras-chave
    if (a.matchType === 'keyword' && b.matchType !== 'keyword') return -1;
    if (a.matchType !== 'keyword' && b.matchType === 'keyword') return 1;
    
    // Ordenar por profundidade (mais direto primeiro)
    if (a.path.length !== b.path.length) {
      return a.path.length - b.path.length;
    }
    
    // Por fim, ordenar alfabeticamente
    return a.name.localeCompare(b.name, 'pt-BR');
  }).slice(0, maxResults);
  
  // Armazenar em cache
  searchCache.set(cacheKey, {
    data: results,
    timestamp: Date.now()
  });
  
  console.log(`Encontrados ${results.length} subfiltros para o termo "${searchTerm}"`);
  console.timeEnd('search-subfiltros');
  
  return results;
} catch (error) {
  console.error(`Erro ao buscar subfiltros para o termo "${searchTerm}":`, error);
  throw error; // Propagar o erro ao invés de mascarar
}
};


