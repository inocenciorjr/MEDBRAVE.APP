import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Serviço de Analytics para Mentores
 * Fornece métricas detalhadas de desempenho dos mentorados em simulados
 */
export class MentorAnalyticsService {
    private supabase: SupabaseClient;

    constructor() {
        this.supabase = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
    }

    // ============================================
    // TIPOS E INTERFACES
    // ============================================

    // Interfaces serão definidas no arquivo de types

    // ============================================
    // MÉTODOS PRINCIPAIS
    // ============================================

    /**
     * Obtém lista de simulados criados pelo mentor com estatísticas gerais
     */
    async getMentorSimulados(mentorId: string): Promise<MentorSimuladoSummary[]> {
        const { data: simulados, error } = await this.supabase
            .from('mentor_simulated_exams')
            .select('*')
            .eq('mentor_id', mentorId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Erro ao buscar simulados do mentor:', error);
            throw new Error(`Erro ao buscar simulados: ${error.message}`);
        }

        // Para cada simulado, buscar estatísticas de resultados
        const simuladosWithStats = await Promise.all(
            (simulados || []).map(async (simulado) => {
                const stats = await this.getSimuladoStats(simulado.id);
                return {
                    id: simulado.id,
                    name: simulado.name,
                    description: simulado.description,
                    questionCount: simulado.question_count,
                    visibility: simulado.visibility,
                    status: simulado.status,
                    timeLimitMinutes: simulado.time_limit_minutes,
                    createdAt: simulado.created_at,
                    ...stats
                };
            })
        );

        return simuladosWithStats;
    }

    /**
     * Obtém estatísticas gerais de um simulado específico
     */
    async getSimuladoStats(simuladoId: string): Promise<SimuladoStats> {
        // Primeiro, buscar os simulados atribuídos que correspondem a este mentor_simulated_exam
        const { data: assignedSimulados, error: assignedError } = await this.supabase
            .from('simulated_exams')
            .select('id')
            .eq('mentor_exam_id', simuladoId);

        if (assignedError) {
            console.error('Erro ao buscar simulados atribuídos:', assignedError);
        }

        const assignedIds = (assignedSimulados || []).map(s => s.id);

        // Se não houver simulados atribuídos, tentar buscar diretamente pelo ID
        const searchIds = assignedIds.length > 0 ? assignedIds : [simuladoId];

        // Buscar resultados dos simulados
        const { data: results, error } = await this.supabase
            .from('simulated_exam_results')
            .select('*')
            .in('simulated_exam_id', searchIds)
            .eq('status', 'completed');

        if (error) {
            console.error('Erro ao buscar resultados do simulado:', error);
            return {
                totalRespondents: 0,
                averageScore: 0,
                averageTimeSeconds: 0,
                completionRate: 0,
                highestScore: 0,
                lowestScore: 0
            };
        }

        if (!results || results.length === 0) {
            return {
                totalRespondents: 0,
                averageScore: 0,
                averageTimeSeconds: 0,
                completionRate: 0,
                highestScore: 0,
                lowestScore: 0
            };
        }

        // Calcular scores corretamente usando correct_count se correct_answers não existir
        const scores = results.map(r => {
            const totalQ = parseInt(r.total_questions) || 0;
            const correctCount = r.correct_answers || r.correct_count || 0;
            return totalQ > 0 ? (correctCount / totalQ) * 100 : parseFloat(r.score) || 0;
        });
        const times = results.map(r => parseFloat(r.total_time_spent_seconds || r.time_taken_seconds) || 0);

        return {
            totalRespondents: results.length,
            averageScore: scores.reduce((a, b) => a + b, 0) / scores.length,
            averageTimeSeconds: times.reduce((a, b) => a + b, 0) / times.length,
            completionRate: 100, // Todos os resultados são completed
            highestScore: Math.max(...scores),
            lowestScore: Math.min(...scores)
        };
    }


    /**
     * Obtém desempenho detalhado de um simulado por especialidade/assunto
     */
    async getSimuladoPerformanceBySubject(
        simuladoId: string
    ): Promise<SubjectPerformance[]> {
        // Buscar o simulado para obter as questões
        const { data: simulado, error: simError } = await this.supabase
            .from('mentor_simulated_exams')
            .select('questions')
            .eq('id', simuladoId)
            .single();

        if (simError || !simulado) {
            console.error('Erro ao buscar simulado:', simError);
            return [];
        }

        // Buscar os simulados atribuídos que correspondem a este mentor_simulated_exam
        const { data: assignedSimulados } = await this.supabase
            .from('simulated_exams')
            .select('id')
            .eq('mentor_exam_id', simuladoId);

        const assignedIds = (assignedSimulados || []).map(s => s.id);
        const searchIds = assignedIds.length > 0 ? assignedIds : [simuladoId];

        // Buscar resultados do simulado
        const { data: results, error: resError } = await this.supabase
            .from('simulated_exam_results')
            .select('user_id, answers, correct_answers, correct_count, total_questions')
            .in('simulated_exam_id', searchIds)
            .eq('status', 'completed');

        if (resError || !results || results.length === 0) {
            return [];
        }

        // Extrair IDs das questões do simulado
        const questionIds = (simulado.questions || []).map((q: any) => q.questionId || q.id || q);

        // Buscar detalhes das questões (filter_ids e sub_filter_ids)
        const { data: questions, error: qError } = await this.supabase
            .from('questions')
            .select('id, filter_ids, sub_filter_ids')
            .in('id', questionIds);

        if (qError || !questions) {
            return [];
        }

        // Buscar nomes dos sub_filters
        const allSubFilterIds = new Set<string>();
        questions.forEach(q => {
            (q.sub_filter_ids || []).forEach((id: string) => allSubFilterIds.add(id));
        });

        const { data: subFilters } = await this.supabase
            .from('sub_filters')
            .select('id, name, filter_id')
            .in('id', Array.from(allSubFilterIds));

        const subFilterMap = new Map(
            (subFilters || []).map(sf => [sf.id, sf])
        );


        // Agrupar questões por sub_filter
        const questionsBySubFilter = new Map<string, string[]>();
        questions.forEach(q => {
            (q.sub_filter_ids || []).forEach((sfId: string) => {
                if (!questionsBySubFilter.has(sfId)) {
                    questionsBySubFilter.set(sfId, []);
                }
                questionsBySubFilter.get(sfId)!.push(q.id);
            });
        });

        // Calcular performance por sub_filter
        const performanceBySubject: SubjectPerformance[] = [];

        for (const [subFilterId, qIds] of questionsBySubFilter) {
            const subFilter = subFilterMap.get(subFilterId);
            if (!subFilter) continue;

            let totalCorrect = 0;
            let totalAnswered = 0;
            let totalTimeSeconds = 0;

            // Analisar respostas de cada usuário para essas questões
            results.forEach(result => {
                const answers = result.answers || {};
                qIds.forEach(qId => {
                    if (answers[qId]) {
                        totalAnswered++;
                        if (answers[qId].isCorrect) {
                            totalCorrect++;
                        }
                        totalTimeSeconds += answers[qId].timeSpent || 0;
                    }
                });
            });

            if (totalAnswered > 0) {
                performanceBySubject.push({
                    subFilterId,
                    subFilterName: subFilter.name,
                    filterId: subFilter.filter_id,
                    totalQuestions: qIds.length,
                    totalAnswered,
                    correctAnswers: totalCorrect,
                    accuracy: (totalCorrect / totalAnswered) * 100,
                    averageTimeSeconds: totalTimeSeconds / totalAnswered
                });
            }
        }

        return performanceBySubject.sort((a, b) => b.accuracy - a.accuracy);
    }


