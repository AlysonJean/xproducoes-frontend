import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import type { AnalyticsProps } from '@vercel/analytics/react';

// D7 (aprovada em 02/11/2026): "Eu desligo o GA nas áreas /admin e /colaborador e para a equipe". As áreas da equipe
// (o painel /admin, a área do colaborador /colaborador e os endereços antigos /collaborator que levam a ela, e o
// painel do freelancer /freelancer) ficam fora do Google Analytics mesmo com o aceite de cookies, e o Vercel
// Analytics descarta essas visitas. Antes o GA carregava em qualquer página depois do aceite: o admin que aceitava
// os cookies ia para o GA a cada tela do painel.
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
import { isAnalyticsExcludedPath } from '../../utils/analyticsExclusions';

const CONSENT_STORAGE_ITEM = 'xproducoes_cookie_consent';
const SITE = 'https://www.xproducoeseeventos.com.br';
const TEAM_PATHS = ['/admin/painel', '/admin/reservas/XP-ANA-1', '/colaborador/agenda', '/collaborator/dashboard', '/freelancer/painel'];

const Probe: React.FC = () => {
  useGoogleAnalytics();
  const navigate = useNavigate();
  return (
    <>
      <button onClick={() => navigate('/admin/painel')}>ir para o painel</button>
      <button onClick={() => navigate('/colaborador/painel')}>ir para a área do colaborador</button>
      <button onClick={() => navigate('/equipamentos')}>voltar ao site</button>
    </>
  );
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
const wait = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });

describe('D7 — Google Analytics fora das áreas da equipe', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem(CONSENT_STORAGE_ITEM, 'accepted');
    vi.clearAllMocks();
    vi.stubEnv('VITE_GOOGLE_ANALYTICS_ID', 'G-TEST123');
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it.each(TEAM_PATHS)('%s com o aceite de cookies: o GA nem carrega e não recebe page view', (path) => {
    renderAt(path);
    wait(5000);

    expect(initializeMock).not.toHaveBeenCalled();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('GA já carregado no site (ex.: na tela de login) e a pessoa entra no painel ou na área do colaborador: nenhum page view de lá; de volta ao site, volta a contar', () => {
    renderAt('/login');
    wait(5000);
    expect(pagesSent()).toEqual(['/login']);

    fireEvent.click(screen.getByRole('button', { name: 'ir para o painel' }));
    wait(5000);
    fireEvent.click(screen.getByRole('button', { name: 'ir para a área do colaborador' }));
    wait(5000);
    expect(pagesSent()).toEqual(['/login']);

    fireEvent.click(screen.getByRole('button', { name: 'voltar ao site' }));
    wait(5000);
    expect(pagesSent()).toEqual(['/login', '/equipamentos']);
  });

  it('só o começo do endereço conta: páginas públicas com nome parecido seguem no GA', () => {
    for (const path of TEAM_PATHS) expect({ path, excluded: isAnalyticsExcludedPath(path) }).toEqual({ path, excluded: true });
    for (const path of ['/admin', '/colaborador', '/freelancer']) expect(isAnalyticsExcludedPath(path)).toBe(true);
    for (const path of ['/', '/carreiras', '/administrativo', '/colaboradores-externos', '/freelancers', '/equipamentos/admin']) {
      expect({ path, excluded: isAnalyticsExcludedPath(path) }).toEqual({ path, excluded: false });
    }

    renderAt('/carreiras');
    wait(5000);
    expect(initializeMock).toHaveBeenCalledWith('G-TEST123', expect.anything());
    expect(pagesSent()).toEqual(['/carreiras']);
  });
});

describe('D7 — Vercel Analytics fora das áreas da equipe', () => {
  it('o beforeSend descarta (null) as visitas ao painel, à área do colaborador e ao painel do freelancer', () => {
    render(
      <Providers>
        <div />
      </Providers>,
    );

    const beforeSend = Analytics.mock.lastCall?.[0].beforeSend;
    expect(beforeSend).toBeTypeOf('function');
    for (const path of TEAM_PATHS) {
      expect({ path, event: beforeSend?.({ type: 'pageview', url: `${SITE}${path}` }) }).toEqual({ path, event: null });
    }
    expect(beforeSend?.({ type: 'pageview', url: `${SITE}/carreiras` })).toEqual({ type: 'pageview', url: `${SITE}/carreiras` });
  });
});
