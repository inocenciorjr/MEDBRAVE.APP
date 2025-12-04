export interface IWordSearchPuzzle {
  id: string;
  date: string;
  title: string;
  contextText: string;
  words: string[];
  grid: string[][];
  wordPositions: IWordPosition[];
  gridSize: number;
  createdAt: Date;
}

export interface IWordPosition {
  word: string;
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
  direction: 'horizontal' | 'vertical' | 'diagonal-down' | 'diagonal-up';
}

export interface IWordSearchGame {
  id: string;
  userId: string;
  puzzleId: string;
  foundWords: string[];
  isCompleted: boolean;
  date: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface IWordSearchStats {
  userId: string;
  totalGames: number;
  wins: number;
  currentStreak: number;
  maxStreak: number;
  totalWordsFound: number;
  lastPlayedDate?: string;
}

export interface IFoundWordResult {
  word: string;
  isValid: boolean;
  isNew: boolean;
  gameCompleted: boolean;
  totalWords: number;
  foundCount: number;
}

export interface IPuzzleData {
  title: string;
  contextText: string;
  words: string[];
}
