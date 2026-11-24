// Provider + hook(s) co-localizados de propósito (padrão oficial de Context do React) —
// só afeta a granularidade do Fast Refresh em dev, sem efeito em produção/correção.
/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { logger } from '../utils/logger';
import type { ReactNode } from 'react';
import { safeGetItem, safeSetItem } from '../utils/safeStorage';

export type Theme = 'light' | 'dark' | 'system';
// A chave do tema no armazenamento do navegador (listada na Política de Cookies).
const THEME_KEY = 'theme';

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
    // F1-05 (onda 2 da auditoria de 19/11): leitura que não lança com os dados de sites bloqueados.
    const saved = safeGetItem(THEME_KEY) as Theme;
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
    return 'system';
  });
  // Onda 4 da auditoria de 19/11 (F1-22): null até o efeito de baixo resolver o tema; para fora vale 'light' (o do SSR), como antes.
  const [resolvedState, setResolvedTheme] = useState<'light' | 'dark' | null>(null);
  const resolvedTheme = resolvedState ?? 'light'; // Default seguro para SSR

  // Aplica classe dark no HTML e data-theme sempre que resolvedTheme mudar
  // Onda 4 da auditoria de 19/11 (F1-22): só depois de o tema ser resolvido. Antes, a primeira execução aplicava o 'light' do SSR e
  // tirava o "dark" que o script do <head> (renderer/+onRenderHtml.tsx) tinha posto, e o site escuro piscava claro.
  useEffect(() => {
    if (resolvedState === null) return;
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
  }, [resolvedState, resolvedTheme]);

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
    safeSetItem(THEME_KEY, theme);
    const onStorage = (e: StorageEvent) => {
      if (
        e.key === THEME_KEY &&
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
