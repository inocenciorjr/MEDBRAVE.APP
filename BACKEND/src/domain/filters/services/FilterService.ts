import { supabase } from '../../../config/supabaseAdmin';
import logger from '../../../utils/logger';

export interface Filter {
  id: string;
  name: string;
  level: number;
  is_active: boolean;
  order?: number;
}

export interface SubFilter {
  id: string;
  name: string;
  filter_id: string;
  parent_id: string | null;
  level: number;
  is_active: boolean;
  order?: number;
}

export interface FilterHierarchy extends Filter {
  children?: SubFilter[];
}

export interface SearchQuestionsParams {
  filterIds?: string[];
  subFilterIds?: string[];
  years?: number[];
  institutions?: string[];
  page?: number;
  limit?: number;
}

export class FilterService {
  /**
   * Busca filtros de especialidades médicas (MEDICAL_SPECIALTY)
   * Estes são os filtros que aparecem no step de "Assuntos"
   */
  async getMedicalSpecialtyFilters(): Promise<Filter[]> {
    try {
      const { data, error } = await supabase
        .from('filters')
        .select('id, name, level, is_active, order')
        .eq('category', 'MEDICAL_SPECIALTY')
        .eq('level', 0)
        .eq('is_active', true)
        .order('order', { ascending: true });

      if (error) {
        logger.error('[FilterService] Erro ao buscar filtros de especialidades:', error);
        throw new Error('Erro ao buscar filtros de especialidades');
      }

      return data || [];
    } catch (error) {
      logger.error('[FilterService] Erro ao buscar filtros de especialidades:', error);
      throw error;
    }
  }

  /**
   * Busca todos os filtros raiz (level = 0) - mantido para compatibilidade
   */
  async getRootFilters(): Promise<Filter[]> {
    try {
      const { data, error } = await supabase
        .from('filters')
        .select('id, name, level, is_active, order, category')
        .eq('level', 0)
        .eq('is_active', true)
        .order('order', { ascending: true });

      if (error) {
        logger.error('[FilterService] Erro ao buscar filtros raiz:', error);
        throw new Error('Erro ao buscar filtros raiz');
      }

      // logger.info(`[FilterService] getRootFilters retornou ${data?.length || 0} filtros: ${data?.map(f => f.name).join(', ')}`);

      return data || [];
    } catch (error) {
      logger.error('[FilterService] Erro ao buscar filtros raiz:', error);
      throw error;
    }
  }

  /**
   * Busca subfiltros de um filtro específico
   */
  async getSubfiltersByFilter(
    filterId: string,
    level?: number,
  ): Promise<SubFilter[]> {
    try {
      let query = supabase
        .from('sub_filters')
        .select('id, name, filter_id, parent_id, level, is_active, order')
        .eq('filter_id', filterId)
        .eq('is_active', true);

      if (level !== undefined) {
        query = query.eq('level', level);
      }

      query = query.order('order', { ascending: true });

      const { data, error } = await query;

      if (error) {
        logger.error('[FilterService] Erro ao buscar subfiltros:', error);
        throw new Error('Erro ao buscar subfiltros');
      }

      return data || [];
    } catch (error) {
      logger.error('[FilterService] Erro ao buscar subfiltros:', error);
      throw error;
    }
  }

  /**
   * Busca hierarquia completa de filtros com todos os subfiltros (recursivo)
   */
  async getFilterHierarchy(): Promise<FilterHierarchy[]> {
    try {
      // Buscar filtros raiz
      const filters = await this.getRootFilters();

      // logger.info(`[FilterService] getFilterHierarchy - Processando ${filters.length} filtros raiz`);

      // Buscar todos os subfiltros para cada filtro (recursivamente)
      const hierarchy = await Promise.all(
        filters.map(async (filter) => {
          const children = await this.buildSubfilterHierarchy(filter.id);
          // logger.info(`[FilterService] Filtro "${filter.name}" tem ${children.length} subfiltros de nível 1`);
          return {
            ...filter,
            children,
          };
        }),
      );

      // logger.info(`[FilterService] getFilterHierarchy retornou hierarquia com ${hierarchy.length} filtros`);
      return hierarchy;
    } catch (error) {
      logger.error('[FilterService] Erro ao buscar hierarquia:', error);
      throw error;
    }
  }

