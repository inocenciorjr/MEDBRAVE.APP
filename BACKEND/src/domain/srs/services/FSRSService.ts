import { firestore } from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import logger from '../../../utils/logger';
import { AppError } from '../../../shared/errors/AppError';

/**
 * FSRS (Free Spaced Repetition Scheduler) Service
 * Implementação baseada no algoritmo oficial: https://github.com/open-spaced-repetition/fsrs4anki
 * 
 * FSRS é um algoritmo moderno de repetição espaçada que usa machine learning
 * para otimizar os intervalos de revisão baseado em padrões reais de memória.
 */

// Tipos FSRS
export enum FSRSGrade {
  AGAIN = 1,    // Falha - esqueceu completamente
  HARD = 2,     // Difícil - lembrou com muita dificuldade  
  GOOD = 3,     // Bom - lembrou com alguma dificuldade
  EASY = 4      // Fácil - lembrou facilmente
}

export enum FSRSState {
  NEW = 'NEW',
  LEARNING = 'LEARNING', 
  REVIEW = 'REVIEW',
  RELEARNING = 'RELEARNING'
}

export interface FSRSCard {
  id: string;
  userId: string;
  contentId: string; // flashcard ID
  deckId: string;
  
  // Desnormalização para otimização de Firestore
  deckName?: string;    // Nome do deck (evita consulta adicional)
  filterName?: string;  // Nome do filtro (evita consulta adicional)
  
  // Parâmetros FSRS
  due: Date;
  stability: number;    // S - quão estável é a memória
  difficulty: number;   // D - quão difícil é o item (0-10)
  elapsed_days: number; // dias desde última revisão
  scheduled_days: number; // dias agendados para próxima revisão
  reps: number;         // número de repetições
  lapses: number;       // número de lapsos/esquecimentos
  state: FSRSState;     // estado atual do card
  
  // Timestamps
  last_review: Date | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface FSRSReviewLog {
  id: string;
  cardId: string;
  userId: string;
  
  // Dados da revisão
  grade: FSRSGrade;
  state: FSRSState;
  due: Date;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  last_elapsed_days: number;
  scheduled_days: number;
  review_time: number; // milissegundos gastos na revisão
  
  // Timestamp
  reviewed_at: Date;
  createdAt: Timestamp;
}

export interface FSRSParameters {
  // 17 parâmetros do FSRS v4.5
  request_retention: number;  // retenção alvo (padrão: 0.9)
  maximum_interval: number;   // intervalo máximo em dias (padrão: 36500)
  w: number[];               // 17 pesos do algoritmo
}

export interface SchedulingInfo {
  card: FSRSCard;
  review_log: FSRSReviewLog;
}

export interface SchedulingCards {
  again: SchedulingInfo;
  hard: SchedulingInfo;
  good: SchedulingInfo;
  easy: SchedulingInfo;
}

export class FSRSService {
  private db: firestore.Firestore;
  
  // Parâmetros FSRS ajustados para estudos médicos (intervalos mais curtos)
  private defaultParameters: FSRSParameters = {
    request_retention: 0.85, // Reduzido para forçar revisões mais frequentes
    maximum_interval: 90,    // Máximo 3 meses (era 100 anos!)
    w: [
      8.0,    // w[0] - Estabilidade inicial EASY (7-10 dias)
      1.25,   // w[1] - Estabilidade inicial HARD (1 dia após multiplicador 0.8)
      3.5,    // w[2] - Estabilidade inicial GOOD (3-4 dias)
      0.1,    // w[3] - Estabilidade inicial AGAIN (0 dias)
      6.0,    // w[4] - Dificuldade inicial (era 7.21, reduzido)
      0.3,    // w[5] - Fator dificuldade por grade (era 0.53, reduzido)
      0.8,    // w[6] - Delta dificuldade (era 1.07, reduzido)
      0.02,   // w[7] - Fator decay (era 0.02, mantido)
      1.2,    // w[8] - Fator estabilidade (era 1.62, reduzido)
      0.1,    // w[9] - Expoente estabilidade (era 0.15, reduzido)
      0.8,    // w[10] - Fator retenção (era 1.08, reduzido)
      1.5,    // w[11] - Estabilidade após falha (era 1.98, reduzido)
      0.08,   // w[12] - Expoente dificuldade falha (era 0.10, reduzido)
      0.25,   // w[13] - Expoente estabilidade falha (era 0.30, reduzido)
      1.8,    // w[14] - Fator repetições falha (era 2.20, reduzido)
      0.2,    // w[15] - Fator mínimo (era 0.24, reduzido)
      2.0     // w[16] - Fator máximo (era 2.95, reduzido)
    ]
  };

