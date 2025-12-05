import { SupabaseClient } from '@supabase/supabase-js';
import { MedicalWord, MEDICAL_WORDS } from '../data/words';
import { IMedTermoooGame, IMedTermoooStats, IGuessResult, LetterResult } from '../interfaces/IMedTermooo';
import * as fs from 'fs';
import * as path from 'path';

const MAX_ATTEMPTS = 6;

// Helper para obter data de hoje no horário de Brasília
const getTodayBrasilia = (): string => {
  const now = new Date();
  const brasiliaDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  return brasiliaDate.toISOString().split('T')[0];
};

// Carregar lista de palavras brasileiras (96k palavras de 5-8 letras)
let brazilianWords: Set<string> | null = null;

function loadBrazilianWords(): Set<string> {
  if (brazilianWords) return brazilianWords;
  
  try {
    const filePath = path.join(__dirname, '../data/palavras-br.txt');
    const content = fs.readFileSync(filePath, 'utf-8');
    brazilianWords = new Set(content.split('\n').map(w => w.trim().toUpperCase()).filter(w => w.length > 0));
    console.log(`[MedTermooo] Carregadas ${brazilianWords.size} palavras brasileiras`);
  } catch (error) {
    console.error('[MedTermooo] Erro ao carregar palavras:', error);
    brazilianWords = new Set();
  }
  
  return brazilianWords;
}

// Validar palavra usando lista local de palavras brasileiras
function isValidPortugueseWord(word: string): boolean {
  const normalizedWord = word.toUpperCase().trim();
  const words = loadBrazilianWords();
  
  // Verificar se é um termo médico da nossa lista (sempre válido)
  if (MEDICAL_WORDS.some(w => w.word.toUpperCase() === normalizedWord)) {
    return true;
  }
  
  // Verificar na lista de palavras brasileiras
  return words.has(normalizedWord);
}

export class MedTermoooService {
  constructor(private supabase: SupabaseClient) { }

  // Obter palavra do dia do banco de dados
  async getTodayWord(): Promise<MedicalWord & { date: string; length: number }> {
    const today = getTodayBrasilia();

    const { data: dailyWord, error } = await this.supabase
      .from('med_termooo_daily_words')
      .select('*')
      .eq('date', today)
      .single();

    if (error || !dailyWord) {
      throw new Error('Palavra do dia não disponível. Tente novamente mais tarde.');
    }

    return {
      word: dailyWord.word,
      hint: dailyWord.hint,
      category: dailyWord.category,
      date: dailyWord.date,
      length: dailyWord.length,
    };
  }

  // Verificar se usuário já jogou hoje
  async canPlayToday(userId: string): Promise<{ canPlay: boolean; game?: IMedTermoooGame }> {
    const today = getTodayBrasilia();

    const { data: existingGame } = await this.supabase
      .from('med_termooo_games')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single();

    if (existingGame) {
      return {
        canPlay: !existingGame.is_completed,
        game: this.mapGameFromDb(existingGame),
      };
    }

    return { canPlay: true };
  }

  // Iniciar ou continuar jogo
  async startGame(userId: string): Promise<IMedTermoooGame> {
    const today = getTodayBrasilia();

    // Verificar se já existe jogo hoje
    const { data: existingGame, error: selectError } = await this.supabase
      .from('med_termooo_games')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle();

    if (existingGame) {
      return this.mapGameFromDb(existingGame);
    }

    // Buscar palavra do dia do banco
    const dailyWord = await this.getTodayWord();

    // Criar novo jogo
    const newGame = {
      user_id: userId,
      word: dailyWord.word.toUpperCase(),
      word_length: dailyWord.length,
      guesses: [],
      is_completed: false,
      is_won: false,
      attempts: 0,
      date: today,
    };

    const { data, error } = await this.supabase
      .from('med_termooo_games')
      .insert(newGame)
      .select()
      .single();

    // Se der erro de duplicata, buscar o jogo existente
    if (error?.code === '23505') {
      const { data: game } = await this.supabase
        .from('med_termooo_games')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .single();
      
      if (game) return this.mapGameFromDb(game);
    }

    if (error) throw error;
    return this.mapGameFromDb(data);
  }

