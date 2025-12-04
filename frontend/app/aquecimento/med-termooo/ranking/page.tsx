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
  attempts: number;
  timeInSeconds: number;
  completedAt: string;
}

interface DailyStats {
  totalPlayers: number;
  totalWinners: number;
  bestTime: number | null;
  averageAttempts: number;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

const getMedalConfig = (position: number) => {
  switch (position) {
    case 1: return { emoji: '🥇', gradient: 'from-yellow-400 to-amber-500', border: 'border-yellow-400', shadow: 'shadow-yellow-500/40' };
    case 2: return { emoji: '🥈', gradient: 'from-slate-300 to-gray-400', border: 'border-slate-400', shadow: 'shadow-slate-500/40' };
    case 3: return { emoji: '🥉', gradient: 'from-orange-400 to-amber-600', border: 'border-orange-400', shadow: 'shadow-orange-500/40' };
    default: return null;
  }
};

const getAttemptsColor = (attempts: number) => {
  if (attempts <= 2) return 'text-emerald-600 dark:text-emerald-400';
  if (attempts <= 4) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
};

function RankingContent() {
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [stats, setStats] = useState<DailyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRanking = async () => {
      try {
        const response = await fetchWithAuth('/games/med-termooo/ranking');
        if (!response.ok) throw new Error('Erro ao carregar ranking');
        const data = await response.json();
        setRanking(data.data?.ranking || data.data || []);
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

  const summaryCards = [
    { 
      key: 'players', 
      label: 'Jogadores Hoje', 
      value: stats?.totalPlayers || 0,
      icon: 'group',
      suffix: ''
    },
    { 
      key: 'winners', 
      label: 'Completaram', 
      value: stats?.totalWinners || 0,
      icon: 'emoji_events',
      suffix: ''
    },
    { 
      key: 'time', 
      label: 'Melhor Tempo', 
      value: stats?.bestTime ? formatTime(stats.bestTime) : '-',
      icon: 'timer',
      suffix: ''
    },
    { 
      key: 'attempts', 
      label: 'Média Tentativas', 
      value: stats?.averageAttempts ? stats.averageAttempts.toFixed(1) : '-',
      icon: 'target',
      suffix: ''
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/aquecimento/med-termooo" className="p-2 rounded-lg hover:bg-primary/10 transition-colors">
            <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary">arrow_back</span>
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-xl shadow-amber-500/30">
              <span className="material-symbols-outlined text-white text-3xl">leaderboard</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary">Ranking do Dia</h1>
              <p className="text-text-light-secondary dark:text-text-dark-secondary">MED TERMOOO</p>
            </div>
          </div>
        </div>
        <Link href="/aquecimento/med-termooo" className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-xl font-semibold transition-all shadow-lg shadow-primary/30">
          <span className="material-symbols-outlined">play_arrow</span>
          Jogar
        </Link>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <div 
            key={card.key}
            className="relative overflow-hidden bg-gradient-to-br from-surface-light via-surface-light to-primary/5 
                      dark:from-surface-dark dark:via-surface-dark dark:to-primary/10 
                      rounded-2xl p-5 border-2 border-border-light dark:border-border-dark
                      shadow-xl dark:shadow-dark-xl transition-all duration-300 hover:shadow-2xl hover:scale-[1.02]
                      group"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-primary/10 to-transparent opacity-10 rounded-full blur-2xl 
                          group-hover:opacity-20 transition-opacity duration-300" />
            
            <div className="relative flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 
                            flex items-center justify-center shadow-lg
                            group-hover:scale-110 transition-transform duration-300">
                <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary text-xl">{card.icon}</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary">
                  {card.value}{card.suffix}
                </p>
                <p className="text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary">
                  {card.label}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Container - Full Width */}
      <div className="relative overflow-hidden bg-gradient-to-br from-surface-light via-surface-light to-primary/5 dark:from-surface-dark dark:via-surface-dark dark:to-primary/10 rounded-2xl border-2 border-border-light dark:border-border-dark shadow-xl dark:shadow-dark-xl">
        
        {/* Tab Header */}
        <div className="flex items-center gap-3 p-4 border-b-2 border-border-light dark:border-border-dark">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
            <span className="material-symbols-outlined text-white">emoji_events</span>
          </div>
          <h2 className="font-bold text-text-light-primary dark:text-text-dark-primary">Top 10 Vencedores</h2>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading && (
            <div className="space-y-4">
              <div className="animate-pulse h-48 bg-gradient-to-r from-border-light to-border-light/50 dark:from-border-dark dark:to-border-dark/50 rounded-2xl" />
              <div className="animate-pulse h-64 bg-gradient-to-r from-border-light to-border-light/50 dark:from-border-dark dark:to-border-dark/50 rounded-2xl" />
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
              <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-100 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center">
                <span className="material-symbols-outlined text-5xl text-slate-400 dark:text-slate-500">emoji_events</span>
              </div>
              <p className="text-lg font-medium text-text-light-primary dark:text-text-dark-primary mb-2">Nenhum vencedor ainda</p>
              <p className="text-text-light-secondary dark:text-text-dark-secondary mb-6">Seja o primeiro a acertar o termo do dia!</p>
              <Link href="/aquecimento/med-termooo" className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-primary/30">
                <span className="material-symbols-outlined">play_arrow</span>
                Jogar agora
              </Link>
            </div>
          )}

          {!loading && !error && ranking.length > 0 && (
            <div className="space-y-6">
              {/* Pódio Top 3 */}
              {ranking.length >= 3 && (
                <div className="relative py-6">
                  <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent rounded-3xl" />
                  <div className="relative grid grid-cols-3 gap-4 items-end max-w-lg mx-auto">
                    <PodiumPlace entry={ranking[1]} position={2} />
                    <PodiumPlace entry={ranking[0]} position={1} />
                    <PodiumPlace entry={ranking[2]} position={3} />
                  </div>
                </div>
              )}

              {/* Lista Completa */}
              <div className="bg-gradient-to-br from-background-light to-surface-light dark:from-background-dark dark:to-surface-dark rounded-2xl overflow-hidden border-2 border-border-light dark:border-border-dark">
                <div className="grid grid-cols-12 gap-4 p-4 bg-gradient-to-r from-primary/10 via-violet-500/10 to-primary/10 text-xs font-bold text-text-light-secondary dark:text-text-dark-secondary uppercase tracking-wider">
                  <div className="col-span-1">#</div>
                  <div className="col-span-6">Jogador</div>
                  <div className="col-span-2 text-center">Tentativas</div>
                  <div className="col-span-3 text-center">Tempo</div>
                </div>
                <div className="divide-y divide-border-light/50 dark:divide-border-dark/50 max-h-[400px] overflow-y-auto">
                  {ranking.map((entry, index) => (
                    <RankingRow key={entry.userId} entry={entry} index={index} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-5 border border-border-light dark:border-border-dark">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-primary">info</span>
          </div>
          <div>
            <h3 className="font-semibold text-text-light-primary dark:text-text-dark-primary mb-2">Como funciona o ranking?</h3>
            <ul className="space-y-1 text-sm text-text-light-secondary dark:text-text-dark-secondary">
              <li>• Primeiro critério: menor número de tentativas</li>
              <li>• Segundo critério: menor tempo para completar</li>
              <li>• O ranking é resetado todos os dias à meia-noite</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function PodiumPlace({ entry, position }: { entry: RankingEntry; position: number }) {
  const config = getMedalConfig(position);
  const sizes = { 1: { avatar: 'w-20 h-20', pedestal: 'h-20' }, 2: { avatar: 'w-16 h-16', pedestal: 'h-14' }, 3: { avatar: 'w-14 h-14', pedestal: 'h-10' } };
  const size = sizes[position as 1 | 2 | 3];
  const pedestalColors = { 1: 'from-yellow-400 to-amber-300 dark:from-yellow-600 dark:to-amber-500', 2: 'from-slate-300 to-slate-200 dark:from-slate-700 dark:to-slate-600', 3: 'from-orange-400 to-amber-300 dark:from-orange-600 dark:to-amber-500' };

  return (
    <div className="flex flex-col items-center">
      <div className="relative group">
        {position === 1 && <div className="absolute -inset-2 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-400 rounded-full blur-lg opacity-40" />}
        <div className={`relative ${size.avatar} rounded-full overflow-hidden border-4 ${config?.border} shadow-xl transition-all duration-300 group-hover:scale-110`}>
          {entry?.photoUrl ? (
            <img src={entry.photoUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${config?.gradient}`}>
              <span className="material-symbols-outlined text-white text-2xl">person</span>
            </div>
          )}
        </div>
        <span className={`absolute -bottom-1 left-1/2 -translate-x-1/2 drop-shadow-lg ${position === 1 ? 'text-3xl' : 'text-2xl'}`}>{config?.emoji}</span>
      </div>
      <div className="mt-4 text-center">
        <p className="font-bold text-text-light-primary dark:text-text-dark-primary truncate max-w-[100px] text-sm">{entry?.displayName}</p>
        <p className={`font-bold ${getAttemptsColor(entry?.attempts || 6)} ${position === 1 ? 'text-xl' : 'text-lg'}`}>{entry?.attempts} {entry?.attempts === 1 ? 'tent.' : 'tent.'}</p>
        <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">{formatTime(entry?.timeInSeconds || 0)}</p>
      </div>
      <div className={`mt-2 ${size.pedestal} w-full bg-gradient-to-t ${pedestalColors[position as 1 | 2 | 3]} rounded-t-lg`} />
    </div>
  );
}

function RankingRow({ entry, index }: { entry: RankingEntry; index: number }) {
  const medalConfig = getMedalConfig(entry.position);
  return (
    <div className={`grid grid-cols-12 gap-4 p-4 items-center transition-all duration-300 hover:bg-primary/5 dark:hover:bg-primary/10 ${index < 3 ? 'bg-gradient-to-r from-primary/5 via-transparent to-primary/5' : ''}`}>
      <div className="col-span-1">
        {medalConfig ? <span className="text-xl">{medalConfig.emoji}</span> : <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-border-light dark:bg-border-dark text-sm font-bold">{entry.position}</span>}
      </div>
      <div className="col-span-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-violet-500/20 overflow-hidden flex-shrink-0 border-2 border-primary/20">
          {entry.photoUrl ? <img src={entry.photoUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <div className="w-full h-full flex items-center justify-center"><span className="material-symbols-outlined text-primary text-lg">person</span></div>}
        </div>
        <p className="font-semibold text-text-light-primary dark:text-text-dark-primary truncate">{entry.displayName}</p>
      </div>
      <div className="col-span-2 text-center">
        <span className={`text-lg font-bold ${getAttemptsColor(entry.attempts)}`}>{entry.attempts}/6</span>
      </div>
      <div className="col-span-3 text-center">
        <span className="text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary">{formatTime(entry.timeInSeconds)}</span>
      </div>
    </div>
  );
}

export default function RankingPage() {
  return <PagePlanGuard><RankingContent /></PagePlanGuard>;
}
