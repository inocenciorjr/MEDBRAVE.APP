import { FSRSCard, FSRSGrade, FSRSParameters, SchedulingCards } from '../services/FSRSService';

export interface IFSRSService {
  /**
   * Calcula os próximos agendamentos para um card baseado na nota dada
   */
  schedule(card: FSRSCard, now: Date, grade: FSRSGrade): SchedulingCards;

  /**
   * Cria um novo card FSRS a partir de um conteúdo
   */
  createNewCard(contentId: string, userId: string, deckId: string): FSRSCard;

  /**
   * Salva card FSRS no Firestore
   */
  saveCard(card: FSRSCard): Promise<void>;

  /**
   * Busca card FSRS por content ID
   */
  getCardByFlashcardId(contentId: string, userId: string): Promise<FSRSCard | null>;

  /**
   * Busca cards devido para revisão
   */
  getDueCards(userId: string, limit?: number): Promise<FSRSCard[]>;

  /**
   * Processa uma revisão de conteúdo
   */
  reviewCard(
    contentId: string, 
    userId: string, 
    grade: FSRSGrade,
    reviewTime?: number
  ): Promise<FSRSCard>;

  /**
   * Otimiza parâmetros FSRS com base no histórico do usuário
   */
  optimizeParameters(userId: string): Promise<FSRSParameters>;

  /**
   * Converte dados SM-2 existentes para FSRS
   */
  convertSM2ToFSRS(
    contentId: string,
    userId: string,
    deckId: string,
    srsData: {
      interval: number;
      easeFactor: number;
      repetitions: number;
      lapses: number;
      lastReviewedAt?: Date;
    }
  ): FSRSCard;
}