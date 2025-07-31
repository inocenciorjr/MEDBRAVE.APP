import { Timestamp } from 'firebase/firestore';
import { TimeEfficiencyPattern } from './common';

/**
 * Níveis de confiança para predições
 */
export enum PredictionConfidence {
  HIGH = 'HIGH',       // 90%+ certeza
  MEDIUM = 'MEDIUM',   // 70-89% certeza
  LOW = 'LOW'          // 50-69% certeza
}

/**
 * Tendências de performance ao longo do tempo
 */
export enum TrendDirection {
  IMPROVING = 'IMPROVING',     // Melhorando
  STABLE = 'STABLE',           // Estável
  DECLINING = 'DECLINING'      // Piorando
}

// PerformanceTrend movido para common.ts

/**
 * Tipos de recomendação de foco
 */
export enum FocusRecommendationType {
  REVIEW = 'REVIEW',                   // Revisar conceitos
  PRACTICE = 'PRACTICE',               // Praticar mais
  TIME_MANAGEMENT = 'TIME_MANAGEMENT', // Melhorar gestão de tempo
  FSRS_ADD = 'FSRS_ADD',              // Adicionar ao FSRS
  BREAK = 'BREAK'                      // Fazer pausa
}

/**
 * Predição de accuracy para próxima lista
 */
export interface AccuracyPrediction {
  predicted: number; // 78 (percentual)
  confidence: PredictionConfidence;
  basedOn: string; // "Últimas 5 listas + padrão de retenção"
  range: string; // "75-82%" (margem de erro)
  methodology: string; // Como foi calculado
  dataPoints: number; // Quantos dados foram usados
}

/**
 * Análise de tendências (não metas, mas tendências identificadas)
 */
export interface TrendAnalysis {
  accuracyTrend: TrendDirection;
  speedTrend: TrendDirection;
  consistencyTrend: TrendDirection;
  trendDescription: string; // "Melhorando 2% por semana"
  timeframe: string; // "Últimas 4 semanas"
  significance: 'HIGH' | 'MEDIUM' | 'LOW'; // Quão significativa é a tendência
}

/**
 * Tempo ótimo baseado nos dados históricos do usuário
 */
export interface OptimalStudyTime {
  dailyMinutes: number; // 45
  bestTimeOfDay: string; // "14:00-16:00"
  sessionLength: number; // 25 questões
  calculation: string; // "Baseado em suas 50 últimas sessões"
  reasoning: string; // "Você tem 15% mais acerto neste horário"
  confidence: PredictionConfidence;
  sampleSize: number; // Quantas sessões analisadas
}

/**
 * Recomendação de área de foco
 */
export interface FocusRecommendation {
  area: string; // "Cardiologia"
  reason: string; // "Accuracy caiu 10% nas últimas 3 semanas"
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  suggestedAction: string; // "Revisar conceitos básicos"
  type: FocusRecommendationType;
  estimatedImpact: number; // 0-1 (impacto esperado)
  timeframe: string; // "2-3 semanas"
}

/**
 * Análise de velocidade de aprendizado personalizada
 */
export interface LearningVelocityAnalysis {
  questionsPerHour: number;
  retentionRate: number; // Taxa de retenção após primeira exposição
  masteryTime: number; // Tempo médio para dominar uma questão (dias)
  forgettingRate: number; // Taxa de esquecimento sem revisão
  learningEfficiency: number; // 0-1 (quão eficiente é o aprendizado)
  comparison: {
    vsAverage: number; // +15% = 15% acima da média
    percentile: number; // 85 = está no percentil 85
  };
}

/**
 * Curva de esquecimento personalizada
 */
export interface PersonalForgettingCurve {
  halfLife: number; // Dias até 50% de retenção
  retentionAfter1Day: number; // % retido após 1 dia
  retentionAfter1Week: number; // % retido após 1 semana
  retentionAfter1Month: number; // % retido após 1 mês
  curveType: 'FAST_FORGETTER' | 'AVERAGE' | 'SLOW_FORGETTER';
  recommendation: string;
}

/**
 * Recomendações de intervalos otimizados
 */
