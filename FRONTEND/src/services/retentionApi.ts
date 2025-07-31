import { fetchWithAuth } from './fetchWithAuth';

const API_BASE = 'http://localhost:5000/api';

// ================= TIPOS DE RESPOSTA =================

export interface TimeEfficiencyAnalysis {
  correctQuestions: {
    averageTimeSeconds: number;
    count: number;
  };
  incorrectQuestions: {
    averageTimeSeconds: number;
    count: number;
  };
  pattern: 'OVERTHINKING_INCORRECT' | 'RUSHING_CORRECT' | 'BALANCED';
  timeRatio: number;
  userMessage: string;
  recommendation: string;
  interpretation: {
    message: string;
    advice: string;
    pattern: string;
  };
}

export interface QuestionConsistencyAnalysis {
  questionId: string;
  previousResult: boolean;
  currentResult: boolean;
  trend: 'IMPROVED' | 'MAINTAINED' | 'REGRESSED';
  message: string;
  impactLevel: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface RetentionAnalysis {
  questionsSeenBefore: number;
  questionsNewToUser: number;
  retentionRate: number;
  improvementRate: number;
  regressionCount: number;
  consistencyAnalysis: QuestionConsistencyAnalysis[];
}

export interface FSRSRecommendation {
  questionId: string;
  reason: 'CONSISTENTLY_INCORRECT' | 'REGRESSION' | 'HIGH_VALUE_TOPIC';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  explanation: string;
  confidence: number;
}

export interface IntelligentRecommendations {
  shouldAddToFSRS: FSRSRecommendation[];
  focusAreas: string[];
  nextStudyTime: string;
  timeManagement: string;
  studyStrategy: string;
}

export interface SessionPatterns {
  accuracyByPosition: number[];
  timeByPosition: number[];
  fatigueEffect: 'NONE' | 'MILD' | 'MODERATE' | 'SEVERE';
  optimalSessionLength: number;
  fatigueThreshold?: number;
}

export interface BasicMetrics {
  totalQuestions: number;
  correctAnswers: number;
  accuracyPercentage: number;
  totalTimeMs: number;
  averageTimePerQuestion: number;
}

export interface ListCompletionStatistics {
  listId: string;
  userId: string;
  sessionId: string;
  basic: BasicMetrics;
  timeEfficiency: TimeEfficiencyAnalysis;
  retention: RetentionAnalysis;
  patterns: SessionPatterns;
  recommendations: IntelligentRecommendations;
  completedAt: string;
  createdAt: string;
}

export interface RetentionDashboard {
  overview: {
    totalQuestionsTracked: number;
    masteredQuestions: number;
    decliningQuestions: number;
    learningQuestions: number;
    inconsistentQuestions: number;
  };
  alerts: Array<{
    questionId: string;
    type: string;
    message: string;
    recommendation: string;
    priority: string;
  }>;
  achievements: Array<{
    id: string;
    title: string;
    description: string;
    achievedAt: string;
  }>;
  recommendations: Array<{
    type: string;
    message: string;
    actionable: boolean;
  }>;
}

export interface PerformancePrediction {
  nextListAccuracy: {
    predicted: number;
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    basedOn: string;
    range: string;
    methodology: string;
    dataPoints: number;
  };
  trends: {
    accuracyTrend: 'IMPROVING' | 'STABLE' | 'DECLINING';
    speedTrend: 'IMPROVING' | 'STABLE' | 'DECLINING';
    consistencyTrend: 'IMPROVING' | 'STABLE' | 'DECLINING';
    trendDescription: string;
  };
  optimalStudyTime: {
    dailyMinutes: number;
    bestTimeOfDay: string;
    sessionLength: number;
    calculation: string;
    reasoning: string;
  };
  focusRecommendations: Array<{
    area: string;
    reason: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    suggestedAction: string;
  }>;
}

// ================= SERVIÇOS DE API =================

export class RetentionApiService {
  
  // Estatísticas de conclusão de lista
  static async getListCompletionStatistics(listId: string): Promise<ListCompletionStatistics> {
    const response = await fetchWithAuth(`${API_BASE}/retention/list/${listId}/statistics`);
    if (!response.ok) {
      throw new Error('Erro ao buscar estatísticas da lista');
    }
    return response.json();
  }

  // Dashboard de retenção principal
  static async getRetentionDashboard(): Promise<RetentionDashboard> {
    const response = await fetchWithAuth(`${API_BASE}/retention/dashboard`);
    if (!response.ok) {
      throw new Error('Erro ao buscar dashboard de retenção');
    }
    return response.json();
  }

  // Predição de performance
  static async getPerformancePrediction(): Promise<PerformancePrediction> {
    const response = await fetchWithAuth(`${API_BASE}/retention/prediction`);
    if (!response.ok) {
      throw new Error('Erro ao buscar predição de performance');
    }
    return response.json();
  }

  // Histórico de retenção de uma questão específica
  static async getQuestionRetentionHistory(questionId: string) {
    const response = await fetchWithAuth(`${API_BASE}/retention/question/${questionId}/history`);
    if (!response.ok) {
      throw new Error('Erro ao buscar histórico de retenção da questão');
    }
    return response.json();
  }

  // Adicionar questões selecionadas ao FSRS
  static async addQuestionsToFSRS(
    questionIds: string[], 
    strategy: 'ALL' | 'INCORRECT_ONLY' | 'CORRECT_ONLY' | 'INTELLIGENT_SELECTION' = 'INTELLIGENT_SELECTION'
  ) {
    const response = await fetchWithAuth(`${API_BASE}/retention/fsrs/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionIds, strategy }),
    });
    if (!response.ok) {
      throw new Error('Erro ao adicionar questões ao FSRS');
    }
    return response.json();
  }

  // Buscar estatísticas agregadas por período
  static async getStatisticsAggregation(period: 'DAILY' | 'WEEKLY' | 'MONTHLY') {
    const response = await fetchWithAuth(`${API_BASE}/questions/statistics/aggregation?period=${period}`);
    if (!response.ok) {
      throw new Error('Erro ao buscar estatísticas agregadas');
    }
    return response.json();
  }

  // Comparação entre sessões
  static async getSessionComparison(currentSessionId: string, previousSessionId?: string) {
    const url = previousSessionId 
      ? `${API_BASE}/questions/statistics/compare?current=${currentSessionId}&previous=${previousSessionId}`
      : `${API_BASE}/questions/statistics/compare?current=${currentSessionId}`;
    
    const response = await fetchWithAuth(url);
    if (!response.ok) {
      throw new Error('Erro ao buscar comparação de sessões');
    }
    return response.json();
  }
}

export default RetentionApiService; 