    /**
     * Obtém ranking de mentorados em um simulado específico
     */
    async getSimuladoRanking(simuladoId: string): Promise<RankingEntry[]> {
        // Primeiro, buscar os simulados atribuídos que correspondem a este mentor_simulated_exam
        const { data: assignedSimulados } = await this.supabase
            .from('simulated_exams')
            .select('id')
            .eq('mentor_exam_id', simuladoId);

        const assignedIds = (assignedSimulados || []).map(s => s.id);
        const searchIds = assignedIds.length > 0 ? assignedIds : [simuladoId];

        const { data: results, error } = await this.supabase
            .from('simulated_exam_results')
            .select(`
        id,
        user_id,
        user_name,
        score,
        correct_answers,
        correct_count,
        total_questions,
        total_time_spent_seconds,
        time_taken_seconds,
        completed_at
      `)
            .in('simulated_exam_id', searchIds)
            .eq('status', 'completed')
            .order('score', { ascending: false });

        if (error) {
            console.error('Erro ao buscar ranking:', error);
            return [];
        }

        // Buscar nomes dos usuários
        const userIds = [...new Set((results || []).map(r => r.user_id))];
        const { data: users } = await this.supabase
            .from('users')
            .select('id, display_name, email')
            .in('id', userIds);

        const userMap = new Map((users || []).map(u => [u.id, u]));

        // Calcular scores e ordenar
        const processedResults = (results || []).map(r => {
            const totalQ = parseInt(r.total_questions) || 0;
            const correctCount = r.correct_answers || r.correct_count || 0;
            const score = totalQ > 0 ? (correctCount / totalQ) * 100 : parseFloat(r.score) || 0;
            const user = userMap.get(r.user_id);
            return {
                ...r,
                calculatedScore: score,
                calculatedCorrect: correctCount,
                resolvedUserName: r.user_name || user?.display_name || user?.email || 'Usuário'
            };
        }).sort((a, b) => b.calculatedScore - a.calculatedScore);

        return processedResults.map((r, index) => ({
            position: index + 1,
            userId: r.user_id,
            userName: r.resolvedUserName,
            score: r.calculatedScore,
            correctAnswers: r.calculatedCorrect,
            totalQuestions: parseInt(r.total_questions) || 0,
            timeSpentSeconds: r.total_time_spent_seconds || r.time_taken_seconds || 0,
            completedAt: r.completed_at
        }));
    }

    /**
     * Obtém análise detalhada de cada questão de um simulado
     */
    async getSimuladoQuestionAnalysis(simuladoId: string): Promise<QuestionAnalysis[]> {
        // Buscar o simulado
        const { data: simulado, error: simError } = await this.supabase
            .from('mentor_simulated_exams')
            .select('questions')
            .eq('id', simuladoId)
            .single();

        if (simError || !simulado) {
            return [];
        }

        const questionIds = (simulado.questions || []).map((q: any) => q.questionId || q.id || q);

        // Buscar detalhes das questões
        const { data: questions, error: qError } = await this.supabase
            .from('questions')
            .select('id, title, content, options, correct_answer, sub_filter_ids, difficulty')
            .in('id', questionIds);

        if (qError || !questions) {
            return [];
        }

        // Buscar os simulados atribuídos que correspondem a este mentor_simulated_exam
        const { data: assignedSimulados } = await this.supabase
            .from('simulated_exams')
            .select('id')
            .eq('mentor_exam_id', simuladoId);

        const assignedIds = (assignedSimulados || []).map(s => s.id);
        const searchIds = assignedIds.length > 0 ? assignedIds : [simuladoId];

        // Buscar resultados do simulado
        const { data: results, error: resError } = await this.supabase
            .from('simulated_exam_results')
            .select('user_id, user_name, answers')
            .in('simulated_exam_id', searchIds)
            .eq('status', 'completed');

        if (resError || !results) {
            return [];
        }

        // Buscar nomes dos usuários
        const userIds = [...new Set(results.map(r => r.user_id))];
        const { data: users } = await this.supabase
            .from('users')
            .select('id, display_name, email')
            .in('id', userIds);

        const userMap = new Map((users || []).map(u => [u.id, u]));

        // Analisar cada questão
        const questionAnalysis: QuestionAnalysis[] = questions.map(question => {
            const responses: QuestionResponse[] = [];
            let correctCount = 0;
            let totalResponses = 0;
            const optionDistribution: Record<string, number> = {};

            // Inicializar distribuição de opções
            (question.options || []).forEach((opt: any) => {
                optionDistribution[opt.id || opt.letter] = 0;
            });

            // Analisar respostas de cada usuário
            results.forEach(result => {
                const answer = result.answers?.[question.id];
                if (answer) {
                    totalResponses++;

                    // A resposta pode ser uma string direta (ID da opção) ou um objeto
                    const selectedOptionId = typeof answer === 'string'
                        ? answer
                        : (answer.selectedOption || answer.selected_option_id);

                    // Verificar se está correto
                    // O correct_answer é o TEXTO da alternativa correta, não o ID
                    let isCorrect = false;

                    if (typeof answer === 'object' && answer.isCorrect !== undefined) {
                        isCorrect = answer.isCorrect;
                    } else if (question.options && Array.isArray(question.options)) {
                        const selectedOpt = question.options.find((opt: any) => opt.id === selectedOptionId);
                        if (selectedOpt) {
                            isCorrect = selectedOpt.text === question.correct_answer;
                        }
                    }

                    if (selectedOptionId) {
                        optionDistribution[selectedOptionId] = (optionDistribution[selectedOptionId] || 0) + 1;
                    }

                    if (isCorrect) {
                        correctCount++;
                    }

                    const user = userMap.get(result.user_id);
                    responses.push({
                        userId: result.user_id,
                        userName: result.user_name || user?.display_name || user?.email || 'Usuário',
                        selectedOption: selectedOptionId,
                        isCorrect: isCorrect,
                        timeSpentSeconds: typeof answer === 'object' ? (answer.timeSpent || 0) : 0
                    });
                }
            });

            return {
                questionId: question.id,
                questionTitle: question.title,
                questionContent: question.content,
                correctAnswer: question.correct_answer,
                difficulty: question.difficulty,
                subFilterIds: question.sub_filter_ids || [],
                totalResponses,
                correctCount,
                accuracy: totalResponses > 0 ? (correctCount / totalResponses) * 100 : 0,
                optionDistribution,
                responses
            };
        });

        return questionAnalysis;
    }


