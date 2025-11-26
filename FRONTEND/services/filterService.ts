import { fetchWithAuth } from '../lib/utils/fetchWithAuth';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

const FILTERS_COLLECTION = 'filters';
const SUBFILTERS_COLLECTION = 'subFilters';

// Constantes
export const FilterCategory = {
  INSTITUTIONAL: 'INSTITUTIONAL',
  EDUCATIONAL: 'EDUCATIONAL',
  MEDICAL_SPECIALTY: 'MEDICAL_SPECIALTY'
} as const;

export const FilterStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE'
} as const;

export const FilterType = {
  CONTENT: 'CONTENT',
  COURSE: 'COURSE',
  QUESTION: 'QUESTION'
} as const;

// Tipos
export interface Filter {
  id: string;
  name: string;
  description?: string;
  category: string;
  status?: string;
  isGlobal?: boolean;
  filterType?: string;
  created_at?: Date;
  updated_at?: Date;
  children?: SubFilter[];
}

export interface SubFilter {
  id: string;
  filterId: string;
  name: string;
  description?: string;
  order?: number;
  isActive?: boolean;
  parentId?: string;
  status?: string;
  created_at?: Date;
  updated_at?: Date;
  children?: SubFilter[];
}

// Utilitário para converter dados Supabase para JS
function parseDoc<T = any>(data: any): T {
  return {
    ...data
  } as T;
}

export async function getAllFiltersAndSubFilters(): Promise<Filter[]> {
  // Busca todos os filtros e subfiltros via API do backend
  const [filtersResponse, subFiltersResponse] = await Promise.all([
    fetchWithAuth('/filters'),
    fetchWithAuth('/filters/subfilters/all'), // Endpoint para buscar todos os subfiltros
  ]);
  
  if (!filtersResponse.ok) {
    throw new Error(`Erro ao buscar filtros: ${filtersResponse.statusText}`);
  }
  if (!subFiltersResponse.ok) {
    throw new Error(`Erro ao buscar subfiltros: ${subFiltersResponse.statusText}`);
  }
  
  const filtersData = await filtersResponse.json();
  const subFiltersData = await subFiltersResponse.json();
  
  const filters: Filter[] = filtersData.data?.map((data: any) => parseDoc<Filter>(data)) || [];
  const subFilters: SubFilter[] = subFiltersData.data?.map((data: any) => parseDoc<SubFilter>(data)) || [];

  if (filters.length === 0) {
    console.error(`Nenhum filtro encontrado na coleção '${FILTERS_COLLECTION}'`);
    return [];
  }

  if (subFilters.length === 0) {
    console.error(`Nenhum subfiltro encontrado na coleção '${SUBFILTERS_COLLECTION}'`);
    return filters.map(f => ({ ...f, children: [] }));
  }



  // Analisar estrutura dos subfiltros
  const subFiltersWithFilterId = subFilters.filter(sf => sf.filterId);
  const subFiltersWithParentId = subFilters.filter(sf => sf.parentId);
  const subFiltersLevel1 = subFilters.filter(sf => sf.filterId && !sf.parentId);





  // Cria mapa de filters por ID para verificação
  const filterMap: Record<string, Filter> = {};
  filters.forEach(f => {
    filterMap[f.id] = f;
  });

  // Verificar filtros de especialidades médicas
  const medicalSpecialtyFilters = filters.filter(f => f.category === 'MEDICAL_SPECIALTY');

  // Monta árvore de subfiltros RECURSIVA COMPLETA
  const subFilterMap: Record<string, SubFilter> = {};
  subFilters.forEach(sf => {
    subFilterMap[sf.id] = { ...sf, children: [] };
  });

  // CONSTRUÇÃO HIERÁRQUICA RECURSIVA (6 níveis)

  // Relaciona subfiltros filhos recursivamente
  subFilters.forEach(sf => {
    if (sf.parentId && subFilterMap[sf.parentId]) {
      subFilterMap[sf.parentId].children!.push(subFilterMap[sf.id]);
    }
  });

  // ✅ NOVA ABORDAGEM: Organizar subfiltros por filtro principal SEM duplicação
  const subFiltersByFilter: Record<string, SubFilter[]> = {};

  // Identificar subfiltros raiz (que devem ser anexados diretamente aos filtros)

  // Primeiro, vamos identificar quais subfiltros são "raiz" para cada filtro
  // Raiz = têm filterId E (não têm parentId OU parentId não existe nos subfiltros)
  const subFilterIds = new Set(subFilters.map(sf => sf.id));

  subFilters.forEach(sf => {
    if (sf.filterId && filterMap[sf.filterId]) {
      // É raiz se: não tem parentId OU parentId não existe nos subfiltros
      const isRoot = !sf.parentId || !subFilterIds.has(sf.parentId);

      if (isRoot) {
        if (!subFiltersByFilter[sf.filterId]) subFiltersByFilter[sf.filterId] = [];
        subFiltersByFilter[sf.filterId].push(subFilterMap[sf.id]);

      }
    }
  });

  // Verificar quantos subfiltros raiz foram encontrados
  const totalRoots = Object.values(subFiltersByFilter).reduce((sum, arr) => sum + arr.length, 0);

  // 📊 CONTAGEM RECURSIVA de subfiltros por filtro
  const countSubFiltersRecursively = (subFilters: SubFilter[]): number => {
    let count = 0;
    subFilters.forEach(sf => {
      count++; // Conta o próprio subfiltro
      if (sf.children && sf.children.length > 0) {
        count += countSubFiltersRecursively(sf.children);
      }
    });
    return count;
  };

  // Monta árvore de filtros com contagem detalhada
  const tree: Filter[] = filters.map(f => {
    const children = subFiltersByFilter[f.id] || [];
    const totalSubFilters = countSubFiltersRecursively(children);



    return {
      ...f,
      children,
    };
  });

  // 📊 ESTATÍSTICAS FINAIS
  const totalSubFiltersInTree = tree.reduce((sum, f) => {
    return sum + countSubFiltersRecursively(f.children || []);
  }, 0);



  // Verificação de integridade removida para evitar logs excessivos

  return tree;
}

