'use client';

import { useState, useEffect } from 'react';
import { PagePlanGuard } from '@/components/guards/PagePlanGuard';
import { GameBoard } from '@/components/playground/word-search/GameBoard';
import { HowToPlayModal } from '@/components/playground/word-search/HowToPlayModal';
import { fetchWithAuth } from '@/lib/utils/fetchWithAuth';
import Link from 'next/link';

const getStorageKey = () => {
  const today = new Date().toISOString().split('T')[0];
  return `word-search-${today}`;
};

interface PuzzleInfo {
  title: string;
  totalWords: number;
  contextText: string;
  words: string[];
}

function WordSearchContent() {
  const [showGame, setShowGame] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const [hasPlayedToday, setHasPlayedToday] = useState(false);
  const [puzzleInfo, setPuzzleInfo] = useState<PuzzleInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const saved = localStorage.getItem(getStorageKey());
      if (saved) {
        setHasPlayedToday(true);
      }

      try {
        const response = await fetchWithAuth('/games/word-search/daily-puzzle');
        if (response.ok) {
          const data = await response.json();
          setPuzzleInfo({
            title: data.data.title,
            totalWords: data.data.totalWords,
            contextText: data.data.contextText,
            words: data.data.words,
          });
        }
      } catch (error) {
        console.error('[WordSearch] Erro ao buscar puzzle:', error);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  if (showGame) {
    return (
      <div className="h-screen bg-background-light dark:bg-background-dark flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-surface-light dark:bg-surface-dark border-b border-border-light dark:border-border-dark px-3 sm:px-4 py-2 sm:py-3 flex-shrink-0">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => setShowGame(false)}
                className="p-1.5 sm:p-2 rounded-lg hover:bg-emerald-500/10 transition-colors"
              >
                <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary text-xl sm:text-2xl">arrow_back</span>
              </button>
              <h1 className="text-base sm:text-xl font-bold text-emerald-600 dark:text-emerald-400 hidden sm:block">
                CAÇA-PALAVRAS <span className="text-sm font-normal opacity-80">Atualizações</span>
              </h1>
            </div>

            {/* Timer e info no centro */}
            <div className="flex items-center gap-2 sm:gap-4">
              <span className="text-lg sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono" id="word-search-timer">
                00:00
              </span>
              <span className="hidden sm:inline-block px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" id="word-search-title">
                Carregando...
              </span>
              <span className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-semibold bg-primary/10 text-primary border border-primary/20" id="word-search-count">
                0/0 palavras
              </span>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={() => setShowHowToPlay(true)}
                className="p-1.5 sm:p-2 rounded-lg hover:bg-emerald-500/10 transition-colors"
              >
                <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary text-xl sm:text-2xl">help_outline</span>
              </button>
              <Link
                href="/playground/word-search/ranking"
                className="p-1.5 sm:p-2 rounded-lg hover:bg-emerald-500/10 transition-colors"
              >
                <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary text-xl sm:text-2xl">leaderboard</span>
              </Link>
            </div>
          </div>
        </header>

        {/* Main content - flex-1 com overflow-hidden para não ter scroll */}
        <main className="flex-1 overflow-hidden">
          <GameBoard 
            onGameData={(data) => {
              const timerEl = document.getElementById('word-search-timer');
              const titleEl = document.getElementById('word-search-title');
              const countEl = document.getElementById('word-search-count');
              
              if (timerEl) {
                const mins = Math.floor(data.elapsedTime / 60);
                const secs = data.elapsedTime % 60;
                timerEl.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
              }
              if (titleEl) titleEl.textContent = data.title;
              if (countEl) countEl.textContent = `${data.foundCount}/${data.totalWords} ${data.totalWords === 1 ? 'palavra' : 'palavras'}`;
            }}
          />
        </main>

        <HowToPlayModal isOpen={showHowToPlay} onClose={() => setShowHowToPlay(false)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-emerald-500/5 dark:from-emerald-500/10 dark:via-emerald-500/5 dark:to-background-dark flex flex-col">
      <header className="w-full p-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <Link href="/playground" className="p-2 rounded-lg hover:bg-white/20 dark:hover:bg-white/10 transition-colors">
            <span className="material-symbols-outlined text-text-light-primary dark:text-text-dark-primary">arrow_back</span>
          </Link>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowHowToPlay(true)}
              className="p-2 rounded-lg hover:bg-white/20 dark:hover:bg-white/10 transition-colors"
            >
              <span className="material-symbols-outlined text-text-light-primary dark:text-text-dark-primary">help_outline</span>
            </button>
            <Link
              href="/playground/word-search/ranking"
              className="p-2 rounded-lg hover:bg-white/20 dark:hover:bg-white/10 transition-colors"
            >
              <span className="material-symbols-outlined text-text-light-primary dark:text-text-dark-primary">leaderboard</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-grow flex flex-col justify-center items-center px-4 pb-8">
        <div className="text-center">
          {/* Grid animado */}
          <div className="grid grid-cols-4 gap-1 mb-8 mx-auto w-32 animate-pulse">
            {Array(16).fill(null).map((_, i) => (
              <div 
                key={i} 
                className={`w-full h-7 rounded-md shadow-lg ${
                  [0, 5, 10, 15].includes(i) ? 'bg-emerald-500' : 
                  [1, 6, 11].includes(i) ? 'bg-emerald-500/80' : 
                  'bg-emerald-500/40'
                }`}
              />
            ))}
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-emerald-600 dark:text-emerald-400 mb-2 font-azonix">
            CAÇA-PALAVRAS
          </h1>
          <p className="text-lg font-semibold text-emerald-500/80 mb-1">Atualizações</p>
          <p className="text-text-light-secondary dark:text-text-dark-secondary mb-8">
            Fique por dentro das mudanças em protocolos médicos
          </p>

          {loading ? (
            <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
              <div className="animate-pulse h-10 w-24 bg-emerald-500/20 rounded-full"></div>
              <div className="animate-pulse h-10 w-20 bg-primary/20 rounded-full"></div>
            </div>
          ) : puzzleInfo ? (
            <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
              <span className="px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                {puzzleInfo.title}
              </span>
              <span className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary/10 text-primary border border-primary/20">
                {puzzleInfo.totalWords} {puzzleInfo.totalWords === 1 ? 'palavra' : 'palavras'}
              </span>
            </div>
          ) : null}

          <div className="flex flex-col items-center gap-4 w-full max-w-xs mx-auto">
            <button
              onClick={() => setShowGame(true)}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-4 px-8 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              {hasPlayedToday ? 'Continuar' : 'Jogar'}
            </button>
            
            {puzzleInfo && (
              <button
                onClick={() => setShowContext(true)}
                className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 transition-colors font-medium"
              >
                <span className="material-symbols-outlined text-xl">article</span>
                <span>Ver nota de atualização</span>
              </button>
            )}
            
            <button
              onClick={() => setShowHowToPlay(true)}
              className="flex items-center gap-2 text-text-light-secondary dark:text-text-dark-secondary hover:text-emerald-500 transition-colors"
            >
              <span className="material-symbols-outlined text-xl">help_outline</span>
              <span>Como jogar?</span>
            </button>
          </div>
        </div>
      </main>

      <footer className="w-full p-4">
        <div className="max-w-4xl mx-auto flex justify-center">
          <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
            Um novo desafio a cada dia à meia-noite
          </span>
        </div>
      </footer>

      <HowToPlayModal isOpen={showHowToPlay} onClose={() => setShowHowToPlay(false)} />
      
      {/* Modal de Contexto/Nota de Atualização */}
      {showContext && puzzleInfo && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999]"
            onClick={() => setShowContext(false)}
          />
          <div className="fixed right-0 top-0 h-full w-full md:w-[500px] bg-surface-light dark:bg-surface-dark shadow-2xl z-[10000] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-2xl text-emerald-500">article</span>
                <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary">{puzzleInfo.title}</h2>
              </div>
              <button
                onClick={() => setShowContext(false)}
                className="p-2.5 hover:bg-surface-light dark:hover:bg-surface-dark rounded-xl transition-all"
              >
                <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary">close</span>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div
                className="text-sm leading-relaxed text-text-light-secondary dark:text-text-dark-secondary"
                dangerouslySetInnerHTML={{ 
                  __html: puzzleInfo.contextText
                    .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-text-light-primary dark:text-text-dark-primary">$1</strong>')
                    .replace(/\n/g, '<br/>')
                }}
              />
              
              {/* Palavras a encontrar */}
              <div className="mt-6 pt-4 border-t border-border-light dark:border-border-dark">
                <h3 className="text-sm font-semibold text-text-light-secondary dark:text-text-dark-secondary uppercase tracking-wide mb-3">
                  Palavras para encontrar ({puzzleInfo.words.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {puzzleInfo.words.map((word) => (
                    <span
                      key={word}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                    >
                      {word}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-border-light dark:border-border-dark">
              <button
                onClick={() => {
                  setShowContext(false);
                  setShowGame(true);
                }}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all"
              >
                Iniciar Jogo
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function WordSearchPage() {
  return (
    <PagePlanGuard>
      <WordSearchContent />
    </PagePlanGuard>
  );
}
