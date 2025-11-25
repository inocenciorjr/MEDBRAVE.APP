import { fetchWithAuth } from '../utils/fetchWithAuth';

export interface DeckStudySession {
  id: string;
  user_id: string;
  deck_id: string;
  current_index: number;
  total_cards: number;
  studied_cards: number;
  reviewed_card_ids: string[];
  last_activity_at: string;
  created_at: string;
  updated_at: string;
}

export interface DeckStats {
  totalCards: number;
  studiedCards: number;
  newCards: number;
  reviewCards: number;
}

/**
 * Buscar ou criar sessão de estudo
 */
export async function getStudySession(deckId: string): Promise<DeckStudySession> {
  const response = await fetchWithAuth(`/flashcards/decks/${deckId}/session`);
  const json = await response.json();
  return json.data;
}

/**
 * Atualizar progresso da sessão
 */
export async function updateStudySession(
  deckId: string,
  updates: {
    current_index?: number;
    studied_cards?: number;
    reviewed_card_ids?: string[];
  }
): Promise<DeckStudySession> {
  const response = await fetchWithAuth(`/flashcards/decks/${deckId}/session`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
  const json = await response.json();
  return json.data;
}

/**
 * Finalizar sessão de estudo
 */
export async function finishStudySession(deckId: string): Promise<void> {
  const response = await fetchWithAuth(`/flashcards/decks/${deckId}/session`, {
    method: 'DELETE',
  });
  await response.json(); // Consumir resposta mesmo que não use
}

/**
 * Buscar estatísticas do deck
 */
export async function getDeckStats(deckId: string): Promise<DeckStats> {
  try {
    const response = await fetchWithAuth(`/flashcards/decks/${deckId}/stats`);
    
    // Parsear JSON da resposta
    const json = await response.json();
    
    // Validar estrutura da resposta
    if (!json || !json.success || !json.data) {
      console.warn('Resposta inválida da API de stats:', json);
      return {
        totalCards: 0,
        studiedCards: 0,
        newCards: 0,
        reviewCards: 0,
      };
    }
    
    return json.data;
  } catch (error) {
    console.error('Erro ao buscar estatísticas do deck:', error);
    // Retornar valores padrão em caso de erro
    return {
      totalCards: 0,
      studiedCards: 0,
      newCards: 0,
      reviewCards: 0,
    };
  }
}
