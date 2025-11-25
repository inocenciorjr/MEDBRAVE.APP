'use client';

import { LoadingAnimation } from './LoadingAnimation';

interface PageLoaderProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function PageLoader({ message, size = 'lg' }: PageLoaderProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background-light dark:bg-background-dark">
      <LoadingAnimation size={size} />
      {message && (
        <p className="mt-6 text-lg font-medium text-text-light-secondary dark:text-text-dark-secondary animate-pulse">
          {message}
        </p>
      )}
    </div>
  );
}
