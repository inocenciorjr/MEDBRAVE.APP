import { fetchWithAuth } from './fetchWithAuth';
// import { getUserReviews, SRSContentType } from './srsService'; // REMOVIDO: Migrado para sistema unificado

const API_BASE = '/api/flashcards';

// Interfaces
interface FlashcardData {
  id: string;
  front: string;
  back: string;
  tags?: string[];
  difficulty?: number;
  stability?: number;
  // retrievability?: number; // Campo removido - não existe no backend
  lastReviewed?: string;
  nextReview?: string;
  reviewCount?: number;
  lapseCount?: number;
}

interface DeckStats {
  totalCards: number;
  dueCards: number;
  lastReviewed: string;
}

export interface CreateFlashcardDTO {
  frontContent: string;
  backContent: string;
  personalNotes?: string;
  tags?: string[];
  difficulty?: number;
  deckId: string;
}

// Cache para getAllDecks
const decksCache = new Map<string, { data: any; timestamp: number }>();

export async function getAllDecks(params = {}, useCache = true) {
  const cacheKey = `all-decks-${JSON.stringify(params)}`;
  const now = Date.now();
  const cached = decksCache.get(cacheKey);
  
  // Verificar cache (3 minutos de TTL)
  if (useCache && cached && (now - cached.timestamp) < (3 * 60 * 1000)) {
    return cached.data;
  }
  
  const res = await fetchWithAuth(`${API_BASE}/decks`);
  if (!res.ok) throw new Error('Erro ao buscar baralhos');
  
  const data = await res.json();
  
  // Atualizar cache
  if (useCache) {
    decksCache.set(cacheKey, {
      data,
      timestamp: now
    });
  }
  
  return data;
}

export async function getDeckById(id: string) {
  const url = `${API_BASE}/decks/${id}`;
  console.log('🔍 [getDeckById] API_BASE:', API_BASE);
  console.log('🔍 [getDeckById] ID:', id);
  console.log('🔍 [getDeckById] URL construída:', url);
  const res = await fetchWithAuth(url);
  if (!res.ok) throw new Error('Erro ao buscar baralho');
  return res.json();
}