  /**
   * Constrói hierarquia recursiva de subfiltros
   * Nota: Não filtra por is_active para mostrar toda a hierarquia
   */
  private async buildSubfilterHierarchy(filterId: string, parentId: string | null = null): Promise<any[]> {
    try {
      // Buscar TODOS os subfiltros deste filtro de uma vez
      const { data, error } = await supabase
        .from('sub_filters')
        .select('id, name, filter_id, parent_id, level, is_active, order')
        .eq('filter_id', filterId)
        // Removido filtro is_active para mostrar toda a hierarquia
        .order('order', { ascending: true });

      if (error) {
        logger.error('[FilterService] Erro ao buscar subfiltros recursivos:', error);
        return [];
      }

      if (!data || data.length === 0) return [];

      // No primeiro nível, buscar subfiltros cujo parent_id é o próprio filterId
      const targetParentId = parentId === null ? filterId : parentId;

      // Filtrar apenas os subfiltros do nível atual
      const currentLevelSubfilters = data.filter(sf => sf.parent_id === targetParentId);

      // Função recursiva interna para construir a árvore
      const buildChildren = (subfilters: any[], allData: any[]): any[] => {
        return subfilters.map(subfilter => {
          // Buscar filhos deste subfiltro
          const children = allData.filter(sf => sf.parent_id === subfilter.id);

          return {
            ...subfilter,
            children: children.length > 0 ? buildChildren(children, allData) : undefined,
          };
        });
      };

      return buildChildren(currentLevelSubfilters, data);
    } catch (error) {
      logger.error('[FilterService] Erro ao construir hierarquia recursiva:', error);
      return [];
    }
  }