    /**
     * Obtém desempenho de um mentorado específico em todos os simulados do mentor
     */
    async getMenteePerformance(
        mentorId: string,
        menteeId: string
    ): Promise<MenteePerformanceData> {
        // Buscar simulados do mentor
        const { data: mentorSimulados, error: simError } = await this.supabase
            .from('mentor_simulated_exams')
            .select('id, name, question_count, created_at')
            .eq('mentor_id', mentorId)
            .order('created_at', { ascending: true });

        if (simError || !mentorSimulados) {
            return {
                menteeId,
                totalSimulados: 0,
                completedSimulados: 0,
                averageScore: 0,
                evolution: [],
                performanceBySubject: []
            };
        }

        const mentorSimuladoIds = mentorSimulados.map(s => s.id);

        // Buscar os simulados atribuídos (simulated_exams) que correspondem aos mentor_simulated_exams
        const { data: assignedSimulados, error: assignedError } = await this.supabase
            .from('simulated_exams')
            .select('id, mentor_exam_id, title')
            .in('mentor_exam_id', mentorSimuladoIds)
            .eq('user_id', menteeId);

        if (assignedError) {
            console.error('Erro ao buscar simulados atribuídos:', assignedError);
        }

        const assignedSimuladoIds = (assignedSimulados || []).map(s => s.id);

        // Buscar resultados do mentorado nesses simulados atribuídos
        const { data: results, error: resError } = await this.supabase
            .from('simulated_exam_results')
            .select('*')
            .eq('user_id', menteeId)
            .in('simulated_exam_id', assignedSimuladoIds)
            .eq('status', 'completed')
            .order('completed_at', { ascending: true });

        if (resError) {
            console.error('Erro ao buscar resultados do mentorado:', resError);
        }

        const completedResults = results || [];
        // Use correct_count if correct_answers is null
        const scores = completedResults.map(r => {
            const totalQ = parseInt(r.total_questions) || 0;
            const correctCount = r.correct_answers || r.correct_count || 0;
            return totalQ > 0 ? (correctCount / totalQ) * 100 : 0;
        });

        // Evolução ao longo do tempo
        const evolution: PerformanceEvolution[] = completedResults.map(result => {
            // Encontrar o simulado atribuído e depois o mentor simulado
            const assignedSim = (assignedSimulados || []).find(s => s.id === result.simulated_exam_id);
            const mentorSim = mentorSimulados.find(s => s.id === assignedSim?.mentor_exam_id);

            const totalQ = parseInt(result.total_questions) || 0;
            const correctCount = result.correct_answers || result.correct_count || 0;
            const score = totalQ > 0 ? (correctCount / totalQ) * 100 : 0;

            return {
                simuladoId: mentorSim?.id || result.simulated_exam_id,
                simuladoName: mentorSim?.name || assignedSim?.title || 'Simulado',
                score,
                correctAnswers: correctCount,
                totalQuestions: totalQ,
                timeSpentSeconds: result.total_time_spent_seconds || result.time_taken_seconds || 0,
                completedAt: result.completed_at
            };
        });


        // Calcular performance por subespecialidade e por especialidade
        const subjectStats = new Map<string, { correct: number; total: number; name: string; filterId: string }>();
        const specialtyStats = new Map<string, { correct: number; total: number; name: string }>();

        for (const result of completedResults) {
            const answers = result.answers || {};

            // Encontrar o simulado atribuído e depois o mentor simulado
            const assignedSim = (assignedSimulados || []).find(s => s.id === result.simulated_exam_id);
            if (!assignedSim?.mentor_exam_id) continue;

            const { data: simData } = await this.supabase
                .from('mentor_simulated_exams')
                .select('questions')
                .eq('id', assignedSim.mentor_exam_id)
                .single();

            if (!simData?.questions) continue;

            const questionIds = simData.questions.map((q: any) => q.questionId || q.id || q);

            // Buscar questões com opções para verificar corretude
            const { data: questions } = await this.supabase
                .from('questions')
                .select('id, filter_ids, sub_filter_ids, correct_answer, options')
                .in('id', questionIds);

            if (!questions) continue;

            // Coletar todos os sub_filter_ids (excluindo Ano e Universidade)
            const allSubFilterIds = new Set<string>();
            questions.forEach(q => {
                (q.sub_filter_ids || []).forEach((id: string) => {
                    if (!id.startsWith('Ano ') && !id.startsWith('Universidade_')) {
                        allSubFilterIds.add(id);
                    }
                });
            });

            // Buscar nomes dos subfiltros
            const { data: subFilters } = await this.supabase
                .from('sub_filters')
                .select('id, name, filter_id')
                .in('id', Array.from(allSubFilterIds).length > 0 ? Array.from(allSubFilterIds) : ['__none__']);

            const subFiltersMap = new Map((subFilters || []).map(sf => [sf.id, sf]));

            // Buscar nomes dos filters (especialidades)
            const allFilterIds = new Set<string>();
            questions.forEach(q => {
                (q.filter_ids || []).forEach((id: string) => {
                    if (id !== 'Residência Médica') {
                        allFilterIds.add(id);
                    }
                });
            });

            const { data: filters } = await this.supabase
                .from('filters')
                .select('id, name')
                .in('id', Array.from(allFilterIds).length > 0 ? Array.from(allFilterIds) : ['__none__']);

            const filtersMap = new Map((filters || []).map(f => [f.id, f.name]));

            // Agregar estatísticas
            questions.forEach(q => {
                const answer = answers[q.id];
                if (!answer) return;

                // Obter o ID da alternativa selecionada
                const selectedOptionId = typeof answer === 'string' ? answer : answer.selectedOption || answer.selected_option_id;

                // Verificar se a resposta está correta
                let isCorrect = false;

                if (typeof answer === 'object' && answer.isCorrect !== undefined) {
                    isCorrect = answer.isCorrect;
                } else if (q.options && Array.isArray(q.options)) {
                    const selectedOption = q.options.find((opt: any) => opt.id === selectedOptionId);
                    if (selectedOption) {
                        isCorrect = selectedOption.text === q.correct_answer;
                    }
                }

                // Agregar por ESPECIALIDADE (filter_ids) - conta questão uma vez por especialidade
                const validFilterIds = (q.filter_ids || []).filter((fId: string) => fId !== 'Residência Médica');
                validFilterIds.forEach((fId: string) => {
                    const fName = filtersMap.get(fId) || fId;
                    if (!specialtyStats.has(fId)) {
                        specialtyStats.set(fId, { correct: 0, total: 0, name: fName });
                    }
                    const stats = specialtyStats.get(fId)!;
                    stats.total++;
                    if (isCorrect) stats.correct++;
                });

                // Agregar por SUBESPECIALIDADE (sub_filter_ids)
                const validSubFilterIds = (q.sub_filter_ids || []).filter((sfId: string) =>
                    !sfId.startsWith('Ano ') && !sfId.startsWith('Universidade_')
                );

                validSubFilterIds.forEach((sfId: string) => {
                    const subFilter = subFiltersMap.get(sfId);
                    if (subFilter) {
                        if (!subjectStats.has(sfId)) {
                            subjectStats.set(sfId, {
                                correct: 0,
                                total: 0,
                                name: subFilter.name,
                                filterId: subFilter.filter_id
                            });
                        }
                        const stats = subjectStats.get(sfId)!;
                        stats.total++;
                        if (isCorrect) stats.correct++;
                    }
                });
            });
        }


        // Performance por subespecialidade
        const performanceBySubject: SubjectPerformance[] = Array.from(subjectStats.entries())
            .map(([subFilterId, stats]) => {
                return {
                    subFilterId,
                    subFilterName: stats.name,
                    filterId: stats.filterId,
                    totalQuestions: stats.total,
                    totalAnswered: stats.total,
                    correctAnswers: stats.correct,
                    accuracy: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0,
                    averageTimeSeconds: 0
                };
            })
            .sort((a, b) => a.subFilterName.localeCompare(b.subFilterName, 'pt-BR'));

        // Performance por especialidade (contagem correta de questões)
        const performanceBySpecialty = Array.from(specialtyStats.entries())
            .map(([filterId, stats]) => {
                return {
                    filterId,
                    filterName: stats.name,
                    totalQuestions: stats.total,
                    correctAnswers: stats.correct,
                    accuracy: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0
                };
            })
            .sort((a, b) => a.filterName.localeCompare(b.filterName, 'pt-BR'));

        return {
            menteeId,
            totalSimulados: mentorSimulados.length,
            completedSimulados: completedResults.length,
            averageScore: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
            evolution,
            performanceBySubject,
            performanceBySpecialty
        };
    }

