'use client';

import React from 'react';

export interface AdminCardProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingClasses = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export function AdminCard({
  children,
  header,
  footer,
  className = '',
  padding = 'md',
}: AdminCardProps) {
  return (
    <div
      className={`
        bg-surface-light dark:bg-surface-dark
        border border-border-light dark:border-border-dark
        rounded-xl
        shadow-lg dark:shadow-dark-xl
        transition-all duration-300
        hover:shadow-xl dark:hover:shadow-dark-2xl
        ${className}
      `}
    >
      {header && (
        <div className="px-6 py-4 border-b border-border-light dark:border-border-dark">
          {header}
        </div>
      )}
      <div className={paddingClasses[padding]}>
        {children}
      </div>
      {footer && (
        <div className="px-6 py-4 border-t border-border-light dark:border-border-dark">
          {footer}
        </div>
      )}
    </div>
  );
}
