export interface WordSearchPuzzle {
  id: string;
  date: string;
  title: string;
  contextText: string;
  words: string[];
  grid: string[][];
  wordPositions: WordPosition[];
  gridSize: number;
}

export interface WordPosition {
  word: string;
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
  direction: 'horizontal' | 'vertical' | 'diagonal-down' | 'diagonal-up';
}

export interface WordSearchGame {
  id: string;
  foundWords: string[];
  isCompleted: boolean;
  date: string;
  createdAt: string;
  completedAt?: string;
}

export interface GameState {
  puzzle: WordSearchPuzzle | null;
  game: WordSearchGame | null;
  selectedCells: { row: number; col: number }[];
  isSelecting: boolean;
}

export interface FoundWordResult {
  word: string;
  isValid: boolean;
  isNew: boolean;
  gameCompleted: boolean;
  totalWords: number;
  foundCount: number;
}