export async function createDeck(data: any) {
  const res = await fetchWithAuth(`${API_BASE}/decks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Erro ao criar baralho');
  return res.json();
}

export async function updateDeck(id: string, data: any) {
  const res = await fetchWithAuth(`${API_BASE}/decks/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Erro ao atualizar baralho');
  return res.json();
}

export async function deleteDeck(id: string) {
  const res = await fetchWithAuth(`${API_BASE}/decks/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Erro ao deletar baralho');
  return res.json();
}

export async function createFlashcard(data: CreateFlashcardDTO) {
  console.log('🔍 [createFlashcard] Dados enviados:', JSON.stringify(data));
  try {
    const res = await fetchWithAuth(`${API_BASE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    console.log('🔍 [createFlashcard] Status da resposta:', res.status);
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      console.error('❌ [createFlashcard] Erro na resposta:', errorData);
      throw new Error(`Erro ao criar flashcard: ${errorData.error || res.statusText}`);
    }
    
    const responseData = await res.json();
    console.log('✅ [createFlashcard] Flashcard criado com sucesso:', responseData);
    return responseData;
  } catch (error) {
    console.error('❌ [createFlashcard] Exceção:', error);
    throw error;
  }
}

export async function getFlashcardById(id: string) {
  const res = await fetchWithAuth(`${API_BASE}/${id}`);
  if (!res.ok) throw new Error('Erro ao buscar flashcard');
  return res.json();
}

export async function getFlashcardsByDeck(deckId: string, params = {}) {
  console.warn('⚠️ getFlashcardsByDeck está deprecada. Use getCardsByDeck ou getDeckCards');
  return getDeckCards(deckId, params);
}

export async function updateFlashcard(id: string, data: any) {
  const res = await fetchWithAuth(`${API_BASE}/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Erro ao atualizar flashcard');
  return res.json();
}

export async function deleteFlashcard(id: string) {
  const res = await fetchWithAuth(`${API_BASE}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Erro ao deletar flashcard');
  return res.json();
}

export async function toggleArchiveFlashcard(id: string) {
  const res = await fetchWithAuth(`${API_BASE}/${id}/archive`, { method: 'PATCH' });
  if (!res.ok) throw new Error('Erro ao arquivar/desarquivar flashcard');
  return res.json();
}

export async function recordFlashcardReview(id: string, reviewQuality: number) {
  console.log('🔍 [recordFlashcardReview] Iniciando revisão para flashcard:', id);
  console.log('🔍 [recordFlashcardReview] Review Quality:', reviewQuality);
  console.log('🔍 [recordFlashcardReview] URL:', `${API_BASE}/${id}/review-fsrs`);
  
  const res = await fetchWithAuth(`${API_BASE}/${id}/review-fsrs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ reviewQuality }),
  });

  console.log('🔍 [recordFlashcardReview] Status da resposta:', res.status);
  if (!res.ok) {
    const errorText = await res.text();
    console.error('🔍 [recordFlashcardReview] Erro:', errorText);
    throw new Error('Erro ao registrar revisão');
  }
  return res.json();
}

export async function searchFlashcards(query: string, params = {}) {
  const res = await fetchWithAuth(`${API_BASE}/search?query=${query}`);
  if (!res.ok) throw new Error('Erro na busca de flashcards');
  return res.json();
}

// Cache para getDeckStats individual
const deckStatsCache = new Map<string, { data: DeckStats; timestamp: number }>();

// Obter estatísticas de um deck (integração com SRS)
export const getDeckStats = async (deckId: string, useCache = true): Promise<DeckStats> => {
  const cacheKey = `deck-stats-${deckId}`;
  const now = Date.now();
  const cached = deckStatsCache.get(cacheKey);
  
  // Verificar cache (2 minutos de TTL)
  if (useCache && cached && (now - cached.timestamp) < (2 * 60 * 1000)) {
    return cached.data;
  }
  
  try {
    const response = await fetch(`${API_BASE}/cards?deckId=${deckId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch deck stats: ${response.status}`);
    }
    
    const cards = await response.json();
    
    const totalCards = cards.length;
    const dueCards = cards.filter((card: any) => {
      if (!card.fsrs_data) return true;
      const nextReview = new Date(card.fsrs_data.due);
      return nextReview <= new Date();
    }).length;
    
    const lastReviewed = cards.length > 0 && cards.some((card: any) => card.fsrs_data?.last_review)
      ? new Date(Math.max(...cards
          .filter((card: any) => card.fsrs_data?.last_review)
          .map((card: any) => new Date(card.fsrs_data.last_review).getTime())
        )).toLocaleDateString('pt-BR')
      : 'Nunca';
    
    const stats = {
      totalCards,
      dueCards,
      lastReviewed
    };
    
    // Atualizar cache
    if (useCache) {
      deckStatsCache.set(cacheKey, {
        data: stats,
        timestamp: now
      });
    }
    
    return stats;
  } catch (error) {
    console.error('Error fetching deck stats:', error);
    throw error;
  }
};

// Cache para estatísticas de decks com Stale-While-Revalidate
const statsCache = new Map<string, { data: any; timestamp: number; isStale: boolean }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos
const STALE_TTL = 10 * 60 * 1000; // 10 minutos (tempo para considerar stale)

// Função para buscar estatísticas em lote
export async function getBatchDeckStats(deckIds: string[]) {
  try {
    const response = await fetchWithAuth(`${API_BASE}/decks/batch-stats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ deckIds }),
    });
    
    if (!response.ok) {
      throw new Error('Erro ao buscar estatísticas em lote');
    }
    
    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Erro ao buscar estatísticas em lote:', error);
    throw error;
  }
}

// Função com cache e Stale-While-Revalidate
export async function getDecksWithStatsOptimized(forceRefresh = false) {
  const cacheKey = 'all-decks-stats';
  const now = Date.now();
  const cached = statsCache.get(cacheKey);
  
  // Se não forçar refresh e tiver cache válido, retorna do cache
  if (!forceRefresh && cached && (now - cached.timestamp) < CACHE_TTL) {
    return cached.data;
  }
  
  // Se tiver cache stale, retorna ele e atualiza em background
  if (!forceRefresh && cached && (now - cached.timestamp) < STALE_TTL) {
    // Retorna dados stale imediatamente
    const staleData = cached.data;
    
    // Atualiza em background (não await)
    updateDecksStatsInBackground(cacheKey).catch(console.error);
    
    return staleData;
  }
  
  // Busca dados frescos
  return await fetchFreshDecksStats(cacheKey);
}

// Função para atualizar em background
async function updateDecksStatsInBackground(cacheKey: string) {
  try {
    const freshData = await fetchFreshDecksStats(cacheKey, false);
    return freshData;
  } catch (error) {
    console.error('Erro ao atualizar cache em background:', error);
  }
}

