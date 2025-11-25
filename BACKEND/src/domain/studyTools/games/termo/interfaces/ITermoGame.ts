export interface ITermoGameState {
  id: string;
  userId: string;
  word: string;
  wordLength: number;
  guesses: string[];
  isCompleted: boolean;
  isWon: boolean;
  attemptsUsed: number;
  maxAttempts: number;
  currentRound: number;
  maxRounds: number;
  roundsUsed: number;
  startTime?: Date;
  endTime?: Date;
  totalTime?: number; // em segundos
  date: string; // YYYY-MM-DD
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ITermoDailyWord {
  id?: string;
  word: string;
  length: number;
  date: string; // YYYY-MM-DD
  created_at?: Date;
}

export interface ITermoUserStats {
  userId: string;
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  averageAttempts: number;
  averageTime: number;
  bestTime: number;
  lastPlayedDate: string;
}

export interface ITermoRanking {
  userId: string;
  userName: string;
  attemptsUsed: number;
  totalTime: number;
  completedAt: Date;
  date: string;
  position?: number;
}

export interface ITermoGuessResult {
  guess: string;
  result: ('correct' | 'present' | 'absent')[];
  isComplete: boolean;
  isWon: boolean;
  attemptsUsed: number;
  currentRound: number;
  roundsUsed: number;
  gameCompleted: boolean;
}

export interface ITermoGameRepository {
  createGame(gameState: Omit<ITermoGameState, 'id' | 'createdAt' | 'updatedAt'>): Promise<ITermoGameState>;
  updateGame(gameId: string, updates: Partial<ITermoGameState>): Promise<ITermoGameState>;
  getGameByUserAndDate(userId: string, date: string): Promise<ITermoGameState | null>;
  getUserStats(userId: string): Promise<ITermoUserStats | null>;
  updateUserStats(userId: string, stats: Partial<ITermoUserStats>): Promise<void>;
  getDailyRanking(date: string): Promise<ITermoRanking[]>;
  addToRanking(ranking: Omit<ITermoRanking, 'position'>): Promise<void>;
}

export interface ITermoDailyWordRepository {
  getTodayWord(): Promise<ITermoDailyWord | null>;
  createDailyWord(word: string, date: string): Promise<ITermoDailyWord>;
  generateTodayWordIfNotExists(): Promise<ITermoDailyWord>;
}

export interface ITermoGameService {
  startGame(userId: string): Promise<ITermoGameState>;
  makeGuess(userId: string, guess: string): Promise<ITermoGuessResult>;
  getUserStats(userId: string): Promise<ITermoUserStats | null>;
  getDailyRanking(date?: string): Promise<ITermoRanking[]>;
  canUserPlay(userId: string): Promise<boolean>;
  getCurrentGame(userId: string): Promise<ITermoGameState | null>;
}