    /**
     * Compara desempenho entre múltiplos mentorados em um simulado
     */
    async compareSimuladoPerformance(
        simuladoId: string,
        menteeIds: string[]
    ): Promise<MenteeComparison[]> {
        const { data: results, error } = await this.supabase
            .from('simulated_exam_results')
            .select('*')
            .eq('simulated_exam_id', simuladoId)
            .in('user_id', menteeIds)
            .eq('status', 'completed');

        if (error || !results) {
            return [];
        }

        return results.map(r => ({
            menteeId: r.user_id,
            menteeName: r.user_name || 'Usuário',
            score: parseFloat(r.score) || 0,
            correctAnswers: r.correct_answers || 0,
            totalQuestions: r.total_questions || 0,
            timeSpentSeconds: r.total_time_spent_seconds || 0,
            completedAt: r.completed_at
        }));
    }


    /**
     * Obtém visão geral de analytics do mentor
     */
    async getMentorOverview(mentorId: string): Promise<MentorOverview> {
        // Buscar simulados do mentor
        const { data: simulados, error: simError } = await this.supabase
            .from('mentor_simulated_exams')
            .select('id, name, question_count, status, created_at')
            .eq('mentor_id', mentorId);

        if (simError) {
            console.error('Erro ao buscar simulados:', simError);
        }

        const simuladoIds = (simulados || []).map(s => s.id);

        // Buscar todos os resultados
        const { data: results, error: resError } = await this.supabase
            .from('simulated_exam_results')
            .select('user_id, score, correct_answers, total_questions')
            .in('simulated_exam_id', simuladoIds)
            .eq('status', 'completed');

        if (resError) {
            console.error('Erro ao buscar resultados:', resError);
        }

        const allResults = results || [];
        const uniqueMentees = new Set(allResults.map(r => r.user_id));
        const scores = allResults.map(r => parseFloat(r.score) || 0);
        const totalQuestions = allResults.reduce((sum, r) => sum + (r.total_questions || 0), 0);
        const totalCorrect = allResults.reduce((sum, r) => sum + (r.correct_answers || 0), 0);

        // Buscar mentorias ativas
        const { data: mentorships, error: mentError } = await this.supabase
            .from('mentorships')
            .select('id, status')
            .eq('mentorId', mentorId);

        const activeMentorships = (mentorships || []).filter(m => m.status === 'active').length;

        return {
            totalSimulados: simulados?.length || 0,
            activeSimulados: (simulados || []).filter(s => s.status === 'active').length,
            totalMentees: uniqueMentees.size,
            activeMentorships,
            totalResponses: allResults.length,
            totalQuestionsAnswered: totalQuestions,
            overallAccuracy: totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0,
            averageScore: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
        };
    }

    // ============================================
    // MÉTODOS DE ANALYTICS GLOBAIS
    // ============================================

