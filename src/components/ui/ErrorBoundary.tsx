import { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '../../utils/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  location?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  isReloadingStaleChunk: boolean;
}

// Achado (produção): após todo deploy, uma aba já aberta referencia os hashes de chunk do
// build ANTERIOR — se o usuário navega para uma rota lazy() cujo chunk mudou de hash, o
// arquivo antigo não existe mais (Vercel só serve o build atual) e o import() falha. Essa
// falha nunca era tratada: caía direto aqui e ficava presa num "Algo correu mal." estático
// para sempre, quando a correção real é trivial — um F5 busca o HTML atual, que referencia
// os chunks certos. Detectamos esse padrão específico e recarregamos uma vez; a guarda em
// sessionStorage evita loop infinito caso o reload não resolva (problema genuinamente
// diferente), quando então cai no fallback estático normal.
const STALE_CHUNK_PATTERNS = [
  /failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /importing a module script failed/i,
  /failed to import/i,
];

function isStaleChunkError(error: Error): boolean {
  return STALE_CHUNK_PATTERNS.some((pattern) => pattern.test(error.message));
}

const RELOAD_GUARD_KEY = 'xp-chunk-reload-attempted';

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    isReloadingStaleChunk: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, isReloadingStaleChunk: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // data = error (não um wrapper) para preservar Sentry.captureException com stack trace real
    // (logger.error só encaminha exceção real para o Sentry quando data instanceof Error).
    logger.error(
      `ErrorBoundary caught an error in ${this.props.location || 'component'}: ${errorInfo.componentStack}`,
      'ErrorBoundary',
      error
    );

    if (typeof window !== 'undefined' && isStaleChunkError(error)) {
      const alreadyTried = window.sessionStorage.getItem(RELOAD_GUARD_KEY) === '1';
      if (!alreadyTried) {
        window.sessionStorage.setItem(RELOAD_GUARD_KEY, '1');
        this.setState({ isReloadingStaleChunk: true });
        window.location.reload();
      }
    }
  }

  public render() {
    if (this.state.hasError) {
      if (this.state.isReloadingStaleChunk) {
        return (
          <div className="p-4 m-2 bg-muted border border-border rounded text-muted-foreground text-sm">
            <p className="font-medium">Uma nova versão do site está disponível. Atualizando...</p>
          </div>
        );
      }
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="p-4 m-2 bg-destructive/10 border border-destructive rounded text-destructive text-sm">
          <p className="font-bold">Algo correu mal.</p>
          <p className="text-xs mt-1 opacity-80">{this.state.error?.message}</p>
        </div>
      );
    }

    return this.props.children;
  }
}
