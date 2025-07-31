import { Timestamp } from 'firebase/firestore';
import { EnhancedQuestionResponse } from './enhanced';
import { PerformanceTrend, TimeEfficiencyPattern, FatigueEffect } from './common';

// TimeEfficiencyPattern e FatigueEffect movidos para common.ts

/**
 * Tipos de recomendação para FSRS
 */
export enum FSRSRecommendationReason {
  CONSISTENTLY_INCORRECT = 'CONSISTENTLY_INCORRECT', // Sempre erra
  REGRESSION = 'REGRESSION',                         // Regrediu
  HIGH_VALUE_TOPIC = 'HIGH_VALUE_TOPIC'             // Tópico importante
}

// PerformanceTrend movido para prediction.ts para evitar dependência circular

/**
 * Métricas básicas da sessão
 */
export interface BasicMetrics {
  totalQuestions: number;
  correctAnswers: number;
  accuracyPercentage: number;
  totalTimeMs: number;
  averageTimePerQuestion: number;
}

/**
 * Análise de eficiência temporal (ATUALIZADA conforme feedback)
 */
export interface TimeEfficiencyAnalysis {
  correctQuestions: {
    averageTimeSeconds: number;
    count: number;
  };
  incorrectQuestions: {
    averageTimeSeconds: number;
    count: number;
  };
  pattern: TimeEfficiencyPattern;
  timeRatio: number; // tempo_incorretas / tempo_corretas
  userMessage: string; // "Tempo médio para acertar: 2min | errar: 4min40s"
  recommendation: string; // "Considere seguir em frente mais rápido nas questões difíceis"
  interpretation: {
    message: string; // "Você está gastando 2.3x mais tempo nas questões que erra"
    advice: string; // "Considere seguir em frente quando não souber a resposta"
    pattern: string; // "OVERTHINKING_INCORRECT"
  };
}

/**
 * Análise de consistência individual de uma questão
 */
export interface QuestionConsistencyAnalysis {
  questionId: string;
  previousResult: boolean;
  currentResult: boolean;
  trend: PerformanceTrend;
  message: string;
  impactLevel: 'HIGH' | 'MEDIUM' | 'LOW';
}

/**
 * Análise de retenção e histórico (baseado em dados existentes)
 */
export interface RetentionAnalysis {
  questionsSeenBefore: number;
  questionsNewToUser: number;
  retentionRate: number; // % de questões já vistas que acertou
  improvementRate: number; // % de questões que melhorou vs última vez
  regressionCount: number; // Questões que regrediu (acertava antes, errou agora)
  consistencyAnalysis: QuestionConsistencyAnalysis[];
}

/**
 * Padrões temporais da sessão
 */
export interface SessionPatterns {
  accuracyByPosition: number[]; // Acerto por posição na lista [0.8, 0.7, 0.6...]
  timeByPosition: number[]; // Tempo por posição [120s, 130s, 140s...]
  fatigueEffect: FatigueEffect;
  optimalSessionLength: number; // Recomendação baseada em performance
  fatigueThreshold?: number; // Posição onde a fadiga começou
}

/**
 * Recomendação para adicionar ao FSRS
 */
export interface FSRSRecommendation {
  questionId: string;
  reason: FSRSRecommendationReason;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  explanation: string;
  confidence: number; // 0-1
}

/**
 * Recomendações automáticas inteligentes
 */
export interface IntelligentRecommendations {
  shouldAddToFSRS: FSRSRecommendation[];
  focusAreas: string[]; // Tópicos que precisam atenção
  nextStudyTime: Timestamp; // Quando estudar novamente
  timeManagement: string; // "Tente ser mais decisivo em questões difíceis"
  studyStrategy: string; // Estratégia recomendada
}

/**
 * Estatísticas completas de conclusão de lista
 */
export interface ListCompletionStatistics {
  listId: string;
  userId: string;
  sessionId: string;
  
  // Métricas básicas
  basic: BasicMetrics;
  
  // Análise de eficiência temporal (ATUALIZADA)
  timeEfficiency: TimeEfficiencyAnalysis;
  
  // Retenção e histórico (baseado em dados existentes)
  retention: RetentionAnalysis;
  
  // Padrões temporais
  patterns: SessionPatterns;
  
  // Recomendações automáticas inteligentes
  recommendations: IntelligentRecommendations;
  
  // Metadados
  completedAt: Timestamp;
  createdAt: Timestamp;
}

/**
 * Payload para criação de estatísticas
 */
export interface CreateStatisticsPayload {
  listId: string;
  userId: string;
  sessionId: string;
  responses: EnhancedQuestionResponse[];
}

/**
 * Análise comparativa entre sessões
 */
export interface SessionComparison {
  currentSession: ListCompletionStatistics;
  previousSession?: ListCompletionStatistics;
  improvements: Array<{
    metric: string;
    improvement: number; // Valor positivo = melhoria
    message: string;
  }>;
  regressions: Array<{
    metric: string;
    regression: number; // Valor negativo = piora
    message: string;
  }>;
}

/**
 * Agregações estatísticas por período
 */
export interface StatisticsAggregation {
  userId: string;
  period: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  periodStart: Timestamp;
  periodEnd: Timestamp;
  
  totalSessions: number;
  totalQuestions: number;
  averageAccuracy: number;
  averageTimePerQuestion: number;
  
  // Tendências
  accuracyTrend: PerformanceTrend;
  speedTrend: PerformanceTrend;
  consistencyTrend: PerformanceTrend;
  
  // Padrões identificados
  dominantTimePattern: TimeEfficiencyPattern;
  commonFatigueLevel: FatigueEffect;
  
  // Top questões problemáticas
  problematicQuestions: Array<{
    questionId: string;
    errorRate: number;
    averageTime: number;
    attempts: number;
  }>;
}

/**
 * Filtros para busca de estatísticas
 */
export interface StatisticsSearchFilters {
  userId: string;
  listIds?: string[];
  dateFrom?: Timestamp;
  dateTo?: Timestamp;
  minAccuracy?: number;
  maxAccuracy?: number;
  timePattern?: TimeEfficiencyPattern;
  hasFatigue?: boolean;
}

/**
 * Resultado de busca de estatísticas
 */
export interface StatisticsSearchResult {
  statistics: ListCompletionStatistics[];
  totalCount: number;
  aggregations: {
    averageAccuracy: number;
    averageTimePerQuestion: number;
    totalQuestions: number;
    patternDistribution: Record<TimeEfficiencyPattern, number>;
    fatigueDistribution: Record<FatigueEffect, number>;
  };
} 