export interface OptimalIntervalRecommendations {
  initialInterval: number; // Dias para primeira revisão
  growthFactor: number; // Fator de crescimento dos intervalos
  maxInterval: number; // Intervalo máximo
  difficultyAdjustment: number; // Ajuste para questões difíceis
  personalizedFactors: {
    forgettingRate: number;
    retentionTarget: number; // Taxa de retenção desejada
  };
}

/**
 * Análise de pontos fortes e fracos
 */
export interface StrengthWeaknessAnalysis {
  strengths: Array<{
    area: string;
    accuracy: number;
    confidence: number;
    consistency: number;
    timeEfficiency: number;
  }>;
  weaknesses: Array<{
    area: string;
    accuracy: number;
    timeSpent: number;
    improvementPotential: number;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
  }>;
  recommendations: Array<{
    type: 'LEVERAGE_STRENGTH' | 'IMPROVE_WEAKNESS';
    message: string;
    actionItems: string[];
  }>;
}

/**
 * Recomendações de gestão de tempo
 */
export interface TimeManagementAdvice {
  currentPattern: TimeEfficiencyPattern;
  averageTimePerQuestion: number;
  optimalTimeRange: {
    min: number;
    max: number;
  };
  specificAdvice: Array<{
    situation: string; // "Questões que não souber"
    advice: string; // "Limite a 2 minutos e siga em frente"
    reason: string; // "Dados mostram que mais tempo não melhora accuracy"
  }>;
  efficiency: {
    current: number; // 0-1
    potential: number; // 0-1
    improvement: string; // "Pode economizar 25% do tempo"
  };
}

/**
 * Predição completa de performance baseada em dados reais
 */
export interface PerformancePrediction {
  // Predição baseada em histórico real
  nextListAccuracy: AccuracyPrediction;
  
  // Tendências identificadas (não metas)
  trends: TrendAnalysis;
  
  // Tempo ótimo baseado em SEUS dados históricos
  optimalStudyTime: OptimalStudyTime;
  
  // Áreas de foco baseadas em dados
  focusRecommendations: FocusRecommendation[];
  
  // Análises avançadas
  learningVelocity: LearningVelocityAnalysis;
  forgettingCurve: PersonalForgettingCurve;
  optimalIntervals: OptimalIntervalRecommendations;
  strengthsWeaknesses: StrengthWeaknessAnalysis;
  timeManagement: TimeManagementAdvice;
  
  // Metadados da predição
  generatedAt: Timestamp;
  validUntil: Timestamp;
  basedOnSessions: number;
  confidence: PredictionConfidence;
}

/**
 * Payload para geração de predição
 */
export interface GeneratePredictionPayload {
  userId: string;
  includeAdvancedAnalysis?: boolean;
  timeframeWeeks?: number; // Quantas semanas de dados usar
  focusAreas?: string[]; // Áreas específicas para analisar
}

/**
 * Histórico de predições para validação
 */
export interface PredictionValidation {
  predictionId: string;
  predictedAccuracy: number;
  actualAccuracy: number;
  accuracyError: number; // Diferença absoluta
  confidenceLevel: PredictionConfidence;
  predictionDate: Timestamp;
  validationDate: Timestamp;
  wasAccurate: boolean; // Se ficou dentro da margem
}

/**
 * Configurações de predição personalizáveis
 */
export interface PredictionSettings {
  userId: string;
  enablePredictions: boolean;
  confidenceThreshold: PredictionConfidence; // Não mostrar predições abaixo deste nível
  focusOnAreas: string[]; // Áreas específicas de interesse
  timeHorizon: number; // Dias para frente que quer predições
  updateFrequency: 'DAILY' | 'WEEKLY' | 'AFTER_SESSIONS';
}

/**
 * Métricas de qualidade das predições
 */
export interface PredictionQualityMetrics {
  userId: string;
  period: 'LAST_MONTH' | 'LAST_3_MONTHS' | 'ALL_TIME';
  
  totalPredictions: number;
  accuratePredictions: number; // Dentro da margem de erro
  averageError: number;
  confidenceCalibration: {
    high: { predicted: number; actual: number }; // % de acerto para predições HIGH
    medium: { predicted: number; actual: number };
    low: { predicted: number; actual: number };
  };
  
  modelPerformance: {
    meanAbsoluteError: number;
    rootMeanSquareError: number;
    r2Score: number; // Coeficiente de determinação
  };
} 