// Função para buscar dados frescos
async function fetchFreshDecksStats(cacheKey: string, updateCache = true) {
  const decksResponse = await getAllDecks();
  let decksData: any[] = [];
  
  if (decksResponse && decksResponse.decks && Array.isArray(decksResponse.decks)) {
    decksData = decksResponse.decks;
  } else if (decksResponse && decksResponse.data && Array.isArray(decksResponse.data)) {
    decksData = decksResponse.data;
  } else if (Array.isArray(decksResponse)) {
    decksData = decksResponse;
  }
  
  if (decksData.length === 0) {
    return [];
  }
  
  // Usar batch para buscar estatísticas
  const deckIds = decksData.map(deck => deck.id);
  const batchStats = await getBatchDeckStats(deckIds);
  
  const decksWithStats = decksData.map(deck => {
    const stats = batchStats[deck.id] || {
      total: 0,
      byStatus: { new: 0, learning: 0, review: 0, relearning: 0 },
      byDifficulty: { easy: 0, medium: 0, hard: 0 },
      tags: {},
      lastReview: null
    };
    
    return {
      id: deck.id,
      title: deck.name || 'Sem título',
      subject: deck.tags?.[0] || 'Geral',
      cardCount: stats.total,
      lastReviewed: stats.lastReview ? new Date(stats.lastReview).toLocaleDateString('pt-BR') : 'Nunca',
      dueCards: stats.byStatus.new + stats.byStatus.learning + stats.byStatus.relearning,
      // Campos originais do backend
      name: deck.name,
      description: deck.description,
      isPublic: deck.isPublic,
      tags: deck.tags || [],
      userId: deck.userId,
      status: deck.status,
      createdAt: deck.createdAt,
      updatedAt: deck.updatedAt,
      // Estatísticas detalhadas
      stats
    };
  });
  
  // Atualizar cache
  if (updateCache) {
    statsCache.set(cacheKey, {
      data: decksWithStats,
      timestamp: Date.now(),
      isStale: false
    });
  }
  
  return decksWithStats;
}

// Manter função original para compatibilidade
export async function getDecksWithStats() {
  return await getDecksWithStatsOptimized();
}

// Importar arquivo APKG
export async function importApkgFile(file: File, deckData: any) {
  console.log('📦 [importApkgFile] Iniciando importação APKG:', file.name);
  
  const formData = new FormData();
  formData.append('apkgFile', file);
  formData.append('deckData', JSON.stringify(deckData));
  
  try {
    const res = await fetchWithAuth(`${API_BASE}/import-apkg`, {
      method: 'POST',
      body: formData,
      headers: {
        // Não definir Content-Type para FormData - o browser define automaticamente
      }
    });
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(`Erro ao importar APKG: ${errorData.error || res.statusText}`);
    }
    
    const result = await res.json();
    console.log('✅ [importApkgFile] APKG importado com sucesso:', result);
    return result;
  } catch (error) {
    console.error('❌ [importApkgFile] Erro:', error);
    throw error;
  }
}

// Preview de arquivo APKG antes da importação
export async function previewApkgFile(file: File) {
  console.log('👀 [previewApkgFile] Iniciando preview APKG:', file.name);
  
  const formData = new FormData();
  formData.append('apkgFile', file);
  
  try {
    const res = await fetchWithAuth(`${API_BASE}/preview-apkg`, {
      method: 'POST',
      body: formData,
    });
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(`Erro ao fazer preview APKG: ${errorData.error || res.statusText}`);
    }
    
    const preview = await res.json();
    console.log('✅ [previewApkgFile] Preview gerado:', preview);
    return preview;
  } catch (error) {
    console.error('❌ [previewApkgFile] Erro:', error);
    throw error;
  }
}

// Toggle favorito de deck
export async function toggleDeckFavorite(deckId: string) {
  console.log('❤️ [toggleDeckFavorite] Toggling favorite para deck:', deckId);
  
  try {
    const res = await fetchWithAuth(`${API_BASE}/decks/${deckId}/favorite`, {
      method: 'PATCH',
    });
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(`Erro ao favoritar deck: ${errorData.error || res.statusText}`);
    }
    
    const result = await res.json();
    console.log('✅ [toggleDeckFavorite] Favorito atualizado:', result);
    return result;
  } catch (error) {
    console.error('❌ [toggleDeckFavorite] Erro:', error);
    throw error;
  }
}

// Toggle visibilidade pública de deck
export async function toggleDeckPublic(deckId: string) {
  console.log('👁️ [toggleDeckPublic] Toggling visibility para deck:', deckId);
  
  try {
    const res = await fetchWithAuth(`${API_BASE}/decks/${deckId}/visibility`, {
      method: 'PATCH',
    });
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(`Erro ao alterar visibilidade: ${errorData.error || res.statusText}`);
    }
    
    const result = await res.json();
    console.log('✅ [toggleDeckPublic] Visibilidade atualizada:', result);
    return result;
  } catch (error) {
    console.error('❌ [toggleDeckPublic] Erro:', error);
    throw error;
  }
}

