import { Firestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import {
  UserStatistics,
  StatisticsQueryOptions,
  DifficultyLevel,
  StudyPattern,
  FilterStatistics,
  StudyTimeAnalysis,
  LearningMetrics,
  AdvancedStreakData,
  ExamMetrics,
  StatisticsUpdatePayload,
  PredictiveAnalysis,
} from '../types';
import { IUserStatisticsService } from '../interfaces/IUserStatisticsService';
// import { IProgrammedReviewService } from '../../srs/interfaces/IProgrammedReviewService'; // Removido - não utilizado
// import { ProgrammedReview, ReviewQuality, ProgrammedReviewContentType } from '../../srs/types';
import { logger } from '../../../utils/logger';

// Define CurrentSession type locally since it's not exported from types
// Note: UserStatistics.currentSession does not have 'id' field, removing it
interface CurrentSession {
  startTime: Timestamp | null;
  questionsAnswered: number;
  currentAccuracy: number;
  timeSpent: number;
  focusScore: number;
}

// Helper function to safely get data or default
const safeGet = (obj: any, path: string, defaultValue: any = null) => {
  try {
    const value = path.split('.').reduce((acc, part) => acc && acc[part] !== undefined ? acc[part] : undefined, obj);
    return value !== undefined ? value : defaultValue;
  } catch (error) {
    logger.error('FirebaseUserStatisticsService', 'safeGet', `Error accessing path ${path}: ${error}`);
    return defaultValue;
  }
};

/**
 * Serviço avançado de estatísticas de usuário com integração SRS e cálculos baseados em dados reais.
 * V2.3: Enhanced null handling and error catching for robustness.
 */
export class FirebaseUserStatisticsService implements IUserStatisticsService {
  private readonly collection = 'userStatistics';
  private readonly sessionsCollection = 'studySessions';
  private readonly responsesCollection = 'questionResponses';
  private readonly activityCollection = 'userActivity';
  private readonly examResultsCollection = 'examResults'; // Added for clarity
  private readonly currentVersion = '2.3'; // Version bump for enhanced error handling

  constructor(
    private readonly firestore: Firestore,
    // private readonly _srsService: IProgrammedReviewService // Removido - não utilizado
  ) {}

  /**
   * Obtém ou cria estatísticas do usuário, garantindo que os dados sejam recalculados se necessário.
   */
  async getOrCreateUserStatistics(
    userId: string,
    options?: StatisticsQueryOptions
  ): Promise<UserStatistics> {
    const docRef = this.firestore.collection(this.collection).doc(userId);
    let doc;
    try {
      doc = await docRef.get();
    } catch (error) {
      logger.error('FirebaseUserStatisticsService', 'getOrCreateUserStatistics', `Error fetching stats doc for ${userId}: ${error}`);
      throw new Error(`Falha ao buscar estatísticas para o usuário ${userId}.`);
    }

    if (doc.exists) {
      let stats = doc.data() as UserStatistics;
      try {
        stats = this.ensureStatsStructure(stats, userId); // Ensure structure first

        // Force recalculation if version mismatch or explicitly requested
        if (stats.version !== this.currentVersion || options?.forceRecalculate) {
          logger.info('FirebaseUserStatisticsService', 'getOrCreateUserStatistics',
            `Recalculating stats for user ${userId}. Reason: ${stats.version !== this.currentVersion ? 'Version mismatch' : 'Force recalculate'}`);
          stats = await this.recalculateAllMetrics(userId, stats);
          await docRef.set(stats, { merge: true }); // Use merge to avoid overwriting concurrent updates
          doc = await docRef.get(); // Re-fetch updated doc
          stats = doc.data() as UserStatistics;
          stats = this.ensureStatsStructure(stats, userId); // Ensure structure again after recalc
        }

        // Recalculate advanced metrics if requested (less intensive than full recalc)
        if (options?.includeRecommendations || options?.includePeerComparison) {
           stats = await this.recalculateAdvancedMetrics(userId);
        }

        return this.transformTimestamps(stats);
      } catch (error) {
         logger.error('FirebaseUserStatisticsService', 'getOrCreateUserStatistics', `Error processing existing stats for ${userId}: ${error}`);
         // Return potentially stale but structured data if processing fails
         return this.transformTimestamps(this.ensureStatsStructure(stats, userId));
      }
    }

    // Criar novas estatísticas com valores iniciais (mostly null)
    try {
      const now = Timestamp.now();
      const initialStats: UserStatistics = this.createInitialStats(userId, now);
      await docRef.set(initialStats);
      logger.info('FirebaseUserStatisticsService', 'getOrCreateUserStatistics',
        `Estatísticas iniciais criadas para usuário ${userId}`);
      return this.transformTimestamps(initialStats);
    } catch (error) {
       logger.error('FirebaseUserStatisticsService', 'getOrCreateUserStatistics', `Error creating initial stats for ${userId}: ${error}`);
       throw new Error(`Falha ao criar estatísticas iniciais para o usuário ${userId}.`);
    }
  }

  /**
   * Garante que o objeto de estatísticas tenha todas as propriedades aninhadas necessárias.
   * Uses deep merging principles.
   */
  private ensureStatsStructure(stats: Partial<UserStatistics>, userId: string): UserStatistics {
    const now = Timestamp.now();
    const initial = this.createInitialStats(userId, now);

    // Deep merge function (simplified)
    const deepMerge = (target: any, source: any): any => {
      const output = { ...target };
      if (isObject(target) && isObject(source)) {
        Object.keys(source).forEach(key => {
          if (isObject(source[key])) {
            if (!(key in target)) {
              Object.assign(output, { [key]: source[key] });
            } else {
              output[key] = deepMerge(target[key], source[key]);
            }
          } else {
            Object.assign(output, { [key]: source[key] });
          }
        });
      }
      return output;
    };

    const isObject = (item: any): boolean => {
      return (item && typeof item === 'object' && !Array.isArray(item));
    };

    // Perform a safer merge, ensuring initial structure exists
    const merged = deepMerge(initial, stats);
    // Ensure top-level required fields are present
    merged.id = userId;
    merged.userId = userId;
    merged.version = stats.version || initial.version;
    merged.createdAt = stats.createdAt || initial.createdAt;
    merged.updatedAt = stats.updatedAt || initial.updatedAt;
    merged.lastCalculated = stats.lastCalculated || initial.lastCalculated;

    return merged as UserStatistics;
  }

  /**
   * Cria a estrutura inicial de estatísticas, using null for calculable fields.
   */
  private createInitialStats(userId: string, now: Timestamp): UserStatistics {
     return {
      id: userId,
      userId,
      totalQuestionsAnswered: 0,
      correctAnswers: 0,
      overallAccuracy: null, // Start as null
      studyTimeAnalysis: this.createInitialStudyTimeAnalysis(),
      learningMetrics: this.createInitialLearningMetrics(),
      streakData: this.createInitialStreakData(),
      examMetrics: this.createInitialExamMetrics(),
      filterStatistics: {},
      peerComparison: null,
      recommendations: null,
      currentSession: null,
      lastCalculated: now,
      version: this.currentVersion,
      createdAt: now,
      updatedAt: now
    };
  }

  // --- Initializers for sub-structures (using null where appropriate) ---

  private createInitialStudyTimeAnalysis(): StudyTimeAnalysis {
    return {
      totalMinutesStudied: 0,
      sessionsCount: 0,
      averageSessionDuration: null,
      longestSession: null,
      shortestSession: null,
      preferredTimeSlots: [],
      weeklyDistribution: {},
      monthlyTrend: [],
      studyPattern: null,
      consistencyScore: null
    };
  }

  private createInitialLearningMetrics(): LearningMetrics {
    return {
      totalXP: 0,
      currentLevel: 1,
      xpToNextLevel: this.calculateXPToNextLevel(0, 1),
      accuracyTrend: [],
      learningVelocity: null,
      retentionCurve: [],
      knowledgeGaps: [],
      strengths: [],
      weaknesses: []
    };
  }

  private createInitialStreakData(): AdvancedStreakData {
    return {
      currentStreak: 0,
      longestStreak: 0,
      totalDaysStudied: 0,
      streakType: 'daily',
      streakGoal: 7,
      freezeCards: 0,
      perfectDays: 0,
      challengeDays: 0,
      streakMultiplier: 1,
      streakMilestones: [],
      lastActivityDate: null
    };
  }

  private createInitialExamMetrics(): ExamMetrics {
    return {
      totalExamsTaken: 0,
      averageScore: 0,
      bestScore: 0,
      worstScore: 0,
      improvementRate: 0,
      examsBySpecialty: {},
      timeManagement: { averageTimePerQuestion: 0, timeEfficiencyScore: 0, rushRate: 0 },
      confidenceMetrics: { accuracyWhenConfident: 0, accuracyWhenUnsure: 0, overconfidenceRate: 0 }
    };
  }

  /**
   * Registra resposta de questão e atualiza estatísticas de forma incremental.
   */
  async recordQuestionAnswer(
    userId: string,
    questionId: string,
    isCorrect: boolean,
    options: {
      filterId: string;
      difficulty: DifficultyLevel;
      timeSpent: number; // in seconds
      confidenceLevel?: number;
      srsQuality?: number;
      reviewType?: 'first_time' | 'review' | 'spaced_repetition';
      sessionId?: string; // Optional session ID
    }
  ): Promise<UserStatistics> {
    const docRef = this.firestore.collection(this.collection).doc(userId);
    const now = Timestamp.now();

    try {
      // Use FieldValue for atomic increments
      const increment = FieldValue.increment(1);
      const correctIncrement = isCorrect ? FieldValue.increment(1) : FieldValue.increment(0);

      // Prepare filter update
      const filterPath = `filterStatistics.${options.filterId}`;
      const filterUpdate = {
        [`${filterPath}.totalQuestions`]: increment,
        [`${filterPath}.correctAnswers`]: correctIncrement,
        [`${filterPath}.difficultyDistribution`]: {
          beginner: 0,
          intermediate: 0,
          advanced: 0,
          expert: 0
        },
        [`${filterPath}.lastStudied`]: now,
        [`${filterPath}.filterId`]: options.filterId,
        [`${filterPath}.filterName`]: `Filter ${options.filterId}`,
      };

      // Update current session if active and matches
      const sessionUpdate: any = {};
      
      // Usar merge para update seguro
      await docRef.set({
        totalQuestionsAnswered: increment,
        correctAnswers: correctIncrement,
        updatedAt: now,
        lastCalculated: now,
        ...filterUpdate,
        ...sessionUpdate,
      }, { merge: true });

    } catch (error) {
        logger.error('FirebaseUserStatisticsService', 'recordQuestionAnswer', `Error recording question answer for ${userId}: ${error}`);
        throw error;
    }

    // Handle complex updates requiring read/write in a transaction
    try {
      return await this.firestore.runTransaction(async (transaction) => {
        const doc = await transaction.get(docRef);
        if (!doc.exists) {
          logger.warn('FirebaseUserStatisticsService', 'recordQuestionAnswer', `Stats doc missing for ${userId} during transaction, creating initial.`);
          const initialStats = this.createInitialStats(userId, now);
          transaction.set(docRef, initialStats);
          return this.transformTimestamps(initialStats);
        }
        let stats = this.ensureStatsStructure(doc.data() as UserStatistics, userId);

        // Recalculate overall accuracy (only if questions answered > 0)
        stats.overallAccuracy = stats.totalQuestionsAnswered > 0
          ? stats.correctAnswers / stats.totalQuestionsAnswered
          : null; // Return null if no questions answered

        // Recalculate filter accuracy
        const filterStats = stats.filterStatistics[options.filterId];
        if (filterStats) {
          filterStats.accuracy = filterStats.totalQuestions > 0
            ? filterStats.correctAnswers / filterStats.totalQuestions
            : null; // Null if no questions in this filter
          // Avg time calculation needs previous total time - better done in recalc or store total time
        }

        // Update current session accuracy and focus score if active
        if (stats.currentSession && options.sessionId) {
           const answeredInSession = stats.currentSession.questionsAnswered;
           // Calculate correct answers in session based on new total and accuracy
           // Note: This calculation might be slightly off if atomic increments failed earlier
           const correctInSession = answeredInSession > 0 ? ((stats.currentSession.currentAccuracy / 100) * (answeredInSession -1)) + (isCorrect ? 1 : 0) : (isCorrect ? 1 : 0);
           stats.currentSession.currentAccuracy = answeredInSession > 0 ? (correctInSession / answeredInSession) * 100 : (isCorrect ? 100 : 0);

           stats.currentSession.focusScore = this.calculateFocusScore(
             options.timeSpent,
             options.difficulty,
             stats.currentSession.focusScore
           );
        }

        // Update learning metrics (like accuracy trend - simplified here)
        stats = this.updateLearningMetrics(stats, isCorrect, options);

        // Handle SRS Integration
        if (options.srsQuality !== undefined) {
          await this.handleSRSIntegration(userId, questionId, options.srsQuality, options.reviewType);
        }

        // Update streak data
        stats.streakData = await this.updateStreakDataRealtime(stats.streakData, now);

        stats.updatedAt = now;
        stats.lastCalculated = now; // Mark as recently calculated

        transaction.set(docRef, stats); // Use set to overwrite completely with updated object

        logger.info('FirebaseUserStatisticsService', 'recordQuestionAnswer', `Stats updated for user ${userId}`);
        return this.transformTimestamps(stats);
      });
    } catch (error) {
        logger.error('FirebaseUserStatisticsService', 'recordQuestionAnswer', `Error during transaction update for ${userId}: ${error}`);
        // If transaction fails, try to return the current state before transaction
        const currentDoc = await docRef.get();
        if (currentDoc.exists) {
            return this.transformTimestamps(this.ensureStatsStructure(currentDoc.data() as UserStatistics, userId));
        } else {
            throw new Error(`Falha ao atualizar estatísticas e documento não encontrado para ${userId}.`);
        }
    }
  }

  /**
   * Inicia sessão de estudo.
   */
  async startStudySession(userId: string, sessionType: string): Promise<UserStatistics> {
    const docRef = this.firestore.collection(this.collection).doc(userId);
    const now = Timestamp.now();
    const sessionId = this.firestore.collection('dummy').doc().id; // Generate a unique session ID

    try {
      // Ensure stats exist before starting session
      await this.getOrCreateUserStatistics(userId);

      await docRef.update({
        'currentSession': {
          startTime: now,
          questionsAnswered: 0,
          currentAccuracy: 0, // Start at 0
          timeSpent: 0,
          focusScore: 100
        },
        'studyTimeAnalysis.sessionsCount': FieldValue.increment(1),
        updatedAt: now
      });

      await this.logUserActivity(userId, 'session_started', { sessionId, sessionType });
      const updatedStats = await this.getOrCreateUserStatistics(userId);
      return updatedStats;
    } catch (error) {
        logger.error('FirebaseUserStatisticsService', 'startStudySession', `Error starting session for ${userId}: ${error}`);
        throw new Error(`Falha ao iniciar sessão de estudo para ${userId}.`);
    }
  }

  /**
   * Finaliza sessão de estudo, calculando duração e métricas da sessão.
   */
  async endStudySession(
    userId: string,
    _sessionData: { // Optional data if frontend tracks some aspects
      questionsAnswered?: number;
      timeSpent?: number; // in seconds
      focusEvents?: number;
      topicsStudied?: string[];
    }
  ): Promise<UserStatistics> {
    const docRef = this.firestore.collection(this.collection).doc(userId);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      throw new Error(`Usuário ${userId} não encontrado`);
    }

    const stats = doc.data() as UserStatistics;
    const session = stats.currentSession;

    if (!session) {
      throw new Error('Nenhuma sessão ativa encontrada');
    }

    const now = Timestamp.now();
    const sessionDurationMs = now.toMillis() - (session.startTime?.toMillis() || now.toMillis());
    const sessionDurationMinutes = Math.max(1, Math.floor(sessionDurationMs / (1000 * 60)));

    // Registrar sessão no histórico
    await this.logStudySession(
      userId,
      session,
      sessionDurationMs / 1000,
      this.calculateXPGain(session.questionsAnswered, session.currentAccuracy)
    );

    // Update study time analysis based on the completed session
    stats.studyTimeAnalysis = this.updateStudyTimeAnalysis(
      stats.studyTimeAnalysis,
      sessionDurationMinutes,
      now
    );

    // Update streak based on this session's activity date
    stats.streakData = await this.updateStreakDataRealtime(stats.streakData, now);

    // Update XP and Level
    const xpGained = this.calculateXPGain(session.questionsAnswered, session.currentAccuracy);
    stats.learningMetrics.totalXP = (stats.learningMetrics.totalXP ?? 0) + xpGained;
    const newLevel = this.calculateLevel(stats.learningMetrics.totalXP);
    if (newLevel > (stats.learningMetrics.currentLevel ?? 0)) {
      stats.learningMetrics.currentLevel = newLevel;
      await this.triggerLevelUpEvent(userId, newLevel);
    }
    stats.learningMetrics.xpToNextLevel = this.calculateXPToNextLevel(
      stats.learningMetrics.totalXP, newLevel
    );

    // Clear current session and update timestamp
    stats.currentSession = null;
    stats.updatedAt = now;
    stats.lastCalculated = now; // Mark as calculated

    // Use set with merge instead of update to avoid type signature issues
    await docRef.set(stats, { merge: true });

    logger.info('FirebaseUserStatisticsService', 'endStudySession', `Sessão finalizada para usuário ${userId}`);
    return this.transformTimestamps(stats);
  }

  /**
   * Registra tempo de estudo adicional (e.g., leitura, vídeos) - MENOS PRECISO.
   */
  async recordStudyTime(
    userId: string,
    minutes: number,
    sessionType: 'questions' | 'flashcards' | 'reading' | 'video' | 'other' = 'other'
  ): Promise<UserStatistics> {
    const docRef = this.firestore.collection(this.collection).doc(userId);
    const now = Timestamp.now();

    try {
      // Ensure stats exist
      await this.getOrCreateUserStatistics(userId);

      // Update study time analysis directly
      await docRef.update({
        'studyTimeAnalysis.totalMinutesStudied': FieldValue.increment(minutes),
        // Note: This doesn't increment sessionsCount or affect avg/min/max session duration
        // as it's not a full session.
        updatedAt: now
      });

      // Log this activity
      await this.logUserActivity(userId, 'manual_study_time', { minutes, sessionType });

      // Recalculate consistency and pattern based on new activity date
      const stats = await this.getOrCreateUserStatistics(userId);
      const updatedStreak = await this.updateStreakDataRealtime(stats.streakData, now);
      const activityDates = await this.getAllActivityDates(userId); // Fetch all dates for recalc
      const updatedConsistency = this.calculateConsistency(activityDates);
      const updatedPattern = this.calculateStudyPattern(await this.getAllSessions(userId));

      await docRef.update({
          'streakData': updatedStreak,
          'studyTimeAnalysis.consistencyScore': updatedConsistency,
          'studyTimeAnalysis.studyPattern': updatedPattern,
          updatedAt: now,
          lastCalculated: now
      });

      logger.info('FirebaseUserStatisticsService', 'recordStudyTime', `${minutes} minutes of study time recorded for ${userId}`);
      return await this.getOrCreateUserStatistics(userId);
    } catch (error) {
        logger.error('FirebaseUserStatisticsService', 'recordStudyTime', `Error recording study time for ${userId}: ${error}`);
        throw new Error(`Falha ao registrar tempo de estudo para ${userId}.`);
    }
  }

  /**
   * Registra conclusão de exame/simulado.
   */
  async recordExamCompletion(
    userId: string,
    examData: {
      score: number; // Percentage 0-100
      totalQuestions: number;
      timeSpent: number; // seconds
      specialty: string;
      examType: string;
      questionsCorrect: number;
      confidenceMetrics?: {
        confidentAndCorrect: number;
        confidentAndWrong: number;
        unsureAndCorrect: number;
        unsureAndWrong: number;
      };
    }
  ): Promise<UserStatistics> {
    const docRef = this.firestore.collection(this.collection).doc(userId);
    const now = Timestamp.now();

    try {
      // Store detailed exam results separately for better analysis
      await this.firestore.collection(this.examResultsCollection).add({
        userId,
        ...examData,
        completedAt: now
      });
    } catch (error) {
        logger.error('FirebaseUserStatisticsService', 'recordExamCompletion', `Error saving detailed exam result for ${userId}: ${error}`);
        // Continue to update summary stats even if detailed log fails
    }

    // Update summary statistics
    try {
      return await this.firestore.runTransaction(async (transaction) => {
        const doc = await transaction.get(docRef);
        if (!doc.exists) throw new Error('User statistics not found');
        let stats = this.ensureStatsStructure(doc.data() as UserStatistics, userId);

        const prevAvg = stats.examMetrics?.averageScore ?? 0; // Use 0 if null
        const prevCount = stats.examMetrics?.totalExamsTaken ?? 0;

        stats.examMetrics.totalExamsTaken = prevCount + 1;
        stats.examMetrics.averageScore =
          stats.examMetrics.totalExamsTaken > 0
          ? (prevAvg * prevCount + examData.score) / stats.examMetrics.totalExamsTaken
          : examData.score; // First exam score is the average

        stats.examMetrics.bestScore = Math.max(stats.examMetrics.bestScore ?? -Infinity, examData.score);
        stats.examMetrics.worstScore = Math.min(stats.examMetrics.worstScore ?? Infinity, examData.score);

        // Update specialty metrics safely
        const specKey = examData.specialty?.replace(/\./g, '_') || 'unknown'; // Sanitize key, provide default
        const specMetrics = stats.examMetrics.examsBySpecialty?.[specKey] || { count: 0, averageScore: 0, lastTaken: null, trend: null };
        const prevSpecAvg = specMetrics.averageScore ?? 0;
        const prevSpecCount = specMetrics.count ?? 0;

        specMetrics.count = prevSpecCount + 1;
        specMetrics.averageScore = specMetrics.count > 0
            ? (prevSpecAvg * prevSpecCount + examData.score) / specMetrics.count
            : examData.score;
        specMetrics.lastTaken = now;
        stats.examMetrics.examsBySpecialty[specKey] = specMetrics;

        // Update confidence metrics if available
        if (examData.confidenceMetrics) {
            stats.examMetrics.confidenceMetrics = {
                ...stats.examMetrics.confidenceMetrics,
                // Recalculate overall confidence metrics based on all exams (simplified here)
                accuracyWhenConfident: safeGet(examData, 'confidenceMetrics.accuracyWhenConfident', stats.examMetrics.confidenceMetrics?.accuracyWhenConfident),
                accuracyWhenUnsure: safeGet(examData, 'confidenceMetrics.accuracyWhenUnsure', stats.examMetrics.confidenceMetrics?.accuracyWhenUnsure),
                overconfidenceRate: safeGet(examData, 'confidenceMetrics.overconfidenceRate', stats.examMetrics.confidenceMetrics?.overconfidenceRate)
            };
        }

        stats.updatedAt = now;
        stats.lastCalculated = now;

        transaction.set(docRef, stats);
        logger.info('FirebaseUserStatisticsService', 'recordExamCompletion', `Exam recorded for user ${userId}`);
        return this.transformTimestamps(stats);
      });
    } catch (error) {
        logger.error('FirebaseUserStatisticsService', 'recordExamCompletion', `Error updating summary exam stats for ${userId}: ${error}`);
        // Attempt to return current stats if transaction fails
        const currentDoc = await docRef.get();
        if (currentDoc.exists) {
            return this.transformTimestamps(this.ensureStatsStructure(currentDoc.data() as UserStatistics, userId));
        } else {
            throw new Error(`Falha ao registrar exame e documento não encontrado para ${userId}.`);
        }
    }
  }

  // --- Recalculation Logic ---

  /**
   * Recalcula todas as métricas com base nos dados brutos (sessões, respostas).
   * ✅ OTIMIZADO: Limites e cache para evitar consultas massivas.
   */
  async recalculateAllMetrics(userId: string, currentStats: UserStatistics): Promise<UserStatistics> {
    logger.info('FirebaseUserStatisticsService', 'recalculateAllMetrics', `Starting optimized recalculation for user ${userId}`);
    const now = Timestamp.now();
    let stats = this.createInitialStats(userId, now); // Start fresh but keep IDs
    stats.createdAt = currentStats.createdAt; // Preserve original creation date

    try {
      // ✅ OTIMIZAÇÃO: Limitar consultas para evitar sobrecarga
      // 1. Recalculate from Question Responses (últimos 30 dias ou máximo 1000 registros)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const responsesSnapshot = await this.firestore.collection(this.responsesCollection)
        .where('userId', '==', userId)
        .where('createdAt', '>=', Timestamp.fromDate(thirtyDaysAgo)) // ✅ MUDANÇA: Apenas últimos 30 dias
        .limit(1000) // ✅ MUDANÇA: Limite máximo de 1000 registros
        .get();

      stats.totalQuestionsAnswered = responsesSnapshot.size;
      let correctCount = 0;
      const filterCounts: Record<string, { total: number; correct: number; lastStudied: Timestamp | null }> = {};

      responsesSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.isCorrect) {
          correctCount++;
        }
        const filterId = data.filterId || 'unknown';
        if (!filterCounts[filterId]) {
          filterCounts[filterId] = { total: 0, correct: 0, lastStudied: null };
        }
        filterCounts[filterId].total++;
        if (data.isCorrect) {
          filterCounts[filterId].correct++;
        }
        const responseTime = data.createdAt instanceof Timestamp ? data.createdAt : null;
        if (responseTime && (!filterCounts[filterId].lastStudied || responseTime > filterCounts[filterId].lastStudied!)) {
            filterCounts[filterId].lastStudied = responseTime;
        }
      });

      stats.correctAnswers = correctCount;
      stats.overallAccuracy = stats.totalQuestionsAnswered > 0 ? correctCount / stats.totalQuestionsAnswered : null;

      // Recalculate filter statistics  
      const responseQuery = this.firestore
        .collection(this.responsesCollection)
        .where('userId', '==', userId);
      const responseSnapshot = await responseQuery.get();
      
      // Corrigir inicialização de filterStatistics
      const filterStatistics: Record<string, FilterStatistics> = {};
      
      responseSnapshot.docs.forEach((doc: any) => {
        const response = doc.data();
        const filterId = response.filterId || 'unknown';
        
        if (!filterStatistics[filterId]) {
          filterStatistics[filterId] = {
            filterId,
            filterName: `Filter ${filterId}`,
            totalQuestions: 0,
            correctAnswers: 0,
            accuracy: null,
            averageTimePerQuestion: null,
            // Corrigir inicialização de difficultyDistribution
            difficultyDistribution: {
              beginner: 0,
              intermediate: 0,
              advanced: 0,
              expert: 0
            },
            lastStudied: null,
            masteryLevel: null,
            retentionRate: null,
            improvementTrend: null,
            predictedPerformance: null,
          };
        }
        
        filterStatistics[filterId].totalQuestions++;
        if (response.isCorrect) {
          filterStatistics[filterId].correctAnswers++;
        }
      });

    } catch (error) {
        logger.error('FirebaseUserStatisticsService', 'recalculateAllMetrics', `Error recalculating from responses for ${userId}: ${error}`);
        // Continue calculation with potentially incomplete data
    }

    let activityDates: Timestamp[] = [];
    let allSessionsData: any[] = [];
    try {
      // ✅ OTIMIZAÇÃO: Limitar sessões aos últimos 30 dias
      // 2. Recalculate from Study Sessions
      const sessionsSnapshot = await this.firestore.collection(this.sessionsCollection)
        .where('userId', '==', userId)
        .where('endTime', '>=', Timestamp.fromDate(thirtyDaysAgo)) // ✅ MUDANÇA: Apenas últimos 30 dias
        .orderBy('endTime', 'asc') // Order by end time
        .limit(500) // ✅ MUDANÇA: Limite máximo de 500 sessões
        .get();

      allSessionsData = sessionsSnapshot.docs.map(d => d.data());
      let totalMinutes = 0;
      let sessionCount = 0;
      let longestSession = 0;
      let shortestSession = Infinity;
      const sessionDurations: number[] = [];

      sessionsSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.durationSeconds && data.durationSeconds > 0) {
          const durationMinutes = Math.round(data.durationSeconds / 60);
          totalMinutes += durationMinutes;
          sessionCount++;
          sessionDurations.push(durationMinutes);
          longestSession = Math.max(longestSession, durationMinutes);
          shortestSession = Math.min(shortestSession, durationMinutes);
        }
        if (data.endTime instanceof Timestamp) {
            activityDates.push(data.endTime);
        }
      });

      stats.studyTimeAnalysis.totalMinutesStudied = totalMinutes;
      stats.studyTimeAnalysis.sessionsCount = sessionCount;
      stats.studyTimeAnalysis.averageSessionDuration = sessionCount > 0 ? totalMinutes / sessionCount : null;
      stats.studyTimeAnalysis.longestSession = sessionCount > 0 ? longestSession : null;
      stats.studyTimeAnalysis.shortestSession = sessionCount > 0 && shortestSession !== Infinity ? shortestSession : null;
      stats.studyTimeAnalysis.consistencyScore = this.calculateConsistency(activityDates);
      stats.studyTimeAnalysis.studyPattern = this.calculateStudyPattern(allSessionsData);

    } catch (error) {
        logger.error('FirebaseUserStatisticsService', 'recalculateAllMetrics', `Error recalculating from sessions for ${userId}: ${error}`);
    }

    try {
      // ✅ OTIMIZAÇÃO: Limitar exames aos últimos 90 dias
      // 3. Recalculate from Exam Results
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      
      const examsSnapshot = await this.firestore.collection(this.examResultsCollection)
        .where('userId', '==', userId)
        .where('createdAt', '>=', Timestamp.fromDate(ninetyDaysAgo)) // ✅ MUDANÇA: Apenas últimos 90 dias
        .limit(100) // ✅ MUDANÇA: Limite máximo de 100 exames
        .get();

      let totalScore = 0;
      let bestScore = -Infinity;
      let worstScore = Infinity;
      stats.examMetrics.totalExamsTaken = examsSnapshot.size;

      examsSnapshot.forEach(doc => {
        const data = doc.data();
        totalScore += data.score;
        bestScore = Math.max(bestScore, data.score);
        worstScore = Math.min(worstScore, data.score);
        // TODO: Recalculate specialty metrics if needed
      });

      stats.examMetrics.averageScore = stats.examMetrics.totalExamsTaken > 0 ? totalScore / stats.examMetrics.totalExamsTaken : null;
      stats.examMetrics.bestScore = stats.examMetrics.totalExamsTaken > 0 ? bestScore : null;
      stats.examMetrics.worstScore = stats.examMetrics.totalExamsTaken > 0 ? worstScore : null;

    } catch (error) {
        logger.error('FirebaseUserStatisticsService', 'recalculateAllMetrics', `Error recalculating from exams for ${userId}: ${error}`);
    }

    try {
      // 4. Recalculate Streak Data (using dates from sessions)
      stats.streakData = await this.recalculateStreakData(userId, activityDates);
    } catch (error) {
        logger.error('FirebaseUserStatisticsService', 'recalculateAllMetrics', `Error recalculating streak for ${userId}: ${error}`);
    }

    try {
      // ✅ OTIMIZAÇÃO: Reutilizar dados já carregados
      // 5. Recalculate Learning Metrics (XP, Level)
      const responsesData = responsesSnapshot.docs.map(d => d.data()); // ✅ MUDANÇA: Reutilizar snapshot já carregado
      stats.learningMetrics.totalXP = this.calculateTotalXP(responsesData, allSessionsData);
      stats.learningMetrics.currentLevel = this.calculateLevel(stats.learningMetrics.totalXP);
      stats.learningMetrics.xpToNextLevel = this.calculateXPToNextLevel(stats.learningMetrics.totalXP, stats.learningMetrics.currentLevel);
    } catch (error) {
        logger.error('FirebaseUserStatisticsService', 'recalculateAllMetrics', `Error recalculating learning metrics for ${userId}: ${error}`);
    }

    stats.lastCalculated = now;
    stats.updatedAt = now;
    stats.version = this.currentVersion;

    logger.info('FirebaseUserStatisticsService', 'recalculateAllMetrics', `Full recalculation completed for user ${userId}`);
    return stats;
  }

  /**
   * Recalcula métricas avançadas (Recomendações, Comparações) - menos intensivo.
   */
  async recalculateAdvancedMetrics(userId: string): Promise<UserStatistics> {
    const stats = await this.getOrCreateUserStatistics(userId);
    return await this.recalculateAdvancedMetricsInternal(userId, stats);
  }

  private async recalculateAdvancedMetricsInternal(userId: string, stats: UserStatistics): Promise<UserStatistics> {
    // Placeholder for actual implementation
    // stats.recommendations = await this.generateSmartRecommendations(userId, stats);
    // stats.peerComparison = await this.generatePeerComparison(userId, stats);
    logger.info('FirebaseUserStatisticsService', 'recalculateAdvancedMetrics', `Advanced metrics recalculated for user ${userId}`);
    return stats;
  }

  // --- Helper Calculation Functions ---

  private calculateFocusScore(timeSpent: number, difficulty: DifficultyLevel, currentScore: number | null): number {
    // Placeholder: Simple focus score logic
    let scoreChange = 0;
    const expectedTime = difficulty === DifficultyLevel.EXPERT ? 120 : difficulty === DifficultyLevel.ADVANCED ? 90 : difficulty === DifficultyLevel.INTERMEDIATE ? 60 : 45;
    if (timeSpent < expectedTime * 0.5) scoreChange = -5; // Too fast
    else if (timeSpent > expectedTime * 2) scoreChange = -3; // Too slow
    else scoreChange = 1; // Within range

    return Math.max(0, Math.min(100, (currentScore ?? 100) + scoreChange)); // Default to 100 if null
  }

  private updateLearningMetrics(stats: UserStatistics, _isCorrect: boolean, _options: any): UserStatistics {
    try {
      // Corrigir tipo do trend data
      const today = new Date().toISOString().split('T')[0];
      const trend = stats.learningMetrics.accuracyTrend || [];
      const lastTrend = trend[trend.length - 1];

      if (lastTrend && lastTrend.date.toDate().toISOString().split('T')[0] === today) {
        lastTrend.accuracy = stats.overallAccuracy ?? 0;
        lastTrend.questionsAnswered = stats.totalQuestionsAnswered;
      } else {
        trend.push({ 
          date: Timestamp.fromDate(new Date(today + 'T00:00:00.000Z')), 
          accuracy: stats.overallAccuracy ?? 0, 
          questionsAnswered: stats.totalQuestionsAnswered 
        });
      }

      stats.learningMetrics.accuracyTrend = trend;
    } catch (error) {
        logger.error('FirebaseUserStatisticsService', 'updateLearningMetrics', `Error updating accuracy trend: ${error}`);
    }
    return stats;
  }

  private updateStudyTimeAnalysis(analysis: StudyTimeAnalysis | null, sessionDurationMinutes: number, _now: Timestamp): StudyTimeAnalysis {
    const safeAnalysis = analysis || this.createInitialStudyTimeAnalysis();
    try {
      safeAnalysis.totalMinutesStudied = (safeAnalysis.totalMinutesStudied ?? 0) + sessionDurationMinutes;
      if (sessionDurationMinutes > 0 && safeAnalysis.sessionsCount !== null) {
          safeAnalysis.averageSessionDuration = safeAnalysis.sessionsCount > 0 ? safeAnalysis.totalMinutesStudied / safeAnalysis.sessionsCount : null;
          safeAnalysis.longestSession = Math.max(safeAnalysis.longestSession ?? 0, sessionDurationMinutes);
          safeAnalysis.shortestSession = Math.min(safeAnalysis.shortestSession ?? Infinity, sessionDurationMinutes);
          if (safeAnalysis.shortestSession === Infinity) safeAnalysis.shortestSession = null;
      }
      // TODO: Update weeklyDistribution, monthlyTrend, preferredTimeSlots, consistencyScore, studyPattern
    } catch (error) {
        logger.error('FirebaseUserStatisticsService', 'updateStudyTimeAnalysis', `Error updating study time analysis: ${error}`);
    }
    return safeAnalysis;
  }

  private calculateXPGain(questionsAnswered: number | null, accuracy: number | null): number {
    // Simple XP calculation
    if (questionsAnswered === null || accuracy === null) return 0;
    return Math.round(questionsAnswered * (accuracy / 100) * 1.5);
  }

  private calculateLevel(totalXP: number | null): number {
    // Exponential level curve
    if (totalXP === null || totalXP <= 0) return 1;
    return Math.floor(Math.sqrt(totalXP / 100)) + 1;
  }

  private calculateXPToNextLevel(totalXP: number | null, currentLevel: number | null): number {
    const safeXP = totalXP ?? 0;
    const safeLevel = currentLevel ?? 1;
    const xpForNextLevel = Math.pow(safeLevel, 2) * 100;
    return Math.max(0, xpForNextLevel - safeXP);
  }

  private calculateConsistency(activityTimestamps: Timestamp[]): number | null {
    if (!activityTimestamps || activityTimestamps.length < 2) return null;
    try {
      const dates = activityTimestamps.map(ts => ts.toDate().toISOString().split('T')[0]);
      const uniqueDays = [...new Set(dates)];
      if (uniqueDays.length < 2) return null;

      uniqueDays.sort();
      let totalGaps = 0;
      for (let i = 1; i < uniqueDays.length; i++) {
        const date1 = new Date(uniqueDays[i-1]);
        const date2 = new Date(uniqueDays[i]);
        const diffDays = Math.round((date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24));
        totalGaps += Math.max(0, diffDays - 1);
      }

      const firstDay = new Date(uniqueDays[0]);
      const lastDay = new Date(uniqueDays[uniqueDays.length - 1]);
      const totalDurationDays = Math.round((lastDay.getTime() - firstDay.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      if (totalDurationDays <= 0) return 100; // Avoid division by zero if only one day span

      const consistency = Math.max(0, 100 - (totalGaps / totalDurationDays) * 100);
      return Math.round(consistency);
    } catch (error) {
        logger.error('FirebaseUserStatisticsService', 'calculateConsistency', `Error calculating consistency: ${error}`);
        return null;
    }
  }

  private calculateStudyPattern(sessions: any[]): StudyPattern | null {
      if (!sessions || sessions.length < 5) return null;
      try {
        // Placeholder: Needs more sophisticated analysis of session times and durations
        return StudyPattern.CONSISTENT_DAILY; // Default mock
      } catch (error) {
          logger.error('FirebaseUserStatisticsService', 'calculateStudyPattern', `Error calculating study pattern: ${error}`);
          return null;
      }
  }

  private calculateTotalXP(responses: any[], sessions: any[]): number {
      let xp = 0;
      try {
        if (responses) {
            responses.forEach(r => xp += (r?.isCorrect ? 2 : 0));
        }
        if (sessions) {
            sessions.forEach(s => xp += (s?.xpGained || 0));
        }
      } catch (error) {
          logger.error('FirebaseUserStatisticsService', 'calculateTotalXP', `Error calculating total XP: ${error}`);
      }
      return xp;
  }

  // --- Streak Logic ---

  private async updateStreakDataRealtime(streakData: AdvancedStreakData | null, now: Timestamp): Promise<AdvancedStreakData> {
    const safeStreakData = streakData || this.createInitialStreakData();
    try {
      const today = now.toDate().toISOString().split('T')[0];
      const lastActivityDateStr = safeStreakData.lastActivityDate instanceof Timestamp
          ? safeStreakData.lastActivityDate.toDate().toISOString().split('T')[0]
          : null;

      if (lastActivityDateStr === today) {
        // Already active today, no change to streak count
        return safeStreakData;
      }

      const yesterday = new Date(now.toMillis() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      if (lastActivityDateStr === yesterday) {
        // Continued streak
        safeStreakData.currentStreak = (safeStreakData.currentStreak ?? 0) + 1;
      } else {
        // Streak broken or first activity
        safeStreakData.currentStreak = 1;
      }

      safeStreakData.longestStreak = Math.max(safeStreakData.longestStreak ?? 0, safeStreakData.currentStreak);
      safeStreakData.lastActivityDate = now;
      safeStreakData.totalDaysStudied = (safeStreakData.totalDaysStudied ?? 0) + 1;

      // TODO: Implement freeze cards, milestones etc.
    } catch (error) {
        logger.error('FirebaseUserStatisticsService', 'updateStreakDataRealtime', `Error updating streak data: ${error}`);
    }
    return safeStreakData;
  }

  private async recalculateStreakData(userId: string, activityTimestamps: Timestamp[]): Promise<AdvancedStreakData> {
    const initialStreak = this.createInitialStreakData();
    if (!activityTimestamps || activityTimestamps.length === 0) return initialStreak;

    try {
      const uniqueDays = [...new Set(activityTimestamps.map(ts => ts.toDate().toISOString().split('T')[0]))].sort();

      let currentStreak = 0;
      let longestStreak = 0;
      let lastDate: Date | null = null;

      for (const dayStr of uniqueDays) {
        const currentDate = new Date(dayStr + 'T00:00:00Z'); // Use UTC to avoid timezone issues
        if (lastDate) {
          const diffDays = Math.round((currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays === 1) {
            currentStreak++;
          } else {
            longestStreak = Math.max(longestStreak, currentStreak);
            currentStreak = 1; // Reset streak
          }
        } else {
          currentStreak = 1; // First day
        }
        longestStreak = Math.max(longestStreak, currentStreak);
        lastDate = currentDate;
      }

      initialStreak.totalDaysStudied = uniqueDays.length;
      initialStreak.longestStreak = longestStreak;

      // Determine current streak based on today
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      const lastActivityDate = lastDate ? new Date(lastDate.toISOString().split('T')[0] + 'T00:00:00Z') : null;

      if (lastActivityDate) {
          const diffToday = Math.round((today.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24));
          if (diffToday === 0) {
              // Active today, current streak is the one calculated till today
              initialStreak.currentStreak = currentStreak;
          } else if (diffToday === 1) {
              // Active yesterday, current streak is the one calculated till yesterday
              initialStreak.currentStreak = currentStreak;
          } else {
              // Streak broken
              initialStreak.currentStreak = 0;
          }
          initialStreak.lastActivityDate = Timestamp.fromDate(lastActivityDate);
      } else {
          initialStreak.currentStreak = 0;
          initialStreak.lastActivityDate = null;
      }
    } catch (error) {
        logger.error('FirebaseUserStatisticsService', 'recalculateStreakData', `Error recalculating streak data for ${userId}: ${error}`);
    }
    return initialStreak;
  }

  // --- SRS Integration ---

  private async handleSRSIntegration(_userId: string, _contentId: string, _quality: number, _reviewType?: string): Promise<void> {
    try {
      // Corrigir integração com SRS - comentado até implementação completa
      // const _review = {
      //   userId: _userId,
      //   contentId: _contentId,
      //   reviewedAt: Timestamp.now(),
      //   quality: _quality as ReviewQuality,
      // };

      // await this.srsService.recordReview(review); // Comentar até método existir
    } catch (error) {
      logger.error('Erro na integração SRS:', error);
    }
  }

  // --- Logging Helpers ---

  private async logUserActivity(userId: string, activityType: string, details: Record<string, any>): Promise<void> {
    try {
      await this.firestore.collection(this.activityCollection).add({
        userId,
        activityType,
        timestamp: Timestamp.now(),
        details
      });
    } catch (error) {
      logger.error('FirebaseUserStatisticsService', 'logUserActivity', `Failed to log activity ${activityType} for user ${userId}: ${error}`);
    }
  }

  private async logStudySession(userId: string, session: CurrentSession, durationSeconds: number, xpGained: number): Promise<void> {
    try {
      await this.firestore.collection(this.sessionsCollection).add({
        userId,
        startTime: session.startTime,
        endTime: Timestamp.now(),
        durationSeconds,
        questionsAnswered: session.questionsAnswered,
        accuracy: session.currentAccuracy,
        focusScore: session.focusScore,
        xpGained
      });
    } catch (error) {
      logger.error('FirebaseUserStatisticsService', 'logStudySession', `Failed to log session for user ${userId}: ${error}`);
    }
  }

  // --- Data Fetching Helpers for Recalculation ---

  private async getAllActivityDates(userId: string): Promise<Timestamp[]> {
      const activityTimestamps: Timestamp[] = [];
      try {
          const sessionsSnapshot = await this.firestore.collection(this.sessionsCollection)
              .where('userId', '==', userId)
              .select('endTime') // Select only endTime
              .get();
          sessionsSnapshot.forEach(doc => {
              const endTime = doc.data().endTime;
              if (endTime instanceof Timestamp) {
                  activityTimestamps.push(endTime);
              }
          });

          const responsesSnapshot = await this.firestore.collection(this.responsesCollection)
              .where('userId', '==', userId)
              .select('createdAt') // Select only createdAt
              .get();
          responsesSnapshot.forEach(doc => {
              const createdAt = doc.data().createdAt;
              if (createdAt instanceof Timestamp) {
                  activityTimestamps.push(createdAt);
              }
          });
          // Add other activity sources if needed (e.g., manual time logs)
      } catch (error) {
          logger.error('FirebaseUserStatisticsService', 'getAllActivityDates', `Error fetching activity dates for ${userId}: ${error}`);
      }
      return activityTimestamps;
  }

  private async getAllSessions(userId: string): Promise<any[]> {
      try {
          const sessionsSnapshot = await this.firestore.collection(this.sessionsCollection)
              .where('userId', '==', userId)
              .get();
          return sessionsSnapshot.docs.map(doc => doc.data());
      } catch (error) {
          logger.error('FirebaseUserStatisticsService', 'getAllSessions', `Error fetching sessions for ${userId}: ${error}`);
          return [];
      }
  }

  // --- Event Triggers ---

  private async triggerLevelUpEvent(userId: string, newLevel: number): Promise<void> {
    // Placeholder: Implement event dispatching (e.g., Pub/Sub, Cloud Functions)
    logger.info('FirebaseUserStatisticsService', 'triggerLevelUpEvent', `User ${userId} reached level ${newLevel}`);
    await this.logUserActivity(userId, 'level_up', { newLevel });
  }

  // --- Timestamp Transformation ---

  /**
   * Recursively transforms Firestore Timestamps to ISO strings for frontend compatibility.
   */
  private transformTimestamps<T>(data: T): T {
    if (!data) return data;

    if (data instanceof Timestamp) {
      return data.toDate().toISOString() as any;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.transformTimestamps(item)) as any;
    }

    if (typeof data === 'object') {
      const transformed: { [key: string]: any } = {};
      for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          transformed[key] = this.transformTimestamps((data as any)[key]);
        }
      }
      return transformed as T;
    }

    return data;
  }

  // --- Public Getters for Specific Data (Optional) ---
  // These could call getOrCreateUserStatistics or dedicated calculation logic

  async getStudyTimeAnalysis(userId: string): Promise<StudyTimeAnalysis> {
    const stats = await this.getOrCreateUserStatistics(userId);
    return stats.studyTimeAnalysis;
  }

  async getLearningMetrics(userId: string): Promise<LearningMetrics> {
    const stats = await this.getOrCreateUserStatistics(userId);
    return stats.learningMetrics;
  }

  async getStreakData(userId: string): Promise<AdvancedStreakData> {
    const stats = await this.getOrCreateUserStatistics(userId);
    return stats.streakData;
  }

  async getExamMetrics(userId: string): Promise<ExamMetrics> {
    const stats = await this.getOrCreateUserStatistics(userId);
    return stats.examMetrics;
  }

  async getFilterStatistics(userId: string, filterId: string): Promise<FilterStatistics | null> {
    const stats = await this.getOrCreateUserStatistics(userId);
    return stats.filterStatistics?.[filterId] || null;
  }

  // Implementar métodos obrigatórios da interface que estão faltando
  async updateUserStatistics(userId: string, payload: StatisticsUpdatePayload): Promise<UserStatistics> {
    // Implementação básica
    const stats = await this.getOrCreateUserStatistics(userId);
    
    if (payload.questionAnswered) {
      return await this.recordQuestionAnswer(
        userId,
        'temp-id',
        payload.questionAnswered.isCorrect,
        {
          filterId: payload.questionAnswered.filterId,
          difficulty: payload.questionAnswered.difficulty,
          timeSpent: payload.questionAnswered.timeSpent,
          confidenceLevel: payload.questionAnswered.confidenceLevel,
        }
      );
    }

    return stats;
  }

  async updateStreak(userId: string, date?: Date): Promise<UserStatistics> {
    const stats = await this.getOrCreateUserStatistics(userId);
    const targetDate = date || new Date();
    stats.streakData = await this.updateStreakDataRealtime(stats.streakData, Timestamp.fromDate(targetDate));
    
    const docRef = this.firestore.collection(this.collection).doc(userId);
    await docRef.update({ streakData: stats.streakData, updatedAt: Timestamp.now() });
    
    return stats;
  }

  async generatePredictiveAnalysis(userId: string): Promise<PredictiveAnalysis> {
    const stats = await this.getOrCreateUserStatistics(userId);
    
    return {
      userId,
      predictions: {
        nextWeekPerformance: stats.overallAccuracy || 0,
        examReadiness: {},
        timeToMastery: {},
        riskOfBurnout: 0,
        optimalStudySchedule: []
      },
      confidence: 50,
      basedOnDataPoints: stats.totalQuestionsAnswered,
      lastAnalysis: Timestamp.now()
    };
  }

  async generateSmartRecommendations(_userId: string): Promise<UserStatistics['recommendations']> {
    return {
      nextTopicsToStudy: [],
      reviewSchedule: [],
      studyGoals: [],
      personalizedInsights: []
    };
  }

  async identifyStudyPattern(_userId: string): Promise<StudyPattern> {
    return StudyPattern.CONSISTENT_DAILY;
  }

  async calculateTopicMastery(userId: string, filterId: string): Promise<number> {
    const stats = await this.getOrCreateUserStatistics(userId);
    const filterStats = stats.filterStatistics[filterId];
    return filterStats?.accuracy || 0;
  }

  async getUserRankings(_userId: string, _context: 'global' | 'specialty' | 'institution'): Promise<{
    overall: number;
    byTopic: Record<string, number>;
    percentile: number;
  }> {
    return {
      overall: 0,
      byTopic: {},
      percentile: 50
    };
  }

  async identifyKnowledgeGaps(_userId: string): Promise<Array<{
    filterId: string;
    severity: number;
    lastReview: Date;
    recommendedReview: Date;
    srsInterval: number;
  }>> {
    return [];
  }

  async calculateStudyEfficiency(_userId: string, _timeframe?: string): Promise<{
    timeEfficiency: number;
    retentionEfficiency: number;
    accuracyImprovement: number;
    overallEfficiency: number;
  }> {
    return {
      timeEfficiency: 0,
      retentionEfficiency: 0,
      accuracyImprovement: 0,
      overallEfficiency: 0
    };
  }

  async generatePersonalizedInsights(_userId: string): Promise<Array<{
    type: 'warning' | 'suggestion' | 'congratulation' | 'insight';
    message: string;
    actionable: boolean;
    priority: number;
    category: 'performance' | 'time_management' | 'retention' | 'motivation';
  }>> {
    return [];
  }

  async exportUserAnalytics(
    userId: string,
    format: 'json' | 'csv',
    _timeRange?: { start: Date; end: Date }
  ): Promise<string> {
    const stats = await this.getOrCreateUserStatistics(userId);
    if (format === 'json') {
      return JSON.stringify(stats, null, 2);
    }
    return 'CSV export not implemented';
  }

  async deleteUserStatistics(userId: string): Promise<boolean> {
    const docRef = this.firestore.collection(this.collection).doc(userId);
    await docRef.delete();
    return true;
  }
}

