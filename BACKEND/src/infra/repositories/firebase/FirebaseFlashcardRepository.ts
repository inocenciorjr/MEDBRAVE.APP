import { Timestamp, Query, DocumentData, DocumentSnapshot } from 'firebase-admin/firestore';
import { firestore } from '../../../config/firebaseAdmin';
import {
  Flashcard,
  CreateFlashcardDTO,
  FlashcardStatus,
  ReviewQuality,
  FlashcardSRSData
} from '../../../domain/studyTools/flashcards/types/flashcard.types';
import {
  IFlashcardRepository,
  FlashcardFilters,
  PaginationOptions,
  PaginatedResult,
  CollectionMetadata,
  DeckWithCards,
  CollectionStats,
  CollectionRating,
  ImportSession
} from '../../../domain/studyTools/flashcards/repositories/IFlashcardRepository';
import { AppError } from '../../../shared/errors/AppError';

const COLLECTIONS = {
  FLASHCARDS: 'flashcards',
  USER_INTERACTIONS: 'userFlashcardInteractions',
  USERS: 'users',
  DECKS: 'decks',
  USER_STATISTICS: 'flashcardStatistics',
} as const;

const DEFAULT_SRS_VALUES: FlashcardSRSData = {
  interval: 0,
  easeFactor: 2.5,
  repetitions: 0,
  lapses: 0,
};

export class FirebaseFlashcardRepository implements IFlashcardRepository {
  private db = firestore;
  
  // ✅ CORREÇÃO: Implementar cache para consultas COUNT
  private countCache = new Map<string, { count: number; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutos

  private generateSearchableText(
    frontContent: string,
    backContent: string,
    personalNotes?: string,
  ): string {
    const texts = [frontContent, backContent];
    if (personalNotes) {
      texts.push(personalNotes);
    }
    return texts.join(' ').toLowerCase();
  }

  private calculateNextReview(
    currentSrsData: FlashcardSRSData,
    reviewQuality: ReviewQuality,
  ): { nextInterval: number; newSrsData: FlashcardSRSData } {
    const { interval, easeFactor, repetitions } = currentSrsData;

    if (reviewQuality < ReviewQuality.GOOD) {
      return {
        nextInterval: 1,
        newSrsData: {
          interval: 1,
          easeFactor: Math.max(1.3, easeFactor - 0.2),
          repetitions: 0,
          lapses: currentSrsData.lapses + 1,
        },
      };
    }

    let nextInterval: number;
    if (repetitions === 0) {
      nextInterval = 1;
    } else if (repetitions === 1) {
      nextInterval = 6;
    } else {
      nextInterval = Math.round(interval * easeFactor);
    }

    const easeFactorModifier = 0.1 - (3 - reviewQuality) * (0.08 + (3 - reviewQuality) * 0.02);
    const newEaseFactor = Math.max(1.3, easeFactor + easeFactorModifier);

    return {
      nextInterval,
      newSrsData: {
        interval: nextInterval,
        easeFactor: newEaseFactor,
        repetitions: repetitions + 1,
        lapses: currentSrsData.lapses,
      },
    };
  }

  private determineNewStatus(repetitions: number): FlashcardStatus {
    if (repetitions >= 8) {
      return FlashcardStatus.MASTERED;
    } else if (repetitions >= 3) {
      return FlashcardStatus.REVIEWING;
    }
    return FlashcardStatus.LEARNING;
  }

  async create(data: CreateFlashcardDTO): Promise<Flashcard> {
    const searchableText = this.generateSearchableText(
      data.frontContent,
      data.backContent,
      data.personalNotes,
    );

    const now = Timestamp.now();
    const flashcardData: Omit<Flashcard, 'id'> = {
      ...data,
      tags: data.tags || [],
      status: FlashcardStatus.LEARNING,
      srsData: DEFAULT_SRS_VALUES,
      nextReviewAt: now,
      lastReviewedAt: null,
      createdAt: now,
      updatedAt: now,
      searchableText,
    };

    const docRef = await this.db.collection(COLLECTIONS.FLASHCARDS).add(flashcardData);
    await this.updateStatistics(data.deckId, data.userId);

    return {
      id: docRef.id,
      ...flashcardData,
    };
  }

  async findById(id: string): Promise<Flashcard | null> {
    const doc = await this.db.collection(COLLECTIONS.FLASHCARDS).doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as Flashcard;
  }

  async findByUser(userId: string, filters: FlashcardFilters = {}, pagination: PaginationOptions = { page: 1, limit: 10 }): Promise<PaginatedResult<Flashcard>> {
    console.log(`🔍 [FirebaseFlashcardRepository] findByUser - userId: ${userId}, filters:`, filters);
    
    try {
      let query = this.db.collection(COLLECTIONS.FLASHCARDS).where('userId', '==', userId);
      
      // VERSÃO TEMPORÁRIA SIMPLIFICADA - aplicar apenas filtro por deckId se fornecido
      if (filters.deckId) {
        console.log(`🔍 [FirebaseFlashcardRepository] Aplicando filtro deckId: ${filters.deckId}`);
        query = query.where('deckId', '==', filters.deckId);
      }
      
      // Ordenação simples
      const sortBy = pagination.sortBy || 'createdAt';
      const sortOrder = pagination.sortOrder || 'desc';
      query = query.orderBy(sortBy, sortOrder);
      
      console.log(`🔍 [FirebaseFlashcardRepository] Executando query...`);
      
      let hasMore = false;
      if (pagination.lastDocId) {
        const startAfterDoc = await this.db.collection(COLLECTIONS.FLASHCARDS).doc(pagination.lastDocId).get();
        if (startAfterDoc.exists) {
          query = query.startAfter(startAfterDoc);
        }
      }
      
      query = query.limit(pagination.limit + 1);
      const snapshot = await query.get();
      
      console.log(`🔍 [FirebaseFlashcardRepository] Query executada com sucesso. Docs encontrados: ${snapshot.docs.length}`);
      
      const items = snapshot.docs.slice(0, pagination.limit).map(doc => ({ id: doc.id, ...doc.data() } as Flashcard));
      hasMore = snapshot.docs.length > pagination.limit;
      
      // Contagem total simplificada
      const total = items.length; // Para agora, usar tamanho dos items como total
      
      console.log(`🔍 [FirebaseFlashcardRepository] Resultado: ${items.length} items, hasMore: ${hasMore}`);
      
      return {
        items,
        total,
        hasMore,
        lastDocId: hasMore ? snapshot.docs[pagination.limit].id : undefined,
      };
    } catch (error) {
      console.error(`❌ [FirebaseFlashcardRepository] Erro na query:`, error);
      throw error;
    }
  }

  private async countUserFlashcards(userId: string, filters: FlashcardFilters): Promise<number> {
    // Gerar chave de cache baseada nos filtros
    const cacheKey = `user_${userId}_${JSON.stringify(filters)}`;
    const cached = this.countCache.get(cacheKey);
    
    // Verificar se existe cache válido
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
      return cached.count;
    }

    let query = this.db.collection(COLLECTIONS.FLASHCARDS).where('userId', '==', userId);

    if (filters.deckId) {
      query = query.where('deckId', '==', filters.deckId);
    }

    if (filters.status) {
      query = query.where('status', '==', filters.status);
    }

    if (filters.tags && filters.tags.length > 0) {
      query = query.where('tags', 'array-contains-any', filters.tags);
    }

    const snapshot = await query.count().get();
    const count = snapshot.data().count;
    
    // Armazenar no cache
    this.countCache.set(cacheKey, { count, timestamp: Date.now() });
    
    return count;
  }