// Obter tags disponíveis para filtros
export async function getAvailableTags() {
  console.log('🏷️ [getAvailableTags] Buscando tags disponíveis...');
  
  try {
    const res = await fetchWithAuth(`${API_BASE}/decks/tags`);
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(`Erro ao buscar tags: ${errorData.error || res.statusText}`);
    }
    
    const tags = await res.json();
    console.log('✅ [getAvailableTags] Tags encontradas:', tags);
    return tags;
  } catch (error) {
    console.error('❌ [getAvailableTags] Erro:', error);
    // Retornar array vazio em caso de erro para não quebrar a interface
    return [];
  }
}

// Buscar decks com filtros avançados
export async function searchDecks(params: any = {}) {
  console.log('🔍 [searchDecks] Buscando decks com filtros:', params);
  
  const queryParams = new URLSearchParams();
  
  // Adicionar parâmetros de busca
  if (params.search) queryParams.append('search', params.search);
  if (params.tags && params.tags.length > 0) {
    params.tags.forEach((tag: string) => queryParams.append('tags', tag));
  }
  if (params.status && params.status !== 'all') queryParams.append('status', params.status);
  if (params.userId) queryParams.append('userId', params.userId);
  if (params.isPublic !== undefined) queryParams.append('isPublic', params.isPublic);
  if (params.limit) queryParams.append('limit', params.limit);
  if (params.offset) queryParams.append('offset', params.offset);
  
  try {
    const res = await fetchWithAuth(`${API_BASE}/decks/search?${queryParams.toString()}`);
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(`Erro na busca: ${errorData.error || res.statusText}`);
    }
    
    const results = await res.json();
    console.log('✅ [searchDecks] Resultados encontrados:', results);
    return results;
  } catch (error) {
    console.error('❌ [searchDecks] Erro:', error);
    throw error;
  }
}

// Obter estatísticas consolidadas do usuário
export async function getUserFlashcardStats() {
  console.log('📊 [getUserFlashcardStats] Buscando estatísticas do usuário...');
  
  try {
    const res = await fetchWithAuth(`${API_BASE}/stats/user`);
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(`Erro ao buscar estatísticas: ${errorData.error || res.statusText}`);
    }
    
    const stats = await res.json();
    console.log('✅ [getUserFlashcardStats] Estatísticas obtidas:', stats);
    return stats;
  } catch (error) {
    console.error('❌ [getUserFlashcardStats] Erro:', error);
    // Retornar estatísticas padrão em caso de erro
    return {
      totalDecks: 0,
      totalCards: 0,
      dueCards: 0,
      studiedToday: 0,
      streakDays: 0,
      totalStudyTime: 0
    };
  }
}

// Função para obter metadados das coleções
export async function getCollectionsMetadata() {
  try {
    console.log('📊 [getCollectionsMetadata] Buscando metadados das coleções...');
    
    const res = await fetchWithAuth(`${API_BASE}/collections/metadata`);
    
    if (!res.ok) {
      throw new Error('Erro ao buscar metadados das coleções');
    }
    
    const data = await res.json();
    
    console.log('✅ [getCollectionsMetadata] Metadados recebidos:', data);
    
    return {
      success: data.success || true,
      data: data.data || []
    };
  } catch (error) {
    console.error('❌ [getCollectionsMetadata] Erro:', error);
    return {
      success: false,
      data: [],
      error: error.message
    };
  }
}

// Função para obter decks de uma coleção específica
export async function getCollectionDecks(collectionName: string) {
  try {
    console.log('🔍 [getCollectionDecks] Buscando decks da coleção:', collectionName);
    
    const res = await fetchWithAuth(`${API_BASE}/collections/${encodeURIComponent(collectionName)}/decks`);
    
    if (!res.ok) {
      throw new Error('Erro ao buscar decks da coleção');
    }
    
    const data = await res.json();
    
    console.log('✅ [getCollectionDecks] Decks recebidos:', data);
    
    return {
      success: data.success || true,
      data: data.data || { decks: [] }
    };
  } catch (error) {
    console.error('❌ [getCollectionDecks] Erro:', error);
    return {
      success: false,
      data: { decks: [] },
      error: error.message
    };
  }
}

export async function updateDeckPublicStatus(deckId: string, isPublic: boolean) {
  try {
    console.log('🔄 [updateDeckPublicStatus] Atualizando status:', { deckId, isPublic });
    
    const res = await fetchWithAuth(`${API_BASE}/decks/${deckId}/public-status`, {
      method: 'PUT',
      body: JSON.stringify({ isPublic }),
    });
    
    if (!res.ok) {
      throw new Error('Erro ao atualizar status público do deck');
    }
    
    const data = await res.json();
    
    console.log('✅ [updateDeckPublicStatus] Status atualizado:', data);
    
    return data;
  } catch (error) {
    console.error('❌ [updateDeckPublicStatus] Erro:', error);
    throw error;
  }
}

