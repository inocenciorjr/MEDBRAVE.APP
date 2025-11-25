import { fetchWithAuth } from '@/lib/utils/fetchWithAuth';
// import { getUserReviews, SRSContentType } from './srsService'; // REMOVIDO: Migrado para sistema unificado

const API_BASE = '/flashcards';

// Interfaces
interface FlashcardData {
  id: string;
  front: string;
  back: string;
  tags?: string[];
  difficulty?: number;
  stability?: number;
  // retrievability?: number; // Campo removido - não existe no backend
  last_reviewed_at?: string;
  next_review_at?: string;
  review_count?: number;
  lapse_count?: number;
}

interface DeckStats {
  total_cards: number;
  due_cards: number;
  last_reviewed: string;
}

export interface CreateFlashcardDTO {
  deckId: string;
  frontContent: string;
  backContent: string;
  personalNotes?: string;
  tags?: string[];
  difficulty?: number;
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
  try {
    const res = await fetchWithAuth(`${API_BASE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(`Erro ao criar flashcard: ${errorData.error || res.statusText}`);
    }
    
    const responseData = await res.json();
    return responseData;
  } catch (error) {
    throw error;
  }
}

export async function getFlashcardById(id: string) {
  const res = await fetchWithAuth(`${API_BASE}/${id}`);
  if (!res.ok) throw new Error('Erro ao buscar flashcard');
  return res.json();
}

export async function getFlashcardsByDeck(deck_id: string, params = {}) {
  return getDeckCards(deck_id, params);
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
  // Status 204 não tem body
  if (res.status === 204) return;
  return res.json();
}

export async function toggleArchiveFlashcard(id: string) {
  const res = await fetchWithAuth(`${API_BASE}/${id}/archive`, { method: 'PATCH' });
  if (!res.ok) throw new Error('Erro ao arquivar/desarquivar flashcard');
  return res.json();
}

export async function recordFlashcardReview(id: string, review_quality: number, review_time_ms: number = 0) {
  if (process.env.NODE_ENV === 'development') {
    console.log('Enviando revisão:', { id, review_quality, review_time_ms });
  }
  
  // Codificar o ID para lidar com caracteres especiais
  const encodedId = encodeURIComponent(id);
  if (process.env.NODE_ENV === 'development') {
    console.log('ID codificado:', encodedId);
  }
  
  try {
    const res = await fetchWithAuth(`${API_BASE}/${encodedId}/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ review_quality, review_time_ms }),
    });

    if (process.env.NODE_ENV === 'development') {
      console.log('URL chamada:', `${API_BASE}/${encodedId}/review`);
      console.log('Status da resposta:', res.status);
    }

    if (!res.ok) {
      const errorText = await res.text();
      console.error('Erro ao registrar revisão:', { 
        status: res.status, 
        statusText: res.statusText,
        errorText: errorText.substring(0, 500) // Limitar tamanho do log
      });
      throw new Error(`Erro ao registrar revisão: ${errorText}`);
    }
    
    const responseData = await res.json();
    if (process.env.NODE_ENV === 'development') {
      console.log('Resposta do servidor:', responseData);
    }
    return responseData;
  } catch (error) {
    console.error('Erro na requisição:', error);
    throw error;
  }
}

export async function searchFlashcards(query: string, params = {}) {
  const res = await fetchWithAuth(`${API_BASE}/search?query=${query}`);
  if (!res.ok) throw new Error('Erro na busca de flashcards');
  return res.json();
}

// Cache para getDeckStats individual
const deckStatsCache = new Map<string, { data: DeckStats; timestamp: number }>();

