import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '../ErrorBoundary';

// Achado (produção): após todo deploy, uma aba já aberta com hashes de chunk do build
// anterior lançava "Failed to fetch dynamically imported module" ao navegar para uma rota
// lazy() — o ErrorBoundary só mostrava um "Algo correu mal." estático para sempre. Estes
// testes provam a recuperação automática (recarrega uma vez) e a guarda contra loop
// infinito (se o reload não resolver, cai no fallback normal).
const RELOAD_GUARD_KEY = 'xp-chunk-reload-attempted';

function Throws({ message }: { message: string }): never {
  throw new Error(message);
}

describe('ErrorBoundary', () => {
  let reloadSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    window.sessionStorage.clear();
    vi.restoreAllMocks();
    // jsdom's window.location.reload não é configurável via spyOn direto.
    reloadSpy = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload: reloadSpy },
    });
  });

  it('recarrega a página automaticamente ao capturar erro de chunk desatualizado', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <Throws message="Failed to fetch dynamically imported module: https://site.com/assets/chunk-abc.js" />
      </ErrorBoundary>
    );

    expect(reloadSpy).toHaveBeenCalledTimes(1);
    expect(window.sessionStorage.getItem(RELOAD_GUARD_KEY)).toBe('1');
    expect(screen.getByText(/nova versão do site está disponível/i)).toBeInTheDocument();
  });

  it('não recarrega de novo se o reload já foi tentado nesta sessão (evita loop)', () => {
    window.sessionStorage.setItem(RELOAD_GUARD_KEY, '1');
    vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <Throws message="Failed to fetch dynamically imported module: https://site.com/assets/chunk-abc.js" />
      </ErrorBoundary>
    );

    expect(reloadSpy).not.toHaveBeenCalled();
    expect(screen.getByText(/algo correu mal/i)).toBeInTheDocument();
  });

  it('não recarrega para erros que não são de chunk desatualizado', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <Throws message="Cannot read properties of undefined (reading 'foo')" />
      </ErrorBoundary>
    );

    expect(reloadSpy).not.toHaveBeenCalled();
    expect(screen.getByText(/algo correu mal/i)).toBeInTheDocument();
  });

  it('renderiza os filhos normalmente quando não há erro', () => {
    render(
      <ErrorBoundary>
        <p>Conteúdo normal</p>
      </ErrorBoundary>
    );

    expect(screen.getByText('Conteúdo normal')).toBeInTheDocument();
  });
});