    /**
     * Obtém ranking global cumulativo de todos os simulados do mentor
     */
    async getGlobalRanking(mentorId: string, options?: { limit?: number; period?: 'all' | '30d' | '60d' | '90d' }): Promise<GlobalRankingEntry[]> {
        const { limit = 50, period = 'all' } = options || {};

        // Buscar simulados do mentor
        const { data: simulados } = await this.supabase
            .from('mentor_simulated_exams')
            .select('id')
            .eq('mentor_id', mentorId);

        if (!simulados || simulados.length === 0) return [];

        const simuladoIds = simulados.map(s => s.id);

        // Buscar assignments completados
        let assignmentsQuery = this.supabase
            .from('mentor_exam_assignments')
            .select('*')
            .in('mentor_exam_id', simuladoIds)
            .eq('status', 'completed');

        // Filtrar por período se necessário
        if (period !== 'all') {
            const days = parseInt(period);
            const dateLimit = new Date();
            dateLimit.setDate(dateLimit.getDate() - days);
            assignmentsQuery = assignmentsQuery.gte('completed_at', dateLimit.toISOString());
        }

        const { data: assignments } = await assignmentsQuery;

        if (!assignments || assignments.length === 0) return [];

        // Agregar por usuário
        const userStats = new Map<string, {
            totalSimulados: number;
            totalQuestions: number;
            totalCorrect: number;
            totalTime: number;
            scores: number[];
        }>();

        assignments.forEach(a => {
            const total = (a.correct_count || 0) + (a.incorrect_count || 0);
            const score = total > 0 ? ((a.correct_count || 0) / total) * 100 : 0;

            if (!userStats.has(a.user_id)) {
                userStats.set(a.user_id, {
                    totalSimulados: 0,
                    totalQuestions: 0,
                    totalCorrect: 0,
                    totalTime: 0,
                    scores: []
                });
            }

            const stats = userStats.get(a.user_id)!;
            stats.totalSimulados++;
            stats.totalQuestions += total;
            stats.totalCorrect += a.correct_count || 0;
            stats.totalTime += a.time_spent_seconds || 0;
            stats.scores.push(score);
        });

        // Buscar dados dos usuários
        const userIds = [...userStats.keys()];
        const { data: users } = await this.supabase
            .from('users')
            .select('id, display_name, email, photo_url')
            .in('id', userIds);

        const usersMap = new Map(users?.map(u => [u.id, u]) || []);

        // Buscar mentorias para identificar mentorados
        const { data: mentorships } = await this.supabase
            .from('mentorships')
            .select('id, "menteeId", program_id')
            .eq('"mentorId"', mentorId);

        const menteeIds = new Set(mentorships?.map(m => m.menteeId) || []);

        // Buscar programas
        const programIds = [...new Set(mentorships?.map(m => m.program_id).filter(Boolean) || [])];
        const { data: programs } = await this.supabase
            .from('mentor_programs')
            .select('id, title')
            .in('id', programIds.length > 0 ? programIds : ['__none__']);

        const programsMap = new Map(programs?.map(p => [p.id, p.title]) || []);
        const menteeProgramMap = new Map<string, string>();
        mentorships?.forEach(m => {
            if (m.menteeId && m.program_id) {
                menteeProgramMap.set(m.menteeId, programsMap.get(m.program_id) || '');
            }
        });

        // Construir ranking
        const ranking: GlobalRankingEntry[] = [...userStats.entries()]
            .map(([userId, stats]) => {
                const user = usersMap.get(userId);
                const avgScore = stats.scores.length > 0
                    ? stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length
                    : 0;

                return {
                    userId,
                    userName: user?.display_name || 'Usuário',
                    userEmail: user?.email || '',
                    userPhoto: user?.photo_url || null,
                    isMentee: menteeIds.has(userId),
                    programTitle: menteeProgramMap.get(userId) || null,
                    totalSimuladosCompleted: stats.totalSimulados,
                    totalQuestionsAnswered: stats.totalQuestions,
                    totalCorrect: stats.totalCorrect,
                    globalAccuracy: stats.totalQuestions > 0 ? (stats.totalCorrect / stats.totalQuestions) * 100 : 0,
                    averageScore: avgScore,
                    totalTimeSpentSeconds: stats.totalTime,
                    position: 0,
                    trend: 'stable' as const
                };
            })
            .sort((a, b) => b.globalAccuracy - a.globalAccuracy)
            .slice(0, limit)
            .map((entry, index) => ({ ...entry, position: index + 1 }));

        return ranking;
    }

    /**
     * Obtém estatísticas globais por especialidade de todos os simulados
     */
    async getGlobalSpecialtyStats(mentorId: string): Promise<GlobalSpecialtyStats> {
        // Buscar simulados do mentor
        const { data: simulados } = await this.supabase
            .from('mentor_simulated_exams')
            .select('id, questions')
            .eq('mentor_id', mentorId);

        if (!simulados || simulados.length === 0) {
            return { specialties: [], subspecialties: [] };
        }

        // Coletar todos os IDs de questões
        const allQuestionIds = new Set<string>();
        simulados.forEach(s => {
            (s.questions || []).forEach((q: any) => {
                allQuestionIds.add(q.questionId || q.id || q);
            });
        });

        if (allQuestionIds.size === 0) {
            return { specialties: [], subspecialties: [] };
        }

        // Buscar questões com filtros
        const { data: questions } = await this.supabase
            .from('questions')
            .select('id, filter_ids, sub_filter_ids')
            .in('id', [...allQuestionIds]);

        // Buscar filtros (especialidades médicas)
        const allFilterIds = new Set<string>();
        questions?.forEach(q => {
            (q.filter_ids || []).forEach((id: string) => allFilterIds.add(id));
        });

        const { data: filters } = await this.supabase
            .from('filters')
            .select('id, name, category')
            .in('id', [...allFilterIds])
            .eq('category', 'MEDICAL_SPECIALTY');

        const filtersMap = new Map(filters?.map(f => [f.id, f.name]) || []);
        const medicalSpecialtyIds = new Set(filters?.map(f => f.id) || []);

        // Buscar subfiltros
        const allSubFilterIds = new Set<string>();
        questions?.forEach(q => {
            (q.sub_filter_ids || []).forEach((id: string) => {
                if (!id.startsWith('Ano ') && !id.startsWith('Universidade_')) {
                    allSubFilterIds.add(id);
                }
            });
        });

        const { data: subFilters } = await this.supabase
            .from('sub_filters')
            .select('id, name, filter_id, level')
            .in('id', [...allSubFilterIds].length > 0 ? [...allSubFilterIds] : ['__none__']);

        const subFiltersMap = new Map(subFilters?.map(sf => [sf.id, sf]) || []);

        // Buscar simulados individuais
        const simuladoIds = simulados.map(s => s.id);
        const { data: userSimulados } = await this.supabase
            .from('simulated_exams')
            .select('id')
            .in('mentor_exam_id', simuladoIds);

        const userSimuladoIds = userSimulados?.map(s => s.id) || [];

        // Buscar respostas
        const { data: responses } = await this.supabase
            .from('question_responses')
            .select('question_id, is_correct_on_first_attempt, response_time_seconds')
            .in('simulated_exam_id', userSimuladoIds.length > 0 ? userSimuladoIds : ['__none__']);

        // Mapear questões para filtros
        const questionFiltersMap = new Map<string, string[]>();
        const questionSubFiltersMap = new Map<string, string[]>();
        questions?.forEach(q => {
            questionFiltersMap.set(q.id, (q.filter_ids || []).filter((id: string) => medicalSpecialtyIds.has(id)));
            questionSubFiltersMap.set(q.id, (q.sub_filter_ids || []).filter((id: string) =>
                !id.startsWith('Ano ') && !id.startsWith('Universidade_')
            ));
        });

        // Agregar estatísticas por especialidade
        const specialtyStats = new Map<string, { responses: number; correct: number; time: number }>();
        const subspecialtyStats = new Map<string, { responses: number; correct: number }>();

        responses?.forEach(r => {
            const filterIds = questionFiltersMap.get(r.question_id) || [];
            const subFilterIds = questionSubFiltersMap.get(r.question_id) || [];

            filterIds.forEach(filterId => {
                if (!specialtyStats.has(filterId)) {
                    specialtyStats.set(filterId, { responses: 0, correct: 0, time: 0 });
                }
                const stats = specialtyStats.get(filterId)!;
                stats.responses++;
                if (r.is_correct_on_first_attempt) stats.correct++;
                stats.time += r.response_time_seconds || 0;
            });

            subFilterIds.forEach(subFilterId => {
                if (!subFiltersMap.has(subFilterId)) return;
                if (!subspecialtyStats.has(subFilterId)) {
                    subspecialtyStats.set(subFilterId, { responses: 0, correct: 0 });
                }
                const stats = subspecialtyStats.get(subFilterId)!;
                stats.responses++;
                if (r.is_correct_on_first_attempt) stats.correct++;
            });
        });

        // Contar questões por filtro
        const questionCountByFilter = new Map<string, number>();
        const questionCountBySubFilter = new Map<string, number>();
        questions?.forEach(q => {
            (q.filter_ids || []).forEach((filterId: string) => {
                if (medicalSpecialtyIds.has(filterId)) {
                    questionCountByFilter.set(filterId, (questionCountByFilter.get(filterId) || 0) + 1);
                }
            });
            (q.sub_filter_ids || []).forEach((subFilterId: string) => {
                if (subFiltersMap.has(subFilterId)) {
                    questionCountBySubFilter.set(subFilterId, (questionCountBySubFilter.get(subFilterId) || 0) + 1);
                }
            });
        });

        // Formatar resultado
        const specialties: GlobalSpecialtyStatItem[] = [...specialtyStats.entries()]
            .filter(([filterId]) => filtersMap.has(filterId))
            .map(([filterId, stats]) => ({
                filterId,
                filterName: filtersMap.get(filterId)!,
                totalQuestions: questionCountByFilter.get(filterId) || 0,
                totalResponses: stats.responses,
                correctCount: stats.correct,
                accuracy: stats.responses > 0 ? (stats.correct / stats.responses) * 100 : 0,
                averageTimeSeconds: stats.responses > 0 ? stats.time / stats.responses : 0,
                trend: 'stable' as const
            }))
            .sort((a, b) => b.accuracy - a.accuracy);

        const subspecialties: GlobalSubspecialtyStatItem[] = [...subspecialtyStats.entries()]
            .filter(([subFilterId]) => subFiltersMap.has(subFilterId))
            .map(([subFilterId, stats]) => {
                const sf = subFiltersMap.get(subFilterId)!;
                return {
                    subFilterId,
                    subFilterName: sf.name,
                    filterId: sf.filter_id,
                    level: sf.level,
                    totalQuestions: questionCountBySubFilter.get(subFilterId) || 0,
                    totalResponses: stats.responses,
                    correctCount: stats.correct,
                    accuracy: stats.responses > 0 ? (stats.correct / stats.responses) * 100 : 0
                };
            })
            .sort((a, b) => a.subFilterName.localeCompare(b.subFilterName, 'pt-BR'));

        return { specialties, subspecialties };
    }

