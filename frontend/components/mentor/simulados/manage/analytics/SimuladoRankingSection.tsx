'use client';

import { useRouter } from 'next/navigation';
import { formatPercentSimple } from '@/lib/utils/formatPercent';

interface RankingEntry {
  userId: string;
  userName: string;
  userEmail: string;
  userPhoto: string | null;
  score: number;
  correctCount: number;
  incorrectCount: number;
  timeSpentSeconds: number;
  completedAt: string;
  isMentee: boolean;
  mentorshipTitle?: string;
  programTitle?: string;
}

interface SimuladoRankingSectionProps {
  simuladoId: string;
  ranking: RankingEntry[];
}

export function SimuladoRankingSection({ simuladoId, ranking }: SimuladoRankingSectionProps) {
  const router = useRouter();

  const getMedalConfig = (position: number) => {
    switch (position) {
      case 1: return { emoji: '🥇', gradient: 'from-yellow-400 to-amber-500', border: 'border-yellow-400', shadow: 'shadow-yellow-500/40', size: 'w-28 h-28' };
      case 2: return { emoji: '🥈', gradient: 'from-slate-300 to-gray-400', border: 'border-slate-400', shadow: 'shadow-slate-500/40', size: 'w-24 h-24' };
      case 3: return { emoji: '🥉', gradient: 'from-orange-400 to-amber-600', border: 'border-orange-400', shadow: 'shadow-orange-500/40', size: 'w-20 h-20' };
      default: return null;
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const handleUserClick = (userId: string) => {
    router.push(`/mentor/simulados/${simuladoId}/user/${userId}`);
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-emerald-600 dark:text-emerald-400';
    if (score >= 50) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

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
          Nenhum participante finalizou o simulado ainda
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top 3 Destaque - Pódio */}
      {ranking.length >= 3 && (
        <div className="relative py-8">
          {/* Background decoration */}
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
                      <span className="material-symbols-outlined text-4xl text-white">person</span>
                    </div>
                  )}
                </div>
                <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-4xl drop-shadow-lg">
                  {getMedalConfig(2)?.emoji}
                </span>
              </div>
              <div className="mt-6 text-center">
                <p className="font-bold text-text-light-primary dark:text-text-dark-primary">
                  {ranking[1]?.userName}
                </p>
                <p className={`text-3xl font-bold ${getScoreColor(ranking[1]?.score || 0)}`}>
                  {formatPercentSimple(ranking[1]?.score)}
                </p>
              </div>
              <div className="mt-2 h-20 w-full bg-gradient-to-t from-slate-300 to-slate-200 dark:from-slate-700 dark:to-slate-600 rounded-t-xl" />
            </div>

            {/* 1º Lugar */}
            <div className="flex flex-col items-center animate-fadeIn">
              <div className="relative group">
                <div className="absolute -inset-4 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-400 rounded-full blur-xl opacity-40 group-hover:opacity-60 transition-opacity" />
                <div className={`relative ${getMedalConfig(1)?.size} rounded-full overflow-hidden 
                              border-4 ${getMedalConfig(1)?.border}
                              shadow-2xl ${getMedalConfig(1)?.shadow}
                              transition-all duration-300 group-hover:scale-110`}>
                  {ranking[0]?.userPhoto ? (
                    <img src={ranking[0].userPhoto} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${getMedalConfig(1)?.gradient}`}>
                      <span className="material-symbols-outlined text-5xl text-white">person</span>
                    </div>
                  )}
                </div>
                <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-5xl drop-shadow-lg animate-bounce">
                  {getMedalConfig(1)?.emoji}
                </span>
              </div>
              <div className="mt-8 text-center">
                <p className="font-bold text-lg text-text-light-primary dark:text-text-dark-primary">
                  {ranking[0]?.userName}
                </p>
                <p className={`text-4xl font-bold ${getScoreColor(ranking[0]?.score || 0)}`}>
                  {formatPercentSimple(ranking[0]?.score)}
                </p>
              </div>
              <div className="mt-2 h-28 w-full bg-gradient-to-t from-yellow-400 to-amber-300 dark:from-yellow-600 dark:to-amber-500 rounded-t-xl shadow-lg shadow-yellow-500/30" />
            </div>

            {/* 3º Lugar */}
            <div className="flex flex-col items-center animate-fadeIn" style={{ animationDelay: '200ms' }}>
              <div className="relative group">
                <div className={`${getMedalConfig(3)?.size} rounded-full overflow-hidden 
                              border-4 ${getMedalConfig(3)?.border}
                              shadow-xl ${getMedalConfig(3)?.shadow}
                              transition-all duration-300 group-hover:scale-110`}>
                  {ranking[2]?.userPhoto ? (
                    <img src={ranking[2].userPhoto} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${getMedalConfig(3)?.gradient}`}>
                      <span className="material-symbols-outlined text-3xl text-white">person</span>
                    </div>
                  )}
                </div>
                <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-3xl drop-shadow-lg">
                  {getMedalConfig(3)?.emoji}
                </span>
              </div>
              <div className="mt-5 text-center">
                <p className="font-bold text-text-light-primary dark:text-text-dark-primary">
                  {ranking[2]?.userName}
                </p>
                <p className={`text-2xl font-bold ${getScoreColor(ranking[2]?.score || 0)}`}>
                  {formatPercentSimple(ranking[2]?.score)}
                </p>
              </div>
              <div className="mt-2 h-14 w-full bg-gradient-to-t from-orange-400 to-amber-300 dark:from-orange-600 dark:to-amber-500 rounded-t-xl" />
            </div>
          </div>
        </div>
      )}

      {/* Lista Completa */}
      <div className="bg-gradient-to-br from-background-light to-surface-light dark:from-background-dark dark:to-surface-dark 
                    rounded-2xl overflow-hidden border-2 border-border-light dark:border-border-dark
                    shadow-xl dark:shadow-dark-xl">
        {/* Header */}
        <div className="grid grid-cols-12 gap-4 p-5 bg-gradient-to-r from-primary/10 via-violet-500/10 to-primary/10 
                      text-sm font-bold text-text-light-secondary dark:text-text-dark-secondary uppercase tracking-wider">
          <div className="col-span-1">#</div>
          <div className="col-span-6">Participante</div>
          <div className="col-span-2 text-center">Nota</div>
          <div className="col-span-1 text-center">Acertos</div>
          <div className="col-span-1 text-center">Tempo</div>
          <div className="col-span-1"></div>
        </div>

        <div className="divide-y divide-border-light/50 dark:divide-border-dark/50">
          {ranking.map((entry, index) => {
            const medalConfig = getMedalConfig(index + 1);

            return (
              <div
                key={entry.userId}
                onClick={() => handleUserClick(entry.userId)}
                className={`
                  grid grid-cols-12 gap-4 p-5 items-center cursor-pointer 
                  transition-all duration-300 hover:bg-primary/5 dark:hover:bg-primary/10
                  hover:scale-[1.01] group animate-fadeIn
                  ${index < 3 ? 'bg-gradient-to-r from-primary/5 via-transparent to-primary/5' : ''}
                `}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Posição */}
                <div className="col-span-1">
                  {medalConfig ? (
                    <span className="text-2xl">{medalConfig.emoji}</span>
                  ) : (
                    <span className="w-10 h-10 flex items-center justify-center rounded-xl 
                                   bg-gradient-to-br from-border-light to-surface-light dark:from-border-dark dark:to-surface-dark
                                   text-sm font-bold shadow-md">
                      {index + 1}
                    </span>
                  )}
                </div>

                {/* Participante */}
                <div className="col-span-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-violet-500/20 
                                overflow-hidden flex-shrink-0 border-2 border-primary/20 shadow-md
                                group-hover:shadow-lg group-hover:border-primary/40 transition-all">
                    {entry.userPhoto ? (
                      <img src={entry.userPhoto} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-primary text-xl">person</span>
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-text-light-primary dark:text-text-dark-primary truncate
                                group-hover:text-primary transition-colors">
                      {entry.userName}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {entry.isMentee && (
                        <span className="px-2 py-0.5 rounded-md text-xs font-bold
                                       bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700
                                       dark:from-blue-900/40 dark:to-cyan-900/40 dark:text-blue-400
                                       border border-blue-200 dark:border-blue-800/50">
                          Mentorado
                        </span>
                      )}
                      {entry.programTitle && (
                        <span className="px-2 py-0.5 rounded-md text-xs font-bold
                                       bg-gradient-to-r from-purple-100 to-violet-100 text-purple-700
                                       dark:from-purple-900/40 dark:to-violet-900/40 dark:text-purple-400
                                       border border-purple-200 dark:border-purple-800/50">
                          {entry.programTitle}
                        </span>
                      )}
                      {!entry.isMentee && (
                        <span className="px-2 py-0.5 rounded-md text-xs font-bold
                                       bg-slate-100 text-slate-600
                                       dark:bg-slate-800 dark:text-slate-400">
                          Externo
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Nota */}
                <div className="col-span-2 text-center">
                  <span className={`text-xl font-bold ${getScoreColor(entry.score)}`}>
                    {formatPercentSimple(entry.score)}
                  </span>
                </div>

                {/* Acertos */}
                <div className="col-span-1 text-center">
                  <span className="px-2 py-1 rounded-lg bg-background-light dark:bg-background-dark
                                 text-text-light-primary dark:text-text-dark-primary font-semibold text-sm
                                 border border-border-light dark:border-border-dark">
                    {entry.correctCount}/{entry.correctCount + entry.incorrectCount}
                  </span>
                </div>

                {/* Tempo */}
                <div className="col-span-1 text-center">
                  <span className="text-text-light-secondary dark:text-text-dark-secondary font-medium text-sm">
                    {formatTime(entry.timeSpentSeconds)}
                  </span>
                </div>

                {/* Ação */}
                <div className="col-span-1 text-right">
                  <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary
                                 group-hover:text-primary group-hover:translate-x-1 transition-all">
                    chevron_right
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
