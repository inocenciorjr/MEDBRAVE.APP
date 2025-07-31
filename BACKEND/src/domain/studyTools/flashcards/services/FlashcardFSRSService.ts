import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { firestore } from '../../../../config/firebaseAdmin';
import AppError from '../../../../utils/AppError';
import {
  Flashcard,
  FlashcardStatus,
  CreateFlashcardPayload,
  UpdateFlashcardPayload,
  FlashcardUserInteraction,
  ReviewQuality,
  ListFlashcardsOptions,
  PaginatedFlashcardsResult,
} from '../types';
import { logger } from '../../../../utils/logger';
import { generateReviewId } from '../../../../utils/idGenerator';

// Importar o serviço FSRS
import { FSRSServiceFactory } from '../../../srs/factory/fsrsServiceFactory';
import { FSRSGrade, FSRSState, FSRSCard } from '../../../srs/services/FSRSService';
import type { IFSRSService } from '../../../srs/interfaces/IFSRSService';
// Removido temporarily - IAchievementService precisa ser ajustado

// Collections
const FLASHCARDS_COLLECTION = 'flashcards';
const USER_INTERACTIONS_COLLECTION = 'userFlashcardInteractions';
const USERS_COLLECTION = 'users';
const DECKS_COLLECTION = 'decks';
const USER_STATISTICS_COLLECTION = 'flashcardStatistics';

// Mapeamento ReviewQuality para FSRSGrade
const mapReviewQualityToFSRSGrade = (quality: ReviewQuality): FSRSGrade => {
  switch (quality) {
    case ReviewQuality.BAD:
      return FSRSGrade.AGAIN;
    case ReviewQuality.DIFFICULT:
      return FSRSGrade.HARD;
    case ReviewQuality.GOOD:
      return FSRSGrade.GOOD;
    case ReviewQuality.EASY:
      return FSRSGrade.EASY;
    default:
      return FSRSGrade.GOOD;
  }
};

// Mapeamento FSRSState para FlashcardStatus
const mapFSRSStateToFlashcardStatus = (state: FSRSState, reps: number): FlashcardStatus => {
  switch (state) {
    case FSRSState.NEW:
      return FlashcardStatus.LEARNING;
    case FSRSState.LEARNING:
      return FlashcardStatus.LEARNING;
    case FSRSState.REVIEW:
      return reps >= 8 ? FlashcardStatus.MASTERED : FlashcardStatus.REVIEWING;
    case FSRSState.RELEARNING:
      return FlashcardStatus.LEARNING;
    default:
      return FlashcardStatus.LEARNING;
  }
};

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

export class FlashcardFSRSService {
  private db = firestore;
  private fsrsService: IFSRSService;

