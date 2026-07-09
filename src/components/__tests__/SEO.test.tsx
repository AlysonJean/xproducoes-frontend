import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { SEO } from '../SEO';

const CANONICAL_DOMAIN = 'https://www.xproducoeseeventos.com.br';

// Achado (Fase 3): o og:image padrão era um caminho relativo para um SVG
// ("/xproducoes-logo.svg") — scrapers de redes sociais (Facebook/WhatsApp/LinkedIn)
// costumam falhar silenciosamente com URLs relativas, e muitos não renderizam SVG como
// preview. O @id/url do JSON-LD também apontava para o domínio errado
// ("xproducoes.com.br", sem "www"/"eventos").
//
// react-helmet-async aplica as tags no <head> real via efeito colateral no cliente —
// em jsdom (ambiente do RTL) isso realmente acontece, então verificamos o <head> real.
describe('SEO - og:image padrão absoluto (PNG real) e domínio canônico no JSON-LD', () => {
  afterEach(() => {
    cleanup();
    document.head.querySelectorAll('meta, script[type="application/ld+json"], link[rel="canonical"]').forEach((el) => el.remove());
  });

  it('usa uma URL absoluta para o PNG real (não o SVG relativo) como og:image/twitter:image padrão', async () => {
    render(
      <HelmetProvider>
        <SEO title="Página de teste" />
      </HelmetProvider>
    );

    await waitFor(() => {
      const ogImage = document.head.querySelector('meta[property="og:image"]');
      expect(ogImage).not.toBeNull();
      expect(ogImage?.getAttribute('content')).toBe(`${CANONICAL_DOMAIN}/xproducoes-logo.png`);
    });

    const twitterImage = document.head.querySelector('meta[name="twitter:image"]');
    expect(twitterImage?.getAttribute('content')).toBe(`${CANONICAL_DOMAIN}/xproducoes-logo.png`);
  });

  it('o JSON-LD (LocalBusiness) usa o domínio canônico correto no @id e no url', async () => {
    render(
      <HelmetProvider>
        <SEO title="Página de teste" />
      </HelmetProvider>
    );

    await waitFor(() => {
      const script = document.head.querySelector('script[type="application/ld+json"]');
      expect(script).not.toBeNull();
    });

    const script = document.head.querySelector('script[type="application/ld+json"]');
    const jsonLd = JSON.parse(script!.textContent || '[]');
    const localBusiness = Array.isArray(jsonLd) ? jsonLd[0] : jsonLd;

    expect(localBusiness['@id']).toBe(CANONICAL_DOMAIN);
    expect(localBusiness.url).toBe(CANONICAL_DOMAIN);
  });
});
