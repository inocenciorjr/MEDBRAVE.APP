export interface IMedTermoooGame {
  id: string;
  userId: string;
  word?: string; // Só retornado quando o jogo termina
  wordLength: number;
  guesses: string[];
  guessResults: LetterResult[][]; // Resultados de cada tentativa
  isCompleted: boolean;
  isWon: boolean;
  attempts: number;
  date: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface IMedTermoooStats {
  userId: string;
  totalGames: number;
  wins: number;
  currentStreak: number;
  maxStreak: number;
  guessDistribution: Record<number, number>; // { 1: 5, 2: 10, 3: 15, ... }
  lastPlayedDate?: string;
}

export interface IDailyWord {
  id: string;
  word: string;
  hint: string;
  category: string;
  date: string;
  length: number;
  createdAt: Date;
}

export interface IGuessResult {
  guess: string;
  result: LetterResult[];
  isCorrect: boolean;
  gameOver: boolean;
  attemptsLeft: number;
  targetWord?: string; // Retornado apenas quando o jogo termina
}

export interface LetterResult {
  letter: string;
  state: 'correct' | 'present' | 'absent';
}