    /**
     * Compara estatísticas entre simulados selecionados
     */
    async compareSimulados(mentorId: string, simuladoIds: string[]): Promise<SimuladoComparison> {
        if (simuladoIds.length === 0) {
            return { simulados: [], comparisonData: [] };
        }

        // Buscar simulados
        const { data: simulados } = await this.supabase
            .from('mentor_simulated_exams')
            .select('id, name, questions, created_at')
            .eq('mentor_id', mentorId)
            .in('id', simuladoIds);

        if (!simulados || simulados.length === 0) {
            return { simulados: [], comparisonData: [] };
        }

        // Coletar todos os IDs de questões
        const allQuestionIds = new Set<string>();
        simulados.forEach(s => {
            (s.questions || []).forEach((q: any) => {
                allQuestionIds.add(q.questionId || q.id || q);
            });
        });

        // Buscar questões com filtros
        const { data: questions } = await this.supabase
            .from('questions')
            .select('id, filter_ids')
            .in('id', [...allQuestionIds]);

        // Buscar filtros
        const allFilterIds = new Set<string>();
        questions?.forEach(q => {
            (q.filter_ids || []).forEach((id: string) => allFilterIds.add(id));
        });

        const { data: filters } = await this.supabase
            .from('filters')
            .select('id, name, category')
            .in('id', [...allFilterIds])
            .eq('category', 'MEDICAL_SPECIALTY');

        const filtersMap = new Map(filters?.map(f => [f.id, f.name]) || []);
        const medicalSpecialtyIds = new Set(filters?.map(f => f.id) || []);

        const questionFiltersMap = new Map<string, string[]>();
        questions?.forEach(q => {
            questionFiltersMap.set(q.id, (q.filter_ids || []).filter((id: string) => medicalSpecialtyIds.has(id)));
        });

        // Para cada simulado, calcular estatísticas
        const simuladoResults: SimuladoComparisonItem[] = [];
        const allSpecialties = new Set<string>();

        for (const simulado of simulados) {
            // Buscar simulados individuais
            const { data: userSimulados } = await this.supabase
                .from('simulated_exams')
                .select('id')
                .eq('mentor_exam_id', simulado.id);

            const userSimuladoIds = userSimulados?.map(s => s.id) || [];

            // Buscar assignments completados
            const { data: assignments } = await this.supabase
                .from('mentor_exam_assignments')
                .select('correct_count, incorrect_count')
                .eq('mentor_exam_id', simulado.id)
                .eq('status', 'completed');

            const participantsCount = assignments?.length || 0;
            const scores = (assignments || []).map(a => {
                const total = (a.correct_count || 0) + (a.incorrect_count || 0);
                return total > 0 ? ((a.correct_count || 0) / total) * 100 : 0;
            });
            const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

            // Buscar respostas para estatísticas por especialidade
            const { data: responses } = await this.supabase
                .from('question_responses')
                .select('question_id, is_correct_on_first_attempt')
                .in('simulated_exam_id', userSimuladoIds.length > 0 ? userSimuladoIds : ['__none__']);

            // Agregar por especialidade
            const specialtyStats = new Map<string, { correct: number; total: number }>();
            responses?.forEach(r => {
                const filterIds = questionFiltersMap.get(r.question_id) || [];
                filterIds.forEach(filterId => {
                    if (!specialtyStats.has(filterId)) {
                        specialtyStats.set(filterId, { correct: 0, total: 0 });
                    }
                    const stats = specialtyStats.get(filterId)!;
                    stats.total++;
                    if (r.is_correct_on_first_attempt) stats.correct++;
                    allSpecialties.add(filterId);
                });
            });

            const specialtyBreakdown = [...specialtyStats.entries()]
                .filter(([filterId]) => filtersMap.has(filterId))
                .map(([filterId, stats]) => ({
                    filterId,
                    filterName: filtersMap.get(filterId)!,
                    accuracy: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0
                }));

            simuladoResults.push({
                id: simulado.id,
                name: simulado.name,
                date: simulado.created_at,
                participantsCount,
                averageScore,
                specialtyBreakdown
            });
        }

        // Construir dados de comparação para gráfico
        const comparisonData: Array<{ specialty: string; [key: string]: number | string }> = [];
        [...allSpecialties].forEach(filterId => {
            const filterName = filtersMap.get(filterId);
            if (!filterName) return;

            const dataPoint: { specialty: string; [key: string]: number | string } = { specialty: filterName };
            simuladoResults.forEach(sim => {
                const breakdown = sim.specialtyBreakdown.find(b => b.filterId === filterId);
                dataPoint[sim.name] = breakdown?.accuracy || 0;
            });
            comparisonData.push(dataPoint);
        });

        return { simulados: simuladoResults, comparisonData };
    }

