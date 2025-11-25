import { SupabaseClient } from '@supabase/supabase-js';
import { AppError } from '../../../shared/errors/AppError';
import { logger } from '../../../utils/logger';
import { SupabaseUnifiedReviewService } from '../../../infra/studyTools/supabase/SupabaseUnifiedReviewService';
import { ReviewPreferencesService } from '../../studyTools/unifiedReviews/services/ReviewPreferencesService';

export interface QuestionAttempt {
  id: string;
  user_id: string;
  question_id: string;
  selected_alternative_id: string;
  selected_alternative_letter?: string;
  is_correct: boolean;
  study_mode: 'normal_list' | 'simulated_exam' | 'unified_review';
  was_focus_mode: boolean;
  question_list_id?: string;
  simulated_exam_id?: string;
  attempt_number: number;
  answered_at: string;
  created_at: string;
}

export interface QuestionHistoryStats {
  total_attempts: number;
  correct_attempts: number;
  accuracy_rate: number;
  first_attempt_date: string;
  last_attempt_date: string;
  attempts_by_mode: {
    normal_list: number;
    simulated_exam: number;
    unified_review: number;
  };
  attempts_in_focus_mode: number;
  current_streak: {
    type: 'correct' | 'incorrect';
    count: number;
  };
  most_selected_wrong_alternative?: {
    alternative_id: string;
    count: number;
    percentage: number;
  };
  evolution: 'improving' | 'stable' | 'declining';
  temporal_data: {
    date: string;
    is_correct: boolean;
    attempt_number: number;
  }[];
  error_pattern?: {
    type: 'same_alternative' | 'random' | 'regression';
    description: string;
  };
}

export interface QuestionHistoryWithComparison extends QuestionHistoryStats {
  global_stats?: {
    total_attempts_all_users: number;
    global_accuracy_rate: number;
    user_percentile: number;
    alternative_distribution: Record<string, number>;
  };
}

export class QuestionHistoryService {
  private unifiedReviewService: SupabaseUnifiedReviewService;
  private preferencesService: ReviewPreferencesService;

  constructor(private supabase: SupabaseClient) {
    this.unifiedReviewService = new SupabaseUnifiedReviewService(supabase);
    this.preferencesService = new ReviewPreferencesService(supabase);
  }