  constructor(firebaseFirestore: firestore.Firestore) {
    this.db = firebaseFirestore;
  }

  /**
   * Calcula os próximos agendamentos para um card baseado na nota dada
   */
  public schedule(card: FSRSCard, now: Date, _grade?: FSRSGrade): SchedulingCards {
    const scheduling_cards: SchedulingCards = {} as SchedulingCards;
    
    // Calcula para todas as 4 opções possíveis
    scheduling_cards.again = this.scheduleForgetting(card, now);
    scheduling_cards.hard = this.scheduleHard(card, now);
    scheduling_cards.good = this.scheduleGood(card, now);
    scheduling_cards.easy = this.scheduleEasy(card, now);

    return scheduling_cards;
  }

  /**
   * Agenda um card que foi esquecido (AGAIN)
   */
  private scheduleForgetting(card: FSRSCard, now: Date): SchedulingInfo {
    const new_card = { ...card };
    new_card.due = this.addDays(now, 0);
    new_card.stability = this.calculateStabilityAfterFailure(card);
    new_card.difficulty = this.calculateDifficultyAfterFailure(card);
    new_card.elapsed_days = this.dateDiff(card.last_review || new Date(card.createdAt.toDate()), now);
    new_card.scheduled_days = 0;
    new_card.reps = card.reps;
    new_card.lapses = card.lapses + 1;
    new_card.state = FSRSState.RELEARNING;
    new_card.last_review = now;

    const review_log: FSRSReviewLog = {
      id: `${card.userId}_${card.id}_${now.getTime()}`,
      cardId: card.id,
      userId: card.userId,
      grade: FSRSGrade.AGAIN,
      state: card.state,
      due: card.due,
      stability: card.stability,
      difficulty: card.difficulty,
      elapsed_days: new_card.elapsed_days,
      last_elapsed_days: card.elapsed_days,
      scheduled_days: card.scheduled_days,
      review_time: 0,
      reviewed_at: now,
      createdAt: Timestamp.now()
    };

    return { card: new_card, review_log };
  }

  /**
   * Agenda um card como difícil (HARD)
   */
  private scheduleHard(card: FSRSCard, now: Date): SchedulingInfo {
    const new_card = { ...card };
    const elapsed_days = this.dateDiff(card.last_review || new Date(card.createdAt.toDate()), now);
    
    new_card.stability = this.calculateStabilityAfterSuccess(card, elapsed_days, FSRSGrade.HARD);
    new_card.difficulty = this.calculateDifficultyAfterSuccess(card, FSRSGrade.HARD);
    
    const interval = Math.max(1, Math.min(30, Math.round(new_card.stability * 0.5))); // HARD reduz intervalo muito mais agressivamente, máx 30 dias
    new_card.due = this.addDays(now, interval);
    new_card.scheduled_days = interval;
    new_card.elapsed_days = elapsed_days;
    new_card.reps = card.reps + 1;
    new_card.lapses = card.lapses;
    new_card.state = card.state === FSRSState.NEW ? FSRSState.LEARNING : FSRSState.REVIEW;
    new_card.last_review = now;

    const review_log: FSRSReviewLog = {
      id: `${card.userId}_${card.id}_${now.getTime()}`,
      cardId: card.id,
      userId: card.userId,
      grade: FSRSGrade.HARD,
      state: card.state,
      due: card.due,
      stability: card.stability,
      difficulty: card.difficulty,
      elapsed_days: elapsed_days,
      last_elapsed_days: card.elapsed_days,
      scheduled_days: card.scheduled_days,
      review_time: 0,
      reviewed_at: now,
      createdAt: Timestamp.now()
    };

    return { card: new_card, review_log };
  }

