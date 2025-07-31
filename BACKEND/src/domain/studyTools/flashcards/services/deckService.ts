import { Timestamp, FieldValue, Query, CollectionReference, FieldPath } from 'firebase-admin/firestore';
import { firestore } from '../../../../config/firebaseAdmin';
import AppError from '../../../../utils/AppError';
import {
  Deck,
  DeckStatus,
  CreateDeckPayload,
  UpdateDeckPayload,
  ListDecksOptions,
  PaginatedDecksResult,
} from '../types';
import logger from '../../../../utils/logger';

// Collections
const DECKS_COLLECTION = 'decks';
const FLASHCARDS_COLLECTION = 'flashcards';
const USERS_COLLECTION = 'users';
const FAVORITE_DECKS_COLLECTION = 'favoriteDeck';

export class DeckService {
  private db = firestore;

  private async validateUserExists(userId: string): Promise<void> {
    try {
      const userRef = this.db.collection(USERS_COLLECTION).doc(userId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        throw AppError.notFound(`Usuário com ID ${userId} não encontrado`);
      }
    } catch (error: unknown) {
      if (error instanceof AppError) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      throw AppError.internal(`Erro ao validar usuário: ${errorMessage}`);
    }
  }

  async createDeck(data: CreateDeckPayload): Promise<Deck> {
    try {
      await this.validateUserExists(data.userId);

      const now = Timestamp.now();
      const newDeck: Deck = {
        id: '', // Será preenchido após a criação
        userId: data.userId,
        name: data.name,
        description: data.description || null,
        isPublic: data.isPublic ?? false,
        tags: data.tags || [],
        coverImageUrl: data.coverImageUrl || null,
        status: data.status || DeckStatus.ACTIVE,
        flashcardCount: 0,
        createdAt: now,
        updatedAt: now,
      };

      const docRef = await this.db.collection(DECKS_COLLECTION).add(newDeck);
      newDeck.id = docRef.id;

      // Atualizar estatísticas do usuário
      const userRef = this.db.collection(USERS_COLLECTION).doc(data.userId);
      await userRef.update({
        totalDecks: FieldValue.increment(1),
        updatedAt: now,
      });

      return newDeck;
    } catch (error) {
      logger.error('Erro ao criar deck:', { error, data });
      if (error instanceof AppError) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      throw AppError.internal(`Erro ao criar deck: ${errorMessage}`);
    }
  }

  async getDeckById(id: string, userId: string): Promise<Deck | null> {
    try {
      const deckDoc = await this.db.collection(DECKS_COLLECTION).doc(id).get();
      if (!deckDoc.exists) {
        return null;
      }

      const deck = deckDoc.data() as Deck;

      // Se o deck não for público e não pertencer ao usuário, retorna erro
      if (!deck.isPublic && deck.userId !== userId) {
        throw AppError.forbidden('Usuário não autorizado a acessar este deck.');
      }

      return {
        ...deck,
        id: deckDoc.id,
      };
    } catch (error) {
      logger.error('Erro ao buscar deck:', { error, id, userId });
      if (error instanceof AppError) {
        throw error;
      }
      throw AppError.internal(`Erro ao buscar deck: ${error}`);
    }
  }

  async updateDeck(deckId: string, userId: string, data: UpdateDeckPayload): Promise<Deck | null> {
    try {
      const deckRef = this.db.collection(DECKS_COLLECTION).doc(deckId);
      const doc = await deckRef.get();

      if (!doc.exists) {
        throw AppError.notFound('Deck não encontrado.');
      }

      const existingDeck = doc.data() as Deck;

      // Verificar se o usuário é o proprietário do deck
      if (existingDeck.userId !== userId) {
        throw AppError.forbidden('Usuário não autorizado a atualizar este deck.');
      }

      const updateData: Partial<Deck> = {
        ...data,
        updatedAt: Timestamp.now(),
      };

      await deckRef.update(updateData);

      const updatedDoc = await deckRef.get();
      return {
        ...updatedDoc.data(),
        id: deckId,
      } as Deck;
    } catch (error) {
      logger.error('Erro ao atualizar deck:', { error, deckId, userId, data });
      if (error instanceof AppError) {
        throw error;
      }
      throw AppError.internal(`Erro ao atualizar deck: ${error}`);
    }
  }

