'use client';

import React from 'react';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'outline' | 'ghost';
  asChild?: boolean;
};

export function Button({ className, variant = 'default', asChild, children, ...props }: ButtonProps) {
  const base = 'px-3 py-2 rounded-lg font-semibold';
  const styles =
    variant === 'outline'
      ? 'border-2 border-border-light dark:border-border-dark text-text-light-secondary dark:text-text-dark-secondary hover:bg-surface-light dark:hover:bg-surface-dark hover:text-text-light-primary dark:hover:text-text-dark-primary'
      : variant === 'ghost'
      ? 'bg-transparent'
      : 'bg-primary text-white hover:bg-primary/90';

  if (asChild) {
    return <button className={`${base} ${styles} ${className || ''}`} {...props}>{children}</button>;
  }

  return <button className={`${base} ${styles} ${className || ''}`} {...props}>{children}</button>;
}