    /**
     * Obtém dados de evolução ao longo do tempo
     */
    async getEvolutionOverTime(mentorId: string): Promise<EvolutionData> {
        // Buscar simulados do mentor ordenados por data
        const { data: simulados } = await this.supabase
            .from('mentor_simulated_exams')
            .select('id, name, questions, created_at')
            .eq('mentor_id', mentorId)
            .order('created_at', { ascending: true });

        if (!simulados || simulados.length === 0) {
            return { bySimulado: [], byPeriod: [], bySpecialty: [] };
        }

        // Coletar IDs de questões e filtros
        const allQuestionIds = new Set<string>();
        simulados.forEach(s => {
            (s.questions || []).forEach((q: any) => {
                allQuestionIds.add(q.questionId || q.id || q);
            });
        });

        const { data: questions } = await this.supabase
            .from('questions')
            .select('id, filter_ids')
            .in('id', [...allQuestionIds]);

        const allFilterIds = new Set<string>();
        questions?.forEach(q => {
            (q.filter_ids || []).forEach((id: string) => allFilterIds.add(id));
        });

        const { data: filters } = await this.supabase
            .from('filters')
            .select('id, name, category')
            .in('id', [...allFilterIds])
            .eq('category', 'MEDICAL_SPECIALTY');

        const filtersMap = new Map(filters?.map(f => [f.id, f.name]) || []);
        const medicalSpecialtyIds = new Set(filters?.map(f => f.id) || []);

        const questionFiltersMap = new Map<string, string[]>();
        questions?.forEach(q => {
            questionFiltersMap.set(q.id, (q.filter_ids || []).filter((id: string) => medicalSpecialtyIds.has(id)));
        });

        // Evolução por simulado
        const bySimulado: EvolutionBySimulado[] = [];
        const bySpecialtyMap = new Map<string, Array<{ date: string; simuladoName: string; accuracy: number }>>();

        for (const simulado of simulados) {
            const { data: assignments } = await this.supabase
                .from('mentor_exam_assignments')
                .select('correct_count, incorrect_count, status')
                .eq('mentor_exam_id', simulado.id);

            const completed = (assignments || []).filter(a => a.status === 'completed');
            const total = assignments?.length || 0;
            const scores = completed.map(a => {
                const t = (a.correct_count || 0) + (a.incorrect_count || 0);
                return t > 0 ? ((a.correct_count || 0) / t) * 100 : 0;
            });

            bySimulado.push({
                simuladoId: simulado.id,
                simuladoName: simulado.name,
                date: simulado.created_at,
                averageScore: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
                participantsCount: completed.length,
                completionRate: total > 0 ? (completed.length / total) * 100 : 0
            });

            // Buscar respostas para evolução por especialidade
            const { data: userSimulados } = await this.supabase
                .from('simulated_exams')
                .select('id')
                .eq('mentor_exam_id', simulado.id);

            const userSimuladoIds = userSimulados?.map(s => s.id) || [];

            const { data: responses } = await this.supabase
                .from('question_responses')
                .select('question_id, is_correct_on_first_attempt')
                .in('simulated_exam_id', userSimuladoIds.length > 0 ? userSimuladoIds : ['__none__']);

            // Agregar por especialidade
            const specialtyStats = new Map<string, { correct: number; total: number }>();
            responses?.forEach(r => {
                const filterIds = questionFiltersMap.get(r.question_id) || [];
                filterIds.forEach(filterId => {
                    if (!specialtyStats.has(filterId)) {
                        specialtyStats.set(filterId, { correct: 0, total: 0 });
                    }
                    const stats = specialtyStats.get(filterId)!;
                    stats.total++;
                    if (r.is_correct_on_first_attempt) stats.correct++;
                });
            });

            specialtyStats.forEach((stats, filterId) => {
                if (!filtersMap.has(filterId)) return;
                if (!bySpecialtyMap.has(filterId)) {
                    bySpecialtyMap.set(filterId, []);
                }
                bySpecialtyMap.get(filterId)!.push({
                    date: simulado.created_at,
                    simuladoName: simulado.name,
                    accuracy: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0
                });
            });
        }

        // Evolução por período (mensal)
        const byPeriodMap = new Map<string, { scores: number[]; responses: number; correct: number }>();
        bySimulado.forEach(sim => {
            const date = new Date(sim.date);
            const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (!byPeriodMap.has(period)) {
                byPeriodMap.set(period, { scores: [], responses: 0, correct: 0 });
            }
            const stats = byPeriodMap.get(period)!;
            if (sim.averageScore > 0) stats.scores.push(sim.averageScore);
        });

        const byPeriod: EvolutionByPeriod[] = [...byPeriodMap.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([period, stats]) => {
                const [year, month] = period.split('-');
                const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                return {
                    period,
                    periodLabel: `${monthNames[parseInt(month) - 1]}/${year}`,
                    averageScore: stats.scores.length > 0 ? stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length : 0,
                    totalResponses: stats.responses,
                    accuracy: 0
                };
            });

        // Evolução por especialidade
        const bySpecialty: EvolutionBySpecialty[] = [...bySpecialtyMap.entries()]
            .filter(([filterId]) => filtersMap.has(filterId))
            .map(([filterId, evolution]) => ({
                filterId,
                filterName: filtersMap.get(filterId)!,
                evolution
            }));

        return { bySimulado, byPeriod, bySpecialty };
    }

