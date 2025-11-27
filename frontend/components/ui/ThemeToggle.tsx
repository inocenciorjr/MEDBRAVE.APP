'use client';

import { useTheme } from '@/app/providers';
import { useEffect, useState } from 'react';

interface ThemeToggleProps {
  className?: string;
}

export default function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleClick = () => {
    console.log('ThemeToggle button clicked');
    toggleTheme();
  };

  // Render a placeholder during SSR to avoid hydration mismatch
  if (!mounted) {
    return (
      <button
        className={`p-2 rounded-lg hover:bg-sidebar-active-light dark:hover:bg-sidebar-active-dark transition-colors ${className}`}
        aria-label="Alternar tema"
        type="button"
        disabled
      >
        <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary text-2xl">
          dark_mode
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className={`p-2 rounded-lg hover:bg-sidebar-active-light dark:hover:bg-sidebar-active-dark transition-colors ${className}`}
      aria-label="Alternar tema"
      type="button"
    >
      <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary text-2xl">
        {theme === 'light' ? 'dark_mode' : 'light_mode'}
      </span>
    </button>
  );
}
