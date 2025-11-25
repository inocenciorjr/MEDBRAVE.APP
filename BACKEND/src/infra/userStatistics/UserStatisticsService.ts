import { SupabaseClient } from '@supabase/supabase-js';
import { IUserStatisticsService } from '../../domain/userStatistics/interfaces/IUserStatisticsService';
import {
  UserStatistics,
  StatisticsUpdatePayload,
  StatisticsQueryOptions,
  StatisticsWithComparison,
  RankingData,
  RankingFilters,
  ComparisonData,
  StatisticsSnapshot,
  UserRanking,
  HeatmapData,
} from '../../domain/userStatistics/types';
import { logger } from '../../utils/logger';
import { TimezoneService } from '../../domain/user/services/TimezoneService';
import { toZonedTime, format } from 'date-fns-tz';

/**
 * Implementação do serviço de estatísticas
 * Apenas funcionalidades essenciais
 */
export class UserStatisticsService implements IUserStatisticsService {
  private timezoneService: TimezoneService;

  constructor(private readonly supabase: SupabaseClient) {
    this.timezoneService = new TimezoneService(supabase);
  }

  /**
   * Obtém ou cria estatísticas de usuário
   */
  async getOrCreateUserStatistics(
    userId: string,
    _options?: StatisticsQueryOptions,
  ): Promise<UserStatistics> {
    try {
      // Buscar estatísticas existentes
      const { data: existing, error } = await this.supabase
        .from('user_statistics')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        logger.error('Erro ao buscar estatísticas:', error);
        throw error;
      }

      if (existing) {
        return this.mapToUserStatistics(existing);
      }

      // Criar novas estatísticas
      const newStats = this.createEmptyStatistics(userId);
      
      const { data: created, error: createError } = await this.supabase
        .from('user_statistics')
        .insert(this.mapToDatabase(newStats))
        .select()
        .single();

      if (createError) {
        logger.error('Erro ao criar estatísticas:', createError);
        throw createError;
      }

      return this.mapToUserStatistics(created);
    } catch (error) {
      logger.error('Erro em getOrCreateUserStatistics:', error);
      throw error;
    }
  }

  /**
   * Obtém estatísticas com comparação
   */
  async getStatisticsWithComparison(
    userId: string,
    options?: StatisticsQueryOptions,
  ): Promise<StatisticsWithComparison> {
    const statistics = await this.getOrCreateUserStatistics(userId, options);

    if (!options?.includeComparison) {
      return { statistics };
    }

    // Buscar médias globais
    const comparison = await this.calculateComparisons(userId, statistics);

    return {
      statistics,
      comparison,
    };
  }

  /**
   * Atualiza estatísticas
   */
  async updateUserStatistics(
    userId: string,
    payload: StatisticsUpdatePayload,
  ): Promise<UserStatistics> {
    const stats = await this.getOrCreateUserStatistics(userId);

    // Processar cada tipo de atualização
    if (payload.questionAnswered) {
      await this.processQuestionAnswer(stats, payload.questionAnswered);
    }

    if (payload.studyTimeAdded) {
      await this.processStudyTime(stats, payload.studyTimeAdded);
    }

    if (payload.flashcardStudied) {
      await this.processFlashcard(stats, payload.flashcardStudied);
    }

    if (payload.reviewCompleted) {
      await this.processReview(stats, payload.reviewCompleted);
    }

    // Salvar no banco
    return await this.saveStatistics(stats);
  }

  /**
   * Registra resposta de questão
   */
  async recordQuestionAnswer(
    userId: string,
    questionId: string,
    isCorrect: boolean,
    isFirstAttempt: boolean,
    specialtyId: string,
    universityId?: string,
    timeSpent?: number,
  ): Promise<UserStatistics> {
    return await this.updateUserStatistics(userId, {
      questionAnswered: {
        questionId,
        isCorrect,
        isFirstAttempt,
        specialtyId,
        universityId,
        timeSpent: timeSpent || 0,
      },
    });
  }

  /**
   * Registra tempo de estudo
   */
  async recordStudyTime(
    userId: string,
    minutes: number,
    date?: string,
  ): Promise<UserStatistics> {
    return await this.updateUserStatistics(userId, {
      studyTimeAdded: {
        minutes,
        date: date || new Date().toISOString().split('T')[0],
      },
    });
  }

  /**
   * Registra flashcard estudado
   */
  async recordFlashcardStudied(
    userId: string,
    flashcardId: string,
    date?: string,
  ): Promise<UserStatistics> {
    return await this.updateUserStatistics(userId, {
      flashcardStudied: {
        flashcardId,
        date: date || new Date().toISOString().split('T')[0],
      },
    });
  }

  /**
   * Registra revisão completada
   */
  async recordReviewCompleted(
    userId: string,
    type: 'questions' | 'flashcards' | 'errorNotebook',
    itemsReviewed: number,
    date?: string,
  ): Promise<UserStatistics> {
    return await this.updateUserStatistics(userId, {
      reviewCompleted: {
        type,
        itemsReviewed,
        date: date || new Date().toISOString().split('T')[0],
      },
    });
  }

  /**
   * Atualiza streak baseado em study_sessions
   */
  async updateStreak(userId: string, date?: Date): Promise<UserStatistics> {
    const stats = await this.getOrCreateUserStatistics(userId);
    const today = date || new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    // Buscar se já estudou hoje (verificar study_sessions)
    const { data: todaySessions } = await this.supabase
      .from('study_sessions')
      .select('id')
      .eq('user_id', userId)
      .gte('started_at', todayStr)
      .lt('started_at', new Date(today.getTime() + 86400000).toISOString())
      .limit(1);

    const studiedToday = (todaySessions?.length || 0) > 0;

    if (studiedToday) {
      // Verificar se estudou ontem
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      const { data: yesterdaySessions } = await this.supabase
        .from('study_sessions')
        .select('id')
        .eq('user_id', userId)
        .gte('started_at', yesterdayStr)
        .lt('started_at', todayStr)
        .limit(1);

      const studiedYesterday = (yesterdaySessions?.length || 0) > 0;

      if (studiedYesterday || stats.streakData.currentStreak === 0) {
        // Continua ou inicia o streak
        if (stats.streakData.lastActivityDate) {
          const lastActivityDate = new Date(stats.streakData.lastActivityDate);
          lastActivityDate.setHours(0, 0, 0, 0);
          
          // Só incrementa se não atualizou hoje ainda
          if (lastActivityDate.getTime() < today.getTime()) {
            stats.streakData.currentStreak += 1;
          }
        } else {
          stats.streakData.currentStreak = 1;
        }
        
        if (stats.streakData.currentStreak > stats.streakData.longestStreak) {
          stats.streakData.longestStreak = stats.streakData.currentStreak;
        }
      } else {
        // Quebrou o streak, reinicia
        stats.streakData.currentStreak = 1;
      }

      stats.streakData.lastActivityDate = today.toISOString();
    }

    return await this.saveStatistics(stats);
  }

  /**
   * Obtém ranking de acertos
   */
  async getAccuracyRanking(
    userId: string,
    _filters?: RankingFilters,
  ): Promise<RankingData> {
    try {
      // Buscar top 20 usuários por acurácia
      const { data: topUsers, error: topError } = await this.supabase
        .from('user_statistics')
        .select('user_id, overall_accuracy, total_questions_answered')
        .order('overall_accuracy', { ascending: false })
        .limit(20);

      if (topError) throw topError;

      // Buscar posição do usuário atual
      const { data: userStats, error: userError } = await this.supabase
        .from('user_statistics')
        .select('user_id, overall_accuracy, total_questions_answered')
        .eq('user_id', userId)
        .single();

      if (userError && userError.code !== 'PGRST116') throw userError;

      // Contar total de usuários
      const { count, error: countError } = await this.supabase
        .from('user_statistics')
        .select('*', { count: 'exact', head: true });

      if (countError) throw countError;

      const top20: UserRanking[] = (topUsers || []).map((user, index) => ({
        userId: user.user_id,
        userName: 'Usuário', // TODO: Buscar nome real do usuário
        position: index + 1,
        value: user.overall_accuracy,
        percentile: count ? ((count - index) / count) * 100 : 0,
      }));

      let currentUser: UserRanking;
      if (userStats) {
        // Calcular posição do usuário
        const { count: betterCount } = await this.supabase
          .from('user_statistics')
          .select('*', { count: 'exact', head: true })
          .gt('overall_accuracy', userStats.overall_accuracy);

        const position = (betterCount || 0) + 1;
        currentUser = {
          userId: userStats.user_id,
          userName: 'Você',
          position,
          value: userStats.overall_accuracy,
          percentile: count ? ((count - position + 1) / count) * 100 : 0,
        };
      } else {
        // Usuário sem estatísticas ainda
        currentUser = {
          userId,
          userName: 'Você',
          position: count || 0,
          value: 0,
          percentile: 0,
        };
      }

      return {
        type: 'accuracy_general',
        top20,
        currentUser,
        totalUsers: count || 0,
      };
    } catch (error) {
      logger.error('Erro ao buscar ranking de acertos:', error);
      throw error;
    }
  }

  /**
   * Obtém ranking por especialidade
   */
  async getSpecialtyAccuracyRanking(
    userId: string,
    _specialtyId: string,
    filters?: RankingFilters,
  ): Promise<RankingData> {
    try {
      // Por enquanto, retornar ranking geral
      // TODO: Implementar ranking por especialidade quando houver dados
      return this.getAccuracyRanking(userId, filters);
    } catch (error) {
      logger.error('Erro ao buscar ranking por especialidade:', error);
      throw error;
    }
  }

  /**
   * Obtém ranking de questões
   */
  async getQuestionsRanking(
    userId: string,
    _filters?: RankingFilters,
  ): Promise<RankingData> {
    try {
      // Buscar top 20 usuários por questões respondidas
      const { data: topUsers, error: topError } = await this.supabase
        .from('user_statistics')
        .select('user_id, total_questions_answered, overall_accuracy')
        .order('total_questions_answered', { ascending: false })
        .limit(20);

      if (topError) throw topError;

      // Buscar posição do usuário atual
      const { data: userStats, error: userError } = await this.supabase
        .from('user_statistics')
        .select('user_id, total_questions_answered, overall_accuracy')
        .eq('user_id', userId)
        .single();

      if (userError && userError.code !== 'PGRST116') throw userError;

      // Contar total de usuários
      const { count, error: countError } = await this.supabase
        .from('user_statistics')
        .select('*', { count: 'exact', head: true });

      if (countError) throw countError;

      const top20: UserRanking[] = (topUsers || []).map((user, index) => ({
        userId: user.user_id,
        userName: 'Usuário', // TODO: Buscar nome real do usuário
        position: index + 1,
        value: user.total_questions_answered,
        percentile: count ? ((count - index) / count) * 100 : 0,
      }));

      let currentUser: UserRanking;
      if (userStats) {
        // Calcular posição do usuário
        const { count: betterCount } = await this.supabase
          .from('user_statistics')
          .select('*', { count: 'exact', head: true })
          .gt('total_questions_answered', userStats.total_questions_answered);

        const position = (betterCount || 0) + 1;
        currentUser = {
          userId: userStats.user_id,
          userName: 'Você',
          position,
          value: userStats.total_questions_answered,
          percentile: count ? ((count - position + 1) / count) * 100 : 0,
        };
      } else {
        // Usuário sem estatísticas ainda
        currentUser = {
          userId,
          userName: 'Você',
          position: count || 0,
          value: 0,
          percentile: 0,
        };
      }

      return {
        type: 'questions_total',
        top20,
        currentUser,
        totalUsers: count || 0,
      };
    } catch (error) {
      logger.error('Erro ao buscar ranking de questões:', error);
      throw error;
    }
  }

  /**
   * Obtém comparação de métrica
   */
  async getMetricComparison(
    _userId: string,
    _metric: 'accuracy' | 'questions' | 'studyTime' | 'flashcards' | 'reviews',
    _specialty?: string,
  ): Promise<ComparisonData> {
    // TODO: Implementar
    throw new Error('Not implemented yet');
  }

  /**
   * Recalcula estatísticas a partir dos dados reais
   */
  async recalculateStatistics(userId: string): Promise<UserStatistics> {
    try {
      logger.info(`Recalculando estatísticas para usuário ${userId}`);

      // Buscar estatísticas existentes para manter o mesmo ID
      const { data: existingStats } = await this.supabase
        .from('user_statistics')
        .select('id, created_at')
        .eq('user_id', userId)
        .single();

      const statsId = existingStats?.id || `stats_${userId}_${Date.now()}`;
      const createdAt = existingStats?.created_at || new Date().toISOString();

      // Buscar todas as respostas de questões
      const { data: responses, error: responsesError } = await this.supabase
        .from('question_responses')
        .select('*')
        .eq('user_id', userId);

      if (responsesError) throw responsesError;

      // Buscar IDs únicos de questões
      const questionIds = [...new Set(responses?.map(r => r.question_id) || [])];
      
      // Buscar dados das questões separadamente
      const { data: questions, error: questionsError } = await this.supabase
        .from('questions')
        .select('id, filter_ids, sub_filter_ids')
        .in('id', questionIds);

      if (questionsError) throw questionsError;

      // Criar mapa de questões para acesso rápido
      const questionsMap = new Map(questions?.map(q => [q.id, q]) || []);

      // Calcular estatísticas básicas
      // Contar apenas questões únicas (não todas as tentativas)
      const uniqueQuestions = new Set(responses?.map(r => r.question_id) || []);
      const totalQuestions = uniqueQuestions.size;
      
      // Para acurácia, considerar apenas a primeira tentativa de cada questão
      const firstAttempts = new Map<string, any>();
      responses?.forEach(r => {
        if (!firstAttempts.has(r.question_id) || r.attempt_number === 1) {
          if (!firstAttempts.has(r.question_id) || r.attempt_number < firstAttempts.get(r.question_id).attempt_number) {
            firstAttempts.set(r.question_id, r);
          }
        }
      });
      
      const correctAnswers = Array.from(firstAttempts.values()).filter(r => r.is_correct_on_first_attempt).length;
      // const firstTimeCorrect = correctAnswers; // Já estamos considerando apenas primeira tentativa
      
      const overallAccuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
      const firstTimeSuccessRate = overallAccuracy; // Mesma coisa neste contexto

      // Buscar filtros de especialidades médicas
      const { data: medicalSpecialtyFilters } = await this.supabase
        .from('filters')
        .select('id')
        .eq('category', 'MEDICAL_SPECIALTY');
      
      const medicalSpecialtyIds = new Set(medicalSpecialtyFilters?.map(f => f.id) || []);
      
      // Calcular estatísticas por especialidade (apenas MEDICAL_SPECIALTY)
      // Usar apenas primeira tentativa de cada questão
      const statsBySpecialty: Record<string, any> = {};
      
      // Criar mapa de questões únicas por especialidade
      const questionsBySpecialty = new Map<string, Set<string>>();
      
      Array.from(firstAttempts.values()).forEach(r => {
        const question = questionsMap.get(r.question_id);
        const filterIds = question?.filter_ids || [];
        
        filterIds.forEach((filterId: string) => {
          // Apenas contar se for uma especialidade médica
          if (medicalSpecialtyIds.has(filterId)) {
            if (!questionsBySpecialty.has(filterId)) {
              questionsBySpecialty.set(filterId, new Set());
            }
            questionsBySpecialty.get(filterId)!.add(r.question_id);
            
            if (!statsBySpecialty[filterId]) {
              statsBySpecialty[filterId] = {
                totalQuestions: 0,
                correctAnswers: 0,
                accuracy: 0,
                firstTimeSuccessRate: 0,
                firstTimeCorrect: 0,
              };
            }
            
            statsBySpecialty[filterId].totalQuestions++;
            if (r.is_correct_on_first_attempt) {
              statsBySpecialty[filterId].correctAnswers++;
              statsBySpecialty[filterId].firstTimeCorrect++;
            }
          }
        });
      });

      // Calcular acurácia por especialidade
      Object.keys(statsBySpecialty).forEach(filterId => {
        const stats = statsBySpecialty[filterId];
        stats.accuracy = stats.totalQuestions > 0 
          ? (stats.correctAnswers / stats.totalQuestions) * 100 
          : 0;
        stats.firstTimeSuccessRate = stats.totalQuestions > 0
          ? (stats.firstTimeCorrect / stats.totalQuestions) * 100
          : 0;
        delete stats.firstTimeCorrect; // Remover campo temporário
      });

      // Buscar dados de revisões
      // Buscar revisões usando função otimizada do banco
      const { data: reviewsData, error: reviewsError } = await this.supabase
        .rpc('get_user_reviews_by_type', { p_user_id: userId })
        .single();

      if (reviewsError) throw reviewsError;

      const reviewsResult = reviewsData as { 
        total_reviews: number; 
        questions_reviews: number; 
        flashcards_reviews: number; 
        error_notebook_reviews: number; 
      } | null;

      const totalReviews = Number(reviewsResult?.total_reviews || 0);
      const reviewsByType = {
        total: totalReviews,
        questions: Number(reviewsResult?.questions_reviews || 0),
        flashcards: Number(reviewsResult?.flashcards_reviews || 0),
        errorNotebook: Number(reviewsResult?.error_notebook_reviews || 0),
      };

      // Buscar flashcards estudados usando função otimizada do banco
      const { data: flashcardsResult } = await this.supabase
        .rpc('get_user_flashcards_studied_count', { p_user_id: userId });

      const flashcardsCount = flashcardsResult || 0;

      // Buscar timezone do usuário
      const userTimezone = await this.timezoneService.getUserTimezone(userId);

      // Calcular questões por mês e acurácia por mês
      const questionsByMonth: Record<string, number> = {};
      const accuracyByMonth: Record<string, { correct: number; total: number }> = {};
      
      responses?.forEach(r => {
        if (!r.answered_at) return;
        
        // Lidar com answered_at que pode ser string ou objeto {value: string}
        const answeredAtValue = typeof r.answered_at === 'object' && r.answered_at !== null 
          ? (r.answered_at as any).value 
          : r.answered_at;
        
        const date = new Date(answeredAtValue);
        if (isNaN(date.getTime())) return; // Pular datas inválidas
        
        // Converter para timezone do usuário
        const zonedDate = toZonedTime(date, userTimezone);
        const monthKey = `${zonedDate.getFullYear()}-${String(zonedDate.getMonth() + 1).padStart(2, '0')}`;
        
        questionsByMonth[monthKey] = (questionsByMonth[monthKey] || 0) + 1;
        
        if (!accuracyByMonth[monthKey]) {
          accuracyByMonth[monthKey] = { correct: 0, total: 0 };
        }
        accuracyByMonth[monthKey].total++;
        if (r.is_correct_on_first_attempt) {
          accuracyByMonth[monthKey].correct++;
        }
      });

      const accuracyByMonthFinal: Record<string, number> = {};
      Object.keys(accuracyByMonth).forEach(month => {
        const data = accuracyByMonth[month];
        accuracyByMonthFinal[month] = data.total > 0 ? (data.correct / data.total) * 100 : 0;
      });

      // Calcular heatmap (últimos 90 dias) usando study_sessions
      const heatmapData: HeatmapData[] = [];
      const studyDaysByMonth: Record<string, number> = {};
      const today = new Date();
      
      // Buscar sessões dos últimos 90 dias
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 89);
      startDate.setHours(0, 0, 0, 0);

      const { data: heatmapSessions } = await this.supabase
        .from('study_sessions')
        .select('started_at, duration_seconds')
        .eq('user_id', userId)
        .not('ended_at', 'is', null)
        .gte('started_at', startDate.toISOString());

      // Criar mapa de dados por dia
      const dayDataMap = new Map<string, { minutes: number; sessions: number }>();

      // Processar sessões
      heatmapSessions?.forEach(session => {
        const date = new Date(session.started_at);
        // Converter para timezone do usuário
        const zonedDate = toZonedTime(date, userTimezone);
        const dateStr = format(zonedDate, 'yyyy-MM-dd', { timeZone: userTimezone });
        
        if (!dayDataMap.has(dateStr)) {
          dayDataMap.set(dateStr, { minutes: 0, sessions: 0 });
        }
        
        const dayData = dayDataMap.get(dateStr)!;
        dayData.minutes += Math.round((session.duration_seconds || 0) / 60);
        dayData.sessions += 1;
      });

      // Buscar questões dos últimos 90 dias para calcular acurácia
      const questionsDataMap = new Map<string, { total: number; correct: number }>();
      
      responses?.forEach(r => {
        if (!r.answered_at) return;
        const answeredAtValue = typeof r.answered_at === 'object' && r.answered_at !== null 
          ? (r.answered_at as any).value 
          : r.answered_at;
        const rDate = new Date(answeredAtValue);
        if (isNaN(rDate.getTime())) return;
        
        // Converter para timezone do usuário
        const zonedDate = toZonedTime(rDate, userTimezone);
        const dateStr = format(zonedDate, 'yyyy-MM-dd', { timeZone: userTimezone });
        
        // Apenas últimos 90 dias
        const zonedStartDate = toZonedTime(startDate, userTimezone);
        const zonedToday = toZonedTime(today, userTimezone);
        
        if (zonedDate >= zonedStartDate && zonedDate <= zonedToday) {
          if (!questionsDataMap.has(dateStr)) {
            questionsDataMap.set(dateStr, { total: 0, correct: 0 });
          }
          
          const qData = questionsDataMap.get(dateStr)!;
          qData.total += 1;
          if (r.is_correct_on_first_attempt) {
            qData.correct += 1;
          }
        }
      });
      
      // Gerar dados para todos os 90 dias
      for (let i = 89; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        // Converter para timezone do usuário
        const zonedDate = toZonedTime(date, userTimezone);
        const dateStr = format(zonedDate, 'yyyy-MM-dd', { timeZone: userTimezone });
        const monthKey = `${zonedDate.getFullYear()}-${String(zonedDate.getMonth() + 1).padStart(2, '0')}`;
        
        const dayData = dayDataMap.get(dateStr);
        const qData = questionsDataMap.get(dateStr);
        
        const minutesThisDay = dayData?.minutes || 0;
        const questionsThisDay = qData?.total || 0;
        const accuracy = qData && qData.total > 0 ? (qData.correct / qData.total) * 100 : 0;
        
        if (minutesThisDay > 0 || questionsThisDay > 0) {
          heatmapData.push({ 
            date: dateStr, 
            minutesStudied: minutesThisDay,
            questionsAnswered: questionsThisDay,
            accuracy,
          });
          
          studyDaysByMonth[monthKey] = (studyDaysByMonth[monthKey] || 0) + 1;
        }
      }

      // Calcular streak baseado em study_sessions (não em question_responses)
      // Buscar todas as sessões finalizadas do usuário
      const { data: allSessions } = await this.supabase
        .from('study_sessions')
        .select('started_at')
        .eq('user_id', userId)
        .not('ended_at', 'is', null)
        .order('started_at', { ascending: false });

      // Extrair datas únicas de estudo
      const sortedDates = Array.from(
        new Set(
          (allSessions || [])
            .map(session => {
              const date = new Date(session.started_at);
              return date.toISOString().split('T')[0];
            })
        )
      ).sort().reverse();

      let currentStreak = 0;
      let longestStreak = 0;
      let tempStreak = 0;
      let lastDate: Date | null = null;

      const todayForStreak = new Date();
      todayForStreak.setHours(0, 0, 0, 0);
      const yesterday = new Date(todayForStreak);
      yesterday.setDate(yesterday.getDate() - 1);

      sortedDates.forEach(dateStr => {
        const date = new Date(dateStr);
        date.setHours(0, 0, 0, 0);
        
        if (!lastDate) {
          tempStreak = 1;
          
          // Se estudou hoje ou ontem, inicia o streak atual
          if (date.getTime() === todayForStreak.getTime() || date.getTime() === yesterday.getTime()) {
            currentStreak = 1;
          }
        } else {
          const diffDays = Math.floor((lastDate.getTime() - date.getTime()) / 86400000);
          
          if (diffDays === 1) {
            // Dias consecutivos
            tempStreak++;
            if (currentStreak > 0) {
              currentStreak++;
            }
          } else {
            // Quebrou a sequência
            longestStreak = Math.max(longestStreak, tempStreak);
            tempStreak = 1;
            currentStreak = 0;
          }
        }
        
        lastDate = date;
      });
      
      longestStreak = Math.max(longestStreak, tempStreak, currentStreak);

      // Calcular estatísticas por universidade (usando sub_filter_ids)
      // Buscar TODOS os subfiltros usando paginação em lotes (Supabase tem limite de 1000)
      let allSubFilters: any[] = [];
      let from = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: batch, error: batchError } = await this.supabase
          .from('sub_filters')
          .select('id, name, filter_id, parent_id, level')
          .range(from, from + batchSize - 1);

        if (batchError) {
          logger.error('Erro ao buscar lote de subfiltros:', batchError);
          break;
        }

        if (!batch || batch.length === 0) {
          hasMore = false;
          break;
        }

        allSubFilters = allSubFilters.concat(batch);
        
        // Se retornou menos que o tamanho do lote, não há mais dados
        if (batch.length < batchSize) {
          hasMore = false;
        } else {
          from += batchSize;
        }
      }
      
      logger.info(`[DEBUG] Total de subfiltros carregados do banco: ${allSubFilters.length}`);
      
      // Criar mapa de subfiltros
      const subFiltersMap = new Map(allSubFilters.map(sf => [sf.id, sf]));
      
      logger.info(`[DEBUG] Tamanho do mapa de subfiltros: ${subFiltersMap.size}`);
      
      // Identificar o filtro "Universidade"
      const { data: universidadeFilter } = await this.supabase
        .from('filters')
        .select('id')
        .eq('name', 'Universidade')
        .single();
      
      const universidadeFilterId = universidadeFilter?.id;
      
      // Calcular estatísticas por universidade (apenas primeira tentativa)
      const statsByUniversity: Record<string, any> = {};
      
      logger.info(`[DEBUG] Calculando estatísticas por universidade. Total de respostas: ${firstAttempts.size}`);
      logger.info(`[DEBUG] Filtro Universidade ID: ${universidadeFilterId}`);
      
      Array.from(firstAttempts.values()).forEach(r => {
        const question = questionsMap.get(r.question_id);
        const subFilterIds = question?.sub_filter_ids || [];
        
        subFilterIds.forEach((subFilterId: string) => {
          const subFilter = subFiltersMap.get(subFilterId);
          
          if (!subFilter) {
            return;
          }
          
          // Apenas contar se for um subfiltro de universidade E tiver parent_id (universidades têm parent_id de estado)
          if (subFilter.filter_id === universidadeFilterId && subFilter.parent_id) {
            // Verificar se o parent_id começa com "Universidade_" (é um estado)
            if (subFilter.parent_id.startsWith('Universidade_')) {
              if (!statsByUniversity[subFilterId]) {
                statsByUniversity[subFilterId] = {
                  totalQuestions: 0,
                  correctAnswers: 0,
                  accuracy: 0,
                };
              }
              
              statsByUniversity[subFilterId].totalQuestions++;
              if (r.is_correct_on_first_attempt) {
                statsByUniversity[subFilterId].correctAnswers++;
              }
            }
          }
        });
      });
      
      logger.info(`[DEBUG] Total de universidades encontradas: ${Object.keys(statsByUniversity).length}`);

      Object.keys(statsByUniversity).forEach(subFilterId => {
        const stats = statsByUniversity[subFilterId];
        stats.accuracy = stats.totalQuestions > 0 
          ? (stats.correctAnswers / stats.totalQuestions) * 100 
          : 0;
      });

      // Calcular tempo real de estudo baseado em study_sessions
      const { data: studySessions } = await this.supabase
        .from('study_sessions')
        .select('duration_seconds, started_at')
        .eq('user_id', userId)
        .not('ended_at', 'is', null);

      const totalMinutesStudied = studySessions?.reduce((acc, session) => {
        return acc + Math.round((session.duration_seconds || 0) / 60);
      }, 0) || 0;

      // Calcular dias únicos de estudo
      const uniqueStudyDays = new Set(
        studySessions?.map(session => {
          const date = new Date(session.started_at);
          return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
        }) || []
      );
      const daysStudied = uniqueStudyDays.size;
      const averageDailyStudyTime = daysStudied > 0 ? Math.round(totalMinutesStudied / daysStudied) : 0;

      // Calcular snapshots temporais (30, 60, 90 dias atrás)
      const now = new Date();
      const date30DaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const date60DaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      const date90DaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

      const responses30DaysAgo = responses?.filter(r => {
        if (!r.answered_at) return false;
        const answeredAtValue = typeof r.answered_at === 'object' && r.answered_at !== null 
          ? (r.answered_at as any).value 
          : r.answered_at;
        const date = new Date(answeredAtValue);
        return !isNaN(date.getTime()) && date <= date30DaysAgo;
      }) || [];
      
      const responses60DaysAgo = responses?.filter(r => {
        if (!r.answered_at) return false;
        const answeredAtValue = typeof r.answered_at === 'object' && r.answered_at !== null 
          ? (r.answered_at as any).value 
          : r.answered_at;
        const date = new Date(answeredAtValue);
        return !isNaN(date.getTime()) && date <= date60DaysAgo;
      }) || [];
      
      const responses90DaysAgo = responses?.filter(r => {
        if (!r.answered_at) return false;
        const answeredAtValue = typeof r.answered_at === 'object' && r.answered_at !== null 
          ? (r.answered_at as any).value 
          : r.answered_at;
        const date = new Date(answeredAtValue);
        return !isNaN(date.getTime()) && date <= date90DaysAgo;
      }) || [];

      const calculateSnapshot = (resps: any[]): StatisticsSnapshot | null => {
        if (resps.length === 0) return null;
        const total = resps.length;
        const correct = resps.filter(r => r.is_correct_on_first_attempt).length;
        return {
          accuracy: total > 0 ? (correct / total) * 100 : 0,
          questionsAnswered: total,
          averageSessionDuration: 0,
          timestamp: new Date().toISOString(),
        };
      };

      // Criar estatísticas atualizadas
      const stats: UserStatistics = {
        id: statsId,
        userId,
        totalQuestionsAnswered: totalQuestions,
        correctAnswers,
        overallAccuracy,
        firstTimeSuccessRate,
        totalMinutesStudied,
        sessionsCount: daysStudied,
        averageSessionDuration: daysStudied > 0 ? Math.round(totalMinutesStudied / daysStudied) : 0,
        studyTimeDistribution: {
          byHour: {},
          byDay: {},
          byWeek: {},
          byMonth: {},
        },
        averageDailyStudyTime,
        streakData: {
          currentStreak,
          longestStreak,
          lastActivityDate: sortedDates[0] ? new Date(sortedDates[0]).toISOString() : null,
        },
        daysStudiedThisMonth: studyDaysByMonth[`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`] || 0,
        daysStudiedByMonth: studyDaysByMonth,
        totalFlashcardsStudied: flashcardsCount || 0,
        totalReviews,
        reviewsByType,
        statsBySpecialty,
        statsByUniversity,
        questionsByMonth,
        accuracyByMonth: accuracyByMonthFinal,
        heatmapData,
        stats30DaysAgo: calculateSnapshot(responses30DaysAgo),
        stats60DaysAgo: calculateSnapshot(responses60DaysAgo),
        stats90DaysAgo: calculateSnapshot(responses90DaysAgo),
        lastCalculated: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdAt: createdAt,
      };

      // Salvar no banco
      await this.saveStatistics(stats);

      logger.info(`✅ Estatísticas recalculadas: ${totalQuestions} questões, ${correctAnswers} acertos, ${currentStreak} dias streak`);
      return stats;
    } catch (error) {
      logger.error('Erro ao recalcular estatísticas:', error);
      throw error;
    }
  }

  /**
   * Atualiza apenas o streak (mais rápido que recalcular tudo)
   */
  async updateStreakOnly(userId: string): Promise<{ currentStreak: number; longestStreak: number; lastActivityDate: string | null }> {
    try {
      // Buscar todas as sessões finalizadas do usuário
      const { data: allSessions } = await this.supabase
        .from('study_sessions')
        .select('started_at')
        .eq('user_id', userId)
        .not('ended_at', 'is', null)
        .order('started_at', { ascending: false });

      // Extrair datas únicas de estudo
      const sortedDates = Array.from(
        new Set(
          (allSessions || [])
            .map(session => {
              const date = new Date(session.started_at);
              return date.toISOString().split('T')[0];
            })
        )
      ).sort().reverse();

      let currentStreak = 0;
      let longestStreak = 0;
      let tempStreak = 0;
      let lastDate: Date | null = null;

      const todayForStreak = new Date();
      todayForStreak.setHours(0, 0, 0, 0);
      const yesterday = new Date(todayForStreak);
      yesterday.setDate(yesterday.getDate() - 1);

      sortedDates.forEach(dateStr => {
        const date = new Date(dateStr);
        date.setHours(0, 0, 0, 0);
        
        if (!lastDate) {
          tempStreak = 1;
          
          // Se estudou hoje ou ontem, inicia o streak atual
          if (date.getTime() === todayForStreak.getTime() || date.getTime() === yesterday.getTime()) {
            currentStreak = 1;
          }
        } else {
          const diffDays = Math.floor((lastDate.getTime() - date.getTime()) / 86400000);
          
          if (diffDays === 1) {
            // Dias consecutivos
            tempStreak++;
            if (currentStreak > 0) {
              currentStreak++;
            }
          } else {
            // Quebrou a sequência
            longestStreak = Math.max(longestStreak, tempStreak);
            tempStreak = 1;
            currentStreak = 0;
          }
        }
        
        lastDate = date;
      });
      
      longestStreak = Math.max(longestStreak, tempStreak, currentStreak);

      const lastActivityDate = sortedDates[0] ? new Date(sortedDates[0]).toISOString() : null;

      // Atualizar no banco
      const { error } = await this.supabase
        .from('user_statistics')
        .update({
          streak_data: {
            currentStreak,
            longestStreak,
            lastActivityDate,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (error) {
        logger.error('Erro ao atualizar streak:', error);
      }

      logger.info(`✅ Streak atualizado: ${currentStreak} dias (melhor: ${longestStreak})`);

      return {
        currentStreak,
        longestStreak,
        lastActivityDate,
      };
    } catch (error) {
      logger.error('Erro ao atualizar streak:', error);
      return {
        currentStreak: 0,
        longestStreak: 0,
        lastActivityDate: null,
      };
    }
  }

  /**
   * Deleta estatísticas
   */
  async deleteUserStatistics(userId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('user_statistics')
        .delete()
        .eq('user_id', userId);

      if (error) {
        logger.error('Erro ao deletar estatísticas:', error);
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Erro em deleteUserStatistics:', error);
      return false;
    }
  }

  // === COMPARAÇÕES GLOBAIS ===

  /**
   * Obtém média global de acertos por mês (com filtro de período)
   */
  async getGlobalAccuracyByMonth(startDate?: Date, endDate?: Date): Promise<Array<{ month: string; averageAccuracy: number }>> {
    try {
      const { data, error } = await this.supabase
        .rpc('get_global_accuracy_by_month', {
          p_start_date: startDate?.toISOString() || null,
          p_end_date: endDate?.toISOString() || null,
        });

      if (error) {
        logger.error('Erro ao buscar média global por mês:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      logger.error('Erro em getGlobalAccuracyByMonth:', error);
      return [];
    }
  }

  /**
   * Obtém média global de acertos por especialidade (com filtro de período)
   */
  async getGlobalAccuracyBySpecialty(startDate?: Date, endDate?: Date): Promise<Array<{ 
    filterId: string; 
    filterName: string; 
    averageAccuracy: number; 
    totalQuestions: number;
    totalUsers: number;
  }>> {
    try {
      const { data, error } = await this.supabase
        .rpc('get_global_accuracy_by_specialty', {
          p_start_date: startDate?.toISOString() || null,
          p_end_date: endDate?.toISOString() || null,
        });

      if (error) {
        logger.error('Erro ao buscar média global por especialidade:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      logger.error('Erro em getGlobalAccuracyBySpecialty:', error);
      return [];
    }
  }

  /**
   * Obtém média global de acertos por universidade (com filtro de período)
   */
  async getGlobalAccuracyByUniversity(startDate?: Date, endDate?: Date): Promise<Array<{ 
    subFilterId: string; 
    universityName: string; 
    averageAccuracy: number; 
    totalQuestions: number;
    totalUsers: number;
  }>> {
    try {
      const { data, error } = await this.supabase
        .rpc('get_global_accuracy_by_university', {
          p_start_date: startDate?.toISOString() || null,
          p_end_date: endDate?.toISOString() || null,
        });

      if (error) {
        logger.error('Erro ao buscar média global por universidade:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      logger.error('Erro em getGlobalAccuracyByUniversity:', error);
      return [];
    }
  }

  /**
   * Obtém média global de questões por mês (com filtro de período)
   */
  async getGlobalQuestionsPerMonth(startDate?: Date, endDate?: Date): Promise<Array<{ month: string; averageQuestions: number }>> {
    try {
      const { data, error } = await this.supabase
        .rpc('get_global_questions_per_month', {
          p_start_date: startDate?.toISOString() || null,
          p_end_date: endDate?.toISOString() || null,
        });

      if (error) {
        logger.error('Erro ao buscar média global de questões por mês:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      logger.error('Erro em getGlobalQuestionsPerMonth:', error);
      return [];
    }
  }

  /**
   * Obtém quantidade de questões por especialidade do usuário
   */
  async getUserQuestionsBySpecialty(
    userId: string,
    _period: 'day' | 'week' | 'month',
    startDate?: Date,
    endDate?: Date
  ): Promise<Array<{ 
    filterId: string; 
    filterName: string; 
    count: number;
    accuracy: number;
  }>> {
    try {
      const start = startDate || new Date(new Date().setDate(new Date().getDate() - 30));
      const end = endDate || new Date();

      const { data, error } = await this.supabase
        .rpc('get_user_questions_by_specialty', {
          p_user_id: userId,
          p_start_date: start.toISOString(),
          p_end_date: end.toISOString(),
        });

      if (error) {
        logger.error('Erro ao buscar questões por especialidade:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      logger.error('Erro em getUserQuestionsBySpecialty:', error);
      return [];
    }
  }

  /**
   * Obtém quantidade de questões por universidade do usuário
   */
  async getUserQuestionsByUniversity(
    userId: string,
    _period: 'day' | 'week' | 'month',
    startDate?: Date,
    endDate?: Date
  ): Promise<Array<{ 
    subFilterId: string; 
    universityName: string; 
    count: number;
    accuracy: number;
  }>> {
    try {
      const start = startDate || new Date(new Date().setDate(new Date().getDate() - 30));
      const end = endDate || new Date();

      const { data, error } = await this.supabase
        .rpc('get_user_questions_by_university', {
          p_user_id: userId,
          p_start_date: start.toISOString(),
          p_end_date: end.toISOString(),
        });

      if (error) {
        logger.error('Erro ao buscar questões por universidade:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      logger.error('Erro em getUserQuestionsByUniversity:', error);
      return [];
    }
  }

  /**
   * Obtém quantidade de questões por subespecialidade do usuário
   */
  async getUserQuestionsBySubspecialty(
    userId: string,
    _period: 'day' | 'week' | 'month',
    startDate?: Date,
    endDate?: Date
  ): Promise<Array<{ 
    subFilterId: string; 
    subspecialtyName: string; 
    count: number;
    accuracy: number;
  }>> {
    try {
      const start = startDate || new Date(new Date().setDate(new Date().getDate() - 30));
      const end = endDate || new Date();

      const { data, error } = await this.supabase
        .rpc('get_user_questions_by_subspecialty', {
          p_user_id: userId,
          p_start_date: start.toISOString(),
          p_end_date: end.toISOString(),
        });

      if (error) {
        logger.error('Erro ao buscar questões por subespecialidade:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      logger.error('Erro em getUserQuestionsBySubspecialty:', error);
      return [];
    }
  }

  /**
   * Obtém média global de acertos por subespecialidade
   */
  async getGlobalAccuracyBySubspecialty(
    startDate?: Date,
    endDate?: Date
  ): Promise<Array<{ 
    subFilterId: string; 
    subspecialtyName: string; 
    averageAccuracy: number; 
    totalQuestions: number;
    totalUsers: number;
  }>> {
    try {
      const { data, error } = await this.supabase
        .rpc('get_global_accuracy_by_subspecialty', {
          p_start_date: startDate?.toISOString() || null,
          p_end_date: endDate?.toISOString() || null,
        });

      if (error) {
        logger.error('Erro ao buscar média global por subespecialidade:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      logger.error('Erro em getGlobalAccuracyBySubspecialty:', error);
      return [];
    }
  }

  /**
   * Obtém dados de tempo de estudo por dia
   */
  async getStudyTimeData(
    userId: string,
    days: number = 7,
  ): Promise<Array<{ date: string; minutes: number; sessions: number }>> {
    try {
      // Calcular data inicial
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days + 1);
      startDate.setHours(0, 0, 0, 0);

      // Buscar sessões de estudo
      const { data: sessions, error } = await this.supabase
        .from('study_sessions')
        .select('started_at, duration_seconds')
        .eq('user_id', userId)
        .not('ended_at', 'is', null)
        .gte('started_at', startDate.toISOString())
        .order('started_at', { ascending: true });

      if (error) {
        logger.error('Erro ao buscar dados de tempo de estudo:', error);
        return [];
      }

      // Agrupar por dia
      const dataByDay = new Map<string, { minutes: number; sessions: number }>();

      // Inicializar todos os dias com 0
      for (let i = 0; i < days; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        dataByDay.set(dateStr, { minutes: 0, sessions: 0 });
      }

      // Processar sessões
      sessions?.forEach((session) => {
        const date = new Date(session.started_at);
        const dateStr = date.toISOString().split('T')[0];
        
        if (dataByDay.has(dateStr)) {
          const current = dataByDay.get(dateStr)!;
          current.minutes += Math.round((session.duration_seconds || 0) / 60);
          current.sessions += 1;
        }
      });

      // Converter para array
      return Array.from(dataByDay.entries())
        .map(([date, data]) => ({
          date,
          minutes: data.minutes,
          sessions: data.sessions,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
      logger.error('Erro em getStudyTimeData:', error);
      return [];
    }
  }

  // === MÉTODOS PRIVADOS ===

  private createEmptyStatistics(userId: string): UserStatistics {
    const now = new Date().toISOString();
    
    return {
      id: `stats_${userId}_${Date.now()}`,
      userId,
      totalQuestionsAnswered: 0,
      correctAnswers: 0,
      overallAccuracy: 0,
      firstTimeSuccessRate: 0,
      totalMinutesStudied: 0,
      sessionsCount: 0,
      averageSessionDuration: 0,
      studyTimeDistribution: {
        byHour: {},
        byDay: {},
        byWeek: {},
        byMonth: {},
      },
      averageDailyStudyTime: 0,
      streakData: {
        currentStreak: 0,
        longestStreak: 0,
        lastActivityDate: null,
      },
      daysStudiedThisMonth: 0,
      daysStudiedByMonth: {},
      totalFlashcardsStudied: 0,
      totalReviews: 0,
      reviewsByType: {
        questions: 0,
        flashcards: 0,
        errorNotebook: 0,
        total: 0,
      },
      statsBySpecialty: {},
      statsByUniversity: {},
      questionsByMonth: {},
      accuracyByMonth: {},
      heatmapData: [],
      stats30DaysAgo: null,
      stats60DaysAgo: null,
      stats90DaysAgo: null,
      lastCalculated: now,
      updatedAt: now,
      createdAt: now,
    };
  }

  private async processQuestionAnswer(
    stats: UserStatistics,
    data: NonNullable<StatisticsUpdatePayload['questionAnswered']>,
  ): Promise<void> {
    // Atualizar contadores gerais
    stats.totalQuestionsAnswered += 1;
    if (data.isCorrect) {
      stats.correctAnswers += 1;
    }
    stats.overallAccuracy = (stats.correctAnswers / stats.totalQuestionsAnswered) * 100;

    // Atualizar taxa de primeira tentativa
    if (data.isFirstAttempt) {
      // Recalcular baseado em todas as primeiras tentativas
      // TODO: Buscar do banco todas as primeiras tentativas
    }

    // Atualizar por especialidade
    if (!stats.statsBySpecialty[data.specialtyId]) {
      stats.statsBySpecialty[data.specialtyId] = {
        specialtyId: data.specialtyId,
        specialtyName: '', // TODO: Buscar nome
        totalQuestions: 0,
        correctAnswers: 0,
        accuracy: 0,
        firstTimeSuccessRate: 0,
        questionsByMonth: {},
        accuracyByMonth: {},
      };
    }

    const specialty = stats.statsBySpecialty[data.specialtyId];
    specialty.totalQuestions += 1;
    if (data.isCorrect) {
      specialty.correctAnswers += 1;
    }
    specialty.accuracy = (specialty.correctAnswers / specialty.totalQuestions) * 100;

    // Atualizar por universidade
    if (data.universityId) {
      if (!stats.statsByUniversity[data.universityId]) {
        stats.statsByUniversity[data.universityId] = {
          universityId: data.universityId,
          universityName: '', // TODO: Buscar nome
          totalQuestions: 0,
          correctAnswers: 0,
          accuracy: 0,
        };
      }

      const university = stats.statsByUniversity[data.universityId];
      university.totalQuestions += 1;
      if (data.isCorrect) {
        university.correctAnswers += 1;
      }
      university.accuracy = (university.correctAnswers / university.totalQuestions) * 100;
    }

    // Atualizar questões por mês
    const month = new Date().toISOString().substring(0, 7); // YYYY-MM
    stats.questionsByMonth[month] = (stats.questionsByMonth[month] || 0) + 1;
  }

  private async processStudyTime(
    stats: UserStatistics,
    data: NonNullable<StatisticsUpdatePayload['studyTimeAdded']>,
  ): Promise<void> {
    stats.totalMinutesStudied += data.minutes;

    // Atualizar distribuição por dia
    stats.studyTimeDistribution.byDay[data.date] =
      (stats.studyTimeDistribution.byDay[data.date] || 0) + data.minutes;

    // Atualizar por mês
    const month = data.date.substring(0, 7); // YYYY-MM
    stats.studyTimeDistribution.byMonth[month] =
      (stats.studyTimeDistribution.byMonth[month] || 0) + data.minutes;

    // Atualizar dias estudados no mês
    const daysInMonth = Object.keys(stats.studyTimeDistribution.byDay).filter(
      (d) => d.startsWith(month),
    ).length;
    stats.daysStudiedByMonth[month] = daysInMonth;

    // Calcular média diária (últimos 30 dias)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

    const last30DaysMinutes = Object.entries(stats.studyTimeDistribution.byDay)
      .filter(([date]) => date >= thirtyDaysAgoStr)
      .reduce((sum, [, minutes]) => sum + minutes, 0);

    stats.averageDailyStudyTime = Math.round(last30DaysMinutes / 30);
  }

  private async processFlashcard(
    stats: UserStatistics,
    _data: NonNullable<StatisticsUpdatePayload['flashcardStudied']>,
  ): Promise<void> {
    stats.totalFlashcardsStudied += 1;
  }

  private async processReview(
    stats: UserStatistics,
    data: NonNullable<StatisticsUpdatePayload['reviewCompleted']>,
  ): Promise<void> {
    stats.totalReviews += data.itemsReviewed;
    stats.reviewsByType[data.type] += data.itemsReviewed;
    stats.reviewsByType.total += data.itemsReviewed;
  }

  private async calculateComparisons(
    _userId: string,
    userStats: UserStatistics,
  ): Promise<StatisticsWithComparison['comparison']> {
    // Buscar médias globais
    const { data: globalStats } = await this.supabase
      .from('user_statistics')
      .select('overall_accuracy, total_questions_answered, total_minutes_studied, total_flashcards_studied, total_reviews');

    if (!globalStats || globalStats.length === 0) {
      return undefined;
    }

    const totalUsers = globalStats.length;
    
    // Calcular médias
    const avgAccuracy = globalStats.reduce((sum, s) => sum + (s.overall_accuracy || 0), 0) / totalUsers;
    const avgQuestions = globalStats.reduce((sum, s) => sum + (s.total_questions_answered || 0), 0) / totalUsers;
    const avgStudyTime = globalStats.reduce((sum, s) => sum + (s.total_minutes_studied || 0), 0) / totalUsers;
    const avgFlashcards = globalStats.reduce((sum, s) => sum + (s.total_flashcards_studied || 0), 0) / totalUsers;
    const avgReviews = globalStats.reduce((sum, s) => sum + (s.total_reviews || 0), 0) / totalUsers;

    // Calcular percentis
    const accuracyPercentile = this.calculatePercentile(
      userStats.overallAccuracy,
      globalStats.map(s => s.overall_accuracy || 0),
    );
    const questionsPercentile = this.calculatePercentile(
      userStats.totalQuestionsAnswered,
      globalStats.map(s => s.total_questions_answered || 0),
    );

    return {
      accuracy: {
        metric: 'accuracy',
        userValue: userStats.overallAccuracy,
        averageValue: avgAccuracy,
        medianValue: this.calculateMedian(globalStats.map(s => s.overall_accuracy || 0)),
        percentile: accuracyPercentile,
        totalUsers,
      },
      questionsAnswered: {
        metric: 'questions',
        userValue: userStats.totalQuestionsAnswered,
        averageValue: avgQuestions,
        medianValue: this.calculateMedian(globalStats.map(s => s.total_questions_answered || 0)),
        percentile: questionsPercentile,
        totalUsers,
      },
      studyTime: {
        metric: 'studyTime',
        userValue: userStats.totalMinutesStudied,
        averageValue: avgStudyTime,
        medianValue: this.calculateMedian(globalStats.map(s => s.total_minutes_studied || 0)),
        percentile: this.calculatePercentile(userStats.totalMinutesStudied, globalStats.map(s => s.total_minutes_studied || 0)),
        totalUsers,
      },
      flashcardsStudied: {
        metric: 'flashcards',
        userValue: userStats.totalFlashcardsStudied,
        averageValue: avgFlashcards,
        medianValue: this.calculateMedian(globalStats.map(s => s.total_flashcards_studied || 0)),
        percentile: this.calculatePercentile(userStats.totalFlashcardsStudied, globalStats.map(s => s.total_flashcards_studied || 0)),
        totalUsers,
      },
      reviewsCompleted: {
        metric: 'reviews',
        userValue: userStats.totalReviews,
        averageValue: avgReviews,
        medianValue: this.calculateMedian(globalStats.map(s => s.total_reviews || 0)),
        percentile: this.calculatePercentile(userStats.totalReviews, globalStats.map(s => s.total_reviews || 0)),
        totalUsers,
      },
    };
  }

  private calculatePercentile(value: number, allValues: number[]): number {
    const sorted = allValues.sort((a, b) => a - b);
    const below = sorted.filter(v => v < value).length;
    return Math.round((below / sorted.length) * 100);
  }

  private calculateMedian(values: number[]): number {
    const sorted = values.sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  private async saveStatistics(stats: UserStatistics): Promise<UserStatistics> {
    stats.updatedAt = new Date().toISOString();
    stats.lastCalculated = new Date().toISOString();

    const { error } = await this.supabase
      .from('user_statistics')
      .upsert(this.mapToDatabase(stats));

    if (error) {
      logger.error('Erro ao salvar estatísticas:', error);
      throw error;
    }

    return stats;
  }

  private mapToDatabase(stats: UserStatistics): any {
    return {
      id: stats.id,
      user_id: stats.userId,
      total_questions_answered: stats.totalQuestionsAnswered,
      correct_answers: stats.correctAnswers,
      overall_accuracy: stats.overallAccuracy,
      first_time_success_rate: stats.firstTimeSuccessRate,
      total_minutes_studied: stats.totalMinutesStudied,
      sessions_count: stats.sessionsCount,
      average_session_duration: stats.averageSessionDuration,
      study_time_distribution: stats.studyTimeDistribution,
      average_daily_study_time: stats.averageDailyStudyTime,
      streak_data: stats.streakData,
      days_studied_this_month: stats.daysStudiedThisMonth,
      days_studied_by_month: stats.daysStudiedByMonth,
      total_flashcards_studied: stats.totalFlashcardsStudied,
      total_reviews: stats.totalReviews,
      reviews_by_type: stats.reviewsByType,
      stats_by_specialty: stats.statsBySpecialty,
      stats_by_university: stats.statsByUniversity,
      questions_by_month: stats.questionsByMonth,
      accuracy_by_month: stats.accuracyByMonth,
      heatmap_data: stats.heatmapData,
      stats_30_days_ago: stats.stats30DaysAgo,
      stats_60_days_ago: stats.stats60DaysAgo,
      stats_90_days_ago: stats.stats90DaysAgo,
      last_calculated: stats.lastCalculated,
      updated_at: stats.updatedAt,
      created_at: stats.createdAt,
    };
  }

  private mapToUserStatistics(data: any): UserStatistics {
    return {
      id: data.id,
      userId: data.user_id,
      totalQuestionsAnswered: data.total_questions_answered || 0,
      correctAnswers: data.correct_answers || 0,
      overallAccuracy: data.overall_accuracy || 0,
      firstTimeSuccessRate: data.first_time_success_rate || 0,
      totalMinutesStudied: data.total_minutes_studied || 0,
      sessionsCount: data.sessions_count || 0,
      averageSessionDuration: data.average_session_duration || 0,
      studyTimeDistribution: data.study_time_distribution || { byHour: {}, byDay: {}, byWeek: {}, byMonth: {} },
      averageDailyStudyTime: data.average_daily_study_time || 0,
      streakData: data.streak_data || { currentStreak: 0, longestStreak: 0, lastActivityDate: null },
      daysStudiedThisMonth: data.days_studied_this_month || 0,
      daysStudiedByMonth: data.days_studied_by_month || {},
      totalFlashcardsStudied: data.total_flashcards_studied || 0,
      totalReviews: data.total_reviews || 0,
      reviewsByType: data.reviews_by_type || { questions: 0, flashcards: 0, errorNotebook: 0, total: 0 },
      statsBySpecialty: data.stats_by_specialty || {},
      statsByUniversity: data.stats_by_university || {},
      questionsByMonth: data.questions_by_month || {},
      accuracyByMonth: data.accuracy_by_month || {},
      heatmapData: data.heatmap_data || [],
      stats30DaysAgo: data.stats_30_days_ago || null,
      stats60DaysAgo: data.stats_60_days_ago || null,
      stats90DaysAgo: data.stats_90_days_ago || null,
      lastCalculated: data.last_calculated,
      updatedAt: data.updated_at,
      createdAt: data.created_at,
    };
  }
}