    /**
     * Obtém resumo geral de analytics globais
     */
    async getGlobalAnalyticsSummary(mentorId: string): Promise<GlobalAnalyticsSummary> {
        // Buscar simulados do mentor
        const { data: simulados } = await this.supabase
            .from('mentor_simulated_exams')
            .select('id, status')
            .eq('mentor_id', mentorId);

        if (!simulados || simulados.length === 0) {
            return {
                totalSimulados: 0,
                activeSimulados: 0,
                totalParticipants: 0,
                totalResponses: 0,
                totalQuestionsAnswered: 0,
                overallAccuracy: 0,
                averageScore: 0,
                averageTimePerSimulado: 0,
                completionRate: 0
            };
        }

        const simuladoIds = simulados.map(s => s.id);

        // Buscar todos os assignments
        const { data: assignments } = await this.supabase
            .from('mentor_exam_assignments')
            .select('user_id, status, correct_count, incorrect_count, time_spent_seconds')
            .in('mentor_exam_id', simuladoIds);

        const completed = (assignments || []).filter(a => a.status === 'completed');
        const uniqueParticipants = new Set((assignments || []).map(a => a.user_id));

        let totalQuestions = 0;
        let totalCorrect = 0;
        let totalTime = 0;
        const scores: number[] = [];

        completed.forEach(a => {
            const total = (a.correct_count || 0) + (a.incorrect_count || 0);
            totalQuestions += total;
            totalCorrect += a.correct_count || 0;
            totalTime += a.time_spent_seconds || 0;
            if (total > 0) {
                scores.push(((a.correct_count || 0) / total) * 100);
            }
        });

        return {
            totalSimulados: simulados.length,
            activeSimulados: simulados.filter(s => s.status === 'active').length,
            totalParticipants: uniqueParticipants.size,
            totalResponses: completed.length,
            totalQuestionsAnswered: totalQuestions,
            overallAccuracy: totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0,
            averageScore: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
            averageTimePerSimulado: completed.length > 0 ? totalTime / completed.length : 0,
            completionRate: (assignments?.length || 0) > 0 ? (completed.length / (assignments?.length || 1)) * 100 : 0
        };
    }
}


// ============================================
// INTERFACES E TIPOS
// ============================================

export interface MentorSimuladoSummary {
    id: string;
    name: string;
    description?: string;
    questionCount: number;
    visibility: string;
    status: string;
    timeLimitMinutes?: number;
    createdAt: string;
    totalRespondents: number;
    averageScore: number;
    averageTimeSeconds: number;
    completionRate: number;
    highestScore: number;
    lowestScore: number;
}

export interface SimuladoStats {
    totalRespondents: number;
    averageScore: number;
    averageTimeSeconds: number;
    completionRate: number;
    highestScore: number;
    lowestScore: number;
}

export interface SubjectPerformance {
    subFilterId: string;
    subFilterName: string;
    filterId: string;
    totalQuestions: number;
    totalAnswered: number;
    correctAnswers: number;
    accuracy: number;
    averageTimeSeconds: number;
}

export interface RankingEntry {
    position: number;
    userId: string;
    userName: string;
    score: number;
    correctAnswers: number;
    totalQuestions: number;
    timeSpentSeconds: number;
    completedAt: string;
}

export interface QuestionResponse {
    userId: string;
    userName: string;
    selectedOption: string;
    isCorrect: boolean;
    timeSpentSeconds: number;
}


export interface QuestionAnalysis {
    questionId: string;
    questionTitle: string;
    questionContent: string;
    correctAnswer: string;
    difficulty: number;
    subFilterIds: string[];
    totalResponses: number;
    correctCount: number;
    accuracy: number;
    optionDistribution: Record<string, number>;
    responses: QuestionResponse[];
}

export interface PerformanceEvolution {
    simuladoId: string;
    simuladoName: string;
    score: number;
    correctAnswers: number;
    totalQuestions: number;
    timeSpentSeconds: number;
    completedAt: string;
}

export interface SpecialtyPerformance {
    filterId: string;
    filterName: string;
    totalQuestions: number;
    correctAnswers: number;
    accuracy: number;
}

export interface MenteePerformanceData {
    menteeId: string;
    totalSimulados: number;
    completedSimulados: number;
    averageScore: number;
    evolution: PerformanceEvolution[];
    performanceBySubject: SubjectPerformance[];
    performanceBySpecialty?: SpecialtyPerformance[];
}

export interface MenteeComparison {
    menteeId: string;
    menteeName: string;
    score: number;
    correctAnswers: number;
    totalQuestions: number;
    timeSpentSeconds: number;
    completedAt: string;
}

export interface MentorOverview {
    totalSimulados: number;
    activeSimulados: number;
    totalMentees: number;
    activeMentorships: number;
    totalResponses: number;
    totalQuestionsAnswered: number;
    overallAccuracy: number;
    averageScore: number;
}

// ============================================
// INTERFACES PARA ANALYTICS GLOBAIS
// ============================================

export interface GlobalRankingEntry {
    userId: string;
    userName: string;
    userEmail: string;
    userPhoto: string | null;
    isMentee: boolean;
    programTitle: string | null;
    totalSimuladosCompleted: number;
    totalQuestionsAnswered: number;
    totalCorrect: number;
    globalAccuracy: number;
    averageScore: number;
    totalTimeSpentSeconds: number;
    position: number;
    trend: 'up' | 'down' | 'stable';
}

export interface GlobalSpecialtyStatItem {
    filterId: string;
    filterName: string;
    totalQuestions: number;
    totalResponses: number;
    correctCount: number;
    accuracy: number;
    averageTimeSeconds: number;
    trend: 'up' | 'down' | 'stable';
}

export interface GlobalSubspecialtyStatItem {
    subFilterId: string;
    subFilterName: string;
    filterId: string;
    level: string;
    totalQuestions: number;
    totalResponses: number;
    correctCount: number;
    accuracy: number;
}

export interface GlobalSpecialtyStats {
    specialties: GlobalSpecialtyStatItem[];
    subspecialties: GlobalSubspecialtyStatItem[];
}

export interface SimuladoComparisonItem {
    id: string;
    name: string;
    date: string;
    participantsCount: number;
    averageScore: number;
    specialtyBreakdown: Array<{
        filterId: string;
        filterName: string;
        accuracy: number;
    }>;
}

export interface SimuladoComparison {
    simulados: SimuladoComparisonItem[];
    comparisonData: Array<{
        specialty: string;
        [simuladoName: string]: number | string;
    }>;
}

export interface EvolutionBySimulado {
    simuladoId: string;
    simuladoName: string;
    date: string;
    averageScore: number;
    participantsCount: number;
    completionRate: number;
}

export interface EvolutionByPeriod {
    period: string;
    periodLabel: string;
    averageScore: number;
    totalResponses: number;
    accuracy: number;
}

export interface EvolutionBySpecialty {
    filterId: string;
    filterName: string;
    evolution: Array<{
        date: string;
        simuladoName: string;
        accuracy: number;
    }>;
}

export interface EvolutionData {
    bySimulado: EvolutionBySimulado[];
    byPeriod: EvolutionByPeriod[];
    bySpecialty: EvolutionBySpecialty[];
}

export interface GlobalAnalyticsSummary {
    totalSimulados: number;
    activeSimulados: number;
    totalParticipants: number;
    totalResponses: number;
    totalQuestionsAnswered: number;
    overallAccuracy: number;
    averageScore: number;
    averageTimePerSimulado: number;
    completionRate: number;
}