  /**
   * Agenda um card como bom (GOOD)
   */
  private scheduleGood(card: FSRSCard, now: Date): SchedulingInfo {
    const new_card = { ...card };
    const elapsed_days = this.dateDiff(card.last_review || new Date(card.createdAt.toDate()), now);
    
    new_card.stability = this.calculateStabilityAfterSuccess(card, elapsed_days, FSRSGrade.GOOD);
    new_card.difficulty = this.calculateDifficultyAfterSuccess(card, FSRSGrade.GOOD);
    
    const interval = Math.max(1, Math.min(30, Math.round(new_card.stability * 0.9))); // GOOD com intervalo ligeiramente reduzido, máx 30 dias
    new_card.due = this.addDays(now, interval);
    new_card.scheduled_days = interval;
    new_card.elapsed_days = elapsed_days;
    new_card.reps = card.reps + 1;
    new_card.lapses = card.lapses;
    new_card.state = card.state === FSRSState.NEW ? FSRSState.LEARNING : FSRSState.REVIEW;
    new_card.last_review = now;

    const review_log: FSRSReviewLog = {
      id: `${card.userId}_${card.id}_${now.getTime()}`,
      cardId: card.id,
      userId: card.userId,
      grade: FSRSGrade.GOOD,
      state: card.state,
      due: card.due,
      stability: card.stability,
      difficulty: card.difficulty,
      elapsed_days: elapsed_days,
      last_elapsed_days: card.elapsed_days,
      scheduled_days: card.scheduled_days,
      review_time: 0,
      reviewed_at: now,
      createdAt: Timestamp.now()
    };

    return { card: new_card, review_log };
  }

  /**
   * Agenda um card como fácil (EASY)
   */
  private scheduleEasy(card: FSRSCard, now: Date): SchedulingInfo {
    const new_card = { ...card };
    const elapsed_days = this.dateDiff(card.last_review || new Date(card.createdAt.toDate()), now);
    
    new_card.stability = this.calculateStabilityAfterSuccess(card, elapsed_days, FSRSGrade.EASY);
    new_card.difficulty = this.calculateDifficultyAfterSuccess(card, FSRSGrade.EASY);
    
    const interval = Math.max(1, Math.min(30, Math.round(new_card.stability * 1.1))); // EASY com aumento mínimo, máx 30 dias
    new_card.due = this.addDays(now, interval);
    new_card.scheduled_days = interval;
    new_card.elapsed_days = elapsed_days;
    new_card.reps = card.reps + 1;
    new_card.lapses = card.lapses;
    new_card.state = card.state === FSRSState.NEW ? FSRSState.LEARNING : FSRSState.REVIEW;
    new_card.last_review = now;

    const review_log: FSRSReviewLog = {
      id: `${card.userId}_${card.id}_${now.getTime()}`,
      cardId: card.id,
      userId: card.userId,
      grade: FSRSGrade.EASY,
      state: card.state,
      due: card.due,
      stability: card.stability,
      difficulty: card.difficulty,
      elapsed_days: elapsed_days,
      last_elapsed_days: card.elapsed_days,
      scheduled_days: card.scheduled_days,
      review_time: 0,
      reviewed_at: now,
      createdAt: Timestamp.now()
    };

    return { card: new_card, review_log };
  }

  /**
   * Calcula nova estabilidade após falha (esquecimento)
   */
  private calculateStabilityAfterFailure(card: FSRSCard): number {
    const w = this.defaultParameters.w;
    const s = card.stability;
    const d = card.difficulty;
    
    // Fórmula FSRS para estabilidade após falha
    return w[11] * Math.pow(d, -w[12]) * (Math.pow(s + 1, w[13]) - 1) * Math.exp(-w[14] * (card.reps + 1));
  }

