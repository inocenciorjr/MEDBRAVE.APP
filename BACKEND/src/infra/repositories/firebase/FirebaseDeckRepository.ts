import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { firestore } from '../../../config/firebaseAdmin';
import {
  Deck,
  DeckCreateData,
  DeckUpdateData,
  DeckFilters,
  DeckStatus,
  DeckVisibility,
  IDeckRepository,
  PaginatedResult,
  PaginationOptions,
} from '../../../domain/studyTools/flashcards/repositories/IDeckRepository';
import { AppError } from '../../../shared/errors/AppError';

const COLLECTIONS = {
  DECKS: 'decks',
  FLASHCARDS: 'flashcards',
  USER_INTERACTIONS: 'userFlashcardInteractions',
} as const;

export class FirebaseDeckRepository implements IDeckRepository {
  private db = firestore;

  async create(data: DeckCreateData): Promise<Deck> {
    const now = new Date();
    const deckData: Omit<Deck, 'id'> = {
      ...data,
      title: data.title,
      description: data.description,
      tags: data.tags || [],
      visibility: data.visibility || DeckVisibility.PRIVATE,
      status: DeckStatus.ACTIVE,
      flashcardCount: 0,
      createdAt: now,
      updatedAt: now,
      isPublic: data.isPublic ?? false,
    };
    const docRef = await this.db.collection(COLLECTIONS.DECKS).add(deckData);
    return {
      id: docRef.id,
      ...deckData,
    };
  }

  async findById(id: string): Promise<Deck | null> {
    const doc = await this.db.collection(COLLECTIONS.DECKS).doc(id).get();
    if (!doc.exists) {
      return null;
    }
    return { id: doc.id, ...doc.data() } as Deck;
  }

  async update(id: string, data: DeckUpdateData): Promise<Deck> {
    const deck = await this.findById(id);
    if (!deck) {
      throw new AppError('Deck not found', 404);
    }
    const updateData: Partial<Deck> = {
      ...data,
      updatedAt: new Date(),
    };
    await this.db.collection(COLLECTIONS.DECKS).doc(id).update(updateData);
    return (await this.findById(id)) as Deck;
  }

  async delete(id: string): Promise<void> {
    const deck = await this.findById(id);
    if (!deck) {
      throw new AppError('Deck not found', 404);
    }
    const batch = this.db.batch();
    const deckRef = this.db.collection(COLLECTIONS.DECKS).doc(id);
    batch.delete(deckRef);
    const flashcardsQuery = this.db
      .collection(COLLECTIONS.FLASHCARDS)
      .where('deckId', '==', id);
    const flashcardsSnapshot = await flashcardsQuery.get();
    flashcardsSnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  }

