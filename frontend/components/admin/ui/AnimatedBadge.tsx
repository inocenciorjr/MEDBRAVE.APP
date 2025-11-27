'use client';

import React from 'react';

interface AnimatedBadgeProps {
  label: string;
  variant?: 'success' | 'error' | 'warning' | 'info' | 'neutral' | 'primary';
  icon?: string;
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
  glow?: boolean;
  className?: string;
}

export function AnimatedBadge({
  label,
  variant = 'neutral',
  icon,
  size = 'md',
  pulse = false,
  glow = false,
  className = '',
}: AnimatedBadgeProps) {
  const variantClasses = {
    success: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
    error: 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
    warning: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
    info: 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    neutral: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700',
    primary: 'bg-primary/10 text-primary border-primary/20',
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  };

  const iconSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  const glowClasses = {
    success: 'shadow-[0_0_15px_rgba(34,197,94,0.3)]',
    error: 'shadow-[0_0_15px_rgba(239,68,68,0.3)]',
    warning: 'shadow-[0_0_15px_rgba(234,179,8,0.3)]',
    info: 'shadow-[0_0_15px_rgba(59,130,246,0.3)]',
    neutral: 'shadow-[0_0_15px_rgba(107,114,128,0.3)]',
    primary: 'shadow-[0_0_15px_rgba(99,102,241,0.3)]',
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full border font-medium
        transition-all duration-200
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${pulse ? 'animate-pulse' : ''}
        ${glow ? glowClasses[variant] : ''}
        ${className}
      `}
    >
      {icon && (
        <span className={`material-symbols-outlined ${iconSizeClasses[size]}`}>
          {icon}
        </span>
      )}
      {label}
    </span>
  );
}

// Badge com contador animado
export function CountBadge({
  count,
  variant = 'primary',
  max = 99,
}: {
  count: number;
  variant?: 'success' | 'error' | 'warning' | 'info' | 'primary';
  max?: number;
}) {
  const displayCount = count > max ? `${max}+` : count;

  const variantClasses = {
    success: 'bg-green-500 text-white',
    error: 'bg-red-500 text-white',
    warning: 'bg-yellow-500 text-white',
    info: 'bg-blue-500 text-white',
    primary: 'bg-primary text-white',
  };

  return (
    <span
      className={`
        inline-flex items-center justify-center
        min-w-[1.25rem] h-5 px-1.5 rounded-full
        text-xs font-bold
        ${variantClasses[variant]}
        ${count > 0 ? 'animate-scale-in' : ''}
      `}
    >
      {displayCount}
    </span>
  );
}

// Badge com ponto de status
export function StatusDot({
  variant = 'success',
  pulse = false,
  label,
}: {
  variant?: 'success' | 'error' | 'warning' | 'info' | 'neutral';
  pulse?: boolean;
  label?: string;
}) {
  const dotClasses = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-yellow-500',
    info: 'bg-blue-500',
    neutral: 'bg-gray-500',
  };

  return (
    <span className="inline-flex items-center gap-2">
      <span className="relative flex h-3 w-3">
        {pulse && (
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dotClasses[variant]}`}
          />
        )}
        <span
          className={`relative inline-flex rounded-full h-3 w-3 ${dotClasses[variant]}`}
        />
      </span>
      {label && (
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {label}
        </span>
      )}
    </span>
  );
}
