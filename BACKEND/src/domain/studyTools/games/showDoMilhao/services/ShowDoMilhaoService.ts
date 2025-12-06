import { SupabaseClient } from '@supabase/supabase-js';
import {
  IShowDoMilhaoGame,
  IShowDoMilhaoStats,
  IStartGameParams,
  IAnswerResult,
  IUseHelpResult,
  IUniversityAnswer,
  IRankingEntry,
  PRIZE_LEVELS,
  MAX_SKIPS,
} from '../interfaces/IShowDoMilhao';

// Helper para data de hoje em Brasília
const getTodayBrasilia = (): string => {
  const now = new Date();
  const brasiliaDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  return brasiliaDate.toISOString().split('T')[0];
};

export class ShowDoMilhaoService {
  constructor(private supabase: SupabaseClient) {}

  // Iniciar novo jogo
  async startGame(userId: string, params: IStartGameParams): Promise<IShowDoMilhaoGame> {
    // Buscar questões baseadas nos filtros
    let questions = await this.fetchQuestions(params);
    
    // Filtrar questões não respondidas se solicitado
    if (params.unansweredFilter === 'unanswered_game') {
      // Questões nunca respondidas no Show do Milhão
      const answeredIds = await this.getAnsweredQuestionIdsInGame(userId);
      questions = questions.filter(q => !answeredIds.has(q.id));
    } else if (params.unansweredFilter === 'unanswered_system') {
      // Questões nunca respondidas em todo o sistema
      const answeredIds = await this.getAnsweredQuestionIdsInSystem(userId);
      questions = questions.filter(q => !answeredIds.has(q.id));
    }
    
    if (questions.length < 5) {
      const message = params.unansweredFilter && params.unansweredFilter !== 'all'
        ? 'Não há questões novas suficientes. Você já respondeu a maioria das questões com esses filtros!'
        : 'Não há questões suficientes para iniciar o jogo. Selecione mais filtros.';
      throw new Error(message);
    }

    // Embaralhar e pegar até 30 questões (16 para o jogo + extras para pulos e modo Fatality)
    const shuffled = questions.sort(() => Math.random() - 0.5);
    const selectedQuestions = shuffled.slice(0, Math.min(30, shuffled.length));
    const questionIds = selectedQuestions.map(q => q.id);

    // Criar jogo no banco
    const newGame = {
      user_id: userId,
      filter_ids: params.filterIds || [],
      sub_filter_ids: params.subFilterIds || [],
      institution_ids: params.institutionIds || [],
      question_ids: questionIds,
      status: 'playing',
      current_question_index: 0,
      current_prize_level: 0, // Nível de prêmio atual (não muda quando pula)
      current_prize: 0,
      guaranteed_prize: 0,
      cards_used: false,
      university_used: false,
      skips_remaining: MAX_SKIPS,
      total_correct: 0,
      total_time_seconds: 0,
      answers: [],
      started_at: new Date().toISOString(),
    };

    const { data, error } = await this.supabase
      .from('show_do_milhao_games')
      .insert(newGame)
      .select()
      .single();

    if (error) throw error;

    return this.mapGameFromDb(data);
  }

  // Buscar questões do banco
  private async fetchQuestions(params: IStartGameParams): Promise<any[]> {
    // Se tem filtros específicos, buscar com filtros
    // Se não tem nenhum filtro, buscar todas as questões publicadas
    const hasFilters = 
      (params.subFilterIds && params.subFilterIds.length > 0) ||
      (params.filterIds && params.filterIds.length > 0) ||
      (params.institutionIds && params.institutionIds.length > 0);

    if (!hasFilters) {
      // Sem filtros, buscar todas as questões publicadas (excluindo desatualizadas e anuladas)
      const { data, error } = await this.supabase
        .from('questions')
        .select('id, content, options, correct_answer, explanation, filter_ids, sub_filter_ids')
        .eq('status', 'published')
        .or('is_outdated.is.null,is_outdated.eq.false')
        .or('is_annulled.is.null,is_annulled.eq.false')
        .limit(200);
      
      if (error) throw error;
      return data || [];
    }

    // Com filtros, buscar todas e filtrar em memória para lógica OR entre instituições
    // Excluindo questões desatualizadas e anuladas
    const { data: allQuestions, error } = await this.supabase
      .from('questions')
      .select('id, content, options, correct_answer, explanation, filter_ids, sub_filter_ids')
      .eq('status', 'published')
      .or('is_outdated.is.null,is_outdated.eq.false')
      .or('is_annulled.is.null,is_annulled.eq.false')
      .limit(500);

    if (error) throw error;
    if (!allQuestions) return [];

    // Separar anos dos outros subFilterIds
    const yearSubFilterIds = (params.subFilterIds || []).filter(id => id.startsWith('Ano da Prova_'));
    const otherSubFilterIds = (params.subFilterIds || []).filter(id => !id.startsWith('Ano da Prova_'));

    // Filtrar questões
    const filtered = allQuestions.filter((q: any) => {
      const qFilterIds = q.filter_ids || [];
      const qSubFilterIds = q.sub_filter_ids || [];

      // Filtro por filterIds (especialidades) - OR entre eles
      if (params.filterIds && params.filterIds.length > 0) {
        const hasFilter = params.filterIds.some(id => qFilterIds.includes(id));
        if (!hasFilter) return false;
      }

      // Filtro por subFilterIds (subespecialidades, exceto anos) - OR entre eles
      if (otherSubFilterIds.length > 0) {
        const hasSubFilter = otherSubFilterIds.some(id => qSubFilterIds.includes(id));
        if (!hasSubFilter) return false;
      }

      // Filtro por anos - OR entre eles, AND com outros grupos
      if (yearSubFilterIds.length > 0) {
        const hasYear = yearSubFilterIds.some(id => qSubFilterIds.includes(id));
        if (!hasYear) return false;
      }

      // Filtro por institutionIds (universidades) - OR entre elas
      // As instituições estão em sub_filter_ids com formato "Universidade_Estado_Nome"
      if (params.institutionIds && params.institutionIds.length > 0) {
        const hasInstitution = params.institutionIds.some(instId => 
          qSubFilterIds.some((sfId: string) => sfId.includes(instId) || sfId === instId)
        );
        if (!hasInstitution) return false;
      }

      return true;
    });

    return filtered;
  }