export async function deleteDeckById(deckId: string) {
  try {
    console.log('🗑️ [deleteDeckById] Excluindo deck:', deckId);
    
    const res = await fetchWithAuth(`${API_BASE}/decks/${deckId}`, { 
      method: 'DELETE' 
    });
    
    if (!res.ok) {
      throw new Error('Erro ao excluir deck');
    }
    
    const data = await res.json();
    
    console.log('✅ [deleteDeckById] Deck excluído:', data);
    
    return data;
  } catch (error) {
    console.error('❌ [deleteDeckById] Erro:', error);
    throw error;
  }
}

export async function getAllUserDecks(limit = 200) {
  try {
    console.log('📚 [getAllUserDecks] Buscando todos os decks do usuário...');
    
    const res = await fetchWithAuth(`${API_BASE}/decks?limit=${limit}`);
    
    if (!res.ok) {
      throw new Error('Erro ao buscar decks do usuário');
    }
    
    const data = await res.json();
    
    console.log('✅ [getAllUserDecks] Decks recebidos:', data);
    
    return {
      success: data.success || true,
      data: data.data || []
    };
  } catch (error) {
    console.error('❌ [getAllUserDecks] Erro:', error);
    return {
      success: false,
      data: [],
      error: error.message
    };
  }
}

/**
 * 🔍 Busca global de flashcards com filtros FSRS
 */
export async function globalFlashcardSearch(query: string, params: {
  filters?: string[];
  page?: number;
  limit?: number;
} = {}) {
  try {
    const { filters = [], page = 1, limit = 200 } = params;
    
    const searchParams = new URLSearchParams({
      q: query,
      page: page.toString(),
      limit: limit.toString()
    });

    if (filters.length > 0) {
      searchParams.set('filters', filters.join(','));
    }

    const response = await fetchWithAuth(`${API_BASE}/search?${searchParams}`);
    
    if (!response.ok) {
      throw new Error('Erro na busca de flashcards');
    }
    
    return response.json();
  } catch (error) {
    console.error('Erro na busca global:', error);
    throw error;
  }
}

/**
 * 📊 Busca status FSRS do usuário
 */
export async function getFSRSStatus() {
  try {
    const response = await fetchWithAuth(`${API_BASE}/fsrs-stats`);
    
    if (!response.ok) {
      throw new Error('Erro ao buscar status FSRS');
    }
    
    return response.json();
  } catch (error) {
    console.error('Erro ao buscar status FSRS:', error);
    throw error;
  }
}

/**
 * 🔄 Duplicar flashcard
 */
