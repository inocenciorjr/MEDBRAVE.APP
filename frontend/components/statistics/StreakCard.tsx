'use client';

import React from 'react';

interface StreakCardProps {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
  loading?: boolean;
}

export function StreakCard({
  currentStreak,
  longestStreak,
  lastActivityDate,
  loading = false,
}: StreakCardProps) {
  if (loading) {
    return (
      <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-6 border border-border-light dark:border-border-dark">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-border-light dark:bg-border-dark rounded w-1/2"></div>
          <div className="h-20 bg-border-light dark:bg-border-dark rounded"></div>
        </div>
      </div>
    );
  }

  const getStreakMessage = () => {
    if (currentStreak === 0) {
      return 'Comece sua sequência hoje!';
    }
    if (currentStreak === 1) {
      return 'Continue estudando amanhã!';
    }
    if (currentStreak < 7) {
      return 'Você está indo bem!';
    }
    if (currentStreak < 30) {
      return 'Sequência impressionante!';
    }
    return 'Você é imparável! 🔥';
  };

  const getStreakColor = () => {
    if (currentStreak === 0) return 'text-text-light-secondary dark:text-text-dark-secondary';
    if (currentStreak < 7) return 'text-cyan-600 dark:text-cyan-400';
    if (currentStreak < 30) return 'text-primary';
    return 'text-rose-600 dark:text-rose-400';
  };

  const formatLastActivity = () => {
    if (!lastActivityDate) return 'Nunca';
    
    const date = new Date(lastActivityDate);
    const now = new Date();
    
    // Normalizar para meia-noite para comparar apenas datas
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const nowOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const diffTime = nowOnly.getTime() - dateOnly.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return 'Ontem';
    if (diffDays < 7) return `${diffDays} dias atrás`;
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-6 border border-border-light dark:border-border-dark hover:border-primary/50 transition-all duration-200 hover:shadow-lg">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-1">
            Sequência de Estudos
          </h3>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
            {getStreakMessage()}
          </p>
        </div>
        <div className="p-3 rounded-lg bg-primary/10">
          <span className="material-symbols-outlined text-2xl text-primary">
            local_fire_department
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Sequência Atual */}
        <div className="text-center p-4 rounded-lg bg-border-light/30 dark:bg-border-dark/30">
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-1">
            Sequência Atual
          </p>
          <p className={`text-4xl font-bold ${getStreakColor()}`}>
            {currentStreak}
          </p>
          <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-1">
            {currentStreak === 1 ? 'dia' : 'dias'}
          </p>
        </div>

        {/* Melhor Sequência */}
        <div className="text-center p-4 rounded-lg bg-border-light/30 dark:bg-border-dark/30">
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-1">
            Melhor Sequência
          </p>
          <p className="text-4xl font-bold text-primary">
            {longestStreak}
          </p>
          <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-1">
            {longestStreak === 1 ? 'dia' : 'dias'}
          </p>
        </div>
      </div>

      {/* Última Atividade */}
      <div className="mt-4 pt-4 border-t border-border-light dark:border-border-dark">
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-light-secondary dark:text-text-dark-secondary">
            Última atividade
          </span>
          <span className="font-medium text-text-light-primary dark:text-text-dark-primary">
            {formatLastActivity()}
          </span>
        </div>
      </div>
    </div>
  );
}