  // Obter jogo atual do usuário
  async getCurrentGame(userId: string): Promise<IShowDoMilhaoGame | null> {
    const { data, error } = await this.supabase
      .from('show_do_milhao_games')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'playing')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return this.mapGameFromDb(data);
  }

  // Obter questão atual com detalhes
  async getCurrentQuestion(gameId: string): Promise<any> {
    const { data: game, error: gameError } = await this.supabase
      .from('show_do_milhao_games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (gameError || !game) throw new Error('Jogo não encontrado');

    const questionIds = game.question_ids as string[];
    const currentIndex = game.current_question_index;

    if (currentIndex >= questionIds.length) {
      throw new Error('Não há mais questões');
    }

    const questionId = questionIds[currentIndex];

    const { data: question, error: questionError } = await this.supabase
      .from('questions')
      .select('id, content, options, explanation, professor_comment, sub_filter_ids')
      .eq('id', questionId)
      .single();

    if (questionError || !question) throw new Error('Questão não encontrada');

    // Extrair instituição e ano dos sub_filter_ids
    const subFilterIds = question.sub_filter_ids || [];
    
    // Buscar instituição (formato: Universidade_Estado_Nome)
    const institutionId = subFilterIds.find((id: string) => 
      id.startsWith('Universidade_') || id.startsWith('Residencia_')
    );
    let institution = null;
    if (institutionId) {
      const parts = institutionId.split('_');
      institution = parts[parts.length - 1]; // Pegar o último segmento (nome da instituição)
    }

    // Buscar ano (formato: Ano da Prova_2024 ou Ano da Prova_2024_2024.1)
    const yearId = subFilterIds.find((id: string) => id.startsWith('Ano da Prova_'));
    let year = null;
    if (yearId) {
      const parts = yearId.split('_');
      // Pegar o ano (segundo segmento ou último se tiver subano)
      year = parts[1]; // Ex: "2024" de "Ano da Prova_2024"
    }

    // Retornar questão SEM a resposta correta
    // Usar current_prize_level para determinar o prêmio (não muda quando pula)
    const prizeLevel = game.current_prize_level ?? currentIndex;
    return {
      id: question.id,
      content: question.content,
      options: question.options,
      professorComment: question.professor_comment || null,
      questionIndex: currentIndex,
      totalQuestions: questionIds.length,
      prizeLevel: PRIZE_LEVELS[prizeLevel] || PRIZE_LEVELS[0],
      currentPrizeLevel: prizeLevel,
      institution,
      year,
      subFilterIds,
    };
  }

  // Responder questão
  async answerQuestion(
    userId: string,
    gameId: string,
    selectedOptionId: string,
    timeSeconds: number
  ): Promise<IAnswerResult> {
    // Buscar jogo
    const { data: game, error: gameError } = await this.supabase
      .from('show_do_milhao_games')
      .select('*')
      .eq('id', gameId)
      .eq('user_id', userId)
      .single();

    if (gameError || !game) throw new Error('Jogo não encontrado');
    if (game.status !== 'playing') throw new Error('Jogo já finalizado');

    const questionIds = game.question_ids as string[];
    const currentIndex = game.current_question_index;
    const questionId = questionIds[currentIndex];

    // Buscar questão para verificar resposta
    const { data: question, error: questionError } = await this.supabase
      .from('questions')
      .select('correct_answer, explanation, options')
      .eq('id', questionId)
      .single();

    if (questionError || !question) throw new Error('Questão não encontrada');

    // Verificar se a resposta está correta
    // O correct_answer pode ser o texto da resposta ou o ID da opção
    // Precisamos verificar ambos os casos
    const selectedOption = question.options?.find((opt: any) => opt.id === selectedOptionId);
    const isCorrect = 
      question.correct_answer === selectedOptionId || // Caso correct_answer seja o ID
      question.correct_answer === selectedOption?.text; // Caso correct_answer seja o texto
    
    // Usar current_prize_level para determinar o prêmio (não é afetado por pulos)
    const prizeLevel = game.current_prize_level ?? 0;
    const currentPrizeLevel = PRIZE_LEVELS[prizeLevel] || PRIZE_LEVELS[0];
    
    // Calcular novo prêmio garantido (checkpoint)
    let newGuaranteedPrize = game.guaranteed_prize;
    if (isCorrect && currentPrizeLevel.checkpoint) {
      newGuaranteedPrize = currentPrizeLevel.prize;
    }

    // Registrar resposta
    const answers = [...(game.answers || []), {
      questionId,
      selectedOptionId,
      isCorrect,
      timeSeconds,
    }];

    let newStatus: 'playing' | 'won' | 'lost' = 'playing';
    let gameOver = false;
    let nextQuestionIndex = currentIndex + 1;
    let nextPrizeLevel = prizeLevel + 1;

    // Calcular total de acertos (incluindo esta resposta se correta)
    const totalCorrect = game.total_correct + (isCorrect ? 1 : 0);
    const totalTime = game.total_time_seconds + timeSeconds;

    if (!isCorrect) {
      // Errou - jogo termina, leva o prêmio garantido (checkpoint)
      newStatus = 'lost';
      gameOver = true;
    } else if (prizeLevel >= 15) {
      // Acertou a pergunta do milhão - ganhou!
      newStatus = 'won';
      gameOver = true;
    }

    // Prêmio atual: se acertou, é o prêmio do nível atual; se errou, é o garantido
    const newPrize = isCorrect ? currentPrizeLevel.prize : game.guaranteed_prize;
    
    // Prêmio final para ranking/stats: o que o jogador realmente leva
    // Se ganhou ou parou: current_prize; Se perdeu: guaranteed_prize
    const finalPrizeForStats = newStatus === 'lost' ? game.guaranteed_prize : newPrize;

    // Atualizar jogo
    const updateData: any = {
      answers,
      total_correct: totalCorrect,
      total_time_seconds: totalTime,
      current_prize: newPrize,
      guaranteed_prize: newGuaranteedPrize,
      updated_at: new Date().toISOString(),
    };

    if (gameOver) {
      updateData.status = newStatus;
      updateData.completed_at = new Date().toISOString();
    } else {
      updateData.current_question_index = nextQuestionIndex;
      updateData.current_prize_level = nextPrizeLevel;
    }

    await this.supabase
      .from('show_do_milhao_games')
      .update(updateData)
      .eq('id', gameId);

    // Se o jogo terminou, atualizar estatísticas e ranking
    if (gameOver && (newStatus === 'won' || newStatus === 'lost')) {
      // Passar o prêmio final correto e o total de acertos
      await this.updateStats(userId, game, newStatus, finalPrizeForStats, totalCorrect);
      await this.updateRanking(userId, gameId, finalPrizeForStats, totalCorrect, totalTime, newStatus, game);
    }

    // Encontrar o ID da opção correta
    // O correct_answer pode ser o texto ou o ID, então precisamos encontrar o ID real
    const correctOption = question.options?.find(
      (opt: any) => opt.id === question.correct_answer || opt.text === question.correct_answer
    );
    const correctOptionId = correctOption?.id || question.correct_answer;

    return {
      isCorrect,
      correctOptionId,
      newPrize,
      guaranteedPrize: newGuaranteedPrize,
      gameOver,
      status: newStatus,
      nextQuestionIndex: gameOver ? undefined : nextQuestionIndex,
    };
  }

  // Parar o jogo (levar prêmio atual)
  async stopGame(userId: string, gameId: string): Promise<{ finalPrize: number }> {
    const { data: game, error } = await this.supabase
      .from('show_do_milhao_games')
      .select('*')
      .eq('id', gameId)
      .eq('user_id', userId)
      .single();

    if (error || !game) throw new Error('Jogo não encontrado');
    if (game.status !== 'playing') throw new Error('Jogo já finalizado');

    const finalPrize = game.current_prize;

    await this.supabase
      .from('show_do_milhao_games')
      .update({
        status: 'stopped',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', gameId);

    await this.updateStats(userId, game, 'stopped', finalPrize, game.total_correct);
    await this.updateRanking(userId, gameId, finalPrize, game.total_correct, game.total_time_seconds, 'stopped', game);

    return { finalPrize };
  }

  // Usar ajuda: Cartas
  async useCards(userId: string, gameId: string): Promise<IUseHelpResult> {
    const { data: game, error } = await this.supabase
      .from('show_do_milhao_games')
      .select('*')
      .eq('id', gameId)
      .eq('user_id', userId)
      .single();

    if (error || !game) throw new Error('Jogo não encontrado');
    if (game.cards_used) throw new Error('Cartas já foram usadas');

    const questionId = game.question_ids[game.current_question_index];
    
    // Buscar questão
    const { data: question } = await this.supabase
      .from('questions')
      .select('options, correct_answer')
      .eq('id', questionId)
      .single();

    if (!question) throw new Error('Questão não encontrada');

    // Sortear quantas alternativas eliminar (1, 2 ou 3)
    const random = Math.random();
    let eliminateCount = random < 0.5 ? 1 : random < 0.85 ? 2 : 3;

    // Pegar alternativas erradas
    // O correct_answer pode ser o texto da resposta ou o ID da opção
    const wrongOptions = question.options
      .filter((opt: any) => opt.id !== question.correct_answer && opt.text !== question.correct_answer)
      .map((opt: any) => opt.id);

    // Embaralhar e pegar as que serão eliminadas
    const shuffledWrong = wrongOptions.sort(() => Math.random() - 0.5);
    const eliminatedOptions = shuffledWrong.slice(0, Math.min(eliminateCount, wrongOptions.length));

    await this.supabase
      .from('show_do_milhao_games')
      .update({ cards_used: true, updated_at: new Date().toISOString() })
      .eq('id', gameId);

    return {
      success: true,
      helpType: 'cards',
      data: { eliminatedOptions },
    };
  }

  // Usar ajuda: Universitários
  async useUniversity(userId: string, gameId: string): Promise<IUseHelpResult> {
    const { data: game, error } = await this.supabase
      .from('show_do_milhao_games')
      .select('*')
      .eq('id', gameId)
      .eq('user_id', userId)
      .single();

    if (error || !game) throw new Error('Jogo não encontrado');
    if (game.university_used) throw new Error('Universitários já foram consultados');

    const questionId = game.question_ids[game.current_question_index];
    
    // Buscar questão
    const { data: question } = await this.supabase
      .from('questions')
      .select('options, correct_answer')
      .eq('id', questionId)
      .single();

    if (!question) throw new Error('Questão não encontrada');

    // O correct_answer pode ser o texto da resposta ou o ID da opção
    const correctIndex = question.options.findIndex(
      (opt: any) => opt.id === question.correct_answer || opt.text === question.correct_answer
    );
    const universityAnswers = this.generateUniversityAnswers(correctIndex);

    await this.supabase
      .from('show_do_milhao_games')
      .update({ university_used: true, updated_at: new Date().toISOString() })
      .eq('id', gameId);

    return {
      success: true,
      helpType: 'university',
      data: { universityAnswers },
    };
  }

  // Gerar respostas dos universitários
  private generateUniversityAnswers(correctIndex: number): IUniversityAnswer[] {
    const students = [
      { id: 1, name: 'Ana' },
      { id: 2, name: 'Carlos' },
      { id: 3, name: 'Marina' },
    ];

    // Probabilidades: 50% 2 acertam, 25% 3 acertam, 15% 1 acerta, 10% 0 acertam
    const random = Math.random();
    let correctCount = random < 0.5 ? 2 : random < 0.75 ? 3 : random < 0.9 ? 1 : 0;

    const wrongOptions = [0, 1, 2, 3].filter(i => i !== correctIndex);
    const shuffledWrong = wrongOptions.sort(() => Math.random() - 0.5);

    return students.map((student, index) => {
      const isCorrect = index < correctCount;
      const selectedOption = isCorrect ? correctIndex : shuffledWrong[index % shuffledWrong.length];
      
      const confidenceRandom = Math.random();
      let confidence: 'alta' | 'media' | 'baixa';
      if (isCorrect) {
        confidence = confidenceRandom < 0.6 ? 'alta' : confidenceRandom < 0.9 ? 'media' : 'baixa';
      } else {
        confidence = confidenceRandom < 0.3 ? 'alta' : confidenceRandom < 0.7 ? 'media' : 'baixa';
      }

      return {
        studentId: student.id,
        studentName: student.name,
        selectedOptionIndex: selectedOption,
        confidence,
      };
    });
  }

  // Usar ajuda: Pular
  async useSkip(userId: string, gameId: string): Promise<IUseHelpResult> {
    const { data: game, error } = await this.supabase
      .from('show_do_milhao_games')
      .select('*')
      .eq('id', gameId)
      .eq('user_id', userId)
      .single();

    if (error || !game) throw new Error('Jogo não encontrado');
    if (game.skips_remaining <= 0) throw new Error('Não há mais pulos disponíveis');

    const questionIds = game.question_ids as string[];
    const newIndex = game.current_question_index + 1;

    if (newIndex >= questionIds.length) {
      throw new Error('Não é possível pular a última questão');
    }

    await this.supabase
      .from('show_do_milhao_games')
      .update({
        skips_remaining: game.skips_remaining - 1,
        current_question_index: newIndex,
        updated_at: new Date().toISOString(),
      })
      .eq('id', gameId);

    return {
      success: true,
      helpType: 'skip',
      data: { newQuestionIndex: newIndex },
    };
  }

  // Atualizar estatísticas
  private async updateStats(
    userId: string,
    game: any,
    status: 'won' | 'lost' | 'stopped',
    finalPrize: number,
    totalCorrect?: number
  ): Promise<void> {
    const { data: stats } = await this.supabase
      .from('show_do_milhao_stats')
      .select('*')
      .eq('user_id', userId)
      .single();

    const today = getTodayBrasilia();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // Calcular o prêmio alcançado (para highest_prize)
    // Se perdeu, calcular baseado no total de acertos
    let prizeReached = finalPrize;
    const correctCount = totalCorrect ?? game.total_correct ?? 0;
    if (status === 'lost' && correctCount > 0) {
      const levelReached = correctCount - 1;
      if (levelReached >= 0 && levelReached < PRIZE_LEVELS.length) {
        prizeReached = PRIZE_LEVELS[levelReached].prize;
      }
    }

    if (stats) {
      const lastPlayedDate = stats.last_played_at ? stats.last_played_at.split('T')[0] : null;
      let newStreak = stats.current_streak;
      
      if (status === 'won') {
        if (lastPlayedDate === yesterdayStr) {
          newStreak = stats.current_streak + 1;
        } else if (lastPlayedDate !== today) {
          newStreak = 1;
        }
      } else {
        newStreak = 0;
      }

      await this.supabase
        .from('show_do_milhao_stats')
        .update({
          total_games: stats.total_games + 1,
          games_won: stats.games_won + (status === 'won' ? 1 : 0),
          games_lost: stats.games_lost + (status === 'lost' ? 1 : 0),
          games_stopped: stats.games_stopped + (status === 'stopped' ? 1 : 0),
          total_prize_accumulated: stats.total_prize_accumulated + finalPrize,
          highest_prize: Math.max(stats.highest_prize, prizeReached), // Usar prêmio alcançado
          times_reached_million: stats.times_reached_million + (prizeReached >= 1000000 ? 1 : 0),
          current_streak: newStreak,
          max_streak: Math.max(stats.max_streak, newStreak),
          total_cards_used: stats.total_cards_used + (game.cards_used ? 1 : 0),
          total_university_used: stats.total_university_used + (game.university_used ? 1 : 0),
          total_skips_used: stats.total_skips_used + (MAX_SKIPS - game.skips_remaining),
          last_played_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);
    } else {
      await this.supabase
        .from('show_do_milhao_stats')
        .insert({
          user_id: userId,
          total_games: 1,
          games_won: status === 'won' ? 1 : 0,
          games_lost: status === 'lost' ? 1 : 0,
          games_stopped: status === 'stopped' ? 1 : 0,
          total_prize_accumulated: finalPrize,
          highest_prize: prizeReached, // Usar prêmio alcançado
          times_reached_million: prizeReached >= 1000000 ? 1 : 0,
          current_streak: status === 'won' ? 1 : 0,
          max_streak: status === 'won' ? 1 : 0,
          total_cards_used: game.cards_used ? 1 : 0,
          total_university_used: game.university_used ? 1 : 0,
          total_skips_used: MAX_SKIPS - game.skips_remaining,
          last_played_at: new Date().toISOString(),
        });
    }
  }

  // Atualizar ranking diário
  private async updateRanking(
    userId: string,
    gameId: string,
    finalPrize: number,
    questionsCorrect: number,
    totalTimeSeconds: number,
    status: string,
    game: any
  ): Promise<void> {
    const today = getTodayBrasilia();
    
    // Calcular ajudas usadas
    const skipsUsed = MAX_SKIPS - (game.skips_remaining || 0);
    const helpsUsed = (game.cards_used ? 1 : 0) + (game.university_used ? 1 : 0) + skipsUsed;

    // Calcular o prêmio alcançado (não o que levou)
    let prizeReached = finalPrize;
    if (status === 'lost' && questionsCorrect > 0) {
      const levelReached = questionsCorrect - 1;
      if (levelReached >= 0 && levelReached < PRIZE_LEVELS.length) {
        prizeReached = PRIZE_LEVELS[levelReached].prize;
      }
    }

    // Verificar se já tem entrada hoje
    const { data: existing } = await this.supabase
      .from('show_do_milhao_daily_ranking')
      .select('id, final_prize')
      .eq('user_id', userId)
      .eq('date', today)
      .single();

    const rankingData = {
      game_id: gameId,
      final_prize: prizeReached, // Usar prêmio alcançado
      questions_correct: questionsCorrect,
      total_time_seconds: totalTimeSeconds,
      status,
      helps_used: helpsUsed,
      cards_used: game.cards_used || false,
      university_used: game.university_used || false,
      skips_used: skipsUsed,
    };

    if (existing) {
      // Só atualiza se o novo resultado for melhor (maior prêmio)
      if (prizeReached > existing.final_prize) {
        await this.supabase
          .from('show_do_milhao_daily_ranking')
          .update(rankingData)
          .eq('id', existing.id);
      }
    } else {
      await this.supabase
        .from('show_do_milhao_daily_ranking')
        .insert({
          user_id: userId,
          date: today,
          ...rankingData,
        });
    }

    // Se ganhou o milhão, adicionar ao ranking mensal de milionários
    if (prizeReached >= 1000000) {
      await this.addToMonthlyMillionaires(userId, gameId, questionsCorrect, totalTimeSeconds, game);
    }
  }

  // Adicionar ao ranking mensal de milionários (apenas uma entrada por usuário por mês - a melhor)
  private async addToMonthlyMillionaires(
    userId: string,
    gameId: string,
    questionsCorrect: number,
    totalTimeSeconds: number,
    game: any
  ): Promise<void> {
    const yearMonth = this.getCurrentYearMonth();
    const skipsUsed = MAX_SKIPS - (game.skips_remaining || 0);
    const helpsUsed = (game.cards_used ? 1 : 0) + (game.university_used ? 1 : 0) + skipsUsed;

    // Verificar se já existe entrada para este usuário neste mês
    const { data: existing } = await this.supabase
      .from('show_do_milhao_monthly_millionaires')
      .select('id, helps_used, total_time_seconds')
      .eq('user_id', userId)
      .eq('year_month', yearMonth)
      .single();

    if (existing) {
      // Só atualiza se o novo resultado for melhor (menos ajudas, ou mesmo ajudas mas menos tempo)
      const isBetter = helpsUsed < existing.helps_used || 
        (helpsUsed === existing.helps_used && totalTimeSeconds < existing.total_time_seconds);
      
      if (isBetter) {
        await this.supabase
          .from('show_do_milhao_monthly_millionaires')
          .update({
            game_id: gameId,
            questions_correct: questionsCorrect,
            total_time_seconds: totalTimeSeconds,
            helps_used: helpsUsed,
            cards_used: game.cards_used || false,
            university_used: game.university_used || false,
            skips_used: skipsUsed,
            completed_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      }
    } else {
      await this.supabase
        .from('show_do_milhao_monthly_millionaires')
        .insert({
          user_id: userId,
          game_id: gameId,
          year_month: yearMonth,
          final_prize: 1000000,
          questions_correct: questionsCorrect,
          total_time_seconds: totalTimeSeconds,
          helps_used: helpsUsed,
          cards_used: game.cards_used || false,
          university_used: game.university_used || false,
          skips_used: skipsUsed,
          completed_at: new Date().toISOString(),
        });
    }
  }

  // Obter estatísticas do usuário
  async getStats(userId: string): Promise<IShowDoMilhaoStats | null> {
    const { data } = await this.supabase
      .from('show_do_milhao_stats')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!data) return null;

    return {
      userId: data.user_id,
      totalGames: data.total_games,
      gamesPlayed: data.total_games, // Alias para frontend
      gamesWon: data.games_won,
      wins: data.games_won, // Alias para frontend
      gamesLost: data.games_lost,
      gamesStopped: data.games_stopped,
      totalPrizeAccumulated: data.total_prize_accumulated,
      highestPrize: data.highest_prize,
      timesReachedMillion: data.times_reached_million,
      millionWins: data.times_reached_million, // Alias para frontend
      currentStreak: data.current_streak,
      maxStreak: data.max_streak,
      totalCardsUsed: data.total_cards_used,
      totalUniversityUsed: data.total_university_used,
      totalSkipsUsed: data.total_skips_used,
      averageQuestionsCorrect: data.average_questions_correct,
      bestTimeSeconds: data.best_time_seconds,
      lastPlayedAt: data.last_played_at ? new Date(data.last_played_at) : undefined,
    };
  }

  // Obter histórico de jogos do usuário (para ranking individual)
  async getUserGameHistory(userId: string, limit: number = 50): Promise<{ history: any[] }> {
    const { data: games, error } = await this.supabase
      .from('show_do_milhao_games')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['won', 'lost', 'stopped'])
      .order('completed_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    const history = (games || []).map((game) => {
      const totalQuestions = Math.min((game.question_ids || []).length, 16);
      
      // Calcular o prêmio baseado no nível alcançado
      // Se ganhou ou parou: current_prize
      // Se perdeu: calcular baseado no total_correct (prêmio que teria se não tivesse errado)
      let prize = game.current_prize;
      if (game.status === 'lost' && game.total_correct > 0) {
        // Pegar o prêmio do nível anterior ao que errou (o que ele alcançou)
        const levelReached = game.total_correct - 1;
        if (levelReached >= 0 && levelReached < PRIZE_LEVELS.length) {
          prize = PRIZE_LEVELS[levelReached].prize;
        }
      }
      
      // Prêmio que realmente levou (checkpoint)
      const prizeTaken = game.guaranteed_prize || 0;
      
      return {
        id: game.id,
        prize: prize, // Prêmio alcançado
        prizeTaken: prizeTaken, // Prêmio que levou (checkpoint)
        correctAnswers: game.total_correct,
        totalQuestions: totalQuestions,
        timeSpent: game.total_time_seconds,
        multiplier: game.fatality_multiplier || 1,
        status: game.status,
        createdAt: game.completed_at || game.created_at,
      };
    });

    return { history };
  }

  // Obter ranking diário
  async getDailyRanking(limit: number = 10): Promise<{ ranking: IRankingEntry[]; stats: any }> {
    const today = getTodayBrasilia();

    // Buscar ranking ordenado por: prêmio DESC, questões corretas DESC, ajudas usadas ASC
    const { data: rankings, error } = await this.supabase
      .from('show_do_milhao_daily_ranking')
      .select('*')
      .eq('date', today)
      .order('final_prize', { ascending: false })
      .order('questions_correct', { ascending: false })
      .order('helps_used', { ascending: true })
      .limit(limit);

    if (error) throw error;

    // Buscar dados dos usuários
    const userIds = (rankings || []).map(r => r.user_id);
    const { data: users } = await this.supabase
      .from('users')
      .select('id, display_name, photo_url')
      .in('id', userIds);

    const usersMap = new Map((users || []).map(u => [u.id, u]));

    const ranking: IRankingEntry[] = (rankings || []).map((r, index) => {
      const user = usersMap.get(r.user_id);
      return {
        id: r.id,
        position: index + 1,
        userId: r.user_id,
        userName: user?.display_name || 'Jogador Anônimo',
        displayName: user?.display_name || 'Jogador Anônimo',
        avatarUrl: user?.photo_url,
        photoUrl: user?.photo_url,
        prize: r.final_prize,
        finalPrize: r.final_prize,
        correctAnswers: r.questions_correct,
        questionsCorrect: r.questions_correct,
        totalQuestions: 16,
        timeSpent: r.total_time_seconds,
        totalTimeSeconds: r.total_time_seconds,
        multiplier: r.fatality_multiplier || 1,
        status: r.status,
        score: r.score,
        helpsUsed: r.helps_used || 0,
        cardsUsed: r.cards_used || false,
        universityUsed: r.university_used || false,
        skipsUsed: r.skips_used || 0,
      };
    });

    // Estatísticas do dia
    const totalPlayers = rankings?.length || 0;
    const winners = rankings?.filter(r => r.status === 'won').length || 0;
    const millionaires = rankings?.filter(r => r.final_prize >= 1000000).length || 0;

    return {
      ranking,
      stats: {
        totalPlayers,
        winners,
        millionaires,
        date: today,
      },
    };
  }

  // Obter ranking mensal de milionários
  async getMonthlyMillionaires(yearMonth?: string, limit: number = 50): Promise<{ ranking: any[]; stats: any }> {
    // Se não passar yearMonth, usa o mês atual
    const targetMonth = yearMonth || this.getCurrentYearMonth();

    // Buscar milionários do mês ordenados por: ajudas usadas ASC, tempo ASC
    const { data: millionaires, error } = await this.supabase
      .from('show_do_milhao_monthly_millionaires')
      .select('*')
      .eq('year_month', targetMonth)
      .order('helps_used', { ascending: true })
      .order('total_time_seconds', { ascending: true })
      .limit(limit);

    if (error) throw error;

    // Buscar dados dos usuários
    const userIds = (millionaires || []).map(r => r.user_id);
    const { data: users } = await this.supabase
      .from('users')
      .select('id, display_name, photo_url')
      .in('id', userIds);

    const usersMap = new Map((users || []).map(u => [u.id, u]));

    // Calcular posições com empates
    let currentPosition = 1;
    let lastHelpsUsed = -1;
    
    const ranking = (millionaires || []).map((r, index) => {
      const user = usersMap.get(r.user_id);
      
      // Se ajudas usadas mudou, atualiza posição
      if (r.helps_used !== lastHelpsUsed) {
        currentPosition = index + 1;
        lastHelpsUsed = r.helps_used;
      }
      
      return {
        id: r.id,
        position: currentPosition,
        userId: r.user_id,
        userName: user?.display_name || 'Jogador Anônimo',
        displayName: user?.display_name || 'Jogador Anônimo',
        avatarUrl: user?.photo_url,
        photoUrl: user?.photo_url,
        questionsCorrect: r.questions_correct,
        timeSpent: r.total_time_seconds,
        totalTimeSeconds: r.total_time_seconds,
        helpsUsed: r.helps_used,
        cardsUsed: r.cards_used,
        universityUsed: r.university_used,
        skipsUsed: r.skips_used,
        multiplier: r.fatality_multiplier || 1,
        completedAt: r.completed_at,
        achievedAt: r.completed_at,
      };
    });

    return {
      ranking,
      stats: {
        totalMillionaires: millionaires?.length || 0,
        yearMonth: targetMonth,
      },
    };
  }

  // Obter ranking do modo Fatality
  async getFatalityRanking(limit: number = 10): Promise<{ ranking: any[]; stats: any }> {
    const today = getTodayBrasilia();

    // Buscar ranking ordenado por multiplicador DESC
    const { data: rankings, error } = await this.supabase
      .from('show_do_milhao_fatality_ranking')
      .select('*')
      .eq('date', today)
      .order('multiplier', { ascending: false })
      .order('questions_correct', { ascending: false })
      .limit(limit);

    if (error) throw error;

    // Buscar dados dos usuários
    const userIds = (rankings || []).map(r => r.user_id);
    const { data: users } = await this.supabase
      .from('users')
      .select('id, display_name, photo_url')
      .in('id', userIds);

    const usersMap = new Map((users || []).map(u => [u.id, u]));

    const ranking = (rankings || []).map((r, index) => {
      const user = usersMap.get(r.user_id);
      return {
        id: r.id,
        position: index + 1,
        userId: r.user_id,
        userName: user?.display_name || 'Jogador Anônimo',
        displayName: user?.display_name || 'Jogador Anônimo',
        avatarUrl: user?.photo_url,
        photoUrl: user?.photo_url,
        multiplier: r.multiplier,
        correctAnswers: r.questions_correct,
        questionsCorrect: r.questions_correct,
        totalQuestions: 16,
        timeSpent: r.total_time_seconds,
        totalTimeSeconds: r.total_time_seconds,
      };
    });

    // Estatísticas
    const totalPlayers = rankings?.length || 0;
    const highestMultiplier = rankings?.[0]?.multiplier || 0;

    return {
      ranking,
      stats: {
        totalPlayers,
        highestMultiplier,
        date: today,
      },
    };
  }

  // Obter ranking geral (all-time) - baseado nas estatísticas dos usuários
  async getAllTimeRanking(limit: number = 50): Promise<{ ranking: any[]; stats: any }> {
    // Buscar estatísticas ordenadas por: maior prêmio DESC, vezes no milhão DESC, vitórias DESC
    const { data: statsData, error } = await this.supabase
      .from('show_do_milhao_stats')
      .select('*')
      .gt('total_games', 0)
      .order('highest_prize', { ascending: false })
      .order('times_reached_million', { ascending: false })
      .order('games_won', { ascending: false })
      .limit(limit);

    if (error) throw error;

    // Buscar dados dos usuários
    const userIds = (statsData || []).map(r => r.user_id);
    const { data: users } = await this.supabase
      .from('users')
      .select('id, display_name, photo_url')
      .in('id', userIds);

    const usersMap = new Map((users || []).map(u => [u.id, u]));

    const ranking = (statsData || []).map((r, index) => {
      const user = usersMap.get(r.user_id);
      return {
        id: r.user_id,
        position: index + 1,
        userId: r.user_id,
        userName: user?.display_name || 'Jogador Anônimo',
        displayName: user?.display_name || 'Jogador Anônimo',
        avatarUrl: user?.photo_url,
        photoUrl: user?.photo_url,
        prize: r.highest_prize,
        finalPrize: r.highest_prize,
        highestPrize: r.highest_prize,
        correctAnswers: 16, // Se chegou ao milhão, acertou todas
        questionsCorrect: 16,
        totalQuestions: 16,
        timeSpent: r.best_time_seconds || 0,
        totalTimeSeconds: r.best_time_seconds || 0,
        multiplier: 1,
        timesReachedMillion: r.times_reached_million,
        totalGames: r.total_games,
        gamesWon: r.games_won,
        totalPrizeAccumulated: r.total_prize_accumulated,
        currentStreak: r.current_streak,
        maxStreak: r.max_streak,
      };
    });

    // Estatísticas gerais
    const totalPlayers = statsData?.length || 0;
    const totalMillionaires = statsData?.filter(r => r.times_reached_million > 0).length || 0;

    return {
      ranking,
      stats: {
        totalPlayers,
        totalMillionaires,
      },
    };
  }

  // Helper para obter ano-mês atual
  private getCurrentYearMonth(): string {
    const now = new Date();
    const brasiliaDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const year = brasiliaDate.getFullYear();
    const month = String(brasiliaDate.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  // Obter IDs de questões já REALMENTE respondidas no Show do Milhão
  // Usa o array 'answers' ao invés de 'question_ids' porque question_ids inclui
  // questões que o usuário não chegou a ver (ex: errou na questão 4, não viu da 5 em diante)
  private async getAnsweredQuestionIdsInGame(userId: string): Promise<Set<string>> {
    const { data, error } = await this.supabase
      .from('show_do_milhao_games')
      .select('answers')
      .eq('user_id', userId);

    if (error) throw error;

    const allQuestionIds = new Set<string>();
    (data || []).forEach(game => {
      const answers = game.answers || [];
      answers.forEach((answer: any) => {
        if (answer.questionId) allQuestionIds.add(answer.questionId);
      });
    });

    return allQuestionIds;
  }

  // Obter IDs de questões já respondidas em todo o sistema
  // Inclui question_responses + questões respondidas no Show do Milhão
  private async getAnsweredQuestionIdsInSystem(userId: string): Promise<Set<string>> {
    const answeredIds = new Set<string>();

    // 1. Buscar da tabela question_responses (simulados, banco de questões, etc.)
    const { data: responses, error: responsesError } = await this.supabase
      .from('question_responses')
      .select('question_id')
      .eq('user_id', userId);

    if (!responsesError) {
      (responses || []).forEach(r => {
        if (r.question_id) answeredIds.add(r.question_id);
      });
    }

    // 2. Também buscar do Show do Milhão (que não salva em question_responses)
    const { data: showGames, error: showError } = await this.supabase
      .from('show_do_milhao_games')
      .select('answers')
      .eq('user_id', userId);

    if (!showError) {
      (showGames || []).forEach(game => {
        const answers = game.answers || [];
        answers.forEach((answer: any) => {
          if (answer.questionId) answeredIds.add(answer.questionId);
        });
      });
    }

    return answeredIds;
  }

  private mapGameFromDb(data: any): IShowDoMilhaoGame {
    return {
      id: data.id,
      userId: data.user_id,
      filterIds: data.filter_ids || [],
      subFilterIds: data.sub_filter_ids || [],
      institutionIds: data.institution_ids || [],
      status: data.status,
      currentQuestionIndex: data.current_question_index,
      currentPrize: data.current_prize,
      guaranteedPrize: data.guaranteed_prize,
      questionIds: data.question_ids || [],
      answers: data.answers || [],
      cardsUsed: data.cards_used,
      universityUsed: data.university_used,
      skipsRemaining: data.skips_remaining,
      totalCorrect: data.total_correct,
      totalTimeSeconds: data.total_time_seconds,
      startedAt: new Date(data.started_at),
      completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
    };
  }
}
