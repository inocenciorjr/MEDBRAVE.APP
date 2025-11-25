'use client';

import React from 'react';

export type StatsColor = 'blue' | 'green' | 'purple' | 'orange' | 'red';

export interface AdminStatsProps {
  title: string;
  value: number | string;
  icon: string;
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
  color?: StatsColor;
  className?: string;
}

const colorClasses: Record<StatsColor, { bg: string; icon: string }> = {
  blue: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    icon: 'text-blue-600 dark:text-blue-400',
  },
  green: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    icon: 'text-green-600 dark:text-green-400',
  },
  purple: {
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    icon: 'text-purple-600 dark:text-purple-400',
  },
  orange: {
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    icon: 'text-orange-600 dark:text-orange-400',
  },
  red: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    icon: 'text-red-600 dark:text-red-400',
  },
};

export function AdminStats({
  title,
  value,
  icon,
  trend,
  color = 'blue',
  className = '',
}: AdminStatsProps) {
  const colors = colorClasses[color];

  return (
    <div
      className={`
        bg-surface-light dark:bg-surface-dark
        border border-border-light dark:border-border-dark
        rounded-xl p-6
        shadow-lg dark:shadow-dark-xl
        transition-all duration-300
        hover:shadow-xl dark:hover:shadow-dark-2xl
        ${className}
      `}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-1">
            {title}
          </p>
          <p className="text-3xl font-bold text-text-light-primary dark:text-text-dark-primary">
            {value}
          </p>
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <span
                className={`material-symbols-outlined text-base ${
                  trend.direction === 'up' ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {trend.direction === 'up' ? 'trending_up' : 'trending_down'}
              </span>
              <span
                className={`text-sm font-medium ${
                  trend.direction === 'up' ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {trend.value}%
              </span>
            </div>
          )}
        </div>
        <div className={`${colors.bg} rounded-lg p-3`}>
          <span className={`material-symbols-outlined text-2xl ${colors.icon}`}>
            {icon}
          </span>
        </div>
      </div>
    </div>
  );
}