  async update(id: string, data: Partial<Flashcard>): Promise<Flashcard> {
    await this.db.collection(COLLECTIONS.FLASHCARDS).doc(id).update({ ...data, updatedAt: Timestamp.now() });
    return this.findById(id) as Promise<Flashcard>;
  }

  async delete(id: string): Promise<void> {
    const flashcard = await this.findById(id);
    if (!flashcard) throw new AppError('Flashcard not found', 404);
    const batch = this.db.batch();
    const flashcardRef = this.db.collection(COLLECTIONS.FLASHCARDS).doc(id);
    batch.delete(flashcardRef);
    await batch.commit();
    if (flashcard.deckId && flashcard.userId) {
      await this.updateStatistics(flashcard.deckId, flashcard.userId);
    }
  }

  async toggleArchive(id: string): Promise<Flashcard> {
    const flashcard = await this.findById(id);
    if (!flashcard) {
      throw new AppError('Flashcard not found', 404);
    }

    const newStatus =
      flashcard.status === FlashcardStatus.ARCHIVED
        ? FlashcardStatus.LEARNING
        : FlashcardStatus.ARCHIVED;

    await this.update(id, { status: newStatus });
    return this.findById(id) as Promise<Flashcard>;
  }

  async recordReview(id: string, reviewQuality: ReviewQuality): Promise<Flashcard> {
    return this.recordReviewInternal(id, reviewQuality);
  }

  private async recordReviewInternal(id: string, reviewQuality: ReviewQuality): Promise<Flashcard> {
    const flashcard = await this.findById(id);
    if (!flashcard) throw new AppError('Flashcard not found', 404);
    const { nextInterval, newSrsData } = this.calculateNextReview(flashcard.srsData, reviewQuality);
    const newStatus = this.determineNewStatus(newSrsData.repetitions);
    const now = Timestamp.now();
    const nextReviewAt = Timestamp.fromMillis(now.toMillis() + nextInterval * 24 * 60 * 60 * 1000);
    const updateData = {
      srsData: newSrsData,
      status: newStatus,
      lastReviewedAt: now,
      nextReviewAt,
      updatedAt: now,
    };
    await this.db.collection(COLLECTIONS.FLASHCARDS).doc(id).update(updateData);
    if (flashcard.deckId && flashcard.userId) {
      await this.updateStatistics(flashcard.deckId, flashcard.userId);
    }
    return { ...flashcard, ...updateData };
  }

