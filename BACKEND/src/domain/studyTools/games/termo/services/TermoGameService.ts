import { ITermoGameService, ITermoGameState, ITermoGuessResult, ITermoUserStats, ITermoRanking, ITermoDailyWord } from '../interfaces/ITermoGame';
import { TermoGameRepository } from '../repositories/TermoGameRepository';
import { TermoDailyWordRepository } from '../repositories/TermoDailyWordRepository';
import { SupabaseClient } from '@supabase/supabase-js';

const DAILY_ATTEMPT_LIMIT = 6;

export class TermoGameService implements ITermoGameService {
  private gameRepository: TermoGameRepository;
  private dailyWordRepository: TermoDailyWordRepository;

  constructor(supabase: SupabaseClient) {
    this.gameRepository = new TermoGameRepository(supabase);
    this.dailyWordRepository = new TermoDailyWordRepository(supabase);
  }

  async startGame(userId: string): Promise<ITermoGameState> {
    const today = new Date().toISOString().split('T')[0];
    
    // Verificar se já existe um jogo para hoje
    const existingGame = await this.gameRepository.getGameByUserAndDate(userId, today);
    if (existingGame) {
      return existingGame;
    }

    // Obter a palavra do dia
    const todayWord = await this.dailyWordRepository.generateTodayWordIfNotExists();
    
    // Criar novo jogo (apenas 3 tentativas no total, sem rodadas)
    const gameState: Omit<ITermoGameState, 'id' | 'createdAt' | 'updatedAt'> = {
      userId,
      word: todayWord.word,
      wordLength: todayWord.word.length,
      guesses: [],
      isCompleted: false,
      isWon: false,
      attemptsUsed: 0,
      maxAttempts: DAILY_ATTEMPT_LIMIT,
      // Mantidos por compatibilidade, mas não utilizados
      currentRound: 1,
      maxRounds: 1,
      roundsUsed: 0,
      startTime: new Date(),
      date: today
    };

    // Em caso de condição de corrida (duplicado), retornar o jogo existente
    try {
      return await this.gameRepository.createGame(gameState);
    } catch (err: any) {
      const code = err?.code;
      const message = String(err?.message || '');
      if (code === '23505' || message.toLowerCase().includes('duplicate key')) {
        const already = await this.gameRepository.getGameByUserAndDate(userId, today);
        if (already) return already;
      }
      throw err;
    }
  }

  async makeGuess(userId: string, guess: string): Promise<ITermoGuessResult> {
    const today = new Date().toISOString().split('T')[0];
    const game = await this.gameRepository.getGameByUserAndDate(userId, today);
    
    if (!game) {
      throw new Error('Nenhum jogo encontrado para hoje');
    }

    // Bloquear imediatamente se já atingiu o limite diário (compatível com jogos antigos com maxAttempts > 3)
    if (game.isCompleted || game.attemptsUsed >= DAILY_ATTEMPT_LIMIT) {
      throw new Error('Jogo já finalizado');
    }

    // Validar o palpite
    const normalizedGuess = guess.toLowerCase().trim();
    if (normalizedGuess.length !== game.wordLength) {
      throw new Error(`Palavra deve ter ${game.wordLength} letras`);
    }

    // Calcular resultado
    const result = this.calculateGuessResult(normalizedGuess, game.word);
    const isWon = normalizedGuess === game.word;
    const newAttemptsUsed = game.attemptsUsed + 1;

    // Jogo completa ao acertar OU ao atingir o limite diário
    const gameCompleted = isWon || newAttemptsUsed >= DAILY_ATTEMPT_LIMIT;

    // Atualizar jogo
    const updatedGuesses = [...game.guesses, normalizedGuess];

    const updates: Partial<ITermoGameState> = {
      guesses: updatedGuesses,
      attemptsUsed: newAttemptsUsed,
      isCompleted: gameCompleted,
      isWon,
      // normalizar campos de rodada para valores neutros
      currentRound: 1,
      roundsUsed: 0,
      maxAttempts: DAILY_ATTEMPT_LIMIT,
      maxRounds: 1
    } as any;

    if (gameCompleted) {
      updates.endTime = new Date();
      updates.totalTime = game.startTime ? Math.floor((updates.endTime.getTime() - game.startTime.getTime()) / 1000) : 0;
    }

    await this.gameRepository.updateGame(game.id, updates);

    // Atualizar estatísticas do usuário
    if (gameCompleted) {
      const gameWithUpdates = { ...game, ...updates };
      await this.updateUserStatsAfterGame(userId, gameWithUpdates);
      
      // Adicionar ao ranking se ganhou
      if (isWon) {
        await this.gameRepository.addToRanking({
          userId,
          userName: '', // TODO: buscar nome do usuário
          attemptsUsed: newAttemptsUsed,
          totalTime: updates.totalTime!,
          completedAt: updates.endTime!,
          date: today
        });
      }
    }

    return {
      guess: normalizedGuess,
      result,
      // Para compatibilidade com o frontend, isComplete agora significa fim de jogo
      isComplete: gameCompleted,
      isWon,
      attemptsUsed: newAttemptsUsed,
      currentRound: 1,
      roundsUsed: 0,
      gameCompleted
    };
  }

