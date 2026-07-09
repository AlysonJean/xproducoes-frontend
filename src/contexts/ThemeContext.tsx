// Provider + hook(s) co-localizados de propósito (padrão oficial de Context do React) —
// só afeta a granularidade do Fast Refresh em dev, sem efeito em produção/correção.
/* eslint-disable react-refresh/only-export-components */
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
  // SSR-safe initialization. Lido via inicializador preguiçoso (não um useEffect de "load on
  // mount") para já renderizar com o tema salvo desde o primeiro render no cliente, sem o
  // flash de 'system' → tema salvo que o useEffect anterior causava.
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'system';
    const saved = localStorage.getItem('theme') as Theme;
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
    return 'system';
  });
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light'); // Default seguro para SSR

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

  // Deriva resolvedTheme a partir de theme durante a renderização (não em efeito) sempre que
  // `theme` mudar — cobre o caso explícito (light/dark) e o valor inicial do caso 'system'.
  // Ver https://react.dev/learn/you-might-not-need-an-effect. Mudanças subsequentes da
  // preferência do SO (só relevantes quando theme === 'system') são tratadas pelo listener no
  // efeito abaixo, que é a parte que de fato precisa de um efeito (assinar um sistema externo).
  const [lastSyncedTheme, setLastSyncedTheme] = useState<Theme | null>(null);
  if (theme !== lastSyncedTheme && typeof window !== 'undefined') {
    setLastSyncedTheme(theme);
    if (theme === 'light' || theme === 'dark') {
      setResolvedTheme(theme);
    } else {
      setResolvedTheme(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    }
  }

  // Escuta mudanças de preferência do SO enquanto theme === 'system'
  useEffect(() => {
    if (theme !== 'system' || typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      setResolvedTheme(e.matches ? 'dark' : 'light');
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
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