  async updateStatistics(deckId: string, userId: string): Promise<void> {
    const query = this.db
      .collection(COLLECTIONS.FLASHCARDS)
      .where('userId', '==', userId)
      .where('deckId', '==', deckId);

    const snapshot = await query.get();
    let totalEaseFactor = 0;
    let totalInterval = 0;
    let dueForReview = 0;
    const now = Timestamp.now();
    const stats = {
      totalFlashcards: snapshot.size,
      activeFlashcards: 0,
      masteredFlashcards: 0,
      learningFlashcards: 0,
      reviewingFlashcards: 0,
      suspendedFlashcards: 0,
      archivedFlashcards: 0,
      lastReviewedAt: null as Timestamp | null,
      nextReviewAt: null as Timestamp | null,
    };

    snapshot.forEach(doc => {
      const flashcard = doc.data() as Flashcard;
      totalEaseFactor += flashcard.srsData.easeFactor;
      totalInterval += flashcard.srsData.interval;

      if (flashcard.nextReviewAt.toMillis() <= now.toMillis()) {
        dueForReview++;
      }

      if (
        !stats.lastReviewedAt ||
        (flashcard.lastReviewedAt &&
          flashcard.lastReviewedAt.toMillis() > stats.lastReviewedAt.toMillis())
      ) {
        stats.lastReviewedAt = flashcard.lastReviewedAt;
      }

      if (
        !stats.nextReviewAt ||
        (flashcard.nextReviewAt &&
          flashcard.nextReviewAt.toMillis() < stats.nextReviewAt.toMillis())
      ) {
        stats.nextReviewAt = flashcard.nextReviewAt;
      }

      switch (flashcard.status) {
        case FlashcardStatus.MASTERED:
          stats.masteredFlashcards++;
          stats.activeFlashcards++;
          break;
        case FlashcardStatus.LEARNING:
          stats.learningFlashcards++;
          stats.activeFlashcards++;
          break;
        case FlashcardStatus.REVIEWING:
          stats.reviewingFlashcards++;
          stats.activeFlashcards++;
          break;
        case FlashcardStatus.SUSPENDED:
          stats.suspendedFlashcards++;
          break;
        case FlashcardStatus.ARCHIVED:
          stats.archivedFlashcards++;
          break;
      }
    });

    const statisticsData = {
      ...stats,
      averageEaseFactor: stats.totalFlashcards > 0 ? totalEaseFactor / stats.totalFlashcards : 0,
      averageIntervalDays: stats.totalFlashcards > 0 ? totalInterval / stats.totalFlashcards : 0,
      dueForReviewCount: dueForReview,
      updatedAt: now,
    };

    await this.db
      .collection(COLLECTIONS.USER_STATISTICS)
      .doc(`${userId}_${deckId}`)
      .set(statisticsData, { merge: true });
  }

  async search(
    query: string,
    userId: string,
    pagination: PaginationOptions,
  ): Promise<PaginatedResult<Flashcard>> {
    const searchQuery = query.toLowerCase();
    let baseQuery = this.db
      .collection(COLLECTIONS.FLASHCARDS)
      .where('userId', '==', userId)
      .where('searchableText', '>=', searchQuery)
      .where('searchableText', '<=', searchQuery + '\uf8ff')
      .orderBy('searchableText')
      .orderBy('updatedAt', 'desc');

    let hasMore = false;
    if (pagination.lastDocId) {
      const startAfterDoc = await this.db.collection(COLLECTIONS.FLASHCARDS).doc(pagination.lastDocId).get();
      if (startAfterDoc.exists) {
        baseQuery = baseQuery.startAfter(startAfterDoc);
      }
    }
    baseQuery = baseQuery.limit(pagination.limit + 1);

    const snapshot = await baseQuery.get();
    const items = snapshot.docs.slice(0, pagination.limit).map(
      doc =>
        ({
          id: doc.id,
          ...doc.data(),
        }) as Flashcard,
    );
    hasMore = snapshot.docs.length > pagination.limit;
    const total = await this.countSearchResults(searchQuery, userId);

    return {
      items,
      total,
      hasMore,
      lastDocId: hasMore ? snapshot.docs[pagination.limit].id : undefined,
    };
  }

  private async countSearchResults(searchQuery: string, userId: string): Promise<number> {
    const cacheKey = `search_${userId}_${searchQuery}`;
    const cached = this.countCache.get(cacheKey);
    
    // Cache mais curto para buscas (2 minutos)
    if (cached && (Date.now() - cached.timestamp) < 2 * 60 * 1000) {
      return cached.count;
    }

    const query = this.db
      .collection(COLLECTIONS.FLASHCARDS)
      .where('userId', '==', userId)
      .where('searchableText', '>=', searchQuery)
      .where('searchableText', '<=', searchQuery + '\uf8ff');

    const snapshot = await query.count().get();
    const count = snapshot.data().count;
    
    // Armazenar no cache
    this.countCache.set(cacheKey, { count, timestamp: Date.now() });
    
    return count;
  }

