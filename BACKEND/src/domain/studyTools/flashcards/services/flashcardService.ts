import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { firestore } from '../../../../config/firebaseAdmin';
import AppError from '../../../../utils/AppError';
import {
  Flashcard,
  FlashcardStatus,
  FlashcardUserStatistics,
  CreateFlashcardPayload,
  UpdateFlashcardPayload,
  FlashcardUserInteraction,
  ReviewQuality,
  ListFlashcardsOptions,
  PaginatedFlashcardsResult,
} from '../types';
import { logger } from '../../../../utils/logger';
// Integração FSRS já existe no serviço - removendo imports SM-2 legacy
// import { ProgrammedReviewServiceFactory } from '../../../srs/factory/programmedReviewServiceFactory';
// import { ProgrammedReviewContentType, ProgrammedReviewStatus } from '../../../srs/types';
// import type { IProgrammedReviewService } from '../../../srs/interfaces/IProgrammedReviewService';


// Collections
const FLASHCARDS_COLLECTION = 'flashcards';
const USER_INTERACTIONS_COLLECTION = 'userFlashcardInteractions';
const USERS_COLLECTION = 'users';
const DECKS_COLLECTION = 'decks';
const USER_STATISTICS_COLLECTION = 'flashcardStatistics';

// Utility functions for type conversion and validation
const ensureNumber = (value: unknown, defaultValue: number): number => {
  if (value === undefined || value === null) {
    return defaultValue;
  }
  const num = typeof value === 'string' ? parseFloat(value) : Number(value);
  return isNaN(num) ? defaultValue : num;
};

const ensureInteger = (value: unknown, defaultValue: number): number => {
  if (value === undefined || value === null) {
    return defaultValue;
  }
  const num = typeof value === 'string' ? parseInt(value, 10) : Math.floor(Number(value));
  return isNaN(num) ? defaultValue : num;
};

const DEFAULT_SRS_VALUES = {
  interval: 0,
  easeFactor: 2.5,
  repetitions: 0,
  lapses: 0,
} as const;

// Helper to generate searchable text from flashcard content
const generateSearchableText = (
  frontContent: string,
  backContent: string,
  personalNotes?: string | null,
): string => {
  const texts = [frontContent, backContent];
  if (personalNotes) {
    texts.push(personalNotes);
  }
  return texts.join(' ').toLowerCase();
};

export class FlashcardService {
  private db = firestore;
  // private programmedReviewService: IProgrammedReviewService;

  constructor() {
    // this.programmedReviewService = ProgrammedReviewServiceFactory.createService(this.db);
  }

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

  private async validateDeckExistsAndBelongsToUser(deckId: string, userId: string): Promise<void> {
    try {
      const deckRef = this.db.collection(DECKS_COLLECTION).doc(deckId);
      const deckDoc = await deckRef.get();

      if (!deckDoc.exists) {
        throw AppError.notFound(`Deck com ID ${deckId} não encontrado`);
      }

      const deck = deckDoc.data();
      if (deck?.userId !== userId && !deck?.isPublic) {
        throw AppError.forbidden('Usuário não tem permissão para acessar este deck');
      }
    } catch (error: unknown) {
      if (error instanceof AppError) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      throw AppError.internal(`Erro ao validar deck: ${errorMessage}`);
    }
  }

  private calculateNextReview(
    srsEaseFactor: number | unknown,
    srsInterval: number | unknown,
    srsRepetitions: number | unknown,
    reviewQuality: ReviewQuality,
  ): { nextInterval: number; newEaseFactor: number; newRepetitions: number; newLapses: number } {
    const currentEaseFactor = ensureNumber(srsEaseFactor, DEFAULT_SRS_VALUES.easeFactor);
    const currentInterval = ensureNumber(srsInterval, DEFAULT_SRS_VALUES.interval);
    const currentRepetitions = ensureInteger(srsRepetitions, DEFAULT_SRS_VALUES.repetitions);
    const newLapses = 0;

    if (reviewQuality < ReviewQuality.GOOD) {
      return {
        nextInterval: 1,
        newEaseFactor: Math.max(1.3, currentEaseFactor - 0.2),
        newRepetitions: 0,
        newLapses: 1,
      };
    }

    let nextInterval: number;
    if (currentRepetitions === 0) {
      nextInterval = 1;
    } else if (currentRepetitions === 1) {
      nextInterval = 6;
    } else {
      nextInterval = Math.round(currentInterval * currentEaseFactor);
    }

    const easeFactorModifier = 0.1 - (5 - reviewQuality) * (0.08 + (5 - reviewQuality) * 0.02);
    const newEaseFactor = Math.max(1.3, currentEaseFactor + easeFactorModifier);

    return {
      nextInterval,
      newEaseFactor,
      newRepetitions: currentRepetitions + 1,
      newLapses,
    };
  }

