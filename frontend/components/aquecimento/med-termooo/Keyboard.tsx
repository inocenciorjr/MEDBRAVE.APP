'use client';

import { LetterState } from './types';

interface KeyboardProps {
  onKeyPress: (key: string) => void;
  letterStates: Record<string, LetterState>;
  disabled?: boolean;
}

const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ç'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE'],
];

const getKeyStyle = (state: LetterState | undefined) => {
  const baseStyle = 'font-bold rounded-lg border-t border-x transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed';
  
  switch (state) {
    case 'correct':
      return `${baseStyle} bg-emerald-500 text-white border-emerald-400 shadow-[0_3px_0_0_#059669]`;
    case 'present':
      return `${baseStyle} bg-primary text-white border-primary/80 shadow-[0_3px_0_0_#5b21b6]`;
    case 'absent':
      return `${baseStyle} bg-slate-500 dark:bg-slate-600 text-white border-slate-400 dark:border-slate-500 shadow-[0_3px_0_0_#334155] dark:shadow-[0_3px_0_0_#1e293b]`;
    default:
      return `${baseStyle} bg-surface-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary border-border-light dark:border-border-dark shadow-[0_3px_0_0_#d1d5db] dark:shadow-[0_3px_0_0_#374151] hover:bg-slate-100 dark:hover:bg-slate-700`;
  }
};

export function Keyboard({ onKeyPress, letterStates, disabled }: KeyboardProps) {
  const handleClick = (key: string) => {
    if (disabled) return;
    onKeyPress(key);
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-1.5 sm:space-y-2 px-1">
      {KEYBOARD_ROWS.map((row, rowIndex) => (
        <div key={rowIndex} className="flex justify-center gap-1 sm:gap-1.5">
          {row.map((key) => {
            const state = letterStates[key];
            const isSpecialKey = key === 'ENTER' || key === 'BACKSPACE';
            
            return (
              <button
                key={key}
                onClick={() => handleClick(key)}
                disabled={disabled}
                className={`h-12 sm:h-14 md:h-16 flex-1 ${isSpecialKey ? 'max-w-[70px] sm:max-w-[80px]' : 'max-w-[40px] sm:max-w-[50px]'} text-base sm:text-lg md:text-xl ${getKeyStyle(state)}`}
              >
                {key === 'BACKSPACE' ? (
                  <span className="material-symbols-outlined text-xl sm:text-2xl">backspace</span>
                ) : key === 'ENTER' ? (
                  <span className="material-symbols-outlined text-xl sm:text-2xl">keyboard_return</span>
                ) : (
                  key
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
