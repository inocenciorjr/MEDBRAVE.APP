'use client';

import { useState, useEffect, useCallback } from 'react';
import { LetterGrid } from './LetterGrid';
import { Keyboard } from './Keyboard';
import { GameState, LetterState, DailyWord, GuessResult } from './types';
import { fetchWithAuth } from '@/lib/utils/fetchWithAuth';
import confetti from 'canvas-confetti';

// Chave para localStorage (cache)
const getStorageKey = () => {
  const today = new Date().toISOString().split('T')[0];
  return `med-termooo-${today}`;
};

// Função para calcular estados das letras a partir do resultado da API
const updateLetterStatesFromResult = (
  guess: string,
  result: Array<{ letter: string; state: 'correct' | 'present' | 'absent' }>,
  currentStates: Record<string, LetterState>
) => {
  const newStates = { ...currentStates };

  for (const { letter, state } of result) {
    const currentState = newStates[letter];
    if (state === 'correct') {
      newStates[letter] = 'correct';
    } else if (state === 'present' && currentState !== 'correct') {
      newStates[letter] = 'present';
    } else if (state === 'absent' && !currentState) {
      newStates[letter] = 'absent';
    }
  }

  return newStates;
};

// Função para disparar confetes
const fireConfetti = () => {
  const duration = 3000;
  const end = Date.now() + duration;

  const colors = ['#6366f1', '#22c55e', '#f59e0b', '#ec4899', '#06b6d4'];

  (function frame() {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: colors
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: colors
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  }());

  // Explosão central
  setTimeout(() => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: colors
    });
  }, 200);
};

interface GameData {
  elapsedTime: number;
  category: string;
  wordLength: number;
}

interface GameBoardProps {
  showBadges?: boolean;
  onGameData?: (data: GameData) => void;
}