// Obter estatísticas de um deck (integração com SRS)
export const getDeckStats = async (deck_id: string, useCache = true): Promise<DeckStats> => {
  const cacheKey = `deck-stats-${deck_id}`;
  const now = Date.now();
  const cached = deckStatsCache.get(cacheKey);
  
  // Verificar cache (2 minutos de TTL)
  if (useCache && cached && (now - cached.timestamp) < (2 * 60 * 1000)) {
    return cached.data;
  }
  
  try {
    const response = await fetchWithAuth(`${API_BASE}/deck/${deck_id}/cards`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch deck stats: ${response.status}`);
    }
    
    const cards = await response.json();
    
    const total_cards = cards.length;
    const due_cards = cards.filter((card: any) => {
      if (!card.fsrs_data) return true;
      const next_review = new Date(card.fsrs_data.due);
      return next_review <= new Date();
    }).length;
    
    const last_reviewed = cards.length > 0 && cards.some((card: any) => card.fsrs_data?.last_review)
      ? new Date(Math.max(...cards
          .filter((card: any) => card.fsrs_data?.last_review)
          .map((card: any) => new Date(card.fsrs_data.last_review).getTime())
        )).toLocaleDateString('pt-BR')
      : 'Nunca';
    
    const stats = {
      total_cards,
      due_cards,
      last_reviewed
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
    throw error;
  }
};

// Cache para estatísticas de decks com Stale-While-Revalidate
const statsCache = new Map<string, { data: any; timestamp: number; isStale: boolean }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos
const STALE_TTL = 10 * 60 * 1000; // 10 minutos (tempo para considerar stale)

// Função para buscar estatísticas em lote
export async function getBatchDeckStats(deck_ids: string[]) {
  try {
    const response = await fetchWithAuth(`${API_BASE}/decks/batch-stats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ deck_ids }),
    });
    
    if (!response.ok) {
      throw new Error('Erro ao buscar estatísticas em lote');
    }
    
    const result = await response.json();
    return result.data;
  } catch (error) {
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
    // Silently handle background update errors
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
  const deck_ids = decksData.map(deck => deck.id);
  const batchStats = await getBatchDeckStats(deck_ids);
  
  const decksWithStats = decksData.map(deck => {
    const stats = batchStats[deck.id] || {
      total: 0,
      byStatus: { new: 0, learning: 0, review: 0, relearning: 0 },
      byDifficulty: { easy: 0, medium: 0, hard: 0 },
      tags: {},
      last_review: null
    };
    
    return {
      id: deck.id,
      title: deck.name || 'Sem título',
      subject: deck.tags?.[0] || 'Geral',
      card_count: stats.total,
      last_reviewed: stats.last_review ? new Date(stats.last_review).toLocaleDateString('pt-BR') : 'Nunca',
      due_cards: stats.byStatus.new + stats.byStatus.learning + stats.byStatus.relearning,
      // Campos originais do backend
      name: deck.name,
      description: deck.description,
      isPublic: deck.isPublic,
      tags: deck.tags || [],
      user_id: deck.user_id,
      status: deck.status,
      created_at: deck.created_at,
      updated_at: deck.updated_at,
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
    return result;
  } catch (error) {
    throw error;
  }
}

// Preview de arquivo APKG antes da importação
export async function previewApkgFile(file: File) {
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
    return preview;
  } catch (error) {
    throw error;
  }
}

// Toggle favorito de deck
export async function toggleDeckFavorite(deck_id: string) {
  try {
    const res = await fetchWithAuth(`${API_BASE}/decks/${deck_id}/favorite`, {
      method: 'PATCH',
    });
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(`Erro ao favoritar deck: ${errorData.error || res.statusText}`);
    }
    
    const result = await res.json();
    return result;
  } catch (error) {
    throw error;
  }
}

// Toggle visibilidade pública de deck
export async function toggleDeckPublic(deck_id: string) {
  try {
    const res = await fetchWithAuth(`${API_BASE}/decks/${deck_id}/visibility`, {
      method: 'PATCH',
    });
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(`Erro ao alterar visibilidade: ${errorData.error || res.statusText}`);
    }
    
    const result = await res.json();
    return result;
  } catch (error) {
    throw error;
  }
}

// Obter tags disponíveis para filtros
export async function getAvailableTags() {
  try {
    const res = await fetchWithAuth(`${API_BASE}/decks/tags`);
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(`Erro ao buscar tags: ${errorData.error || res.statusText}`);
    }
    
    const tags = await res.json();
    return tags;
  } catch (error) {
    // Retornar array vazio em caso de erro para não quebrar a interface
    return [];
  }
}

