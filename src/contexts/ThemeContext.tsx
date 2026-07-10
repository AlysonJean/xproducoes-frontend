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

  // Deriva resolvedTheme a partir de theme e assina mudanças de preferência do SO enquanto
  // theme === 'system'.
  //
  // Achado (produção): isto já foi um ajuste de estado durante a renderização (fora de
  // useEffect, seguindo https://react.dev/learn/you-might-not-need-an-effect) para evitar um
  // re-render extra. Só que ThemeProvider fica bem no topo da árvore, envolvendo rotas com
  // lazy()/Suspense — um setState síncrono no corpo do render, mesmo sem afetar o JSX do
  // próprio Provider, ainda interrompe o passo de reconciliação do React, e durante a
  // hidratação isso pode atropelar Suspense boundaries descendentes que ainda não terminaram
  // de hidratar. Confirmado como causa raiz de "Uncaught Error: Minified React error #419"
  // ("The server could not finish this Suspense boundary... during server rendering") visto em
  // produção. useEffect roda depois do commit/hidratação, por isso é a escolha certa aqui —
  // mesmo custando um re-render a mais no primeiro carregamento quando o tema salvo != o
  // default 'light' do SSR.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (theme === 'light' || theme === 'dark') {
      setResolvedTheme(theme);
      return;
    }
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    setResolvedTheme(mq.matches ? 'dark' : 'light');
    const handler = (e: MediaQueryListEvent) => {
      setResolvedTheme(e.matches ? 'dark' : 'light');
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);
  /* eslint-enable react-hooks/set-state-in-effect */

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