/**
 * 🎯 NOVA FUNÇÃO: Extrai TODOS os IDs de filtros e subfiltros para a IA
 * Retorna uma lista plana com TODOS os 1300+ subfiltros organizados hierarquicamente
 */
export async function getAllFilterIdsForAI(): Promise<{
  medicalSpecialtyFilters: Array<{
    id: string;
    name: string;
    category: string;
    allSubFilterIds: string[];
    hierarchicalStructure: any[];
  }>;
  totalFilters: number;
  totalSubFilters: number;
  allValidIds: string[];
}> {
  const tree = await getAllFiltersAndSubFilters();

  // Extrair APENAS filtros de especialidades médicas (os 7 principais)
  const medicalFilters = tree.filter(f => f.category === 'MEDICAL_SPECIALTY');

  // Função recursiva para extrair TODOS os IDs de subfiltros
  const extractAllSubFilterIds = (subFilters: SubFilter[]): string[] => {
    const ids: string[] = [];
    subFilters.forEach(sf => {
      ids.push(sf.id);
      if (sf.children && sf.children.length > 0) {
        ids.push(...extractAllSubFilterIds(sf.children));
      }
    });
    return ids;
  };

  // Função recursiva para manter estrutura hierárquica
  const buildHierarchicalStructure = (subFilters: SubFilter[], level = 1): any[] => {
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
  const allValidIds: string[] = [];

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
}

export async function createFilter(filter: Omit<Filter, 'created_at' | 'updated_at' | 'children'>): Promise<Filter> {
  const now = new Date().toISOString();
  const filterData = {
    ...filter,
    created_at: now,
    updated_at: now,
  };
  
  const { data, error } = await supabase
    .from(FILTERS_COLLECTION)
    .insert(filterData)
    .select()
    .single();
  
  if (error) throw error;
  return parseDoc<Filter>(data);
}

export async function updateFilter(filter: Partial<Filter> & { id: string }): Promise<void> {
  if (!filter.id) throw new Error('ID do filtro é obrigatório');
  
  const { error } = await supabase
    .from(FILTERS_COLLECTION)
    .update({
      ...filter,
      updated_at: new Date().toISOString(),
    })
    .eq('id', filter.id);
  
  if (error) throw error;
}

export async function deleteFilter(id: string): Promise<void> {
  if (!id) throw new Error('ID do filtro é obrigatório');
  
  // Deleta subfiltros relacionados primeiro
  const { error: subFiltersError } = await supabase
    .from(SUBFILTERS_COLLECTION)
    .delete()
    .eq('filterId', id);
  
  if (subFiltersError) throw subFiltersError;
  
  // Deleta o filtro principal
  const { error: filterError } = await supabase
    .from(FILTERS_COLLECTION)
    .delete()
    .eq('id', id);
  
  if (filterError) throw filterError;
}

export async function createSubFilter(subfilter: Omit<SubFilter, 'created_at' | 'updated_at' | 'children'>): Promise<SubFilter> {
  const now = new Date().toISOString();
  const subFilterData = {
    ...subfilter,
    created_at: now,
    updated_at: now,
  };
  
  const { data, error } = await supabase
    .from(SUBFILTERS_COLLECTION)
    .insert(subFilterData)
    .select()
    .single();
  
  if (error) throw error;
  return parseDoc<SubFilter>(data);
}

export async function updateSubFilter(subfilter: Partial<SubFilter> & { id: string }): Promise<void> {
  if (!subfilter.id) throw new Error('ID do subfiltro é obrigatório');
  
  const { error } = await supabase
    .from(SUBFILTERS_COLLECTION)
    .update({
      ...subfilter,
      updated_at: new Date().toISOString(),
    })
    .eq('id', subfilter.id);
  
  if (error) throw error;
}

export async function deleteSubFilter(id: string): Promise<void> {
  if (!id) throw new Error('ID do subfiltro é obrigatório');
  
  // Deleta subfiltros filhos recursivamente primeiro
  const { error: childrenError } = await supabase
    .from(SUBFILTERS_COLLECTION)
    .delete()
    .eq('parentId', id);
  
  if (childrenError) throw childrenError;
  
  // Deleta o subfiltro principal
  const { error } = await supabase
    .from(SUBFILTERS_COLLECTION)
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

/**
 * Retorna todos os filtros sem a estrutura hierárquica de subfiltros
 * @returns Promise<Filter[]>
 */
export async function getAllFilters(): Promise<Filter[]> {
  const { data, error } = await supabase
    .from(FILTERS_COLLECTION)
    .select('*')
    .order('name', { ascending: true });
  
  if (error) throw error;
  
  return data?.map(item => parseDoc<Filter>(item)) || [];
}

/**
 * 🚀 OTIMIZAÇÃO: Busca múltiplos filtros por IDs em uma única operação
 * @param filterIds Array de IDs dos filtros
 * @returns Promise<Filter[]>
 */
export async function getBulkFilters(filterIds: string[]): Promise<Filter[]> {
  if (!filterIds || filterIds.length === 0) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from(FILTERS_COLLECTION)
      .select('*')
      .in('id', filterIds);

    if (error) {
      throw error;
    }

    const filters = data?.map(item => parseDoc<Filter>(item)) || [];
    
    // Manter a ordem original dos IDs fornecidos
    const orderedFilters = filterIds.map(id => filters.find(f => f.id === id)).filter(Boolean) as Filter[];

    return orderedFilters;
  } catch (error) {
    console.error('❌ [getBulkFilters] Erro ao buscar filtros em lote:', error);
    throw error;
  }
}

/**
 * 🚀 OTIMIZAÇÃO: Busca múltiplos subfiltros por IDs em uma única operação
 * @param subFilterIds Array de IDs dos subfiltros
 * @returns Promise<SubFilter[]>
 */
export async function getBulkSubFilters(subFilterIds: string[]): Promise<SubFilter[]> {
  if (!subFilterIds || subFilterIds.length === 0) {
    return [];
  }



  try {
    // Supabase permite arrays maiores, mas mantemos chunks para performance
    const chunks: string[][] = [];
    for (let i = 0; i < subFilterIds.length; i += 10) {
      chunks.push(subFilterIds.slice(i, i + 10));
    }

    const allSubFilters: SubFilter[] = [];

    // Executar busca para cada chunk em paralelo usando Supabase
    await Promise.all(chunks.map(async (chunk) => {
      const { data, error } = await supabase
        .from(SUBFILTERS_COLLECTION)
        .select('*')
        .in('id', chunk);
      
      if (error) {
        console.error('❌ Erro ao buscar subfiltros:', error);
        throw error;
      }
      
      if (data) {
        data.forEach(subFilterData => {
          allSubFilters.push(parseDoc<SubFilter>(subFilterData));
        });
      }
    }));



    // Manter a ordem original dos IDs fornecidos
    const orderedSubFilters = subFilterIds.map(id => allSubFilters.find(sf => sf.id === id)).filter(Boolean) as SubFilter[];

    return orderedSubFilters;
  } catch (error) {
    console.error('❌ [getBulkSubFilters] Erro ao buscar subfiltros em lote:', error);
    throw error;
  }
}

/**
 * Atualiza o id de um filtro e todas as referências em subfiltros (filterId e parentId) para o novo id.
 * @param oldFilter O filtro antigo (com id antigo)
 * @param newName Novo nome do filtro
 * @param newId Novo id do filtro (normalmente igual ao novo nome)
 */
export async function updateFilterIdAndReferences(oldFilter: Filter, newName: string, newId: string): Promise<void> {
  if (!oldFilter || !oldFilter.id) throw new Error('Filtro antigo inválido');
  if (!newId) throw new Error('Novo id inválido');
  if (oldFilter.id === newId) throw new Error('O id antigo e o novo são iguais');

  const now = new Date().toISOString();
  
  try {
    // 1. Criar novo filtro com novo id
    const newFilterData = {
      ...oldFilter,
      id: newId,
      name: newName,
      created_at: oldFilter.created_at || now,
      updated_at: now,
    };
    
    const { error: createError } = await supabase
      .from(FILTERS_COLLECTION)
      .insert(newFilterData);
    
    if (createError) throw createError;

    // 2. Buscar todos os subfiltros
    const { data: subFilters, error: fetchError } = await supabase
      .from(SUBFILTERS_COLLECTION)
      .select('*');
    
    if (fetchError) throw fetchError;
    
    const oldPrefix = oldFilter.id + '_';
    const newPrefix = newId + '_';
    const subFiltersToUpdate: any[] = [];
    const subFiltersToDelete: string[] = [];

    subFilters?.forEach(subFilter => {
      const originalId = subFilter.id;
      let updated = false;
      let newSubId = originalId;
      let newParentId = subFilter.parentId;
      let newFilterId = subFilter.filterId;

      // Atualizar id se começa com o prefixo antigo
      if (typeof originalId === 'string' && originalId.startsWith(oldPrefix)) {
        newSubId = newPrefix + originalId.slice(oldPrefix.length);
        updated = true;
      }
      // Atualizar parentId se começa com o prefixo antigo
      if (typeof newParentId === 'string' && newParentId.startsWith(oldPrefix)) {
        newParentId = newPrefix + newParentId.slice(oldPrefix.length);
        updated = true;
      }
      // Atualizar filterId se for igual ao antigo
      if (newFilterId === oldFilter.id) {
        newFilterId = newId;
        updated = true;
      }
      
      // Se houve atualização, preparar para criar novo e deletar antigo
      if (updated && newSubId) {
        const newSubData = {
          ...subFilter,
          id: newSubId,
          parentId: newParentId,
          filterId: newFilterId,
          updated_at: now,
        };
        subFiltersToUpdate.push(newSubData);
        subFiltersToDelete.push(originalId);
      }
    });

    // 3. Inserir novos subfiltros
    if (subFiltersToUpdate.length > 0) {
      const { error: insertError } = await supabase
        .from(SUBFILTERS_COLLECTION)
        .insert(subFiltersToUpdate);
      
      if (insertError) throw insertError;
    }

    // 4. Deletar subfiltros antigos
    if (subFiltersToDelete.length > 0) {
      const { error: deleteSubError } = await supabase
        .from(SUBFILTERS_COLLECTION)
        .delete()
        .in('id', subFiltersToDelete);
      
      if (deleteSubError) throw deleteSubError;
    }

    // 5. Deletar filtro antigo
    const { error: deleteFilterError } = await supabase
      .from(FILTERS_COLLECTION)
      .delete()
      .eq('id', oldFilter.id);
    
    if (deleteFilterError) throw deleteFilterError;
    
  } catch (error) {
    console.error('❌ [updateFilterIdAndReferences] Erro ao atualizar filtro e referências:', error);
    throw error;
  }
}
