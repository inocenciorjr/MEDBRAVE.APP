'use client';

import React from 'react';

export function Alert({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={`flex items-center gap-2 p-3 rounded-lg border ${className || ''}`}>{children}</div>;
}

export function AlertDescription({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={`${className || ''}`}>{children}</div>;
}

