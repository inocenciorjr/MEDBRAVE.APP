const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'infra', 'srs', 'supabase', 'SupabaseFSRSService.ts');
const backupPath = filePath + '.backup2';

console.log('Reconstruindo SupabaseFSRSService.ts...');

// Criar backup
if (fs.existsSync(filePath)) {
  fs.copyFileSync(filePath, backupPath);
  console.log('Backup criado:', backupPath);
}

// Conteúdo limpo do arquivo
const cleanContent = `import { SupabaseClient } from '@supabase/supabase-js';
import logger from '../../../utils/logger';
import { AppError } from '../../../shared/errors/AppError';

/**
 * FSRS (Free Spaced Repetition Scheduler) Service - Supabase Implementation
 * 
 * Implementa o algoritmo FSRS para repetição espaçada otimizada.
 * Baseado no paper: https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm
 */

export enum FSRSGrade {
  AGAIN = 1, // Falha - esqueceu completamente
  HARD = 2, // Difícil - lembrou com muita dificuldade
  GOOD = 3, // Bom - lembrou com alguma dificuldade
  EASY = 4, // Fácil - lembrou facilmente
}

export enum FSRSState {
  NEW = 'NEW',
  LEARNING = 'LEARNING',
  REVIEW = 'REVIEW',
  RELEARNING = 'RELEARNING',
}

export interface FSRSCard {
  id: string;
  user_id: string;
  content_id: string; // flashcard ID
  deck_id: string;
  // Campos opcionais para evitar consultas adicionais
  deck_name?: string; // Nome do deck (evita consulta adicional)
  filter_name?: string; // Nome do filtro (evita consulta adicional)
  // Campos FSRS
  due: Date;
  stability: number; // S - quão estável é a memória
  difficulty: number; // D - quão difícil é o item (0-10)
  elapsed_days: number; // dias desde última revisão
  scheduled_days: number; // dias agendados para próxima revisão
  reps: number; // número de repetições
  lapses: number; // número de lapsos/esquecimentos
  state: FSRSState; // estado atual do card
  // Metadados
  last_review: Date | null;
  created_at: string;
  updated_at: string;
}

export interface FSRSReviewLog {
  id: string;
  card_id: string;
  user_id: string;
  // Review data
  grade: FSRSGrade;
  state: FSRSState;
  due: Date;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  last_elapsed_days: number;
  scheduled_days: number;
  review_time: number; // milissegundos gastos na revisão
  // Timestamps
  reviewed_at: Date;
  created_at: string;
}

export interface FSRSParameters {
  request_retention: number; // retenção desejada (0-1)
  maximum_interval: number; // intervalo máximo em dias (padrão: 36500)
  w: number[]; // 17 pesos do algoritmo
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

export class SupabaseFSRSService {
  private supabase: SupabaseClient;
  
  private defaultParameters: FSRSParameters = {
    request_retention: 0.85, // Reduzido para forçar revisões mais frequentes
    maximum_interval: 90, // Máximo 3 meses (era 100 anos!)
    w: [
      8.0, // w[0] - Estabilidade inicial EASY (7-10 dias)
      1.25, // w[1] - Estabilidade inicial HARD (1 dia após multiplicador 0.8)
      3.5, // w[2] - Estabilidade inicial GOOD (3-4 dias)
      0.1, // w[3] - Estabilidade inicial AGAIN (0 dias)
      6.0, // w[4] - Dificuldade inicial (era 7.21, reduzido)
      0.3, // w[5] - Fator dificuldade por grade (era 0.53, reduzido)
      0.8, // w[6] - Delta dificuldade (era 1.07, reduzido)
      0.02, // w[7] - Fator decay (era 0.02, mantido)
      1.2, // w[8] - Fator estabilidade (era 1.62, reduzido)
      0.1, // w[9] - Expoente estabilidade (era 0.15, reduzido)
      0.8, // w[10] - Fator retenção (era 1.08, reduzido)
      1.5, // w[11] - Estabilidade após falha (era 1.98, reduzido)
      0.08, // w[12] - Expoente dificuldade falha (era 0.10, reduzido)
      0.25, // w[13] - Expoente estabilidade falha (era 0.30, reduzido)
      1.8, // w[14] - Fator repetições falha (era 2.20, reduzido)
      0.2, // w[15] - Fator mínimo (era 0.24, reduzido)
      2.0, // w[16] - Fator máximo (era 2.95, reduzido)
    ],
  };

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient;
  }

  public schedule(
    card: FSRSCard,
    now: Date,
    _grade?: FSRSGrade,
  ): SchedulingCards {
    return {
      again: this.scheduleForgetting(card, now),
      hard: this.scheduleHard(card, now),
      good: this.scheduleGood(card, now),
      easy: this.scheduleEasy(card, now),
    };
  }

  private scheduleForgetting(card: FSRSCard, now: Date): SchedulingInfo {
    const newCard: FSRSCard = {
      ...card,
      due: this.addDays(now, 1),
      stability: this.calculateStabilityAfterFailure(card),
      difficulty: this.calculateDifficultyAfterFailure(card),
      elapsed_days: card.state === FSRSState.NEW ? 0 : this.dateDiff(card.last_review || now, now),
      scheduled_days: 1,
      reps: card.reps,
      lapses: card.lapses + 1,
      state: card.state === FSRSState.NEW ? FSRSState.LEARNING : FSRSState.RELEARNING,
      last_review: now,
      updated_at: now.toISOString(),
    };

    const reviewLog: FSRSReviewLog = {
      id: this.generateId(),
      card_id: card.id,
      user_id: card.user_id,
      grade: FSRSGrade.AGAIN,
      state: newCard.state,
      due: newCard.due,
      stability: newCard.stability,
      difficulty: newCard.difficulty,
      elapsed_days: newCard.elapsed_days,
      last_elapsed_days: card.elapsed_days,
      scheduled_days: newCard.scheduled_days,
      review_time: 0,
      reviewed_at: now,
      created_at: now.toISOString(),
    };

    return { card: newCard, review_log: reviewLog };
  }

  private scheduleHard(card: FSRSCard, now: Date): SchedulingInfo {
    const elapsed_days = card.state === FSRSState.NEW ? 0 : this.dateDiff(card.last_review || now, now);
    const scheduled_days = card.state === FSRSState.NEW ? 1 : Math.max(1, Math.round(card.scheduled_days * 1.2));
    
    const newCard: FSRSCard = {
      ...card,
      due: this.addDays(now, scheduled_days),
      stability: card.state === FSRSState.NEW ? this.defaultParameters.w[1] : this.calculateStabilityAfterSuccess(card, elapsed_days, FSRSGrade.HARD),
      difficulty: this.calculateDifficultyAfterSuccess(card, FSRSGrade.HARD),
      elapsed_days,
      scheduled_days,
      reps: card.reps + 1,
      lapses: card.lapses,
      state: card.state === FSRSState.NEW || card.state === FSRSState.LEARNING ? FSRSState.LEARNING : FSRSState.REVIEW,
      last_review: now,
      updated_at: now.toISOString(),
    };

    const reviewLog: FSRSReviewLog = {
      id: this.generateId(),
      card_id: card.id,
      user_id: card.user_id,
      grade: FSRSGrade.HARD,
      state: newCard.state,
      due: newCard.due,
      stability: newCard.stability,
      difficulty: newCard.difficulty,
      elapsed_days: newCard.elapsed_days,
      last_elapsed_days: card.elapsed_days,
      scheduled_days: newCard.scheduled_days,
      review_time: 0,
      reviewed_at: now,
      created_at: now.toISOString(),
    };

    return { card: newCard, review_log: reviewLog };
  }

  private scheduleGood(card: FSRSCard, now: Date): SchedulingInfo {
    const elapsed_days = card.state === FSRSState.NEW ? 0 : this.dateDiff(card.last_review || now, now);
    let scheduled_days: number;
    
    if (card.state === FSRSState.NEW) {
      scheduled_days = Math.round(this.defaultParameters.w[2]);
    } else {
      const stability = this.calculateStabilityAfterSuccess(card, elapsed_days, FSRSGrade.GOOD);
      scheduled_days = Math.round(stability * Math.log(this.defaultParameters.request_retention) / Math.log(0.9));
    }
    
    scheduled_days = Math.min(scheduled_days, this.defaultParameters.maximum_interval);
    
    const newCard: FSRSCard = {
      ...card,
      due: this.addDays(now, scheduled_days),
      stability: card.state === FSRSState.NEW ? this.defaultParameters.w[2] : this.calculateStabilityAfterSuccess(card, elapsed_days, FSRSGrade.GOOD),
      difficulty: this.calculateDifficultyAfterSuccess(card, FSRSGrade.GOOD),
      elapsed_days,
      scheduled_days,
      reps: card.reps + 1,
      lapses: card.lapses,
      state: FSRSState.REVIEW,
      last_review: now,
      updated_at: now.toISOString(),
    };

    const reviewLog: FSRSReviewLog = {
      id: this.generateId(),
      card_id: card.id,
      user_id: card.user_id,
      grade: FSRSGrade.GOOD,
      state: newCard.state,
      due: newCard.due,
      stability: newCard.stability,
      difficulty: newCard.difficulty,
      elapsed_days: newCard.elapsed_days,
      last_elapsed_days: card.elapsed_days,
      scheduled_days: newCard.scheduled_days,
      review_time: 0,
      reviewed_at: now,
      created_at: now.toISOString(),
    };

    return { card: newCard, review_log: reviewLog };
  }

  private scheduleEasy(card: FSRSCard, now: Date): SchedulingInfo {
    const elapsed_days = card.state === FSRSState.NEW ? 0 : this.dateDiff(card.last_review || now, now);
    let scheduled_days: number;
    
    if (card.state === FSRSState.NEW) {
      scheduled_days = Math.round(this.defaultParameters.w[0]);
    } else {
      const stability = this.calculateStabilityAfterSuccess(card, elapsed_days, FSRSGrade.EASY);
      scheduled_days = Math.round(stability * Math.log(this.defaultParameters.request_retention) / Math.log(0.9));
      scheduled_days = Math.round(scheduled_days * 1.3); // Bonus para EASY
    }
    
    scheduled_days = Math.min(scheduled_days, this.defaultParameters.maximum_interval);
    
    const newCard: FSRSCard = {
      ...card,
      due: this.addDays(now, scheduled_days),
      stability: card.state === FSRSState.NEW ? this.defaultParameters.w[0] : this.calculateStabilityAfterSuccess(card, elapsed_days, FSRSGrade.EASY),
      difficulty: this.calculateDifficultyAfterSuccess(card, FSRSGrade.EASY),
      elapsed_days,
      scheduled_days,
      reps: card.reps + 1,
      lapses: card.lapses,
      state: FSRSState.REVIEW,
      last_review: now,
      updated_at: now.toISOString(),
    };

    const reviewLog: FSRSReviewLog = {
      id: this.generateId(),
      card_id: card.id,
      user_id: card.user_id,
      grade: FSRSGrade.EASY,
      state: newCard.state,
      due: newCard.due,
      stability: newCard.stability,
      difficulty: newCard.difficulty,
      elapsed_days: newCard.elapsed_days,
      last_elapsed_days: card.elapsed_days,
      scheduled_days: newCard.scheduled_days,
      review_time: 0,
      reviewed_at: now,
      created_at: now.toISOString(),
    };

    return { card: newCard, review_log: reviewLog };
  }

  private calculateStabilityAfterFailure(card: FSRSCard): number {
    return Math.max(
      this.defaultParameters.w[11] * Math.pow(card.difficulty, -this.defaultParameters.w[12]) * 
      (Math.pow(card.stability + 1, this.defaultParameters.w[13]) - 1) * 
      Math.exp((1 - this.defaultParameters.request_retention) * this.defaultParameters.w[14]),
      0.01
    );
  }

  private calculateStabilityAfterSuccess(
    card: FSRSCard,
    elapsed_days: number,
    grade: FSRSGrade,
  ): number {
    const hard_penalty = grade === FSRSGrade.HARD ? this.defaultParameters.w[15] : 1;
    const easy_bonus = grade === FSRSGrade.EASY ? this.defaultParameters.w[16] : 1;
    
    return Math.max(
      card.stability * 
      (Math.exp(this.defaultParameters.w[8]) * 
       (11 - card.difficulty) * 
       Math.pow(card.stability, -this.defaultParameters.w[9]) * 
       (Math.exp((1 - this.calculateRetention(card, elapsed_days)) * this.defaultParameters.w[10]) - 1) + 1) *
      hard_penalty * easy_bonus,
      0.01
    );
  }

  private calculateDifficultyAfterFailure(card: FSRSCard): number {
    return Math.min(Math.max(card.difficulty + this.defaultParameters.w[6], 1), 10);
  }

  private calculateDifficultyAfterSuccess(
    card: FSRSCard,
    grade: FSRSGrade,
  ): number {
    const delta = -this.defaultParameters.w[5] * (grade - 3);
    return Math.min(Math.max(card.difficulty + delta, 1), 10);
  }

  private calculateRetention(card: FSRSCard, elapsed_days: number): number {
    return Math.pow(1 + elapsed_days / (9 * card.stability), -1);
  }

  public async getCardByFlashcard_id(
    contentId: string,
    user_id: string,
  ): Promise<FSRSCard | null> {
    try {
      const { data, error } = await this.supabase
        .from('fsrs_cards')
        .select('*')
        .eq('content_id', contentId)
        .eq('user_id', user_id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Card não encontrado
        }
        throw new AppError('Erro ao buscar card FSRS', 500);
      }

      return {
        ...data,
        due: new Date(data.due),
        last_review: data.last_review ? new Date(data.last_review) : null,
      };
    } catch (error) {
      logger.error('[getCardByFlashcard_id] Erro:', error);
      throw new AppError('Erro ao buscar card FSRS', 500);
    }
  }

  public createNewCard(
    contentId: string,
    user_id: string,
    deck_id: string,
    deckName?: string,
    filterName?: string,
  ): FSRSCard {
    const now = new Date();
    return {
      id: this.generateId(),
      user_id,
      content_id: contentId,
      deck_id,
      deck_name: deckName,
      filter_name: filterName,
      due: now,
      stability: this.defaultParameters.w[4],
      difficulty: this.defaultParameters.w[4],
      elapsed_days: 0,
      scheduled_days: 0,
      reps: 0,
      lapses: 0,
      state: FSRSState.NEW,
      last_review: null,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };
  }

  public async enrichCardWithNames(card: FSRSCard): Promise<FSRSCard> {
    if (card.deck_name && card.filter_name) {
      return card;
    }

    try {
      const { data: deckData } = await this.supabase
        .from('decks')
        .select('name')
        .eq('id', card.deck_id)
        .single();

      return {
        ...card,
        deck_name: deckData?.name || 'Deck Desconhecido',
        filter_name: 'Todos os Cards',
      };
    } catch (error) {
      logger.error('[enrichCardWithNames] Erro:', error);
      return {
        ...card,
        deck_name: 'Deck Desconhecido',
        filter_name: 'Todos os Cards',
      };
    }
  }

  public async saveCard(card: FSRSCard): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('fsrs_cards')
        .upsert({
          id: card.id,
          user_id: card.user_id,
          content_id: card.content_id,
          deck_id: card.deck_id,
          due: card.due.toISOString(),
          stability: card.stability,
          difficulty: card.difficulty,
          elapsed_days: card.elapsed_days,
          scheduled_days: card.scheduled_days,
          reps: card.reps,
          lapses: card.lapses,
          state: card.state,
          last_review: card.last_review?.toISOString() || null,
          created_at: card.created_at,
          updated_at: card.updated_at,
        });

      if (error) {
        throw new AppError('Erro ao salvar card FSRS', 500);
      }
    } catch (error) {
      logger.error('[saveCard] Erro:', error);
      throw new AppError('Erro ao salvar card FSRS', 500);
    }
  }

  public async saveReviewLog(log: FSRSReviewLog): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('fsrs_review_logs')
        .insert({
          id: log.id,
          card_id: log.card_id,
          user_id: log.user_id,
          grade: log.grade,
          state: log.state,
          due: log.due.toISOString(),
          stability: log.stability,
          difficulty: log.difficulty,
          elapsed_days: log.elapsed_days,
          last_elapsed_days: log.last_elapsed_days,
          scheduled_days: log.scheduled_days,
          review_time: log.review_time,
          reviewed_at: log.reviewed_at.toISOString(),
          created_at: log.created_at,
        });

      if (error) {
        throw new AppError('Erro ao salvar log de revisão', 500);
      }
    } catch (error) {
      logger.error('[saveReviewLog] Erro:', error);
      throw new AppError('Erro ao salvar log de revisão', 500);
    }
  }

  public async getDueCards(
    user_id: string,
    limit: number = 200,
  ): Promise<FSRSCard[]> {
    try {
      const now = new Date();
      const { data, error } = await this.supabase
        .from('fsrs_cards')
        .select('*')
        .eq('user_id', user_id)
        .lte('due', now.toISOString())
        .order('due', { ascending: true })
        .limit(limit);

      if (error) {
        throw new AppError('Erro ao buscar cards devidos', 500);
      }

      return data.map(card => ({
        ...card,
        due: new Date(card.due),
        last_review: card.last_review ? new Date(card.last_review) : null,
      }));
    } catch (error) {
      logger.error('[getDueCards] Erro:', error);
      throw new AppError('Erro ao buscar cards devidos', 500);
    }
  }

  public async reviewCard(
    contentId: string,
    user_id: string,
    grade: FSRSGrade,
    reviewTime?: number,
  ): Promise<FSRSCard> {
    try {
      let card = await this.getCardByFlashcard_id(contentId, user_id);
      
      if (!card) {
        throw new AppError('Card não encontrado', 404);
      }

      const now = new Date();
      const schedulingCards = this.schedule(card, now, grade);
      
      let schedulingInfo: SchedulingInfo;
      switch (grade) {
        case FSRSGrade.AGAIN:
          schedulingInfo = schedulingCards.again;
          break;
        case FSRSGrade.HARD:
          schedulingInfo = schedulingCards.hard;
          break;
        case FSRSGrade.GOOD:
          schedulingInfo = schedulingCards.good;
          break;
        case FSRSGrade.EASY:
          schedulingInfo = schedulingCards.easy;
          break;
        default:
          throw new AppError('Grade inválido', 400);
      }

      // Atualizar tempo de revisão se fornecido
      if (reviewTime) {
        schedulingInfo.review_log.review_time = reviewTime;
      }

      // Salvar card e log
      await this.saveCard(schedulingInfo.card);
      await this.saveReviewLog(schedulingInfo.review_log);

      return schedulingInfo.card;
    } catch (error) {
      logger.error('[reviewCard] Erro:', error);
      throw error;
    }
  }

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
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  public async optimizeParameters(user_id: string): Promise<FSRSParameters> {
    logger.info(
      \`[optimizeParameters] Usando parâmetros padrão para usuário \${user_id}\`,
    );
    return this.defaultParameters;
  }

  public convertSM2ToFSRS(
    contentId: string,
    user_id: string,
    deck_id: string,
    srsData: {
      interval: number;
      ease_factor: number;
      repetitions: number;
      lapses: number;
      lastReviewedAt?: Date;
    },
    deckName?: string,
    filterName?: string,
  ): FSRSCard {
    const now = new Date();
    
    // Converter dados SM-2 para FSRS
    const stability = Math.max(srsData.interval * 0.8, 0.1);
    const difficulty = Math.max(Math.min(10 - (srsData.ease_factor - 1.3) * 5, 10), 1);
    
    return {
      id: this.generateId(),
      user_id,
      content_id: contentId,
      deck_id,
      deck_name: deckName,
      filter_name: filterName,
      due: srsData.lastReviewedAt 
        ? this.addDays(srsData.lastReviewedAt, srsData.interval)
        : now,
      stability,
      difficulty,
      elapsed_days: srsData.lastReviewedAt 
        ? this.dateDiff(srsData.lastReviewedAt, now)
        : 0,
      scheduled_days: srsData.interval,
      reps: srsData.repetitions,
      lapses: srsData.lapses,
      state: srsData.repetitions === 0 ? FSRSState.NEW : FSRSState.REVIEW,
      last_review: srsData.lastReviewedAt || null,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };
  }
}
`;

// Escrever arquivo limpo
fs.writeFileSync(filePath, cleanContent, 'utf8');

const finalLines = cleanContent.split('\n').length;
console.log('Linhas finais:', finalLines);
console.log('Arquivo reconstruído com sucesso!');