  /**
   * Conta questões por filtro
   */
  async countQuestionsByFilter(filterId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .contains('filter_ids', [filterId])
        .eq('status', 'published');

      if (error) {
        logger.error('[FilterService] Erro ao contar questões:', error);
        throw new Error('Erro ao contar questões');
      }

      return count || 0;
    } catch (error) {
      logger.error('[FilterService] Erro ao contar questões:', error);
      throw error;
    }
  }

  /**
   * Busca anos disponíveis com hierarquia (subfiltros de "Ano da Prova")
   * Retorna anos principais e seus subanos (ex: 2025 -> 2025.1, 2025.2)
   * Nota: Não filtra por is_active para mostrar todos os anos disponíveis
   */
  async getAvailableYears(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('sub_filters')
        .select('id, name, parent_id')
        .eq('filter_id', 'Ano da Prova')
        // Removido filtro is_active para mostrar todos os anos
        .order('name', { ascending: false });

      if (error) {
        logger.error('[FilterService] Erro ao buscar anos:', error);
        throw new Error('Erro ao buscar anos');
      }

      if (!data) return [];

      // Separar anos principais (parent_id = 'Ano da Prova') e subanos
      const mainYears = data.filter(item => item.parent_id === 'Ano da Prova');
      const subYears = data.filter(item => item.parent_id !== 'Ano da Prova');

      // Construir hierarquia
      const hierarchy = mainYears.map(year => {
        const children = subYears
          .filter(sub => sub.parent_id === year.id)
          .map(sub => ({
            id: sub.id,
            name: sub.name,
          }));

        return {
          id: year.id,
          name: year.name,
          children: children.length > 0 ? children : undefined,
        };
      });

      return hierarchy;
    } catch (error) {
      logger.error('[FilterService] Erro ao buscar anos:', error);
      throw error;
    }
  }

  /**
   * Busca hierarquia de instituições (estados e universidades)
   * Retorna estados como nível 1 e universidades como filhos
   */
  async getInstitutionHierarchy(): Promise<Array<{
    id: string;
    name: string;
    type: 'state' | 'institution';
    children?: Array<{
      id: string;
      name: string;
      type: 'institution';
    }>;
  }>> {
    try {
      // Buscar todos os subfiltros de Universidade
      const { data, error } = await supabase
        .from('sub_filters')
        .select('id, name, parent_id')
        .eq('filter_id', 'Universidade')
        // Removido filtro is_active para mostrar todas as instituições
        .order('name', { ascending: true });

      if (error) {
        logger.error('[FilterService] Erro ao buscar instituições:', error);
        throw new Error('Erro ao buscar instituições');
      }

      // Separar estados (parent_id = 'Universidade') e universidades
      const states = (data || []).filter(item => item.parent_id === 'Universidade');
      const institutions = (data || []).filter(item => item.parent_id !== 'Universidade');

      // Construir hierarquia
      return states.map(state => ({
        id: state.id,
        name: state.name,
        type: 'state' as const,
        children: institutions
          .filter(inst => inst.parent_id === state.id)
          .map(inst => ({
            id: inst.id,
            name: inst.name,
            type: 'institution' as const,
          })),
      }));
    } catch (error) {
      logger.error('[FilterService] Erro ao buscar hierarquia de instituições:', error);
      throw error;
    }
  }

  /**
   * Conta questões baseado nos filtros selecionados
   * Lógica:
   * - Especialidades: OR entre si, AND com outros grupos
   * - Anos: OR entre si, AND com outros grupos
   * - Tipos de prova + Instituições: OR entre TODOS (soma)
   * 
   * Exemplo 1: Revalida + USP = questões do Revalida OU da USP
   * Exemplo 2: Cardiologia + 2025 + Revalida + USP = Cardiologia AND 2025 AND (Revalida OR USP)
   */
  async countQuestionsByFilters(params: SearchQuestionsParams): Promise<number> {
    try {
      const {
        filterIds = [],
        subFilterIds = [],
        years = [],
        institutions = [],
      } = params;

      logger.info('[FilterService] countQuestionsByFilters chamado com:', {
        filterIds,
        subFilterIds,
        years,
        institutions,
      });

      // Se não tem nenhum filtro, retorna 0
      if (filterIds.length === 0 && subFilterIds.length === 0 && years.length === 0 && institutions.length === 0) {
        logger.info('[FilterService] Nenhum filtro selecionado, retornando 0');
        return 0;
      }

      // Preparar IDs de anos
      const yearIds = years.map(year => {
        const yearStr = year.toString();
        if (yearStr.includes('.')) {
          const baseYear = Math.floor(year);
          return `Ano da Prova_${baseYear}_${yearStr}`;
        }
        return `Ano da Prova_${year}`;
      });

      // Separar tipos de prova (filtros especiais) de especialidades
      const examTypes = ['Revalida', 'R3', 'Residência Médica', 'Provas Irmãs ( Revalida)'];
      const selectedExamTypes = filterIds.filter(id => examTypes.includes(id));
      const selectedSpecialties = filterIds.filter(id => !examTypes.includes(id));

      logger.info('[FilterService] Filtros separados para contagem:', {
        selectedExamTypes,
        selectedSpecialties,
        yearIds,
        institutions,
      });

      // Buscar todas as questões publicadas e filtrar no código
      const { data: questions, error: fetchError } = await supabase
        .from('questions')
        .select('filter_ids, sub_filter_ids')
        .eq('status', 'published');

      if (fetchError) {
        throw new Error(`Erro ao buscar questões: ${fetchError.message}`);
      }

      const filtered = (questions || []).filter((q: any) => {
        const qFilterIds = q.filter_ids || [];
        const qSubFilterIds = q.sub_filter_ids || [];

        // Grupo 1: Especialidades (filterIds que não são tipos de prova) - OR dentro do grupo
        if (selectedSpecialties.length > 0) {
          const hasSpecialty = selectedSpecialties.some(id => qFilterIds.includes(id));
          if (!hasSpecialty) return false;
        }

        // Grupo 2: SubFiltros (especialidades mais específicas) - OR dentro do grupo
        if (subFilterIds.length > 0) {
          const hasSubFilter = subFilterIds.some(id => qSubFilterIds.includes(id));
          if (!hasSubFilter) return false;
        }

        // Grupo 3: Anos - OR dentro do grupo
        if (yearIds.length > 0) {
          const hasYear = yearIds.some(id => qSubFilterIds.includes(id));
          if (!hasYear) return false;
        }

        // Grupo 4: Tipos de Prova + Instituições - OR entre TODOS (soma)
        // Se tiver tipos de prova OU instituições selecionados, a questão deve ter pelo menos um deles
        if (selectedExamTypes.length > 0 || institutions.length > 0) {
          const hasExamType = selectedExamTypes.length > 0 && selectedExamTypes.some(id => qFilterIds.includes(id));
          const hasInst = institutions.length > 0 && institutions.some(id => qSubFilterIds.includes(id));
          
          // Precisa ter pelo menos um: tipo de prova OU instituição
          if (!hasExamType && !hasInst) return false;
        }

        return true;
      });

      logger.info('[FilterService] countQuestionsByFilters resultado:', {
        totalQuestionsInDB: questions?.length || 0,
        filteredCount: filtered.length,
      });

      return filtered.length;
    } catch (error: any) {
      logger.error('[FilterService] Erro ao contar questões:', error);
      throw error;
    }
  }

  /**
   * Busca questões por filtros e subfiltros
   * 
   * Lógica de filtragem:
   * - Se NENHUM filtro selecionado: retorna 0 questões
   * - Especialidades: OR entre si, AND com outros grupos
   * - Anos: OR entre si, AND com outros grupos
   * - Tipos de prova + Instituições: OR entre TODOS (soma)
   * 
   * Exemplo 1: Revalida + USP = questões do Revalida OU da USP
   * Exemplo 2: Cardiologia + 2025 + Revalida + USP = Cardiologia AND 2025 AND (Revalida OR USP)
   */
  async searchQuestions(params: SearchQuestionsParams) {
    try {
      const {
        filterIds = [],
        subFilterIds = [],
        years = [],
        institutions = [],
        page = 1,
        limit = 20,
      } = params;

      logger.info('[FilterService] searchQuestions chamado com:', {
        filterIds,
        subFilterIds,
        years,
        institutions,
        page,
        limit,
      });

      // Se não tem nenhum filtro, retorna vazio
      if (filterIds.length === 0 && subFilterIds.length === 0 && years.length === 0 && institutions.length === 0) {
        return {
          questions: [],
          total: 0,
          page,
          limit,
          totalPages: 0,
        };
      }

      // Preparar IDs de anos
      const yearIds = years.map(year => {
        const yearStr = year.toString();
        if (yearStr.includes('.')) {
          const baseYear = Math.floor(year);
          return `Ano da Prova_${baseYear}_${yearStr}`;
        }
        return `Ano da Prova_${year}`;
      });

      // Buscar todas as questões publicadas
      const { data: allQuestions, error } = await supabase
        .from('questions')
        .select('*')
        .eq('status', 'published')
        .limit(10000); // Limite alto para buscar todas

      if (error) {
        logger.error('[FilterService] Erro ao buscar questões:', error);
        throw new Error('Erro ao buscar questões');
      }

      // Separar tipos de prova de especialidades
      const examTypes = ['Revalida', 'R3', 'Residência Médica', 'Provas Irmãs ( Revalida)'];
      const selectedExamTypes = filterIds.filter(id => examTypes.includes(id));
      const selectedSpecialties = filterIds.filter(id => !examTypes.includes(id));

      logger.info('[FilterService] Filtros separados:', {
        selectedExamTypes,
        selectedSpecialties,
        subFilterIds,
        yearIds,
        institutions,
      });

      // Filtrar no código com lógica AND entre grupos, OR dentro de cada grupo
      const filtered = (allQuestions || []).filter((q: any) => {
        const qFilterIds = q.filter_ids || [];
        const qSubFilterIds = q.sub_filter_ids || [];

        // Grupo 1: Especialidades (filterIds que não são tipos de prova) - OR dentro do grupo
        if (selectedSpecialties.length > 0) {
          const hasSpecialty = selectedSpecialties.some(id => qFilterIds.includes(id));
          if (!hasSpecialty) return false;
        }

        // Grupo 2: SubFiltros (especialidades mais específicas) - OR dentro do grupo
        if (subFilterIds.length > 0) {
          const hasSubFilter = subFilterIds.some(id => qSubFilterIds.includes(id));
          if (!hasSubFilter) return false;
        }

        // Grupo 3: Anos - OR dentro do grupo
        if (yearIds.length > 0) {
          const hasYear = yearIds.some(id => qSubFilterIds.includes(id));
          if (!hasYear) return false;
        }

        // Grupo 4: Tipos de Prova + Instituições - OR entre TODOS (soma)
        // Se tiver tipos de prova OU instituições selecionados, a questão deve ter pelo menos um deles
        if (selectedExamTypes.length > 0 || institutions.length > 0) {
          const hasExamType = selectedExamTypes.length > 0 && selectedExamTypes.some(id => qFilterIds.includes(id));
          const hasInst = institutions.length > 0 && institutions.some(id => qSubFilterIds.includes(id));
          
          // Precisa ter pelo menos um: tipo de prova OU instituição
          if (!hasExamType && !hasInst) return false;
        }

        return true;
      });

      // Paginar
      const total = filtered.length;
      const offset = (page - 1) * limit;
      const paginatedQuestions = filtered.slice(offset, offset + limit);

      logger.info('[FilterService] searchQuestions resultado:', {
        totalQuestionsInDB: allQuestions?.length || 0,
        filteredCount: total,
        returnedCount: paginatedQuestions.length,
      });

      return {
        questions: paginatedQuestions,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error('[FilterService] Erro ao buscar questões:', error);
      throw error;
    }
  }

  /**
   * Busca questões por lista de IDs
   */
  async getQuestionsByIds(questionIds: string[]): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .in('id', questionIds);

      if (error) {
        logger.error('[FilterService] Erro ao buscar questões por IDs:', error);
        throw new Error('Erro ao buscar questões por IDs');
      }

      // Manter a ordem dos IDs fornecidos
      const orderedQuestions = questionIds
        .map(id => data?.find(q => q.id === id))
        .filter(q => q !== undefined);

      return orderedQuestions;
    } catch (error) {
      logger.error('[FilterService] Erro ao buscar questões por IDs:', error);
      throw error;
    }
  }
}