export async function duplicateFlashcard(cardId: string, options: {
  newDeckId?: string;
  modifications?: {
    front?: string;
    back?: string;
    tags?: string[];
    difficulty?: number;
  };
} = {}) {
  try {
    const response = await fetchWithAuth(`${API_BASE}/${cardId}/duplicate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options),
    });
    
    if (!response.ok) {
      throw new Error('Erro ao duplicar flashcard');
    }
    
    return response.json();
  } catch (error) {
    console.error('Erro ao duplicar flashcard:', error);
    throw error;
  }
}

/**
 * 🗑️ Exclusão em lote de flashcards
 */
export async function deleteFlashcardsBatch(cardIds: string[]) {
  try {
    const response = await fetchWithAuth(`${API_BASE}/batch-delete`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ cardIds }),
    });
    
    if (!response.ok) {
      throw new Error('Erro na exclusão em lote');
    }
    
    return response.json();
  } catch (error) {
    console.error('Erro na exclusão em lote:', error);
    throw error;
  }
}

/**
 * 🏷️ Buscar cards por deck com filtros avançados
 */
export async function getCardsByDeck(deckId: string, params: {
  page?: number;
  limit?: number;
  search?: string;
  tags?: string[];
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
} = {}) {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search, 
      tags, 
      status, 
      sortBy = 'createdAt', 
      sortOrder = 'desc' 
    } = params;
    
    const searchParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      sortBy,
      sortOrder
    });

    if (search) searchParams.set('search', search);
    if (status) searchParams.set('status', status);
    if (tags && tags.length > 0) {
      tags.forEach(tag => searchParams.append('tags', tag));
    }

    const response = await fetchWithAuth(`${API_BASE}/deck/${deckId}/cards?${searchParams}`);
    
    console.log('🔍 [getCardsByDeck] URL chamada:', `${API_BASE}/deck/${deckId}/cards?${searchParams}`);
    console.log('🔍 [getCardsByDeck] Status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [getCardsByDeck] Erro:', errorText);
      throw new Error('Erro ao buscar cards do deck');
    }
    
    const data = await response.json();
    console.log('✅ [getCardsByDeck] Dados:', data);
    return data;
  } catch (error) {
    console.error('Erro ao buscar cards do deck:', error);
    throw error;
  }
}

/**
 * 🎯 Buscar cards de um deck (alias para compatibilidade)
 * Esta função existe para manter compatibilidade com código existente
 */
export async function getDeckCards(deckId: string, params = {}) {
  console.log('🚨🚨🚨 [getDeckCards] INÍCIO - Buscando cards para deck ID:', deckId);
  console.log('🚨🚨🚨 [getDeckCards] API_BASE:', API_BASE);
  console.log('🚨🚨🚨 [getDeckCards] URL completa:', `${API_BASE}/decks/${deckId}`);
  
  try {
    // FORÇAR: Sempre usar o endpoint deck+cards
    console.log('🚨🚨🚨 [getDeckCards] Chamando fetchWithAuth...');
    const deckWithCardsResponse = await fetchWithAuth(`${API_BASE}/decks/${deckId}`);
    
    console.log('🚨🚨🚨 [getDeckCards] Status da resposta:', deckWithCardsResponse.status);
    console.log('🚨🚨🚨 [getDeckCards] Response OK?', deckWithCardsResponse.ok);
    
    if (deckWithCardsResponse.ok) {
      const deckData = await deckWithCardsResponse.json();
      console.log('🚨🚨🚨 [getDeckCards] Resposta deck+cards COMPLETA:', deckData);
      
      // O deck pode ter cards diretamente ou dentro de data
      const cards = deckData.cards || (deckData.data && deckData.data.cards) || [];
      console.log('🚨🚨🚨 [getDeckCards] Cards extraídos:', cards.length);
      console.log('🚨🚨🚨 [getDeckCards] Primeiros 3 cards IDs:', 
        cards.slice(0, 3).map(card => ({ id: card.id, front: card.frontContent?.substring(0, 30) || card.front?.substring(0, 30) }))
      );
      
      return {
        success: true,
        data: {
          ...deckData,
          cards: cards
        }
      };
    } else {
      console.log('🚨🚨🚨 [getDeckCards] Endpoint deck+cards falhou, tentando fallback...');
      // Fallback para o endpoint separado
      const cardsResponse = await fetchWithAuth(`${API_BASE}/deck/${deckId}/cards`, {
        method: 'GET',
        ...params
      });
      
      if (cardsResponse.ok) {
        const cardsData = await cardsResponse.json();
        console.log('🚨🚨🚨 [getDeckCards] Fallback cards:', cardsData);
        return cardsData;
      }
      
      throw new Error(`Erro ao buscar cards: ${cardsResponse.status}`);
    }
  } catch (error) {
    console.error('🚨🚨🚨 [getDeckCards] Erro:', error);
    throw error;
  }
}

/**
 * 🏷️ Atualizar tags de um flashcard
 */
export async function updateFlashcardTags(cardId: string, tags: string[]) {
  try {
    const response = await fetchWithAuth(`${API_BASE}/${cardId}/tags`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tags }),
    });
    
    if (!response.ok) {
      throw new Error('Erro ao atualizar tags');
    }
    
    return response.json();
  } catch (error) {
    console.error('Erro ao atualizar tags:', error);
    throw error;
  }
}

// Cache para getDeckCardStats
const deckCardStatsCache = new Map<string, { data: any; timestamp: number }>();

/**
 * 📊 Buscar estatísticas de cards por deck
 */
export async function getDeckCardStats(deckId: string, useCache = true) {
  const cacheKey = `deck-card-stats-${deckId}`;
  const now = Date.now();
  const cached = deckCardStatsCache.get(cacheKey);
  
  // Verificar cache (2 minutos de TTL)
  if (useCache && cached && (now - cached.timestamp) < (2 * 60 * 1000)) {
    return cached.data;
  }
  
  try {
    const response = await fetchWithAuth(`${API_BASE}/deck/${deckId}/stats`);
    
    if (!response.ok) {
      throw new Error('Erro ao buscar estatísticas do deck');
    }
    
    const data = await response.json();
    
    // Atualizar cache
    if (useCache) {
      deckCardStatsCache.set(cacheKey, {
        data,
        timestamp: now
      });
    }
    
    return data;
  } catch (error) {
    console.error('Erro ao buscar estatísticas do deck:', error);
    throw error;
  }
}

/**
 * 🧹 Funções para gerenciar cache
 */
export function clearFlashcardCache() {
  decksCache.clear();
  deckStatsCache.clear();
  deckCardStatsCache.clear();
  statsCache.clear();
}

export function clearDeckCache(deckId?: string) {
  if (deckId) {
    // Limpar cache específico do deck
    deckStatsCache.delete(`deck-stats-${deckId}`);
    deckCardStatsCache.delete(`deck-card-stats-${deckId}`);
    
    // Limpar cache de todos os decks para forçar refresh
    statsCache.delete('all-decks-stats');
  } else {
    // Limpar todo o cache de decks
    decksCache.clear();
    statsCache.clear();
  }
}

export function invalidateStatsCache() {
  statsCache.clear();
  deckStatsCache.clear();
  deckCardStatsCache.clear();
}

/**
 * ✏️ Atualizar flashcard completo
 */
export async function updateFlashcardComplete(cardId: string, data: {
  front?: string;
  back?: string;
  tags?: string[];
  difficulty?: number;
  deckId?: string;
}) {
  try {
    const response = await fetchWithAuth(`${API_BASE}/${cardId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error('Erro ao atualizar flashcard');
    }
    
    return response.json();
  } catch (error) {
    console.error('Erro ao atualizar flashcard:', error);
    throw error;
  }
}

/**
 * 🌍 Buscar coleções da comunidade
 */
export async function getCommunityCollections(params: {
  page?: number;
  limit?: number;
  search?: string;
  tags?: string[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
} = {}) {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search, 
      tags, 
      sortBy = 'popularity', 
      sortOrder = 'desc' 
    } = params;
    
    const searchParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      sortBy,
      sortOrder
    });

    if (search) searchParams.set('search', search);
    if (tags && tags.length > 0) {
      tags.forEach(tag => searchParams.append('tags', tag));
    }

    const response = await fetchWithAuth(`${API_BASE}/community/collections?${searchParams}`);
    
    if (!response.ok) {
      throw new Error('Erro ao buscar coleções da comunidade');
    }
    
    return response.json();
  } catch (error) {
    console.error('Erro ao buscar coleções da comunidade:', error);
    throw error;
  }
}

