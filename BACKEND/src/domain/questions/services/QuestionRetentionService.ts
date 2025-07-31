import { firestore } from 'firebase-admin';
import { Timestamp } from 'firebase/firestore';
import {
  QuestionRetentionRecord,
  RetentionAttempt,
  LearningPattern,
  RetentionDashboard,
  LearningPhase
} from '../types/retention';
import { PerformancePrediction, PredictionConfidence, TrendDirection } from '../types/prediction';
import { TimeEfficiencyPattern } from '../types/common';
import { generateQuestionRetentionId } from '../../../utils/idGenerator';


const RETENTION_COLLECTION = 'questionRetentions';

export class QuestionRetentionService {
  private db: firestore.Firestore;

  constructor(db: firestore.Firestore) {
    this.db = db;
  }

  async updateRetention(userId: string, questionId: string, attempt: RetentionAttempt): Promise<QuestionRetentionRecord> {
    const docId = generateQuestionRetentionId(userId, questionId);
    const docRef = this.db.collection(RETENTION_COLLECTION).doc(docId);
    const doc = await docRef.get();
    let record: QuestionRetentionRecord;
    if (doc.exists) {
      record = doc.data() as QuestionRetentionRecord;
      record.attempts.push(attempt);
      record.updatedAt = Timestamp.now();
    } else {
      record = {
        id: docId,
        userId,
        questionId,
        attempts: [attempt],
        metrics: {
          totalAttempts: 1,
          correctAttempts: attempt.correct ? 1 : 0,
          retentionRate: attempt.correct ? 1 : 0,
          averageResponseTime: attempt.responseTimeMs,
          lastCorrectDate: attempt.correct ? attempt.date : undefined,
          longestCorrectStreak: attempt.correct ? 1 : 0,
          currentStreak: attempt.correct ? 1 : 0
        },
        learningPattern: {
          phase: LearningPhase.LEARNING,
          consistencyAfterTurning: 0,
          regressionAlert: false,
          patternMessage: 'Primeira tentativa registrada',
          recommendation: 'Continue praticando'
        },
        patterns: {
          averageDaysBetweenAttempts: 0,
          forgettingCurve: 1
        },
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };
    }
    // Atualizar métricas e padrão de aprendizado
    record.metrics = this.calculateMetrics(record.attempts);
    record.learningPattern = this.analyzeLearningPattern(record.attempts);
    await docRef.set(record);
    return record;
  }

  private calculateMetrics(attempts: RetentionAttempt[]) {
    const totalAttempts = attempts.length;
    const correctAttempts = attempts.filter(a => a.correct).length;
    const retentionRate = correctAttempts / totalAttempts;
    const averageResponseTime = Math.round(attempts.reduce((sum, a) => sum + a.responseTimeMs, 0) / totalAttempts);
    const lastCorrect = attempts.filter(a => a.correct).pop();
    let longestCorrectStreak = 0, currentStreak = 0, streak = 0;
    for (const a of attempts) {
      if (a.correct) {
        streak++;
        if (streak > longestCorrectStreak) longestCorrectStreak = streak;
      } else {
        streak = 0;
      }
    }
    // Atual streak
    currentStreak = streak;
    return {
      totalAttempts,
      correctAttempts,
      retentionRate,
      averageResponseTime,
      lastCorrectDate: lastCorrect ? lastCorrect.date : undefined,
      longestCorrectStreak,
      currentStreak
    };
  }

  private analyzeLearningPattern(attempts: RetentionAttempt[]): LearningPattern {
    if (attempts.length < 2) {
      return {
        phase: LearningPhase.LEARNING,
        patternMessage: 'Primeira tentativa registrada',
        recommendation: 'Continue praticando',
        consistencyAfterTurning: 0,
        regressionAlert: false
      };
    }
    let turningPoint: Timestamp | undefined;
    let consistencyAfterTurning = 0;
    for (let i = 1; i < attempts.length; i++) {
      const prevIncorrect = !attempts[i-1].correct;
      const currentCorrect = attempts[i].correct;
      if (prevIncorrect && currentCorrect && !turningPoint) {
        turningPoint = attempts[i].date;
      }
    }
    const recentAttempts = attempts.slice(-5);
    const wasConsistentlyCorrect = recentAttempts.slice(0, -1).every(a => a.correct);
    const lastIncorrect = !recentAttempts[recentAttempts.length - 1].correct;
    const regressionAlert = wasConsistentlyCorrect && lastIncorrect;
    let phase: LearningPhase;
    let patternMessage: string;
    let recommendation: string;
    if (regressionAlert) {
      phase = LearningPhase.REGRESSION;
      patternMessage = 'Você dominava esta questão, mas regrediu hoje. Pode precisar revisar o tema.';
      recommendation = 'Revisar conceitos fundamentais deste tópico';
    } else if (turningPoint && recentAttempts.every(a => a.correct)) {
      phase = LearningPhase.MASTERED;
      patternMessage = `Dominou esta questão desde ${turningPoint.toDate().toLocaleDateString()}`;
      recommendation = 'Continue revisando periodicamente para manter o conhecimento';
    } else if (turningPoint) {
      phase = LearningPhase.LEARNING;
      patternMessage = 'Em processo de consolidação do conhecimento';
      recommendation = 'Continue praticando para solidificar o aprendizado';
    } else {
      phase = LearningPhase.INCONSISTENT;
      patternMessage = 'Padrão inconsistente - alterna entre acertos e erros';
      recommendation = 'Foque em entender os conceitos fundamentais';
    }
    return {
      phase,
      turningPoint,
      consistencyAfterTurning,
      regressionAlert,
      patternMessage,
      recommendation
    };
  }

