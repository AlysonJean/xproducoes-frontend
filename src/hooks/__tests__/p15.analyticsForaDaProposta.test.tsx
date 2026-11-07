import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import type { AnalyticsProps } from '@vercel/analytics/react';

// P15 (aprovada em 02/11/2026): a página da proposta (/proposta e o endereço antigo /proposta/<número>) fica fora do
// Google Analytics, mesmo com o aceite de cookies, e do Vercel Analytics. Antes o GA carregava em qualquer página
// depois do aceite e o Vercel Analytics recebia toda visita.
const { initializeMock, sendMock, setMock, Analytics } = vi.hoisted(() => ({
  initializeMock: vi.fn(),
  sendMock: vi.fn(),
  setMock: vi.fn(),
  Analytics: vi.fn((_props: AnalyticsProps) => null),
}));
vi.mock('react-ga4', () => ({
  default: {
    initialize: (...args: unknown[]) => initializeMock(...args),
    send: (...args: unknown[]) => sendMock(...args),
    set: (...args: unknown[]) => setMock(...args),
  },
}));
vi.mock('@vercel/analytics/react', () => ({ Analytics }));
vi.mock('../../utils/sentry', () => ({ initSentry: () => null }));
vi.mock('../useWebVitals', () => ({ useWebVitals: () => undefined }));

import { useGoogleAnalytics } from '../useGoogleAnalytics';
import { CookieConsentProvider } from '../../contexts/CookieConsentContext';
import { Providers } from '../../Providers';

const STORAGE_KEY = 'xproducoes_cookie_consent';

const Probe: React.FC = () => {
  useGoogleAnalytics();
  const navigate = useNavigate();
  return <button onClick={() => navigate('/proposta')}>ir para a proposta</button>;
};

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <CookieConsentProvider>
        <Probe />
      </CookieConsentProvider>
    </MemoryRouter>,
  );

const pagesSent = () => sendMock.mock.calls.map(([hit]) => (hit as { page?: string }).page);

describe('P15 — Google Analytics fora da página da proposta', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem(STORAGE_KEY, 'accepted');
    vi.clearAllMocks();
    vi.stubEnv('VITE_GOOGLE_ANALYTICS_ID', 'G-TEST123');
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it.each(['/proposta', '/proposta/XP-ANA-1'])('%s com o aceite de cookies: o GA nem carrega e não recebe page view', (path) => {
    renderAt(path);

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(initializeMock).not.toHaveBeenCalled();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('nas outras páginas, com o aceite, o GA carrega como antes', () => {
    renderAt('/equipamentos');

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(initializeMock).toHaveBeenCalledWith('G-TEST123', expect.anything());
    expect(pagesSent()).toEqual(['/equipamentos']);
  });

  it('GA já carregado no site e o visitante vai para /proposta: nenhum page view da proposta', () => {
    renderAt('/');
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(pagesSent()).toEqual(['/']);

    fireEvent.click(screen.getByRole('button', { name: 'ir para a proposta' }));
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(pagesSent()).toEqual(['/']);
  });

  it('saiu da home para /proposta antes de o GA carregar: ele não carrega na proposta', () => {
    renderAt('/');
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    fireEvent.click(screen.getByRole('button', { name: 'ir para a proposta' }));
    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(initializeMock).not.toHaveBeenCalled();
    expect(sendMock).not.toHaveBeenCalled();
  });
});

describe('P15 — Vercel Analytics fora da página da proposta', () => {
  it('o beforeSend descarta (null) as visitas a /proposta e ao endereço antigo; as outras seguem limpas', () => {
    render(
      <Providers>
        <div />
      </Providers>,
    );

    const beforeSend = Analytics.mock.lastCall?.[0].beforeSend;
    expect(beforeSend).toBeTypeOf('function');
    expect(beforeSend?.({ type: 'pageview', url: 'https://www.xproducoeseeventos.com.br/proposta#token=p1.TESTE' })).toBeNull();
    expect(beforeSend?.({ type: 'pageview', url: 'https://www.xproducoeseeventos.com.br/proposta' })).toBeNull();
    expect(beforeSend?.({ type: 'event', url: 'https://www.xproducoeseeventos.com.br/proposta/XP-ANA-1' })).toBeNull();
    expect(beforeSend?.({ type: 'pageview', url: 'https://www.xproducoeseeventos.com.br/propostas-antigas?token=abc' }))
      .toEqual({ type: 'pageview', url: 'https://www.xproducoeseeventos.com.br/propostas-antigas' });
    expect(beforeSend?.({ type: 'pageview', url: 'https://www.xproducoeseeventos.com.br/equipamentos' }))
      .toEqual({ type: 'pageview', url: 'https://www.xproducoeseeventos.com.br/equipamentos' });
  });
});
