'use client';

import React from 'react';

interface SkeletonLoaderProps {
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
  width?: string | number;
  height?: string | number;
  className?: string;
  count?: number;
}

export function SkeletonLoader({
  variant = 'rectangular',
  width,
  height,
  className = '',
  count = 1,
}: SkeletonLoaderProps) {
  const baseClasses = 'animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 bg-[length:200%_100%]';
  
  const variantClasses = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
    card: 'rounded-xl',
  };

  const style: React.CSSProperties = {
    width: width || '100%',
    height: height || (variant === 'text' ? '1rem' : variant === 'circular' ? '3rem' : '8rem'),
    animation: 'shimmer 2s infinite',
  };

  const skeletons = Array.from({ length: count }, (_, i) => (
    <div
      key={i}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
    />
  ));

  return count > 1 ? (
    <div className="space-y-3">{skeletons}</div>
  ) : (
    <>{skeletons}</>
  );
}

// Skeleton para tabelas
export function TableSkeleton({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, i) => (
          <SkeletonLoader key={`header-${i}`} variant="text" height="1.5rem" />
        ))}
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={`row-${rowIndex}`}
          className="grid gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg"
          style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <SkeletonLoader key={`cell-${rowIndex}-${colIndex}`} variant="text" />
          ))}
        </div>
      ))}
    </div>
  );
}

// Skeleton para cards
export function CardSkeleton({ count = 1 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-6 bg-white dark:bg-gray-800 rounded-xl space-y-4">
          <SkeletonLoader variant="text" height="2rem" width="60%" />
          <SkeletonLoader variant="text" count={3} />
          <div className="flex gap-2 pt-4">
            <SkeletonLoader variant="rectangular" height="2.5rem" width="5rem" />
            <SkeletonLoader variant="rectangular" height="2.5rem" width="5rem" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Skeleton para stats
export function StatsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-6 bg-white dark:bg-gray-800 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <SkeletonLoader variant="text" width="60%" />
            <SkeletonLoader variant="circular" width="2.5rem" height="2.5rem" />
          </div>
          <SkeletonLoader variant="text" height="2rem" width="40%" />
          <SkeletonLoader variant="text" width="50%" />
        </div>
      ))}
    </div>
  );
}