// Buscar decks com filtros avançados
export async function searchDecks(params: any = {}) {
  const queryParams = new URLSearchParams();
  
  // Adicionar parâmetros de busca
  if (params.search) queryParams.append('search', params.search);
  if (params.tags && params.tags.length > 0) {
    params.tags.forEach((tag: string) => queryParams.append('tags', tag));
  }
  if (params.status && params.status !== 'all') queryParams.append('status', params.status);
  if (params.user_id) queryParams.append('user_id', params.user_id);
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
    return results;
  } catch (error) {
    throw error;
  }
}

// Obter estatísticas consolidadas do usuário
export async function getUserFlashcardStats() {
  try {
    const res = await fetchWithAuth(`${API_BASE}/stats/user`);
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(`Erro ao buscar estatísticas: ${errorData.error || res.statusText}`);
    }
    
    const stats = await res.json();
    return stats;
  } catch (error) {
    // Retornar estatísticas padrão em caso de erro
    return {
      total_decks: 0,
      total_cards: 0,
      due_cards: 0,
      studied_today: 0,
      streakDays: 0,
      totalStudyTime: 0
    };
  }
}

// Função para obter metadados das coleções
export async function getCollectionsMetadata() {
  try {
    const res = await fetchWithAuth(`${API_BASE}/collections/metadata`);
    
    if (!res.ok) {
      throw new Error('Erro ao buscar metadados das coleções');
    }
    
    const data = await res.json();
    
    return {
      success: data.success || true,
      data: data.data || []
    };
  } catch (error: any) {
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
    const res = await fetchWithAuth(`${API_BASE}/collections/${encodeURIComponent(collectionName)}/decks`);
    
    if (!res.ok) {
      throw new Error('Erro ao buscar decks da coleção');
    }
    
    const data = await res.json();
    
    return {
      success: data.success || true,
      data: data.data || { decks: [] }
    };
  } catch (error: any) {
    return {
      success: false,
      data: { decks: [] },
      error: error.message
    };
  }
}

export async function updateDeckPublicStatus(deck_id: string, isPublic: boolean) {
  try {
    const res = await fetchWithAuth(`${API_BASE}/decks/${deck_id}/public-status`, {
      method: 'PUT',
      body: JSON.stringify({ isPublic }),
    });
    
    if (!res.ok) {
      throw new Error('Erro ao atualizar status público do deck');
    }
    
    const data = await res.json();
    
    return data;
  } catch (error) {
    throw error;
  }
}

export async function deleteDeckById(deck_id: string) {
  try {
    const res = await fetchWithAuth(`${API_BASE}/decks/${deck_id}`, { 
      method: 'DELETE' 
    });
    
    if (!res.ok) {
      throw new Error('Erro ao excluir deck');
    }
    
    const data = await res.json();
    
    return data;
  } catch (error) {
    throw error;
  }
}

export async function getAllUserDecks(limit = 200) {
  try {
    const res = await fetchWithAuth(`${API_BASE}/decks?limit=${limit}`);
    
    if (!res.ok) {
      throw new Error('Erro ao buscar decks do usuário');
    }
    
    const data = await res.json();
    
    return {
      success: data.success || true,
      data: data.data || []
    };
  } catch (error: any) {
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
    throw error;
  }
}

/**
 * 🔄 Duplicar flashcard
 */
export async function duplicateFlashcard(card_id: string, options: {
  new_deck_id?: string;
  modifications?: {
    front?: string;
    back?: string;
    tags?: string[];
    difficulty?: number;
  };
} = {}) {
  try {
    const response = await fetchWithAuth(`${API_BASE}/${card_id}/duplicate`, {
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
    throw error;
  }
}

/**
 * 🗑️ Exclusão em lote de flashcards
 */
export async function deleteFlashcardsBatch(card_ids: string[]) {
  try {
    const response = await fetchWithAuth(`${API_BASE}/batch-delete`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ card_ids }),
    });
    
    if (!response.ok) {
      throw new Error('Erro na exclusão em lote');
    }
    
    return response.json();
  } catch (error) {
    throw error;
  }
}