  // Fazer um palpite
  async makeGuess(userId: string, guess: string): Promise<IGuessResult> {
    const normalizedGuess = guess.toUpperCase().trim();

    // Buscar jogo atual
    const today = getTodayBrasilia();
    const { data: game, error } = await this.supabase
      .from('med_termooo_games')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single();

    if (error || !game) {
      throw new Error('Jogo não encontrado. Inicie um novo jogo.');
    }

    const wordLength = game.word.length;

    // Validações
    if (normalizedGuess.length !== wordLength) {
      throw new Error(`A palavra deve ter ${wordLength} letras`);
    }

    if (game.is_completed) {
      throw new Error('Jogo já finalizado. Volte amanhã!');
    }

    // Validar se é uma palavra válida em português
    const isValidWord = isValidPortugueseWord(normalizedGuess);
    if (!isValidWord) {
      throw new Error('Palavra não encontrada no dicionário');
    }

    const targetWord = game.word.toUpperCase();
    const result = this.evaluateGuess(normalizedGuess, targetWord);
    const isCorrect = normalizedGuess === targetWord;
    const newGuesses = [...(game.guesses || []), normalizedGuess];
    const gameOver = isCorrect || newGuesses.length >= MAX_ATTEMPTS;

    // Atualizar jogo
    const updateData = {
      guesses: newGuesses,
      attempts: newGuesses.length,
      is_completed: gameOver,
      is_won: isCorrect,
      completed_at: gameOver ? new Date().toISOString() : null,
    };

    await this.supabase
      .from('med_termooo_games')
      .update(updateData)
      .eq('id', game.id);

    // Atualizar estatísticas se o jogo terminou
    if (gameOver) {
      await this.updateStats(userId, isCorrect, newGuesses.length);
    }

    return {
      guess: normalizedGuess,
      result,
      isCorrect,
      gameOver,
      attemptsLeft: MAX_ATTEMPTS - newGuesses.length,
      // Retornar a palavra apenas quando o jogo termina
      ...(gameOver && { targetWord: targetWord }),
    };
  }

  // Avaliar palpite
  private evaluateGuess(guess: string, target: string): LetterResult[] {
    const result: LetterResult[] = [];
    const targetLetters = target.split('');
    const guessLetters = guess.split('');
    const usedIndices: Set<number> = new Set();

    // Primeiro passo: marcar letras corretas
    for (let i = 0; i < guessLetters.length; i++) {
      if (guessLetters[i] === targetLetters[i]) {
        result[i] = { letter: guessLetters[i], state: 'correct' };
        usedIndices.add(i);
      }
    }

    // Segundo passo: marcar letras presentes
    for (let i = 0; i < guessLetters.length; i++) {
      if (result[i]) continue;

      const letter = guessLetters[i];
      let found = false;

      for (let j = 0; j < targetLetters.length; j++) {
        if (!usedIndices.has(j) && targetLetters[j] === letter) {
          result[i] = { letter, state: 'present' };
          usedIndices.add(j);
          found = true;
          break;
        }
      }

      if (!found) {
        result[i] = { letter, state: 'absent' };
      }
    }

    return result;
  }

  // Atualizar estatísticas do usuário
  private async updateStats(userId: string, won: boolean, attempts: number): Promise<void> {
    const { data: stats } = await this.supabase
      .from('med_termooo_stats')
      .select('*')
      .eq('user_id', userId)
      .single();

    const today = getTodayBrasilia();
    // Calcular ontem no horário de Brasília
    const now = new Date();
    const brasiliaYesterday = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    brasiliaYesterday.setDate(brasiliaYesterday.getDate() - 1);
    const yesterday = brasiliaYesterday.toISOString().split('T')[0];

    if (stats) {
      const currentStreak = stats.last_played_date === yesterday
        ? (won ? stats.current_streak + 1 : 0)
        : (won ? 1 : 0);

      const guessDistribution = stats.guess_distribution || {};
      if (won) {
        guessDistribution[attempts] = (guessDistribution[attempts] || 0) + 1;
      }

      await this.supabase
        .from('med_termooo_stats')
        .update({
          total_games: stats.total_games + 1,
          wins: stats.wins + (won ? 1 : 0),
          current_streak: currentStreak,
          max_streak: Math.max(stats.max_streak, currentStreak),
          guess_distribution: guessDistribution,
          last_played_date: today,
        })
        .eq('user_id', userId);
    } else {
      const guessDistribution: Record<number, number> = {};
      if (won) {
        guessDistribution[attempts] = 1;
      }

      await this.supabase
        .from('med_termooo_stats')
        .insert({
          user_id: userId,
          total_games: 1,
          wins: won ? 1 : 0,
          current_streak: won ? 1 : 0,
          max_streak: won ? 1 : 0,
          guess_distribution: guessDistribution,
          last_played_date: today,
        });
    }
  }

