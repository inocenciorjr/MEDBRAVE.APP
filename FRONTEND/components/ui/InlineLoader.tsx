'use client';

import { cn } from '@/lib/utils/cn';

interface InlineLoaderProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function InlineLoader({ message, size = 'md', className }: InlineLoaderProps) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
  };

  return (
    <div className={cn('flex items-center justify-center', className)}>
      <div className="text-center">
        <div
          className={cn(
            'animate-spin rounded-full border-b-2 border-primary mx-auto',
            sizeClasses[size],
            message && 'mb-4'
          )}
        />
        {message && (
          <p className="text-slate-600 dark:text-slate-400 text-sm">{message}</p>
        )}
      </div>
    </div>
  );
}