  async deleteDeck(deckId: string, userId: string): Promise<void> {
    try {
      const deckRef = this.db.collection(DECKS_COLLECTION).doc(deckId);
      const doc = await deckRef.get();

      if (!doc.exists) {
        throw AppError.notFound('Deck não encontrado.');
      }

      const deck = doc.data() as Deck;

      // Verificar se o usuário é o proprietário do deck
      if (deck.userId !== userId) {
        throw AppError.forbidden('Usuário não autorizado a deletar este deck.');
      }

      const batch = this.db.batch();

      // Buscar todos os flashcards do deck
      const flashcardsQuery = this.db
        .collection(FLASHCARDS_COLLECTION)
        .where('deckId', '==', deckId);
      const flashcardsSnapshot = await flashcardsQuery.get();

      // Deletar todos os flashcards do deck
      flashcardsSnapshot.forEach(flashcardDoc => {
        batch.delete(flashcardDoc.ref);
      });

      // Buscar todos os favoritos deste deck
      const favoritesQuery = this.db
        .collection(FAVORITE_DECKS_COLLECTION)
        .where('deckId', '==', deckId);
      const favoritesSnapshot = await favoritesQuery.get();

      // Deletar todos os favoritos do deck
      favoritesSnapshot.forEach(favoriteDoc => {
        batch.delete(favoriteDoc.ref);
      });

      // Deletar o deck
      batch.delete(deckRef);

      // Atualizar estatísticas do usuário
      const userRef = this.db.collection(USERS_COLLECTION).doc(userId);
      batch.update(userRef, {
        totalDecks: FieldValue.increment(-1),
        updatedAt: Timestamp.now(),
      });

      await batch.commit();
    } catch (error) {
      logger.error('Erro ao deletar deck:', { error, deckId, userId });
      if (error instanceof AppError) {
        throw error;
      }
      throw AppError.internal(`Erro ao deletar deck: ${error}`);
    }
  }

