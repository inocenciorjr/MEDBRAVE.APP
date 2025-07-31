import { firestore } from 'firebase-admin';
import { 
  IStudySessionRepository, 
  StudySessionFilters, 
  PaginationOptions,
  PaginatedStudySessions
} from '../repositories/IStudySessionRepository';
import { 
  StudySession,
  CreateStudySessionDTO,
  UpdateStudySessionDTO
} from '../types/studySession.types';
import { ReviewQuality } from '../../flashcards/types/flashcard.types';

export class FirebaseStudySessionService implements IStudySessionRepository {
  constructor(private db: firestore.Firestore) {}

  async create(data: CreateStudySessionDTO): Promise<StudySession> {
    const docRef = await this.db.collection('studySessions').add({
      ...data,
      createdAt: firestore.FieldValue.serverTimestamp(),
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });

    const doc = await docRef.get();
    return { id: doc.id, ...doc.data() } as StudySession;
  }

  async findById(id: string, userId: string): Promise<StudySession | null> {
    const doc = await this.db.collection('studySessions').doc(id).get();
    if (!doc.exists) return null;
    
    const sessionData = doc.data() as StudySession;
    if (sessionData.userId !== userId) return null;
    
    const { id: _, ...dataWithoutId } = sessionData;
    return { id: doc.id, ...dataWithoutId } as StudySession;
  }

  async findByUser(
    userId: string,
    filters: StudySessionFilters,
    pagination: PaginationOptions
  ): Promise<PaginatedStudySessions> {
    let query = this.db
      .collection('studySessions')
      .where('userId', '==', userId) as firestore.Query;

    // Apply filters
    if (filters.studyType) {
      query = query.where('studyType', '==', filters.studyType);
    }

    if (filters.isCompleted !== undefined) {
      query = query.where('isCompleted', '==', filters.isCompleted);
    }

    if (filters.startDate) {
      query = query.where('startTime', '>=', filters.startDate);
    }

    if (filters.endDate) {
      query = query.where('startTime', '<=', filters.endDate);
    }

    // Apply sorting
    const sortBy = pagination.sortBy || 'startTime';
    const sortOrder = pagination.sortOrder || 'desc';
    query = query.orderBy(sortBy, sortOrder);

    // Apply pagination
    const limit = pagination.limit || 10;
    
    if (pagination.lastDocId) {
      const lastDoc = await this.db.collection('studySessions').doc(pagination.lastDocId).get();
      if (lastDoc.exists) {
        query = query.startAfter(lastDoc);
      }
    }

    query = query.limit(limit + 1); // Get one extra to check if there are more

    const snapshot = await query.get();
    const hasMore = snapshot.docs.length > limit;
    const items = snapshot.docs.slice(0, limit).map(doc => ({
      id: doc.id,
      ...doc.data()
    } as StudySession));

    // Get total count
    const totalQuery = this.db
      .collection('studySessions')
      .where('userId', '==', userId);
    const totalSnapshot = await totalQuery.get();
    const total = totalSnapshot.size;

    return {
      items,
      total,
      hasMore,
      lastDocId: items.length > 0 ? items[items.length - 1].id : undefined
    };
  }

  async update(id: string, userId: string, data: UpdateStudySessionDTO): Promise<StudySession> {
    const docRef = this.db.collection('studySessions').doc(id);
    
    // Verify ownership
    const doc = await docRef.get();
    if (!doc.exists || doc.data()?.userId !== userId) {
      throw new Error('Session not found or access denied');
    }
    
    await docRef.update({
      ...data,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });

    const updatedDoc = await docRef.get();
    return { id: updatedDoc.id, ...updatedDoc.data() } as StudySession;
  }

  async delete(id: string, userId: string): Promise<void> {
    const docRef = this.db.collection('studySessions').doc(id);
    
    // Verify ownership
    const doc = await docRef.get();
    if (!doc.exists || doc.data()?.userId !== userId) {
      throw new Error('Session not found or access denied');
    }
    
    await docRef.delete();
  }

  async complete(id: string, userId: string, finalUpdates?: UpdateStudySessionDTO): Promise<StudySession> {
    const docRef = this.db.collection('studySessions').doc(id);
    
    // Verify ownership
    const doc = await docRef.get();
    if (!doc.exists || doc.data()?.userId !== userId) {
      throw new Error('Session not found or access denied');
    }
    
    const updateData = {
      isCompleted: true,
      endTime: new Date(),
      ...finalUpdates,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    };
    
    await docRef.update(updateData);
    
    const completedDoc = await docRef.get();
    return { id: completedDoc.id, ...completedDoc.data() } as StudySession;
  }

  async recordAnswer(
    sessionId: string,
    userId: string,
    questionId: string,
    isCorrect: boolean,
    quality: ReviewQuality,
    selectedOptionId?: string | null,
    essayResponse?: string | null,
    responseTimeSeconds?: number,
    questionListId?: string | null,
  ): Promise<void> {
    const docRef = this.db.collection('studySessions').doc(sessionId);
    
    // Verify ownership
    const doc = await docRef.get();
    if (!doc.exists || doc.data()?.userId !== userId) {
      throw new Error('Session not found or access denied');
    }
    
    const answerData = {
      questionId,
      isCorrect,
      quality,
      selectedOptionId,
      essayResponse,
      responseTimeSeconds,
      questionListId,
      answeredAt: firestore.FieldValue.serverTimestamp(),
    };
    
    // Add to answers array
    await docRef.update({
      answers: firestore.FieldValue.arrayUnion(answerData),
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });
  }
} 