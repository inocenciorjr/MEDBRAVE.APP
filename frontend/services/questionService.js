import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

// 🔍 MONITOR DE REQUISIÇÕES SUPABASE
let requestCount = 0;
const logSupabaseRequest = (operation, details) => {
  requestCount++;
  const timestamp = new Date().toISOString();
  console.warn(`🔥 [Supabase Request #${requestCount}] ${timestamp} - ${operation}: ${details}`);
  
  // Alertar se muitas requisições
  if (requestCount > 20) {
    console.error(`⚠️ ALERTA: ${requestCount} requisições Supabase detectadas! Possível problema de cache.`);
  }
};

// ✅ CACHE OTIMIZADO PARA PERFORMANCE
const CACHE_TTL = 10 * 60 * 1000; // ✅ MUDANÇA: 10 minutos em vez de 2 minutos
const questionCache = new Map();
const countCache = new Map();

// Cache específico para consultas de contagem rápida
const fastCountCache = new Map();

// Função para gerar chave de cache mais específica
const generateCacheKey = (filters) => {
  const sorted = {
    selectedFilters: (filters.selectedFilters || []).sort(),
    selectedSubFilters: (filters.selectedSubFilters || []).sort(),
    busca: filters.busca || '',
    timestamp: Math.floor(Date.now() / (15 * 60 * 1000)) // ✅ MUDANÇA: Renovar cache a cada 15 minutos
  };
  return `v3_${JSON.stringify(sorted)}`;
};

// Função para verificar se cache é válido
const isCacheValid = (cacheEntry) => {
  return cacheEntry && (Date.now() - cacheEntry.timestamp) < CACHE_TTL;
};

// ✅ LIMPEZA DE CACHE OTIMIZADA - Apenas quando necessário
const cleanupCache = () => {
  const now = Date.now();
  let cleaned = 0;
  
  // Limpar apenas se o cache estiver muito grande
  if (questionCache.size > 100) {
    for (const [key, value] of questionCache.entries()) {
      if (now - value.timestamp > CACHE_TTL) {
        questionCache.delete(key);
        cleaned++;
      }
    }
  }
  
  if (countCache.size > 100) {
    for (const [key, value] of countCache.entries()) {
      if (now - value.timestamp > CACHE_TTL) {
        countCache.delete(key);
        cleaned++;
      }
    }
  }
  
  if (cleaned > 0) {
    console.log(`🧹 [questionService] Cache cleanup: ${cleaned} itens removidos`);
  }
};

// ✅ FUNÇÃO DE CACHE INTELIGENTE - Evita consultas desnecessárias
const getCachedCount = (cacheKey) => {
  const cached = countCache.get(cacheKey);
  const fastCached = fastCountCache.get(cacheKey);
  
  if (isCacheValid(cached)) {
    return cached.data;
  }
  
  if (isCacheValid(fastCached)) {
    return fastCached.data;
  }
  
  return null;
};

const setCachedCount = (cacheKey, count) => {
  const timestamp = Date.now();
  
  // Cache de longo prazo
  countCache.set(cacheKey, {
    data: count,
    timestamp
  });
  
  // Cache de curto prazo (mais agressivo)
  fastCountCache.set(cacheKey, {
    data: count,
    timestamp
  });
};

// ✅ FUNÇÃO PARA LIMPAR CACHE QUANDO FILTROS MUDAM
export const clearQuestionCache = () => {
  questionCache.clear();
  countCache.clear();
  fastCountCache.clear();
};

