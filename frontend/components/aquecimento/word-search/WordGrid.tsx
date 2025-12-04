'use client';

import { useRef, useCallback } from 'react';
import { WordPosition } from './types';

interface WordGridProps {
  grid: string[][];
  gridSize: number;
  selectedCells: { row: number; col: number }[];
  foundPositions: WordPosition[];
  onSelectionStart: (row: number, col: number) => void;
  onSelectionMove: (row: number, col: number) => void;
  onSelectionEnd: () => void;
  disabled?: boolean;
}

export function WordGrid({
  grid,
  gridSize,
  selectedCells,
  foundPositions,
  onSelectionStart,
  onSelectionMove,
  onSelectionEnd,
  disabled = false,
}: WordGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const isSelectingRef = useRef(false);

  // Verificar se uma célula está selecionada
  const isCellSelected = useCallback((row: number, col: number) => {
    return selectedCells.some(c => c.row === row && c.col === col);
  }, [selectedCells]);

  // Verificar se uma célula faz parte de uma palavra encontrada
  const isCellFound = useCallback((row: number, col: number) => {
    return foundPositions.some(pos => {
      const { startRow, startCol, endRow, endCol, direction } = pos;
      const dr = direction === 'vertical' ? 1 : direction === 'diagonal-down' ? 1 : direction === 'diagonal-up' ? -1 : 0;
      const dc = direction === 'horizontal' || direction.includes('diagonal') ? 1 : 0;
      
      const wordLength = pos.word.length;
      for (let i = 0; i < wordLength; i++) {
        const r = startRow + i * dr;
        const c = startCol + i * dc;
        if (r === row && c === col) return true;
      }
      return false;
    });
  }, [foundPositions]);

  // Obter posição da célula a partir do evento
  const getCellFromEvent = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!gridRef.current) return null;
    
    const rect = gridRef.current.getBoundingClientRect();
    const cellSize = rect.width / gridSize;
    
    let clientX: number, clientY: number;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const col = Math.floor((clientX - rect.left) / cellSize);
    const row = Math.floor((clientY - rect.top) / cellSize);
    
    if (row >= 0 && row < gridSize && col >= 0 && col < gridSize) {
      return { row, col };
    }
    return null;
  }, [gridSize]);

  const handleStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (disabled) return;
    e.preventDefault();
    const cell = getCellFromEvent(e);
    if (cell) {
      isSelectingRef.current = true;
      onSelectionStart(cell.row, cell.col);
    }
  }, [disabled, getCellFromEvent, onSelectionStart]);

  const handleMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isSelectingRef.current || disabled) return;
    e.preventDefault();
    const cell = getCellFromEvent(e);
    if (cell) {
      onSelectionMove(cell.row, cell.col);
    }
  }, [disabled, getCellFromEvent, onSelectionMove]);

  const handleEnd = useCallback(() => {
    if (isSelectingRef.current) {
      isSelectingRef.current = false;
      onSelectionEnd();
    }
  }, [onSelectionEnd]);

  return (
    <div
      ref={gridRef}
      className="relative select-none touch-none"
      onMouseDown={handleStart}
      onMouseMove={handleMove}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchStart={handleStart}
      onTouchMove={handleMove}
      onTouchEnd={handleEnd}
    >
      <div 
        className="grid gap-1.5 sm:gap-2"
        style={{ 
          gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
          aspectRatio: '1',
        }}
      >
        {grid.map((row, rowIndex) =>
          row.map((letter, colIndex) => {
            const isSelected = isCellSelected(rowIndex, colIndex);
            const isFound = isCellFound(rowIndex, colIndex);
            
            return (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={`
                  flex items-center justify-center
                  text-sm sm:text-base md:text-lg font-bold uppercase
                  aspect-square rounded-lg
                  transition-all duration-150
                  ${isFound 
                    ? 'bg-emerald-500 text-white border-t border-x border-emerald-400 shadow-[0_4px_0_0_#059669]' 
                    : isSelected 
                      ? 'bg-emerald-500 text-white border-t border-x border-emerald-400 shadow-[0_4px_0_0_#059669] scale-105' 
                      : 'bg-surface-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary border-t border-x border-border-light dark:border-border-dark shadow-[0_4px_0_0_#d1d5db] dark:shadow-[0_4px_0_0_#374151]'
                  }
                `}
              >
                {letter}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
