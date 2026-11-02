import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import type { AnalyticsProps } from '@vercel/analytics/react';

// O <Analytics /> real injeta o script da Vercel; aqui só interessam as props que o Providers passa.
const { Analytics } = vi.hoisted(() => ({ Analytics: vi.fn((_props: AnalyticsProps) => null) }));
vi.mock('@vercel/analytics/react', () => ({ Analytics }));
// Fora do assunto: o Providers inicia o Sentry ao ser importado (o .env local tem DSN de verdade)
// e mede Web Vitals.
vi.mock('../utils/sentry', () => ({ initSentry: () => null }));
vi.mock('../hooks/useWebVitals', () => ({ useWebVitals: () => undefined }));

import { Providers } from '../Providers';

// Achado (revisão antes do deploy): o <Analytics /> não tinha beforeSend, então cada page view ia
// para a Vercel com a URL inteira da barra, inclusive o token e o e-mail dos links de e-mail.
describe('Providers - URL enviada ao Vercel Analytics', () => {
  it('passa ao <Analytics /> um beforeSend que tira token, email e code da URL', () => {
    render(
      <Providers>
        <div />
      </Providers>,
    );

    const beforeSend = Analytics.mock.lastCall?.[0].beforeSend;
    expect(beforeSend).toBeTypeOf('function');
    expect(
      beforeSend?.({ type: 'pageview', url: 'https://xproducoeseeventos.com.br/cadastro-convite?token=abc123&email=fulano%40exemplo.com' }),
    ).toEqual({ type: 'pageview', url: 'https://xproducoeseeventos.com.br/cadastro-convite' });
    expect(
      beforeSend?.({ type: 'event', url: 'https://xproducoeseeventos.com.br/data-deletion-status?code=xyz789&utm_source=email' }),
    ).toEqual({ type: 'event', url: 'https://xproducoeseeventos.com.br/data-deletion-status?utm_source=email' });
  });
});