export const getQuestions = async (filters = {}) => {
  // ✅ VERIFICAR CACHE PRIMEIRO
  const cacheKey = generateCacheKey(filters);
  const cached = questionCache.get(cacheKey);
  
  if (isCacheValid(cached)) {
    return { questions: cached.data };
  }
  
  // ✅ LIMPEZA DE CACHE INTELIGENTE - Apenas quando necessário
  cleanupCache();

  try {
    let allQuestions = [];

    // Função para executar consultas com filtros
    const executeFilteredQuery = async (filterArray, fieldName) => {
      let query = supabase
        .from('questions')
        .select('*')
        .eq('isActive', true)
        .eq('status', 'Publicada');
      
      if (filterArray && filterArray.length > 0) {
        // Supabase suporta arrays maiores que Firebase
        query = query.overlaps(fieldName, filterArray);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      if (data) {
        data.forEach(item => {
          allQuestions.push({
            id: item.id,
            titulo: item.titulo || item.title,
            enunciado: item.enunciado,
            materia: item.materia,
            dificuldade: item.dificuldade,
            tipo: item.tipo,
            tempo: item.tempo,
            respondida: false,
            favorita: false,
            filterIds: item.filterIds,
            subFilterIds: item.subFilterIds,
            status: item.status,
            isActive: item.isActive
          });
        });
      }
    };

    // Preparar filtros (remover IDs inválidos)
    const validSelectedFilters = (filters.selectedFilters || []).filter(id => 
      !id.startsWith('parent-') && id !== 'parent'
    );

    const validSelectedSubFilters = (filters.selectedSubFilters || []).filter(id => 
      !id.startsWith('parent-') && id !== 'parent'
    );

    // Se há filtros principais, executar consulta
    if (validSelectedFilters.length > 0) {
      await executeFilteredQuery(validSelectedFilters, 'filterIds');
    }

    // Se há subfiltros, executar consulta
    if (validSelectedSubFilters.length > 0) {
      await executeFilteredQuery(validSelectedSubFilters, 'subFilterIds');
    }

    // Se não há filtros, buscar todas as questões
    if (validSelectedFilters.length === 0 && validSelectedSubFilters.length === 0) {
      await executeFilteredQuery([], null);
    }
     
    // Remover duplicatas por ID
    const uniqueQuestions = [];
    const seenIds = new Set();
     allQuestions.forEach(question => {
      if (!seenIds.has(question.id)) {
        seenIds.add(question.id);
        uniqueQuestions.push(question);
      }
     });

    // Filtrar por busca textual no frontend se necessário
    let filteredQuestions = uniqueQuestions;
    if (filters.busca) {
      const searchTerm = filters.busca.toLowerCase();
      filteredQuestions = uniqueQuestions.filter(question => 
        question.titulo?.toLowerCase().includes(searchTerm) ||
        question.enunciado?.toLowerCase().includes(searchTerm) ||
        question.materia?.toLowerCase().includes(searchTerm)
      );
    }
    
    // ✅ SALVAR NO CACHE
    questionCache.set(cacheKey, {
      data: filteredQuestions,
      timestamp: Date.now()
    });
    
    return { questions: filteredQuestions };
  } catch (error) {
    console.error("Erro ao obter questões:", error);
    throw error;
  }
};

export const countQuestions = async (filters = {}) => {
  // ✅ CACHE INTELIGENTE - Verificar primeiro no cache otimizado
  const cacheKey = generateCacheKey(filters);
  const cachedResult = getCachedCount(cacheKey);
  
  if (cachedResult !== null) {
    return cachedResult;
  }
  
  // ✅ LIMPEZA DE CACHE INTELIGENTE - Apenas quando necessário
  cleanupCache();

  try {
    let totalCount = 0;

    // Vamos usar exatamente os filtros especificados sem auto-adição
    let correctedFilters = { ...filters };
    
    // Verificando se os filtros são válidos
    if (!correctedFilters.selectedFilters) correctedFilters.selectedFilters = [];
    if (!correctedFilters.selectedSubFilters) correctedFilters.selectedSubFilters = [];

    const hasSelectedFilters = correctedFilters.selectedFilters && correctedFilters.selectedFilters.length > 0;
    const hasSelectedSubFilters = correctedFilters.selectedSubFilters && correctedFilters.selectedSubFilters.length > 0;

    // ✅ OTIMIZAÇÃO: Se não há filtros, usar contagem direta
    if (!hasSelectedFilters && !hasSelectedSubFilters) {
      logSupabaseRequest('count', 'Contagem total sem filtros');
      const { count, error } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('isActive', true)
        .eq('status', 'Publicada');
      
      if (error) throw error;
      totalCount = count || 0;
      
      // Salvar no cache
      setCachedCount(cacheKey, totalCount);
      
      return totalCount;
    }

    // ✅ NOVA LÓGICA CORRETA: UNIÃO dentro de categoria, INTERSEÇÃO entre categorias
    // Aplicar sempre que houver filtros, não apenas quando ambos estão presentes
    const shouldUseNewLogic = hasSelectedFilters || hasSelectedSubFilters;
    
    if (shouldUseNewLogic) {
      // Lista de anos que podem ser selecionados
      const yearSubFilters = ['2023', '2023.1', '2023.2', '2024', '2024.1', '2024.2', '2025', '2025.1', '2025.2', '2027'];
      
      // Separar filtros por categoria
      const anoFilters = (correctedFilters.selectedFilters || []).filter(filter => 
        filter === 'Ano da Prova'
      );
      
      const universidadeFilters = (correctedFilters.selectedFilters || []).filter(filter => 
        filter === 'Universidade'
      );
      
      const especialidadeFilters = (correctedFilters.selectedFilters || []).filter(filter => 
        filter === 'Clínica Médica' || filter === 'ClinicaMedica' || filter === 'Cirurgia' || filter === 'Pediatria' || 
        filter === 'Ginecologia e Obstetrícia' || filter === 'Psiquiatria' || 
        filter === 'Medicina Preventiva' || filter === 'MedicinaPreventiva' || filter === 'Medicina' || filter === 'Outras Especialidades' ||
        filter === 'Variados'
      );
      
      // Separar subfiltros por categoria
      const anoSubFilters = (correctedFilters.selectedSubFilters || []).filter(subFilter => {
        return yearSubFilters.includes(subFilter);
      });
      
      const universidadeSubFilters = (correctedFilters.selectedSubFilters || []).filter(subFilter => {
        return subFilter.includes('UFMG') || subFilter.includes('USP') || subFilter.includes('UFRJ') || 
            subFilter.includes('UNIFESP') || subFilter.includes('UNB') || subFilter.includes('UFSC') ||
            subFilter.includes('UFRGS') || subFilter.includes('UFC') || subFilter.includes('UFBA') ||
            subFilter.includes('UFPE') || subFilter.includes('UFPR') || subFilter.includes('UNESP') ||
               subFilter.includes('UNICAMP') || subFilter.includes('PUC') || subFilter.includes('UNIP') ||
               subFilter.includes('Revalida') || subFilter.includes('REVALIDA');
      });
      
      const especialidadeSubFilters = (correctedFilters.selectedSubFilters || []).filter(subFilter => {
        return subFilter.includes('ClinicaMedica_') || subFilter.includes('Cirurgia_') || 
               subFilter.includes('Pediatria_') || subFilter.includes('Ginecologia_') || 
               subFilter.includes('Obstetricia_') || subFilter.includes('Psiquiatria_') || 
               subFilter.includes('MedicinaPreventiva_') || subFilter.includes('Medicina_') ||
               subFilter.includes('Variados_');
      });
      
      // Conjuntos para cada categoria (UNIÃO dentro da categoria)
      let anosQuestions = new Set();
      let universidadesQuestions = new Set();
      let especialidadesQuestions = new Set();
        
      // ETAPA 1: Buscar questões para ANOS - APENAS se há subfiltros específicos
      if (anoSubFilters.length > 0) {
        logSupabaseRequest('select', `Busca por anos: ${anoSubFilters.join(', ')}`);
        const { data, error } = await supabase
          .from('questions')
          .select('id')
          .eq('isActive', true)
          .eq('status', 'Publicada')
          .overlaps('subFilterIds', anoSubFilters);
        
        if (error) throw error;
        if (data) data.forEach(item => anosQuestions.add(item.id));
      }
      
      // ETAPA 2: Buscar questões para UNIVERSIDADES - APENAS se há subfiltros específicos  
      if (universidadeSubFilters.length > 0) {
        logSupabaseRequest('select', `Busca por universidades: ${universidadeSubFilters.join(', ')}`);
        const { data, error } = await supabase
          .from('questions')
          .select('id')
          .eq('isActive', true)
          .eq('status', 'Publicada')
          .overlaps('subFilterIds', universidadeSubFilters);
        
        if (error) throw error;
        if (data) data.forEach(item => universidadesQuestions.add(item.id));
      }
      
      // ETAPA 3: Buscar questões para ESPECIALIDADES
      // Se há subfiltros específicos, usar subfiltros
      if (especialidadeSubFilters.length > 0) {
        logSupabaseRequest('select', `Busca por especialidades (subfiltros): ${especialidadeSubFilters.join(', ')}`);
        const { data, error } = await supabase
          .from('questions')
          .select('id')
          .eq('isActive', true)
          .eq('status', 'Publicada')
          .overlaps('subFilterIds', especialidadeSubFilters);
        
        if (error) throw error;
        if (data) data.forEach(item => especialidadesQuestions.add(item.id));
      }
      // ✅ CORREÇÃO: Se há filtros de especialidade mas não subfiltros, usar filterIds diretamente
      // APENAS se não há outros filtros de categoria (anos, universidades) que exigem subfiltros
      else if (especialidadeFilters.length > 0 && anoSubFilters.length === 0 && universidadeSubFilters.length === 0) {
        logSupabaseRequest('select', `Busca por especialidades (filtros): ${especialidadeFilters.join(', ')}`);
        const { data, error } = await supabase
          .from('questions')
          .select('id')
          .eq('isActive', true)
          .eq('status', 'Publicada')
          .overlaps('filterIds', especialidadeFilters);
        
        if (error) throw error;
        if (data) data.forEach(item => especialidadesQuestions.add(item.id));
      }
        
      // ETAPA 4: INTERSEÇÃO entre as categorias que têm subfiltros selecionados
      let finalQuestionIds = null;
      const categoriasAtivas = [];
      
      if (anosQuestions.size > 0) {
        categoriasAtivas.push({ nome: 'ANOS', questoes: anosQuestions });
        finalQuestionIds = finalQuestionIds ? new Set([...finalQuestionIds].filter(id => anosQuestions.has(id))) : anosQuestions;
      }
      
      if (universidadesQuestions.size > 0) {
        categoriasAtivas.push({ nome: 'UNIVERSIDADES', questoes: universidadesQuestions });
        finalQuestionIds = finalQuestionIds ? new Set([...finalQuestionIds].filter(id => universidadesQuestions.has(id))) : universidadesQuestions;
      }
      
      if (especialidadesQuestions.size > 0) {
        categoriasAtivas.push({ nome: 'ESPECIALIDADES', questoes: especialidadesQuestions });
        finalQuestionIds = finalQuestionIds ? new Set([...finalQuestionIds].filter(id => especialidadesQuestions.has(id))) : especialidadesQuestions;
      }
      
      // ✅ CORREÇÃO: Lógica específica para filtros principais sem subfiltros
      // Se apenas filtros principais estão selecionados (sem subfiltros), retornar 0
      const hasOnlyMainFilters = (anoFilters.length > 0 || universidadeFilters.length > 0) && 
                                 (anoSubFilters.length === 0 && universidadeSubFilters.length === 0 && especialidadeSubFilters.length === 0);
      
      if (hasOnlyMainFilters) {
        totalCount = 0;
      } else if (!finalQuestionIds || finalQuestionIds.size === 0) {
        totalCount = 0;
      } else {
      totalCount = finalQuestionIds.size;
      }
      
    } else {
      // Consulta sem filtros específicos já foi tratada no início da função
      totalCount = 0;
    }

    // ✅ SALVAR NO CACHE PARA PERFORMANCE
    setCachedCount(cacheKey, totalCount);

    return totalCount;
  } catch (error) {
    console.error("Erro ao contar questões:", error);
    throw error;
  }
};

export const getStatistics = async () => {
  try {
    // Buscar estatísticas básicas
    const { count, error } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true });
    
    if (error) throw error;
    const totalQuestoes = count || 0;
    
    // Calcular estatísticas básicas
    // Em um cenário real, essas informações poderiam vir de uma coleção separada de estatísticas
    return {
      totalQuestoes,
      respondidas: Math.floor(totalQuestoes * 0.7),
      acertos: Math.floor(totalQuestoes * 0.6),
      taxaAcerto: 85,
      favoritas: Math.floor(totalQuestoes * 0.05)
    };
  } catch (error) {
    console.error("Erro ao obter estatísticas:", error);
    throw error; // Propagar o erro ao invés de mascarar
  }
};