/**
 * 📚 Buscar biblioteca do usuário
 */
export async function getMyLibrary(params: {
  page?: number;
  limit?: number;
  search?: string;
  tags?: string[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
} = {}) {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search, 
      tags, 
      sortBy = 'addedAt', 
      sortOrder = 'desc' 
    } = params;
    
    const searchParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      sortBy,
      sortOrder
    });

    if (search) searchParams.set('search', search);
    if (tags && tags.length > 0) {
      tags.forEach(tag => searchParams.append('tags', tag));
    }

    const response = await fetchWithAuth(`${API_BASE}/my-library?${searchParams}`);
    
    if (!response.ok) {
      throw new Error('Erro ao buscar biblioteca');
    }
    
    return response.json();
  } catch (error) {
    console.error('Erro ao buscar biblioteca:', error);
    throw error;
  }
}

/**
 * ➕ Adicionar coleção à biblioteca
 */
export async function addToLibrary(collectionId: string) {
  try {
    const response = await fetchWithAuth(`${API_BASE}/collections/${collectionId}/add-to-library`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Erro ao adicionar à biblioteca');
    }
    
    return response.json();
  } catch (error) {
    console.error('Erro ao adicionar à biblioteca:', error);
    throw error;
  }
}

/**
 * ➖ Remover coleção da biblioteca
 */
export async function removeFromLibrary(collectionId: string) {
  try {
    const response = await fetchWithAuth(`${API_BASE}/collections/${collectionId}/remove-from-library`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Erro ao remover da biblioteca');
    }
    
    return response.json();
  } catch (error) {
    console.error('Erro ao remover da biblioteca:', error);
    throw error;
  }
}

/**
 * ❤️ Curtir/Descurtir coleção
 */
export async function toggleLikeCollection(collectionId: string) {
  try {
    const response = await fetchWithAuth(`${API_BASE}/collections/${collectionId}/like`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error('Erro ao processar like');
    }
    
    return response.json();
  } catch (error) {
    console.error('Erro ao processar like:', error);
    throw error;
  }
}

/**
 * ⭐ Avaliar coleção
 */
