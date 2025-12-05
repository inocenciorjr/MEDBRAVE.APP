'use client';

import { useState, useEffect } from 'react';
import { PagePlanGuard } from '@/components/guards/PagePlanGuard';
import { GameBoard } from '@/components/aquecimento/med-termooo/GameBoard';
import { HowToPlayModal } from '@/components/aquecimento/med-termooo/HowToPlayModal';
import { DailyWord } from '@/components/aquecimento/med-termooo/types';
import { fetchWithAuth } from '@/lib/utils/fetchWithAuth';
import Link from 'next/link';

// Chave para verificar se já jogou hoje
const getStorageKey = () => {
  const today = new Date().toISOString().split('T')[0];
  return `med-termooo-${today}`;
};

function MedTermoooContent() {
  const [showGame, setShowGame] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [hasPlayedToday, setHasPlayedToday] = useState(false);
  const [dailyWord, setDailyWord] = useState<DailyWord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      // Verificar cache local
      const saved = localStorage.getItem(getStorageKey());
      if (saved) {
        const parsed = JSON.parse(saved);
        setHasPlayedToday(parsed.gameStatus !== 'playing');
      }

      // Buscar dados da palavra do dia via API
      try {
        const response = await fetchWithAuth('/games/med-termooo/daily-word');
        if (response.ok) {
          const data = await response.json();
          setDailyWord(data.data);
        }
      } catch (error) {
        console.error('[MedTermooo] Erro ao buscar palavra do dia:', error);
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
        <header className="bg-surface-light dark:bg-surface-dark border-b border-border-light dark:border-border-dark px-3 sm:px-4 py-2 flex-shrink-0">
          {/* Linha principal */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowGame(false)}
              className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors"
            >
              <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary text-xl">arrow_back</span>
            </button>

            {/* Timer e letras */}
            <div className="flex items-center gap-2">
              <span className="text-lg sm:text-2xl font-bold text-primary font-mono" id="med-termooo-timer">
                00:00
              </span>
              <span className="px-2 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" id="med-termooo-length">
                0 letras
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowHowToPlay(true)}
                className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors"
              >
                <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary text-xl">help_outline</span>
              </button>
              <Link
                href="/aquecimento/med-termooo/ranking"
                className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors"
              >
                <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary text-xl">leaderboard</span>
              </Link>
            </div>
          </div>
          
          {/* Categoria - linha separada */}
          <div className="flex justify-center mt-1">
            <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-primary/10 text-primary border border-primary/20" id="med-termooo-category">
              ...
            </span>
          </div>
        </header>

        {/* Main content - flex-1 com overflow-hidden para não ter scroll */}
        <main className="flex-1 overflow-hidden">
          <GameBoard 
            showBadges={false}
            onGameData={(data) => {
              const timerEl = document.getElementById('med-termooo-timer');
              const categoryEl = document.getElementById('med-termooo-category');
              const lengthEl = document.getElementById('med-termooo-length');
              
              if (timerEl) {
                const mins = Math.floor(data.elapsedTime / 60);
                const secs = data.elapsedTime % 60;
                timerEl.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
              }
              if (categoryEl) categoryEl.textContent = data.category;
              if (lengthEl) lengthEl.textContent = `${data.wordLength} ${data.wordLength === 1 ? 'letra' : 'letras'}`;
            }}
          />
        </main>

        <HowToPlayModal isOpen={showHowToPlay} onClose={() => setShowHowToPlay(false)} />
      </div>
    );
  }

  // Página inicial
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 dark:from-primary/10 dark:via-primary/5 dark:to-background-dark flex flex-col">
      {/* Header */}
      <header className="w-full p-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <Link href="/aquecimento" className="p-2 rounded-lg hover:bg-white/20 dark:hover:bg-white/10 transition-colors">
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
              href="/aquecimento/med-termooo/ranking"
              className="p-2 rounded-lg hover:bg-white/20 dark:hover:bg-white/10 transition-colors"
            >
              <span className="material-symbols-outlined text-text-light-primary dark:text-text-dark-primary">leaderboard</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Conteúdo principal */}
      <main className="flex-grow flex flex-col justify-center items-center px-4 pb-8">
        <div className="text-center">
          {/* Grid animado */}
          <div className="grid grid-cols-3 gap-1.5 mb-8 mx-auto w-28 animate-pulse">
            <div className="w-full h-9 bg-primary rounded-md shadow-lg"></div>
            <div className="w-full h-9 bg-primary/80 rounded-md shadow-lg"></div>
            <div className="w-full h-9 bg-primary/40 rounded-md shadow-lg"></div>
            <div className="w-full h-9 bg-primary/40 rounded-md shadow-lg"></div>
            <div className="w-full h-9 bg-primary rounded-md shadow-lg"></div>
            <div className="w-full h-9 bg-primary/60 rounded-md shadow-lg"></div>
            <div className="w-full h-9 bg-primary/60 rounded-md shadow-lg"></div>
            <div className="w-full h-9 bg-primary/40 rounded-md shadow-lg"></div>
            <div className="w-full h-9 bg-primary rounded-md shadow-lg"></div>
          </div>

          {/* Título */}
          <h1 className="text-5xl md:text-6xl font-bold text-primary mb-2 font-azonix">MED TERMOOO</h1>
          <p className="text-text-light-secondary dark:text-text-dark-secondary mb-8">
            Descubra o termo médico do dia
          </p>

          {/* Info da palavra do dia */}
          {loading ? (
            <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
              <div className="animate-pulse h-10 w-24 bg-primary/20 rounded-full"></div>
              <div className="animate-pulse h-10 w-20 bg-emerald-500/20 rounded-full"></div>
            </div>
          ) : dailyWord ? (
            <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
              <span className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary/10 text-primary border border-primary/20">
                {dailyWord.category}
              </span>
              <span className="px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                {dailyWord.length} {dailyWord.length === 1 ? 'letra' : 'letras'}
              </span>
            </div>
          ) : null}

          {/* Botões */}
          <div className="flex flex-col items-center gap-4 w-full max-w-xs mx-auto">
            <button
              onClick={() => setShowGame(true)}
              className="w-full bg-primary hover:bg-primary/90 text-white py-4 px-8 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              {hasPlayedToday ? 'Continuar' : 'Jogar'}
            </button>
            
            <button
              onClick={() => setShowHowToPlay(true)}
              className="flex items-center gap-2 text-text-light-secondary dark:text-text-dark-secondary hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined text-xl">help_outline</span>
              <span>Como jogar?</span>
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full p-4">
        <div className="max-w-4xl mx-auto flex justify-center">
          <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
            Um novo desafio a cada dia à meia-noite
          </span>
        </div>
      </footer>

      <HowToPlayModal isOpen={showHowToPlay} onClose={() => setShowHowToPlay(false)} />
    </div>
  );
}

export default function MedTermoooPage() {
  return (
    <PagePlanGuard>
      <MedTermoooContent />
    </PagePlanGuard>
  );
}