  // Obter estatísticas do usuário
  async getStats(userId: string): Promise<IMedTermoooStats | null> {
    const { data } = await this.supabase
      .from('med_termooo_stats')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!data) return null;

    return {
      userId: data.user_id,
      totalGames: data.total_games,
      wins: data.wins,
      currentStreak: data.current_streak,
      maxStreak: data.max_streak,
      guessDistribution: data.guess_distribution || {},
      lastPlayedDate: data.last_played_date,
    };
  }

  // Obter estatísticas do dia
  async getDailyStats(): Promise<{
    totalPlayers: number;
    totalWinners: number;
    bestTime: number | null;
    averageAttempts: number;
  }> {
    const today = getTodayBrasilia();

    // Buscar todos os jogos do dia
    const { data: allGames, error: allError } = await this.supabase
      .from('med_termooo_games')
      .select('id, attempts, is_won, is_completed, created_at, completed_at')
      .eq('date', today);

    if (allError || !allGames) {
      return { totalPlayers: 0, totalWinners: 0, bestTime: null, averageAttempts: 0 };
    }

    const completedGames = allGames.filter(g => g.is_completed);
    const winners = completedGames.filter(g => g.is_won);

    // Calcular melhor tempo entre vencedores
    let bestTime: number | null = null;
    winners.forEach(game => {
      if (game.completed_at && game.created_at) {
        const time = Math.floor((new Date(game.completed_at).getTime() - new Date(game.created_at).getTime()) / 1000);
        if (bestTime === null || time < bestTime) {
          bestTime = time;
        }
      }
    });

    // Calcular média de tentativas dos vencedores
    const averageAttempts = winners.length > 0
      ? winners.reduce((sum, g) => sum + g.attempts, 0) / winners.length
      : 0;

    return {
      totalPlayers: allGames.length,
      totalWinners: winners.length,
      bestTime,
      averageAttempts: Math.round(averageAttempts * 10) / 10,
    };
  }

  // Obter ranking diário (top 10 vencedores do dia)
  async getDailyRanking(): Promise<{ stats: any; ranking: any[] }> {
    const today = getTodayBrasilia();

    // Buscar estatísticas
    const stats = await this.getDailyStats();

    // Buscar jogos vencedores do dia
    const { data: games, error } = await this.supabase
      .from('med_termooo_games')
      .select('id, user_id, attempts, created_at, completed_at')
      .eq('date', today)
      .eq('is_won', true)
      .eq('is_completed', true)
      .order('attempts', { ascending: true })
      .order('completed_at', { ascending: true })
      .limit(10);

    if (error) {
      console.error('Erro ao buscar ranking:', error);
      return { stats, ranking: [] };
    }

    // Buscar dados dos usuários separadamente
    const userIds = (games || []).map(g => g.user_id);
    const { data: users } = await this.supabase
      .from('users')
      .select('id, display_name, photo_url')
      .in('id', userIds);

    const usersMap = new Map((users || []).map(u => [u.id, u]));

    const ranking = (games || []).map((game: any, index: number) => {
      const user = usersMap.get(game.user_id);
      const completedAt = game.completed_at ? new Date(game.completed_at) : null;
      const createdAt = new Date(game.created_at);
      const timeInSeconds = completedAt
        ? Math.floor((completedAt.getTime() - createdAt.getTime()) / 1000)
        : 0;

      return {
        position: index + 1,
        userId: game.user_id,
        displayName: user?.display_name || 'Jogador Anônimo',
        photoUrl: user?.photo_url || null,
        attempts: game.attempts,
        timeInSeconds,
        completedAt: game.completed_at,
      };
    });

    return { stats, ranking };
  }

  private mapGameFromDb(data: any): IMedTermoooGame {
    const targetWord = data.word.toUpperCase();
    const guesses = data.guesses || [];
    
    // Calcular os resultados de cada tentativa para o frontend poder mostrar as cores
    const guessResults = guesses.map((guess: string) => 
      this.evaluateGuess(guess.toUpperCase(), targetWord)
    );

    return {
      id: data.id,
      userId: data.user_id,
      word: data.is_completed ? data.word : undefined, // Só retorna a palavra se o jogo terminou
      wordLength: data.word_length,
      guesses,
      guessResults, // Resultados de cada tentativa
      isCompleted: data.is_completed,
      isWon: data.is_won,
      attempts: data.attempts,
      date: data.date,
      createdAt: new Date(data.created_at),
      completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
    };
  }
}