  private determineNewStatus(repetitions: number): FlashcardStatus {
    if (repetitions >= 8) {
      return FlashcardStatus.MASTERED;
    } else if (repetitions >= 3) {
      return FlashcardStatus.REVIEWING;
    } else {
      return FlashcardStatus.LEARNING;
    }
  }

  async getFlashcardsByUser(
    userId: string,
    options: ListFlashcardsOptions = {},
  ): Promise<PaginatedFlashcardsResult> {
    try {
      let query = this.db.collection(FLASHCARDS_COLLECTION).where('userId', '==', userId);
      let countQuery = this.db.collection(FLASHCARDS_COLLECTION).where('userId', '==', userId);

      if (options.readyForReview) {
        const now = Timestamp.now();
        query = query
          .where('nextReviewAt', '<=', now)
          .where('status', '!=', FlashcardStatus.SUSPENDED)
          .where('status', '!=', FlashcardStatus.ARCHIVED);
        countQuery = countQuery
          .where('nextReviewAt', '<=', now)
          .where('status', '!=', FlashcardStatus.SUSPENDED)
          .where('status', '!=', FlashcardStatus.ARCHIVED);
      }

      if (options.status) {
        query = query.where('status', '==', options.status);
        countQuery = countQuery.where('status', '==', options.status);
      }

      if (options.lastDocId) {
        const lastDoc = await this.db
          .collection(FLASHCARDS_COLLECTION)
          .doc(options.lastDocId)
          .get();
        if (lastDoc.exists) {
          query = query.startAfter(lastDoc);
        }
      }

      query = query.orderBy('nextReviewAt', 'asc');

      if (options.limit) {
        query = query.limit(options.limit + 1);
      }

      const [snapshot, countSnapshot] = await Promise.all([query.get(), countQuery.get()]);

      const hasMore = options.limit ? snapshot.docs.length > options.limit : false;
      const flashcards = snapshot.docs.slice(0, options.limit).map(
        doc =>
          ({
            ...doc.data(),
            id: doc.id,
          }) as Flashcard,
      );

      return {
        flashcards,
        hasMore,
        total: countSnapshot.size,
      };
    } catch (error) {
      logger.error('Erro ao buscar flashcards:', { error, userId, options });
      if (error instanceof AppError) {
        throw error;
      }
      throw AppError.internal('Erro ao buscar flashcards');
    }
  }

