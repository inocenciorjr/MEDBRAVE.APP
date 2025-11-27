'use client';

import React from 'react';

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={`rounded-lg border ${className || ''}`}>{children}</div>;
}

export function CardHeader({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={`p-4 border-b ${className || ''}`}>{children}</div>;
}

export function CardTitle({ className, children }: { className?: string; children: React.ReactNode }) {
  return <h3 className={`text-lg font-semibold ${className || ''}`}>{children}</h3>;
}

export function CardDescription({ className, children }: { className?: string; children: React.ReactNode }) {
  return <p className={`text-sm text-text-light-secondary dark:text-text-dark-secondary ${className || ''}`}>{children}</p>;
}

export function CardContent({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={`p-4 ${className || ''}`}>{children}</div>;
}

