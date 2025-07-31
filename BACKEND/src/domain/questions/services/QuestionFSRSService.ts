import { firestore } from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { FSRSGrade, FSRSCard } from '../../srs/services/FSRSService';
import { IFSRSService } from '../../srs/interfaces/IFSRSService';
import { Question, QuestionResponse, CreateQuestionResponsePayload, LegacyReviewQuality, IQuestionService } from '../';
import { ReviewQuality } from '../types/enhanced';
import { AppError } from '../../../shared/errors/AppError';
import { logger } from '../../../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { generateQuestionResponseId } from '../../../utils/idGenerator';

const QUESTION_RESPONSES_COLLECTION = 'questionResponses';

export class QuestionFSRSService {
  private db: firestore.Firestore;
  private fsrsService: IFSRSService;
  private questionService: IQuestionService;

  constructor(
    db: firestore.Firestore,
    fsrsService: IFSRSService,
    questionService: IQuestionService
  ) {
    this.db = db;
    this.fsrsService = fsrsService;
    this.questionService = questionService;
  }

  /**
   * Adicionar questão às revisões FSRS (lazy creation)
   */
  async addQuestionToReviews(questionId: string, userId: string): Promise<FSRSCard> {
    try {
      // Verificar se a questão existe
      const question = await this.questionService.getQuestionById(questionId);
      if (!question) {
        throw AppError.notFound('Questão não encontrada');
      }

      // Verificar se já existe FSRSCard para esta questão
      const existingCard = await this.fsrsService.getCardByFlashcardId(questionId, userId);
      if (existingCard) {
        logger.info(`Questão ${questionId} já está nas revisões do usuário ${userId}`);
        return existingCard;
      }

      // Criar novo FSRSCard
      const fsrsCard = this.fsrsService.createNewCard(questionId, userId, 'questions');
      await this.fsrsService.saveCard(fsrsCard);
      
      logger.info(`Questão ${questionId} adicionada às revisões FSRS do usuário ${userId}`);
      return fsrsCard;
    } catch (error) {
      logger.error('Erro ao adicionar questão às revisões:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw AppError.internal('Erro ao adicionar questão às revisões');
    }
  }

  /**
   * Registrar resposta de questão com FSRS
   */
  async recordQuestionResponse(payload: CreateQuestionResponsePayload): Promise<QuestionResponse> {
    try {
      // Validações
      if (!payload.questionId || !payload.userId) {
        throw AppError.badRequest('ID da questão e usuário são obrigatórios');
      }

      // Verificar se a questão existe
      const question = await this.questionService.getQuestionById(payload.questionId);
      if (!question) {
        throw AppError.notFound('Questão não encontrada');
      }

      // Garantir que a questão está nas revisões FSRS
      let fsrsCard = await this.fsrsService.getCardByFlashcardId(payload.questionId, payload.userId);
      if (!fsrsCard) {
        fsrsCard = await this.addQuestionToReviews(payload.questionId, payload.userId);
      }

      // Determinar qualidade da revisão (usar LegacyReviewQuality para compatibilidade)
      const legacyReviewQuality = payload.reviewQuality || (payload.isCorrectOnFirstAttempt ? LegacyReviewQuality.GOOD : LegacyReviewQuality.AGAIN);

      // Converter LegacyReviewQuality para ReviewQuality e depois para FSRSGrade
      const reviewQuality = this.convertLegacyToReviewQuality(legacyReviewQuality);
      const fsrsGrade = this.convertReviewQualityToFSRSGrade(reviewQuality);

      // Aplicar FSRS
      const updatedCard = await this.fsrsService.reviewCard(
        payload.questionId,
        payload.userId,
        fsrsGrade,
        (payload.responseTimeSeconds || 0) * 1000 // converter para ms
      );

      // Salvar no histórico de revisões completadas
      await this.saveQuestionReviewHistory(
        payload.userId,
        payload.questionId,
        fsrsGrade,
        (payload.responseTimeSeconds || 0) * 1000,
        updatedCard
      );

      // Criar resposta da questão
      const responseId = await generateQuestionResponseId(payload.userId, payload.questionId);
      const now = Timestamp.now();

      const questionResponse: QuestionResponse = {
        id: responseId,
        userId: payload.userId,
        questionId: payload.questionId,
        questionListId: payload.questionListId || null,
        selectedOptionId: payload.selectedOptionId || null,
        selectedAlternativeId: payload.selectedAlternativeId || null,
        isCorrectOnFirstAttempt: payload.isCorrectOnFirstAttempt,
        answeredAt: now,
        responseTimeSeconds: payload.responseTimeSeconds || 0,
        fsrsCardId: updatedCard.id,
        lastReviewQuality: legacyReviewQuality,
        isInReviewSystem: true,
        createdAt: now,
        updatedAt: now,
      };

      // Salvar resposta
      await this.db.collection(QUESTION_RESPONSES_COLLECTION).doc(responseId).set(questionResponse);

      logger.info(`Resposta FSRS registrada: questão ${payload.questionId}, usuário ${payload.userId}, grade ${fsrsGrade}`);
      
      return questionResponse;
    } catch (error) {
      logger.error('Erro ao registrar resposta de questão:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw AppError.internal('Erro ao registrar resposta de questão');
    }
  }

  /**
   * Obter questões devidas para revisão
   */
  async getDueQuestions(userId: string, limit: number = 200): Promise<Array<{ question: Question; fsrsCard: FSRSCard }>> {
    try {
      // Buscar cards FSRS devidos
      const dueCards = await this.fsrsService.getDueCards(userId, limit);
      
      // Filtrar apenas questões (por deckId = 'questions')
      const questionCards = dueCards.filter(card => card.deckId === 'questions');
      
      // Buscar dados das questões
      const questionsWithCards = await Promise.all(
        questionCards.map(async (card: FSRSCard) => {
          const question = await this.questionService.getQuestionById(card.contentId);
          if (question) {
            return { question, fsrsCard: card };
          }
          return null;
        })
      );

      // Filtrar nulls
      const validQuestionsWithCards = questionsWithCards.filter(item => item !== null) as Array<{ question: Question; fsrsCard: FSRSCard }>;

      logger.info(`${validQuestionsWithCards.length} questões devidas encontradas para usuário ${userId}`);
      return validQuestionsWithCards;
    } catch (error) {
      logger.error('Erro ao buscar questões devidas:', error);
      throw AppError.internal('Erro ao buscar questões devidas');
    }
  }

  /**
   * Obter estatísticas FSRS de questões do usuário
   */
  async getQuestionFSRSStats(userId: string): Promise<{
    totalQuestions: number;
    dueQuestions: number;
  }> {
    try {
      // Buscar todos os cards de questões do usuário
      const allCards = await this.fsrsService.getDueCards(userId, 200); // ✅ MUDANÇA: Reduzido de 1000 para 200
      const questionCards = allCards.filter((card: FSRSCard) => card.deckId === 'questions');
      
      const totalQuestions = questionCards.length;
      const dueQuestions = questionCards.filter((card: FSRSCard) => new Date(card.due) <= new Date()).length;

      return {
        totalQuestions,
        dueQuestions,
      };
    } catch (error) {
      logger.error('Erro ao obter estatísticas FSRS de questões:', error);
      throw AppError.internal('Erro ao obter estatísticas FSRS de questões');
    }
  }

  /**
   * Converter LegacyReviewQuality para ReviewQuality
   */
  private convertLegacyToReviewQuality(legacy: LegacyReviewQuality): ReviewQuality {
    switch (legacy) {
      case LegacyReviewQuality.AGAIN:
        return ReviewQuality.AGAIN;
      case LegacyReviewQuality.HARD:
        return ReviewQuality.HARD;
      case LegacyReviewQuality.GOOD:
        return ReviewQuality.GOOD;
      case LegacyReviewQuality.EASY:
        return ReviewQuality.EASY;
      default:
        return ReviewQuality.GOOD;
    }
  }

  /**
   * Converter ReviewQuality para FSRSGrade
   */
  private convertReviewQualityToFSRSGrade(quality: ReviewQuality): FSRSGrade {
    switch (quality) {
      case ReviewQuality.AGAIN:
        return FSRSGrade.AGAIN;
      case ReviewQuality.HARD:
        return FSRSGrade.HARD;
      case ReviewQuality.GOOD:
        return FSRSGrade.GOOD;
      case ReviewQuality.EASY:
        return FSRSGrade.EASY;
      default:
        return FSRSGrade.GOOD;
    }
  }

  /**
   * Salvar histórico de revisão de questão na coleção fsrsReviewHistory
   */
  private async saveQuestionReviewHistory(
    userId: string,
    questionId: string,
    grade: FSRSGrade,
    reviewTimeMs: number,
    updatedCard: FSRSCard
  ): Promise<void> {
    try {
      const reviewHistory = {
        userId,
        contentType: 'QUESTION',
        contentId: questionId,
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
      
      logger.info(`Histórico de revisão de questão salvo: ${questionId}, usuário ${userId}, grade ${grade}`);
    } catch (error) {
      logger.error('Erro ao salvar histórico de revisão de questão:', error);
      // Não propagar o erro para não interromper o fluxo principal
    }
  }
}