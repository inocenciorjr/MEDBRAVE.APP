'use client';

import React from 'react';

interface UserRanking {
  userId: string;
  userName: string;
  position: number;
  value: number;
  percentile: number;
}

interface RankingTableProps {
  title: string;
  subtitle?: string;
  top20: UserRanking[];
  currentUser: UserRanking;
  totalUsers: number;
  valueLabel: string;
  loading?: boolean;
}

export function RankingTable({
  title,
  subtitle,
  top20,
  currentUser,
  totalUsers,
  valueLabel,
  loading = false,
}: RankingTableProps) {
  if (loading) {
    return (
      <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-6 border border-border-light dark:border-border-dark">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-border-light dark:bg-border-dark rounded w-1/3"></div>
          <div className="space-y-3">
            {[...Array(10)].map((_, i) => (
              <div
                key={i}
                className="h-12 bg-border-light dark:bg-border-dark rounded"
              ></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const getMedalIcon = (position: number) => {
    switch (position) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return null;
    }
  };

  const isCurrentUser = (userId: string) => userId === currentUser.userId;

  return (
    <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-6 border border-border-light dark:border-border-dark">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-1">
          {title}
        </h3>
        {subtitle && (
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
            {subtitle}
          </p>
        )}
        <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-2">
          {totalUsers.toLocaleString('pt-BR')} usuários no ranking
        </p>
      </div>

      {/* TOP 20 */}
      <div className="space-y-2 mb-6">
        {top20.map((user) => (
          <div
            key={user.userId}
            className={`flex items-center justify-between p-3 rounded-lg transition-all duration-200 ${
              isCurrentUser(user.userId)
                ? 'bg-primary/10 border-2 border-primary'
                : 'bg-border-light/30 dark:bg-border-dark/30 hover:bg-border-light/50 dark:hover:bg-border-dark/50'
            }`}
          >
            <div className="flex items-center gap-3 flex-1">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                  user.position <= 3
                    ? 'bg-primary text-white'
                    : 'bg-border-light dark:bg-border-dark text-text-light-primary dark:text-text-dark-primary'
                }`}
              >
                {getMedalIcon(user.position) || user.position}
              </div>
              <div className="flex-1">
                <p
                  className={`font-medium ${
                    isCurrentUser(user.userId)
                      ? 'text-primary'
                      : 'text-text-light-primary dark:text-text-dark-primary'
                  }`}
                >
                  {isCurrentUser(user.userId) ? 'Você' : user.userName}
                </p>
                <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                  Top {user.percentile}%
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold text-text-light-primary dark:text-text-dark-primary">
                {user.value.toLocaleString('pt-BR', {
                  minimumFractionDigits: valueLabel.includes('%') ? 1 : 0,
                  maximumFractionDigits: valueLabel.includes('%') ? 1 : 0,
                })}
                {valueLabel}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Posição do usuário se não estiver no TOP 20 */}
      {currentUser.position > 20 && (
        <div className="pt-4 border-t border-border-light dark:border-border-dark">
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-3">
            Sua Posição
          </p>
          <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border-2 border-primary">
            <div className="flex items-center gap-3 flex-1">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white font-bold text-sm">
                {currentUser.position}
              </div>
              <div className="flex-1">
                <p className="font-medium text-primary">Você</p>
                <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                  Top {currentUser.percentile}%
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold text-text-light-primary dark:text-text-dark-primary">
                {currentUser.value.toLocaleString('pt-BR', {
                  minimumFractionDigits: valueLabel.includes('%') ? 1 : 0,
                  maximumFractionDigits: valueLabel.includes('%') ? 1 : 0,
                })}
                {valueLabel}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Mensagem motivacional */}
      {currentUser.position <= 10 && (
        <div className="mt-4 p-3 bg-primary/5 rounded-lg border border-primary/20">
          <p className="text-sm text-primary font-medium">
            🎉 Parabéns! Você está entre os {currentUser.position <= 3 ? '3' : '10'}{' '}
            melhores!
          </p>
        </div>
      )}
    </div>
  );
}
