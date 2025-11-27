import { Collection, Deck, Flashcard } from '@/types/flashcards';
import { getCollectionsMetadata, getCollectionDecks } from '@/services/flashcardService';

/**
 * Get all collections
 */
export async function getCollections(): Promise<Collection[]> {
  try {
    const response = await getCollectionsMetadata();
    
    if (!response.success || !response.data) {
      throw new Error('Failed to fetch collections');
    }
    
    // Transformar para o formato esperado
    return response.data.map((col: any) => ({
      id: col.id || col.name,
      name: col.name,
      description: '',
      deckCount: col.deckCount || 0,
      cardCount: col.cardCount || 0,
      createdAt: col.createdAt || new Date().toISOString(),
      updatedAt: col.updatedAt || new Date().toISOString(),
    }));
  } catch (error) {
    console.error('Error fetching collections:', error);
    throw new Error('Failed to fetch collections');
  }
}

/**
 * Get a single collection by ID (UUID)
 */
export async function getCollection(id: string): Promise<Collection> {
  try {
    // Decodificar URL encoding
    const decodedId = decodeURIComponent(id);
    
    const { getCollectionByUniqueId } = await import('@/services/flashcardService');
    const response = await getCollectionByUniqueId(decodedId);
    
    if (!response.success || !response.data) {
      throw new Error(`Collection not found: ${decodedId}`);
    }
    
    const col = response.data;
    return {
      id: col.id,
      name: col.name || col.title,
      title: col.title,
      description: col.description || '',
      deckCount: col.deck_count || 0,
      cardCount: col.card_count || 0,
      createdAt: col.created_at || new Date().toISOString(),
      updatedAt: col.updated_at || new Date().toISOString(),
      thumbnail_url: col.thumbnail_url || col.image_url || null,
      isImported: col.is_imported || false,
      isPublic: col.is_public || false,
      isFromCommunity: col.isFromCommunity || false,
      canEdit: col.canEdit || false,
      user_id: col.user_id || col.owner_id,
      is_official: col.is_official || false,
      author_name: col.author_name,
    };
  } catch (error) {
    console.error('Error fetching collection:', error);
    throw error;
  }
}

/**
 * Get all decks in a collection by ID (UUID)
 */
export async function getDecksByCollection(collectionId: string): Promise<Deck[]> {
  try {
    // Decodificar URL encoding
    const decodedId = decodeURIComponent(collectionId);
    
    const { getDecksByCollectionId } = await import('@/services/flashcardService');
    const response = await getDecksByCollectionId(decodedId);
    
    if (!response.success || !response.data) {
      return [];
    }
    
    return response.data.decks.map((deck: any) => ({
      id: deck.id,
      collectionId: deck.collection_id || decodedId,
      collection_id: deck.collection_id,
      name: deck.name,
      description: deck.description,
      institution: deck.name || '',
      area: deck.area || '',
      tags: deck.tags || [],
      totalCards: deck.card_count || deck.flashcard_count || 0,
      studiedCards: 0,
      reviewCards: 0,
      newCards: deck.card_count || deck.flashcard_count || 0,
      isAdded: true,
      priority: deck.priority || 1,
      createdAt: deck.created_at || deck.createdAt || new Date().toISOString(),
      updatedAt: deck.updated_at || deck.updatedAt || new Date().toISOString(),
      user_id: deck.user_id,
      is_public: deck.is_public,
      is_imported: deck.is_imported,
      image_url: deck.image_url,
      hierarchy: deck.hierarchy,
    }));
  } catch (error) {
    console.error('Error fetching decks:', error);
    return [];
  }
}

/**
 * Get a single deck by ID
 */
export async function getDeck(id: string): Promise<Deck> {
  try {
    // Buscar todas as coleções e seus decks
    const collections = await getCollections();
    
    for (const collection of collections) {
      const decks = await getDecksByCollection(collection.id);
      const deck = decks.find(d => d.id === id);
      
      if (deck) {
        return deck;
      }
    }
    
    throw new Error('Deck not found');
  } catch (error) {
    console.error('Error fetching deck:', error);
    throw new Error('Failed to fetch deck');
  }
}

/**
 * Get all flashcards in a deck
 */
/**
 * Extrai o nome da coleção do ID do flashcard
 * Formato do ID: usuario_colecao_deck_index_hash
 * Exemplo: inocencio-junior-h8sk_pediatria_oftalmologia-sindrome-do-homem-vermelho_59_489db0aa
 */
function extractCollectionFromId(flashcardId: string): string | null {
  try {
    const parts = flashcardId.split('_');
    if (parts.length >= 3) {
      // parts[0] = usuario
      // parts[1] = colecao
      // Converter de kebab-case para Title Case
      const collectionSlug = parts[1];
      return collectionSlug
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
    return null;
  } catch {
    return null;
  }
}

export async function getFlashcardsByDeck(deckId: string): Promise<Flashcard[]> {
  try {
    const { getDeckById } = await import('@/services/flashcardService');
    const response = await getDeckById(deckId);
    
    // O backend retorna { success: true, data: {...}, cards: [...] } ou diretamente o deck
    let cards = [];
    let deckData = null;
    
    // Verificar se a resposta tem o formato esperado
    if (response.cards) {
      // Formato direto: { id, name, cards: [...] }
      cards = response.cards;
      deckData = response;
    } else if (response.success && response.data) {
      // Formato com success: { success: true, data: { cards: [...] } }
      cards = response.data.cards || [];
      deckData = response.data;
    } else if (response.data && response.data.cards) {
      cards = response.data.cards;
      deckData = response.data;
    } else if (Array.isArray(response)) {
      cards = response;
    }
    
    const deckName = deckData?.name;
    
    return cards.map((card: any) => {
      // Extrair nome da coleção do ID do flashcard
      const collectionName = extractCollectionFromId(card.id);
      
      // Construir breadcrumb: Nome da Coleção > Nome do Deck
      const breadcrumb = collectionName && deckName ? [collectionName, deckName] : [];
      
      return {
        id: card.id,
        deckId: deckId,
        front: card.front_content || card.front || '',
        back: card.back_content || card.back || '',
        tags: card.tags || [],
        isHtml: true,
        images: [],
        breadcrumb: breadcrumb,
        interval: card.interval || 0,
        easeFactor: card.ease_factor || 2.5,
        repetitions: card.repetitions || 0,
        nextReview: card.next_review_at || undefined,
        createdAt: card.created_at || new Date().toISOString(),
        updatedAt: card.updated_at || new Date().toISOString(),
      };
    });
  } catch (error) {
    console.error('Error fetching flashcards:', error);
    return [];
  }
}

/**
 * Get all decks (for filtering/search)
 */
export async function getAllDecks(): Promise<Deck[]> {
  try {
    const collections = await getCollections();
    const allDecks: Deck[] = [];
    
    for (const collection of collections) {
      const decks = await getDecksByCollection(collection.id);
      allDecks.push(...decks);
    }
    
    return allDecks;
  } catch (error) {
    console.error('Error fetching all decks:', error);
    throw new Error('Failed to fetch decks');
  }
}
