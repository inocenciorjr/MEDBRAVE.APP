// Serviço REST para Banco de Questões - OTIMIZADO PARA ALTA PERFORMANCE
const API_BASE = '/api/questions';
import { fetchWithAuth } from './fetchWithAuth';
import { cacheService } from './cacheService';
import type { NewQuestionData } from '../features/admin/questions/NewQuestionContext';

// Pool de requisições para evitar duplicatas
const requestPool = new Map<string, Promise<any>>();

// Função para gerar chave única de requisição
function generateCacheKey(endpoint: string, params: any): string {
  return `${endpoint}:${JSON.stringify(params)}`;
}

export async function fetchQuestions(params: any = {}) {
  const cacheKey = generateCacheKey('questions', params);
  
  // Verificar se já existe uma requisição idêntica em andamento
  if (requestPool.has(cacheKey)) {
    return await requestPool.get(cacheKey);
  }
  
  // Tentar buscar do cache primeiro (apenas para GET sem signal)
  if (!params.signal) {
    const cachedData = await cacheService.getCachedQuestions(params);
    if (cachedData && cachedData.length > 0) {
      return { items: cachedData, total: cachedData.length };
    }
  }
  
  // Criar promise da requisição
  const requestPromise = (async () => {
    try {
      // Calcular tamanho estimado dos parâmetros para decidir método HTTP
      const paramsString = JSON.stringify(params);
      const shouldUsePost = paramsString.length > 1000; // Se > 1KB, usar POST
      
      let url = API_BASE;
      let requestOptions: any = {
        signal: params.signal
      };
      
      if (shouldUsePost) {
        // Usar POST para evitar erro 431 com muitos parâmetros
        url += '/search'; // Endpoint específico para busca via POST
        requestOptions.method = 'POST';
        requestOptions.body = JSON.stringify({
          ...params,
          signal: undefined // Remover signal do body
        });
      } else {
        // Usar GET tradicional para parâmetros pequenos
        const searchParams = new URLSearchParams();
        
        Object.entries(params).forEach(([key, value]) => {
          if (key === 'signal') return; // Ignorar signal nos parâmetros
          if (Array.isArray(value)) {
            value.forEach(v => searchParams.append(key, String(v)));
          } else if (value !== undefined && value !== null) {
            searchParams.append(key, String(value));
          }
        });
        
        if (searchParams.toString()) {
          url += '?' + searchParams.toString();
        }
      }
      
      const res = await fetchWithAuth(url, requestOptions);
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      
      const data = await res.json();
      
      // Armazenar no cache apenas se não foi cancelada e tem dados
      if (!params.signal && data.items && data.items.length > 0) {
        await cacheService.cacheQuestions(params, data.items);
      }
      
      return data;
    } finally {
      // Remover da pool após completar
      requestPool.delete(cacheKey);
    }
  })();
  
  // Adicionar à pool
  requestPool.set(cacheKey, requestPromise);
  
  return await requestPromise;
}

/**
 * Busca contagens em lote para múltiplos filtros/subfiltros
 * Reduz drasticamente o número de requisições para ambientes multi-usuário
 * @param requests Array de objetos com { id, isSubFilter, excludeAnuladas, excludeDesatualizadas }
 * @returns Promise<Record<string, number>> Mapa de ID para contagem
 */
export async function fetchBatchCounts(requests: Array<{
  id: string;
  isSubFilter: boolean;
  excludeAnuladas: boolean;
  excludeDesatualizadas: boolean;
}>): Promise<Record<string, number>> {
  // Limitar requisições para evitar timeout
  const MAX_BATCH_SIZE = 50;
  const limitedRequests = requests.slice(0, MAX_BATCH_SIZE);

  try {
    const response = await fetchWithAuth(`${API_BASE}/batch-counts`, {
      method: 'POST',
      body: JSON.stringify({ requests: limitedRequests }),
      signal: AbortSignal.timeout(30000), // Timeout de 30 segundos
    });

    if (!response.ok) {
      throw new Error(`Erro ao buscar contagens em lote: ${response.status}`);
    }

    const data = await response.json();
    return data.counts || {};
  } catch (error) {
    console.error('Erro ao buscar contagens em lote:', error);

    // Fallback mais eficiente - processar apenas alguns itens críticos
    const results: Record<string, number> = {};
    const criticalRequests = limitedRequests.slice(0, 10); // Apenas 10 mais importantes

    for (const request of criticalRequests) {
      try {
        const params: any = request.isSubFilter
          ? { subFilterIds: [request.id], limit: 1 } // Apenas contar, não buscar dados
          : { filterIds: [request.id], limit: 1 };

        const count = await fetchQuestionsCount(params);
        results[request.id] = count;
      } catch {
        results[request.id] = 0;
      }
    }

    // Para os demais, retornar 0 para não travar a interface
    limitedRequests.slice(10).forEach(request => {
      results[request.id] = 0;
    });

    return results;
  }
}

