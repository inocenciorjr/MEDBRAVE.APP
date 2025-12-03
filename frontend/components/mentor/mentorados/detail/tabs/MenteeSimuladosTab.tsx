'use client';

import { BookOpen, Clock, CheckCircle, Trophy } from 'lucide-react';
import { MenteePerformanceData } from '@/lib/services/mentorAnalyticsService';

interface MenteeSimuladosTabProps {
  performance: MenteePerformanceData | null;
}

export function MenteeSimuladosTab({ performance }: MenteeSimuladosTabProps) {
  if (!performance?.evolution?.length) {
    return (
      <div className="relative overflow-hidden bg-gradient-to-br from-surface-light via-surface-light to-emerald-500/5 
                    dark:from-surface-dark dark:via-surface-dark dark:to-emerald-500/10 
                    rounded-2xl p-16 border-2 border-border-light dark:border-border-dark
                    shadow-xl dark:shadow-dark-xl text-center">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-cyan-500/10 to-transparent rounded-full blur-3xl" />
        
        <div className="relative">
          <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-100 
                        dark:from-slate-700 dark:to-slate-800 flex items-center justify-center">
            <BookOpen className="w-12 h-12 text-slate-400 dark:text-slate-500" />
          </div>
          <h3 className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary mb-3">
            Nenhum simulado completado
          </h3>
          <p className="text-text-light-secondary dark:text-text-dark-secondary max-w-md mx-auto">
            O histórico de simulados aparecerá quando o mentorado completar suas avaliações.
          </p>
        </div>
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 70) return {
      bg: 'bg-emerald-100 dark:bg-emerald-900/30',
      text: 'text-emerald-700 dark:text-emerald-400',
      border: 'border-emerald-200 dark:border-emerald-800/50',
      gradient: 'from-emerald-500 to-green-500'
    };
    if (score >= 50) return {
      bg: 'bg-amber-100 dark:bg-amber-900/30',
      text: 'text-amber-700 dark:text-amber-400',
      border: 'border-amber-200 dark:border-amber-800/50',
      gradient: 'from-amber-500 to-orange-500'
    };
    return {
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-700 dark:text-red-400',
      border: 'border-red-200 dark:border-red-800/50',
      gradient: 'from-red-500 to-rose-500'
    };
  };

  // Calculate stats
  const totalSimulados = performance.evolution.length;
  const avgScore = performance.evolution.reduce((acc, s) => acc + s.score, 0) / totalSimulados;
  const bestScore = Math.max(...performance.evolution.map(s => s.score));
  const totalTime = performance.evolution.reduce((acc, s) => acc + s.timeSpentSeconds, 0);

  return (
    <div className="space-y-6">
      {/* Section Title */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 
                      flex items-center justify-center shadow-lg shadow-emerald-500/30">
          <BookOpen className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary">
            Histórico de Simulados
          </h2>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
            {totalSimulados} simulado{totalSimulados !== 1 ? 's' : ''} completado{totalSimulados !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="relative overflow-hidden bg-gradient-to-br from-surface-light to-blue-500/5 
                      dark:from-surface-dark dark:to-blue-500/10 
                      rounded-xl p-4 border-2 border-border-light dark:border-border-dark
                      shadow-lg hover:shadow-xl transition-all duration-300 group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 
                          flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary">
                {totalSimulados}
              </p>
              <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                Completados
              </p>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden bg-gradient-to-br from-surface-light to-violet-500/5 
                      dark:from-surface-dark dark:to-violet-500/10 
                      rounded-xl p-4 border-2 border-border-light dark:border-border-dark
                      shadow-lg hover:shadow-xl transition-all duration-300 group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 
                          flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary">
                {Math.round(avgScore)}%
              </p>
              <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                Média Geral
              </p>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden bg-gradient-to-br from-surface-light to-amber-500/5 
                      dark:from-surface-dark dark:to-amber-500/10 
                      rounded-xl p-4 border-2 border-border-light dark:border-border-dark
                      shadow-lg hover:shadow-xl transition-all duration-300 group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 
                          flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary">
                {Math.round(bestScore)}%
              </p>
              <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                Melhor Nota
              </p>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden bg-gradient-to-br from-surface-light to-pink-500/5 
                      dark:from-surface-dark dark:to-pink-500/10 
                      rounded-xl p-4 border-2 border-border-light dark:border-border-dark
                      shadow-lg hover:shadow-xl transition-all duration-300 group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-rose-500 
                          flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary">
                {Math.round(totalTime / 60)}m
              </p>
              <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                Tempo Total
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Simulados Table */}
      <div className="relative overflow-hidden bg-gradient-to-br from-surface-light via-surface-light to-cyan-500/5 
                    dark:from-surface-dark dark:via-surface-dark dark:to-cyan-500/10 
                    rounded-2xl border-2 border-border-light dark:border-border-dark
                    shadow-xl dark:shadow-dark-xl transition-all duration-300 hover:shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-cyan-500/10 to-transparent rounded-full blur-3xl" />
        
        <div className="relative overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-background-light to-surface-light 
                           dark:from-background-dark dark:to-surface-dark
                           border-b-2 border-border-light dark:border-border-dark">
                <th className="px-6 py-4 text-left text-sm font-bold text-text-light-primary dark:text-text-dark-primary uppercase tracking-wider">
                  Simulado
                </th>
                <th className="px-6 py-4 text-center text-sm font-bold text-text-light-primary dark:text-text-dark-primary uppercase tracking-wider">
                  Pontuação
                </th>
                <th className="px-6 py-4 text-center text-sm font-bold text-text-light-primary dark:text-text-dark-primary uppercase tracking-wider">
                  Acertos
                </th>
                <th className="px-6 py-4 text-center text-sm font-bold text-text-light-primary dark:text-text-dark-primary uppercase tracking-wider">
                  Tempo
                </th>
                <th className="px-6 py-4 text-right text-sm font-bold text-text-light-primary dark:text-text-dark-primary uppercase tracking-wider">
                  Data
                </th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-border-light dark:divide-border-dark">
              {performance.evolution.map((sim, idx) => {
                const scoreConfig = getScoreColor(sim.score);
                return (
                  <tr 
                    key={idx} 
                    className="hover:bg-gradient-to-r hover:from-primary/5 hover:to-transparent
                             transition-all duration-300 group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${scoreConfig.gradient}
                                      flex items-center justify-center shadow-md
                                      group-hover:scale-110 transition-transform`}>
                          <BookOpen className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-semibold text-text-light-primary dark:text-text-dark-primary
                                       group-hover:text-primary transition-colors">
                          {sim.simuladoName}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold
                                      ${scoreConfig.bg} ${scoreConfig.text} border ${scoreConfig.border}
                                      shadow-sm transition-all duration-200 hover:scale-105`}>
                        {Math.round(sim.score)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-medium text-text-light-primary dark:text-text-dark-primary">
                        {sim.correctAnswers}
                        <span className="text-text-light-secondary dark:text-text-dark-secondary">
                          /{sim.totalQuestions}
                        </span>
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Clock className="w-4 h-4 text-text-light-secondary dark:text-text-dark-secondary" />
                        <span className="font-medium text-text-light-secondary dark:text-text-dark-secondary">
                          {Math.round(sim.timeSpentSeconds / 60)} min
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary">
                        {sim.completedAt ? new Date(sim.completedAt).toLocaleDateString('pt-BR') : '-'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
