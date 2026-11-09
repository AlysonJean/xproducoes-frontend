import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { AnalyticsProps } from '@vercel/analytics/react';

// D7 (aprovada em 02/11/2026): "troco títulos e ids por textos genéricos nas páginas com dados". O código da reserva
// leva 5 letras do nome do cliente (XP-BRUNO-...), e o nome do mural ou do depoimento pode ter o nome de alguém. Antes,
// o GA e o Vercel Analytics recebiam esses endereços como estavam, e o GA usava o título da aba.
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
vi.mock('../sentry', () => ({ initSentry: () => null }));
vi.mock('../../hooks/useWebVitals', () => ({ useWebVitals: () => undefined }));

import { useGoogleAnalytics } from '../../hooks/useGoogleAnalytics';
import { CookieConsentProvider } from '../../contexts/CookieConsentContext';
import { Providers } from '../../Providers';
import { isAnalyticsExcludedPath } from '../analyticsExclusions';

const CONSENT_ITEM = 'xproducoes_cookie_consent';
const SITE = 'https://www.xproducoeseeventos.com.br';
const CODE = 'XP-BRUNO-20270110-1200-ABC';

// [endereço aberto, caminho que pode sair, título genérico]
const PERSONAL: Array<[string, string, string]> = [
  [`/cliente/reservas/${CODE}`, '/cliente/reservas/:id', 'Detalhes da reserva | X Produções'],
  [`/orcamento-sucesso/${CODE}`, '/orcamento-sucesso/:id', 'Pedido de orçamento enviado | X Produções'],
  [`/reserva-sucesso/${CODE}`, '/reserva-sucesso/:id', 'Pedido de orçamento enviado | X Produções'],
  ['/participate/casamento-bruno-e-ana', '/participate/:slug', 'Mural do evento | X Produções'],
  ['/upload/casamento-bruno-e-ana', '/upload/:slug', 'Envio de fotos para o mural | X Produções'],
  ['/depoimentos/bruno-souza', '/depoimentos/:slug', 'Depoimento de cliente | X Produções'],
  // O React Router abre a mesma página com maiúsculas.
  [`/Cliente/Reservas/${CODE}`, '/cliente/reservas/:id', 'Detalhes da reserva | X Produções'],
];
// Catálogo e páginas por cidade: públicos, sem dado de ninguém; seguem como estão.
const PUBLIC = ['/kits/combo-festa-pratica', '/equipamentos/caixa-ativa-15', '/servicos/dj', '/guias/como-escolher-o-som', '/portfolio/festa-junina', '/aluguel-som-belo-horizonte', '/cliente/painel'];

const Probe: React.FC = () => {
  useGoogleAnalytics();
  return null;
};
const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <CookieConsentProvider>
        <Probe />
      </CookieConsentProvider>
    </MemoryRouter>,
  );

describe('D7 — GA: caminho e título genéricos nas páginas com dados', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem(CONSENT_ITEM, 'accepted');
    vi.clearAllMocks();
    vi.stubEnv('VITE_GOOGLE_ANALYTICS_ID', 'G-TEST123');
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it.each(PERSONAL)('%s vai como %s, com o título "%s", e nada do código ou do nome sai', (path, page, title) => {
    const view = renderAt(path);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    view.unmount();

    const location = `${window.location.origin}${page}`;
    expect(sendMock.mock.calls).toEqual([[{ hitType: 'pageview', page, location, title }]]);
    expect(setMock).toHaveBeenCalledWith({ page_location: location });
    expect(JSON.stringify([setMock.mock.calls, sendMock.mock.calls])).not.toMatch(/bruno|XP-/i);
  });

  it('os parâmetros de campanha continuam, depois do caminho genérico', () => {
    renderAt(`/orcamento-sucesso/${CODE}?utm_source=whatsapp&token=abc123`);
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(sendMock).toHaveBeenCalledWith({
      hitType: 'pageview',
      page: '/orcamento-sucesso/:id?utm_source=whatsapp',
      location: `${window.location.origin}/orcamento-sucesso/:id?utm_source=whatsapp`,
      title: 'Pedido de orçamento enviado | X Produções',
    });
  });

  it.each(PUBLIC)('%s (sem dado de ninguém) vai como está, com o título da aba', (path) => {
    renderAt(path);
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(sendMock.mock.calls).toEqual([[{ hitType: 'pageview', page: path, location: `${window.location.origin}${path}` }]]);
  });
});

describe('D7 — Vercel Analytics: o mesmo normalizador no beforeSend', () => {
  const beforeSend = () => {
    render(
      <Providers>
        <div />
      </Providers>,
    );
    const fn = Analytics.mock.lastCall?.[0].beforeSend;
    expect(fn).toBeTypeOf('function');
    return fn!;
  };

  it('páginas com dados saem com o caminho genérico (e sem token, e-mail ou código na query)', () => {
    const send = beforeSend();
    for (const [path, page] of PERSONAL) {
      expect({ path, sent: send({ type: 'pageview', url: `${SITE}${path}` }) }).toEqual({ path, sent: { type: 'pageview', url: `${SITE}${page}` } });
    }
    expect(send({ type: 'event', url: `${SITE}/orcamento-sucesso/${CODE}?utm_source=whatsapp&token=abc123` })).toEqual({
      type: 'event',
      url: `${SITE}/orcamento-sucesso/:id?utm_source=whatsapp`,
    });
  });

  it('as outras páginas seguem como estavam', () => {
    const send = beforeSend();
    for (const path of PUBLIC) {
      expect(send({ type: 'pageview', url: `${SITE}${path}` })).toEqual({ type: 'pageview', url: `${SITE}${path}` });
    }
  });
});

describe('D7 — áreas da equipe com maiúsculas', () => {
  it('/Admin/... e /Colaborador/... (o React Router abre as mesmas telas) também ficam fora', () => {
    for (const path of ['/Admin/painel', '/ADMIN/reservas/XP-ANA-1', '/Colaborador/agenda', '/Freelancer/painel', '/Proposta']) {
      expect({ path, excluded: isAnalyticsExcludedPath(path) }).toEqual({ path, excluded: true });
    }
  });
});
