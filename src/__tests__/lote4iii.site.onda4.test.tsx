import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, renderHook, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

// Onda 4 da auditoria de 19/11, primeiro lote do site, páginas públicas: cada bloco diz o achado.
const { apiFetch, recommendationAPI, getPublicBanners } = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  recommendationAPI: { getTrending: vi.fn(), getSimilar: vi.fn(), getNew: vi.fn() },
  getPublicBanners: vi.fn(),
}));
vi.mock('../services/api', () => ({ apiFetch, recommendationAPI }));
vi.mock('@/services/api', () => ({ apiFetch, recommendationAPI }));
vi.mock('../services/bannerService', () => ({ bannerService: { getPublicBanners } }));
vi.mock('../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));
vi.mock('../contexts/CartContext', () => ({ useCart: () => ({ cart: null, addToCart: vi.fn(), isInCart: () => false }) }));

import { CityLandingPage } from '../pages/CityLandingPage';
import { BannerCarousel } from '../components/ui/BannerCarousel';
import { PageLayout } from '../components/layouts/PageLayout';
import { SEO } from '../components/SEO';
import { StructuredData } from '../components/seo/StructuredData';
import { RecommendationSection } from '../components/ui/RecommendationSection';
import { PostCard } from '../components/social/PostCard';
import { TestimonialCarousel } from '../components/TestimonialCarousel';
import { LeaderboardSlide } from '../components/social/LeaderboardSlide';
import { BookingListItem } from '../components/ui/BookingListItem';
import { TestimonialCard } from '../components/ui/TestimonialCard';
import { GuideListPage } from '../pages/GuideListPage';
import { useAppSettings } from '../hooks/useAppSettings';
import { BROWSER_STORAGE } from '../data/cookiePolicy';
import { GUIDE_ROUTES, STATIC_ROUTES, generateSitemap } from '../utils/sitemapGenerator';
import { GUIDES } from '../data/guides';
import type { SafeBooking } from '../types/types';
import type { SocialPost } from '../services/socialService';

const FRONT = resolve(__dirname, '../..');
const ler = (rel: string) => readFileSync(resolve(FRONT, rel), 'utf8');
const CLOUD = 'https://res.cloudinary.com/xp/image/upload/v1/foto.jpg';
const jsonLdNoHead = () =>
  Array.from(document.head.querySelectorAll('script[type="application/ld+json"]')).flatMap((s) => {
    const parsed = JSON.parse(s.textContent || 'null');
    return Array.isArray(parsed) ? parsed : [parsed];
  });

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  apiFetch.mockImplementation(() => new Promise(() => {}));
  recommendationAPI.getTrending.mockResolvedValue({ data: [] });
});

describe('F5-09: landing de cidade', () => {
  it('a página manda só o FAQPage; a empresa é a do <SEO> (com endereço), uma só', async () => {
    render(
      <HelmetProvider>
        <MemoryRouter initialEntries={['/aluguel-som-belo-horizonte']}>
          <Routes><Route path="/:seoSlug" element={<CityLandingPage />} /></Routes>
        </MemoryRouter>
      </HelmetProvider>,
    );
    await waitFor(() => expect(jsonLdNoHead().some((o) => o['@type'] === 'FAQPage')).toBe(true));
    const blocos = jsonLdNoHead();
    const faq = blocos.find((o) => o['@type'] === 'FAQPage');
    expect(faq.mainEntity.length).toBeGreaterThan(0);
    expect(faq.name).toBeUndefined();
    expect(faq.aggregateRating).toBeUndefined();
    // A empresa vem do schemaGenerator (PageLayout e <SEO>, o mesmo @id); nenhuma sem endereço, como a que a página fazia.
    const empresas = blocos.filter((o) => o['@type'] === 'LocalBusiness' || (Array.isArray(o['@type']) && o['@type'].includes('LocalBusiness')));
    expect(empresas.length).toBeGreaterThan(0);
    expect(new Set(empresas.map((o) => o['@id'])).size).toBe(1);
    for (const empresa of empresas) expect(empresa.address).toBeDefined();
    expect(blocos.some((o) => o.name === 'X Produções' && !o.address)).toBe(false);
  });
});