  async findAll(
    filters: DeckFilters = {},
    pagination: PaginationOptions = { page: 1, limit: 10 },
  ): Promise<PaginatedResult<Deck>> {
    let query = this.db.collection(COLLECTIONS.DECKS) as any;
    if (filters.userId) query = query.where('userId', '==', filters.userId);
    if (filters.status) query = query.where('status', '==', filters.status);
    if (filters.visibility) query = query.where('visibility', '==', filters.visibility);
    if (filters.tags && filters.tags.length > 0) query = query.where('tags', 'array-contains-any', filters.tags);
    if (filters.isPublic !== undefined) query = query.where('isPublic', '==', filters.isPublic);
    const sortBy = pagination.sortBy || 'createdAt';
    const sortOrder = pagination.sortOrder || 'desc';
    query = query.orderBy(sortBy, sortOrder);
    let hasMore = false;
    if (pagination.lastDocId) {
      const startAfterDoc = await this.db.collection(COLLECTIONS.DECKS).doc(pagination.lastDocId).get();
      if (startAfterDoc.exists) {
        query = query.startAfter(startAfterDoc);
      }
    }
    query = query.limit(pagination.limit + 1);
    const snapshot = await query.get();
    const items = snapshot.docs.slice(0, pagination.limit).map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt,
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : data.updatedAt,
        lastStudied: data.lastStudied instanceof Timestamp ? data.lastStudied.toDate() : data.lastStudied,
      };
    });
    hasMore = snapshot.docs.length > pagination.limit;
    return {
      items,
      total: snapshot.size,
      hasMore,
      lastDocId: hasMore ? snapshot.docs[pagination.limit].id : undefined,
    };
  }

  async findByUser(
    userId: string,
    filters: DeckFilters = {},
    pagination: PaginationOptions = { page: 1, limit: 10 },
  ): Promise<PaginatedResult<Deck>> {
    return this.findAll({ ...filters, userId }, pagination);
  }

  async findPublic(
    filters: DeckFilters = {},
    pagination: PaginationOptions = { page: 1, limit: 10 },
  ): Promise<PaginatedResult<Deck>> {
    return this.findAll({ ...filters, visibility: DeckVisibility.PUBLIC }, pagination);
  }

  async addCollaborator(deckId: string, userId: string): Promise<Deck> {
    const deck = await this.findById(deckId);
    if (!deck) throw new AppError('Deck not found', 404);
    const collaborators = deck.collaborators ? [...deck.collaborators, userId] : [userId];
    await this.db.collection(COLLECTIONS.DECKS).doc(deckId).update({ collaborators });
    return (await this.findById(deckId)) as Deck;
  }

  async removeCollaborator(deckId: string, userId: string): Promise<Deck> {
    const deck = await this.findById(deckId);
    if (!deck) throw new AppError('Deck not found', 404);
    const collaborators = (deck.collaborators || []).filter((id: string) => id !== userId);
    await this.db.collection(COLLECTIONS.DECKS).doc(deckId).update({ collaborators });
    return (await this.findById(deckId)) as Deck;
  }

  async incrementFlashcardCount(deckId: string): Promise<void> {
    await this.db.collection(COLLECTIONS.DECKS).doc(deckId).update({ flashcardCount: FieldValue.increment(1) });
  }

  async decrementFlashcardCount(deckId: string): Promise<void> {
    await this.db.collection(COLLECTIONS.DECKS).doc(deckId).update({ flashcardCount: FieldValue.increment(-1) });
  }

  async updateLastStudied(deckId: string, date?: Date): Promise<void> {
    await this.db.collection(COLLECTIONS.DECKS).doc(deckId).update({ lastStudied: date || new Date() });
  }

  async search(
    query: string,
    filters: DeckFilters = {},
    pagination: PaginationOptions = { page: 1, limit: 10 },
  ): Promise<PaginatedResult<Deck>> {
    let baseQuery = this.db.collection(COLLECTIONS.DECKS) as any;
    if (filters.userId) baseQuery = baseQuery.where('userId', '==', filters.userId);
    if (filters.status) baseQuery = baseQuery.where('status', '==', filters.status);
    if (filters.visibility) baseQuery = baseQuery.where('visibility', '==', filters.visibility);
    if (filters.tags && filters.tags.length > 0) baseQuery = baseQuery.where('tags', 'array-contains-any', filters.tags);
    if (filters.isPublic !== undefined) baseQuery = baseQuery.where('isPublic', '==', filters.isPublic);
    const sortBy = pagination.sortBy || 'createdAt';
    const sortOrder = pagination.sortOrder || 'desc';
    baseQuery = baseQuery.orderBy(sortBy, sortOrder);
    const snapshot = await baseQuery.get();
    const searchTerm = query.toLowerCase();
    const filteredDecks = snapshot.docs
      .map((doc: any) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt,
          updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : data.updatedAt,
          lastStudied: data.lastStudied instanceof Timestamp ? data.lastStudied.toDate() : data.lastStudied,
        };
      })
      .filter((deck: any) =>
        deck.title.toLowerCase().includes(searchTerm) ||
        (deck.description && deck.description.toLowerCase().includes(searchTerm)),
      );
    const startIndex = (pagination.page - 1) * pagination.limit;
    const endIndex = startIndex + pagination.limit;
    const paginatedDecks = filteredDecks.slice(startIndex, endIndex);
    const hasMoreSearch = endIndex < filteredDecks.length;
    return {
      items: paginatedDecks,
      total: filteredDecks.length,
      hasMore: hasMoreSearch,
      lastDocId: hasMoreSearch && paginatedDecks.length > 0 ? paginatedDecks[paginatedDecks.length - 1].id : undefined,
    };
  }
}
