'use client';

import { useState, useEffect } from 'react';
import { PagePlanGuard } from '@/components/guards/PagePlanGuard';
import Link from 'next/link';
import { fetchWithAuth } from '@/lib/utils/fetchWithAuth';

interface RankingEntry {
  position: number;
  userId: string;
  displayName: string;
  photoUrl: string | null;
  wordsFound: number;
  timeInSeconds: number;
  completedAt: string;
}

interface DailyStats {
  totalPlayers: number;
  totalWinners: number;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

const getMedalConfig = (position: number) => {
  switch (position) {
    case 1: return { emoji: '🥇', gradient: 'from-yellow-400 to-amber-500', border: 'border-yellow-400' };
    case 2: return { emoji: '🥈', gradient: 'from-slate-300 to-gray-400', border: 'border-slate-400' };
    case 3: return { emoji: '🥉', gradient: 'from-orange-400 to-amber-600', border: 'border-orange-400' };
    default: return null;
  }
};

function RankingContent() {
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [stats, setStats] = useState<DailyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRanking = async () => {
      try {
        const response = await fetchWithAuth('/games/word-search/ranking');
        if (!response.ok) throw new Error('Erro ao carregar ranking');
        const data = await response.json();
        setRanking(data.data?.ranking || []);
        setStats(data.data?.stats || null);
      } catch (err) {
        setError('Não foi possível carregar o ranking');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchRanking();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/playground/word-search" className="p-2 rounded-lg hover:bg-emerald-500/10 transition-colors">
            <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary">arrow_back</span>
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-xl shadow-amber-500/30">
              <span className="material-symbols-outlined text-white text-3xl">leaderboard</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary">Ranking do Dia</h1>
              <p className="text-text-light-secondary dark:text-text-dark-secondary">Caça-Palavras Atualizações</p>
            </div>
          </div>
        </div>
        <Link href="/playground/word-search" className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-semibold transition-all shadow-lg shadow-emerald-500/30">
          <span className="material-symbols-outlined">play_arrow</span>
          Jogar
        </Link>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-5 border border-border-light dark:border-border-dark shadow-lg">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary">group</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary">{stats?.totalPlayers || 0}</p>
              <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">Jogadores Hoje</p>
            </div>
          </div>
        </div>
        <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-5 border border-border-light dark:border-border-dark shadow-lg">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary">emoji_events</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary">{stats?.totalWinners || 0}</p>
              <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">Completaram</p>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Ranking */}
      <div className="bg-surface-light dark:bg-surface-dark rounded-2xl border border-border-light dark:border-border-dark shadow-lg overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b border-border-light dark:border-border-dark">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
            <span className="material-symbols-outlined text-white">emoji_events</span>
          </div>
          <h2 className="font-bold text-text-light-primary dark:text-text-dark-primary">Top 10 Vencedores</h2>
        </div>

        {loading && (
          <div className="p-6">
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded-xl" />
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="text-center py-12">
            <span className="material-symbols-outlined text-red-500 text-5xl mb-4">error</span>
            <p className="text-red-500 font-medium">{error}</p>
          </div>
        )}

        {!loading && !error && ranking.length === 0 && (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <span className="material-symbols-outlined text-4xl text-slate-400">emoji_events</span>
            </div>
            <p className="text-lg font-medium text-text-light-primary dark:text-text-dark-primary mb-2">Nenhum vencedor ainda</p>
            <p className="text-text-light-secondary dark:text-text-dark-secondary mb-6">Seja o primeiro a completar o desafio!</p>
            <Link href="/playground/word-search" className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-semibold transition-all">
              <span className="material-symbols-outlined">play_arrow</span>
              Jogar agora
            </Link>
          </div>
        )}

        {!loading && !error && ranking.length > 0 && (
          <div className="divide-y divide-border-light dark:divide-border-dark">
            {ranking.map((entry) => {
              const medal = getMedalConfig(entry.position);
              return (
                <div key={entry.userId} className="flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="w-10 flex justify-center">
                    {medal ? (
                      <span className="text-2xl">{medal.emoji}</span>
                    ) : (
                      <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-sm font-bold">
                        {entry.position}
                      </span>
                    )}
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 overflow-hidden flex-shrink-0">
                    {entry.photoUrl ? (
                      <img src={entry.photoUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-emerald-500">person</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-text-light-primary dark:text-text-dark-primary truncate">
                      {entry.displayName}
                    </p>
                    <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                      {entry.wordsFound} {entry.wordsFound === 1 ? 'palavra' : 'palavras'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {formatTime(entry.timeInSeconds)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-5 border border-border-light dark:border-border-dark">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-emerald-500">info</span>
          </div>
          <div>
            <h3 className="font-semibold text-text-light-primary dark:text-text-dark-primary mb-2">Como funciona o ranking?</h3>
            <ul className="space-y-1 text-sm text-text-light-secondary dark:text-text-dark-secondary">
              <li>• Ordenado pelo menor tempo para completar</li>
              <li>• Apenas quem encontrou todas as palavras aparece</li>
              <li>• O ranking é resetado todos os dias à meia-noite</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RankingPage() {
  return <PagePlanGuard><RankingContent /></PagePlanGuard>;
}
