import { firestore } from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { FSRSGrade, FSRSCard } from '../../../srs/services/FSRSService';
import { IFSRSService } from '../../../srs/interfaces/IFSRSService';
import { ErrorNotebookEntry, CreateErrorEntryPayload, ErrorNoteDifficulty } from '../types';
import { AppError } from '../../../../shared/errors/AppError';
import { logger } from '../../../../utils/logger';
import { v4 as uuidv4 } from 'uuid';

const ERROR_NOTEBOOK_ENTRIES_COLLECTION = 'errorNotebookEntries';

export class ErrorNotebookFSRSService {
  private db: firestore.Firestore;
  private fsrsService: IFSRSService;

  constructor(
    db: firestore.Firestore,
    fsrsService: IFSRSService
  ) {
    this.db = db;
    this.fsrsService = fsrsService;
  }

  /**
   * Criar entrada no caderno de erros com FSRS
   */
  async createErrorEntry(payload: CreateErrorEntryPayload): Promise<ErrorNotebookEntry> {
    try {
      // Validações
      if (!payload.userId || !payload.questionId) {
        throw AppError.badRequest('ID do usuário e questão são obrigatórios');
      }

      // Criar FSRSCard para a entrada
      const entryId = uuidv4();
      const fsrsCard = this.fsrsService.createNewCard(entryId, payload.userId, 'error-notebook');
      await this.fsrsService.saveCard(fsrsCard);

      // Criar entrada usando os campos corretos da interface ErrorNotebookEntry
      const now = Timestamp.now();
      const errorEntry: ErrorNotebookEntry = {
        id: entryId,
        userId: payload.userId,
        questionId: payload.questionId,
        userNote: payload.userNote || '',
        userExplanation: payload.userExplanation || '',
        keyPoints: payload.keyPoints || [],
        tags: payload.tags || [],
        questionStatement: '', // Será preenchido via questionId
        correctAnswer: '', // Será preenchido via questionId  
        userOriginalAnswer: '',
        questionSubject: '',
        isInReviewSystem: true,
        fsrsCardId: fsrsCard.id,
        difficulty: payload.difficulty || ErrorNoteDifficulty.MEDIUM,
        confidence: payload.confidence || 3,
        // notebookId não existe no payload atual
        createdAt: now,
        updatedAt: now,
      };

      // Salvar entrada
      await this.db.collection(ERROR_NOTEBOOK_ENTRIES_COLLECTION).doc(entryId).set(errorEntry);

      logger.info(`Entrada de erro criada com FSRS: ${entryId}, usuário ${payload.userId}`);
      return errorEntry;
    } catch (error) {
      logger.error('Erro ao criar entrada no caderno de erros:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw AppError.internal('Erro ao criar entrada no caderno de erros');
    }
  }

  /**
   * Registrar revisão de entrada do caderno de erros
   */
  async recordEntryReview(
    entryId: string, 
    userId: string, 
    grade: FSRSGrade
  ): Promise<ErrorNotebookEntry> {
    try {
      // Buscar entrada
      const entryDoc = await this.db.collection(ERROR_NOTEBOOK_ENTRIES_COLLECTION).doc(entryId).get();
      if (!entryDoc.exists) {
        throw AppError.notFound('Entrada não encontrada');
      }

      const entry = entryDoc.data() as ErrorNotebookEntry;
      if (entry.userId !== userId) {
        throw AppError.forbidden('Usuário não autorizado');
      }

      // Aplicar FSRS
      const updatedCard = await this.fsrsService.reviewCard(entryId, userId, grade);

      // Salvar no histórico de revisões completadas
      await this.saveErrorNotebookReviewHistory(userId, entryId, grade, 0, updatedCard);

      // Atualizar entrada se necessário
      const updates: Partial<ErrorNotebookEntry> = {
        updatedAt: Timestamp.now(),
      };

      // Se foi marcado como "fácil", pode atualizar último review
      if (grade === FSRSGrade.EASY) {
        updates.lastReviewedAt = Timestamp.now();
      }

      await this.db.collection(ERROR_NOTEBOOK_ENTRIES_COLLECTION).doc(entryId).update(updates);

      const updatedEntry = { ...entry, ...updates };
      
      logger.info(`Revisão FSRS registrada para entrada ${entryId}, usuário ${userId}, grade ${grade}`);
      return updatedEntry;
    } catch (error) {
      logger.error('Erro ao registrar revisão de entrada:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw AppError.internal('Erro ao registrar revisão de entrada');
    }
  }

  /**
   * Obter entradas devidas para revisão
   */
  async getDueErrorEntries(userId: string, notebookId?: string, limit: number = 200): Promise<Array<{ entry: ErrorNotebookEntry; fsrsCard: FSRSCard }>> {
    try {
      // Buscar cards FSRS devidos
      const dueCards = await this.fsrsService.getDueCards(userId, limit);
      
      // Filtrar apenas entradas de caderno de erros
      const errorCards = dueCards.filter((card: FSRSCard) => card.deckId === 'error-notebook');
      
      // Buscar dados das entradas
      const entriesWithCards = await Promise.all(
        errorCards.map(async (card: FSRSCard) => {
          const entryDoc = await this.db.collection(ERROR_NOTEBOOK_ENTRIES_COLLECTION).doc(card.contentId).get();
          if (entryDoc.exists) {
            const entry = entryDoc.data() as ErrorNotebookEntry;
            // Filtrar por notebook se especificado
            if (!notebookId || entry.notebookId === notebookId) {
              return { entry, fsrsCard: card };
            }
          }
          return null;
        })
      );

      // Filtrar nulls
      const validEntriesWithCards = entriesWithCards.filter(item => item !== null) as Array<{ entry: ErrorNotebookEntry; fsrsCard: FSRSCard }>;

      logger.info(`${validEntriesWithCards.length} entradas de erro devidas encontradas para usuário ${userId}`);
      return validEntriesWithCards;
    } catch (error) {
      logger.error('Erro ao buscar entradas devidas:', error);
      throw AppError.internal('Erro ao buscar entradas devidas');
    }
  }

  /**
   * Obter estatísticas FSRS do caderno de erros
   */
  async getErrorNotebookFSRSStats(userId: string, notebookId?: string): Promise<{
    totalEntries: number;
    dueEntries: number;
    resolvedEntries: number;
  }> {
    try {
      // Buscar todos os cards de caderno de erros do usuário
      const allCards = await this.fsrsService.getDueCards(userId, 200); // ✅ MUDANÇA: Reduzido de 1000 para 200
      const errorCards = allCards.filter((card: FSRSCard) => card.deckId === 'error-notebook');
      
      // Se especificado notebook, filtrar por ele
      let relevantCards = errorCards;
      if (notebookId) {
        const entriesInNotebook = await Promise.all(
          errorCards.map(async (card: FSRSCard) => {
            const entryDoc = await this.db.collection(ERROR_NOTEBOOK_ENTRIES_COLLECTION).doc(card.contentId).get();
            if (entryDoc.exists) {
              const entry = entryDoc.data() as ErrorNotebookEntry;
              return entry.notebookId === notebookId ? card : null;
            }
            return null;
          })
        );
        relevantCards = entriesInNotebook.filter(card => card !== null) as FSRSCard[];
      }

      // Buscar entradas no sistema de revisão (equivalente às "resolvidas" no sistema antigo)
      let resolvedCount = 0;
      if (relevantCards.length > 0) {
        const entriesQuery = notebookId 
          ? this.db.collection(ERROR_NOTEBOOK_ENTRIES_COLLECTION)
              .where('userId', '==', userId)
              .where('notebookId', '==', notebookId)
              .where('isInReviewSystem', '==', true)
          : this.db.collection(ERROR_NOTEBOOK_ENTRIES_COLLECTION)
              .where('userId', '==', userId)
              .where('isInReviewSystem', '==', true);

        const resolvedSnapshot = await entriesQuery.get();
        resolvedCount = resolvedSnapshot.size;
      }

      const totalEntries = relevantCards.length;
      const dueEntries = relevantCards.filter((card: FSRSCard) => new Date(card.due) <= new Date()).length;

      return {
        totalEntries,
        dueEntries,
        resolvedEntries: resolvedCount,
      };
    } catch (error) {
      logger.error('Erro ao obter estatísticas FSRS do caderno de erros:', error);
      throw AppError.internal('Erro ao obter estatísticas FSRS do caderno de erros');
    }
  }

  /**
   * Salvar histórico de revisão de entrada do caderno de erros na coleção fsrsReviewHistory
   */
  private async saveErrorNotebookReviewHistory(
    userId: string,
    entryId: string,
    grade: FSRSGrade,
    reviewTimeMs: number,
    updatedCard: FSRSCard
  ): Promise<void> {
    try {
      const reviewHistory = {
        userId,
        contentType: 'ERROR_NOTEBOOK',
        contentId: entryId,
        grade,
        reviewTimeMs: reviewTimeMs || 0,
        reviewedAt: Timestamp.now(),
        
        // Dados do cartão FSRS após a revisão
        stability: updatedCard.stability,
        difficulty: updatedCard.difficulty,
        due: Timestamp.fromDate(new Date(updatedCard.due)),
        reps: updatedCard.reps,
        lapses: updatedCard.lapses,
        state: updatedCard.state
      };

      await this.db.collection('fsrsReviewHistory').add(reviewHistory);
      
      logger.info(`Histórico de revisão de entrada do caderno de erros salvo: ${entryId}, usuário ${userId}, grade ${grade}`);
    } catch (error) {
      logger.error('Erro ao salvar histórico de revisão de entrada do caderno de erros:', error);
      // Não propagar o erro para não interromper o fluxo principal
    }
  }
}