/**
 * 🏷️ Buscar cards por deck com filtros avançados
 */
export async function getCardsByDeck(deck_id: string, params: {
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
      sortBy = 'created_at', 
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

    const response = await fetchWithAuth(`${API_BASE}/deck/${deck_id}/cards?${searchParams}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error('Erro ao buscar cards do deck');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
}

/**
 * 🎯 Buscar cards de um deck (alias para compatibilidade)
 * Esta função existe para manter compatibilidade com código existente
 */
export async function getDeckCards(deck_id: string, params = {}) {

  
  try {
    if (!deck_id || deck_id === 'undefined') {
      throw new Error('Deck ID inválido: ' + deck_id);
    }

    // Usar o endpoint correto para buscar cards de um deck
    const cardsResponse = await fetchWithAuth(`${API_BASE}/deck/${deck_id}/cards`, {
      method: 'GET',
      ...params
    });
    
    if (cardsResponse.ok) {
      const cardsData = await cardsResponse.json();
      return cardsData;
    }
    
    throw new Error(`Erro ao buscar cards: ${cardsResponse.status}`);
  } catch (error) {
    throw error;
  }
}

/**
 * 🏷️ Atualizar tags de um flashcard
 */
export async function updateFlashcardTags(card_id: string, tags: string[]) {
  try {
    const response = await fetchWithAuth(`${API_BASE}/${card_id}/tags`, {
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
    throw error;
  }
}

// Cache para getDeckCardStats
const deckCardStatsCache = new Map<string, { data: any; timestamp: number }>();

/**
 * 📊 Buscar estatísticas de cards por deck
 */
export async function getDeckCardStats(deck_id: string, useCache = true) {
  const cacheKey = `deck-card-stats-${deck_id}`;
  const now = Date.now();
  const cached = deckCardStatsCache.get(cacheKey);
  
  // Verificar cache (2 minutos de TTL)
  if (useCache && cached && (now - cached.timestamp) < (2 * 60 * 1000)) {
    return cached.data;
  }
  
  try {
    const response = await fetchWithAuth(`${API_BASE}/deck/${deck_id}/stats`);
    
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

export function clearDeckCache(deck_id?: string) {
  if (deck_id) {
    // Limpar cache específico do deck
    deckStatsCache.delete(`deck-stats-${deck_id}`);
    deckCardStatsCache.delete(`deck-card-stats-${deck_id}`);
    
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
export async function updateFlashcardComplete(card_id: string, data: {
  front?: string;
  back?: string;
  tags?: string[];
  difficulty?: number;
  deck_id?: string;
}) {
  try {
    const response = await fetchWithAuth(`${API_BASE}/${card_id}`, {
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
    throw error;
  }
}

/**
 * 🏛️ Buscar coleções OFICIAIS MedBrave
 */
export async function getOfficialCollections(params: {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
} = {}) {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search, 
      sortBy = 'recent', 
      sortOrder = 'desc' 
    } = params;
    
    const searchParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      sortBy,
      sortOrder
    });

    if (search) searchParams.set('search', search);

    const response = await fetchWithAuth(`${API_BASE}/official/collections?${searchParams}`);
    
    if (!response.ok) {
      throw new Error('Erro ao buscar coleções oficiais');
    }
    
    return response.json();
  } catch (error) {
    throw error;
  }
}

/**
 * 🌍 Buscar coleções da COMUNIDADE (não-oficiais)
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
    throw error;
  }
}

/**
 * 🔍 Buscar detalhes de uma coleção pública
 */
export async function getPublicCollectionDetails(collectionId: string) {
  try {
    const response = await fetchWithAuth(`${API_BASE}/community/collections/${collectionId}`);
    
    if (!response.ok) {
      throw new Error('Erro ao buscar detalhes da coleção');
    }
    
    return response.json();
  } catch (error) {
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
    throw error;
  }
}

/**
 * @deprecated Use addCollectionToLibrary instead (with UUID)
 * ➕ Adicionar coleção à biblioteca (DEPRECATED - usa nome ao invés de ID)
 */
export async function addToLibrary(collectionId: string) {
  console.warn('addToLibrary is deprecated. Use addCollectionToLibrary instead.');
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
    throw error;
  }
}

/**
 * @deprecated Use removeCollectionFromLibrary instead (with UUID)
 * ➖ Remover coleção da biblioteca (DEPRECATED - usa nome ao invés de ID)
 */
export async function removeFromLibrary(collectionId: string) {
  console.warn('removeFromLibrary is deprecated. Use removeCollectionFromLibrary instead.');
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
    throw error;
  }
}

/**
 * @deprecated Use deleteCollection instead (with UUID)
 * 🗑️ Deletar coleção por nome (DEPRECATED - remove decks, flashcards e mídia do R2)
 */
export async function deleteCollectionByName(collectionName: string) {
  console.warn('deleteCollectionByName is deprecated. Use deleteCollection with UUID instead.');
  try {
    const response = await fetchWithAuth(`${API_BASE}/collections/${encodeURIComponent(collectionName)}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Erro ao deletar coleção');
    }
    
    return response.json();
  } catch (error) {
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
    formData.append('apkgFile', file);
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

    const response = await fetchWithAuth(`${API_BASE}/import`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Erro ao iniciar importação');
    }

    return response.json();
  } catch (error) {
    throw error;
  }
}