export function GameBoard({ showBadges = true, onGameData }: GameBoardProps) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [shakeRow, setShakeRow] = useState<number | undefined>();
  const [message, setMessage] = useState<string | null>(null);
  const [dailyWord, setDailyWord] = useState<DailyWord | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showVictoryBanner, setShowVictoryBanner] = useState(false);
  const [showDefeatBanner, setShowDefeatBanner] = useState(false);

  // Timer
  useEffect(() => {
    if (gameState?.gameStatus === 'playing' && startTime) {
      const interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [gameState?.gameStatus, startTime]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Inicializar jogo via API
  useEffect(() => {
    const initGame = async () => {
      const storageKey = getStorageKey();

      try {
        // Buscar metadados da palavra do dia
        const wordResponse = await fetchWithAuth('/games/med-termooo/daily-word');
        if (wordResponse.ok) {
          const wordData = await wordResponse.json();
          setDailyWord(wordData.data);
        }

        // Iniciar/continuar jogo via API
        const response = await fetchWithAuth('/games/med-termooo/start', { method: 'POST' });

        if (!response.ok) {
          throw new Error('Erro ao iniciar jogo');
        }

        const data = await response.json();
        const game = data.data;

        const gameStatus = game.isCompleted
          ? (game.isWon ? 'won' : 'lost')
          : 'playing';

        const now = Date.now();
        const savedStartTime = game.createdAt ? new Date(game.createdAt).getTime() : now;

        // Usar guessResults da API (já vem calculado do backend)
        const guessResults: GuessResult[][] = game.guessResults || [];
        
        // Reconstruir letterStates a partir dos guessResults (para o teclado)
        let letterStates: Record<string, LetterState> = {};
        for (const result of guessResults) {
          letterStates = updateLetterStatesFromResult('', result, letterStates);
        }

        const newState: GameState = {
          targetWord: game.word || '',
          wordLength: game.wordLength,
          guesses: game.guesses || [],
          guessResults,
          currentGuess: '',
          gameStatus,
          letterStates,
        };

        setGameState(newState);
        setStartTime(savedStartTime);

        if (gameStatus === 'playing') {
          setElapsedTime(Math.floor((now - savedStartTime) / 1000));
        } else if (game.completedAt) {
          setElapsedTime(Math.floor((new Date(game.completedAt).getTime() - savedStartTime) / 1000));
        }

        // Salvar no cache
        localStorage.setItem(storageKey, JSON.stringify({ ...newState, startTime: savedStartTime }));

        // Mostrar banner se jogo já terminou
        if (gameStatus === 'won') {
          setTimeout(() => {
            setShowVictoryBanner(true);
            fireConfetti();
          }, 500);
        } else if (gameStatus === 'lost') {
          setTimeout(() => setShowDefeatBanner(true), 500);
        }
      } catch (err) {
        console.error('[MedTermooo] Erro ao iniciar jogo:', err);
        setError('Erro ao conectar com o servidor. Tente novamente.');
      }
    };

    initGame();
  }, []);

  // Salvar estado no localStorage (cache)
  useEffect(() => {
    if (gameState) {
      const storageKey = getStorageKey();
      localStorage.setItem(storageKey, JSON.stringify({
        ...gameState,
        startTime,
        elapsedTime: gameState.gameStatus !== 'playing' ? elapsedTime : undefined
      }));
    }
  }, [gameState, startTime, elapsedTime]);

  // Callback para atualizar dados no header
  useEffect(() => {
    if (onGameData && dailyWord && gameState) {
      onGameData({
        elapsedTime,
        category: dailyWord.category,
        wordLength: gameState.wordLength,
      });
    }
  }, [onGameData, elapsedTime, dailyWord, gameState]);

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 2000);
  };

  const handleKeyPress = useCallback(async (key: string) => {
    if (!gameState || gameState.gameStatus !== 'playing' || isValidating) return;

    const wordLength = gameState.wordLength;

    if (key === 'BACKSPACE') {
      setGameState(prev => prev ? {
        ...prev,
        currentGuess: prev.currentGuess.slice(0, -1),
      } : null);
      return;
    }

    if (key === 'ENTER') {
      if (gameState.currentGuess.length !== wordLength) {
        showMessage(`A palavra deve ter ${wordLength} ${wordLength === 1 ? 'letra' : 'letras'}`);
        setShakeRow(gameState.guesses.length);
        setTimeout(() => setShakeRow(undefined), 500);
        return;
      }

      const guess = gameState.currentGuess.toUpperCase();
      setIsValidating(true);

      try {
        // Chamar API para fazer o palpite
        const response = await fetchWithAuth('/games/med-termooo/guess', {
          method: 'POST',
          body: JSON.stringify({ guess }),
        });

        const data = await response.json();

        if (!response.ok) {
          showMessage(data.error || data.message || 'Erro ao enviar palpite');
          setShakeRow(gameState.guesses.length);
          setTimeout(() => setShakeRow(undefined), 500);
          setIsValidating(false);
          return;
        }

        const result = data.data;
        const newGuesses = [...gameState.guesses, guess];
        const newGuessResults = [...gameState.guessResults, result.result as GuessResult[]];
        const newLetterStates = updateLetterStatesFromResult(guess, result.result, gameState.letterStates);

        const newStatus: 'playing' | 'won' | 'lost' = result.isCorrect
          ? 'won'
          : result.gameOver
            ? 'lost'
            : 'playing';

        // Se o jogo terminou, guardar a palavra para mostrar
        const targetWord = (newStatus !== 'playing' && result.targetWord)
          ? result.targetWord
          : gameState.targetWord;

        setGameState({
          ...gameState,
          targetWord,
          guesses: newGuesses,
          guessResults: newGuessResults,
          currentGuess: '',
          gameStatus: newStatus,
          letterStates: newLetterStates,
        });

        if (newStatus === 'won') {
          setTimeout(() => {
            setShowVictoryBanner(true);
            fireConfetti();
          }, 1500);
        } else if (newStatus === 'lost') {
          setTimeout(() => setShowDefeatBanner(true), 1500);
        }
      } catch (err: unknown) {
        // Extrair mensagem de erro do JSON se possível
        let errorMessage = 'Erro de conexão. Tente novamente.';
        const errorStr = (err as Error)?.message || '';

        // Tentar extrair JSON do erro (formato: "HTTP 400: {...}")
        const jsonMatch = errorStr.match(/\{.*\}/);
        if (jsonMatch) {
          try {
            const errorData = JSON.parse(jsonMatch[0]);
            errorMessage = errorData.error || errorData.message || errorMessage;
          } catch {
            // Ignorar erro de parse
          }
        }

        showMessage(errorMessage);
        setShakeRow(gameState.guesses.length);
        setTimeout(() => setShakeRow(undefined), 500);
      } finally {
        setIsValidating(false);
      }
      return;
    }

    // Adicionar letra
    if (gameState.currentGuess.length < wordLength && /^[A-Z]$/.test(key)) {
      setGameState(prev => prev ? {
        ...prev,
        currentGuess: prev.currentGuess + key,
      } : null);
    }
  }, [gameState, isValidating]);

  // Listener de teclado físico
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const key = e.key.toUpperCase();

      if (key === 'BACKSPACE' || key === 'ENTER') {
        handleKeyPress(key);
      } else if (/^[A-Z]$/.test(key)) {
        handleKeyPress(key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyPress]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <span className="material-symbols-outlined text-red-500 text-5xl">error</span>
        <p className="text-red-500 font-medium">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (!gameState || !dailyWord) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-text-light-secondary dark:text-text-dark-secondary">
          Carregando...
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col relative overflow-hidden">
      {/* Banner de Vitória */}
      {showVictoryBanner && (
        <div className="absolute inset-x-0 top-0 z-40 animate-slide-down mx-4">
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 backdrop-blur-sm text-white py-5 px-6 rounded-2xl border border-emerald-400/30">
            <div className="flex flex-col items-center gap-3">
              <h3 className="text-xl font-bold">Parabéns!</h3>
              <p className="text-white/90 text-center text-base">
                Volte amanhã para uma nova palavra
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Banner de Derrota */}
      {showDefeatBanner && (
        <div className="absolute inset-x-0 top-0 z-40 animate-slide-down mx-4">
          <div className="bg-gradient-to-r from-red-500 to-rose-600 backdrop-blur-sm text-white py-5 px-6 rounded-2xl border border-red-400/30">
            <div className="flex flex-col items-center gap-3">
              <h3 className="text-xl font-bold">Não foi dessa vez</h3>
              <p className="text-white/90 text-center text-base">
                A palavra era <span className="font-bold text-yellow-300">{gameState.targetWord}</span>
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

      {/* Conteúdo principal */}
      <div className={`flex-1 flex flex-col items-center justify-center gap-6 p-4 ${showVictoryBanner || showDefeatBanner ? 'pt-36' : ''}`}>
        {/* Timer e info - só mostra se showBadges for true */}
        {showBadges && (
          <div className="flex flex-col items-center gap-3">
            <div className="text-3xl font-bold text-primary font-mono">
              {formatTime(elapsedTime)}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <span className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary/10 text-primary border border-primary/20">
                {dailyWord.category}
              </span>
              <span className="px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                {gameState.wordLength} {gameState.wordLength === 1 ? 'letra' : 'letras'}
              </span>
            </div>
          </div>
        )}

        {/* Grid de letras */}
        <LetterGrid
          guesses={gameState.guesses}
          guessResults={gameState.guessResults}
          currentGuess={gameState.currentGuess}
          targetWord={gameState.targetWord}
          wordLength={gameState.wordLength}
          gameStatus={gameState.gameStatus}
          shakeRow={shakeRow}
        />

        {/* Teclado virtual */}
        <div className="w-full max-w-lg">
          <Keyboard
            onKeyPress={handleKeyPress}
            letterStates={gameState.letterStates}
            disabled={gameState.gameStatus !== 'playing'}
          />
        </div>
      </div>
    </div>
  );
}
