import { Timestamp } from 'firebase/firestore';
import { FSRSCard, FSRSGrade } from '../../srs/services/FSRSService';

/**
 * Contexto expandido para respostas de questões
 */
export enum ResponseContext {
  LIST_STUDY = 'LIST_STUDY',         // Estudo em listas normais
  FSRS_REVIEW = 'FSRS_REVIEW',       // Revisão via FSRS
  PRACTICE = 'PRACTICE',             // Prática livre
  SIMULATION = 'SIMULATION'          // Simulado
}

/**
 * Nível de fadiga baseado em posição e tempo
 */
export enum FatigueLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}

/**
 * Qualidade da revisão FSRS
 */
export enum ReviewQuality {
  AGAIN = 'AGAIN',
  HARD = 'HARD', 
  GOOD = 'GOOD',
  EASY = 'EASY'
}

/**
 * Métricas detalhadas de tempo de resposta
 */
export interface TimeMetrics {
  responseTimeMs: number;      // Tempo real da resposta (clique na alternativa)
  readingTimeMs: number;       // Tempo lendo a questão (antes de pensar)
  thinkingTimeMs: number;      // Tempo pensando (após ler, antes de responder)
  totalTimeMs: number;         // Tempo total (reading + thinking + response)
}

/**
 * Estatísticas contextuais da sessão
 */
export interface SessionMetrics {
  questionOrder: number;        // Posição na lista/sessão (1, 2, 3...)
  sessionAccuracy: number;      // Acerto acumulado até aqui na sessão (0-1)
  fatigueLevel: FatigueLevel;   // Baseado em tempo e posição na sessão
}

/**
 * Resposta de questão expandida e unificada
 * Substitui QuestionResponse + UserQuestionHistory
 */
export interface EnhancedQuestionResponse {
  // Dados básicos (existentes - mantém compatibilidade)
  id: string;
  userId: string;
  questionId: string;
  selectedAlternativeId: string | null; // null quando não respondeu ou pulou
  isCorrect: boolean;
  answeredAt: Timestamp;
  
  // Contexto expandido - onde/como a questão foi respondida
  context: ResponseContext;
  questionListId?: string | null; // ID da lista se context = LIST_STUDY
  
  // Métricas de tempo detalhadas
  timeMetrics: TimeMetrics;
  
  // Integração com sistema FSRS
  isInReviewSystem: boolean; // Se a questão está no sistema de revisão
  fsrsCardId: string | null; // ID do card FSRS se estiver no sistema
  lastReviewQuality?: ReviewQuality; // Qualidade da última revisão FSRS
  
  // Estatísticas contextuais da sessão
  sessionMetrics: SessionMetrics;
  
  // Campos de auditoria
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Payload para criação de resposta expandida
 */
export interface CreateEnhancedResponsePayload {
  userId: string;
  questionId: string;
  selectedAlternativeId: string | null;
  isCorrect: boolean;
  context: ResponseContext;
  questionListId?: string | null;
  timeMetrics: TimeMetrics;
  sessionMetrics: SessionMetrics;
  fsrsCardId?: string | null;
  lastReviewQuality?: ReviewQuality;
}

/**
 * Payload para registro de resposta (usado pelo serviço)
 */
export interface RecordAnswerPayload {
  userId: string;
  questionId: string;
  selectedAlternativeId: string | null;
  isCorrect: boolean;
  context: ResponseContext;
  questionListId?: string | null;
  timeMetrics: TimeMetrics;
  sessionMetrics: SessionMetrics;
  fsrsCardId?: string | null;
  lastReviewQuality?: ReviewQuality;
}

/**
 * Payload para atualização de resposta
 */
export interface UpdateEnhancedResponsePayload {
  isInReviewSystem?: boolean;
  fsrsCardId?: string | null;
  lastReviewQuality?: ReviewQuality;
  sessionMetrics?: Partial<SessionMetrics>;
}

/**
 * Resultado do processamento de resposta
 */
export interface RecordAnswerResult {
  response: EnhancedQuestionResponse;
  shouldRecommendFSRS: boolean;
  timeEfficiencyFeedback: string;
  retentionUpdate?: any; // Será definido em retention.ts
}

// Histórico detalhado de revisões FSRS para análise avançada
export interface EnhancedFSRSCard extends FSRSCard {
  reviewHistory: Array<{
    date: Timestamp;
    grade: FSRSGrade;
    intervalDays: number;
    difficulty: number;
    stability: number;
    context: string;
    responseTimeMs?: number;
  }>;
  performanceMetrics: {
    averageGrade: number;
    consistencyScore: number;
    retentionTrend: 'IMPROVING' | 'STABLE' | 'DECLINING';
    totalReviewTime: number;
  };
  listStudyHistory?: {
    timesSeenInLists: number;
    averageListPerformance: number;
    addedToFSRSFromList: boolean;
  };
} 