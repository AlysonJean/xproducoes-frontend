/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react-hooks/set-state-in-effect */
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { logger } from '../utils/logger';
import type { ReactNode } from 'react';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
  isLight: boolean;
  setSystem: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // SSR-safe initialization
  const [theme, setThemeState] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light'); // Default seguro para SSR

  // Load saved theme on mount (client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme') as Theme;
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
                setThemeState(saved);
      }
    }
  }, []);

  // Update resolved theme based on system perf (client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (theme === 'light' || theme === 'dark') {
                  setResolvedTheme(theme);
      } else {
         const mq = window.matchMedia('(prefers-color-scheme: dark)');
         setResolvedTheme(mq.matches ? 'dark' : 'light');
      }
    }
  }, [theme]); // Run when theme changes or after initial mount

  // Aplica classe dark no HTML e data-theme sempre que resolvedTheme mudar
  useEffect(() => {
    const root = document.documentElement;
    
    logger.debug('Applying theme', 'ThemeContext', { theme: resolvedTheme });
    
    // Remove classe existente
    root.classList.remove('light', 'dark');
    
    // Adiciona nova classe
    root.classList.add(resolvedTheme);
    
    // Adiciona data-theme para compatibilidade
    root.setAttribute('data-theme', resolvedTheme);
    
    // Adiciona transição suave
    root.style.setProperty('color-scheme', resolvedTheme);
    
    logger.debug('Theme applied successfully', 'ThemeContext', { htmlClasses: root.className });
  }, [resolvedTheme]);

  // Atualiza resolvedTheme quando theme ou sistema mudam
  useEffect(() => {
    if (theme === 'light' || theme === 'dark') {
            setResolvedTheme(theme);
      return;
    } else {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      setResolvedTheme(mq.matches ? 'dark' : 'light');
      const handler = (e: MediaQueryListEvent) => {
        setResolvedTheme(e.matches ? 'dark' : 'light');
      };
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
  }, [theme]);

  // Salva no localStorage e sincroniza entre abas
  useEffect(() => {
    localStorage.setItem('theme', theme);
    const onStorage = (e: StorageEvent) => {
      if (
        e.key === 'theme' &&
        (e.newValue === 'light' || e.newValue === 'dark' || e.newValue === 'system')
      ) {
        setThemeState(e.newValue as Theme);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setThemeState(resolvedTheme === 'dark' ? 'light' : 'dark');
  }, [resolvedTheme]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
  }, []);

  const setSystem = useCallback(() => {
    setThemeState('system');
  }, []);

  const value: ThemeContextType = useMemo(() => ({
    theme,
    resolvedTheme,
    toggleTheme,
    setTheme,
    isDark: resolvedTheme === 'dark',
    isLight: resolvedTheme === 'light',
    setSystem,
  }), [theme, resolvedTheme, toggleTheme, setTheme, setSystem]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

// Memoizar o provider para evitar re-renders desnecessários
export const MemoizedThemeProvider = React.memo(ThemeProvider);
