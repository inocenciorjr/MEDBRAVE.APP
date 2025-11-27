import api from './api';
import { OfficialExam, ExamInstitution } from '@/types/official-exams';
import { getStateName } from '@/lib/utils/stateNames';

/**
 * Service para gerenciar provas oficiais
 * Usa o proxy /api/official-exams que já está configurado no backend
 */
export const officialExamService = {
  /**
   * Busca todas as provas oficiais
   * GET /api/official-exams
   */
  async getAllExams(): Promise<OfficialExam[]> {
    try {
      console.log('🌐 Chamando GET /official-exams...');
      const response = await api.get('/official-exams', {
        params: { isPublished: true },
        timeout: 60000, // 60 segundos para conexões mais lentas
      });
      
      const exams = response.data.data?.exams || [];
      console.log(`✅ Resposta recebida: ${exams.length} provas`);
      return exams;
    } catch (error: any) {
      console.error('❌ Erro ao buscar provas oficiais:', {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        url: error.config?.url,
      });
      // Retorna array vazio ao invés de lançar erro
      return [];
    }
  },

  /**
   * Busca uma prova oficial por ID
   * GET /api/official-exams/:id
   */
  async getExamById(id: string): Promise<OfficialExam | null> {
    try {
      const response = await api.get(`/official-exams/${id}`);
      return response.data.data || null;
    } catch (error) {
      console.error('Erro ao buscar prova oficial:', error);
      throw error;
    }
  },

  /**
   * Busca os subfiltros (estados e universidades) usando o endpoint de filtros
   * GET /api/banco-questoes/filters/hierarchy
   */
  async getSubFilters(): Promise<any[]> {
    try {
      console.log('🌐 Chamando GET /banco-questoes/filters/hierarchy...');
      const response = await api.get('/banco-questoes/filters/hierarchy', {
        timeout: 60000, // 60 segundos para conexões mais lentas
      });
      const hierarchy = response.data.data || [];
      console.log(`✅ Hierarquia recebida: ${hierarchy.length} filtros`);
      
      // Encontra o filtro "Universidade" e retorna seus subfiltros
      const universidadeFilter = hierarchy.find((f: any) => f.name === 'Universidade');
      if (!universidadeFilter || !universidadeFilter.children) {
        console.warn('Filtro "Universidade" não encontrado na hierarquia');
        return [];
      }
      
      // Retorna todos os subfiltros (estados e universidades) em formato flat
      const allSubFilters: any[] = [];
      
      universidadeFilter.children.forEach((state: any) => {
        // Adiciona o estado
        allSubFilters.push({
          id: state.id,
          name: state.name,
          filter_id: state.filter_id,
          parent_id: state.parent_id,
          level: state.level,
        });
        
        // Adiciona as universidades do estado
        if (state.children) {
          state.children.forEach((university: any) => {
            allSubFilters.push({
              id: university.id,
              name: university.name,
              filter_id: university.filter_id,
              parent_id: university.parent_id,
              level: university.level,
            });
          });
        }
      });
      
      console.log(`✅ ${allSubFilters.length} subfiltros processados`);
      return allSubFilters;
    } catch (error: any) {
      console.error('❌ Erro ao buscar subfiltros:', {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        url: error.config?.url,
      });
      return [];
    }
  },

  /**
   * Busca os tipos de prova da hierarquia de filtros
   * GET /api/banco-questoes/filters/hierarchy
   */
  async getExamTypes(): Promise<{ names: string[]; filterMap: Map<string, any> }> {
    try {
      const response = await api.get('/banco-questoes/filters/hierarchy', {
        timeout: 60000, // 60 segundos para conexões mais lentas
      });
      const hierarchy = response.data.data || [];
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 Todos os filtros da hierarquia:', hierarchy.map((f: any) => ({ name: f.name, category: f.category })));
      }
      
      // Filtra apenas os filtros de tipo de prova (categoria EDUCATIONAL)
      const examTypeFilters = hierarchy.filter((f: any) => 
        f.category === 'EDUCATIONAL' && (
          f.name === 'Revalida' || 
          f.name === 'Residência Médica' || 
          f.name === 'R3' || 
          f.name === 'Provas Irmãs ( Revalida)'
        )
      );
      
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Filtros de tipo de prova encontrados:', examTypeFilters.map((f: any) => f.name));
      }
      
      const filterMap = new Map<string, any>(
        examTypeFilters.map((f: any) => [f.id as string, f])
      );
      
      const names = ['Todos', ...examTypeFilters.map((f: any) => f.name).sort()];
      
      if (process.env.NODE_ENV === 'development') {
        console.log('📋 Nomes finais:', names);
      }
      
      return { names, filterMap };
    } catch (error) {
      console.error('Erro ao buscar tipos de prova:', error);
      return { names: ['Todos'], filterMap: new Map() };
    }
  },

  /**
   * Agrupa provas por instituição usando a hierarquia de filtros
   */
  async getExamsByInstitution(): Promise<ExamInstitution[]> {
    try {
      console.log('🔄 Iniciando carregamento de provas oficiais...');
      
      // Fazer chamadas sequenciais para melhor compatibilidade com conexões lentas
      console.log('📥 Buscando provas...');
      const exams = await this.getAllExams();
      console.log(`✅ ${exams.length} provas carregadas`);

      // Se não houver provas, retorna array vazio
      if (!exams || exams.length === 0) {
        console.warn('⚠️ Nenhuma prova oficial encontrada');
        return [];
      }

      console.log('📥 Buscando subfiltros...');
      const subFilters = await this.getSubFilters();
      console.log(`✅ ${subFilters.length} subfiltros carregados`);

      // Se não houver subfiltros, retorna array vazio
      if (!subFilters || subFilters.length === 0) {
        console.warn('⚠️ Nenhum subfiltro encontrado');
        return [];
      }

      // Cria um mapa de subfiltros para acesso rápido
      const subFilterMap = new Map(subFilters.map(sf => [sf.id, sf]));

      // Agrupa por universityId
      const grouped = exams.reduce((acc, exam) => {
        const universityId = exam.universityId || 'unknown';
        
        // Busca o subfiltro da universidade
        const universityFilter = subFilterMap.get(universityId);
        
        if (!universityFilter) {
          console.warn(`Subfiltro não encontrado para universidade: ${universityId}`);
          return acc;
        }

        // Busca o subfiltro do estado (parent)
        const stateFilter = subFilterMap.get(universityFilter.parent_id);
        const stateAbbr = stateFilter?.name || 'Desconhecido';
        const stateName = getStateName(stateAbbr); // Converte sigla para nome completo
        const universityName = universityFilter.name;

        if (!acc[universityId]) {
          acc[universityId] = {
            id: universityId,
            name: `${universityName} - ${stateName}`,
            region: stateName,
            exams: [],
            examCount: 0,
          };
        }
        
        acc[universityId].exams.push(exam);
        acc[universityId].examCount++;
        
        return acc;
      }, {} as Record<string, ExamInstitution>);

      // Converte para array e ordena por nome
      return Object.values(grouped).sort((a, b) => 
        a.name.localeCompare(b.name)
      );
    } catch (error) {
      console.error('Erro ao agrupar provas por instituição:', error);
      // Retorna array vazio em caso de erro para não quebrar a UI
      return [];
    }
  },

  /**
   * Formata o nome da instituição a partir do ID (fallback)
   */
  formatInstitutionName(universityId: string | undefined): string {
    if (!universityId) {
      return 'Instituição não informada';
    }
    
    const parts = universityId.split('_');
    
    if (parts.length >= 3) {
      const region = parts[1];
      const institution = parts.slice(2).join(' ')
        .replace(/([A-Z])/g, ' $1')
        .replace(/-/g, ' ')
        .trim();
      
      return `${institution} - ${region.toUpperCase()}`;
    }
    
    return universityId;
  },

  /**
   * Filtra provas com base nos critérios
   */
  filterExams(
    institutions: ExamInstitution[],
    filters: { search?: string; region?: string; institution?: string; type?: string },
    filterMap?: Map<string, any>
  ): ExamInstitution[] {
    let filtered = [...institutions];

    // Filtro de busca
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered
        .map(inst => ({
          ...inst,
          exams: inst.exams.filter(exam =>
            exam.title.toLowerCase().includes(searchLower) ||
            inst.name.toLowerCase().includes(searchLower)
          ),
        }))
        .filter(inst => inst.exams.length > 0);
    }

    // Filtro de região
    if (filters.region && filters.region !== 'Todos') {
      const { STATE_NAMES, getStateAbbreviation } = require('@/lib/utils/stateNames');
      const regionFilter = filters.region;
      
      filtered = filtered.filter(inst => {
        if (!inst.region) return false;
        
        // Comparar tanto com a sigla quanto com o nome completo
        const instStateName = STATE_NAMES[inst.region] || inst.region;
        return instStateName === regionFilter || inst.region.toUpperCase() === regionFilter.toUpperCase();
      });
    }

    // Filtro de instituição
    if (filters.institution && filters.institution !== 'Todos') {
      const institution = filters.institution;
      filtered = filtered.filter(inst =>
        inst.name.toLowerCase().includes(institution.toLowerCase())
      );
    }

    // Filtro de tipo (usando examTypeFilterId)
    if (filters.type && filters.type !== 'Todos' && filterMap) {
      const typeFilterId = Array.from(filterMap.values())
        .find(f => f.name === filters.type)?.id;
      
      if (typeFilterId) {
        filtered = filtered
          .map(inst => ({
            ...inst,
            exams: inst.exams.filter(exam => 
              exam.examTypeFilterId === typeFilterId
            ),
          }))
          .filter(inst => inst.exams.length > 0);
      }
    }

    // Atualiza contagem de exames
    filtered = filtered.map(inst => ({
      ...inst,
      examCount: inst.exams.length,
    }));

    return filtered;
  },

  /**
   * Extrai regiões únicas das instituições
   */
  getUniqueRegions(institutions: ExamInstitution[]): string[] {
    const { STATE_NAMES } = require('@/lib/utils/stateNames');
    
    const regions = institutions
      .map(inst => inst.region)
      .filter((region): region is string => !!region);

    const uniqueRegions = Array.from(new Set(regions))
      .map(region => {
        const stateName = STATE_NAMES[region] || region;
        console.log(`[DEBUG] Mapeando região: ${region} -> ${stateName}`);
        return stateName;
      })
      .sort();

    console.log('[DEBUG] Regiões únicas:', uniqueRegions);
    return ['Todos', ...uniqueRegions];
  },

  /**
   * Extrai nomes de instituições únicas
   */
  getUniqueInstitutions(institutions: ExamInstitution[]): string[] {
    const names = institutions
      .map(inst => inst.name.split(' - ')[0])
      .filter(name => name);

    return ['Todos', ...Array.from(new Set(names)).sort()];
  },
};