  async updateUserFlashcardStatistics(userId: string, deckId: string): Promise<void> {
    try {
      const statisticsRef = this.db
        .collection(USER_STATISTICS_COLLECTION)
        .doc(`${userId}_${deckId}`);
      const flashcardsSnapshot = await this.db
        .collection(FLASHCARDS_COLLECTION)
        .where('userId', '==', userId)
        .where('deckId', '==', deckId)
        .get();

      const stats: FlashcardUserStatistics = {
        userId,
        deckId,
        totalFlashcards: flashcardsSnapshot.size,
        activeFlashcards: 0,
        masteredFlashcards: 0,
        learningFlashcards: 0,
        reviewingFlashcards: 0,
        suspendedFlashcards: 0,
        archivedFlashcards: 0,
        averageEaseFactor: 0,
        averageIntervalDays: 0,
        dueForReviewCount: 0,
        lastReviewedAt: null,
        nextReviewAt: null,
        updatedAt: Timestamp.now(),
      };

      let totalEaseFactor = 0;
      let totalInterval = 0;
      const now = Timestamp.now();

      flashcardsSnapshot.forEach(doc => {
        const flashcard = doc.data() as Flashcard;
        const easeFactor = ensureNumber(flashcard.srsEaseFactor, DEFAULT_SRS_VALUES.easeFactor);
        const interval = ensureNumber(flashcard.srsInterval, DEFAULT_SRS_VALUES.interval);

        totalEaseFactor += easeFactor;
        totalInterval += interval;

        if (flashcard.nextReviewAt && flashcard.nextReviewAt.toMillis() <= now.toMillis()) {
          stats.dueForReviewCount++;
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
          case FlashcardStatus.REVIEWING:
            stats.reviewingFlashcards++;
            stats.activeFlashcards++;
            break;
          case FlashcardStatus.LEARNING:
            stats.learningFlashcards++;
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

      if (flashcardsSnapshot.size > 0) {
        stats.averageEaseFactor = totalEaseFactor / flashcardsSnapshot.size;
        stats.averageIntervalDays = totalInterval / flashcardsSnapshot.size;
      }

      await statisticsRef.set(stats, { merge: true });

      // Atualizar estatísticas do usuário
      const userStatsRef = this.db.collection(USERS_COLLECTION).doc(userId);
      await userStatsRef.update({
        totalFlashcards: stats.totalFlashcards,
        activeFlashcards: stats.activeFlashcards,
        masteredFlashcards: stats.masteredFlashcards,
        updatedAt: Timestamp.now(),
      });
    } catch (error: unknown) {
      logger.error('Erro ao atualizar estatísticas de flashcard:', { error, userId, deckId });
      if (error instanceof AppError) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      throw AppError.internal(`Erro ao atualizar estatísticas do usuário: ${errorMessage}`);
    }
  }

  async createFlashcard(data: CreateFlashcardPayload): Promise<Flashcard> {
    try {
      await this.validateUserExists(data.userId);
      await this.validateDeckExistsAndBelongsToUser(data.deckId, data.userId);

      const now = Timestamp.now();
      const newFlashcard: Flashcard = {
        id: '', // Será preenchido após a criação
        userId: data.userId,
        deckId: data.deckId,
        frontContent: data.frontContent,
        backContent: data.backContent,
        frontText: data.frontText || '',
        backText: data.backText || '',
        personalNotes: data.personalNotes || '',
        tags: data.tags || [],
        status: FlashcardStatus.LEARNING,
        srsInterval: DEFAULT_SRS_VALUES.interval,
        srsEaseFactor: DEFAULT_SRS_VALUES.easeFactor,
        srsRepetitions: DEFAULT_SRS_VALUES.repetitions,
        srsLapses: DEFAULT_SRS_VALUES.lapses,
        nextReviewAt: now,
        lastReviewedAt: null,
        createdAt: now,
        updatedAt: now,
        searchableText: generateSearchableText(
          data.frontContent,
          data.backContent,
          data.personalNotes || '',
        ),
      };

      const docRef = await this.db.collection(FLASHCARDS_COLLECTION).add(newFlashcard);
      newFlashcard.id = docRef.id;

      // Revisões programadas serão criadas apenas quando o usuário responder aos flashcards
      // Removido criação automática para evitar spam de revisões

      // Atualizar contagem de flashcards no deck
      const deckRef = this.db.collection(DECKS_COLLECTION).doc(data.deckId);
      await deckRef.update({
        flashcardCount: FieldValue.increment(1),
        updatedAt: now,
      });

      // Atualizar estatísticas do usuário
      await this.updateUserFlashcardStatistics(data.userId, data.deckId);

      return newFlashcard;
    } catch (error) {
      logger.error('Erro ao criar flashcard:', { error, data });
      if (error instanceof AppError) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      throw AppError.internal(`Erro ao criar flashcard: ${errorMessage}`);
    }
  }

  async getFlashcardById(id: string, userId: string): Promise<Flashcard | null> {
    try {
      const flashcardDoc = await this.db.collection(FLASHCARDS_COLLECTION).doc(id).get();
      if (!flashcardDoc.exists) {
        return null;
      }

      const flashcard = flashcardDoc.data() as Flashcard;

      if (flashcard.userId !== userId) {
        throw AppError.forbidden('Usuário não autorizado a acessar este flashcard.');
      }

      // Garante que todos os campos SRS estão presentes e com tipos corretos
      const completeFlashcard: Flashcard = {
        ...flashcard,
        id: flashcardDoc.id,
        srsInterval: ensureNumber(flashcard.srsInterval, DEFAULT_SRS_VALUES.interval),
        srsEaseFactor: ensureNumber(flashcard.srsEaseFactor, DEFAULT_SRS_VALUES.easeFactor),
        srsRepetitions: ensureInteger(flashcard.srsRepetitions, DEFAULT_SRS_VALUES.repetitions),
        srsLapses: ensureInteger(flashcard.srsLapses, DEFAULT_SRS_VALUES.lapses),
        lastReviewedAt: flashcard.lastReviewedAt ?? null,
        nextReviewAt: flashcard.nextReviewAt ?? null,
      };

      return completeFlashcard;
    } catch (error) {
      logger.error('Erro ao buscar flashcard:', { error, id, userId });
      if (error instanceof AppError) {
        throw error;
      }
      throw AppError.internal('Erro ao buscar flashcard');
    }
  }

  async updateFlashcard(
    flashcardId: string,
    userId: string,
    data: UpdateFlashcardPayload,
  ): Promise<Flashcard> {
    try {
      const flashcardRef = this.db.collection(FLASHCARDS_COLLECTION).doc(flashcardId);
      const doc = await flashcardRef.get();

      if (!doc.exists) {
        throw AppError.notFound('Flashcard não encontrado.');
      }
      const existingFlashcard = doc.data() as Flashcard;
      if (existingFlashcard.userId !== userId) {
        throw AppError.forbidden('Usuário não autorizado a atualizar este flashcard.');
      }

      const updateData: Partial<Flashcard> = {
        ...data,
        updatedAt: Timestamp.now(),
        srsInterval:
          data.srsInterval !== undefined
            ? ensureNumber(data.srsInterval, existingFlashcard.srsInterval)
            : undefined,
        srsEaseFactor:
          data.srsEaseFactor !== undefined
            ? ensureNumber(data.srsEaseFactor, existingFlashcard.srsEaseFactor)
            : undefined,
        srsRepetitions:
          data.srsRepetitions !== undefined
            ? ensureInteger(data.srsRepetitions, existingFlashcard.srsRepetitions)
            : undefined,
        srsLapses:
          data.srsLapses !== undefined
            ? ensureInteger(data.srsLapses, existingFlashcard.srsLapses)
            : undefined,
      };

      if (data.frontContent || data.backContent) {
        updateData.searchableText = generateSearchableText(
          data.frontContent !== undefined ? data.frontContent : existingFlashcard.frontContent,
          data.backContent !== undefined ? data.backContent : existingFlashcard.backContent,
          data.personalNotes !== undefined ? data.personalNotes : existingFlashcard.personalNotes,
        );
      }

      await flashcardRef.update(updateData);
      await this.updateUserFlashcardStatistics(userId, existingFlashcard.deckId);
      const updatedDoc = await flashcardRef.get();

      return {
        ...updatedDoc.data(),
        id: flashcardId,
      } as Flashcard;
    } catch (error) {
      logger.error('Erro ao atualizar flashcard:', { error, flashcardId, userId, data });
      if (error instanceof AppError) {
        throw error;
      }
      throw AppError.internal('Erro ao atualizar flashcard');
    }
  }

  async deleteFlashcard(flashcardId: string, userId: string): Promise<void> {
    try {
      const flashcardRef = this.db.collection(FLASHCARDS_COLLECTION).doc(flashcardId);
      const doc = await flashcardRef.get();

      if (!doc.exists) {
        throw AppError.notFound('Flashcard não encontrado.');
      }

      const flashcard = doc.data() as Flashcard;
      if (flashcard.userId !== userId) {
        throw AppError.forbidden('Usuário não autorizado a deletar este flashcard.');
      }

      // Atualizar contagem de flashcards no deck
      const deckRef = this.db.collection(DECKS_COLLECTION).doc(flashcard.deckId);

      // Deletar todas as interações do flashcard
      const interactionsQuery = this.db
        .collection(USER_INTERACTIONS_COLLECTION)
        .where('flashcardId', '==', flashcardId);
      const interactionsSnapshot = await interactionsQuery.get();

      const batch = this.db.batch();
      interactionsSnapshot.docs.forEach(interactionDoc => {
        batch.delete(interactionDoc.ref);
      });

      batch.delete(flashcardRef);
      batch.update(deckRef, {
        flashcardCount: FieldValue.increment(-1),
        updatedAt: Timestamp.now(),
      });

      await batch.commit();
      await this.updateUserFlashcardStatistics(userId, flashcard.deckId);
    } catch (error) {
      logger.error('Erro ao deletar flashcard:', { error, flashcardId, userId });
      if (error instanceof AppError) {
        throw error;
      }
      throw AppError.internal('Erro ao deletar flashcard');
    }
  }

  async toggleArchiveFlashcard(flashcardId: string, userId: string): Promise<Flashcard> {
    try {
      const flashcardRef = this.db.collection(FLASHCARDS_COLLECTION).doc(flashcardId);
      const doc = await flashcardRef.get();

      if (!doc.exists) {
        throw AppError.notFound('Flashcard não encontrado.');
      }

      const flashcard = doc.data() as Flashcard;
      if (flashcard.userId !== userId) {
        throw AppError.forbidden('Usuário não autorizado a arquivar/desarquivar este flashcard.');
      }

      const isCurrentlyArchived = flashcard.status === FlashcardStatus.SUSPENDED;
      const updateData: Partial<Flashcard> = {
        status: isCurrentlyArchived ? FlashcardStatus.LEARNING : FlashcardStatus.SUSPENDED,
        nextReviewAt: isCurrentlyArchived ? Timestamp.now() : null,
        updatedAt: Timestamp.now(),
      };

      await flashcardRef.update(updateData);
      await this.updateUserFlashcardStatistics(userId, flashcard.deckId);

      const updatedDoc = await flashcardRef.get();
      return {
        ...updatedDoc.data(),
        id: flashcardId,
      } as Flashcard;
    } catch (error) {
      logger.error('Erro ao arquivar/desarquivar flashcard:', { error, flashcardId, userId });
      if (error instanceof AppError) {
        throw error;
      }
      throw AppError.internal('Erro ao arquivar/desarquivar flashcard');
    }
  }

  async recordFlashcardReview(
    userId: string,
    flashcardId: string,
    reviewQuality: ReviewQuality,
  ): Promise<{ updatedFlashcard: Flashcard; interaction: FlashcardUserInteraction }> {
    try {
      await this.validateUserExists(userId);

      const flashcardRef = this.db.collection(FLASHCARDS_COLLECTION).doc(flashcardId);
      const flashcardDoc = await flashcardRef.get();

      if (!flashcardDoc.exists) {
        throw AppError.notFound('Flashcard não encontrado.');
      }

      const flashcard = flashcardDoc.data() as Flashcard;

      if (flashcard.userId !== userId) {
        throw AppError.forbidden('Usuário não autorizado a revisar este flashcard.');
      }

      const now = Timestamp.now();
      const { nextInterval, newEaseFactor, newRepetitions, newLapses } = this.calculateNextReview(
        flashcard.srsEaseFactor,
        flashcard.srsInterval,
        flashcard.srsRepetitions,
        reviewQuality,
      );

      const nextReviewDate = new Date();
      nextReviewDate.setDate(nextReviewDate.getDate() + nextInterval);

      const newStatus = this.determineNewStatus(newRepetitions);

      const updateData = {
        lastReviewedAt: now,
        nextReviewAt: Timestamp.fromDate(nextReviewDate),
        srsInterval: nextInterval,
        srsEaseFactor: newEaseFactor,
        srsRepetitions: newRepetitions,
        srsLapses: ensureInteger(flashcard.srsLapses, 0) + newLapses,
        status: newStatus,
        updatedAt: now,
      };

      // Atualizar o flashcard primeiro, para garantir que pelo menos isso ocorra
      await flashcardRef.update(updateData);

      // Atualizar revisão programada correspondente
      try {
        logger.info('Atualizando revisão programada para flashcard:', { flashcardId, userId });
        
        // Buscar a revisão programada existente
        // const existingReview = await this.programmedReviewService.getProgrammedReviewByContentId(
        //   flashcardId,
        //   ProgrammedReviewContentType.FLASHCARD,
        //   userId
        // );

        // if (existingReview) {
        //   // Atualizar a revisão programada
        //   await this.programmedReviewService.updateProgrammedReview(
        //     existingReview.id, 
        //     reviewQuality,
        //     `Flashcard review - Status: ${newStatus}, Interval: ${nextInterval} days`
        //   );
          
        //   logger.info('Revisão programada atualizada com sucesso', { reviewId: existingReview.id });
        // } else {
        //   // Se não existir, criar uma nova (fallback)
        //   logger.warn('Revisão programada não encontrada, criando nova...', { flashcardId });
          
        //   const newProgrammedReview = await this.programmedReviewService.createProgrammedReview({
        //     userId: userId,
        //     contentId: flashcardId,
        //     contentType: ProgrammedReviewContentType.FLASHCARD,
        //     deckId: flashcard.deckId,
        //     originalAnswerCorrect: reviewQuality >= ReviewQuality.GOOD,
        //     nextReviewAt: Timestamp.fromDate(nextReviewDate),
        //     intervalDays: nextInterval,
        //     easeFactor: newEaseFactor,
        //     repetitions: newRepetitions,
        //     lapses: ensureInteger(flashcard.srsLapses, 0) + newLapses,
        //     status: ProgrammedReviewStatus.LEARNING,
        //     notes: null
        //   });
          
        //   logger.info('Nova revisão programada criada com sucesso', { reviewId: newProgrammedReview.id });
        // }
      } catch (programmedReviewError) {
        // Log do erro mas não falha a revisão do flashcard
        logger.error('Erro ao atualizar revisão programada (continuando):', programmedReviewError);
      }

      const updatedFlashcard: Flashcard = {
        ...flashcard,
        ...updateData,
        id: flashcardId,
      };

      const interaction: FlashcardUserInteraction = {
        id: `${flashcardId}_${now.toMillis()}`,
        userId,
        flashcardId,
        deckId: flashcard.deckId,
        reviewQuality,
        reviewedAt: now,
        srsInterval: nextInterval,
        srsEaseFactor: newEaseFactor,
        srsRepetitions: newRepetitions,
        srsLapses: newLapses,
        nextReviewAt: Timestamp.fromDate(nextReviewDate),
        previousInterval: ensureNumber(flashcard.srsInterval, 0),
        previousEaseFactor: ensureNumber(flashcard.srsEaseFactor, 2.5),
        previousStatus: flashcard.status,
        newStatus: newStatus,
        createdAt: now,
        updatedAt: now,
      };

      await this.db.collection(USER_INTERACTIONS_COLLECTION).doc(interaction.id).set(interaction);
      await this.updateUserFlashcardStatistics(userId, flashcard.deckId);

      // Registrar evento para o sistema de conquistas
      try {
        // Usar uma collection específica para eventos de conquistas que será processada pelo sistema de conquistas
        await this.db.collection('achievementEvents').add({
          type: 'flashcard_reviewed',
          userId,
          timestamp: now,
          data: {
            flashcardId,
            reviewQuality,
            deckId: flashcard.deckId,
            srsInterval: nextInterval,
            srsRepetitions: newRepetitions,
            srsLapses: newLapses,
            isCorrect: reviewQuality >= ReviewQuality.GOOD
          }
        });
        
        logger.info('Evento de conquista registrado para revisão de flashcard', { 
          userId, 
          flashcardId 
        });
      } catch (achievementError) {
        // Log do erro, mas não impede a operação principal
        logger.error('Erro ao registrar evento para sistema de conquistas', {
          error: achievementError,
          userId,
          flashcardId
        });
      }

      return { updatedFlashcard, interaction };
    } catch (error) {
      logger.error('Erro ao registrar revisão de flashcard:', {
        error,
        userId,
        flashcardId,
        reviewQuality,
      });
      if (error instanceof AppError) {
        throw error;
      }
      throw AppError.internal('Erro ao registrar revisão de flashcard');
    }
  }
}

export const flashcardService = new FlashcardService();
