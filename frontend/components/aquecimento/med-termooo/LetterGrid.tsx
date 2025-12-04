'use client';

import { LetterTile, LetterState, MAX_ATTEMPTS } from './types';

interface LetterGridProps {
  guesses: string[];
  currentGuess: string;
  targetWord: string;
  wordLength: number;
  gameStatus: 'playing' | 'won' | 'lost';
  shakeRow?: number;
}

const getLetterState = (letter: string, index: number, guess: string, targetWord: string): LetterState => {
  if (!letter) return 'empty';
  if (!targetWord) return 'absent'; // Se não tiver targetWord, não pode calcular
  
  const target = targetWord.toUpperCase();
  const guessUpper = guess.toUpperCase();
  const letterUpper = letter.toUpperCase();
  
  if (target[index] === letterUpper) {
    return 'correct';
  }
  
  const targetLetterCount = target.split('').filter(l => l === letterUpper).length;
  
  let usedCount = 0;
  for (let i = 0; i < guessUpper.length; i++) {
    if (guessUpper[i] === letterUpper) {
      if (target[i] === letterUpper) {
        usedCount++;
      } else if (i < index && target.includes(letterUpper)) {
        usedCount++;
      }
    }
  }
  
  if (target.includes(letterUpper) && usedCount < targetLetterCount) {
    return 'present';
  }
  
  return 'absent';
};

const getTileSize = (wordLength: number) => {
  if (wordLength >= 8) return 'w-9 h-9 sm:w-11 sm:h-11 text-base sm:text-xl';
  if (wordLength >= 7) return 'w-10 h-10 sm:w-12 sm:h-12 text-lg sm:text-2xl';
  if (wordLength >= 6) return 'w-11 h-11 sm:w-13 sm:h-13 text-xl sm:text-2xl';
  return 'w-12 h-12 sm:w-16 sm:h-16 text-xl sm:text-3xl';
};

const getTileStyle = (state: LetterState, wordLength: number) => {
  const sizeClass = getTileSize(wordLength);
  const baseStyle = `${sizeClass} flex items-center justify-center font-bold uppercase rounded-lg transition-all duration-300`;
  
  switch (state) {
    case 'correct':
      return `${baseStyle} bg-emerald-500 text-white border-t border-x border-emerald-400 shadow-[0_4px_0_0_#059669]`;
    case 'present':
      return `${baseStyle} bg-primary text-white border-t border-x border-primary/80 shadow-[0_4px_0_0_#5b21b6]`;
    case 'absent':
      return `${baseStyle} bg-slate-500 dark:bg-slate-600 text-white border-t border-x border-slate-400 dark:border-slate-500 shadow-[0_4px_0_0_#334155] dark:shadow-[0_4px_0_0_#1e293b]`;
    case 'pending':
      return `${baseStyle} bg-surface-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary border-2 border-primary shadow-[0_4px_0_0_#7c3aed]`;
    default:
      return `${baseStyle} bg-surface-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary border-t border-x border-border-light dark:border-border-dark shadow-[0_4px_0_0_#d1d5db] dark:shadow-[0_4px_0_0_#374151]`;
  }
};

export function LetterGrid({ guesses, currentGuess, targetWord, wordLength, gameStatus, shakeRow }: LetterGridProps) {
  const rows: LetterTile[][] = [];
  
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const row: LetterTile[] = [];
    
    if (i < guesses.length) {
      const guess = guesses[i];
      for (let j = 0; j < wordLength; j++) {
        row.push({
          letter: guess[j] || '',
          state: getLetterState(guess[j], j, guess, targetWord),
        });
      }
    } else if (i === guesses.length && gameStatus === 'playing') {
      for (let j = 0; j < wordLength; j++) {
        row.push({
          letter: currentGuess[j] || '',
          state: currentGuess[j] ? 'pending' : 'empty',
        });
      }
    } else {
      for (let j = 0; j < wordLength; j++) {
        row.push({ letter: '', state: 'empty' });
      }
    }
    
    rows.push(row);
  }

  const getRowClassName = (rowIndex: number) => {
    const base = 'flex gap-1.5 sm:gap-2';
    return shakeRow === rowIndex ? `${base} animate-shake` : base;
  };

  return (
    <div className="flex flex-col items-center gap-2 sm:gap-2.5">
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} className={getRowClassName(rowIndex)}>
          {row.map((tile, tileIndex) => (
            <div
              key={tileIndex}
              className={getTileStyle(tile.state, wordLength)}
              style={{
                animationDelay: `${tileIndex * 100}ms`,
              }}
            >
              {tile.letter}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
