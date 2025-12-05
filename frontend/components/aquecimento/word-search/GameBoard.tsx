'use client';

import { useState, useEffect, useCallback } from 'react';
import { WordGrid } from './WordGrid';
import { ContextPanel } from './ContextPanel';
import { WordSearchPuzzle, WordSearchGame, WordPosition, FoundWordResult } from './types';
import { fetchWithAuth } from '@/lib/utils/fetchWithAuth';
import confetti from 'canvas-confetti';

const getStorageKey = () => {
  const today = new Date().toISOString().split('T')[0];
  return `word-search-${today}`;
};

const fireConfetti = () => {
  const duration = 3000;
  const end = Date.now() + duration;
  const colors = ['#6366f1', '#22c55e', '#f59e0b', '#ec4899', '#06b6d4'];

  (function frame() {
    confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors });
    confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();

  setTimeout(() => {
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors });
  }, 200);
};

interface GameBoardProps {
  onGameData?: (data: { 
    elapsedTime: number; 
    title: string; 
    foundCount: number; 
    totalWords: number;
    isCompleted: boolean;
  }) => void;
}

export function GameBoard({ onGameData }: GameBoardProps) {
  const [puzzle, setPuzzle] = useState<WordSearchPuzzle | null>(null);
  const [game, setGame] = useState<WordSearchGame | null>(null);
  const [selectedCells, setSelectedCells] = useState<{ row: number; col: number }[]>([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showVictoryBanner, setShowVictoryBanner] = useState(false);

  // Timer
  useEffect(() => {
    if (game && !game.isCompleted && startTime) {
      const interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [game?.isCompleted, startTime]);

  // Notificar dados do jogo para o parent (header)
  useEffect(() => {
    if (puzzle && game && onGameData) {
      onGameData({
        elapsedTime,
        title: puzzle.title,
        foundCount: game.foundWords.length,
        totalWords: puzzle.words.length,
        isCompleted: game.isCompleted,
      });
    }
  }, [puzzle, game, elapsedTime, onGameData]);

  // Inicializar jogo
  useEffect(() => {
    const initGame = async () => {
      try {
        const response = await fetchWithAuth('/games/word-search/start', { method: 'POST' });
        if (!response.ok) throw new Error('Erro ao iniciar jogo');

        const data = await response.json();
        const { game: gameData, puzzle: puzzleData } = data.data;

        setPuzzle(puzzleData);
        setGame(gameData);

        const now = Date.now();
        const savedStartTime = gameData.createdAt ? new Date(gameData.createdAt).getTime() : now;
        setStartTime(savedStartTime);

        if (!gameData.isCompleted) {
          setElapsedTime(Math.floor((now - savedStartTime) / 1000));
        } else if (gameData.completedAt) {
          setElapsedTime(
            Math.floor((new Date(gameData.completedAt).getTime() - savedStartTime) / 1000)
          );
          setTimeout(() => {
            setShowVictoryBanner(true);
            fireConfetti();
          }, 500);
        }

        localStorage.setItem(getStorageKey(), JSON.stringify({ startTime: savedStartTime }));
      } catch (err) {
        console.error('[WordSearch] Erro ao iniciar:', err);
        setError('Erro ao conectar com o servidor. Tente novamente.');
      }
    };

    initGame();
  }, []);

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 2000);
  };

  const getCellsInLine = useCallback(
    (start: { row: number; col: number }, end: { row: number; col: number }): { row: number; col: number }[] => {
      const cells: { row: number; col: number }[] = [];
      const dr = Math.sign(end.row - start.row);
      const dc = Math.sign(end.col - start.col);

      const rowDiff = Math.abs(end.row - start.row);
      const colDiff = Math.abs(end.col - start.col);

      if (rowDiff !== colDiff && rowDiff !== 0 && colDiff !== 0) {
        return [start];
      }

      const steps = Math.max(rowDiff, colDiff);
      for (let i = 0; i <= steps; i++) {
        cells.push({ row: start.row + i * dr, col: start.col + i * dc });
      }

      return cells;
    },
    []
  );

  const handleSelectionStart = useCallback((row: number, col: number) => {
    setSelectedCells([{ row, col }]);
  }, []);

  const handleSelectionMove = useCallback(
    (row: number, col: number) => {
      if (selectedCells.length === 0) return;
      const start = selectedCells[0];
      const newCells = getCellsInLine(start, { row, col });
      setSelectedCells(newCells);
    },
    [selectedCells, getCellsInLine]
  );

  const handleSelectionEnd = useCallback(async () => {
    if (!puzzle || !game || selectedCells.length < 2) {
      setSelectedCells([]);
      return;
    }

    const word = selectedCells.map((c) => puzzle.grid[c.row][c.col]).join('');
    const start = selectedCells[0];
    const end = selectedCells[selectedCells.length - 1];

    try {
      const response = await fetchWithAuth('/games/word-search/find-word', {
        method: 'POST',
        body: JSON.stringify({
          word,
          startRow: start.row,
          startCol: start.col,
          endRow: end.row,
          endCol: end.col,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setSelectedCells([]);
        return;
      }

      const result: FoundWordResult = data.data;

      if (result.isValid && result.isNew) {
        showMessage(`✓ ${result.word} encontrada!`);
        setGame((prev) =>
          prev
            ? {
                ...prev,
                foundWords: [...prev.foundWords, result.word],
                isCompleted: result.gameCompleted,
              }
            : null
        );

        if (result.gameCompleted) {
          setTimeout(() => {
            setShowVictoryBanner(true);
            fireConfetti();
          }, 500);
        }
      } else if (result.isValid && !result.isNew) {
        showMessage('Palavra já encontrada!');
      }
    } catch (err) {
      console.error('[WordSearch] Erro:', err);
    }

    setSelectedCells([]);
  }, [puzzle, game, selectedCells]);

  const getFoundPositions = useCallback((): WordPosition[] => {
    if (!puzzle || !game) return [];
    return puzzle.wordPositions.filter((pos) => game.foundWords.includes(pos.word));
  }, [puzzle, game]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <span className="material-symbols-outlined text-red-500 text-5xl">error</span>
        <p className="text-red-500 font-medium">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (!puzzle || !game) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-text-light-secondary dark:text-text-dark-secondary">
          Carregando...
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col lg:flex-row relative overflow-y-auto lg:overflow-hidden">
      {/* Banner de Vitória */}
      {showVictoryBanner && (
        <div className="absolute inset-x-0 top-0 z-40 animate-slide-down mx-4">
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 backdrop-blur-sm text-white py-5 px-6 rounded-2xl border border-emerald-400/30">
            <div className="flex flex-col items-center gap-3">
              <h3 className="text-xl font-bold">Parabéns!</h3>
              <p className="text-white/90 text-center text-base">
                Volte amanhã para uma nova atualização
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Mensagem de feedback */}
      {message && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-surface-dark dark:bg-surface-light text-white dark:text-slate-900 px-6 py-3 rounded-xl font-semibold shadow-2xl animate-fade-in">
          {message}
        </div>
      )}

      {/* Grid de letras - centralizado */}
      <div className={`flex-shrink-0 lg:flex-1 flex justify-center items-center p-4 ${showVictoryBanner ? 'pt-36' : ''}`}>
        <div className="w-full max-w-[85vw] sm:max-w-[400px] lg:max-w-[500px]">
          <WordGrid
            grid={puzzle.grid}
            gridSize={puzzle.gridSize}
            selectedCells={selectedCells}
            foundPositions={getFoundPositions()}
            onSelectionStart={handleSelectionStart}
            onSelectionMove={handleSelectionMove}
            onSelectionEnd={handleSelectionEnd}
            disabled={game.isCompleted}
          />
        </div>
      </div>

      {/* Painel de contexto - abaixo no mobile, à direita no desktop */}
      <div className="flex-shrink-0 lg:w-[420px] border-t lg:border-t-0 lg:border-l border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark">
        <ContextPanel
          title={puzzle.title}
          contextText={puzzle.contextText}
          words={puzzle.words}
          foundWords={game.foundWords}
        />
      </div>
    </div>
  );
}
