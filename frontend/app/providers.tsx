'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Theme, getInitialTheme, setStoredTheme, applyTheme } from '@/lib/theme';
import { FocusModeProvider } from '@/lib/contexts/FocusModeContext';
import { PlanProvider } from '@/contexts/PlanContext';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Always start with 'light' on server to avoid hydration mismatch
  const [theme, setTheme] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Get the actual theme from localStorage/system on mount
    const initialTheme = getInitialTheme();
    setTheme(initialTheme);
    applyTheme(initialTheme);
    setMounted(true);
  }, []);

  useEffect(() => {
    // Apply theme whenever it changes (after mount)
    if (mounted) {
      applyTheme(theme);
    }
  }, [theme, mounted]);

  const toggleTheme = () => {
    console.log('Toggle theme called. Current theme:', theme);
    const newTheme: Theme = theme === 'light' ? 'dark' : 'light';
    console.log('New theme:', newTheme);
    setTheme(newTheme);
    setStoredTheme(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <FocusModeProvider>
        <PlanProvider>
          {children}
        </PlanProvider>
      </FocusModeProvider>
    </ThemeContext.Provider>
  );
}

export { QueryProvider } from '@/lib/providers/QueryProvider';

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
