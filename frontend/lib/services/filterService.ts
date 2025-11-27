import api from '@/services/api';

export interface SubFilter {
  id: string;
  name: string;
  filter_id: string;
  parent_id: string | null;
  level: number;
}

export interface Filter {
  id: string;
  name: string;
  category: string;
}

let subFiltersCache: Map<string, SubFilter> | null = null;

/**
 * Busca e cacheia todos os subfiltros
 */
export async function getSubFiltersMap(): Promise<Map<string, SubFilter>> {
  if (subFiltersCache) {
    return subFiltersCache;
  }

  try {
    // Buscar TODAS as hierarquias disponíveis (mesmo padrão do QuestionPreviewModal)
    const [filterHierarchyResponse, institutionHierarchyResponse, yearsResponse] = await Promise.all([
      api.get('/banco-questoes/filters/hierarchy'),
      api.get('/banco-questoes/institutions'),
      api.get('/banco-questoes/years'),
    ]);
    
    const filterHierarchy = filterHierarchyResponse.data.data || [];
    const institutionHierarchy = institutionHierarchyResponse.data.data || [];
    const yearsHierarchy = yearsResponse.data.data || [];
    
    const map = new Map<string, SubFilter>();
    
    // Função recursiva para processar hierarquia
    const processNode = (node: any, parentId: string | null = null) => {
      if (node.id && node.name) {
        map.set(node.id, {
          id: node.id,
          name: node.name,
          filter_id: node.filter_id || node.id.split('_')[0],
          parent_id: parentId,
          level: node.level || 0,
        });
      }
      
      if (node.children) {
        node.children.forEach((child: any) => processNode(child, node.id));
      }
    };
    
    // Extrair de todas as hierarquias
    filterHierarchy.forEach((filter: any) => processNode(filter));
    institutionHierarchy.forEach((institution: any) => processNode(institution));
    yearsHierarchy.forEach((year: any) => processNode(year));
    
    subFiltersCache = map;
    return map;
  } catch (error) {
    console.error('[FilterService] Erro ao buscar subfiltros:', error);
    return new Map();
  }
}

/**
 * Extrai o ano de uma questão
 */
export function getYearFromQuestion(subFilterIds: string[], subFiltersMap: Map<string, SubFilter>): number {
  const yearSubFilterId = subFilterIds.find(id => id.startsWith('Ano da Prova_'));
  
  if (yearSubFilterId) {
    const subFilter = subFiltersMap.get(yearSubFilterId);
    if (subFilter?.name) {
      // Extrair número do nome (ex: "2024" ou "2024.1")
      const match = subFilter.name.match(/(\d{4}(?:\.\d+)?)/);
      if (match) {
        return parseFloat(match[1]);
      }
    }
  }
  
  return new Date().getFullYear();
}

/**
 * Extrai a instituição de uma questão
 */
export function getInstitutionFromQuestion(subFilterIds: string[], subFiltersMap: Map<string, SubFilter>): string {
  const institutionId = subFilterIds.find(id => id.startsWith('Universidade_'));
  
  if (institutionId) {
    const subFilter = subFiltersMap.get(institutionId);
    return subFilter?.name || 'Instituição';
  }
  
  return 'Instituição';
}

/**
 * Extrai o assunto principal de uma questão
 */
export function getSubjectFromQuestion(filterIds: string[], subFiltersMap: Map<string, SubFilter>): string {
  if (filterIds.length === 0) return 'Assunto';
  
  const filterId = filterIds[0];
  const subFilter = subFiltersMap.get(filterId);
  return subFilter?.name || filterId;
}

/**
 * Extrai o tópico de uma questão
 */
export function getTopicFromQuestion(subFilterIds: string[], subFiltersMap: Map<string, SubFilter>): string {
  // Pegar o primeiro subfiltro que não seja Ano ou Universidade
  const topicId = subFilterIds.find(id => 
    !id.startsWith('Ano da Prova_') && 
    !id.startsWith('Universidade_')
  );
  
  if (topicId) {
    const subFilter = subFiltersMap.get(topicId);
    return subFilter?.name || 'Tópico';
  }
  
  return 'Tópico';
}

/**
 * Busca todos os filtros principais
 */
export async function getFilters(): Promise<Filter[]> {
  try {
    const response = await api.get('/banco-questoes/filters/hierarchy');
    const hierarchy = response.data.data || [];
    
    return hierarchy.map((filter: any) => ({
      id: filter.id,
      name: filter.name,
      category: filter.category || 'Geral',
    }));
  } catch (error) {
    console.error('[FilterService] Erro ao buscar filtros:', error);
    return [];
  }
}

/**
 * Busca todos os subfiltros
 */
export async function getSubFilters(): Promise<SubFilter[]> {
  try {
    const subFiltersMap = await getSubFiltersMap();
    return Array.from(subFiltersMap.values());
  } catch (error) {
    console.error('[FilterService] Erro ao buscar subfiltros:', error);
    return [];
  }
}