  async updateStatus(id: string, status: FlashcardStatus): Promise<Flashcard> {
    await this.db.collection(COLLECTIONS.FLASHCARDS).doc(id).update({ status, updatedAt: Timestamp.now() });
    return this.findById(id) as Promise<Flashcard>;
  }

  async findDueForReview(userId: string, deckId?: string, pagination: PaginationOptions = { page: 1, limit: 10 }): Promise<PaginatedResult<Flashcard>> {
    let query = this.db.collection(COLLECTIONS.FLASHCARDS).where('userId', '==', userId)
      .where('nextReviewAt', '<=', Timestamp.now())
      .where('status', '!=', FlashcardStatus.SUSPENDED)
      .where('status', '!=', FlashcardStatus.ARCHIVED);
    if (deckId) query = query.where('deckId', '==', deckId);
    const sortBy = pagination.sortBy || 'nextReviewAt';
    const sortOrder = pagination.sortOrder || 'asc';
    query = query.orderBy(sortBy, sortOrder);
    let hasMore = false;
    if (pagination.lastDocId) {
      const startAfterDoc = await this.db.collection(COLLECTIONS.FLASHCARDS).doc(pagination.lastDocId).get();
      if (startAfterDoc.exists) {
        query = query.startAfter(startAfterDoc);
      }
    }
    query = query.limit(pagination.limit + 1);
    const snapshot = await query.get();
    const items = snapshot.docs.slice(0, pagination.limit).map(doc => ({ id: doc.id, ...doc.data() } as Flashcard));
    hasMore = snapshot.docs.length > pagination.limit;
    const total = await this.countUserFlashcards(userId, { deckId, readyForReview: true });
    return {
      items,
      total,
      hasMore,
      lastDocId: hasMore ? snapshot.docs[pagination.limit].id : undefined,
    };
  }

  async findByTags(userId: string, tags: string[], pagination: PaginationOptions = { page: 1, limit: 10 }): Promise<PaginatedResult<Flashcard>> {
    let query = this.db.collection(COLLECTIONS.FLASHCARDS).where('userId', '==', userId)
      .where('tags', 'array-contains-any', tags);
    const sortBy = pagination.sortBy || 'updatedAt';
    const sortOrder = pagination.sortOrder || 'desc';
    query = query.orderBy(sortBy, sortOrder);
    let hasMore = false;
    if (pagination.lastDocId) {
      const startAfterDoc = await this.db.collection(COLLECTIONS.FLASHCARDS).doc(pagination.lastDocId).get();
      if (startAfterDoc.exists) {
        query = query.startAfter(startAfterDoc);
      }
    }
    query = query.limit(pagination.limit + 1);
    const snapshot = await query.get();
    const items = snapshot.docs.slice(0, pagination.limit).map(doc => ({ id: doc.id, ...doc.data() } as Flashcard));
    hasMore = snapshot.docs.length > pagination.limit;
    const total = await this.countUserFlashcards(userId, { tags });
    return {
      items,
      total,
      hasMore,
      lastDocId: hasMore ? snapshot.docs[pagination.limit].id : undefined,
    };
  }

  // ==================== COLLECTIONS METADATA ====================
  
