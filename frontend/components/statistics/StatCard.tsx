'use client';

import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'primary' | 'cyan' | 'rose' | 'pink';
  loading?: boolean;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = 'primary',
  loading = false,
}: StatCardProps) {
  const colorClasses = {
    primary: 'text-primary bg-primary/10',
    cyan: 'text-cyan-600 dark:text-cyan-400 bg-cyan-100/50 dark:bg-cyan-900/20',
    rose: 'text-rose-600 dark:text-rose-400 bg-rose-100/50 dark:bg-rose-900/20',
    pink: 'text-pink-600 dark:text-pink-400 bg-pink-100/50 dark:bg-pink-900/20',
  };

  if (loading) {
    return (
      <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-6 border border-border-light dark:border-border-dark">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-border-light dark:bg-border-dark rounded w-1/2"></div>
          <div className="h-8 bg-border-light dark:bg-border-dark rounded w-3/4"></div>
          <div className="h-3 bg-border-light dark:bg-border-dark rounded w-1/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-6 border border-border-light dark:border-border-dark hover:border-primary/50 transition-all duration-200 hover:shadow-lg">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-2">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-bold text-text-light-primary dark:text-text-dark-primary">
              {value}
            </h3>
            {trend && (
              <span
                className={`text-sm font-medium ${
                  trend.isPositive
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-2">
              {subtitle}
            </p>
          )}
        </div>
        {icon && (
          <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
            <span className="material-symbols-outlined text-2xl">{icon}</span>
          </div>
        )}
      </div>
    </div>
  );
}