  async getRetentionRecord(userId: string, questionId: string): Promise<QuestionRetentionRecord | null> {
    const docId = `${userId}_${questionId}`;
    const doc = await this.db.collection(RETENTION_COLLECTION).doc(docId).get();
    if (!doc.exists) return null;
    return doc.data() as QuestionRetentionRecord;
  }

  async getUserRetentions(userId: string): Promise<QuestionRetentionRecord[]> {
    const snapshot = await this.db.collection(RETENTION_COLLECTION)
      .where('userId', '==', userId)
      .get();
    return snapshot.docs.map(doc => doc.data() as QuestionRetentionRecord);
  }

  async getRetentionDashboard(userId: string): Promise<RetentionDashboard> {
    const allRetentions = await this.getUserRetentions(userId);
    return {
      overview: {
        totalQuestionsTracked: allRetentions.length,
        masteredQuestions: allRetentions.filter(r => r.learningPattern.phase === LearningPhase.MASTERED).length,
        decliningQuestions: allRetentions.filter(r => r.learningPattern.phase === LearningPhase.REGRESSION).length,
        learningQuestions: allRetentions.filter(r => r.learningPattern.phase === LearningPhase.LEARNING).length,
        inconsistentQuestions: allRetentions.filter(r => r.learningPattern.phase === LearningPhase.INCONSISTENT).length
      },
      alerts: allRetentions
        .filter(r => r.learningPattern.regressionAlert)
        .map(r => ({
          questionId: r.questionId,
          type: 'REGRESSION',
          message: r.learningPattern.patternMessage,
          recommendation: r.learningPattern.recommendation,
          priority: 'HIGH'
        })),
      achievements: [],
      recommendations: []
    };
  }

  async predictPerformance(): Promise<PerformancePrediction> {
    // Implementação básica - pode ser expandida no futuro
    return {
      nextListAccuracy: {
        predicted: 75,
        confidence: PredictionConfidence.MEDIUM,
        basedOn: 'Dados históricos limitados',
        range: '70-80%',
        methodology: 'Análise simplificada',
        dataPoints: 10
      },
      trends: {
        accuracyTrend: TrendDirection.STABLE,
        speedTrend: TrendDirection.STABLE,
        consistencyTrend: TrendDirection.STABLE,
        trendDescription: 'Dados insuficientes para análise',
        timeframe: '30 dias',
        significance: 'LOW'
      },
      optimalStudyTime: {
        dailyMinutes: 30,
        bestTimeOfDay: '14:00-16:00',
        sessionLength: 20,
        calculation: 'Estimativa padrão',
        reasoning: 'Baseado em médias gerais',
        confidence: PredictionConfidence.MEDIUM,
        sampleSize: 10
      },
      focusRecommendations: [],
      learningVelocity: {
        questionsPerHour: 20,
        retentionRate: 0.8,
        masteryTime: 7,
        forgettingRate: 0.2,
        learningEfficiency: 0.7,
        comparison: { vsAverage: 0, percentile: 50 }
      },
      forgettingCurve: {
        halfLife: 7,
        retentionAfter1Day: 0.9,
        retentionAfter1Week: 0.8,
        retentionAfter1Month: 0.7,
        curveType: 'AVERAGE',
        recommendation: ''
      },
      optimalIntervals: {
        initialInterval: 1,
        growthFactor: 2,
        maxInterval: 30,
        difficultyAdjustment: 1,
        personalizedFactors: { forgettingRate: 0.2, retentionTarget: 0.8 }
      },
      strengthsWeaknesses: {
        strengths: [],
        weaknesses: [],
        recommendations: []
      },
      timeManagement: {
        currentPattern: TimeEfficiencyPattern.BALANCED,
        averageTimePerQuestion: 60,
        optimalTimeRange: { min: 30, max: 90 },
        specificAdvice: [],
        efficiency: { current: 0.7, potential: 0.9, improvement: '' }
      },
      generatedAt: Timestamp.now(),
      validUntil: Timestamp.now(),
      basedOnSessions: 10,
      confidence: PredictionConfidence.MEDIUM
    };
  }
}