  constructor() {
    this.fsrsService = FSRSServiceFactory.createService(this.db);
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

  /**
   * Converte dados FSRS de volta para campos compatíveis com o flashcard
   */
  private convertFSRSToFlashcardData(fsrsCard: FSRSCard): {
    srsInterval: number;
    srsEaseFactor: number;
    srsRepetitions: number;
    srsLapses: number;
    nextReviewAt: Timestamp;
    status: FlashcardStatus;
  } {
    // Converte estabilidade FSRS para campos compatíveis
    const srsInterval = Math.round(fsrsCard.scheduled_days);
    const srsEaseFactor = Math.max(1.3, Math.min(2.5, 2.5 - (fsrsCard.difficulty - 5) * 0.2));
    
    return {
      srsInterval,
      srsEaseFactor,
      srsRepetitions: fsrsCard.reps,
      srsLapses: fsrsCard.lapses,
      nextReviewAt: Timestamp.fromDate(fsrsCard.due),
      status: mapFSRSStateToFlashcardStatus(fsrsCard.state, fsrsCard.reps)
    };
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

      const limit = Math.min(options.limit || 50, 100);
      query = query.limit(limit);

      const [querySnapshot, countSnapshot] = await Promise.all([
        query.get(),
        countQuery.get(),
      ]);

      const flashcards: Flashcard[] = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Flashcard[];

      const hasMore = flashcards.length === limit;
      const total = countSnapshot.size;

      return {
        flashcards,
        hasMore,
        total,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      throw AppError.internal(`Erro ao buscar flashcards: ${errorMessage}`);
    }
  }

  async updateUserFlashcardStatistics(userId: string, deckId: string): Promise<void> {
    try {
      const flashcardsQuery = this.db
        .collection(FLASHCARDS_COLLECTION)
        .where('userId', '==', userId)
        .where('deckId', '==', deckId);

      const flashcardsSnapshot = await flashcardsQuery.get();
      const flashcards = flashcardsSnapshot.docs.map((doc) => doc.data()) as Flashcard[];

      if (flashcards.length === 0) {
        return;
      }

      const stats = {
        totalFlashcards: flashcards.length,
        activeFlashcards: flashcards.filter((f) => f.status === FlashcardStatus.LEARNING || f.status === FlashcardStatus.REVIEWING).length,
        masteredFlashcards: flashcards.filter((f) => f.status === FlashcardStatus.MASTERED).length,
        learningFlashcards: flashcards.filter((f) => f.status === FlashcardStatus.LEARNING).length,
        reviewingFlashcards: flashcards.filter((f) => f.status === FlashcardStatus.REVIEWING).length,
        suspendedFlashcards: flashcards.filter((f) => f.status === FlashcardStatus.SUSPENDED).length,
        archivedFlashcards: flashcards.filter((f) => f.status === FlashcardStatus.ARCHIVED).length,
        averageEaseFactor: flashcards.reduce((sum, f) => sum + f.srsEaseFactor, 0) / flashcards.length,
        averageIntervalDays: flashcards.reduce((sum, f) => sum + f.srsInterval, 0) / flashcards.length,
        dueForReviewCount: flashcards.filter((f) => f.nextReviewAt && f.nextReviewAt.toDate() <= new Date()).length,
        lastReviewedAt: flashcards
          .filter((f) => f.lastReviewedAt)
          .sort((a, b) => b.lastReviewedAt!.toMillis() - a.lastReviewedAt!.toMillis())[0]?.lastReviewedAt || null,
        nextReviewAt: flashcards
          .filter((f) => f.nextReviewAt)
          .sort((a, b) => a.nextReviewAt!.toMillis() - b.nextReviewAt!.toMillis())[0]?.nextReviewAt || null,
      };

      const statisticsRef = this.db.collection(USER_STATISTICS_COLLECTION).doc(`${userId}_${deckId}`);
      await statisticsRef.set({
        userId,
        deckId,
        ...stats,
        updatedAt: Timestamp.now(),
      });

      logger.info(`Estatísticas atualizadas para usuário ${userId} no deck ${deckId}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error(`Erro ao atualizar estatísticas: ${errorMessage}`);
      throw AppError.internal(`Erro ao atualizar estatísticas: ${errorMessage}`);
    }
  }

  async createFlashcard(data: CreateFlashcardPayload): Promise<Flashcard> {
    try {
      await this.validateUserExists(data.userId);
      await this.validateDeckExistsAndBelongsToUser(data.deckId, data.userId);

      const now = Timestamp.now();
      const flashcardRef = this.db.collection(FLASHCARDS_COLLECTION).doc();

      // Cria card FSRS inicial
      const fsrsCard = this.fsrsService.createNewCard(flashcardRef.id, data.userId, data.deckId);
      const flashcardData = this.convertFSRSToFlashcardData(fsrsCard);

      const flashcard: Flashcard = {
        id: flashcardRef.id,
        userId: data.userId,
        deckId: data.deckId,
        frontContent: data.frontContent,
        backContent: data.backContent,
        frontText: data.frontText,
        backText: data.backText,
        personalNotes: data.personalNotes || null,
        tags: data.tags || [],
        ...flashcardData,
        lastReviewedAt: null,
        createdAt: now,
        updatedAt: now,
        searchableText: generateSearchableText(data.frontContent, data.backContent, data.personalNotes),
      };

      await Promise.all([
        flashcardRef.set(flashcard),
        this.fsrsService.saveCard(fsrsCard),
        this.updateDeckFlashcardCount(data.deckId, 1),
        this.updateUserFlashcardStatistics(data.userId, data.deckId),
      ]);

      logger.info(`Flashcard criado: ${flashcardRef.id} para usuário ${data.userId}`);
      return flashcard;
    } catch (error: unknown) {
      if (error instanceof AppError) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      throw AppError.internal(`Erro ao criar flashcard: ${errorMessage}`);
    }
  }

  async getFlashcardById(id: string, userId: string): Promise<Flashcard | null> {
    try {
      const flashcardRef = this.db.collection(FLASHCARDS_COLLECTION).doc(id);
      const flashcardDoc = await flashcardRef.get();

      if (!flashcardDoc.exists) {
        return null;
      }

      const flashcard = flashcardDoc.data() as Flashcard;

      if (flashcard.userId !== userId) {
        const deckRef = this.db.collection(DECKS_COLLECTION).doc(flashcard.deckId);
        const deckDoc = await deckRef.get();
        const deck = deckDoc.data();

        if (!deck?.isPublic) {
          throw AppError.forbidden('Usuário não tem permissão para acessar este flashcard');
        }
      }

      return { ...flashcard, id: flashcardDoc.id };
    } catch (error: unknown) {
      if (error instanceof AppError) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      throw AppError.internal(`Erro ao buscar flashcard: ${errorMessage}`);
    }
  }

  async updateFlashcard(
    flashcardId: string,
    userId: string,
    data: UpdateFlashcardPayload,
  ): Promise<Flashcard> {
    try {
      const flashcardRef = this.db.collection(FLASHCARDS_COLLECTION).doc(flashcardId);
      const flashcardDoc = await flashcardRef.get();

      if (!flashcardDoc.exists) {
        throw AppError.notFound(`Flashcard com ID ${flashcardId} não encontrado`);
      }

      const currentFlashcard = flashcardDoc.data() as Flashcard;

      if (currentFlashcard.userId !== userId) {
        throw AppError.forbidden('Usuário não tem permissão para editar este flashcard');
      }

      const { status: _, ...dataWithoutStatus } = data;
      const updateData: Partial<Flashcard> = {
        ...dataWithoutStatus,
        ...(data.status && { status: data.status }),
        updatedAt: Timestamp.now(),
      };

      if (data.frontContent || data.backContent || data.personalNotes !== undefined) {
        updateData.searchableText = generateSearchableText(
          data.frontContent || currentFlashcard.frontContent,
          data.backContent || currentFlashcard.backContent,
          data.personalNotes !== undefined ? data.personalNotes : currentFlashcard.personalNotes,
        );
      }

      await flashcardRef.update(updateData);

      const updatedFlashcard = {
        ...currentFlashcard,
        ...updateData,
      } as Flashcard;

      await this.updateUserFlashcardStatistics(userId, currentFlashcard.deckId);

      logger.info(`Flashcard atualizado: ${flashcardId} pelo usuário ${userId}`);
      return updatedFlashcard;
    } catch (error: unknown) {
      if (error instanceof AppError) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      throw AppError.internal(`Erro ao atualizar flashcard: ${errorMessage}`);
    }
  }

  async deleteFlashcard(flashcardId: string, userId: string): Promise<void> {
    try {
      const flashcardRef = this.db.collection(FLASHCARDS_COLLECTION).doc(flashcardId);
      const flashcardDoc = await flashcardRef.get();

      if (!flashcardDoc.exists) {
        throw AppError.notFound(`Flashcard com ID ${flashcardId} não encontrado`);
      }

      const flashcard = flashcardDoc.data() as Flashcard;

      if (flashcard.userId !== userId) {
        throw AppError.forbidden('Usuário não tem permissão para excluir este flashcard');
      }

      // Remove o card FSRS associado
      const fsrsCard = await this.fsrsService.getCardByFlashcardId(flashcardId, userId);
      if (fsrsCard) {
        await this.db.collection('fsrs_cards').doc(fsrsCard.id).delete();
      }

      await Promise.all([
        flashcardRef.delete(),
        this.updateDeckFlashcardCount(flashcard.deckId, -1),
        this.updateUserFlashcardStatistics(userId, flashcard.deckId),
      ]);

      logger.info(`Flashcard excluído: ${flashcardId} pelo usuário ${userId}`);
    } catch (error: unknown) {
      if (error instanceof AppError) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      throw AppError.internal(`Erro ao excluir flashcard: ${errorMessage}`);
    }
  }

  async toggleArchiveFlashcard(flashcardId: string, userId: string): Promise<Flashcard> {
    try {
      const flashcardRef = this.db.collection(FLASHCARDS_COLLECTION).doc(flashcardId);
      const flashcardDoc = await flashcardRef.get();

      if (!flashcardDoc.exists) {
        throw AppError.notFound(`Flashcard com ID ${flashcardId} não encontrado`);
      }

      const flashcard = flashcardDoc.data() as Flashcard;

      if (flashcard.userId !== userId) {
        throw AppError.forbidden('Usuário não tem permissão para arquivar este flashcard');
      }

      const newStatus = flashcard.status === FlashcardStatus.ARCHIVED 
        ? FlashcardStatus.LEARNING 
        : FlashcardStatus.ARCHIVED;

      const updateData = {
        status: newStatus,
        updatedAt: Timestamp.now(),
      };

      await flashcardRef.update(updateData);

      const updatedFlashcard = {
        ...flashcard,
        ...updateData,
      } as Flashcard;

      await this.updateUserFlashcardStatistics(userId, flashcard.deckId);

      logger.info(`Flashcard ${newStatus === FlashcardStatus.ARCHIVED ? 'arquivado' : 'desarquivado'}: ${flashcardId}`);
      return updatedFlashcard;
    } catch (error: unknown) {
      if (error instanceof AppError) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      throw AppError.internal(`Erro ao arquivar/desarquivar flashcard: ${errorMessage}`);
    }
  }

  /**
   * Registra uma revisão de flashcard usando FSRS
   */
  async recordFlashcardReview(
    userId: string,
    flashcardId: string,
    reviewQuality: ReviewQuality,
    reviewTimeMs?: number,
  ): Promise<{ updatedFlashcard: Flashcard; interaction: FlashcardUserInteraction }> {
    try {
      // Busca o flashcard
      const flashcardRef = this.db.collection(FLASHCARDS_COLLECTION).doc(flashcardId);
      const flashcardDoc = await flashcardRef.get();

      if (!flashcardDoc.exists) {
        throw AppError.notFound(`Flashcard com ID ${flashcardId} não encontrado`);
      }

      const currentFlashcard = flashcardDoc.data() as Flashcard;

      // Verifica se o usuário tem permissão para revisar este flashcard
      // Isso é feito verificando se o usuário tem acesso ao deck do flashcard
      await this.validateDeckExistsAndBelongsToUser(currentFlashcard.deckId, userId);

      // Converte ReviewQuality para FSRSGrade
      const fsrsGrade = mapReviewQualityToFSRSGrade(reviewQuality);

      // Processa a revisão no FSRS usando o ID correto do flashcard
      const updatedFSRSCard = await this.fsrsService.reviewCard(
        currentFlashcard.id,  // Usar o ID do flashcard da coleção flashcards
        userId,
        fsrsGrade,
        reviewTimeMs
      );

      // Salvar no histórico de revisões completadas
      await this.saveFlashcardReviewHistory(userId, currentFlashcard.id, fsrsGrade, reviewTimeMs, updatedFSRSCard);

      // Atualiza o flashcard com os dados do FSRS
      const flashcardData = this.convertFSRSToFlashcardData(updatedFSRSCard);
      const now = Timestamp.now();

      const updateData = {
        ...flashcardData,
        lastReviewedAt: now,
        updatedAt: now,
      };

      await flashcardRef.update(updateData);

      // Gera ID da revisão
      const reviewId = await generateReviewId(userId, flashcardId);

      // Cria o registro de interação
      const interaction: FlashcardUserInteraction = {
        id: reviewId,
        userId,
        flashcardId,
        reviewQuality,
        studyTime: reviewTimeMs || 0,  // Usando studyTime em vez de reviewTime
        reviewedAt: now,
        createdAt: now,
        updatedAt: now,
        deckId: currentFlashcard.deckId,
        srsInterval: flashcardData.srsInterval,
        srsEaseFactor: flashcardData.srsEaseFactor,
        srsRepetitions: flashcardData.srsRepetitions,
        srsLapses: flashcardData.srsLapses,
        nextReviewAt: flashcardData.nextReviewAt,
        previousInterval: currentFlashcard.srsInterval,
        previousEaseFactor: currentFlashcard.srsEaseFactor,
        previousStatus: currentFlashcard.status,
        newStatus: flashcardData.status
      };

      await this.db.collection(USER_INTERACTIONS_COLLECTION).doc(interaction.id).set(interaction);

      // Atualiza estatísticas
      await this.updateUserFlashcardStatistics(userId, currentFlashcard.deckId);

      logger.info(`Revisão registrada para flashcard ${flashcardId}`, {
        userId,
        reviewQuality,
        fsrsGrade,
        newDue: updatedFSRSCard.due,
        newState: updatedFSRSCard.state
      });

      return {
        updatedFlashcard: {
          ...currentFlashcard,
          ...updateData,
        } as Flashcard,
        interaction,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw AppError.internal(`Erro ao registrar revisão: ${error}`);
    }
  }

  /**
   * Busca flashcards devido para revisão usando FSRS
   */
  async getDueFlashcardsForUser(userId: string, limit: number = 200): Promise<Flashcard[]> {
    try {
      const fsrsCards = await this.fsrsService.getDueCards(userId, limit);
      
      if (fsrsCards.length === 0) {
        return [];
      }

      const flashcardIds = fsrsCards.map(card => card.contentId);
      
      // ✅ CORREÇÃO: Processar IDs em lotes menores para evitar consultas __name__ IN excessivas
      const flashcards: Flashcard[] = [];
      const batchSize = 10; // Firestore permite máximo 10 itens em 'in'
      
      for (let i = 0; i < flashcardIds.length; i += batchSize) {
        const batch = flashcardIds.slice(i, i + batchSize);
        if (batch.length === 0) continue;
        
        const flashcardsQuery = this.db
          .collection(FLASHCARDS_COLLECTION)
          .where('__name__', 'in', batch);

        const flashcardsSnapshot = await flashcardsQuery.get();
       
         // Filtra flashcards verificando acesso aos decks
         for (const doc of flashcardsSnapshot.docs) {
           const flashcard = { id: doc.id, ...doc.data() } as Flashcard;
           try {
             await this.validateDeckExistsAndBelongsToUser(flashcard.deckId, userId);
             flashcards.push(flashcard);
           } catch (error) {
             // Usuário não tem acesso a este deck, pula o flashcard
           }
         }
       } // Fecha o loop for dos lotes

      // Ordena pelos cards FSRS (ordem de prioridade)
      const orderedFlashcards = fsrsCards
        .map(fsrsCard => flashcards.find(flashcard => flashcard.id === fsrsCard.contentId))
        .filter(Boolean) as Flashcard[];

      return orderedFlashcards;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      throw AppError.internal(`Erro ao buscar flashcards devido: ${errorMessage}`);
    }
  }

  /**
   * Migra flashcards existentes SM-2 para FSRS
   */
  async migrateFlashcardToFSRS(flashcardId: string, userId: string): Promise<void> {
    try {
      const flashcardRef = this.db.collection(FLASHCARDS_COLLECTION).doc(flashcardId);
      const flashcardDoc = await flashcardRef.get();

      if (!flashcardDoc.exists) {
        throw AppError.notFound(`Flashcard com ID ${flashcardId} não encontrado`);
      }

      const flashcard = flashcardDoc.data() as Flashcard;

      // Verifica se o usuário tem permissão para migrar este flashcard
      // Isso é feito verificando se o usuário tem acesso ao deck do flashcard
      await this.validateDeckExistsAndBelongsToUser(flashcard.deckId, userId);

      // Verifica se já existe card FSRS
      const existingFSRSCard = await this.fsrsService.getCardByFlashcardId(flashcardId, userId);
      if (existingFSRSCard) {
        logger.info(`Flashcard ${flashcardId} já migrado para FSRS`);
        return;
      }

      // Converte dados SM-2 para FSRS
      const fsrsCard = this.fsrsService.convertSM2ToFSRS(
        flashcardId,
        userId,
        flashcard.deckId,
        {
          interval: flashcard.srsInterval,
          easeFactor: flashcard.srsEaseFactor,
          repetitions: flashcard.srsRepetitions,
          lapses: flashcard.srsLapses,
          lastReviewedAt: flashcard.lastReviewedAt?.toDate(),
        }
      );

      // Salva card FSRS
      await this.fsrsService.saveCard(fsrsCard);

      logger.info(`Flashcard ${flashcardId} migrado de SM-2 para FSRS`);
    } catch (error: unknown) {
      if (error instanceof AppError) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      throw AppError.internal(`Erro ao migrar flashcard: ${errorMessage}`);
    }
  }

  /**
   * Cria um novo card FSRS quando um flashcard é criado
   */
  async initializeFSRSCard(flashcardId: string, userId: string, deckId: string): Promise<void> {
    try {
      // Verifica se já existe card FSRS
      const existingFSRSCard = await this.fsrsService.getCardByFlashcardId(flashcardId, userId);
      if (existingFSRSCard) {
        return;
      }

      // Cria novo card FSRS
      const fsrsCard = this.fsrsService.createNewCard(flashcardId, userId, deckId);
      await this.fsrsService.saveCard(fsrsCard);

      logger.info(`Card FSRS inicializado para flashcard ${flashcardId}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      throw AppError.internal(`Erro ao inicializar card FSRS: ${errorMessage}`);
    }
  }

  /**
   * Salva o histórico de revisões de flashcard na coleção fsrsReviewHistory
   */
  private async saveFlashcardReviewHistory(
    userId: string,
    flashcardId: string,
    grade: FSRSGrade,
    reviewTimeMs: number | undefined,
    updatedCard: FSRSCard
  ): Promise<void> {
    try {
      const reviewHistory = {
        userId,
        contentType: 'FLASHCARD',
        contentId: flashcardId,
        grade,
        reviewTimeMs: reviewTimeMs ?? null,
        reviewedAt: Timestamp.now(),
        
        // Dados do card FSRS após a revisão
        stability: updatedCard.stability,
        difficulty: updatedCard.difficulty,
        due: updatedCard.due instanceof Date ? Timestamp.fromDate(updatedCard.due) : updatedCard.due,
        reps: updatedCard.reps,
        lapses: updatedCard.lapses,
        state: updatedCard.state,
        
        createdAt: Timestamp.now()
      };
      
      await this.db.collection('fsrsReviewHistory').add(reviewHistory);
      logger.debug(`Histórico de revisão de flashcard salvo para ${flashcardId}`);
    } catch (error) {
      logger.error('Erro ao salvar histórico de revisão de flashcard:', error);
      // Não propagar o erro para não quebrar o fluxo principal
    }
  }

  /**
   * Obtém estatísticas de performance FSRS do usuário
   */
  async getFSRSStats(userId: string): Promise<{
    totalCards: number;
    dueCards: number;
    newCards: number;
    learningCards: number;
    reviewCards: number;
    averageStability: number;
    averageDifficulty: number;
    retentionRate: number;
  }> {
    try {
      logger.info(`[getFSRSStats] Iniciando busca de estatísticas para usuário: ${userId}`);
      
      // Validar se o usuário existe
      await this.validateUserExists(userId);
      
      // Buscar todas as cartas FSRS do usuário
      let allCardsSnap;
      try {
        allCardsSnap = await this.db.collection('fsrs_cards')
          .where('userId', '==', userId)
          .get();
      } catch (dbError) {
        logger.error(`[getFSRSStats] Erro ao buscar cartas FSRS:`, dbError);
        throw AppError.internal(`Erro ao acessar banco de dados: ${dbError instanceof Error ? dbError.message : 'Erro desconhecido'}`);
      }
        
      logger.info(`[getFSRSStats] Encontradas ${allCardsSnap.size} cartas FSRS para o usuário`);

      const cards = allCardsSnap.docs.map(doc => {
        try {
          return doc.data() as FSRSCard;
        } catch (mapError) {
          logger.warn(`[getFSRSStats] Erro ao mapear carta ${doc.id}:`, mapError);
          return null;
        }
      }).filter(Boolean) as FSRSCard[];
      
      logger.info(`[getFSRSStats] Cartas mapeadas: ${cards.length}`);
      
      const now = Timestamp.now();

      // Contar cartas vencidas
      const dueCards = cards.filter(card => {
        try {
          if (!card.due) return false;
          
          // Verificar se card.due é um Timestamp do Firestore
          if (card.due && typeof card.due === 'object' && 'toDate' in card.due) {
            return card.due.toMillis() <= now.toMillis();
          }
          
          // Verificar se card.due é um objeto Date
          if (card.due instanceof Date) {
            return Timestamp.fromDate(card.due).toMillis() <= now.toMillis();
          }
          
          // Se for uma string de data, tentar converter
          if (typeof card.due === 'string') {
            const dateObj = new Date(card.due);
            if (!isNaN(dateObj.getTime())) {
              return Timestamp.fromDate(dateObj).toMillis() <= now.toMillis();
            }
          }
          
          logger.warn(`[getFSRSStats] Formato de data inválido para carta ${card.id}:`, typeof card.due, card.due);
          return false;
        } catch (dateError) {
          logger.warn(`[getFSRSStats] Erro ao processar data da carta ${card.id}:`, dateError);
          return false;
        }
      }).length;
      logger.info(`[getFSRSStats] Cartas vencidas: ${dueCards}`);

      const totalCards = cards.length;
      const newCards = cards.filter(card => card.state === FSRSState.NEW).length;
      const learningCards = cards.filter(card =>
        card.state === FSRSState.LEARNING || card.state === FSRSState.RELEARNING
      ).length;
      const reviewCards = cards.filter(card => card.state === FSRSState.REVIEW).length;
      logger.info(`[getFSRSStats] Contadores - Total: ${totalCards}, Novas: ${newCards}, Aprendendo: ${learningCards}, Revisão: ${reviewCards}`);

      // Calcular médias com validação
      const averageStability = totalCards > 0
        ? cards.reduce((sum, c) => sum + (typeof c.stability === 'number' ? c.stability : 0), 0) / totalCards
        : 0;
      logger.info(`[getFSRSStats] Estabilidade média calculada: ${averageStability}`);
      
      const averageDifficulty = totalCards > 0
        ? cards.reduce((sum, c) => sum + (typeof c.difficulty === 'number' ? c.difficulty : 0), 0) / totalCards
        : 0;
      logger.info(`[getFSRSStats] Dificuldade média calculada: ${averageDifficulty}`);

      // Calcular retenção baseada nos logs de revisão dos últimos 30 dias
      const thirtyDaysAgo = Timestamp.fromDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
      logger.info(`[getFSRSStats] Buscando logs de revisão desde: ${thirtyDaysAgo.toDate()}`);
      
      let recentLogsSnap;
      try {
        recentLogsSnap = await this.db.collection('fsrs_review_logs')
          .where('userId', '==', userId)
          .where('reviewed_at', '>=', thirtyDaysAgo)
          .get();
      } catch (logsError) {
        logger.warn(`[getFSRSStats] Erro ao buscar logs de revisão:`, logsError);
        // Continuar sem logs se houver erro
        recentLogsSnap = { size: 0, docs: [] } as any;
      }
      
      logger.info(`[getFSRSStats] Encontrados ${recentLogsSnap.size} logs de revisão`);

      const retentionRate = recentLogsSnap.size > 0
        ? (recentLogsSnap.docs.filter(doc => {
            try {
              return doc.data().grade >= FSRSGrade.GOOD;
            } catch (gradeError) {
              logger.warn(`[getFSRSStats] Erro ao processar grade do log ${doc.id}:`, gradeError);
              return false;
            }
          }).length / recentLogsSnap.size) * 100
        : 0;
      logger.info(`[getFSRSStats] Taxa de retenção calculada: ${retentionRate}%`);

      const result = {
        totalCards,
        dueCards,
        newCards,
        learningCards,
        reviewCards,
        averageStability,
        averageDifficulty,
        retentionRate
      };
      
      logger.info(`[getFSRSStats] Resultado final:`, result);
      return result;
    } catch (error: unknown) {
      logger.error(`[getFSRSStats] Erro completo:`, error);
      if (error instanceof AppError) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const stack = error instanceof Error ? error.stack : 'Stack não disponível';
      logger.error(`[getFSRSStats] Stack trace:`, stack);
      throw AppError.internal(`Erro ao obter estatísticas FSRS: ${errorMessage}`);
    }
  }

  private async updateDeckFlashcardCount(deckId: string, increment: number): Promise<void> {
    const deckRef = this.db.collection(DECKS_COLLECTION).doc(deckId);
    await deckRef.update({
      flashcardCount: FieldValue.increment(increment),
      updatedAt: Timestamp.now(),
    });
  }
}