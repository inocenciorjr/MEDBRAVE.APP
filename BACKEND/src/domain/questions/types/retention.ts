import { Timestamp } from 'firebase/firestore';
import { ResponseContext } from './enhanced';

/**
 * Fases do padrão de aprendizado
 */
export enum LearningPhase {
  LEARNING = 'LEARNING',           // Ainda aprendendo
  MASTERED = 'MASTERED',           // Dominou a questão
  REGRESSION = 'REGRESSION',       // Regrediu após dominar
  INCONSISTENT = 'INCONSISTENT'   // Padrão inconsistente
}

/**
 * Nível de confiança do usuário em uma resposta
 */
export enum ConfidenceLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}

/**
 * Tendência de retenção
 */
export enum RetentionTrend {
  IMPROVING = 'IMPROVING',
  STABLE = 'STABLE',
  DECLINING = 'DECLINING'
}

/**
 * Uma tentativa individual de resposta
 */
export interface RetentionAttempt {
  date: Timestamp;                    // Quando foi respondida
  correct: boolean;                   // Se acertou ou errou
  context: ResponseContext;           // Em que contexto (lista, FSRS, etc)
  responseTimeMs: number;             // Tempo gasto na resposta
  confidence?: ConfidenceLevel;       // Nível de confiança (opcional)
}

/**
 * Métricas calculadas a partir do histórico
 */
export interface RetentionMetrics {
  totalAttempts: number;              // Total de tentativas
  correctAttempts: number;            // Quantas acertou
  retentionRate: number;              // Taxa de acerto (0-1)
  averageResponseTime: number;        // Tempo médio de resposta
  lastCorrectDate?: Timestamp;        // Última vez que acertou
  longestCorrectStreak: number;       // Maior sequência de acertos
  currentStreak: number;              // Sequência atual (+ acertos, - erros)
}

/**
 * Análise de padrão de aprendizado
 */
export interface LearningPattern {
  phase: LearningPhase;               // Fase atual do aprendizado
  turningPoint?: Timestamp;           // Quando "virou" para dominar
  consistencyAfterTurning: number;    // Quantas corretas seguidas após virar
  regressionAlert: boolean;           // Se regrediu após dominar
  patternMessage: string;             // Explicação humana do padrão
  recommendation: string;             // Recomendação baseada no padrão
}

/**
 * Análise de padrões temporais
 */
export interface TemporalPatterns {
  bestTimeOfDay?: string;             // "14:00-16:00" - melhor horário
  worstTimeOfDay?: string;            // "08:00-10:00" - pior horário
  averageDaysBetweenAttempts: number; // Intervalo médio entre tentativas
  forgettingCurve: number;            // Taxa de esquecimento (0-1)
  optimalInterval?: number;           // Intervalo ótimo em dias
}

/**
 * Registro completo de retenção de uma questão para um usuário
 * SEM LIMITE DE TENTATIVAS - todas são armazenadas
 */
export interface QuestionRetentionRecord {
  id: string;
  userId: string;
  questionId: string;
  
  // Histórico COMPLETO (sem limite de tentativas)
  attempts: RetentionAttempt[];
  
  // Métricas calculadas
  metrics: RetentionMetrics;
  
  // Análise de padrão de aprendizado (NOVO)
  learningPattern: LearningPattern;
  
  // Análise de padrões temporais
  patterns: TemporalPatterns;
  
  // Metadados
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Payload para criação de registro de retenção
 */
export interface CreateRetentionRecordPayload {
  userId: string;
  questionId: string;
  initialAttempt: RetentionAttempt;
}

/**
 * Payload para adicionar uma nova tentativa
 */
export interface AddAttemptPayload {
  userId: string;
  questionId: string;
  attempt: RetentionAttempt;
}

/**
 * Dashboard de retenção - visão geral do usuário
 */
export interface RetentionDashboard {
  overview: {
    totalQuestionsTracked: number;
    masteredQuestions: number;
    decliningQuestions: number;
    learningQuestions: number;
    inconsistentQuestions: number;
  };
  
  // Alertas importantes
  alerts: Array<{
    questionId: string;
    type: 'REGRESSION' | 'FORGETTING' | 'INCONSISTENT';
    message: string;
    recommendation: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
  }>;
  
  // Conquistas identificadas
  achievements: Array<{
    type: 'MASTERY' | 'IMPROVEMENT' | 'CONSISTENCY';
    title: string;
    description: string;
    questionIds: string[];
    achievedAt: Timestamp;
  }>;
  
  // Recomendações de estudo
  recommendations: Array<{
    type: 'REVIEW' | 'PRACTICE' | 'FSRS_ADD' | 'TIME_MANAGEMENT';
    message: string;
    questionIds?: string[];
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
  }>;
}

/**
 * Análise de consistência - como uma questão se comportou na sessão
 */
export interface ConsistencyAnalysis {
  questionId: string;
  previousResult: boolean;
  currentResult: boolean;
  trend: 'IMPROVED' | 'MAINTAINED' | 'REGRESSED';
  message: string;
  impactLevel: 'HIGH' | 'MEDIUM' | 'LOW';
}

/**
 * Filtros para busca de registros de retenção
 */
export interface RetentionSearchFilters {
  userId: string;
  phase?: LearningPhase;
  hasRegressionAlert?: boolean;
  minRetentionRate?: number;
  maxRetentionRate?: number;
  lastAttemptAfter?: Timestamp;
  lastAttemptBefore?: Timestamp;
  questionIds?: string[];
}

/**
 * Resultado de busca de retenção
 */
export interface RetentionSearchResult {
  records: QuestionRetentionRecord[];
  totalCount: number;
  aggregations: {
    phaseDistribution: Record<LearningPhase, number>;
    averageRetentionRate: number;
    totalAttempts: number;
    regressionAlerts: number;
  };
} 