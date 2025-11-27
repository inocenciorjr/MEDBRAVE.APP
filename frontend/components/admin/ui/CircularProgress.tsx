'use client';

import React from 'react';

interface CircularProgressProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  strokeWidth?: number;
  showValue?: boolean;
  label?: string;
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'info';
  animated?: boolean;
}

export function CircularProgress({
  value,
  max = 100,
  size = 'md',
  strokeWidth,
  showValue = true,
  label,
  variant = 'primary',
  animated = true,
}: CircularProgressProps) {
  const percentage = Math.min((value / max) * 100, 100);

  const sizeConfig = {
    sm: { dimension: 48, defaultStroke: 4, fontSize: 'text-xs' },
    md: { dimension: 80, defaultStroke: 6, fontSize: 'text-sm' },
    lg: { dimension: 120, defaultStroke: 8, fontSize: 'text-base' },
    xl: { dimension: 160, defaultStroke: 10, fontSize: 'text-lg' },
  };

  const config = sizeConfig[size];
  const stroke = strokeWidth || config.defaultStroke;
  const radius = (config.dimension - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  const variantColors = {
    primary: 'stroke-primary',
    success: 'stroke-green-500',
    warning: 'stroke-yellow-500',
    error: 'stroke-red-500',
    info: 'stroke-blue-500',
  };

  return (
    <div className="inline-flex flex-col items-center gap-2">
      <div className="relative" style={{ width: config.dimension, height: config.dimension }}>
        <svg
          className="transform -rotate-90"
          width={config.dimension}
          height={config.dimension}
        >
          {/* Background circle */}
          <circle
            cx={config.dimension / 2}
            cy={config.dimension / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={stroke}
            fill="none"
            className="text-gray-200 dark:text-gray-700"
          />
          {/* Progress circle */}
          <circle
            cx={config.dimension / 2}
            cy={config.dimension / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={`${variantColors[variant]} ${animated ? 'transition-all duration-1000 ease-out' : ''}`}
          />
        </svg>
        {showValue && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`font-bold text-gray-900 dark:text-white ${config.fontSize}`}>
              {Math.round(percentage)}%
            </span>
          </div>
        )}
      </div>
      {label && (
        <span className="text-sm text-gray-600 dark:text-gray-400 text-center">
          {label}
        </span>
      )}
    </div>
  );
}

// Progress bar linear
export function LinearProgress({
  value,
  max = 100,
  height = 'h-2',
  variant = 'primary',
  showValue = false,
  label,
  animated = true,
}: {
  value: number;
  max?: number;
  height?: string;
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'info';
  showValue?: boolean;
  label?: string;
  animated?: boolean;
}) {
  const percentage = Math.min((value / max) * 100, 100);

  const variantColors = {
    primary: 'bg-primary',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
  };

  return (
    <div className="w-full">
      {(label || showValue) && (
        <div className="flex justify-between items-center mb-2">
          {label && (
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {label}
            </span>
          )}
          {showValue && (
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}
      <div className={`w-full ${height} bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden`}>
        <div
          className={`${height} ${variantColors[variant]} rounded-full ${animated ? 'transition-all duration-1000 ease-out' : ''}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