// ✅ NOVA FUNÇÃO: Buscar questões específicas para listas ordenadas por ano
export const getQuestionsForList = async (filters = {}, maxQuestions = 50) => {
  try {
    let allQuestions = [];

    // Função para executar consultas do Supabase
    const executeFilteredQuery = async (filterArray, fieldName) => {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('isActive', true)
        .eq('status', 'Publicada')
        .overlaps(fieldName, filterArray);
      
      if (error) throw error;
      
      if (data) {
        data.forEach(item => {
          allQuestions.push({
            id: item.id,
            titulo: item.titulo || item.title,
            enunciado: item.enunciado,
            materia: item.materia,
            dificuldade: item.dificuldade,
            tipo: item.tipo,
            tempo: item.tempo || '3 min',
            alternativas: item.alternativas || [],
            resposta: item.resposta || {},
            explicacao: item.explicacao || '',
            filterIds: item.filterIds || [],
            subFilterIds: item.subFilterIds || [],
            status: item.status,
            isActive: item.isActive,
            created_at: item.created_at,
            ano: extractYearFromSubFilters(item.subFilterIds || []) // Extrair ano para ordenação
          });
        });
      }
    };

    // Preparar filtros (remover IDs inválidos)
    const validSelectedFilters = (filters.selectedFilters || []).filter(id => 
      !id.startsWith('parent-') && id !== 'parent'
    );

    const validSelectedSubFilters = (filters.selectedSubFilters || []).filter(id => 
      !id.startsWith('parent-') && id !== 'parent'
    );

    // Se há filtros principais, executar consulta
    if (validSelectedFilters.length > 0) {
      await executeFilteredQuery(validSelectedFilters, 'filterIds');
    }

    // Se há subfiltros, executar consulta
    if (validSelectedSubFilters.length > 0) {
      await executeFilteredQuery(validSelectedSubFilters, 'subFilterIds');
    }

    // Se não há filtros, buscar todas as questões
    if (validSelectedFilters.length === 0 && validSelectedSubFilters.length === 0) {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('isActive', true)
        .eq('status', 'Publicada');
      
      if (error) throw error;
      
      if (data) {
        data.forEach(item => {
          allQuestions.push({
            id: item.id,
            titulo: item.titulo || item.title,
            enunciado: item.enunciado,
            materia: item.materia,
            dificuldade: item.dificuldade,
            tipo: item.tipo,
            tempo: item.tempo || '3 min',
            alternativas: item.alternativas || [],
            resposta: item.resposta || {},
            explicacao: item.explicacao || '',
            filterIds: item.filterIds || [],
            subFilterIds: item.subFilterIds || [],
            status: item.status,
            isActive: item.isActive,
            created_at: item.created_at,
            ano: extractYearFromSubFilters(item.subFilterIds || [])
          });
        });
       }
     }

    // Remover duplicatas por ID
    const uniqueQuestions = [];
    const seenIds = new Set();
    allQuestions.forEach(question => {
      if (!seenIds.has(question.id)) {
        seenIds.add(question.id);
        uniqueQuestions.push(question);
      }
    });

    // Ordenar por ano (mais recentes primeiro) e depois por data de criação
    uniqueQuestions.sort((a, b) => {
      // Primeiro ordenar por ano (mais recente primeiro)
      if (a.ano !== b.ano) {
        return (b.ano || 0) - (a.ano || 0);
      }
      // Se mesmo ano, ordenar por data de criação (mais recente primeiro)
      if (a.created_at && b.created_at) {
        return new Date(b.created_at) - new Date(a.created_at);
      }
      return 0;
    });

    // Limitar ao número máximo de questões solicitadas
    const selectedQuestions = uniqueQuestions.slice(0, maxQuestions);

    return selectedQuestions;
  } catch (error) {
    console.error("Erro ao buscar questões para lista:", error);
    throw error;
  }
};

// Função auxiliar para extrair ano dos subFilterIds
const extractYearFromSubFilters = (subFilterIds) => {
  const yearSubFilters = ['2023', '2023.1', '2023.2', '2024', '2024.1', '2024.2', '2025', '2025.1', '2025.2', '2027'];
  
  for (const subFilter of subFilterIds) {
    if (yearSubFilters.includes(subFilter)) {
      // Extrair ano numérico (ex: "2024" ou "2024.1" -> 2024)
      const year = parseInt(subFilter.split('.')[0]);
      if (!isNaN(year)) {
        return year;
      }
    }
  }
  
  // Se não encontrar ano específico, tentar extrair de outros formatos ou usar 0 como fallback
  return 0;
};


