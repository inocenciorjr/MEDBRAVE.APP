// Removed Firebase dependency - using ISO string dates
import {
  PerformanceTrend,
  TimeEfficiencyPattern,
  FatigueEffect,
} from './common';

// TimeEfficiencyPattern e FatigueEffect movidos para common.ts

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
 * Recomendações automáticas inteligentes
 */
export interface IntelligentRecommendations {
  focusAreas: string[]; // Tópicos que precisam atenção
  nextStudyTime: string; // Quando estudar novamente
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
  completedAt: string;
  createdAt: string;
}

/**
 * Payload para criar estatísticas
 */
export interface CreateStatisticsPayload {
  listId: string;
  userId: string;
  sessionId: string;
  responses: any[]; // Simplified to avoid FSRS dependencies
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
  periodStart: string;
  periodEnd: string;

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
  dateFrom?: string;
  dateTo?: string;
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