describe('F3-07: carrossel de banners', () => {
  const dois = [
    { id: 'b1', title: 'Verão', imageUrl: 'https://img.test/1.jpg', linkUrl: '/kits' },
    { id: 'b2', title: 'Inverno', imageUrl: 'https://img.test/2.jpg', linkUrl: '' },
  ];
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
  const semReduzir = () => vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));

  it('banner com link é um link; sem link, não é (antes, um link "#" focável)', async () => {
    getPublicBanners.mockResolvedValue([dois[1]]);
    render(<MemoryRouter><BannerCarousel /></MemoryRouter>);
    const img = await screen.findByRole('img', { name: 'Inverno' });
    expect(img.closest('a')).toBeNull();

    getPublicBanners.mockResolvedValue([dois[0]]);
    render(<MemoryRouter><BannerCarousel /></MemoryRouter>);
    expect((await screen.findByRole('img', { name: 'Verão' })).closest('a')).toHaveAttribute('href', '/kits');
  });

  const avancar = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

  it('passa sozinho a cada 6 s, mas para com o mouse ou o foco sobre ele', async () => {
    semReduzir();
    getPublicBanners.mockResolvedValue(dois);
    vi.useFakeTimers();
    render(<MemoryRouter><BannerCarousel /></MemoryRouter>);
    await avancar(0);
    expect(screen.getByRole('img', { name: 'Verão' })).toBeInTheDocument();
    await avancar(6100);
    expect(screen.getByRole('img', { name: 'Inverno' })).toBeInTheDocument();

    fireEvent.mouseEnter(screen.getByTestId('banner-carousel'));
    await avancar(6100); // uma troca só (com duas, a tela voltaria ao mesmo banner)
    expect(screen.getByRole('img', { name: 'Inverno' })).toBeInTheDocument();

    fireEvent.mouseLeave(screen.getByTestId('banner-carousel'));
    await avancar(6100);
    expect(screen.getByRole('img', { name: 'Verão' })).toBeInTheDocument();

    fireEvent.focus(screen.getByRole('link', { name: /Verão/ }));
    await avancar(6100); // uma troca só (com duas, a tela voltaria ao mesmo banner)
    expect(screen.getByRole('img', { name: 'Verão' })).toBeInTheDocument();
  });

  it('com "reduzir movimento" no aparelho, não passa sozinho', async () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    getPublicBanners.mockResolvedValue(dois);
    vi.useFakeTimers();
    render(<MemoryRouter><BannerCarousel /></MemoryRouter>);
    await avancar(0);
    expect(screen.getByRole('img', { name: 'Verão' })).toBeInTheDocument();
    await avancar(6100); // uma troca só (com duas, a tela voltaria ao mesmo banner)
    expect(screen.getByRole('img', { name: 'Verão' })).toBeInTheDocument();
  });
});

describe('F3-19: páginas só com PageLayout', () => {
  const tag = (sel: string, attr = 'content') => document.head.querySelector(sel)?.getAttribute(attr);

  it('canonical pelo caminho do roteador, og:image padrão e og:site_name', async () => {
    render(<HelmetProvider><MemoryRouter initialEntries={['/kits?ordem=preco#topo']}><PageLayout title="Kits">x</PageLayout></MemoryRouter></HelmetProvider>);
    await waitFor(() => expect(tag('link[rel="canonical"]', 'href')).toBe('https://www.xproducoeseeventos.com.br/kits'));
    expect(tag('meta[property="og:url"]')).toBe('https://www.xproducoeseeventos.com.br/kits');
    expect(tag('meta[property="og:image"]')).toBe('https://www.xproducoeseeventos.com.br/xproducoes-logo.png');
    expect(tag('meta[name="twitter:image"]')).toBe('https://www.xproducoeseeventos.com.br/xproducoes-logo.png');
    expect(tag('meta[property="og:site_name"]')).toBe('X Produções');
  });

  it('url e imagem passadas pela página continuam valendo (sem busca nem âncora)', async () => {
    render(
      <HelmetProvider>
        <MemoryRouter initialEntries={['/x']}>
          <PageLayout title="Kit" url="https://www.xproducoeseeventos.com.br/kits/k1?ref=a" image="https://img.test/k1.jpg">x</PageLayout>
        </MemoryRouter>
      </HelmetProvider>,
    );
    await waitFor(() => expect(tag('link[rel="canonical"]', 'href')).toBe('https://www.xproducoeseeventos.com.br/kits/k1'));
    expect(tag('meta[property="og:image"]')).toBe('https://img.test/k1.jpg');
  });
});