export async function rateCollection(collectionId: string, rating: number, comment?: string) {
  try {
    const response = await fetchWithAuth(`${API_BASE}/collections/${collectionId}/rate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ rating, comment }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Erro ao avaliar coleção');
    }
    
    return response.json();
  } catch (error) {
    console.error('Erro ao avaliar coleção:', error);
    throw error;
  }
}

/**
 * 📥 Iniciar importação APKG robusta
 */
export async function startApkgImport(file: File, config: {
  name: string;
  description?: string;
  tags?: string[];
  isPublic?: boolean;
  category?: string;
  language?: string;
  difficulty?: string;
  duplicateHandling?: 'skip' | 'update' | 'create';
  enableFSRS?: boolean;
  processImages?: boolean;
  processAudio?: boolean;
  chunkSize?: number;
  enableIndexing?: boolean;
}) {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', config.name);
    
    if (config.description) formData.append('description', config.description);
    if (config.tags) {
      config.tags.forEach(tag => formData.append('tags', tag));
    }
    if (config.isPublic !== undefined) formData.append('isPublic', config.isPublic.toString());
    if (config.category) formData.append('category', config.category);
    if (config.language) formData.append('language', config.language);
    if (config.difficulty) formData.append('difficulty', config.difficulty);
    if (config.duplicateHandling) formData.append('duplicateHandling', config.duplicateHandling);
    if (config.enableFSRS !== undefined) formData.append('enableFSRS', config.enableFSRS.toString());
    if (config.processImages !== undefined) formData.append('processImages', config.processImages.toString());
    if (config.processAudio !== undefined) formData.append('processAudio', config.processAudio.toString());
    if (config.chunkSize) formData.append('chunkSize', config.chunkSize.toString());
    if (config.enableIndexing !== undefined) formData.append('enableIndexing', config.enableIndexing.toString());

    const response = await fetchWithAuth(`${API_BASE}/apkg-fsrs/import`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Erro ao iniciar importação');
    }

    return response.json();
  } catch (error) {
    console.error('Erro ao iniciar importação APKG:', error);
    throw error;
  }
}

/**
 * 📊 Buscar progresso da importação
 */
export async function getImportProgress(importId: string) {
  try {
    const response = await fetchWithAuth(`${API_BASE}/apkg-fsrs/import-progress/${importId}`);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Erro ao buscar progresso');
    }

    return response.json();
  } catch (error) {
    console.error('Erro ao buscar progresso da importação:', error);
    throw error;
  }
}

/**
 * ⏸️ Pausar/Retomar importação
 */
export async function controlImport(importId: string, action: 'pause' | 'resume') {
  try {
    const response = await fetchWithAuth(`${API_BASE}/apkg-fsrs/import/${importId}/pause`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Erro ao controlar importação');
    }

    return response.json();
  } catch (error) {
    console.error('Erro ao controlar importação:', error);
    throw error;
  }
}

// ✅ CORRIGIDO: Método para buscar decks do usuário (VIA BACKEND)
export async function getUserDecks(userId: string): Promise<any[]> {
  try {
    const res = await fetchWithAuth(`${API_BASE}/decks`);
    if (!res.ok) throw new Error('Erro ao buscar decks do usuário');
    const response = await res.json();
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('Erro ao buscar decks do usuário:', error);
    throw error;
  }
}

// ✅ CORRIGIDO: Buscar flashcards com filtros (VIA BACKEND)
export async function getFlashcardsWithFilters(userId: string, filters: any = {}): Promise<any[]> {
  try {
    const params = new URLSearchParams();
    params.append('userId', userId);
    
    if (filters.deckId) params.append('deckId', filters.deckId);
    if (filters.tags && filters.tags.length > 0) {
      filters.tags.forEach((tag: string) => params.append('tags', tag));
    }
    if (filters.status) params.append('status', filters.status);
    if (filters.difficulty) params.append('difficulty', filters.difficulty);
    
    const res = await fetchWithAuth(`${API_BASE}/flashcards/filtered?${params.toString()}`);
    if (!res.ok) throw new Error('Erro ao buscar flashcards com filtros');
    const response = await res.json();
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('Erro ao buscar flashcards com filtros:', error);
    throw error;
  }
}

// Export as an object for compatibility
export const flashcardService = {
  getAllDecks,
  getDeckById,
  createDeck,
  updateDeck,
  deleteDeck,
  createFlashcard,
  getFlashcardById,
  getFlashcardsByDeck,
  updateFlashcard,
  deleteFlashcard,
  toggleArchiveFlashcard,
  recordFlashcardReview,
  searchFlashcards,
  getDeckStats,
  getDecksWithStats,
  importApkgFile,
  previewApkgFile,
  toggleDeckFavorite,
  toggleDeckPublic,
  getAvailableTags,
  searchDecks,
  getUserFlashcardStats,
  getCollectionsMetadata,
  getCollectionDecks,
  updateDeckPublicStatus,
  deleteDeckById,
  getAllUserDecks,
  globalFlashcardSearch,
  getFSRSStatus,
  duplicateFlashcard,
  deleteFlashcardsBatch,
  getCardsByDeck,
  getDeckCards,
  updateFlashcardTags,
  getDeckCardStats,
  updateFlashcardComplete,
  getCommunityCollections,
  getMyLibrary,
  addToLibrary,
  removeFromLibrary,
  toggleLikeCollection,
  rateCollection,
  startApkgImport,
  getImportProgress,
  controlImport,
  getUserDecks,
  getFlashcardsWithFilters,
};