  /**
   * Calcula nova estabilidade após sucesso
   */
  private calculateStabilityAfterSuccess(card: FSRSCard, elapsed_days: number, grade: FSRSGrade): number {
    const w = this.defaultParameters.w;
    const s = card.stability;
    const d = card.difficulty;
    const r = this.calculateRetention(card, elapsed_days);
    
    if (card.state === FSRSState.NEW) {
      // Para cards novos
      return w[grade - 1];
    } else {
      // CORREÇÃO: HARD após sucesso anterior deve REDUZIR estabilidade
      if (grade === FSRSGrade.HARD && card.reps > 0) {
        // HARD indica que o intervalo anterior foi muito longo
        // Reduzimos a estabilidade em vez de aumentar
        return Math.max(0.5, card.stability * 0.6); // Reduz significativamente
      } else {
        // Para cards em revisão - fórmula FSRS
        return s * (1 + Math.exp(w[8]) * 
          (11 - d) * 
          Math.pow(s, -w[9]) * 
          (Math.exp((1 - r) * w[10]) - 1));
      }
    }
  }

  /**
   * Calcula nova dificuldade após falha
   */
  private calculateDifficultyAfterFailure(card: FSRSCard): number {
    const w = this.defaultParameters.w;
    const d = card.difficulty;
    
    return Math.min(10, d + w[6]);
  }

  /**
   * Calcula nova dificuldade após sucesso
   */
  private calculateDifficultyAfterSuccess(card: FSRSCard, grade: FSRSGrade): number {
    const w = this.defaultParameters.w;
    const d = card.difficulty;
    
    if (card.state === FSRSState.NEW) {
      // Para cards novos - dificuldade inicial baseada na nota
      return w[4] - Math.exp((grade - 3) * w[5]) + 1;
    } else {
      // Para cards em revisão
      const delta_d = -w[6] * (grade - 3);
      return Math.max(1, Math.min(10, d + delta_d));
    }
  }

  /**
   * Calcula taxa de retenção baseada na curva de esquecimento
   */
  private calculateRetention(card: FSRSCard, elapsed_days: number): number {
    return Math.exp(-elapsed_days / card.stability);
  }

  /**
   * Busca card FSRS por flashcard ID
   */
  public async getCardByFlashcardId(contentId: string, userId: string): Promise<FSRSCard | null> {
    try {
      // Buscar o FSRSCard diretamente pelo ID (que agora é o contentId)
      const docRef = this.db.collection('fsrs_cards').doc(contentId);
      const doc = await docRef.get();

      if (!doc.exists) {
        return null;
      }

      const data = doc.data();
      
      // Verificar se o card pertence ao usuário
      if (data?.userId !== userId) {
        return null;
      }
      
      return {
        ...data,
        due: data.due.toDate(),
        last_review: data.last_review ? data.last_review.toDate() : null,
      } as FSRSCard;
    } catch (error) {
      throw new AppError('Erro ao buscar card FSRS', 500);
    }
  }