  async getQuestionHistory(
    userId: string,
    questionId: string,
    limit?: number
  ): Promise<QuestionAttempt[]> {
    try {
      let query = this.supabase
        .from('question_responses')
        .select('*')
        .eq('user_id', userId)
        .eq('question_id', questionId)
        .order('answered_at', { ascending: false });

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Erro ao buscar histórico de questão:', error);
        throw new AppError('Erro ao buscar histórico', 500);
      }

      // Buscar questões para verificar alternativas corretas
      const questionIds = [...new Set((data || []).map(item => item.question_id))];
      
      let questionsMap: Record<string, { correct_answer: string, options: any[] }> = {};
      if (questionIds.length > 0) {
        const { data: questions } = await this.supabase
          .from('questions')
          .select('id, correct_answer, options')
          .in('id', questionIds);
        
        questionsMap = (questions || []).reduce((acc, q) => {
          acc[q.id] = { correct_answer: q.correct_answer, options: q.options || [] };
          return acc;
        }, {} as Record<string, { correct_answer: string, options: any[] }>);
      }

      // Mapear is_correct e selected_alternative_letter baseado na comparação com correct_answer
      const mappedData = (data || []).map(item => {
        // Extrair e converter datas para string ISO
        const answeredAtStr = this.extractDate(item.answered_at).toISOString();
        const createdAtStr = item.created_at ? this.extractDate(item.created_at).toISOString() : new Date().toISOString();

        if (!item.selected_alternative_id || !item.question_id) {
          return { 
            ...item, 
            is_correct: false,
            answered_at: answeredAtStr,
            created_at: createdAtStr
          } as QuestionAttempt;
        }

        const question = questionsMap[item.question_id];
        if (!question) {
          return { 
            ...item, 
            is_correct: false,
            answered_at: answeredAtStr,
            created_at: createdAtStr
          } as QuestionAttempt;
        }

        // Encontrar a alternativa selecionada
        const selectedOption = question.options.find((opt: any) => opt.id === item.selected_alternative_id);
        if (!selectedOption) {
          return { 
            ...item, 
            is_correct: false,
            answered_at: answeredAtStr,
            created_at: createdAtStr
          } as QuestionAttempt;
        }

        // Verificar se o texto da alternativa selecionada é igual ao correct_answer
        const isCorrect = selectedOption.text === question.correct_answer;
        
        // Calcular a letra da alternativa baseada no order (A, B, C, D, E)
        const alternativeLetter = String.fromCharCode(65 + (selectedOption.order || 0));
        
        return { 
          ...item, 
          is_correct: isCorrect,
          selected_alternative_letter: alternativeLetter,
          answered_at: answeredAtStr,
          created_at: createdAtStr
        } as QuestionAttempt;
      });

      return mappedData as QuestionAttempt[];
    } catch (error) {
      logger.error('Erro ao buscar histórico:', error);
      throw error;
    }
  }

  async getQuestionStats(
    userId: string,
    questionId: string,
    includeComparison: boolean = false
  ): Promise<QuestionHistoryStats | QuestionHistoryWithComparison> {
    try {
      const attempts = await this.getQuestionHistory(userId, questionId);

      if (attempts.length === 0) {
        // Retornar stats vazias ao invés de erro
        return {
          total_attempts: 0,
          correct_attempts: 0,
          accuracy_rate: 0,
          attempts_by_mode: {
            normal_list: 0,
            simulated_exam: 0,
            unified_review: 0,
          },
          attempts_in_focus_mode: 0,
          current_streak: {
            type: 'incorrect' as const,
            count: 0,
          },
          most_selected_wrong_alternative: undefined,
          evolution: 'stable' as const,
          last_attempt_date: '',
          first_attempt_date: '',
          temporal_data: [],
          error_pattern: {
            type: 'random' as const,
            description: 'Sem tentativas registradas',
          },
        };
      }

      // Calcular estatísticas básicas
      const correctAttempts = attempts.filter(a => a.is_correct).length;
      const accuracyRate = (correctAttempts / attempts.length) * 100;

      // Attempts por modo
      const attemptsByMode = {
        normal_list: attempts.filter(a => a.study_mode === 'normal_list').length,
        simulated_exam: attempts.filter(a => a.study_mode === 'simulated_exam').length,
        unified_review: attempts.filter(a => a.study_mode === 'unified_review').length,
      };

      // Attempts em modo foco
      const attemptsInFocusMode = attempts.filter(a => a.was_focus_mode).length;

      // Calcular streak atual
      const currentStreak = this.calculateCurrentStreak(attempts);

      // Alternativa errada mais selecionada
      const mostSelectedWrongAlternative = this.getMostSelectedWrongAlternative(attempts);

      // Evolução
      const evolution = this.calculateEvolution(attempts);

      const stats: QuestionHistoryStats = {
        total_attempts: attempts.length,
        correct_attempts: correctAttempts,
        accuracy_rate: Math.round(accuracyRate * 100) / 100,
        first_attempt_date: this.extractDate(attempts[attempts.length - 1].answered_at).toISOString(),
        last_attempt_date: this.extractDate(attempts[0].answered_at).toISOString(),
        attempts_by_mode: attemptsByMode,
        attempts_in_focus_mode: attemptsInFocusMode,
        current_streak: currentStreak,
        most_selected_wrong_alternative: mostSelectedWrongAlternative,
        evolution,

        temporal_data: this.prepareTemporalData(attempts),
        error_pattern: this.detectErrorPattern(attempts),
      };

      if (includeComparison) {
        const globalStats = await this.getGlobalQuestionStats(questionId);
        return { ...stats, global_stats: globalStats };
      }

      return stats;
    } catch (error) {
      logger.error('Erro ao calcular estatísticas:', error);
      throw error;
    }
  }

  async recordQuestionAttempt(data: {
    user_id: string;
    question_id: string;
    selected_alternative_id: string;
    is_correct: boolean;
    study_mode: 'normal_list' | 'simulated_exam' | 'unified_review';
    was_focus_mode?: boolean;
    question_list_id?: string;
    simulated_exam_id?: string;
  }): Promise<QuestionAttempt> {
    try {
      // Calcular attempt_number
      const { count } = await this.supabase
        .from('question_responses')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', data.user_id)
        .eq('question_id', data.question_id);

      const attemptNumber = (count || 0) + 1;

      const responseId = `response_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

      const { data: response, error } = await this.supabase
        .from('question_responses')
        .insert({
          id: responseId,
          user_id: data.user_id,
          question_id: data.question_id,
          selected_alternative_id: data.selected_alternative_id,
          is_correct_on_first_attempt: attemptNumber === 1 ? data.is_correct : false,
          study_mode: data.study_mode,
          was_focus_mode: data.was_focus_mode || false,
          question_list_id: data.question_list_id,
          simulated_exam_id: data.simulated_exam_id,
          attempt_number: attemptNumber,
          answered_at: { value: new Date().toISOString() },
          created_at: { value: new Date().toISOString() },
        })
        .select()
        .single();

      if (error) {
        logger.error('Erro ao registrar tentativa:', error);
        throw new AppError('Erro ao registrar tentativa', 500);
      }

      logger.info(`Tentativa ${attemptNumber} registrada para questão ${data.question_id}`);

      // ✅ INTEGRAÇÃO COM SISTEMA DE REVISÃO FSRS
      try {
        const prefs = await this.preferencesService.getPreferences(data.user_id);
        
        if (prefs && prefs.auto_add_questions) {
          logger.info(`Integrando questão ${data.question_id} com sistema de revisão FSRS`);
          
          // ✅ Atualizar card FSRS (muda próxima revisão)
          // Se study_mode é 'unified_review', é revisão ativa (sempre recalcula, sem threshold)
          // Se é 'normal_list' ou 'simulated_exam', é estudo (usa threshold)
          const isActiveReview = data.study_mode === 'unified_review';
          const reviewType = isActiveReview ? 'revisão ativa' : 'estudo (lista/simulado)';
          
          logger.info(`Atualizando card FSRS para questão ${data.question_id} (${reviewType})`);
          await this.unifiedReviewService.updateQuestionCardOnly(
            data.user_id,
            data.question_id,
            data.is_correct,
            isActiveReview
          );
          
          logger.info(`Integração FSRS concluída para questão ${data.question_id}`);
        } else {
          logger.info(`auto_add_questions desabilitado para usuário ${data.user_id}`);
        }
      } catch (fsrsError) {
        // Não falhar se integração FSRS der erro
        logger.error('Erro na integração FSRS (não crítico):', fsrsError);
      }

      return response as QuestionAttempt;
    } catch (error) {
      logger.error('Erro ao registrar tentativa:', error);
      throw error;
    }
  }

  private calculateCurrentStreak(attempts: QuestionAttempt[]): { type: 'correct' | 'incorrect'; count: number } {
    if (attempts.length === 0) {
      return { type: 'correct', count: 0 };
    }

    const sortedAttempts = [...attempts].sort((a, b) => {
      const dateA = this.extractDate(a.answered_at);
      const dateB = this.extractDate(b.answered_at);
      return dateB.getTime() - dateA.getTime();
    });

    const firstAttempt = sortedAttempts[0];
    const type = firstAttempt.is_correct ? 'correct' : 'incorrect';
    let count = 1;

    for (let i = 1; i < sortedAttempts.length; i++) {
      if (sortedAttempts[i].is_correct === firstAttempt.is_correct) {
        count++;
      } else {
        break;
      }
    }

    return { type, count };
  }

  private getMostSelectedWrongAlternative(attempts: QuestionAttempt[]): { alternative_id: string; count: number; percentage: number } | undefined {
    const wrongAttempts = attempts.filter(a => !a.is_correct);
    
    if (wrongAttempts.length === 0) {
      return undefined;
    }

    const alternativeCounts: Record<string, number> = {};
    wrongAttempts.forEach(a => {
      alternativeCounts[a.selected_alternative_id] = (alternativeCounts[a.selected_alternative_id] || 0) + 1;
    });

    const mostSelected = Object.entries(alternativeCounts).sort((a, b) => b[1] - a[1])[0];
    const percentage = (mostSelected[1] / wrongAttempts.length) * 100;
    
    return {
      alternative_id: mostSelected[0],
      count: mostSelected[1],
      percentage: Math.round(percentage * 100) / 100,
    };
  }

  private calculateEvolution(attempts: QuestionAttempt[]): 'improving' | 'stable' | 'declining' {
    // Ordenar por data
    const sortedAttempts = [...attempts].sort((a, b) => {
      const dateA = this.extractDate(a.answered_at);
      const dateB = this.extractDate(b.answered_at);
      return dateA.getTime() - dateB.getTime();
    });

    // Casos especiais com poucas tentativas
    if (attempts.length === 1) {
      // Com 1 tentativa, considerar o resultado
      return sortedAttempts[0].is_correct ? 'stable' : 'declining';
    }

    if (attempts.length === 2) {
      const [first, second] = sortedAttempts;
      
      // Melhorou (errou → acertou)
      if (!first.is_correct && second.is_correct) {
        return 'improving';
      }
      
      // Piorou (acertou → errou)
      if (first.is_correct && !second.is_correct) {
        return 'declining';
      }
      
      // Ambas corretas = estável (mantendo o bom desempenho)
      if (first.is_correct && second.is_correct) {
        return 'stable';
      }
      
      // Ambas erradas = piorando (não está conseguindo acertar)
      return 'declining';
    }

    // Com 3+ tentativas, focar nas últimas tentativas (mais recentes)
    // Pegar as últimas 3 tentativas para análise de tendência
    const recentCount = Math.min(3, sortedAttempts.length);
    const recentAttempts = sortedAttempts.slice(-recentCount);
    const olderAttempts = sortedAttempts.slice(0, -recentCount);
    
    // Se não há tentativas antigas suficientes, usar todas
    if (olderAttempts.length === 0) {
      // Apenas 3 tentativas, analisar a sequência
      const results = recentAttempts.map(a => a.is_correct);
      const correctCount = results.filter(r => r).length;
      
      // Se está errando tudo ou quase tudo
      if (correctCount === 0) return 'declining';
      
      // Se está acertando tudo
      if (correctCount === recentCount) return 'stable';
      
      // Verificar se está melhorando ou piorando
      // Dar mais peso para as tentativas mais recentes
      if (results[results.length - 1]) {
        // Última tentativa foi acerto
        return results[0] ? 'stable' : 'improving';
      } else {
        // Última tentativa foi erro
        return 'declining';
      }
    }
    
    // Comparar desempenho recente vs antigo
    const recentAccuracy = recentAttempts.filter(a => a.is_correct).length / recentAttempts.length;
    const olderAccuracy = olderAttempts.filter(a => a.is_correct).length / olderAttempts.length;
    
    const diff = recentAccuracy - olderAccuracy;
    
    // Melhora significativa (mais de 30% de diferença)
    if (diff >= 0.3) return 'improving';
    
    // Piora significativa (mais de 30% de diferença)
    if (diff <= -0.3) return 'declining';
    
    // Verificar desempenho recente
    // Se está errando muito recentemente (menos de 40%), é declining
    if (recentAccuracy < 0.4) return 'declining';
    
    // Se está acertando bem recentemente (mais de 70%), verificar tendência
    if (recentAccuracy >= 0.7) {
      if (diff > 0.1) return 'improving';
      if (diff < -0.1) return 'declining';
      return 'stable';
    }
    
    // Desempenho mediano recente (40-70%), verificar tendência
    if (diff > 0.15) return 'improving';
    if (diff < -0.15) return 'declining';
    return 'stable';
  }

  private async getGlobalQuestionStats(questionId: string): Promise<any> {
    try {
      // Buscar questão para verificar alternativas corretas
      const { data: question } = await this.supabase
        .from('questions')
        .select('id, correct_answer, options')
        .eq('id', questionId)
        .single();

      if (!question) {
        return undefined;
      }

      // Buscar todas as respostas da questão
      const { data: allAttempts } = await this.supabase
        .from('question_responses')
        .select('*')
        .eq('question_id', questionId)
        .not('study_mode', 'is', null);

      if (!allAttempts || allAttempts.length === 0) {
        return {
          total_attempts_all_users: 0,
          total_unique_users: 0,
          users_correct_first_attempt_percentage: 0,
          users_correct_any_attempt_percentage: 0,
          global_accuracy_rate: 0,
          alternative_distribution: {},
        };
      }

      // Total de tentativas
      const totalAttempts = allAttempts.length;

      // Total de usuários únicos
      const uniqueUsers = [...new Set(allAttempts.map(a => a.user_id))];
      const totalUniqueUsers = uniqueUsers.length;

      // Calcular is_correct para cada tentativa
      const attemptsWithCorrect = allAttempts.map(attempt => {
        const selectedOption = question.options.find((opt: any) => opt.id === attempt.selected_alternative_id);
        const isCorrect = selectedOption ? selectedOption.text === question.correct_answer : false;
        return { ...attempt, is_correct: isCorrect };
      });

      // Taxa de acerto global (todas as tentativas)
      const correctAttempts = attemptsWithCorrect.filter(a => a.is_correct).length;
      const globalAccuracyRate = (correctAttempts / totalAttempts) * 100;
      
      // console.log(`[GlobalStats] Questão ${questionId}:`, {
      //   totalAttempts,
      //   correctAttempts,
      //   globalAccuracyRate: Math.round(globalAccuracyRate * 100) / 100,
      //   correctAnswer: question.correct_answer
      // });

      // Porcentagem de usuários que acertaram na primeira tentativa
      const firstAttempts = attemptsWithCorrect.filter(a => a.attempt_number === 1);
      const usersCorrectFirstAttempt = firstAttempts.filter(a => a.is_correct).length;
      const usersCorrectFirstAttemptPercentage = firstAttempts.length > 0 
        ? (usersCorrectFirstAttempt / firstAttempts.length) * 100 
        : 0;

      // Porcentagem de usuários que acertaram em qualquer tentativa
      const usersWithCorrectAttempt = uniqueUsers.filter(userId => {
        return attemptsWithCorrect.some(a => a.user_id === userId && a.is_correct);
      }).length;
      const usersCorrectAnyAttemptPercentage = (usersWithCorrectAttempt / totalUniqueUsers) * 100;

      // Distribuição de alternativas (porcentagem)
      const alternativeDistribution: Record<string, number> = {};
      allAttempts.forEach(a => {
        if (a.selected_alternative_id) {
          alternativeDistribution[a.selected_alternative_id] = 
            (alternativeDistribution[a.selected_alternative_id] || 0) + 1;
        }
      });

      // Converter para porcentagem
      Object.keys(alternativeDistribution).forEach(key => {
        alternativeDistribution[key] = Math.round((alternativeDistribution[key] / totalAttempts) * 10000) / 100;
      });

      return {
        total_attempts_all_users: totalAttempts,
        total_unique_users: totalUniqueUsers,
        users_correct_first_attempt_percentage: Math.round(usersCorrectFirstAttemptPercentage * 100) / 100,
        users_correct_any_attempt_percentage: Math.round(usersCorrectAnyAttemptPercentage * 100) / 100,
        global_accuracy_rate: Math.round(globalAccuracyRate * 100) / 100,
        alternative_distribution: alternativeDistribution,
      };
    } catch (error) {
      logger.error('Erro ao buscar estatísticas globais:', error);
      return undefined;
    }
  }



  /**
   * Detectar padrão de erro
   */
  private detectErrorPattern(attempts: QuestionAttempt[]): {
    type: 'same_alternative' | 'random' | 'regression';
    description: string;
  } | undefined {
    const wrongAttempts = attempts.filter(a => !a.is_correct);
    
    if (wrongAttempts.length === 0) {
      return undefined;
    }

    // Verificar se sempre erra a mesma alternativa
    const alternatives = wrongAttempts.map(a => a.selected_alternative_id);
    const uniqueAlternatives = new Set(alternatives);
    
    if (uniqueAlternatives.size === 1 && wrongAttempts.length >= 2) {
      return {
        type: 'same_alternative',
        description: `Você sempre marca a alternativa ${alternatives[0]} quando erra`
      };
    }

    // Verificar regressão (vinha acertando, começou a errar)
    if (attempts.length >= 3) {
      const recent = attempts.slice(0, 2);
      const older = attempts.slice(2);
      
      const recentCorrect = recent.filter(a => a.is_correct).length;
      const olderCorrect = older.filter(a => a.is_correct).length;
      const olderTotal = older.length;
      
      if (olderCorrect / olderTotal >= 0.8 && recentCorrect === 0) {
        return {
          type: 'regression',
          description: 'Você vinha acertando consistentemente mas errou recentemente'
        };
      }
    }

    return {
      type: 'random',
      description: 'Padrão de erro variado'
    };
  }

  /**
   * Preparar dados temporais para gráfico
   */
  private prepareTemporalData(attempts: QuestionAttempt[]): {
    date: string;
    is_correct: boolean;
    attempt_number: number;
  }[] {
    return attempts
      .sort((a, b) => {
        const dateA = this.extractDate(a.answered_at);
        const dateB = this.extractDate(b.answered_at);
        return dateA.getTime() - dateB.getTime();
      })
      .map(attempt => {
        const date = this.extractDate(attempt.answered_at);
        return {
          date: date.toISOString().split('T')[0],
          is_correct: attempt.is_correct,
          attempt_number: attempt.attempt_number
        };
      });
  }

  private extractDate(dateValue: any): Date {
    // Se for JSONB { value: "..." }
    if (dateValue && typeof dateValue === 'object' && dateValue.value) {
      return new Date(dateValue.value);
    }
    // Se for string direta
    return new Date(dateValue);
  }
}
