import { SupabaseClient } from '@supabase/supabase-js';
import {
  SimulatedExam,
  SimulatedExamResult,
  SimulatedExamAnswer,
  SimulatedExamStatus,
  ListSimulatedExamsOptions,
  PaginatedSimulatedExamsResult,
  PaginatedSimulatedExamResultsResult,
  SimulatedExamStatistics,
  StartSimulatedExamPayload,
  SubmitSimulatedExamAnswerPayload,
  FinishSimulatedExamPayload,
} from '../../../domain/simulatedExam/types';

/**
 * Implementação do serviço de simulados usando Supabase
 * Implementação Supabase do serviço de simulados
 */
export class SupabaseSimulatedExamService {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  async createSimulatedExam(
    data: any,
  ): Promise<SimulatedExam> {
    console.log(
      '🔍 [SupabaseSimulatedExamService] Dados recebidos:',
      JSON.stringify(data, null, 2),
    );

    const now = new Date().toISOString();
    
    // Gerar ID único no mesmo formato das listas
    const examId = `exam_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Extrair apenas IDs das questões (se forem objetos)
    const questionIds = data.questions?.map((q: any) => 
      typeof q === 'string' ? q : q.id
    ) || [];
    
    // Mapear campos de camelCase para snake_case
    const examData = {
      id: examId,
      title: data.title,
      description: data.description,
      instructions: data.instructions,
      time_limit_minutes: (data as any).time_limit_minutes ?? data.timeLimit ?? 0,
      questions: questionIds,
      question_count: questionIds.length,
      total_questions: questionIds.length,
      difficulty: data.difficulty,
      filter_ids: data.filterIds,
      sub_filter_ids: data.subFilterIds,
      status: data.status || SimulatedExamStatus.PUBLISHED,
      is_public: data.isPublic || false,
      user_id: data.createdBy,
      created_by: data.createdBy,
      tags: data.tags,
      randomize: data.randomize,
      created_at: now,
      updated_at: now,
    };

    console.log('🔍 [SupabaseSimulatedExamService] Questões recebidas:');
    if (data.questions && Array.isArray(data.questions)) {
      data.questions.forEach((question: any, index: number) => {
        // Se for string, é um ID de questão
        if (typeof question === 'string') {
          console.log(`Questão ${index + 1}: ID = ${question}`);
        } else {
          console.log(`Questão ${index + 1}:`, {
            id: question.id,
            hasText: !!question.text,
            hasOptions: !!question.options,
            optionsCount: question.options?.length || 0,
            hasCorrectAnswer: !!question.correctAnswer,
          });
        }
      });
    }

    // Se as questões são strings (IDs), não precisa validar estrutura
    const validQuestions =
      data.questions?.filter(
        (q: any) => {
          // Se for string (ID), é válido
          if (typeof q === 'string') {
            return q && q.trim().length > 0;
          }
          // Se for objeto, validar estrutura
          return q &&
          q.id &&
          q.text &&
          q.options &&
          q.options.length > 0 &&
          q.correctAnswer;
        }
      ) || [];

    console.log(
      '✅ [SupabaseSimulatedExamService] Questões válidas encontradas:',
      validQuestions.length,
    );

    const { data: exam, error } = await this.supabase
      .from('simulated_exams')
      .insert(examData)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao criar simulado: ${error.message}`);
    }

    return exam;
  }

  async getSimulatedExamById(id: string): Promise<SimulatedExam | null> {
    const { data: exam, error } = await this.supabase
      .from('simulated_exams')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Erro ao buscar simulado: ${error.message}`);
    }

    return exam;
  }

  async updateSimulatedExam(
    id: string,
    data: any,
  ): Promise<SimulatedExam> {
    const updateData = {
      ...data,
      updated_at: new Date().toISOString(),
    };

    if (data.status === SimulatedExamStatus.PUBLISHED) {
      updateData.published_at = new Date().toISOString();
    }

    const { data: exam, error } = await this.supabase
      .from('simulated_exams')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar simulado: ${error.message}`);
    }

    return exam;
  }

  async deleteSimulatedExam(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('simulated_exams')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Erro ao deletar simulado: ${error.message}`);
    }
  }

  async listSimulatedExams(options: ListSimulatedExamsOptions): Promise<PaginatedSimulatedExamsResult> {
    const userId = options.createdBy!;
    console.log('🔍 listSimulatedExams chamado com userId:', userId);
    
    // Buscar simulados criados pelo usuário
    const { data: createdExams, error: createdError } = await this.supabase
      .from('simulated_exams')
      .select('*')
      .eq('created_by', userId)
      .order('created_at', { ascending: false });

    if (createdError) {
      console.error('❌ Erro ao buscar simulados criados:', createdError);
      throw new Error(`Erro ao buscar simulados: ${createdError.message}`);
    }

    // Buscar simulados atribuídos ao usuário (por mentor)
    const { data: assignedExams, error: assignedError } = await this.supabase
      .from('simulated_exams')
      .select('*')
      .eq('user_id', userId)
      .eq('assigned_by_mentor', true)
      .order('created_at', { ascending: false });

    if (assignedError) {
      console.error('❌ Erro ao buscar simulados atribuídos:', assignedError);
      // Não lançar erro, apenas logar (campo pode não existir em DBs antigos)
    }

    // Buscar simulados públicos
    const { data: publicExams, error: publicError } = await this.supabase
      .from('simulated_exams')
      .select('*')
      .eq('is_public', true)
      .neq('created_by', userId)
      .order('created_at', { ascending: false });

    if (publicError) {
      console.error('❌ Erro ao buscar simulados públicos:', publicError);
      throw new Error(`Erro ao buscar simulados públicos: ${publicError.message}`);
    }

    // Combinar resultados (evitando duplicatas)
    const seenExamIds = new Set<string>();
    const allExams: any[] = [];
    
    // Adicionar simulados criados pelo usuário
    (createdExams || []).forEach(exam => {
      if (!seenExamIds.has(exam.id)) {
        seenExamIds.add(exam.id);
        allExams.push(exam);
      }
    });
    
    // Adicionar simulados atribuídos pelo mentor
    (assignedExams || []).forEach(exam => {
      if (!seenExamIds.has(exam.id)) {
        seenExamIds.add(exam.id);
        allExams.push({ ...exam, assignedByMentor: true });
      }
    });
    
    // Adicionar simulados públicos
    (publicExams || []).forEach(exam => {
      if (!seenExamIds.has(exam.id)) {
        seenExamIds.add(exam.id);
        allExams.push(exam);
      }
    });
    
    console.log('✅ Simulados encontrados:', {
      created: createdExams?.length || 0,
      assigned: assignedExams?.length || 0,
      public: publicExams?.length || 0,
      total: allExams.length
    });

    // Buscar resultados do usuário para cada simulado
    const examIdsForResults = allExams.map(exam => exam.id);
    const { data: results, error: resultsError } = await this.supabase
      .from('simulated_exam_results')
      .select('*')
      .eq('user_id', userId)
      .in('simulated_exam_id', examIdsForResults)
      .order('created_at', { ascending: false });

    if (resultsError) {
      console.error('⚠️ Erro ao buscar resultados:', resultsError);
    }

    // Mapear resultados por exam_id (pegar o mais recente de cada)
    const resultsByExamId = new Map();
    (results || []).forEach(result => {
      if (!resultsByExamId.has(result.simulated_exam_id)) {
        resultsByExamId.set(result.simulated_exam_id, result);
      }
    });

    // Adicionar informações de progresso aos simulados
    const examsWithProgress = allExams.map(exam => {
      const result = resultsByExamId.get(exam.id);
      return {
        ...exam,
        userResult: result ? {
          id: result.id,
          status: result.status,
          score: result.score,
          correct_count: result.correct_count,
          incorrect_count: result.incorrect_count,
          total_questions: result.total_questions,
          completed_at: result.completed_at,
          time_taken_seconds: result.time_taken_seconds
        } : null
      };
    });

    // Aplicar filtros adicionais se necessário
    let filteredExams = examsWithProgress;

    if (options?.status) {
      filteredExams = filteredExams.filter(exam => exam.status === options.status);
    }

    if (options?.tags && options.tags.length > 0) {
      filteredExams = filteredExams.filter(exam => 
        exam.tags && options.tags!.some((tag: string) => exam.tags!.includes(tag))
      );
    }

    if ((options as any)?.query) {
      const searchLower = ((options as any).query as string).toLowerCase();
      filteredExams = filteredExams.filter(exam =>
        exam.title?.toLowerCase().includes(searchLower) ||
        exam.description?.toLowerCase().includes(searchLower)
      );
    }

    return {
      exams: filteredExams,
      totalCount: filteredExams.length,
      hasMore: false,
    };
  }

  async startSimulatedExam(
    payload: StartSimulatedExamPayload,
  ): Promise<SimulatedExamResult> {
    // Suportar ambos os formatos: objeto ou parâmetros separados
    const { examId, userId: finalUserId } = payload;
    const now = new Date().toISOString();

    // Gerar ID único para o resultado
    const resultId = `result_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    const resultData = {
      id: resultId,
      simulated_exam_id: examId,
      user_id: finalUserId,
      started_at: now,
      score: 0,
      total_questions: 0,
      correct_count: 0,
      incorrect_count: 0,
      time_taken_seconds: 0,
      answers: {},
      status: 'in_progress',
    };

    console.log('📝 Inserindo resultado no banco:', resultData);

    const { data: result, error } = await this.supabase
      .from('simulated_exam_results')
      .insert(resultData)
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao inserir resultado:', error);
      throw new Error(`Erro ao iniciar simulado: ${error.message}`);
    }

    console.log('✅ Resultado inserido:', result);
    console.log('✅ ID do resultado:', result?.id);

    return result;
  }

  async submitAnswer(
    data: SubmitSimulatedExamAnswerPayload,
  ): Promise<SimulatedExamAnswer> {
    const answerData: any = {
      questionId: data.questionId,
      answerId: data.answerId,
      isCorrect: false,
      points: 0,
      timeSpent: data.timeSpent,
      answered_at: new Date().toISOString(),
    };

    // Buscar o resultado atual para pegar user_id e simulated_exam_id
    const { data: result, error: fetchError } = await this.supabase
      .from('simulated_exam_results')
      .select('answers, user_id, simulated_exam_id')
      .eq('id', data.resultId)
      .single();

    if (fetchError) {
      throw new Error(`Erro ao buscar resultado: ${fetchError.message}`);
    }

    const currentAnswers = result.answers || [];
    const updatedAnswers = [...currentAnswers, answerData];

    // Atualizar resultado do simulado (JSONB)
    const { error: updateError } = await this.supabase
      .from('simulated_exam_results')
      .update({
        answers: updatedAnswers,
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.resultId);

    if (updateError) {
      throw new Error(`Erro ao submeter resposta: ${updateError.message}`);
    }

    // ✅ Salvar em question_responses para histórico unificado
    try {
      // Calcular attempt_number
      const { count } = await this.supabase
        .from('question_responses')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', result.user_id)
        .eq('question_id', data.questionId);

      const attemptNumber = (count || 0) + 1;

      await this.supabase
        .from('question_responses')
        .insert({
          id: `response_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          user_id: result.user_id,
          question_id: data.questionId,
          selected_alternative_id: data.answerId,
          is_correct_on_first_attempt: attemptNumber === 1 ? answerData.isCorrect : false,
          study_mode: 'simulated_exam',  // ✅ Identifica que foi em simulado
          was_focus_mode: false,
          simulated_exam_id: result.simulated_exam_id,
          attempt_number: attemptNumber,
          answered_at: { value: new Date().toISOString() },
          created_at: { value: new Date().toISOString() },
        });

      // ✅ INTEGRAÇÃO COM SISTEMA DE REVISÃO FSRS
      // Importar serviços necessários
      const { SupabaseUnifiedReviewService } = await import('../../studyTools/supabase/SupabaseUnifiedReviewService');
      const { ReviewPreferencesService } = await import('../../../domain/studyTools/unifiedReviews/services/ReviewPreferencesService');
      
      const unifiedReviewService = new SupabaseUnifiedReviewService(this.supabase);
      const preferencesService = new ReviewPreferencesService(this.supabase);
      
      const prefs = await preferencesService.getPreferences(result.user_id);
      
      if (prefs && prefs.auto_add_questions) {
        // Verificar se já existe card FSRS
        const { data: existingCard } = await this.supabase
          .from('fsrs_cards')
          .select('id')
          .eq('content_id', data.questionId)
          .eq('user_id', result.user_id)
          .eq('content_type', 'QUESTION')
          .single();

        if (existingCard) {
          // Atualizar card existente
          await unifiedReviewService.recordQuestionResponse(
            result.user_id,
            data.questionId,
            answerData.isCorrect,
            0
          );
        } else {
          // Criar novo card e registrar resposta
          await unifiedReviewService.addQuestionToReviews(data.questionId, result.user_id);
          await unifiedReviewService.recordQuestionResponse(
            result.user_id,
            data.questionId,
            answerData.isCorrect,
            0
          );
        }
      }
    } catch (error) {
      console.error('Erro ao salvar resposta em question_responses ou integrar FSRS:', error);
      // Não falhar a operação principal se isso der erro
    }

    return {
      questionId: answerData.questionId,
      answerId: answerData.answerId,
      isCorrect: answerData.isCorrect,
      points: answerData.points,
      timeSpent: answerData.timeSpent,
      answeredAt: new Date().toISOString(),
    };
  }

  async updateSimulatedExamResult(
    resultId: string,
    data: { answers?: Record<string, string>; time_taken_seconds?: number }
  ): Promise<SimulatedExamResult> {
    const updateData = {
      ...data,
      updated_at: new Date().toISOString(),
    };

    const { data: result, error } = await this.supabase
      .from('simulated_exam_results')
      .update(updateData)
      .eq('id', resultId)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar resultado: ${error.message}`);
    }

    return result;
  }

  async finishSimulatedExam(
    payload: FinishSimulatedExamPayload,
  ): Promise<SimulatedExamResult> {
    // Buscar o resultado atual
    const { data: current, error: fetchResultError } = await this.supabase
      .from('simulated_exam_results')
      .select('*')
      .eq('id', payload.resultId)
      .single();
    if (fetchResultError) {
      throw new Error(`Erro ao buscar resultado: ${fetchResultError.message}`);
    }

    // Usar dados do payload se fornecidos, senão usar os do resultado atual
    const answers: Record<string, string> = payload.answers || current.answers || {};
    const totalQuestions = current.total_questions || Object.keys(answers).length || 0;
    const correctCount = payload.correctCount ?? current.correct_count ?? 0;
    const incorrectCount = payload.incorrectCount ?? (totalQuestions - correctCount);
    const score = payload.score ?? correctCount;
    
    const updateData: any = {
      score,
      total_questions: totalQuestions,
      correct_count: correctCount,
      incorrect_count: incorrectCount,
      completed_at: new Date().toISOString(),
      status: 'completed',
    };

    // Adicionar respostas se fornecidas
    if (answers && Object.keys(answers).length > 0) {
      updateData.answers = answers;
    }

    // Adicionar tempo gasto se fornecido
    if (payload.timeSpent !== undefined) {
      updateData.time_taken_seconds = payload.timeSpent;
    }

    const { data: result, error } = await this.supabase
      .from('simulated_exam_results')
      .update(updateData)
      .eq('id', payload.resultId)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao finalizar simulado: ${error.message}`);
    }

    return result;
  }

  async listUserSimulatedExamResults(
    userId: string,
    _options?: ListSimulatedExamsOptions,
  ): Promise<PaginatedSimulatedExamResultsResult> {
    const { data: results, error } = await this.supabase
      .from('simulated_exam_results')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) {
      throw new Error(`Erro ao listar resultados: ${error.message}`);
    }
    return {
      results: results || [],
      totalCount: (results || []).length,
      hasMore: false,
    };
  }

  async getUserSimulatedExamStatistics(userId: string): Promise<SimulatedExamStatistics> {
    const { data: results, error } = await this.supabase
      .from('simulated_exam_results')
      .select('score, total_questions, time_taken_seconds')
      .eq('user_id', userId)
      .not('completed_at', 'is', null);
    if (error) {
      throw new Error(`Erro ao obter estatísticas: ${error.message}`);
    }
    const completed = results || [];
    const totalExams = completed.length;
    const scores = completed.map((r) => (r.score / r.total_questions) * 100);
    const averageScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const bestScore = scores.length ? Math.max(...scores) : 0;
    const worstScore = scores.length ? Math.min(...scores) : 0;
    const averageTimeSpent = completed.length
      ? completed.reduce((a, r) => a + (r.time_taken_seconds || 0), 0) / completed.length
      : 0;
    return {
      totalExams,
      completedExams: totalExams,
      averageScore,
      bestScore,
      worstScore,
      averageTimeSpent,
      examsByDifficulty: {
        easy: 0,
        medium: 0,
        hard: 0,
        mixed: 0,
      },
    };
  }

  async getSimulatedExamResultById(
    resultId: string,
  ): Promise<SimulatedExamResult | null> {
    const { data: result, error } = await this.supabase
      .from('simulated_exam_results')
      .select('*')
      .eq('id', resultId)
      .single();

    if (error) {
      throw new Error(`Erro ao buscar resultado: ${error.message}`);
    }

    return result;
  }

  async getSimulatedExamResult(
    resultId: string,
  ): Promise<SimulatedExamResult | null> {
    const { data: result, error } = await this.supabase
      .from('simulated_exam_results')
      .select('*')
      .eq('id', resultId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Erro ao buscar resultado: ${error.message}`);
    }

    return result;
  }

  async getUserSimulatedExamResults(
    userId: string,
    examId?: string,
  ): Promise<SimulatedExamResult[]> {
    let query = this.supabase
      .from('simulated_exam_results')
      .select('*')
      .eq('user_id', userId);

    if (examId) {
      query = query.eq('simulated_exam_id', examId);
    }

    const { data: results, error } = await query.order('started_at', {
      ascending: false,
    });

    if (error) {
      throw new Error(`Erro ao buscar resultados do usuário: ${error.message}`);
    }

    return results || [];
  }

  async getSimulatedExamStats(examId: string): Promise<any> {
    const { data: results, error } = await this.supabase
      .from('simulated_exam_results')
      .select('score, total_questions, completed_at')
      .eq('simulated_exam_id', examId)
      .not('completed_at', 'is', null);

    if (error) {
      throw new Error(`Erro ao buscar estatísticas: ${error.message}`);
    }

    const completedResults = results || [];
    const totalAttempts = completedResults.length;

    if (totalAttempts === 0) {
      return {
        totalAttempts: 0,
        averageScore: 0,
        highestScore: 0,
        lowestScore: 0,
        completionRate: 0,
      };
    }

    const scores = completedResults.map((r) => (r.score / r.total_questions) * 100);
    const averageScore =
      scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const highestScore = Math.max(...scores);
    const lowestScore = Math.min(...scores);

    return {
      totalAttempts,
      averageScore: Math.round(averageScore * 100) / 100,
      highestScore: Math.round(highestScore * 100) / 100,
      lowestScore: Math.round(lowestScore * 100) / 100,
      completionRate: 100, // Todos os resultados retornados são completos
    };
  }

  async getUserSimulatedExamHistory(
    userId: string,
  ): Promise<any[]> {
    const { data: results, error } = await this.supabase
      .from('simulated_exam_results')
      .select(
        `
        *,
        simulated_exams!inner(
          id,
          title
        )
      `,
      )
      .eq('user_id', userId)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false });

    if (error) {
      throw new Error(`Erro ao buscar histórico: ${error.message}`);
    }

    return (results || []).map((result) => ({
      resultId: result.id,
      examId: result.simulated_exam_id,
      examTitle: result.simulated_exams.title,
      score: (result.score / result.total_questions) * 100,
      completedAt: result.completed_at,
    }));
  }

  async getSimulatedExamsByIds(examIds: string[]): Promise<SimulatedExam[]> {
    if (examIds.length === 0) {
      return [];
    }

    const { data: exams, error } = await this.supabase
      .from('simulated_exams')
      .select('*')
      .in('id', examIds);

    if (error) {
      throw new Error(`Erro ao buscar simulados por IDs: ${error.message}`);
    }

    return exams || [];
  }

  async updateMentorExamAssignment(
    mentorExamId: string,
    userId: string,
    data: {
      status: string;
      completed_at?: string;
      started_at?: string;
      score?: number;
      correct_count?: number;
      incorrect_count?: number;
      time_spent_seconds?: number;
    }
  ): Promise<void> {
    console.log('[SupabaseSimulatedExamService] Atualizando mentor_exam_assignments:', {
      mentorExamId,
      userId,
      data
    });

    const { error } = await this.supabase
      .from('mentor_exam_assignments')
      .update({
        status: data.status,
        completed_at: data.completed_at,
        started_at: data.started_at,
        score: data.score,
        correct_count: data.correct_count,
        incorrect_count: data.incorrect_count,
        time_spent_seconds: data.time_spent_seconds,
        updated_at: new Date().toISOString(),
      })
      .eq('mentor_exam_id', mentorExamId)
      .eq('user_id', userId);

    if (error) {
      console.error('[SupabaseSimulatedExamService] Erro ao atualizar mentor_exam_assignments:', error);
      throw new Error(`Erro ao atualizar atribuição do mentor: ${error.message}`);
    }

    // Se o status é 'completed', atualizar a média do mentor_simulated_exams
    if (data.status === 'completed') {
      try {
        // Buscar todas as atribuições completadas para calcular a média
        const { data: completedAssignments } = await this.supabase
          .from('mentor_exam_assignments')
          .select('score, correct_count, incorrect_count')
          .eq('mentor_exam_id', mentorExamId)
          .eq('status', 'completed');

        if (completedAssignments && completedAssignments.length > 0) {
          // Calcular média de acertos (score / total * 100)
          const avgScore = completedAssignments.reduce((sum, a) => {
            const total = (a.correct_count || 0) + (a.incorrect_count || 0);
            if (total === 0) return sum;
            return sum + ((a.correct_count || 0) / total * 100);
          }, 0) / completedAssignments.length;

          // Atualizar mentor_simulated_exams com a nova média
          await this.supabase
            .from('mentor_simulated_exams')
            .update({ 
              average_score: Math.round(avgScore * 100) / 100,
              updated_at: new Date().toISOString()
            })
            .eq('id', mentorExamId);

          console.log('[SupabaseSimulatedExamService] average_score atualizado:', avgScore);
        }
      } catch (avgError) {
        console.error('[SupabaseSimulatedExamService] Erro ao atualizar average_score:', avgError);
        // Não falhar a operação principal
      }
    }

    console.log('[SupabaseSimulatedExamService] mentor_exam_assignments atualizado com sucesso');
  }
}