/**
 * 📊 Buscar progresso da importação
 */
export async function getImportProgress(importId: string) {
  try {
    const response = await fetchWithAuth(`${API_BASE}/import-progress/${importId}`);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Erro ao buscar progresso');
    }

    return response.json();
  } catch (error) {
    throw error;
  }
}

/**
 * ⏸️ Pausar/Retomar importação
 */
export async function controlImport(importId: string, action: 'pause' | 'resume') {
  try {
    const response = await fetchWithAuth(`${API_BASE}/import/${importId}/pause`, {
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
    throw error;
  }
}

// ✅ CORRIGIDO: Método para buscar decks do usuário (VIA BACKEND)
export async function getUserDecks(user_id: string): Promise<any[]> {
  try {
    const res = await fetchWithAuth(`${API_BASE}/decks`);
    if (!res.ok) throw new Error('Erro ao buscar decks do usuário');
    const response = await res.json();
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    throw error;
  }
}

// ✅ CORRIGIDO: Buscar flashcards com filtros (VIA BACKEND)
export async function getFlashcardsWithFilters(user_id: string, filters: any = {}): Promise<any[]> {
  try {
    const params = new URLSearchParams();
    params.append('user_id', user_id);
    
    if (filters.deck_id) params.append('deck_id', filters.deck_id);
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
  updateCollectionPublicStatus,
  toggleCollectionLike,
  registerCollectionImport,
  checkCollectionLiked,
  checkCollectionImported,
};

/**
 * 🔄 Atualizar status público de uma coleção
 */
export async function updateCollectionPublicStatus(collectionName: string, isPublic: boolean) {
  try {
    const response = await fetchWithAuth(`${API_BASE}/collections/${encodeURIComponent(collectionName)}/public-status`, {
      method: 'PUT',
      body: JSON.stringify({ isPublic }),
    });
    
    if (!response.ok) {
      throw new Error('Erro ao atualizar status público da coleção');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erro ao atualizar status público da coleção:', error);
    throw error;
  }
}

/**
 * 📋 Obter todas as coleções importadas (apenas nomes) - OTIMIZADO
 */
export async function getAllImportedCollectionNames(): Promise<string[]> {
  try {
    const response = await fetchWithAuth(`${API_BASE}/collections/imported/all`, {
      method: 'GET',
    });
    
    if (!response.ok) {
      throw new Error('Erro ao buscar coleções importadas');
    }
    
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Erro ao buscar coleções importadas:', error);
    return [];
  }
}

/**
 * ❤️ Curtir/Descurtir uma coleção
 */
export async function toggleCollectionLike(collectionName: string) {
  try {
    const response = await fetchWithAuth(`${API_BASE}/collections/${encodeURIComponent(collectionName)}/like`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error('Erro ao curtir/descurtir coleção');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erro ao curtir/descurtir coleção:', error);
    throw error;
  }
}

/**
 * 📥 Importar uma coleção para a biblioteca
 * Nota: Esta função registra o import mas não adiciona à biblioteca.
 * Para adicionar à biblioteca, use addToLibrary()
 */
export async function registerCollectionImport(collectionName: string) {
  try {
    const response = await fetchWithAuth(`${API_BASE}/collections/${encodeURIComponent(collectionName)}/import`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error('Erro ao registrar import');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erro ao registrar import:', error);
    throw error;
  }
}

/**
 * 🔍 Verificar se usuário curtiu uma coleção
 */
export async function checkCollectionLiked(collectionName: string) {
  try {
    const response = await fetchWithAuth(`${API_BASE}/collections/${encodeURIComponent(collectionName)}/liked`);
    
    if (!response.ok) {
      return { liked: false };
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erro ao verificar like da coleção:', error);
    return { liked: false };
  }
}

/**
 * 🔍 Verificar se usuário importou uma coleção
 */
export async function checkCollectionImported(collectionName: string) {
  try {
    const response = await fetchWithAuth(`${API_BASE}/collections/${encodeURIComponent(collectionName)}/imported`);
    
    if (!response.ok) {
      return { imported: false };
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erro ao verificar import da coleção:', error);
    return { imported: false };
  }
}


// ==================== NOVOS MÉTODOS PARA COLLECTIONS COM ID ÚNICO ====================

/**
 * Criar nova coleção com ID único
 */
export async function createCollection(data: {
  name: string;
  description?: string;
  is_public?: boolean;
  thumbnail_url?: string;
}) {
  const res = await fetchWithAuth(`${API_BASE}/collections`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Erro ao criar coleção');
  return res.json();
}

/**
 * Buscar coleção por ID único
 */
export async function getCollectionByUniqueId(collectionId: string) {
  const res = await fetchWithAuth(`${API_BASE}/collections/by-id/${collectionId}`);
  if (!res.ok) throw new Error('Erro ao buscar coleção');
  return res.json();
}

/**
 * Buscar decks de uma coleção por ID único
 */
export async function getDecksByCollectionId(collectionId: string) {
  const res = await fetchWithAuth(`${API_BASE}/collections/by-id/${collectionId}/decks`);
  if (!res.ok) throw new Error('Erro ao buscar decks da coleção');
  return res.json();
}

/**
 * Adicionar coleção à biblioteca (por ID único)
 */
export async function addCollectionToLibrary(collectionId: string) {
  const res = await fetchWithAuth(`${API_BASE}/collections/by-id/${collectionId}/add`, {
    method: 'POST',
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Erro ao adicionar coleção à biblioteca');
  }
  return res.json();
}

/**
 * Remover coleção da biblioteca (por ID único)
 */
export async function removeCollectionFromLibrary(collectionId: string) {
  const res = await fetchWithAuth(`${API_BASE}/collections/by-id/${collectionId}/remove`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Erro ao remover coleção da biblioteca');
  }
  return res.json();
}

/**
 * Verificar se coleção está na biblioteca
 */
export async function checkCollectionInLibrary(collectionId: string) {
  const res = await fetchWithAuth(`${API_BASE}/collections/by-id/${collectionId}/check`);
  if (!res.ok) throw new Error('Erro ao verificar biblioteca');
  return res.json();
}

/**
 * Atualizar coleção (por ID único)
 */
export async function updateCollection(collectionId: string, data: {
  name?: string;
  description?: string;
  is_public?: boolean;
  thumbnail_url?: string;
}) {
  const res = await fetchWithAuth(`${API_BASE}/collections/by-id/${collectionId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Erro ao atualizar coleção');
  }
  return res.json();
}

/**
 * Deletar coleção (por ID único)
 */
export async function deleteCollection(collectionId: string) {
  const res = await fetchWithAuth(`${API_BASE}/collections/by-id/${collectionId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Erro ao deletar coleção');
  }
  return res.json();
}

