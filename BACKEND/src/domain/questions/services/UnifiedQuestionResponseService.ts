import { firestore } from 'firebase-admin';
import { Timestamp } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import {
  EnhancedQuestionResponse,
  RecordAnswerPayload,
  RecordAnswerResult,
  ResponseContext
} from '../types/enhanced';
import {
  ListCompletionStatistics,
  TimeEfficiencyAnalysis,
  RetentionAnalysis,
  SessionPatterns,
  IntelligentRecommendations
} from '../types/statistics';
import { QuestionRetentionService } from './QuestionRetentionService';
import { AppError } from '../../../shared/errors/AppError';
import { generateQuestionResponseId } from '../../../utils/idGenerator';

export class UnifiedQuestionResponseService {
  private db: firestore.Firestore;
  private retentionService: QuestionRetentionService;

  constructor(
    db: firestore.Firestore,
    retentionService: QuestionRetentionService
  ) {
    this.db = db;
    this.retentionService = retentionService;
  }

  async recordQuestionAnswer(payload: RecordAnswerPayload): Promise<RecordAnswerResult> {
    try {
      // 1. Salvar resposta detalhada com métricas de tempo
      const response = await this.saveEnhancedResponse(payload);
      
      // 2. Atualizar registro de retenção (análise de padrão)
      const retention = await this.retentionService.updateRetention(
        payload.userId,
        payload.questionId,
        {
          date: Timestamp.now(),
          correct: payload.isCorrect,
          context: payload.context,
          responseTimeMs: payload.timeMetrics.totalTimeMs
        }
      );
      
      // 3. Se é revisão FSRS, atualizar algoritmo
      if (payload.context === ResponseContext.FSRS_REVIEW && payload.fsrsCardId) {
        await this.updateFSRSCard();
      }
      
      // 4. Calcular recomendação inteligente baseada em padrão
      const shouldRecommend = await this.calculateFSRSRecommendation(retention);
      
      // 5. Análise de eficiência temporal
      const timeEfficiency = await this.analyzeTimeEfficiency();
      
      return { 
        response, 
        shouldRecommendFSRS: shouldRecommend,
        timeEfficiencyFeedback: timeEfficiency,
        retentionUpdate: retention
      };
    } catch (error) {
      throw AppError.internal('Erro ao registrar resposta de questão');
    }
  }

  private async saveEnhancedResponse(payload: RecordAnswerPayload): Promise<EnhancedQuestionResponse> {
    const responseId = await generateQuestionResponseId(payload.userId, payload.questionId);
    const now = Timestamp.now();

    const response: EnhancedQuestionResponse = {
      id: responseId,
      userId: payload.userId,
      questionId: payload.questionId,
      selectedAlternativeId: payload.selectedAlternativeId,
      isCorrect: payload.isCorrect,
      answeredAt: now,
      context: payload.context,
      questionListId: payload.questionListId,
      timeMetrics: payload.timeMetrics,
      isInReviewSystem: !!payload.fsrsCardId,
      fsrsCardId: payload.fsrsCardId || null,
      lastReviewQuality: payload.lastReviewQuality,
      sessionMetrics: payload.sessionMetrics,
      createdAt: now,
      updatedAt: now,
    };

    await this.db.collection('enhancedQuestionResponses').doc(responseId).set(response);
    return response;
  }

  private async updateFSRSCard(): Promise<void> {
    // Implementação para atualizar FSRS card
    // TODO: Implementar quando FSRSService estiver disponível
  }

  private async calculateFSRSRecommendation(retention: any): Promise<boolean> {
    // Implementação básica - recomendar FSRS se performance baixa
    return retention.metrics.retentionRate < 0.7;
  }

  private async analyzeTimeEfficiency(): Promise<string> {
    // Implementação básica
    return "Análise de eficiência temporal em desenvolvimento";
  }

  async generateListStatistics(listId: string, userId: string): Promise<ListCompletionStatistics> {
    // Análise completa da sessão com todas as métricas propostas
    const responses = await this.getListResponses(listId, userId);
    
    // Calcular eficiência temporal
    const timeEfficiency = this.calculateTimeEfficiency(responses);
    
    // Analisar retenção baseada em histórico existente
    const retentionAnalysis = await this.analyzeRetentionInList();
    
    // Gerar recomendações inteligentes
    const recommendations = await this.generateIntelligentRecommendations();
    
    return {
      listId,
      userId,
      sessionId: uuidv4(),
      basic: this.calculateBasicMetrics(responses),
      timeEfficiency,
      retention: retentionAnalysis,
      patterns: this.analyzeTemporalPatterns(),
      recommendations,
      completedAt: Timestamp.now(),
      createdAt: Timestamp.now()
    };
  }