describe('F3-15: JSON-LD com "<" escapado', () => {
  const PERIGOSO = 'Kit </script><script>alert(1)</script>';

  it('SEO e StructuredData: nenhum "</script>" cru no bloco, e o dado volta igual', async () => {
    render(
      <HelmetProvider>
        <MemoryRouter>
          <SEO title="Kit" jsonLd={{ '@context': 'https://schema.org', '@type': 'Product', name: PERIGOSO }} />
          <StructuredData schema={{ '@context': 'https://schema.org', '@type': 'Thing', name: PERIGOSO }} />
        </MemoryRouter>
      </HelmetProvider>,
    );
    await waitFor(() => expect(jsonLdNoHead().filter((o) => o.name === PERIGOSO)).toHaveLength(2));
    for (const s of Array.from(document.head.querySelectorAll('script[type="application/ld+json"]'))) {
      expect(s.textContent).not.toContain('</script>');
      expect(s.textContent).not.toContain('<');
    }
  });
});

describe('F3-09 e F3-22: seção de recomendações', () => {
  const itens = [
    { id: 'k1', name: 'Kit 01', type: 'kit' as const, imageUrl: CLOUD, price: 900 },
    { id: 'e1', name: 'Caixa', type: 'equipment' as const, imageUrl: CLOUD, price: 100 },
    { id: 'e2', name: 'Mesa', type: 'equipment' as const, price: 80 },
  ];

  it('o link do item vem do tipo (o kit não vai mais para /equipamentos/<id>) e a foto sai em 500 px', () => {
    render(<MemoryRouter><RecommendationSection type="similar" items={itens} viewAllLink="/equipamentos" maxItems={2} /></MemoryRouter>);
    expect(screen.getByText('Kit 01').closest('a')).toHaveAttribute('href', '/kits/k1');
    expect(screen.getByText('Caixa').closest('a')).toHaveAttribute('href', '/equipamentos/e1');
    const foto = screen.getByRole('img', { name: 'Kit 01' });
    expect(foto.getAttribute('src')).toContain('/upload/f_auto,q_auto,w_500/');
    expect(foto).toHaveAttribute('loading', 'lazy');
  });

  it('"Ver todos" é um link com cara de botão (sem <button> dentro de <a>)', () => {
    const { container } = render(<MemoryRouter><RecommendationSection type="similar" items={itens} viewAllLink="/equipamentos" viewAllText="Ver todos" maxItems={2} /></MemoryRouter>);
    expect(screen.getByRole('link', { name: /Ver todos/ })).toHaveAttribute('href', '/equipamentos');
    expect(container.querySelector('a button')).toBeNull();
  });
});

describe('F3-22: fotos do Cloudinary no tamanho de exibição', () => {
  it('moderação do Instagram em 500 px', () => {
    const post = { id: 'p1', settingId: 's', platformId: 'ig', mediaUrl: CLOUD, permalink: '', author: 'ana', status: 'PENDING', postedAt: '2026-11-20T12:00:00.000Z', fetchedAt: '2026-11-20T12:00:00.000Z' } as SocialPost;
    render(<PostCard post={post} onApprove={vi.fn()} onReject={vi.fn()} />);
    expect(screen.getByRole('img').getAttribute('src')).toContain('/upload/f_auto,q_auto,w_500/');
  });

  it('avatar dos depoimentos em 80 px', async () => {
    apiFetch.mockResolvedValue([{ id: 'r1', rating: 5, comment: 'Som excelente, equipe pontual.', createdAt: '2026-11-01T12:00:00.000Z', reviewer: { name: 'Ana', avatarUrl: CLOUD } }]);
    const { container } = render(<TestimonialCarousel />);
    await screen.findByText('"Som excelente, equipe pontual."');
    expect(container.querySelector('img')?.getAttribute('src')).toContain('/upload/f_auto,q_auto,w_80/');
  });
});

describe('F3-10: placar do mural', () => {
  it('4º e 5º lugares com a foto numa caixa de 48 px (antes, no tamanho original)', () => {
    const items = ['a', 'b', 'c', 'd', 'e'].map((u, i) => ({ username: u, avatarUrl: CLOUD, count: 10 - i, platform: 'instagram' }));
    render(<LeaderboardSlide items={items} />);
    const fotos = screen.getAllByRole('img', { name: 'Avatar' });
    const caixas = fotos.filter((img) => img.parentElement?.classList.contains('h-12'));
    expect(caixas).toHaveLength(2);
    for (const img of caixas) expect(img.parentElement).toHaveClass('h-12', 'w-12', 'overflow-hidden', 'rounded-full');
  });
});