  async listDecks(options: ListDecksOptions = {}): Promise<PaginatedDecksResult> {
    try {
      let query: Query<Deck> = this.db.collection(DECKS_COLLECTION) as CollectionReference<Deck>;

      // Filtros
      if (options.userId) {
        query = query.where('userId', '==', options.userId);
      }

      if (options.status) {
        query = query.where('status', '==', options.status);
      }

      if (options.isPublic !== undefined) {
        query = query.where('isPublic', '==', options.isPublic);
      }

      if (options.tags && options.tags.length > 0) {
        query = query.where('tags', 'array-contains-any', options.tags);
      }

      // Ordenação
      const sortBy = options.sortBy || 'updatedAt';
      const sortOrder = options.sortOrder || 'DESC';
      query = query.orderBy(sortBy, sortOrder.toLowerCase() as 'asc' | 'desc');

      // ÍNDICES NECESSÁRIOS NO FIREBASE:
      // 1. Índice composto: userId + updatedAt (para usuários específicos)
      // 2. Índice composto: userId + status + updatedAt (para filtros de status)
      // 3. Índice composto: userId + isPublic + updatedAt (para filtros de visibilidade)
      // 4. Índice composto: userId + tags + updatedAt (para filtros de tags)

      console.log(`🔍 [DeckService] Executando query para userId: ${options.userId}`);

      // Paginação
      const totalQuery = query;
      let total = 0;

      // Contagem total (somente se for a primeira página)
      if (!options.lastDocId) {
        try {
          const totalSnapshot = await totalQuery.count().get();
          total = totalSnapshot.data().count;
          console.log(`📊 [DeckService] Total de decks encontrados: ${total}`);
        } catch (countError) {
          console.warn('⚠️ [DeckService] Erro ao contar documentos:', countError);
        }
      }

      if (options.lastDocId) {
        const lastDoc = await this.db.collection(DECKS_COLLECTION).doc(options.lastDocId).get();
        if (lastDoc.exists) {
          query = query.startAfter(lastDoc);
        }
      }

      // Limit
      const limit = options.limit || 10;
      query = query.limit(limit + 1); // +1 para verificar se há mais páginas

      console.log(`🔍 [DeckService] Executando query final...`);
      const snapshot = await query.get();
      console.log(`📋 [DeckService] Documentos retornados: ${snapshot.size}`);

      const hasMore = snapshot.size > limit;
      const decks = snapshot.docs.slice(0, limit).map(
        doc => {
          const data = doc.data();
          console.log(`📄 [DeckService] Deck encontrado: ${data.name} (ID: ${doc.id})`);
          return {
            ...data,
            id: doc.id,
          } as Deck;
        }
      );

      console.log(`✅ [DeckService] Retornando ${decks.length} decks`);

      return {
        decks,
        total: total || decks.length,
        hasMore,
      };
    } catch (error) {
      logger.error('❌ [DeckService] Erro ao listar decks:', { error, options });
      console.error('❌ [DeckService] Erro detalhado:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw AppError.internal(`Erro ao listar decks: ${error}`);
    }
  }

  async toggleFavoriteDeck(deckId: string, userId: string): Promise<{ isFavorite: boolean }> {
    try {
      await this.validateUserExists(userId);

      // Verificar se o deck existe
      const deckDoc = await this.db.collection(DECKS_COLLECTION).doc(deckId).get();
      if (!deckDoc.exists) {
        throw AppError.notFound('Deck não encontrado.');
      }

      // Verificar se o deck já está nos favoritos
      const favoriteQuery = this.db
        .collection(FAVORITE_DECKS_COLLECTION)
        .where('userId', '==', userId)
        .where('deckId', '==', deckId)
        .limit(1);

      const favoriteSnapshot = await favoriteQuery.get();
      const now = Timestamp.now();

      // Se já estiver nos favoritos, remover
      if (!favoriteSnapshot.empty) {
        await this.db
          .collection(FAVORITE_DECKS_COLLECTION)
          .doc(favoriteSnapshot.docs[0].id)
          .delete();
        return { isFavorite: false };
      }

      // Se não estiver nos favoritos, adicionar
      await this.db.collection(FAVORITE_DECKS_COLLECTION).add({
        userId,
        deckId,
        favoritedAt: now,
      });

      return { isFavorite: true };
    } catch (error) {
      logger.error('Erro ao alternar favorito:', { error, deckId, userId });
      if (error instanceof AppError) {
        throw error;
      }
      throw AppError.internal(`Erro ao alternar favorito: ${error}`);
    }
  }

  async getFavoriteDecks(
    userId: string,
    options: ListDecksOptions = {},
  ): Promise<PaginatedDecksResult> {
    try {
      // Primeiro, buscar os IDs dos decks favoritos
      let favoriteQuery = this.db
        .collection(FAVORITE_DECKS_COLLECTION)
        .where('userId', '==', userId);

      // Paginação para favoritos
      if (options.lastDocId) {
        const lastDoc = await this.db
          .collection(FAVORITE_DECKS_COLLECTION)
          .doc(options.lastDocId)
          .get();
        if (lastDoc.exists) {
          favoriteQuery = favoriteQuery.startAfter(lastDoc);
        }
      }

      // Ordenação padrão por data de adição aos favoritos
      favoriteQuery = favoriteQuery.orderBy('favoritedAt', 'desc');

      // Limit
      const limit = options.limit || 10;
      favoriteQuery = favoriteQuery.limit(limit + 1); // +1 para verificar se há mais páginas

      const favoriteSnapshot = await favoriteQuery.get();
      const hasMore = favoriteSnapshot.size > limit;

      // Extrair IDs dos decks favoritos
      const favoriteDecksIds = favoriteSnapshot.docs
        .slice(0, limit)
        .map(doc => doc.data().deckId as string);

      if (favoriteDecksIds.length === 0) {
        return {
          decks: [],
          total: 0,
          hasMore: false,
        };
      }

      // Buscar os decks favoritos
      const decksSnapshot = await this.db
        .collection(DECKS_COLLECTION)
        .where(FieldPath.documentId(), 'in', favoriteDecksIds)
        .get();

      // Organizar os decks na mesma ordem dos favoritos
      const decksMap = new Map();
      decksSnapshot.forEach(doc => {
        decksMap.set(doc.id, { ...doc.data(), id: doc.id } as Deck);
      });

      const decks = favoriteDecksIds
        .map(id => decksMap.get(id))
        .filter(deck => deck !== undefined) as Deck[];

      return {
        decks,
        total: favoriteDecksIds.length,
        hasMore,
      };
    } catch (error) {
      logger.error('Erro ao listar decks favoritos:', { error, userId, options });
      if (error instanceof AppError) {
        throw error;
      }
      throw AppError.internal(`Erro ao listar decks favoritos: ${error}`);
    }
  }

  async recalculateFlashcardCount(deckId: string): Promise<void> {
    try {
      const deckRef = this.db.collection(DECKS_COLLECTION).doc(deckId);
      const deckDoc = await deckRef.get();

      if (!deckDoc.exists) {
        throw AppError.notFound('Deck não encontrado.');
      }

      // Contar flashcards
      const countQuery = this.db.collection(FLASHCARDS_COLLECTION).where('deckId', '==', deckId);

      const countSnapshot = await countQuery.count().get();
      const count = countSnapshot.data().count;

      // Atualizar contagem
      await deckRef.update({
        flashcardCount: count,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      logger.error('Erro ao recalcular contagem de flashcards:', { error, deckId });
      if (error instanceof AppError) {
        throw error;
      }
      throw AppError.internal(`Erro ao recalcular contagem de flashcards: ${error}`);
    }
  }

  async toggleDeckVisibility(deckId: string, userId: string): Promise<Deck | null> {
    try {
      const deckRef = this.db.collection(DECKS_COLLECTION).doc(deckId);
      const doc = await deckRef.get();

      if (!doc.exists) {
        throw AppError.notFound('Deck não encontrado.');
      }

      const existingDeck = doc.data() as Deck;

      // Verificar se o usuário é o proprietário do deck
      if (existingDeck.userId !== userId) {
        throw AppError.forbidden('Usuário não autorizado a alterar a visibilidade deste deck.');
      }

      const newVisibility = !existingDeck.isPublic;

      await deckRef.update({
        isPublic: newVisibility,
        updatedAt: Timestamp.now(),
      });

      const updatedDoc = await deckRef.get();
      return {
        ...updatedDoc.data(),
        id: deckId,
      } as Deck;
    } catch (error) {
      logger.error('Erro ao alterar visibilidade do deck:', { error, deckId, userId });
      if (error instanceof AppError) {
        throw error;
      }
      throw AppError.internal(`Erro ao alterar visibilidade do deck: ${error}`);
    }
  }

  async getAvailableTags(userId: string): Promise<string[]> {
    try {
      await this.validateUserExists(userId);

      // Buscar todos os decks do usuário
      const decksQuery = this.db
        .collection(DECKS_COLLECTION)
        .where('userId', '==', userId)
        .where('status', '==', DeckStatus.ACTIVE);

      const snapshot = await decksQuery.get();
      const tagsSet = new Set<string>();

      // Extrair todas as tags únicas
      snapshot.forEach(doc => {
        const deck = doc.data() as Deck;
        if (deck.tags && Array.isArray(deck.tags)) {
          deck.tags.forEach(tag => {
            if (tag && typeof tag === 'string' && tag.trim()) {
              tagsSet.add(tag.trim().toLowerCase());
            }
          });
        }
      });

      // Converter para array e ordenar
      const tags = Array.from(tagsSet).sort();

      logger.info(`Tags encontradas para usuário ${userId}:`, tags);
      return tags;
    } catch (error) {
      logger.error('Erro ao buscar tags disponíveis:', { error, userId });
      if (error instanceof AppError) {
        throw error;
      }
      throw AppError.internal(`Erro ao buscar tags disponíveis: ${error}`);
    }
  }

  async getUserStats(userId: string): Promise<{
    totalDecks: number;
    totalCards: number;
    dueCards: number;
    studiedToday: number;
    streakDays: number;
    totalStudyTime: number;
    publicDecks: number;
    favoriteDecks: number;
  }> {
    try {
      await this.validateUserExists(userId);

      // Buscar todos os decks do usuário
      const decksQuery = this.db
        .collection(DECKS_COLLECTION)
        .where('userId', '==', userId)
        .where('status', '==', DeckStatus.ACTIVE);

      const decksSnapshot = await decksQuery.get();
      
      let totalDecks = 0;
      let totalCards = 0;
      let publicDecks = 0;

      decksSnapshot.forEach(doc => {
        const deck = doc.data() as Deck;
        totalDecks++;
        totalCards += deck.flashcardCount || 0;
        if (deck.isPublic) {
          publicDecks++;
        }
      });

      // Contar decks favoritos
      const favoritesQuery = this.db
        .collection(FAVORITE_DECKS_COLLECTION)
        .where('userId', '==', userId);

      const favoritesSnapshot = await favoritesQuery.get();
      const favoriteDecks = favoritesSnapshot.size;

      // TODO: Implementar estatísticas de revisão quando o sistema FSRS estiver integrado
      // Por enquanto, retornar valores padrão
      const stats = {
        totalDecks,
        totalCards,
        dueCards: 0, // TODO: Calcular com base no sistema FSRS
        studiedToday: 0, // TODO: Calcular com base nas revisões do dia
        streakDays: 0, // TODO: Calcular streak de estudos
        totalStudyTime: 0, // TODO: Calcular tempo total de estudo
        publicDecks,
        favoriteDecks,
      };

      logger.info(`Estatísticas calculadas para usuário ${userId}:`, stats);
      return stats;
    } catch (error) {
      logger.error('Erro ao calcular estatísticas do usuário:', { error, userId });
      if (error instanceof AppError) {
        throw error;
      }
      throw AppError.internal(`Erro ao calcular estatísticas do usuário: ${error}`);
    }
  }

  async searchDecks(searchParams: any): Promise<PaginatedDecksResult> {
    try {
      const {
        userId,
        search,
        tags,
        status,
        isPublic,
        limit = 10,
        offset = 0
      } = searchParams;

      let query = this.db.collection(DECKS_COLLECTION) as Query;

      // Filtro por usuário (sempre obrigatório para decks privados)
      if (isPublic !== 'true') {
        query = query.where('userId', '==', userId);
      }

      // Filtro por status
      if (status && status !== 'all') {
        if (status === 'public') {
          query = query.where('isPublic', '==', true);
        } else if (status === 'private') {
          query = query.where('isPublic', '==', false);
        }
      }

      // Filtro por visibilidade pública
      if (isPublic === 'true') {
        query = query.where('isPublic', '==', true);
      }

      // Ordenação padrão
      query = query.orderBy('updatedAt', 'desc');

      // Aplicar limit e offset
      if (offset > 0) {
        query = query.offset(offset);
      }
      query = query.limit(Number(limit) + 1); // +1 para verificar se há mais

      const snapshot = await query.get();
      const hasMore = snapshot.size > Number(limit);
      
      let decks = snapshot.docs.slice(0, Number(limit)).map(doc => ({
        ...doc.data(),
        id: doc.id,
      } as Deck));

      // Filtro por busca de texto (feito em memória por limitações do Firestore)
      if (search && search.trim()) {
        const searchTerm = search.trim().toLowerCase();
        decks = decks.filter(deck => 
          deck.name.toLowerCase().includes(searchTerm) ||
          (deck.description && deck.description.toLowerCase().includes(searchTerm)) ||
          (deck.tags && deck.tags.some(tag => tag.toLowerCase().includes(searchTerm)))
        );
      }

      // Filtro por tags (feito em memória)
      if (tags && Array.isArray(tags) && tags.length > 0) {
        decks = decks.filter(deck => 
          deck.tags && deck.tags.some(tag => tags.includes(tag))
        );
      }

      return {
        decks,
        total: decks.length,
        hasMore,
      };
    } catch (error) {
      logger.error('Erro ao buscar decks:', { error, searchParams });
      if (error instanceof AppError) {
        throw error;
      }
      throw AppError.internal(`Erro ao buscar decks: ${error}`);
    }
  }
}

export const deckService = new DeckService();
