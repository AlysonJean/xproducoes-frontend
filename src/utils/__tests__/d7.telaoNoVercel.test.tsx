import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import type { AnalyticsProps } from '@vercel/analytics/react';

// Só as props que o Providers passa ao <Analytics /> (mesmo arranjo de src/__tests__/Providers.analytics.test.tsx).
const { Analytics } = vi.hoisted(() => ({ Analytics: vi.fn((_props: AnalyticsProps) => null) }));
vi.mock('@vercel/analytics/react', () => ({ Analytics }));
vi.mock('../sentry', () => ({ initSentry: () => null }));
vi.mock('../../hooks/useWebVitals', () => ({ useWebVitals: () => undefined }));

import { Providers } from '../../Providers';

// D7 (aprovada em 02/11/2026): "troco títulos e ids por textos genéricos nas páginas com dados". O telão do mural
// abre em /tv?slug=<nome do mural>, e o nome do mural pode ter o de alguém (ex.: casamento-bruno-e-ana), como nos
// endereços /participate/:slug e /upload/:slug. O GA já fica só com os parâmetros de campanha da query; o Vercel
// Analytics recebia a query inteira.
const SITE = 'https://www.xproducoeseeventos.com.br';

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

describe('D7 — telão do mural no Vercel Analytics', () => {
  it('a query do telão (nome do mural) não sai, com ou sem maiúsculas', () => {
    const send = beforeSend();
    expect(send({ type: 'pageview', url: `${SITE}/tv?slug=casamento-bruno-e-ana` })).toEqual({ type: 'pageview', url: `${SITE}/tv` });
    expect(send({ type: 'pageview', url: `${SITE}/TV/?slug=casamento-bruno-e-ana&settingId=w1` })).toEqual({
      type: 'pageview',
      url: `${SITE}/TV/`,
    });
  });

  it('nas outras páginas a query fica como veio (só sem token, e-mail e código)', () => {
    const send = beforeSend();
    expect(send({ type: 'pageview', url: `${SITE}/equipamentos?categoryId=c1&utm_source=instagram` })).toEqual({
      type: 'pageview',
      url: `${SITE}/equipamentos?categoryId=c1&utm_source=instagram`,
    });
    expect(send({ type: 'pageview', url: `${SITE}/tvs-e-telas?slug=x` })).toEqual({ type: 'pageview', url: `${SITE}/tvs-e-telas?slug=x` });
  });
});