  async getUserStats(userId: string): Promise<ITermoUserStats | null> {
    return await this.gameRepository.getUserStats(userId);
  }

  async getDailyRanking(date?: string): Promise<ITermoRanking[]> {
    const targetDate = date || new Date().toISOString().split('T')[0];
    return await this.gameRepository.getDailyRanking(targetDate);
  }

  async canUserPlay(userId: string): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0];
    const existingGame = await this.gameRepository.getGameByUserAndDate(userId, today);
    
    if (!existingGame) {
      return true;
    }

    // Não pode jogar se já finalizado ou se atingiu 3 tentativas
    return !existingGame.isCompleted && (existingGame.attemptsUsed < DAILY_ATTEMPT_LIMIT);
  }

  async getCurrentGame(userId: string): Promise<ITermoGameState | null> {
    const today = new Date().toISOString().split('T')[0];
    return await this.gameRepository.getGameByUserAndDate(userId, today);
  }

  async getTodayWord(): Promise<ITermoDailyWord | null> {
    await this.dailyWordRepository.generateTodayWordIfNotExists();
    return await this.dailyWordRepository.getTodayWord();
  }

  async getCorrectWordForCompletedGame(userId: string): Promise<string | null> {
    const today = new Date().toISOString().split('T')[0];
    const game = await this.gameRepository.getGameByUserAndDate(userId, today);
    
    if (!game || !game.isCompleted) {
      return null;
    }
    
    return game.word;
  }

  private calculateGuessResult(guess: string, word: string): ('correct' | 'present' | 'absent')[] {
    const result: ('correct' | 'present' | 'absent')[] = [];
    const wordArray = word.split('');
    const guessArray = guess.split('');
    
    // Primeiro passo: marcar letras corretas na posição correta
    for (let i = 0; i < guessArray.length; i++) {
      if (guessArray[i] === wordArray[i]) {
        result[i] = 'correct';
        wordArray[i] = '*'; // Marcar como usada
        guessArray[i] = '*'; // Marcar como processada
      }
    }
    
    // Segundo passo: marcar letras presentes mas na posição errada
    for (let i = 0; i < guessArray.length; i++) {
      if (guessArray[i] !== '*') {
        const foundIndex = wordArray.indexOf(guessArray[i]);
        if (foundIndex !== -1) {
          result[i] = 'present';
          wordArray[foundIndex] = '*'; // Marcar como usada
        } else {
          result[i] = 'absent';
        }
      }
    }
    
    return result;
  }

  // Método removido - não utilizado

  private async updateUserStatsAfterGame(userId: string, game: ITermoGameState): Promise<void> {
    const currentStats = await this.gameRepository.getUserStats(userId) || {
      userId,
      gamesPlayed: 0,
      gamesWon: 0,
      currentStreak: 0,
      maxStreak: 0,
      averageAttempts: 0,
      averageTime: 0,
      bestTime: 0,
      lastPlayedDate: ''
    };

    const newGamesPlayed = currentStats.gamesPlayed + 1;
    const newGamesWon = game.isWon ? currentStats.gamesWon + 1 : currentStats.gamesWon;
    
    let newCurrentStreak = currentStats.currentStreak;
    if (game.isWon) {
      newCurrentStreak += 1;
    } else {
      newCurrentStreak = 0;
    }
    
    const newMaxStreak = Math.max(currentStats.maxStreak, newCurrentStreak);
    
    // Calcular nova média de tentativas
    const totalAttempts = (currentStats.averageAttempts * currentStats.gamesPlayed) + game.attemptsUsed;
    const newAverageAttempts = totalAttempts / newGamesPlayed;
    
    // Calcular nova média de tempo (apenas jogos completados)
    let newAverageTime = currentStats.averageTime;
    if (game.totalTime) {
      const completedGames = game.isWon ? newGamesWon : newGamesWon + 1;
      const totalTime = (currentStats.averageTime * (completedGames - 1)) + game.totalTime;
      newAverageTime = totalTime / completedGames;
    }
    
    // Atualizar melhor tempo
    let newBestTime = currentStats.bestTime;
    if (game.isWon && game.totalTime) {
      newBestTime = currentStats.bestTime === 0 ? game.totalTime : Math.min(currentStats.bestTime, game.totalTime);
    }

    await this.gameRepository.updateUserStats(userId, {
      gamesPlayed: newGamesPlayed,
      gamesWon: newGamesWon,
      currentStreak: newCurrentStreak,
      maxStreak: newMaxStreak,
      averageAttempts: newAverageAttempts,
      averageTime: newAverageTime,
      bestTime: newBestTime,
      lastPlayedDate: game.date
    });
  }

  // Método removido - não utilizado
}


