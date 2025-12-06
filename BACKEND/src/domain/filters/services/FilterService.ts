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
  // Filtro de questões não respondidas
  unansweredFilter?: 'all' | 'unanswered_game' | 'unanswered_system';
  userId?: string;
  gameType?: string; // Ex: 'show_do_milhao', 'banco_questoes', etc.
  // Filtros opcionais para excluir questões
  excludeOutdated?: boolean; // Excluir questões desatualizadas
  excludeAnnulled?: boolean; // Excluir questões anuladas
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
   * Busca IDs de questões já respondidas pelo usuário
   * @param userId - ID do usuário
   * @param gameType - Tipo do jogo (opcional, para filtrar por jogo específico)
   * @returns Set com IDs das questões respondidas
   */
  async getAnsweredQuestionIds(userId: string, gameType?: string): Promise<Set<string>> {
    try {
      const answeredIds = new Set<string>();

      if (gameType) {
        // Buscar questões respondidas em um jogo específico
        if (gameType === 'show_do_milhao') {
          // Para Show do Milhão, buscar apenas questões que foram REALMENTE respondidas (no array answers)
          // Não usar question_ids porque inclui questões que o usuário não chegou a ver
          const { data, error } = await supabase
            .from('show_do_milhao_games')
            .select('answers')
            .eq('user_id', userId);

          if (error) {
            logger.error('[FilterService] Erro ao buscar questões do Show do Milhão:', error);
          } else {
            (data || []).forEach((game: any) => {
              const answers = game.answers || [];
              answers.forEach((answer: any) => {
                if (answer.questionId) answeredIds.add(answer.questionId);
              });
            });
          }
        }
        // Adicionar outros jogos aqui conforme necessário
      } else {
        // Buscar TODAS as questões respondidas no sistema
        // 1. Buscar da tabela question_responses (simulados, banco de questões, etc.)
        const { data: responses, error: responsesError } = await supabase
          .from('question_responses')
          .select('question_id')
          .eq('user_id', userId);

        if (responsesError) {
          logger.error('[FilterService] Erro ao buscar question_responses:', responsesError);
        } else {
          (responses || []).forEach((r: any) => {
            if (r.question_id) answeredIds.add(r.question_id);
          });
        }

        // 2. Também buscar do Show do Milhão (que não salva em question_responses)
        // Usar apenas questões REALMENTE respondidas (no array answers), não question_ids
        const { data: showGames, error: showError } = await supabase
          .from('show_do_milhao_games')
          .select('answers')
          .eq('user_id', userId);

        if (showError) {
          logger.error('[FilterService] Erro ao buscar show_do_milhao_games:', showError);
        } else {
          (showGames || []).forEach((game: any) => {
            const answers = game.answers || [];
            answers.forEach((answer: any) => {
              if (answer.questionId) answeredIds.add(answer.questionId);
            });
          });
        }
      }
      return answeredIds;
    } catch (error) {
      logger.error('[FilterService] Erro ao buscar questões respondidas:', error);
      return new Set<string>();
    }
  }

  /**
   * Conta questões baseado nos filtros selecionados
   * Lógica:
   * - Especialidades: OR entre si, AND com outros grupos
   * - Anos: OR entre si, AND com outros grupos
   * - Tipos de prova + Instituições: OR entre TODOS (soma)
   * - unansweredFilter: filtra questões não respondidas
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
        unansweredFilter = 'all',
        userId,
        gameType,
      } = params;



      if (filterIds.length === 0 && subFilterIds.length === 0 && years.length === 0 && institutions.length === 0) {
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



      // Buscar IDs de questões respondidas se necessário
      let answeredQuestionIds = new Set<string>();
      if (unansweredFilter !== 'all' && userId) {
        if (unansweredFilter === 'unanswered_game') {
          // Buscar questões respondidas APENAS no jogo específico
          answeredQuestionIds = await this.getAnsweredQuestionIds(userId, gameType);
        } else if (unansweredFilter === 'unanswered_system') {
          answeredQuestionIds = await this.getAnsweredQuestionIds(userId);
        }
      }

      // Buscar todas as questões publicadas e filtrar no código
      const { data: questions, error: fetchError } = await supabase
        .from('questions')
        .select('id, filter_ids, sub_filter_ids, is_outdated, is_annulled')
        .eq('status', 'published');

      if (fetchError) {
        throw new Error(`Erro ao buscar questões: ${fetchError.message}`);
      }

      const filtered = (questions || []).filter((q: any) => {
        const qFilterIds = q.filter_ids || [];
        const qSubFilterIds = q.sub_filter_ids || [];

        // Filtro de questões desatualizadas (opcional)
        if (params.excludeOutdated && q.is_outdated === true) {
          return false;
        }

        // Filtro de questões anuladas (opcional)
        if (params.excludeAnnulled && q.is_annulled === true) {
          return false;
        }

        // Filtro de questões não respondidas
        if (unansweredFilter !== 'all' && answeredQuestionIds.size > 0) {
          if (answeredQuestionIds.has(q.id)) return false;
        }

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
        unansweredFilter = 'all',
        userId,
        gameType,
      } = params;

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

      // Buscar IDs de questões respondidas se necessário
      let answeredQuestionIds = new Set<string>();
      if (unansweredFilter !== 'all' && userId) {
        if (unansweredFilter === 'unanswered_game') {
          answeredQuestionIds = await this.getAnsweredQuestionIds(userId, gameType);
        } else if (unansweredFilter === 'unanswered_system') {
          answeredQuestionIds = await this.getAnsweredQuestionIds(userId);
        }
      }

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

      // Filtrar no código com lógica AND entre grupos, OR dentro de cada grupo
      const filtered = (allQuestions || []).filter((q: any) => {
        const qFilterIds = q.filter_ids || [];
        const qSubFilterIds = q.sub_filter_ids || [];

        // Filtro de questões desatualizadas (opcional)
        if (params.excludeOutdated && q.is_outdated === true) {
          return false;
        }

        // Filtro de questões anuladas (opcional)
        if (params.excludeAnnulled && q.is_annulled === true) {
          return false;
        }

        // Filtro de questões não respondidas
        if (unansweredFilter !== 'all' && answeredQuestionIds.size > 0) {
          if (answeredQuestionIds.has(q.id)) return false;
        }

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

      const total = filtered.length;
      const offset = (page - 1) * limit;
      const paginatedQuestions = filtered.slice(offset, offset + limit);

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

  /**
   * Busca unificada de questões - detecta automaticamente se é ID ou texto
   * - Se parece UUID (contém hífens e hex) → busca por ID
   * - Senão → busca por texto com detecção de ano/instituição
   * Suporta paginação com page e limit
   */
  async searchQuestionsUnified(
    query: string,
    limit: number = 20,
    page: number = 1
  ): Promise<{
    questions: any[];
    total: number;
    page: number;
    totalPages: number;
    searchType: 'id' | 'text';
  }> {
    try {
      if (!query || query.trim().length < 2) {
        return { questions: [], total: 0, page: 1, totalPages: 0, searchType: 'text' };
      }

      const trimmedQuery = query.trim();

      // Detectar se parece um ID:
      // Apenas slug completo com hífens (ex: mulher-de-58-anos-com-diagnostico-MVYXAD)
      // Deve ter pelo menos 2 hífens e terminar com sufixo alfanumérico
      const looksLikeId = trimmedQuery.includes('-') && 
                          (trimmedQuery.match(/-/g) || []).length >= 2 &&
                          /^[a-z0-9-]+-[A-Za-z0-9]{4,}$/i.test(trimmedQuery);

      if (looksLikeId) {
        const result = await this.searchQuestionsById(trimmedQuery, limit);
        return { ...result, page: 1, totalPages: Math.ceil(result.total / limit), searchType: 'id' };
      }

      // Busca por texto com detecção de filtros
      const result = await this.searchQuestionsByText(trimmedQuery, limit, page);
      return { ...result, searchType: 'text' };
    } catch (error) {
      logger.error('[FilterService] Erro na busca unificada:', error);
      throw error;
    }
  }

  /**
   * Busca questões por texto (full-text search no enunciado)
   * Usa a coluna searchable_text com índice GIN para busca eficiente
   * Também detecta padrões de ano (ex: 2020) e instituição (ex: USP, SURCE) para filtrar por sub_filter_ids
   * Instituições são detectadas dinamicamente do banco de dados
   * Suporta paginação com page e limit
   */
  async searchQuestionsByText(
    textQuery: string,
    limit: number = 20,
    page: number = 1
  ): Promise<{
    questions: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      if (!textQuery || textQuery.trim().length < 2) {
        return { questions: [], total: 0, page: 1, totalPages: 0 };
      }

      const originalQuery = textQuery.trim();
      const offset = (page - 1) * limit;
      
      // Separar termos da busca (por espaço ou +)
      const terms = originalQuery.toLowerCase().split(/[\s+]+/).filter(t => t.length > 0);
      
      const yearFilters: string[] = [];
      const institutionFilters: string[] = [];
      const specialtyFilters: string[] = [];
      const textTerms: string[] = [];

      // Buscar instituições e especialidades disponíveis no banco
      const [availableInstitutions, availableSpecialties] = await Promise.all([
        this.getAvailableInstitutions(),
        this.getAvailableSpecialties(),
      ]);

      for (const term of terms) {
        // Detectar anos (4 dígitos entre 2000-2030)
        if (/^(20[0-3]\d)$/.test(term)) {
          yearFilters.push(`Ano da Prova_${term}`);
          continue;
        }
        
        // Detectar instituições dinamicamente
        const matchedInstitution = availableInstitutions.find(inst => 
          inst.toLowerCase().includes(term) || 
          inst.split('_').some(part => part.toLowerCase() === term)
        );
        
        if (matchedInstitution) {
          institutionFilters.push(matchedInstitution);
          continue;
        }

        // Detectar especialidades dinamicamente (ex: cardiologia, pediatria, trauma)
        const matchedSpecialties = availableSpecialties.filter(spec => {
          const specLower = spec.toLowerCase();
          const termLower = term.toLowerCase();
          // Match se o termo está em alguma parte do filtro (separado por _)
          return spec.split('_').some(part => 
            part.toLowerCase().includes(termLower) && termLower.length >= 3
          );
        });
        
        if (matchedSpecialties.length > 0) {
          // Pegar o filtro mais específico (mais longo) que faz match
          const bestMatch = matchedSpecialties.sort((a, b) => {
            // Priorizar matches exatos em partes do filtro
            const aExact = a.split('_').some(p => p.toLowerCase() === term);
            const bExact = b.split('_').some(p => p.toLowerCase() === term);
            if (aExact && !bExact) return -1;
            if (!aExact && bExact) return 1;
            // Depois priorizar filtros mais curtos (mais genéricos = mais resultados)
            return a.length - b.length;
          })[0];
          specialtyFilters.push(bestMatch);
          continue;
        }

        // Termo de texto normal (não é filtro)
        textTerms.push(term);
      }

      const hasFilters = yearFilters.length > 0 || institutionFilters.length > 0 || specialtyFilters.length > 0;
      const hasTextSearch = textTerms.length > 0;

      // Se só tem filtros (ano/instituição/especialidade), buscar diretamente por sub_filter_ids
      if (hasFilters && !hasTextSearch) {
        return this.searchByFiltersOnly(yearFilters, institutionFilters, limit, page, specialtyFilters);
      }

      // Se tem filtros + texto, combinar ambos
      if (hasFilters && hasTextSearch) {
        return this.searchByFiltersAndText(yearFilters, institutionFilters, textTerms.join(' '), limit, page, specialtyFilters);
      }

      // Busca normal por texto (sem filtros detectados)
      const searchTerms = originalQuery.toLowerCase();
      
      const { data, error, count } = await supabase
        .from('questions')
        .select('id, content, title, filter_ids, sub_filter_ids, tags, difficulty, options, correct_answer, explanation, professor_comment, is_annulled, is_outdated', { count: 'exact' })
        .eq('status', 'published')
        .textSearch('searchable_text', searchTerms, {
          type: 'websearch',
          config: 'portuguese'
        })
        .range(offset, offset + limit - 1);

      if (error) {
        logger.warn('[FilterService] Full-text search falhou, usando fallback ILIKE:', error);
        
        const { data: fallbackData, error: fallbackError, count: fallbackCount } = await supabase
          .from('questions')
          .select('id, content, title, filter_ids, sub_filter_ids, tags, difficulty, options, correct_answer, explanation, professor_comment, is_annulled, is_outdated', { count: 'exact' })
          .eq('status', 'published')
          .ilike('content', `%${searchTerms}%`)
          .range(offset, offset + limit - 1);

        if (fallbackError) {
          logger.error('[FilterService] Erro no fallback de busca por texto:', fallbackError);
          throw new Error('Erro ao buscar questões por texto');
        }

        const total = fallbackCount || 0;
        return {
          questions: fallbackData || [],
          total,
          page,
          totalPages: Math.ceil(total / limit),
        };
      }

      const total = count || 0;
      return {
        questions: data || [],
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error('[FilterService] Erro ao buscar questões por texto:', error);
      throw error;
    }
  }

  /**
   * Busca questões apenas por filtros de ano, instituição e especialidade
   */
  private async searchByFiltersOnly(
    yearFilters: string[],
    institutionFilters: string[],
    limit: number,
    page: number = 1,
    specialtyFilters: string[] = []
  ): Promise<{ questions: any[]; total: number; page: number; totalPages: number }> {
    try {
      const offset = (page - 1) * limit;
      
      // Buscar todas as questões e filtrar em memória para combinar AND/OR corretamente
      const { data: allData, error } = await supabase
        .from('questions')
        .select('id, content, title, filter_ids, sub_filter_ids, tags, difficulty, options, correct_answer, explanation, professor_comment, is_annulled, is_outdated')
        .eq('status', 'published')
        .limit(2000);

      if (error) {
        logger.error('[FilterService] Erro ao buscar por filtros:', error);
        throw new Error('Erro ao buscar questões por filtros');
      }

      // Filtrar em memória: AND entre grupos (ano, instituição, especialidade), OR dentro de cada grupo
      const filtered = (allData || []).filter(q => {
        const subFilters = q.sub_filter_ids || [];
        
        // Ano: deve ter pelo menos um dos anos (se especificado)
        const matchesYear = yearFilters.length === 0 || 
          yearFilters.some(y => subFilters.includes(y));
        
        // Instituição: deve ter pelo menos uma das instituições (se especificado)
        const matchesInstitution = institutionFilters.length === 0 || 
          institutionFilters.some(i => subFilters.some((sf: string) => sf.includes(i)));
        
        // Especialidade: deve ter pelo menos uma das especialidades (se especificado)
        const matchesSpecialty = specialtyFilters.length === 0 || 
          specialtyFilters.some(s => subFilters.some((sf: string) => sf.startsWith(s) || sf === s));
        
        return matchesYear && matchesInstitution && matchesSpecialty;
      });

      const total = filtered.length;
      return {
        questions: filtered.slice(offset, offset + limit),
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error('[FilterService] Erro ao buscar por filtros:', error);
      throw error;
    }
  }

  /**
   * Busca questões combinando filtros de ano/instituição/especialidade com busca de texto
   */
  private async searchByFiltersAndText(
    yearFilters: string[],
    institutionFilters: string[],
    textQuery: string,
    limit: number,
    page: number = 1,
    specialtyFilters: string[] = []
  ): Promise<{ questions: any[]; total: number; page: number; totalPages: number }> {
    try {
      // Primeiro buscar por texto (buscar todos para filtrar depois)
      const { data: textResults, error: textError } = await supabase
        .from('questions')
        .select('id, content, title, filter_ids, sub_filter_ids, tags, difficulty, options, correct_answer, explanation, professor_comment, is_annulled, is_outdated')
        .eq('status', 'published')
        .textSearch('searchable_text', textQuery, {
          type: 'websearch',
          config: 'portuguese'
        })
        .limit(1000); // Buscar mais para depois filtrar

      if (textError) {
        logger.error('[FilterService] Erro na busca por texto:', textError);
        throw new Error('Erro ao buscar questões');
      }

      if (!textResults || textResults.length === 0) {
        return { questions: [], total: 0, page: 1, totalPages: 0 };
      }

      // Filtrar resultados pelos filtros de ano, instituição e especialidade
      const filtered = textResults.filter(q => {
        const subFilters = q.sub_filter_ids || [];
        
        // Verificar se tem pelo menos um dos anos (se especificado)
        const matchesYear = yearFilters.length === 0 || 
          yearFilters.some(y => subFilters.includes(y));
        
        // Verificar se tem pelo menos uma das instituições (se especificado)
        const matchesInstitution = institutionFilters.length === 0 || 
          institutionFilters.some(i => subFilters.some((sf: string) => sf.includes(i)));
        
        // Verificar se tem pelo menos uma das especialidades (se especificado)
        const matchesSpecialty = specialtyFilters.length === 0 || 
          specialtyFilters.some(s => subFilters.some((sf: string) => sf.startsWith(s) || sf === s));
        
        return matchesYear && matchesInstitution && matchesSpecialty;
      });

      const total = filtered.length;
      const offset = (page - 1) * limit;
      
      return {
        questions: filtered.slice(offset, offset + limit),
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error('[FilterService] Erro ao buscar por filtros e texto:', error);
      throw error;
    }
  }

  /**
   * Busca questões por ID (parcial ou completo)
   * Permite buscar pelo ID completo ou pelos últimos caracteres (sufixo)
   */
  async searchQuestionsById(idQuery: string, limit: number = 20): Promise<{
    questions: any[];
    total: number;
  }> {
    try {
      if (!idQuery || idQuery.trim().length < 2) {
        return { questions: [], total: 0 };
      }

      const searchId = idQuery.trim();
      
      // Buscar questões cujo ID contém o termo de busca (case-insensitive)
      const { data, error, count } = await supabase
        .from('questions')
        .select('id, content, title, filter_ids, sub_filter_ids, tags, difficulty, options, correct_answer, explanation, professor_comment, is_annulled, is_outdated', { count: 'exact' })
        .eq('status', 'published')
        .ilike('id', `%${searchId}%`)
        .limit(limit);

      if (error) {
        logger.error('[FilterService] Erro ao buscar questões por ID:', error);
        throw new Error('Erro ao buscar questões por ID');
      }

      return {
        questions: data || [],
        total: count || 0,
      };
    } catch (error) {
      logger.error('[FilterService] Erro ao buscar questões por ID:', error);
      throw error;
    }
  }

  // Cache para instituições disponíveis
  private institutionsCache: string[] | null = null;
  private institutionsCacheTime: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutos

  /**
   * Busca instituições disponíveis no banco de dados
   * Retorna lista de sub_filter_ids que começam com "Universidade_"
   * Usa cache de 5 minutos para evitar queries repetidas
   */
  private async getAvailableInstitutions(): Promise<string[]> {
    // Usar fallback direto (mais confiável que RPC)
    return this.getAvailableInstitutionsFallback();
  }

  /**
   * Fallback para buscar instituições sem RPC
   */
  private async getAvailableInstitutionsFallback(): Promise<string[]> {
    try {
      // Verificar cache
      if (this.institutionsCache && Date.now() - this.institutionsCacheTime < this.CACHE_TTL) {
        return this.institutionsCache;
      }

      // Buscar uma amostra de questões e extrair instituições únicas
      const { data, error } = await supabase
        .from('questions')
        .select('sub_filter_ids')
        .not('sub_filter_ids', 'is', null)
        .limit(1000);

      if (error) {
        logger.error('[FilterService] Erro no fallback de instituições:', error);
        return [];
      }

      const institutionsSet = new Set<string>();
      
      for (const row of data || []) {
        const subFilters = row.sub_filter_ids || [];
        for (const sf of subFilters) {
          if (typeof sf === 'string' && sf.startsWith('Universidade_')) {
            institutionsSet.add(sf);
          }
        }
      }

      const institutions = Array.from(institutionsSet);
      
      // Atualizar cache
      this.institutionsCache = institutions;
      this.institutionsCacheTime = Date.now();

      return institutions;
    } catch (error) {
      logger.error('[FilterService] Erro no fallback de instituições:', error);
      return [];
    }
  }

  // Cache para especialidades disponíveis
  private specialtiesCache: string[] | null = null;
  private specialtiesCacheTime: number = 0;

  /**
   * Busca especialidades disponíveis no banco de dados
   * Retorna lista de sub_filter_ids que são especialidades (não são Universidade_ nem Ano da Prova_)
   * Usa cache de 5 minutos para evitar queries repetidas
   */
  private async getAvailableSpecialties(): Promise<string[]> {
    // Usar fallback direto (mais confiável que RPC)
    return this.getAvailableSpecialtiesFallback();
  }

  /**
   * Fallback para buscar especialidades sem RPC
   */
  private async getAvailableSpecialtiesFallback(): Promise<string[]> {
    try {
      // Verificar cache
      if (this.specialtiesCache && Date.now() - this.specialtiesCacheTime < this.CACHE_TTL) {
        return this.specialtiesCache;
      }

      // Buscar uma amostra de questões e extrair especialidades únicas
      const { data, error } = await supabase
        .from('questions')
        .select('sub_filter_ids')
        .not('sub_filter_ids', 'is', null)
        .limit(1000);

      if (error) {
        logger.error('[FilterService] Erro no fallback de especialidades:', error);
        return [];
      }

      const specialtiesSet = new Set<string>();
      
      for (const row of data || []) {
        const subFilters = row.sub_filter_ids || [];
        for (const sf of subFilters) {
          if (typeof sf === 'string' && 
              !sf.startsWith('Universidade_') && 
              !sf.startsWith('Ano da Prova_')) {
            specialtiesSet.add(sf);
          }
        }
      }

      const specialties = Array.from(specialtiesSet);
      
      // Atualizar cache
      this.specialtiesCache = specialties;
      this.specialtiesCacheTime = Date.now();

      return specialties;
    } catch (error) {
      logger.error('[FilterService] Erro no fallback de especialidades:', error);
      return [];
    }
  }
}
