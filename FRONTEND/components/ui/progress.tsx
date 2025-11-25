'use client';

import React from 'react';

export function Progress({ value = 0, className }: { value?: number; className?: string }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className={`w-full bg-border-light dark:bg-border-dark rounded-full ${className || ''}`}>
      <div
        className="bg-primary h-full rounded-full"
        style={{ width: `${clamped}%`, height: '100%' }}
      />
    </div>
  );
}

