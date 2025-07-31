import { db } from './firebase';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';

const FILTERS_COLLECTION = 'filters';
const SUBFILTERS_COLLECTION = 'subFilters';

// Tipos
export interface Filter {
  id: string;
  name: string;
  description?: string;
  category: string;
  status?: string;
  isGlobal?: boolean;
  filterType?: string;
  createdAt?: Date;
  updatedAt?: Date;
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
  createdAt?: Date;
  updatedAt?: Date;
  children?: SubFilter[];
}

// Utilitário para converter dados Firestore para JS
function parseDoc<T = any>(docSnap: QueryDocumentSnapshot<DocumentData>): T {
  const data = docSnap.data();
  return {
    ...data,
    id: docSnap.id,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
  } as T;
}

export async function getAllFiltersAndSubFilters(): Promise<Filter[]> {
  // Busca todos os filtros e subfiltros e monta a árvore
  const [filtersSnap, subFiltersSnap] = await Promise.all([
    getDocs(collection(db, FILTERS_COLLECTION)),
    getDocs(collection(db, SUBFILTERS_COLLECTION)),
  ]);
  const filters = filtersSnap.docs.map(doc => parseDoc<Filter>(doc));
  const subFilters = subFiltersSnap.docs.map(doc => parseDoc<SubFilter>(doc));

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

export async function createFilter(filter: Omit<Filter, 'createdAt' | 'updatedAt' | 'children'>): Promise<Filter> {
  const now = Timestamp.now();
  const ref = filter.id ? doc(collection(db, FILTERS_COLLECTION), filter.id) : doc(collection(db, FILTERS_COLLECTION));
  await setDoc(ref, {
    ...filter,
    id: ref.id,
    createdAt: now,
    updatedAt: now,
  });
  return { ...filter, id: ref.id, createdAt: now.toDate(), updatedAt: now.toDate() };
}

export async function updateFilter(filter: Partial<Filter> & { id: string }): Promise<void> {
  if (!filter.id) throw new Error('ID do filtro é obrigatório');
  const ref = doc(db, FILTERS_COLLECTION, filter.id);
  await updateDoc(ref, {
    ...filter,
    updatedAt: Timestamp.now(),
  });
}

export async function deleteFilter(id: string): Promise<void> {
  if (!id) throw new Error('ID do filtro é obrigatório');
  // Deleta subfiltros relacionados
  const subFiltersSnap = await getDocs(query(collection(db, SUBFILTERS_COLLECTION), where('filterId', '==', id)));
  const batch = writeBatch(db);
  subFiltersSnap.forEach(docSnap => batch.delete(docSnap.ref));
  batch.delete(doc(db, FILTERS_COLLECTION, id));
  await batch.commit();
}

export async function createSubFilter(subfilter: Omit<SubFilter, 'createdAt' | 'updatedAt' | 'children'>): Promise<SubFilter> {
  const now = Timestamp.now();
  const ref = subfilter.id ? doc(collection(db, SUBFILTERS_COLLECTION), subfilter.id) : doc(collection(db, SUBFILTERS_COLLECTION));
  await setDoc(ref, {
    ...subfilter,
    id: ref.id,
    createdAt: now,
    updatedAt: now,
  });
  return { ...subfilter, id: ref.id, createdAt: now.toDate(), updatedAt: now.toDate() };
}

export async function updateSubFilter(subfilter: Partial<SubFilter> & { id: string }): Promise<void> {
  if (!subfilter.id) throw new Error('ID do subfiltro é obrigatório');
  const ref = doc(db, SUBFILTERS_COLLECTION, subfilter.id);
  await updateDoc(ref, {
    ...subfilter,
    updatedAt: Timestamp.now(),
  });
}

export async function deleteSubFilter(id: string): Promise<void> {
  if (!id) throw new Error('ID do subfiltro é obrigatório');
  // Deleta subfiltros filhos recursivamente
  const subFiltersSnap = await getDocs(query(collection(db, SUBFILTERS_COLLECTION), where('parentId', '==', id)));
  const batch = writeBatch(db);
  subFiltersSnap.forEach(docSnap => batch.delete(docSnap.ref));
  batch.delete(doc(db, SUBFILTERS_COLLECTION, id));
  await batch.commit();
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
    // Firebase permite máximo 10 IDs por operação "in", então dividimos em chunks
    const chunks: string[][] = [];
    for (let i = 0; i < filterIds.length; i += 10) {
      chunks.push(filterIds.slice(i, i + 10));
    }

    const allFilters: Filter[] = [];

    // Executar busca para cada chunk em paralelo
    await Promise.all(chunks.map(async (chunk) => {
      const q = query(
        collection(db, FILTERS_COLLECTION),
        where('__name__', 'in', chunk)
      );
      
      const querySnapshot = await getDocs(q);
      
      querySnapshot.docs.forEach(doc => {
        const filterData = parseDoc<Filter>(doc);
        allFilters.push(filterData);
      });
    }));



    // Manter a ordem original dos IDs fornecidos
    const orderedFilters = filterIds.map(id => allFilters.find(f => f.id === id)).filter(Boolean) as Filter[];

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
    // Firebase permite máximo 10 IDs por operação "in", então dividimos em chunks
    const chunks: string[][] = [];
    for (let i = 0; i < subFilterIds.length; i += 10) {
      chunks.push(subFilterIds.slice(i, i + 10));
    }

    const allSubFilters: SubFilter[] = [];

    // Executar busca para cada chunk em paralelo
    await Promise.all(chunks.map(async (chunk) => {
      const q = query(
        collection(db, SUBFILTERS_COLLECTION),
        where('__name__', 'in', chunk)
      );
      
      const querySnapshot = await getDocs(q);
      
      querySnapshot.docs.forEach(doc => {
        const subFilterData = parseDoc<SubFilter>(doc);
        allSubFilters.push(subFilterData);
      });
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

  const now = Timestamp.now();
  // 1. Criar novo filtro com novo id
  const newFilterData = {
    ...oldFilter,
    id: newId,
    name: newName,
    createdAt: oldFilter.createdAt || now,
    updatedAt: now,
  };
  const newFilterRef = doc(collection(db, FILTERS_COLLECTION), newId);
  await setDoc(newFilterRef, newFilterData);

  // 2. Buscar todos os subfiltros
  const subFiltersSnap = await getDocs(collection(db, SUBFILTERS_COLLECTION));
  const batch = writeBatch(db);
  const oldPrefix = oldFilter.id + '_';
  const newPrefix = newId + '_';

  subFiltersSnap.forEach(docSnap => {
    const data = docSnap.data();
    // Use sempre o id do documento como id principal
    const originalId = docSnap.id;
    let updated = false;
    let newSubId = originalId;
    let newParentId = data.parentId;
    let newFilterId = data.filterId;

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
    // Se houve atualização, criar novo doc e remover o antigo
    if (updated && newSubId) {
      const newSubData = {
        ...data,
        id: newSubId, // sempre garantir o campo id
        parentId: newParentId,
        filterId: newFilterId,
        updatedAt: now,
      };
      const newSubRef = doc(collection(db, SUBFILTERS_COLLECTION), newSubId);
      batch.set(newSubRef, newSubData);
      batch.delete(doc(db, SUBFILTERS_COLLECTION, originalId));
    }
  });

  // 3. Deletar filtro antigo
  batch.delete(doc(db, FILTERS_COLLECTION, oldFilter.id));

  // 4. Commitar batch
  await batch.commit();
} 