describe('F3-17: reserva na lista do cliente', () => {
  it('código curto e a data de Brasília (antes, o id interno e o fuso do aparelho)', () => {
    const reserva = { id: 'XP-ANA-20271220-2200-K4Q', eventDate: '2027-12-21T01:00:00.000Z', eventTitle: 'Formatura', status: 'CONFIRMED', totalPrice: 1500, equipments: [] } as unknown as SafeBooking;
    render(<BookingListItem booking={reserva} />);
    expect(screen.getByText('XP-ANA-20271220-2200-K4Q')).toBeInTheDocument();
    expect(screen.getByText('Data: 20/12/2027')).toBeInTheDocument();
    expect(screen.queryByText(/Reserva ID/)).not.toBeInTheDocument();
  });
});

describe('F3-12: nota dos depoimentos para o leitor de tela', () => {
  it('as estrelas viram "Nota N de 5"', () => {
    render(<TestimonialCard review={{ author: 'Ana', rating: 4, comment: 'Muito bom' }} />);
    expect(screen.getByRole('img', { name: 'Nota 4 de 5' })).toBeInTheDocument();
  });
});

describe('F5-19: capas dos guias', () => {
  it('no cartão, 640 px e carregamento preguiçoso; a CSP aceita o domínio das capas', () => {
    render(<HelmetProvider><MemoryRouter><GuideListPage /></MemoryRouter></HelmetProvider>);
    const capa = screen.getByRole('img', { name: GUIDES[0].title });
    expect(capa.getAttribute('src')).toContain('w=640');
    expect(capa.getAttribute('src')).not.toContain('w=1920');
    expect(capa).toHaveAttribute('loading', 'lazy');
    expect(new URL(GUIDES[0].coverImage).host).toBe('images.unsplash.com');
    expect(ler('vercel.json')).toMatch(/img-src [^;]*https:\/\/images\.unsplash\.com/);
  });
});

describe('F1-20: sitemap', () => {
  it('as listas públicas, a página de cookies e cada guia', async () => {
    for (const rota of ['/kits', '/servicos', '/guias', '/cookies']) expect(STATIC_ROUTES).toContain(rota);
    expect(GUIDE_ROUTES).toEqual(GUIDES.map((g) => `/guias/${g.slug}`));
    const xml = await generateSitemap();
    for (const rota of [...STATIC_ROUTES, ...GUIDE_ROUTES]) expect(xml).toContain(`<loc>https://www.xproducoeseeventos.com.br${rota}</loc>`);
  });
});

describe('F1-18: scripts e README do site', () => {
  const pkg = JSON.parse(ler('package.json')) as { scripts: Record<string, string> };

  it('sem os scripts que apontavam para arquivos que não existem', () => {
    for (const nome of ['server', 'preview', 'seed', 'optimize:images', 'analyze:bundle']) expect(pkg.scripts[nome]).toBeUndefined();
    for (const cmd of Object.values(pkg.scripts)) {
      for (const arquivo of cmd.match(/(?:scripts|src)\/[\w./-]+\.(?:ts|js)/g) ?? []) expect(existsSync(resolve(FRONT, arquivo))).toBe(true);
    }
  });

  it('o README não manda rodar o preview, diz React 19, explica api/ssr.js e só aponta para arquivos que existem', () => {
    const readme = ler('README.md');
    expect(readme).not.toContain('npm run preview');
    expect(readme).not.toContain('React 18');
    expect(readme).toContain('React 19');
    expect(readme).toContain('api/ssr.js');
    for (const [, alvo] of readme.matchAll(/\]\((\.\/[^)]+)\)/g)) expect(existsSync(resolve(FRONT, alvo))).toBe(true);
  });
});

describe('F1-15, F1-17 e F2-11', () => {
  it('F1-15: a mensagem interna do erro de SSR não vai mais num cabeçalho público', () => {
    expect(ler('api/ssr.js')).not.toContain('x-ssr-error-message');
  });

  it('F1-17: o nome padrão da empresa com til', () => {
    const { result } = renderHook(() => useAppSettings());
    expect(result.current.companyName).toBe('X Produções e Eventos');
  });

  it('F2-11: a Política de Cookies lista a chave da sessão encerrada', () => {
    expect(BROWSER_STORAGE.map((c) => c.name)).toContain('xp_session_expired');
    expect(ler('src/services/authservice.ts')).toContain("'xp_session_expired'");
  });
});