/**
 * Envia os dados de uma nova questão para o backend
 * @param questionData Dados completos da questão
 * @returns Promise com a questão criada, incluindo seu ID
 */
export const createQuestion = async (questionData: NewQuestionData): Promise<NewQuestionData> => {
  try {
    const response = await fetchWithAuth(`${API_BASE}`, {
      method: 'POST',
      body: JSON.stringify(questionData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Erro ao criar questão: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erro ao criar questão:', error);
    throw error;
  }
};

/**
 * Busca uma questão pelo ID
 * @param id ID da questão
 * @returns Promise com os dados da questão
 */
export const getQuestionById = async (id: string): Promise<NewQuestionData> => {
  try {
    const response = await fetchWithAuth(`${API_BASE}/${id}`);

    if (!response.ok) {
      throw new Error(`Erro ao buscar questão: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erro ao buscar questão:', error);
    throw error;
  }
};

/**
 * Busca múltiplas questões por IDs (otimização para listas)
 * @param ids Array de IDs das questões
 * @returns Promise com array das questões encontradas
 */
export const getBulkQuestions = async (ids: string[]): Promise<any[]> => {
  try {
    if (!ids || ids.length === 0) {
      return [];
    }

    const response = await fetchWithAuth(`${API_BASE}/bulk-get`, {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });

    if (!response.ok) {
      throw new Error(`Erro ao buscar questões em lote: ${response.status}`);
    }

    const data = await response.json();
    
    return data.data || [];
  } catch (error) {
    console.error('Erro ao buscar questões em lote:', error);
    throw error;
  }
};

/**
 * Atualiza uma questão existente
 * @param id ID da questão
 * @param questionData Dados atualizados da questão
 * @returns Promise com a questão atualizada
 */
export const updateQuestion = async (id: string, questionData: NewQuestionData): Promise<NewQuestionData> => {
  try {
    const response = await fetchWithAuth(`${API_BASE}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(questionData),
    });

    if (!response.ok) {
      throw new Error(`Erro ao atualizar questão: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erro ao atualizar questão:', error);
    throw error;
  }
};

/**
 * Exclui uma questão
 * @param id ID da questão
 * @returns Promise vazia em caso de sucesso
 */
export const deleteQuestion = async (id: string): Promise<void> => {
  try {
    const response = await fetchWithAuth(`${API_BASE}/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Erro ao excluir questão: ${response.status}`);
    }
  } catch (error) {
    console.error('Erro ao excluir questão:', error);
    throw error;
  }
};

/**
 * Busca apenas a contagem de questões com filtros
 * @param params Filtros para contagem
 * @returns Promise<number>
 */
export async function fetchQuestionsCount(params = {}): Promise<number> {
  // 🚨 CORREÇÃO CRÍTICA: Usar POST quando há muitos parâmetros para evitar erro 431
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach(v => searchParams.append(key, String(v)));
    } else if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });

  const queryString = searchParams.toString();

  // Se a URL ficaria muito grande (>2000 chars), usar POST
  if (queryString.length > 2000) {
    console.log('🔄 Usando POST para contagem devido ao tamanho da requisição:', queryString.length);

    const res = await fetchWithAuth(`${API_BASE}/count`, {
      method: 'POST',
      body: JSON.stringify(params),
    });

    if (!res.ok) throw new Error('Erro ao buscar contagem de questões (POST)');
    const data = await res.json();
    return data.count;
  } else {
    // Usar GET normal para requisições pequenas
    let url = API_BASE + '/count';
    if (queryString) {
      url += '?' + queryString;
    }

    const res = await fetchWithAuth(url);
    if (!res.ok) throw new Error('Erro ao buscar contagem de questões (GET)');
    const data = await res.json();
    return data.count;
  }
}

// Exemplo de uso:
// const { items, total } = await fetchQuestions({ filterIds: ['abc'], subFilterIds: ['def'], page: 1, limit: 10 });