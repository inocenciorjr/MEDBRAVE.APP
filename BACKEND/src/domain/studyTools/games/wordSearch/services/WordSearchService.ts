import { SupabaseClient } from '@supabase/supabase-js';
import { 
  IWordSearchPuzzle, 
  IWordSearchGame, 
  IWordSearchStats, 
  IFoundWordResult,
  IWordPosition 
} from '../interfaces/IWordSearch';

const GRID_SIZE = 12;

export class WordSearchService {
  constructor(private supabase: SupabaseClient) {}

  // Obter puzzle do dia
  async getTodayPuzzle(): Promise<IWordSearchPuzzle> {
    const today = new Date().toISOString().split('T')[0];

    const { data: puzzle, error } = await this.supabase
      .from('word_search_daily_puzzles')
      .select('*')
      .eq('date', today)
      .single();

    if (error || !puzzle) {
      throw new Error('Puzzle do dia não disponível. Tente novamente mais tarde.');
    }

    return this.mapPuzzleFromDb(puzzle);
  }

  // Iniciar ou continuar jogo
  async startGame(userId: string): Promise<{ game: IWordSearchGame; puzzle: IWordSearchPuzzle }> {
    const today = new Date().toISOString().split('T')[0];

    // Buscar puzzle do dia
    const puzzle = await this.getTodayPuzzle();

    // Verificar se já existe jogo hoje
    const { data: existingGame } = await this.supabase
      .from('word_search_games')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle();

    if (existingGame) {
      return { game: this.mapGameFromDb(existingGame), puzzle };
    }

    // Criar novo jogo
    const newGame = {
      user_id: userId,
      puzzle_id: puzzle.id,
      found_words: [],
      is_completed: false,
      date: today,
    };

    const { data, error } = await this.supabase
      .from('word_search_games')
      .insert(newGame)
      .select()
      .single();

    // Se der erro de duplicata, buscar o jogo existente
    if (error?.code === '23505') {
      const { data: game } = await this.supabase
        .from('word_search_games')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .single();
      
      if (game) return { game: this.mapGameFromDb(game), puzzle };
    }

    if (error) throw error;
    return { game: this.mapGameFromDb(data), puzzle };
  }


  // Validar palavra encontrada
  async findWord(
    userId: string, 
    word: string,
    startRow: number,
    startCol: number,
    endRow: number,
    endCol: number
  ): Promise<IFoundWordResult> {
    const normalizedWord = word.toUpperCase().trim();
    const today = new Date().toISOString().split('T')[0];

    // Buscar jogo atual
    const { data: game, error } = await this.supabase
      .from('word_search_games')
      .select('*, word_search_daily_puzzles(*)')
      .eq('user_id', userId)
      .eq('date', today)
      .single();

    if (error || !game) {
      throw new Error('Jogo não encontrado. Inicie um novo jogo.');
    }

    if (game.is_completed) {
      throw new Error('Jogo já finalizado. Volte amanhã!');
    }

    const puzzle = game.word_search_daily_puzzles;
    const totalWords = puzzle.words.length;
    const foundWords: string[] = game.found_words || [];

    // Verificar se a palavra já foi encontrada
    if (foundWords.includes(normalizedWord)) {
      return {
        word: normalizedWord,
        isValid: true,
        isNew: false,
        gameCompleted: false,
        totalWords,
        foundCount: foundWords.length,
      };
    }

    // Verificar se a palavra existe no puzzle
    if (!puzzle.words.includes(normalizedWord)) {
      return {
        word: normalizedWord,
        isValid: false,
        isNew: false,
        gameCompleted: false,
        totalWords,
        foundCount: foundWords.length,
      };
    }

    // Verificar se a posição está correta
    const wordPositions: IWordPosition[] = puzzle.word_positions;
    const correctPosition = wordPositions.find(wp => 
      wp.word === normalizedWord &&
      wp.startRow === startRow &&
      wp.startCol === startCol &&
      wp.endRow === endRow &&
      wp.endCol === endCol
    );

    if (!correctPosition) {
      return {
        word: normalizedWord,
        isValid: false,
        isNew: false,
        gameCompleted: false,
        totalWords,
        foundCount: foundWords.length,
      };
    }

    // Adicionar palavra encontrada
    const newFoundWords = [...foundWords, normalizedWord];
    const gameCompleted = newFoundWords.length === totalWords;

    // Atualizar jogo
    const updateData: any = {
      found_words: newFoundWords,
    };

    if (gameCompleted) {
      updateData.is_completed = true;
      updateData.completed_at = new Date().toISOString();
    }

    await this.supabase
      .from('word_search_games')
      .update(updateData)
      .eq('id', game.id);

    // Atualizar estatísticas se completou
    if (gameCompleted) {
      await this.updateStats(userId, true, newFoundWords.length);
    }

    return {
      word: normalizedWord,
      isValid: true,
      isNew: true,
      gameCompleted,
      totalWords,
      foundCount: newFoundWords.length,
    };
  }