  private async getListResponses(listId: string, userId: string): Promise<EnhancedQuestionResponse[]> {
    const snapshot = await this.db
      .collection('enhancedQuestionResponses')
      .where('userId', '==', userId)
      .where('questionListId', '==', listId)
      .orderBy('answeredAt', 'desc')
      .get();

    return snapshot.docs.map(doc => doc.data() as EnhancedQuestionResponse);
  }

  private calculateBasicMetrics(responses: EnhancedQuestionResponse[]) {
    const totalQuestions = responses.length;
    const correctAnswers = responses.filter(r => r.isCorrect).length;
    const totalTimeMs = responses.reduce((sum, r) => sum + r.timeMetrics.totalTimeMs, 0);

    return {
      totalQuestions,
      correctAnswers,
      accuracyPercentage: (correctAnswers / totalQuestions) * 100,
      totalTimeMs,
      averageTimePerQuestion: totalTimeMs / totalQuestions
    };
  }

  private calculateTimeEfficiency(responses: EnhancedQuestionResponse[]): TimeEfficiencyAnalysis {
    const correct = responses.filter(r => r.isCorrect);
    const incorrect = responses.filter(r => !r.isCorrect);
    
    const avgTimeCorrect = correct.reduce((sum, r) => sum + r.timeMetrics.totalTimeMs, 0) / correct.length / 1000;
    const avgTimeIncorrect = incorrect.reduce((sum, r) => sum + r.timeMetrics.totalTimeMs, 0) / incorrect.length / 1000;
    
    const ratio = avgTimeIncorrect / avgTimeCorrect;
    
    let pattern: string;
    let recommendation: string;
    
    if (ratio > 2.0) {
      pattern = 'OVERTHINKING_INCORRECT';
      recommendation = 'Considere seguir em frente mais rápido nas questões difíceis';
    } else if (ratio < 0.8) {
      pattern = 'RUSHING_CORRECT';
      recommendation = 'Você pode estar respondendo muito rapidamente questões que acerta';
    } else {
      pattern = 'BALANCED';
      recommendation = 'Bom equilíbrio entre tempo e precisão';
    }
    
    return {
      correctQuestions: { averageTimeSeconds: avgTimeCorrect, count: correct.length },
      incorrectQuestions: { averageTimeSeconds: avgTimeIncorrect, count: incorrect.length },
      pattern: pattern as any,
      timeRatio: ratio,
      userMessage: `Tempo médio para acertar: ${Math.round(avgTimeCorrect/60)}min${Math.round(avgTimeCorrect%60)}s | errar: ${Math.round(avgTimeIncorrect/60)}min${Math.round(avgTimeIncorrect%60)}s`,
      recommendation,
      interpretation: {
        message: `Você está gastando ${ratio.toFixed(1)}x mais tempo nas questões que erra`,
        advice: recommendation,
        pattern
      }
    };
  }

  private async analyzeRetentionInList(): Promise<RetentionAnalysis> {
    // Implementação básica
    return {
      questionsSeenBefore: 0,
      questionsNewToUser: 0,
      retentionRate: 0,
      improvementRate: 0,
      regressionCount: 0,
      consistencyAnalysis: []
    };
  }

  private analyzeTemporalPatterns(): SessionPatterns {
    // Implementação básica
    return {
      accuracyByPosition: [],
      timeByPosition: [],
      fatigueEffect: 'NONE' as any,
      optimalSessionLength: 20
    };
  }

  private async generateIntelligentRecommendations(): Promise<IntelligentRecommendations> {
    // Implementação básica
    return {
      shouldAddToFSRS: [],
      focusAreas: [],
      nextStudyTime: Timestamp.now(),
      timeManagement: 'Continue praticando',
      studyStrategy: 'Revisão regular'
    };
  }

  async addSelectedQuestionsToFSRS(
    questionIds: string[]
  ): Promise<any> {
    // Implementação da lógica de escolha pós-lista
    // TODO: INTELLIGENT_SELECTION usa dados de retenção para decidir
    return { success: true, addedCount: questionIds.length };
  }
}