  async getCollectionsMetadata(userId: string, filters?: any, pagination?: PaginationOptions): Promise<CollectionMetadata[]> {
    try {
      let query = this.db.collection('collections') as Query<DocumentData>;
      
      // Se estiver buscando coleções públicas (aba comunidade)
      if (filters?.public === true) {
        query = query.where('isPublic', '==', true);
      } else {
        // Caso contrário, buscar apenas coleções do usuário (meus flashcards)
        query = query.where('userId', '==', userId);
      }
      
      // Aplicar paginação
      if (pagination?.limit) {
        query = query.limit(pagination.limit);
      }
      
      const snapshot = await query.get();
      
      // Se não houver coleções, retornar array vazio
      if (snapshot.empty) {
        return [];
      }
      
      // Buscar dados dos autores em batch
      const userIds = new Set(snapshot.docs.map(doc => doc.data().userId).filter(Boolean));
      const userDocs = await Promise.all(
        Array.from(userIds).map(uid => 
          this.db.collection('users').doc(uid as string).get()
        )
      );
      
      // Criar mapa de dados dos usuários
      const userDataMap = new Map(
        userDocs
          .filter((doc: DocumentSnapshot) => doc.exists)
          .map((doc: DocumentSnapshot) => [doc.id, doc.data()])
      );
      
      // 🔧 RECALCULAR METADADOS SE NECESSÁRIO (CORRIGIDO)
      const needsUpdate: any[] = [];
      
      // Processar cada coleção e verificar se precisa atualização
      const collections = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const data = doc.data();
          const authorId = data.userId;
          const authorData = userDataMap.get(authorId);
          
          // 🔧 SEMPRE RECALCULAR CONTAGENS PARA GARANTIR PRECISÃO
          let realDeckCount = data.deckCount || 0;
          let realCardCount = data.cardCount || data.totalCards || 0;
          
          // Buscar decks reais da coleção
          const decksSnapshot = await this.db.collection(COLLECTIONS.DECKS)
            .where('userId', '==', authorId)
            .where('collection', '==', data.name)
            .get();
          
          const actualDeckCount = decksSnapshot.size;
          
          // Buscar contagem real de cards
          let actualCardCount = 0;
          if (actualDeckCount > 0) {
            const cardCountPromises = decksSnapshot.docs.map(async (deckDoc) => {
              const cardsCount = await this.db.collection(COLLECTIONS.FLASHCARDS)
                .where('deckId', '==', deckDoc.id)
                .where('userId', '==', authorId)
                .count()
                .get();
              return cardsCount.data().count;
            });
            
            const cardCounts = await Promise.all(cardCountPromises);
            actualCardCount = cardCounts.reduce((sum, count) => sum + count, 0);
          }
          
          // Marcar para atualização se valores mudaram
          if (actualDeckCount !== realDeckCount || actualCardCount !== realCardCount) {
            needsUpdate.push({
              docRef: doc.ref,
              updates: {
                deckCount: actualDeckCount,
                cardCount: actualCardCount,
                totalCards: actualCardCount, // Unificar campos duplicados
                updatedAt: Timestamp.now()
              }
            });
          }
          
          return {
            id: doc.id,
            name: data.name,
            description: data.description,
            deckCount: actualDeckCount,
            cardCount: actualCardCount, // Usar contagem real
            lastUpdated: data.updatedAt && data.updatedAt.toDate ? data.updatedAt.toDate().toISOString() : (data.updatedAt instanceof Date ? data.updatedAt.toISOString() : data.updatedAt),
            isPublic: data.isPublic,
            userId: authorId,
            downloads: data.downloads || 0,
            likes: data.likes || 0,
            avgRating: data.avgRating || 0,
            totalCards: actualCardCount, // Unificar com cardCount
            createdAt: data.createdAt,
            author: authorData ? {
              id: authorId,
              name: authorData.name || authorData.displayName,
              avatar: authorData.photoURL
            } : {
              id: authorId,
              name: 'Usuário ' + authorId?.substring(0, 4)
            }
          } as CollectionMetadata;
        })
      );
      
      // 🔧 ATUALIZAR METADADOS NO FIREBASE SE NECESSÁRIO
      if (needsUpdate.length > 0) {
        const batch = this.db.batch();
        needsUpdate.forEach(({ docRef, updates }) => {
          batch.update(docRef, updates);
        });
        await batch.commit();
        console.log(`📊 Metadados atualizados para ${needsUpdate.length} coleções`);
      }
      
      return collections;
      
    } catch (error) {
      console.error('Erro ao buscar metadados de coleções:', error);
      return [];
    }
  }

  // ==================== COLLECTION DECKS ====================
  
  async getCollectionDecks(userId: string, collectionName: string): Promise<DeckWithCards[]> {
    try {
      // Buscar decks que pertencem à coleção
      const decksSnapshot = await this.db.collection(COLLECTIONS.DECKS)
        .where('userId', '==', userId)
        .where('collection', '==', collectionName)
        .get();
      
      const decksWithCards: DeckWithCards[] = [];
      
      for (const deckDoc of decksSnapshot.docs) {
        const deckData = { id: deckDoc.id, ...deckDoc.data() };
        
        // Buscar contagem total de cards primeiro
        const totalCardsCount = await this.db.collection(COLLECTIONS.FLASHCARDS)
          .where('deckId', '==', deckDoc.id)
          .where('userId', '==', userId)
          .count()
          .get();
        
        const realCardCount = totalCardsCount.data().count;
        
        // Buscar amostra de cards para cálculo de cards vencidos
        const cardsSnapshot = await this.db.collection(COLLECTIONS.FLASHCARDS)
          .where('deckId', '==', deckDoc.id)
          .where('userId', '==', userId)
          .limit(50) // Limitar para performance
          .get();
        
        const cards = cardsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
          } as Flashcard;
        });
        
        // Calcular cards vencidos
        const now = new Date();
        const dueCards = cards.filter(card => {
          if (!card.nextReviewAt) return true; // Cards nunca revisados
          const nextReviewDate = card.nextReviewAt.toDate ? card.nextReviewAt.toDate() : 
                                 card.nextReviewAt instanceof Date ? card.nextReviewAt : 
                                 new Date();
          return nextReviewDate <= now;
        }).length;
        
        const deckInfo = deckData as any;
        
        decksWithCards.push({
          ...deckInfo,
          cards,
          cardCount: realCardCount, // Usar contagem real
          dueCards: dueCards,
          // Adicionar campos extras úteis
          lastReviewed: deckInfo.lastReviewed || 'Nunca',
          isFavorite: deckInfo.isFavorite || false,
          tags: deckInfo.tags || [],
          hierarchy: deckInfo.hierarchy || [collectionName]
        } as DeckWithCards);
      }
      
      return decksWithCards;
    } catch (error) {
      console.error('Erro ao buscar decks da coleção:', error);
      return [];
    }
  }

  // ==================== DECK MANAGEMENT ====================
  
  async updateDeckPublicStatus(deckId: string, userId: string, isPublic: boolean): Promise<DeckWithCards> {
    try {
      const deckRef = this.db.collection(COLLECTIONS.DECKS).doc(deckId);
      const deckDoc = await deckRef.get();
      
      if (!deckDoc.exists) {
        throw new AppError('Deck não encontrado', 404);
      }
      
      const deckData = deckDoc.data();
      if (deckData?.userId !== userId) {
        throw new AppError('Acesso negado', 403);
      }
      
      await deckRef.update({
        isPublic,
        visibility: isPublic ? 'PUBLIC' : 'PRIVATE',
        updatedAt: Timestamp.now()
      });
      
      // Buscar deck atualizado com cards
      const updatedDeck = await deckDoc.ref.get();
      const cardsSnapshot = await this.db.collection(COLLECTIONS.FLASHCARDS)
        .where('deckId', '==', deckId)
        .limit(50)
        .get();
      
      const cards = cardsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
        } as Flashcard;
      });
      
      return {
        id: updatedDeck.id,
        ...updatedDeck.data(),
        cards,
        cardCount: cards.length
      } as DeckWithCards;
      
    } catch (error) {
      console.error('Erro ao atualizar status público do deck:', error);
      throw error;
    }
  }
  
  async deleteDeck(deckId: string, userId: string): Promise<void> {
    try {
      const deckRef = this.db.collection(COLLECTIONS.DECKS).doc(deckId);
      const deckDoc = await deckRef.get();
      
      if (!deckDoc.exists) {
        throw new AppError('Deck não encontrado', 404);
      }
      
      const deckData = deckDoc.data();
      if (deckData?.userId !== userId) {
        throw new AppError('Acesso negado', 403);
      }
      
      // Deletar todos os flashcards do deck
      const cardsSnapshot = await this.db.collection(COLLECTIONS.FLASHCARDS)
        .where('deckId', '==', deckId)
        .get();
      
      const batch = this.db.batch();
      cardsSnapshot.docs.forEach(cardDoc => {
        batch.delete(cardDoc.ref);
      });
      
      // Deletar o deck
      batch.delete(deckRef);
      
      await batch.commit();
    } catch (error) {
      console.error('Erro ao deletar deck:', error);
      throw error;
    }
  }
  
  /**
   * 🎯 Obter deck por ID com cards (OTIMIZADO)
   */
  async getDeckById(deckId: string, userId: string): Promise<DeckWithCards> {
    console.log('🔍 [FirebaseFlashcardRepository] getDeckById - Buscando deck:', deckId);
    
    try {
      // Buscar o deck
      const deckDoc = await this.db.collection('decks').doc(deckId).get();
      if (!deckDoc.exists) {
        console.log('❌ [FirebaseFlashcardRepository] Deck não encontrado');
        throw new AppError('Deck não encontrado', 404);
      }
      
      const deckData = deckDoc.data()!;
      console.log('✅ [FirebaseFlashcardRepository] Deck encontrado');
      
      // Verificar se o usuário tem permissão para acessar o deck
      if (deckData.userId !== userId && !deckData.isPublic) {
        throw new AppError('Acesso negado ao deck', 403);
      }
      
      // Buscar flashcards diretamente por deckId
      console.log('🔍 [FirebaseFlashcardRepository] Buscando flashcards por deckId');
      const flashcardsSnapshot = await this.db.collection('flashcards')
        .where('deckId', '==', deckId)
        .get();
      
      const cards = flashcardsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log('✅ [FirebaseFlashcardRepository] Encontrados', cards.length, 'flashcards válidos');
      
      const deck: DeckWithCards = {
        id: deckDoc.id,
        name: deckData.name || '',
        description: deckData.description,
        hierarchy: deckData.hierarchy,
        isPublic: deckData.isPublic || false,
        cardCount: cards.length,
        lastReviewed: deckData.lastReviewed,
        dueCards: deckData.dueCards,
        tags: deckData.tags,
        userId: deckData.userId,
        createdAt: deckData.createdAt,
        updatedAt: deckData.updatedAt,
        cards: cards
      };
      
      return deck;
      
    } catch (error) {
      console.error('❌ [FirebaseFlashcardRepository] Erro ao buscar deck:', error);
      throw error;
    }
  }

  async getAllUserDecks(userId: string, limit?: number): Promise<DeckWithCards[]> {
    try {
      let query = this.db.collection(COLLECTIONS.DECKS).where('userId', '==', userId);
      
      if (limit) {
        query = query.limit(limit);
      }
      
      const snapshot = await query.get();
      const decks: DeckWithCards[] = [];
      
      for (const deckDoc of snapshot.docs) {
        const deckData = { id: deckDoc.id, ...deckDoc.data() };
        
        // Buscar estatísticas rápidas do deck
        const cardsCount = await this.db.collection(COLLECTIONS.FLASHCARDS)
          .where('deckId', '==', deckDoc.id)
          .count()
          .get();
        
                 decks.push({
           ...deckData,
           cards: [], // Não carregar cards por performance
           cardCount: cardsCount.data().count,
           dueCards: 0 // Calcular separadamente se necessário
         } as unknown as DeckWithCards);
      }
      
      return decks;
    } catch (error) {
      console.error('Erro ao buscar todos os decks do usuário:', error);
      return [];
    }
  }

  // ==================== USER LIBRARY ====================
  
  async getUserLibrary(userId: string, _filters?: any, pagination?: PaginationOptions): Promise<CollectionMetadata[]> {
    try {
      // Buscar coleções na biblioteca do usuário
      let query = this.db.collection('userLibrary').where('userId', '==', userId);
      
      if (pagination?.limit) {
        query = query.limit(pagination.limit);
      }
      
      const librarySnapshot = await query.get();
      const collectionIds = librarySnapshot.docs.map(doc => doc.data().collectionId);
      
      if (collectionIds.length === 0) {
        return [];
      }
      
      // Buscar detalhes das coleções
      const collections: CollectionMetadata[] = [];
      
      // Firestore não suporta 'in' com mais de 10 elementos, então fazemos em lotes
      for (let i = 0; i < collectionIds.length; i += 10) {
        const batch = collectionIds.slice(i, i + 10);
        const collectionsSnapshot = await this.db.collection('collections')
          .where('id', 'in', batch)
          .get();
        
                 collectionsSnapshot.docs.forEach(doc => {
           collections.push({
             id: doc.id,
             ...doc.data()
           } as unknown as CollectionMetadata);
         });
      }
      
      return collections;
    } catch (error) {
      console.error('Erro ao buscar biblioteca do usuário:', error);
      return [];
    }
  }

  // ==================== COLLECTION OPERATIONS ====================
  
  async getCollectionById(collectionId: string): Promise<CollectionMetadata | null> {
    try {
      const doc = await this.db.collection('collections').doc(collectionId).get();
      
      if (!doc.exists) {
        return null;
      }
      
             return {
         id: doc.id,
         ...doc.data()
       } as unknown as CollectionMetadata;
    } catch (error) {
      console.error('Erro ao buscar coleção:', error);
      return null;
    }
  }
  
  async isInUserLibrary(userId: string, collectionId: string): Promise<boolean> {
    try {
      const snapshot = await this.db.collection('userLibrary')
        .where('userId', '==', userId)
        .where('collectionId', '==', collectionId)
        .limit(1)
        .get();
      
      return !snapshot.empty;
    } catch (error) {
      console.error('Erro ao verificar se coleção está na biblioteca:', error);
      return false;
    }
  }
  
  async addToLibrary(userId: string, collectionId: string): Promise<void> {
    try {
      // Verificar se a coleção existe e é pública
      const collection = await this.getCollectionById(collectionId);
      if (!collection) {
        throw new AppError('Coleção não encontrada', 404);
      }
      
      if (!collection.isPublic) {
        throw new AppError('Coleção não é pública', 403);
      }
      
      // Verificar se já está na biblioteca
      const alreadyInLibrary = await this.isInUserLibrary(userId, collectionId);
      if (alreadyInLibrary) {
        return; // Já está na biblioteca
      }
      
      // Adicionar à biblioteca
      await this.db.collection('userLibrary').add({
        userId,
        collectionId,
        addedAt: Timestamp.now()
      });
      
      // Incrementar downloads da coleção
      await this.incrementDownloads(collectionId);
    } catch (error) {
      console.error('Erro ao adicionar à biblioteca:', error);
      throw error;
    }
  }
  
  async incrementDownloads(collectionId: string): Promise<void> {
    try {
      const collectionRef = this.db.collection('collections').doc(collectionId);
      await collectionRef.update({
        downloads: this.db.collection('collections').doc(collectionId).get().then(doc => {
          const currentDownloads = doc.data()?.downloads || 0;
          return currentDownloads + 1;
        })
      });
    } catch (error) {
      console.error('Erro ao incrementar downloads:', error);
    }
  }
  
  async removeFromLibrary(userId: string, collectionId: string): Promise<void> {
    try {
      const snapshot = await this.db.collection('userLibrary')
        .where('userId', '==', userId)
        .where('collectionId', '==', collectionId)
        .get();
      
      const batch = this.db.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
    } catch (error) {
      console.error('Erro ao remover da biblioteca:', error);
      throw error;
    }
  }

  // ==================== COLLECTION SOCIAL FEATURES ====================
  
  async isCollectionLiked(userId: string, collectionId: string): Promise<boolean> {
    try {
      const snapshot = await this.db.collection('collectionLikes')
        .where('userId', '==', userId)
        .where('collectionId', '==', collectionId)
        .limit(1)
        .get();
      
      return !snapshot.empty;
    } catch (error) {
      console.error('Erro ao verificar like da coleção:', error);
      return false;
    }
  }
  
  async likeCollection(userId: string, collectionId: string): Promise<void> {
    try {
      // Verificar se já curtiu
      const alreadyLiked = await this.isCollectionLiked(userId, collectionId);
      if (alreadyLiked) {
        return;
      }
      
      // Adicionar like
      await this.db.collection('collectionLikes').add({
        userId,
        collectionId,
        likedAt: Timestamp.now()
      });
      
      // Incrementar contador de likes na coleção
      const collectionRef = this.db.collection('collections').doc(collectionId);
      const collectionDoc = await collectionRef.get();
      const currentLikes = collectionDoc.data()?.likes || 0;
      
      await collectionRef.update({
        likes: currentLikes + 1
      });
    } catch (error) {
      console.error('Erro ao curtir coleção:', error);
      throw error;
    }
  }
  
  async unlikeCollection(userId: string, collectionId: string): Promise<void> {
    try {
      // Remover like
      const snapshot = await this.db.collection('collectionLikes')
        .where('userId', '==', userId)
        .where('collectionId', '==', collectionId)
        .get();
      
      const batch = this.db.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      
      // Decrementar contador de likes na coleção
      const collectionRef = this.db.collection('collections').doc(collectionId);
      const collectionDoc = await collectionRef.get();
      const currentLikes = collectionDoc.data()?.likes || 0;
      
      if (currentLikes > 0) {
        await collectionRef.update({
          likes: currentLikes - 1
        });
      }
    } catch (error) {
      console.error('Erro ao descurtir coleção:', error);
      throw error;
    }
  }
  
  async getCollectionStats(collectionId: string): Promise<CollectionStats> {
    try {
      const collection = await this.getCollectionById(collectionId);
      if (!collection) {
        throw new AppError('Coleção não encontrada', 404);
      }
      
      // Buscar estatísticas adicionais
      const likesCount = await this.db.collection('collectionLikes')
        .where('collectionId', '==', collectionId)
        .count()
        .get();
      
      const ratingsSnapshot = await this.db.collection('collectionRatings')
        .where('collectionId', '==', collectionId)
        .get();
      
      const ratings = ratingsSnapshot.docs.map(doc => doc.data().rating);
      const avgRating = ratings.length > 0 
        ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length 
        : 0;
      
             return {
         likes: likesCount.data().count,
         downloads: collection.downloads || 0,
         avgRating,
         totalRatings: ratings.length
       };
    } catch (error) {
      console.error('Erro ao buscar estatísticas da coleção:', error);
             return {
         likes: 0,
         downloads: 0,
         avgRating: 0,
         totalRatings: 0
       };
    }
  }
  
  async rateCollection(userId: string, collectionId: string, rating: CollectionRating): Promise<void> {
    try {
      // Verificar se já avaliou
      const existingRating = await this.db.collection('collectionRatings')
        .where('userId', '==', userId)
        .where('collectionId', '==', collectionId)
        .limit(1)
        .get();
      
      if (!existingRating.empty) {
        // Atualizar avaliação existente
        const ratingDoc = existingRating.docs[0];
        await ratingDoc.ref.update({
          ...rating,
          updatedAt: Timestamp.now()
        });
      } else {
        // Criar nova avaliação
        await this.db.collection('collectionRatings').add({
          userId,
          collectionId,
          ...rating,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
      }
    } catch (error) {
      console.error('Erro ao avaliar coleção:', error);
      throw error;
    }
  }

  // ==================== IMPORT SESSIONS ====================
  
  async createImportSession(importData: any): Promise<ImportSession> {
    try {
      const sessionData = {
        userId: importData.userId,
        status: 'PENDING' as const,
        progress: 0,
        total: importData.total || 0,
        startedAt: new Date().toISOString(),
        metadata: importData.metadata || {}
      };
      
      const docRef = await this.db.collection('importSessions').add(sessionData);
      
      return {
        id: docRef.id,
        ...sessionData
      };
    } catch (error) {
      console.error('Erro ao criar sessão de importação:', error);
      throw error;
    }
  }
  
  async getImportSession(importId: string): Promise<ImportSession | null> {
    try {
      const doc = await this.db.collection('importSessions').doc(importId).get();
      
      if (!doc.exists) {
        return null;
      }
      
      return {
        id: doc.id,
        ...doc.data()
      } as ImportSession;
    } catch (error) {
      console.error('Erro ao buscar sessão de importação:', error);
      return null;
    }
  }
  
  async updateImportStatus(importId: string, update: Partial<ImportSession>): Promise<void> {
    try {
      await this.db.collection('importSessions').doc(importId).update({
        ...update,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Erro ao atualizar status de importação:', error);
      throw error;
    }
  }
}
