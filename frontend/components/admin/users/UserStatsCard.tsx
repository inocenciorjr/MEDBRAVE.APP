'use client';

import React from 'react';
import type { UserStatistics } from '@/types/admin/user';

interface UserStatsCardProps {
  stats: UserStatistics;
  loading?: boolean;
}

export function UserStatsCard({ stats, loading }: UserStatsCardProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-24 bg-surface-light dark:bg-surface-dark rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  const calculateAccuracy = () => {
    const total = stats.totalQuestions;
    if (total === 0) return 0;
    return Math.round((stats.correctAnswers / total) * 100);
  };

  const formatStudyTime = () => {
    const hours = Math.floor(stats.studyTime / 3600);
    const minutes = Math.floor((stats.studyTime % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    }
    return `${minutes}min`;
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 80) return 'text-green-600 dark:text-green-400';
    if (accuracy >= 60) return 'text-blue-600 dark:text-blue-400';
    if (accuracy >= 40) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getStreakColor = (streak: number) => {
    if (streak >= 30) return 'text-purple-600 dark:text-purple-400';
    if (streak >= 14) return 'text-green-600 dark:text-green-400';
    if (streak >= 7) return 'text-blue-600 dark:text-blue-400';
    return 'text-orange-600 dark:text-orange-400';
  };

  const accuracy = calculateAccuracy();

  const statCards = [
    {
      label: 'Questões Respondidas',
      value: stats.totalQuestions.toLocaleString('pt-BR'),
      icon: 'quiz',
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      label: 'Acertos',
      value: stats.correctAnswers.toLocaleString('pt-BR'),
      icon: 'check_circle',
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
    },
    {
      label: 'Erros',
      value: stats.incorrectAnswers.toLocaleString('pt-BR'),
      icon: 'cancel',
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
    },
    {
      label: 'Taxa de Acerto',
      value: `${accuracy}%`,
      icon: 'percent',
      color: getAccuracyColor(accuracy),
      bgColor: accuracy >= 60 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-orange-50 dark:bg-orange-900/20',
    },
    {
      label: 'Tempo de Estudo',
      value: formatStudyTime(),
      icon: 'schedule',
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    },
    {
      label: 'Sequência (Streak)',
      value: `${stats.streak} dias`,
      icon: 'local_fire_department',
      color: getStreakColor(stats.streak),
      bgColor: stats.streak >= 7 ? 'bg-orange-50 dark:bg-orange-900/20' : 'bg-gray-50 dark:bg-gray-900/20',
    },
    {
      label: 'Última Atividade',
      value: stats.lastActivity 
        ? new Date(stats.lastActivity).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
        : 'Nunca',
      icon: 'event',
      color: 'text-indigo-600 dark:text-indigo-400',
      bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
    },
    {
      label: 'Média Diária',
      value: stats.streak > 0 
        ? Math.round(stats.totalQuestions / stats.streak).toLocaleString('pt-BR')
        : '0',
      icon: 'trending_up',
      color: 'text-teal-600 dark:text-teal-400',
      bgColor: 'bg-teal-50 dark:bg-teal-900/20',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <div
            key={index}
            className="p-4 bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                <span className={`material-symbols-outlined text-xl ${stat.color}`}>
                  {stat.icon}
                </span>
              </div>
            </div>
            
            <div>
              <p className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary mb-1">
                {stat.value}
              </p>
              <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                {stat.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Progress Bars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Accuracy Progress */}
        <div className="p-4 bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
              Taxa de Acerto
            </span>
            <span className={`text-sm font-bold ${getAccuracyColor(accuracy)}`}>
              {accuracy}%
            </span>
          </div>
          <div className="w-full h-2 bg-background-light dark:bg-background-dark rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                accuracy >= 80 ? 'bg-green-500' :
                accuracy >= 60 ? 'bg-blue-500' :
                accuracy >= 40 ? 'bg-orange-500' : 'bg-red-500'
              }`}
              style={{ width: `${accuracy}%` }}
            />
          </div>
        </div>

        {/* Streak Progress */}
        <div className="p-4 bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
              Sequência de Estudos
            </span>
            <span className={`text-sm font-bold ${getStreakColor(stats.streak)}`}>
              {stats.streak} dias
            </span>
          </div>
          <div className="w-full h-2 bg-background-light dark:bg-background-dark rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                stats.streak >= 30 ? 'bg-purple-500' :
                stats.streak >= 14 ? 'bg-green-500' :
                stats.streak >= 7 ? 'bg-blue-500' : 'bg-orange-500'
              }`}
              style={{ width: `${Math.min((stats.streak / 30) * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Performance Summary */}
      <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-2xl">
            insights
          </span>
          <div className="flex-1">
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Resumo de Performance
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-blue-700 dark:text-blue-300 mb-1">
                  <strong>Nível de Engajamento:</strong>
                </p>
                <p className="text-blue-800 dark:text-blue-200">
                  {stats.totalQuestions > 100 ? 'Alto' : stats.totalQuestions > 50 ? 'Médio' : 'Baixo'}
                </p>
              </div>
              <div>
                <p className="text-blue-700 dark:text-blue-300 mb-1">
                  <strong>Consistência:</strong>
                </p>
                <p className="text-blue-800 dark:text-blue-200">
                  {stats.streak >= 14 ? 'Excelente' : stats.streak >= 7 ? 'Boa' : 'Pode melhorar'}
                </p>
              </div>
              <div>
                <p className="text-blue-700 dark:text-blue-300 mb-1">
                  <strong>Desempenho:</strong>
                </p>
                <p className="text-blue-800 dark:text-blue-200">
                  {accuracy >= 80 ? 'Excelente' : accuracy >= 60 ? 'Bom' : 'Regular'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
