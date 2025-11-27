'use client';

import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface AdminButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: string;
  children: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-primary hover:bg-primary/90 text-white shadow-md hover:shadow-lg',
  secondary: 'bg-gray-600 hover:bg-gray-700 text-white shadow-md hover:shadow-lg',
  outline: 'bg-transparent border-2 border-border-light dark:border-border-dark text-text-light-primary dark:text-text-dark-primary hover:bg-surface-light dark:hover:bg-surface-dark',
  danger: 'bg-red-600 hover:bg-red-700 text-white shadow-md hover:shadow-lg',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
};

export function AdminButton({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  disabled,
  className = '',
  children,
  ...props
}: AdminButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2
        font-inter font-medium rounded-xl
        transition-all duration-300
        focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
      disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <span className="material-symbols-outlined animate-spin text-xl">
          progress_activity
        </span>
      ) : icon ? (
        <span className="material-symbols-outlined text-xl">
          {icon}
        </span>
      ) : null}
      {children}
    </button>
  );
}
