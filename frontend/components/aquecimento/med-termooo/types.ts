export type LetterState = 'correct' | 'present' | 'absent' | 'empty' | 'pending';

export interface LetterTile {
  letter: string;
  state: LetterState;
}

export interface GuessResult {
  letter: string;
  state: 'correct' | 'present' | 'absent';
}

export interface GameState {
  targetWord: string;
  wordLength: number;
  guesses: string[];
  guessResults: GuessResult[][]; // Resultados de cada tentativa
  currentGuess: string;
  gameStatus: 'playing' | 'won' | 'lost';
  letterStates: Record<string, LetterState>;
}

export interface DailyWord {
  date: string;
  length: number;
  category: string;
  hint: string;
}

export const MAX_ATTEMPTS = 6;
export const MIN_WORD_LENGTH = 5;
export const MAX_WORD_LENGTH = 8;
