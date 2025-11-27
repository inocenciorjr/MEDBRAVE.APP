'use client';

export type Theme = 'light' | 'dark';

export const getSystemTheme = (): Theme => {
  if (typeof window === 'undefined') return 'light';
  
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
};

export const getStoredTheme = (): Theme | null => {
  if (typeof window === 'undefined') return null;
  
  const stored = localStorage.getItem('theme');
  return stored === 'dark' || stored === 'light' ? stored : null;
};

export const setStoredTheme = (theme: Theme): void => {
  if (typeof window === 'undefined') return;
  
  localStorage.setItem('theme', theme);
};

export const applyTheme = (theme: Theme): void => {
  if (typeof window === 'undefined') return;
  
  const root = document.documentElement;
  
  // Remove both classes first to ensure clean state
  root.classList.remove('light', 'dark');
  
  // Add the new theme class
  root.classList.add(theme);
  
  console.log('Theme applied:', theme, 'Classes:', root.className);
};

export const getInitialTheme = (): Theme => {
  const stored = getStoredTheme();
  return stored || getSystemTheme();
};
