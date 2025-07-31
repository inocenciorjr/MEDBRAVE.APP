import { Timestamp } from 'firebase-admin/firestore';
import { firestore } from '../../../config/firebaseAdmin';
import { IUserFlashcardInteractionRepository } from '../../../domain/studyTools/flashcards/repositories/IUserFlashcardInteractionRepository';
import {
  FlashcardUserInteraction as UserFlashcardInteraction,
  Flashcard,
  FlashcardStatus
} from '../../../domain/studyTools/flashcards/types';
import { AppError } from '../../../shared/errors/AppError';

const COLLECTIONS = {
  INTERACTIONS: 'userFlashcardInteractions',
  FLASHCARDS: 'flashcards',
};

const MIN_EASINESS_FACTOR = 1.3;
const INITIAL_EASINESS_FACTOR = 2.5;
const LEECH_THRESHOLD = 8; // Número de falhas consecutivas para marcar como "leech"

export class FirebaseUserFlashcardInteractionRepository
implements IUserFlashcardInteractionRepository {
  private db = firestore;

  async getOrCreate(
    userId: string,
    flashcardId: string,
    deckId?: string,
  ): Promise<UserFlashcardInteraction> {
    const interactionId = `${userId}_${flashcardId}`;
    const interactionRef = this.db.collection(COLLECTIONS.INTERACTIONS).doc(interactionId);
    const doc = await interactionRef.get();
    const now = Timestamp.now();

    if (doc.exists) {
      return doc.data() as UserFlashcardInteraction;
    }

    const newInteraction: UserFlashcardInteraction = {
      id: interactionId,
      userId,
      flashcardId,
      deckId: deckId || '',
      reviewQuality: 0,
      reviewedAt: now,
      srsEaseFactor: INITIAL_EASINESS_FACTOR,
      srsInterval: 0,
      srsRepetitions: 0,
      srsLapses: 0,
      nextReviewAt: now,
      previousInterval: 0,
      previousEaseFactor: INITIAL_EASINESS_FACTOR,
      previousStatus: FlashcardStatus.LEARNING,
      newStatus: FlashcardStatus.LEARNING,
      createdAt: now,
      updatedAt: now,
    };

    await interactionRef.set(newInteraction);
    return newInteraction;
  }

  async recordReview(
    userId: string,
    flashcardId: string,
    deckId: string | undefined,
    reviewData: any,
  ): Promise<UserFlashcardInteraction> {
    const interactionId = `${userId}_${flashcardId}`;
    const interactionRef = this.db.collection(COLLECTIONS.INTERACTIONS).doc(interactionId);
    const now = Timestamp.now();
    const { quality, studyTime, reviewNotes } = reviewData;

    if (quality < 0 || quality > 3) {
      throw new AppError('Qualidade da revisão inválida. Deve ser entre 0 e 3.', 400);
    }

    return this.db.runTransaction(async transaction => {
      const doc = await transaction.get(interactionRef);
      let currentInteraction: UserFlashcardInteraction;

      if (!doc.exists) {
        currentInteraction = {
          id: interactionId,
          userId,
          flashcardId,
          deckId: deckId || '',
          reviewQuality: quality,
          reviewedAt: now,
          srsEaseFactor: INITIAL_EASINESS_FACTOR,
          srsInterval: 0,
          srsRepetitions: 0,
          srsLapses: 0,
          nextReviewAt: now,
          previousInterval: 0,
          previousEaseFactor: INITIAL_EASINESS_FACTOR,
          previousStatus: FlashcardStatus.LEARNING,
          newStatus: FlashcardStatus.LEARNING,
          createdAt: now,
          updatedAt: now,
        };

        if (studyTime !== undefined) {
          currentInteraction.studyTime = studyTime;
        }

        if (reviewNotes !== undefined) {
          currentInteraction.reviewNotes = reviewNotes;
        }
      } else {
        currentInteraction = doc.data() as UserFlashcardInteraction;
      }

      let { srsEaseFactor, srsInterval, srsRepetitions, srsLapses = 0 } = currentInteraction;

      if (quality < 2) {
        // AGAIN ou HARD
        srsRepetitions = 0;
        srsInterval = 1;
        srsLapses += 1;

        if (srsLapses >= LEECH_THRESHOLD) {
          currentInteraction.newStatus = FlashcardStatus.SUSPENDED;
        }
      } else {
        // GOOD ou EASY
        srsRepetitions += 1;
        srsLapses = 0; // Reseta o contador de falhas em caso de sucesso
        currentInteraction.newStatus = FlashcardStatus.LEARNING; // Limpa o status de leech em caso de sucesso

        if (srsRepetitions === 1) {
          srsInterval = 1;
        } else if (srsRepetitions === 2) {
          srsInterval = 6;
        } else {
          srsInterval = Math.round(srsInterval * srsEaseFactor);
        }

        srsEaseFactor = srsEaseFactor + (0.1 - (3 - quality) * (0.08 + (3 - quality) * 0.02));
        if (srsEaseFactor < MIN_EASINESS_FACTOR) {
          srsEaseFactor = MIN_EASINESS_FACTOR;
        }
      }

      // Limita o intervalo entre 1 e 365 dias
      srsInterval = Math.min(srsInterval, 365);
      srsInterval = Math.max(srsInterval, 1);

      const nextReviewDate = new Date(now.toDate());
      nextReviewDate.setDate(nextReviewDate.getDate() + srsInterval);

      const updatedInteraction: UserFlashcardInteraction = {
        ...currentInteraction,
        srsEaseFactor,
        srsInterval,
        srsRepetitions,
        srsLapses,
        reviewQuality: quality,
        reviewedAt: now,
        nextReviewAt: Timestamp.fromDate(nextReviewDate),
        updatedAt: now,
      };

      if (studyTime !== undefined) {
        updatedInteraction.studyTime = studyTime;
      }

      if (reviewNotes !== undefined) {
        updatedInteraction.reviewNotes = reviewNotes;
      }

      transaction.set(interactionRef, updatedInteraction);
      return updatedInteraction;
    });
  }

  async resetProgress(data: any): Promise<UserFlashcardInteraction> {
    const { userId, flashcardId, deckId } = data;
    const interactionId = `${userId}_${flashcardId}`;
    const interactionRef = this.db.collection(COLLECTIONS.INTERACTIONS).doc(interactionId);
    const now = Timestamp.now();
    const doc = await interactionRef.get();

    const existingData = doc.exists
      ? (doc.data() as UserFlashcardInteraction)
      : ({} as Partial<UserFlashcardInteraction>);

    const resetInteraction: UserFlashcardInteraction = {
      id: interactionId,
      userId,
      flashcardId,
      deckId: deckId || (existingData.deckId || ''),
      reviewQuality: 0,
      reviewedAt: now,
      srsEaseFactor: INITIAL_EASINESS_FACTOR,
      srsInterval: 0,
      srsRepetitions: 0,
      srsLapses: 0,
      nextReviewAt: now,
      previousInterval: 0,
      previousEaseFactor: INITIAL_EASINESS_FACTOR,
      previousStatus: FlashcardStatus.LEARNING,
      newStatus: FlashcardStatus.LEARNING,
      createdAt: existingData.createdAt || now,
      updatedAt: now,
    };

    await interactionRef.set(resetInteraction);
    return resetInteraction;
  }

  async getStats(userId: string, flashcardId: string): Promise<UserFlashcardInteraction | null> {
    const interactionId = `${userId}_${flashcardId}`;
    const interactionRef = this.db.collection(COLLECTIONS.INTERACTIONS).doc(interactionId);
    const doc = await interactionRef.get();

    if (!doc.exists) {
      return null;
    }

    return doc.data() as UserFlashcardInteraction;
  }

  async getDueFlashcards(
    userId: string,
    deckId?: string,
    limit: number = 20,
  ): Promise<Flashcard[]> {
    const now = Timestamp.now();

    let query = this.db
      .collection(COLLECTIONS.INTERACTIONS)
      .where('userId', '==', userId)
      .where('nextReviewAt', '<=', now)
      .orderBy('nextReviewAt', 'asc');

    if (deckId) {
      query = query.where('deckId', '==', deckId);
    }

    query = query.limit(limit);

    const snapshot = await query.get();
    if (snapshot.empty) {
      return [];
    }

    const dueInteractions = snapshot.docs.map(doc => doc.data() as UserFlashcardInteraction);
    const dueFlashcardIds = dueInteractions.map(interaction => interaction.flashcardId);

    if (dueFlashcardIds.length === 0) {
      return [];
    }

    const flashcardMap = new Map<string, Flashcard>();

    // Processa em lotes de 30 (limite do Firestore para consultas in)
    for (let i = 0; i < dueFlashcardIds.length; i += 30) {
      const batch = dueFlashcardIds.slice(i, i + 30);
      if (batch.length === 0) {
        continue;
      }

      // Obter os documentos individualmente já que a cláusula 'in' no id do documento pode ser complexa
      const batchPromises = batch.map(id =>
        this.db
          .collection(COLLECTIONS.FLASHCARDS)
          .doc(id)
          .get()
          .then(doc => {
            if (doc.exists) {
              const data = doc.data() as Omit<Flashcard, 'id'>;
              if (data.userId === userId) {
                flashcardMap.set(doc.id, { id: doc.id, ...data } as Flashcard);
              }
            }
          }),
      );

      await Promise.all(batchPromises);
    }

    return dueInteractions
      .map(interaction => flashcardMap.get(interaction.flashcardId))
      .filter((flashcard): flashcard is Flashcard => flashcard !== undefined);
  }
}