  // Atualizar estatísticas
  private async updateStats(userId: string, won: boolean, wordsFound: number): Promise<void> {
    const { data: stats } = await this.supabase
      .from('word_search_stats')
      .select('*')
      .eq('user_id', userId)
      .single();

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    if (stats) {
      const currentStreak = stats.last_played_date === yesterday
        ? (won ? stats.current_streak + 1 : 0)
        : (won ? 1 : 0);

      await this.supabase
        .from('word_search_stats')
        .update({
          total_games: stats.total_games + 1,
          wins: stats.wins + (won ? 1 : 0),
          current_streak: currentStreak,
          max_streak: Math.max(stats.max_streak, currentStreak),
          total_words_found: stats.total_words_found + wordsFound,
          last_played_date: today,
        })
        .eq('user_id', userId);
    } else {
      await this.supabase
        .from('word_search_stats')
        .insert({
          user_id: userId,
          total_games: 1,
          wins: won ? 1 : 0,
          current_streak: won ? 1 : 0,
          max_streak: won ? 1 : 0,
          total_words_found: wordsFound,
          last_played_date: today,
        });
    }
  }

  // Obter estatísticas do usuário
  async getStats(userId: string): Promise<IWordSearchStats | null> {
    const { data } = await this.supabase
      .from('word_search_stats')
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
      totalWordsFound: data.total_words_found,
      lastPlayedDate: data.last_played_date,
    };
  }

  // Obter ranking diário
  async getDailyRanking(): Promise<{ stats: any; ranking: any[] }> {
    const today = new Date().toISOString().split('T')[0];

    // Buscar jogos completados do dia
    const { data: games } = await this.supabase
      .from('word_search_games')
      .select('id, user_id, found_words, created_at, completed_at')
      .eq('date', today)
      .eq('is_completed', true)
      .order('completed_at', { ascending: true })
      .limit(10);

    if (!games || games.length === 0) {
      return { stats: { totalPlayers: 0, totalWinners: 0 }, ranking: [] };
    }

    // Buscar dados dos usuários
    const userIds = games.map(g => g.user_id);
    const { data: users } = await this.supabase
      .from('users')
      .select('id, display_name, photo_url')
      .in('id', userIds);

    const usersMap = new Map((users || []).map(u => [u.id, u]));

    const ranking = games.map((game, index) => {
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
        wordsFound: game.found_words?.length || 0,
        timeInSeconds,
        completedAt: game.completed_at,
      };
    });

    // Estatísticas gerais
    const { count: totalPlayers } = await this.supabase
      .from('word_search_games')
      .select('*', { count: 'exact', head: true })
      .eq('date', today);

    return {
      stats: {
        totalPlayers: totalPlayers || 0,
        totalWinners: games.length,
      },
      ranking,
    };
  }

  private mapPuzzleFromDb(data: any): IWordSearchPuzzle {
    return {
      id: data.id,
      date: data.date,
      title: data.title,
      contextText: data.context_text,
      words: data.words,
      grid: data.grid,
      wordPositions: data.word_positions,
      gridSize: data.grid_size,
      createdAt: new Date(data.created_at),
    };
  }

  private mapGameFromDb(data: any): IWordSearchGame {
    return {
      id: data.id,
      userId: data.user_id,
      puzzleId: data.puzzle_id,
      foundWords: data.found_words || [],
      isCompleted: data.is_completed,
      date: data.date,
      createdAt: new Date(data.created_at),
      completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
    };
  }
}