  /**
   * Cria um novo card FSRS a partir de um flashcard
   */
  public createNewCard(
    contentId: string, 
    userId: string, 
    deckId: string, 
    deckName?: string, 
    filterName?: string
  ): FSRSCard {
    const now = new Date();
    
    return {
      id: contentId,  // Usar o ID do conteúdo como ID do FSRSCard
      userId,
      contentId: contentId,  // ID do conteúdo (flashcard, questão, etc.)
      deckId,
      deckName,    // Desnormalização para otimização
      filterName,  // Desnormalização para otimização
      due: now,
      stability: this.defaultParameters.w[0],
      difficulty: this.defaultParameters.w[4],
      elapsed_days: 0,
      scheduled_days: 0,
      reps: 0,
      lapses: 0,
      state: FSRSState.NEW,
      last_review: null,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
  }

  /**
   * Busca nomes de deck e filtro para desnormalização
   */
  public async enrichCardWithNames(card: FSRSCard): Promise<FSRSCard> {
    const enrichedCard = { ...card };
    
    // Buscar nome do deck se não estiver presente
    if (!enrichedCard.deckName && enrichedCard.deckId) {
      try {
        const deckDoc = await this.db.collection('decks').doc(enrichedCard.deckId).get();
        if (deckDoc.exists) {
          enrichedCard.deckName = deckDoc.data()?.name || 'Deck Desconhecido';
        }
      } catch (error) {
        logger.warn(`Erro ao buscar nome do deck ${enrichedCard.deckId}:`, error);
        enrichedCard.deckName = 'Deck Desconhecido';
      }
    }
    
    // Buscar nome do filtro se aplicável (para questões)
    if (!enrichedCard.filterName && enrichedCard.contentId) {
      try {
        // Verificar se é uma questão e buscar filtro principal
        const questionDoc = await this.db.collection('questions').doc(enrichedCard.contentId).get();
        if (questionDoc.exists) {
          const questionData = questionDoc.data();
          const filterIds = questionData?.filterIds || [];
          if (filterIds.length > 0) {
            const filterDoc = await this.db.collection('filters').doc(filterIds[0]).get();
            if (filterDoc.exists) {
              enrichedCard.filterName = filterDoc.data()?.name || 'Filtro Desconhecido';
            }
          }
        }
      } catch (error) {
        logger.warn(`Erro ao buscar nome do filtro para conteúdo ${enrichedCard.contentId}:`, error);
      }
    }
    
    return enrichedCard;
  }

  /**
   * Salva card FSRS no Firestore
   */
  public async saveCard(card: FSRSCard): Promise<void> {
    const docRef = this.db.collection('fsrs_cards').doc(card.id);
    
    // Validar e converter data 'due'
    let dueTimestamp: Timestamp;
    if (card.due instanceof Date) {
      dueTimestamp = Timestamp.fromDate(card.due);
    } else if (card.due && typeof card.due === 'object' && 'toDate' in card.due) {
      dueTimestamp = card.due as Timestamp;
    } else {
      logger.warn(`[saveCard] Formato de data 'due' inválido para card ${card.id}:`, typeof card.due, card.due);
      dueTimestamp = Timestamp.now();
    }
    
    // Validar e converter data 'last_review'
    let lastReviewTimestamp: Timestamp | null = null;
    if (card.last_review) {
      if (card.last_review instanceof Date) {
        lastReviewTimestamp = Timestamp.fromDate(card.last_review);
      } else if (typeof card.last_review === 'object' && 'toDate' in card.last_review) {
        lastReviewTimestamp = card.last_review as Timestamp;
      } else {
        logger.warn(`[saveCard] Formato de data 'last_review' inválido para card ${card.id}:`, typeof card.last_review, card.last_review);
      }
    }
    
    await docRef.set({
      ...card,
      due: dueTimestamp,
      last_review: lastReviewTimestamp,
      updatedAt: Timestamp.now()
    });
  }

  /**
   * Salva log de revisão no Firestore
   */
  public async saveReviewLog(log: FSRSReviewLog): Promise<void> {
    const docRef = this.db.collection('fsrs_review_logs').doc(log.id);
    
    // Validar e converter data 'due'
    let dueTimestamp: Timestamp;
    if (log.due instanceof Date) {
      dueTimestamp = Timestamp.fromDate(log.due);
    } else if (log.due && typeof log.due === 'object' && 'toDate' in log.due) {
      dueTimestamp = log.due as Timestamp;
    } else {
      logger.warn(`[saveReviewLog] Formato de data 'due' inválido para log ${log.id}:`, typeof log.due, log.due);
      dueTimestamp = Timestamp.now();
    }
    
    // Validar e converter data 'reviewed_at'
    let reviewedAtTimestamp: Timestamp;
    if (log.reviewed_at instanceof Date) {
      reviewedAtTimestamp = Timestamp.fromDate(log.reviewed_at);
    } else if (log.reviewed_at && typeof log.reviewed_at === 'object' && 'toDate' in log.reviewed_at) {
      reviewedAtTimestamp = log.reviewed_at as Timestamp;
    } else {
      logger.warn(`[saveReviewLog] Formato de data 'reviewed_at' inválido para log ${log.id}:`, typeof log.reviewed_at, log.reviewed_at);
      reviewedAtTimestamp = Timestamp.now();
    }
    
    await docRef.set({
      ...log,
      due: dueTimestamp,
      reviewed_at: reviewedAtTimestamp
    });
  }

  /**
   * Busca cards devido para revisão
   */
  public async getDueCards(userId: string, limit: number = 200): Promise<FSRSCard[]> {
    const now = Timestamp.now();
    
    const querySnapshot = await this.db
      .collection('fsrs_cards')
      .where('userId', '==', userId)
      .where('due', '<=', now)
      .orderBy('due', 'asc')
      .limit(limit)
      .get();

    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        due: data.due.toDate(),
        last_review: data.last_review ? data.last_review.toDate() : null,
      } as FSRSCard;
    });
  }

  /**
   * Processa uma revisão de conteúdo (flashcard, questão, etc.)
   */
  public async reviewCard(
    contentId: string, 
    userId: string, 
    grade: FSRSGrade,
    reviewTime?: number
  ): Promise<FSRSCard> {
    let card = await this.getCardByFlashcardId(contentId, userId);
    
    // Se não existe, cria um novo card
    if (!card) {
      card = this.createNewCard(contentId, userId, ''); // deckId será atualizado
      await this.saveCard(card);
    }

    const now = new Date();
    const scheduling = this.schedule(card, now, grade);
    
    let selectedScheduling: SchedulingInfo;
    switch (grade) {
      case FSRSGrade.AGAIN:
        selectedScheduling = scheduling.again;
        break;
      case FSRSGrade.HARD:
        selectedScheduling = scheduling.hard;
        break;
      case FSRSGrade.GOOD:
        selectedScheduling = scheduling.good;
        break;
      case FSRSGrade.EASY:
        selectedScheduling = scheduling.easy;
        break;
      default:
        selectedScheduling = scheduling.good;
    }

    // Atualiza tempo de revisão se fornecido
    if (reviewTime) {
      selectedScheduling.review_log.review_time = reviewTime;
    }

    // Salva card atualizado e log de revisão
    await Promise.all([
      this.saveCard(selectedScheduling.card),
      this.saveReviewLog(selectedScheduling.review_log)
    ]);

    logger.info(`FSRS: Card ${contentId} revisado com nota ${grade}`, {
      userId,
      newDue: selectedScheduling.card.due,
      stability: selectedScheduling.card.stability,
      difficulty: selectedScheduling.card.difficulty,
      state: selectedScheduling.card.state
    });

    return selectedScheduling.card;
  }

  // Métodos utilitários
  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  private dateDiff(date1: Date, date2: Date): number {
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  private generateId(): string {
    return this.db.collection('temp').doc().id;
  }

  /**
   * Otimiza parâmetros FSRS com base no histórico do usuário
   * (Implementação futura - por enquanto usa parâmetros padrão)
   */
  public async optimizeParameters(userId: string): Promise<FSRSParameters> {
    // TODO: Implementar otimização de parâmetros baseada no histórico
    // Por enquanto retorna parâmetros padrão
    logger.info(`FSRS: Otimização de parâmetros solicitada para usuário ${userId} - usando padrões`);
    return this.defaultParameters;
  }

  /**
   * Converte dados SM-2 existentes para FSRS
   */
  public convertSM2ToFSRS(
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
  ): FSRSCard {
    const now = new Date();
    
    // Converte dados SM-2 para FSRS com estimativas
    const stability = Math.max(0.1, srsData.interval * 0.8); // Estima estabilidade baseada no intervalo
    const difficulty = Math.max(1, Math.min(10, 11 - srsData.easeFactor * 2)); // Converte ease factor para dificuldade
    
    return {
      id: contentId,  // Usar o ID do conteúdo como ID do FSRSCard
      userId,
      contentId: contentId,
      deckId,
      due: srsData.lastReviewedAt ? this.addDays(srsData.lastReviewedAt, srsData.interval) : now,
      stability,
      difficulty,
      elapsed_days: srsData.lastReviewedAt ? this.dateDiff(srsData.lastReviewedAt, now) : 0,
      scheduled_days: srsData.interval,
      reps: srsData.repetitions,
      lapses: srsData.lapses,
      state: srsData.repetitions === 0 ? FSRSState.NEW : FSRSState.REVIEW,
      last_review: srsData.lastReviewedAt || null,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
  }
}