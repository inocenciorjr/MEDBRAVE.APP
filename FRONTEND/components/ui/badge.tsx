'use client';

import React from 'react';

export function Badge({ className, children, variant }: { className?: string; children: React.ReactNode; variant?: 'default' | 'secondary' | 'outline' | 'destructive' }) {
  return (
    <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full border ${className || ''}`}>
      {children}
    </span>
  );
}
