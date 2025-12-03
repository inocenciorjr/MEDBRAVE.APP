'use client';

import { useState } from 'react';
import { formatPercentSimple } from '@/lib/utils/formatPercent';

interface GlobalRankingEntry {
  userId: string;
  userName: string;
  userEmail: string;
  userPhoto: string | null;
  isMentee: boolean;
  programTitle: string | null;
  totalSimuladosCompleted: number;
  totalQuestionsAnswered: number;
  totalCorrect: number;
  globalAccuracy: number;
  averageScore: number;
  totalTimeSpentSeconds: number;
  position: number;
  trend: 'up' | 'down' | 'stable';
}

interface GlobalRankingSectionProps {
  ranking: GlobalRankingEntry[];
  isLoading: boolean;
  onPeriodChange?: (period: 'all' | '30d' | '60d' | '90d') => void;
}

export function GlobalRankingSection({ ranking, isLoading, onPeriodChange }: GlobalRankingSectionProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | '30d' | '60d' | '90d'>('all');

  const handlePeriodChange = (period: 'all' | '30d' | '60d' | '90d') => {
    setSelectedPeriod(period);
    onPeriodChange?.(period);
  };

  const getMedalConfig = (position: number) => {
    switch (position) {
      case 1: return { emoji: '🥇', gradient: 'from-yellow-400 to-amber-500', border: 'border-yellow-400', shadow: 'shadow-yellow-500/40', size: 'w-24 h-24' };
      case 2: return { emoji: '🥈', gradient: 'from-slate-300 to-gray-400', border: 'border-slate-400', shadow: 'shadow-slate-500/40', size: 'w-20 h-20' };
      case 3: return { emoji: '🥉', gradient: 'from-orange-400 to-amber-600', border: 'border-orange-400', shadow: 'shadow-orange-500/40', size: 'w-18 h-18' };
      default: return null;
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 70) return 'text-emerald-600 dark:text-emerald-400';
    if (accuracy >= 50) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  const periods = [
    { id: 'all', label: 'Todo período' },
    { id: '30d', label: '30 dias' },
    { id: '60d', label: '60 dias' },
    { id: '90d', label: '90 dias' }
  ] as const;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse h-48 bg-gradient-to-r from-border-light to-border-light/50 
                      dark:from-border-dark dark:to-border-dark/50 rounded-2xl" />
        <div className="animate-pulse h-64 bg-gradient-to-r from-border-light to-border-light/50 
                      dark:from-border-dark dark:to-border-dark/50 rounded-2xl" />
      </div>
    );
  }

  if (ranking.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-100 
                      dark:from-slate-700 dark:to-slate-800 flex items-center justify-center">
          <span className="material-symbols-outlined text-5xl text-slate-400 dark:text-slate-500">
            leaderboard
          </span>
        </div>
        <p className="text-lg font-medium text-text-light-secondary dark:text-text-dark-secondary">
          Nenhum participante completou simulados ainda
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtro de Período */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 
                        flex items-center justify-center shadow-lg shadow-amber-500/30">
            <span className="material-symbols-outlined text-white">leaderboard</span>
          </div>
          <h4 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary">
            Ranking Global Cumulativo
          </h4>
        </div>
        
        <div className="flex gap-2">
          {periods.map((period) => (
            <button
              key={period.id}
              onClick={() => handlePeriodChange(period.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300
                ${selectedPeriod === period.id
                  ? 'bg-gradient-to-r from-primary to-violet-500 text-white shadow-lg shadow-primary/30'
                  : 'bg-background-light dark:bg-background-dark text-text-light-secondary dark:text-text-dark-secondary border-2 border-border-light dark:border-border-dark hover:border-primary/50'
                }`}
            >
              {period.label}
            </button>
          ))}
        </div>
      </div>

      {/* Top 3 Pódio */}
      {ranking.length >= 3 && (
        <div className="relative py-6">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent rounded-3xl" />
          
          <div className="relative grid grid-cols-3 gap-4 items-end">
            {/* 2º Lugar */}
            <div className="flex flex-col items-center animate-fadeIn" style={{ animationDelay: '100ms' }}>
              <div className="relative group">
                <div className={`${getMedalConfig(2)?.size} rounded-full overflow-hidden 
                              border-4 ${getMedalConfig(2)?.border}
                              shadow-xl ${getMedalConfig(2)?.shadow}
                              transition-all duration-300 group-hover:scale-110`}>
                  {ranking[1]?.userPhoto ? (
                    <img src={ranking[1].userPhoto} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${getMedalConfig(2)?.gradient}`}>
                      <span className="material-symbols-outlined text-3xl text-white">person</span>
                    </div>
                  )}
                </div>
                <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-3xl drop-shadow-lg">
                  {getMedalConfig(2)?.emoji}
                </span>
              </div>
              <div className="mt-5 text-center">
                <p className="font-bold text-text-light-primary dark:text-text-dark-primary text-sm truncate max-w-[120px]">
                  {ranking[1]?.userName}
                </p>
                <p className={`text-2xl font-bold ${getAccuracyColor(ranking[1]?.globalAccuracy || 0)}`}>
                  {formatPercentSimple(ranking[1]?.globalAccuracy)}
                </p>
                <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                  {ranking[1]?.totalSimuladosCompleted} simulados
                </p>
              </div>
              <div className="mt-2 h-16 w-full bg-gradient-to-t from-slate-300 to-slate-200 dark:from-slate-700 dark:to-slate-600 rounded-t-xl" />
            </div>

            {/* 1º Lugar */}
            <div className="flex flex-col items-center animate-fadeIn">
              <div className="relative group">
                <div className="absolute -inset-3 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-400 rounded-full blur-xl opacity-40 group-hover:opacity-60 transition-opacity" />
                <div className={`relative ${getMedalConfig(1)?.size} rounded-full overflow-hidden 
                              border-4 ${getMedalConfig(1)?.border}
                              shadow-2xl ${getMedalConfig(1)?.shadow}
                              transition-all duration-300 group-hover:scale-110`}>
                  {ranking[0]?.userPhoto ? (
                    <img src={ranking[0].userPhoto} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${getMedalConfig(1)?.gradient}`}>
                      <span className="material-symbols-outlined text-4xl text-white">person</span>
                    </div>
                  )}
                </div>
                <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-4xl drop-shadow-lg animate-bounce">
                  {getMedalConfig(1)?.emoji}
                </span>
              </div>
              <div className="mt-6 text-center">
                <p className="font-bold text-lg text-text-light-primary dark:text-text-dark-primary truncate max-w-[140px]">
                  {ranking[0]?.userName}
                </p>
                <p className={`text-3xl font-bold ${getAccuracyColor(ranking[0]?.globalAccuracy || 0)}`}>
                  {formatPercentSimple(ranking[0]?.globalAccuracy)}
                </p>
                <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                  {ranking[0]?.totalSimuladosCompleted} simulados
                </p>
              </div>
              <div className="mt-2 h-24 w-full bg-gradient-to-t from-yellow-400 to-amber-300 dark:from-yellow-600 dark:to-amber-500 rounded-t-xl shadow-lg shadow-yellow-500/30" />
            </div>

            {/* 3º Lugar */}
            <div className="flex flex-col items-center animate-fadeIn" style={{ animationDelay: '200ms' }}>
              <div className="relative group">
                <div className={`w-18 h-18 rounded-full overflow-hidden 
                              border-4 ${getMedalConfig(3)?.border}
                              shadow-xl ${getMedalConfig(3)?.shadow}
                              transition-all duration-300 group-hover:scale-110`}
                     style={{ width: '72px', height: '72px' }}>
                  {ranking[2]?.userPhoto ? (
                    <img src={ranking[2].userPhoto} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${getMedalConfig(3)?.gradient}`}>
                      <span className="material-symbols-outlined text-2xl text-white">person</span>
                    </div>
                  )}
                </div>
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-2xl drop-shadow-lg">
                  {getMedalConfig(3)?.emoji}
                </span>
              </div>
              <div className="mt-4 text-center">
                <p className="font-bold text-text-light-primary dark:text-text-dark-primary text-sm truncate max-w-[120px]">
                  {ranking[2]?.userName}
                </p>
                <p className={`text-xl font-bold ${getAccuracyColor(ranking[2]?.globalAccuracy || 0)}`}>
                  {formatPercentSimple(ranking[2]?.globalAccuracy)}
                </p>
                <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                  {ranking[2]?.totalSimuladosCompleted} simulados
                </p>
              </div>
              <div className="mt-2 h-12 w-full bg-gradient-to-t from-orange-400 to-amber-300 dark:from-orange-600 dark:to-amber-500 rounded-t-xl" />
            </div>
          </div>
        </div>
      )}

      {/* Lista Completa */}
      <div className="bg-gradient-to-br from-background-light to-surface-light dark:from-background-dark dark:to-surface-dark 
                    rounded-2xl overflow-hidden border-2 border-border-light dark:border-border-dark
                    shadow-xl dark:shadow-dark-xl">
        <div className="grid grid-cols-12 gap-4 p-4 bg-gradient-to-r from-primary/10 via-violet-500/10 to-primary/10 
                      text-xs font-bold text-text-light-secondary dark:text-text-dark-secondary uppercase tracking-wider">
          <div className="col-span-1">#</div>
          <div className="col-span-4">Participante</div>
          <div className="col-span-2 text-center">Simulados</div>
          <div className="col-span-2 text-center">Questões</div>
          <div className="col-span-2 text-center">Acurácia</div>
          <div className="col-span-1 text-center">Tempo</div>
        </div>

        <div className="divide-y divide-border-light/50 dark:divide-border-dark/50 max-h-[400px] overflow-y-auto">
          {ranking.map((entry, index) => {
            const medalConfig = getMedalConfig(entry.position);

            return (
              <div
                key={entry.userId}
                className={`grid grid-cols-12 gap-4 p-4 items-center transition-all duration-300 
                          hover:bg-primary/5 dark:hover:bg-primary/10 animate-fadeIn
                          ${index < 3 ? 'bg-gradient-to-r from-primary/5 via-transparent to-primary/5' : ''}`}
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <div className="col-span-1">
                  {medalConfig ? (
                    <span className="text-xl">{medalConfig.emoji}</span>
                  ) : (
                    <span className="w-8 h-8 flex items-center justify-center rounded-lg 
                                   bg-gradient-to-br from-border-light to-surface-light dark:from-border-dark dark:to-surface-dark
                                   text-sm font-bold shadow-sm">
                      {entry.position}
                    </span>
                  )}
                </div>

                <div className="col-span-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-violet-500/20 
                                overflow-hidden flex-shrink-0 border-2 border-primary/20 shadow-sm">
                    {entry.userPhoto ? (
                      <img src={entry.userPhoto} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-primary text-lg">person</span>
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-text-light-primary dark:text-text-dark-primary truncate text-sm">
                      {entry.userName}
                    </p>
                    <div className="flex items-center gap-1 flex-wrap">
                      {entry.isMentee && (
                        <span className="px-1.5 py-0.5 rounded text-xs font-bold
                                       bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700
                                       dark:from-blue-900/40 dark:to-cyan-900/40 dark:text-blue-400">
                          Mentorado
                        </span>
                      )}
                      {entry.programTitle && (
                        <span className="px-1.5 py-0.5 rounded text-xs font-bold
                                       bg-gradient-to-r from-purple-100 to-violet-100 text-purple-700
                                       dark:from-purple-900/40 dark:to-violet-900/40 dark:text-purple-400 truncate max-w-[80px]">
                          {entry.programTitle}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="col-span-2 text-center">
                  <span className="font-semibold text-text-light-primary dark:text-text-dark-primary">
                    {entry.totalSimuladosCompleted}
                  </span>
                </div>

                <div className="col-span-2 text-center">
                  <span className="text-sm">
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">{entry.totalCorrect}</span>
                    <span className="text-text-light-secondary dark:text-text-dark-secondary">/{entry.totalQuestionsAnswered}</span>
                  </span>
                </div>

                <div className="col-span-2 text-center">
                  <span className={`text-lg font-bold ${getAccuracyColor(entry.globalAccuracy)}`}>
                    {formatPercentSimple(entry.globalAccuracy)}
                  </span>
                </div>

                <div className="col-span-1 text-center">
                  <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                    {formatTime(entry.totalTimeSpentSeconds)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
