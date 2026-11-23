import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToString } from 'react-dom/server';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

// Onda 2 da auditoria de 19/11, lote 2b: F5-02, F5-06, F5-05, F8-08, F1-04, F1-05, F3-05, F3-06 e F1-09 (cada bloco diz
// o achado).
const { apiFetch, recommendationAPI, authAPI, addNotification, getPublicBanners } = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  recommendationAPI: { getTrending: vi.fn(), getSimilar: vi.fn(), getNew: vi.fn() },
  authAPI: { registerFromInvite: vi.fn() },
  addNotification: vi.fn(),
  getPublicBanners: vi.fn(),
}));
vi.mock('../services/api', () => ({ apiFetch, recommendationAPI, authAPI }));
vi.mock('@/services/api', () => ({ apiFetch, recommendationAPI, authAPI }));
vi.mock('../services/bannerService', () => ({ bannerService: { getPublicBanners } }));
vi.mock('../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../contexts/CartContext', () => ({ useCart: () => ({ cart: null, addToCart: vi.fn(), isInCart: () => false }) }));

import { CityLandingPage } from '../pages/CityLandingPage';
import { keepsScrollPosition } from '../utils/scrollToTopRule';
import { RegisterFromInvitePage } from '../pages/auth/RegisterFromInvitePage';
import { CompareProvider, useCompare } from '../contexts/CompareContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import { CookieConsentProvider } from '../contexts/CookieConsentContext';
import { safeGetItem, safeSetItem, safeRemoveItem } from '../utils/safeStorage';
import { BannerCarousel } from '../components/ui/BannerCarousel';

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  apiFetch.mockImplementation(() => new Promise(() => {}));
  recommendationAPI.getTrending.mockResolvedValue({ data: [] });
});

describe('F5-02: landings de SEO local', () => {
  const abrir = (url: string) =>
    render(
      <HelmetProvider>
        <MemoryRouter initialEntries={[url]}>
          <Routes><Route path="/:seoSlug" element={<CityLandingPage />} /></Routes>
        </MemoryRouter>
      </HelmetProvider>,
    );

  it('landing de verdade: "Equipamentos Disponíveis" pede os mais pedidos (sem exigir um item de referência)', async () => {
    abrir('/aluguel-som-belo-horizonte');
    await waitFor(() => expect(recommendationAPI.getTrending).toHaveBeenCalled());
    expect(recommendationAPI.getSimilar).not.toHaveBeenCalled();
  });

  it('endereço que não é serviço×cidade: a 404 aparece sem buscar estatísticas nem recomendações', async () => {
    abrir('/aluguel-som-cidade-que-nao-existe');
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    expect(apiFetch).not.toHaveBeenCalledWith('/reviews/stats');
    expect(recommendationAPI.getTrending).not.toHaveBeenCalled();
  });
});

describe('F5-05: rolagem ao abrir um projeto do portfólio', () => {
  it('entre /portfolio e /portfolio/:slug a página fica onde está; nas outras trocas, volta ao topo', () => {
    expect(keepsScrollPosition('/portfolio', '/portfolio/festa')).toBe(true);
    expect(keepsScrollPosition('/portfolio/festa', '/portfolio')).toBe(true);
    expect(keepsScrollPosition('/portfolio/festa', '/portfolio/outra')).toBe(true);
    expect(keepsScrollPosition('/', '/portfolio')).toBe(false);
    expect(keepsScrollPosition('/portfolio', '/kits')).toBe(false);
    expect(keepsScrollPosition('/portfolio', '/portfolio')).toBe(false);
    expect(keepsScrollPosition('/portfolios', '/portfolio/x')).toBe(false);
  });
});

describe('F8-08: cadastro por convite', () => {
  const abrir = () => {
    render(
      <HelmetProvider>
        <MemoryRouter initialEntries={['/cadastro-convite?token=tok1&email=ana%40x.test']}>
          <Routes><Route path="/cadastro-convite" element={<RegisterFromInvitePage />} /></Routes>
        </MemoryRouter>
      </HelmetProvider>,
    );
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Ana Lima' } });
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'ana@x.test' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'SenhaForte#123' } });
    const confirmar = screen.queryByLabelText(/Confirmar/);
    if (confirmar) fireEvent.change(confirmar, { target: { value: 'SenhaForte#123' } });
    fireEvent.submit(screen.getByLabelText('Nome').closest('form')!);
  };
  const erroDoAxios = (status: number, data: object) =>
    Object.assign(new Error(`Request failed with status code ${status}`), { isAxiosError: true, response: { status, data } });

  it('mostra o motivo que o servidor mandou, não "Request failed with status code 400"', async () => {
    authAPI.registerFromInvite.mockRejectedValue(erroDoAxios(400, { success: false, error: 'Email não corresponde ao convite' }));
    abrir();
    expect(await screen.findByText('Email não corresponde ao convite')).toBeInTheDocument();
    expect(screen.queryByText(/Request failed/)).not.toBeInTheDocument();
  });

  it('convite vencido ou já usado: mensagem própria, pedindo um novo convite', async () => {
    authAPI.registerFromInvite.mockRejectedValue(erroDoAxios(400, { success: false, error: 'Token expirado' }));
    abrir();
    expect(await screen.findByText(/Este convite venceu ou não é mais válido/)).toBeInTheDocument();
  });
});

describe('F1-04: comparação lida depois da hidratação', () => {
  const Contador = () => <span data-testid="n">{useCompare().items.length}</span>;

  it('o primeiro render é igual ao do servidor (vazio); depois carrega o salvo, sem apagá-lo', async () => {
    localStorage.setItem('xproducoes-compare', JSON.stringify([{ id: 'eq1', name: 'Caixa' }, { id: 'eq2', name: 'Mesa' }]));
    expect(renderToString(<CompareProvider><Contador /></CompareProvider>)).toContain('>0<');

    render(<CompareProvider><Contador /></CompareProvider>);
    await waitFor(() => expect(screen.getByTestId('n')).toHaveTextContent('2'));
    expect(JSON.parse(localStorage.getItem('xproducoes-compare') as string)).toHaveLength(2);
  });
});

describe('F1-05: dados de sites bloqueados', () => {
  let spy: ReturnType<typeof vi.spyOn> | undefined;
  beforeEach(() => {
    spy = vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    });
  });
  afterEach(() => spy?.mockRestore());

  it('safeStorage não lança: lê null e grava/apaga sem erro', () => {
    expect(safeGetItem('theme')).toBeNull();
    expect(() => safeSetItem('theme', 'dark')).not.toThrow();
    expect(() => safeRemoveItem('theme')).not.toThrow();
  });

  it('tema e consentimento de cookies montam sem derrubar o site', async () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    render(
      <ThemeProvider>
        <CookieConsentProvider>
          <p>Site no ar</p>
        </CookieConsentProvider>
      </ThemeProvider>,
    );
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    expect(screen.getByText('Site no ar')).toBeInTheDocument();
    vi.unstubAllGlobals();
  });
});

describe('F3-05: banner da home', () => {
  it('reserva a altura enquanto carrega e some se não houver banner', async () => {
    let responder: (b: unknown[]) => void = () => undefined;
    getPublicBanners.mockReturnValue(new Promise((r) => { responder = r; }));
    render(<MemoryRouter><BannerCarousel /></MemoryRouter>);
    expect(screen.getByTestId('banner-placeholder')).toHaveClass('h-[min(500px,60vh)]');

    await act(async () => { responder([]); });
    expect(screen.queryByTestId('banner-placeholder')).not.toBeInTheDocument();
  });

  it('com banner: troca o espaço reservado pela imagem', async () => {
    getPublicBanners.mockResolvedValue([{ id: 'b1', title: 'Verão', imageUrl: 'https://img.test/b.jpg', linkUrl: '/kits' }]);
    render(<MemoryRouter><BannerCarousel /></MemoryRouter>);
    expect(await screen.findByRole('img', { name: 'Verão' })).toBeInTheDocument();
    expect(screen.queryByTestId('banner-placeholder')).not.toBeInTheDocument();
  });
});

describe('F1-09: dependência do SSR', () => {
  it('react-streaming (que o onRenderHtml importa) é dependência direta; vike-react (sem uso) saiu', () => {
    const pkg = JSON.parse(readFileSync(resolve(__dirname, '../../package.json'), 'utf8')) as { dependencies: Record<string, string> };
    expect(readFileSync(resolve(__dirname, '../../renderer/+onRenderHtml.tsx'), 'utf8')).toContain("from 'react-streaming/server'");
    expect(pkg.dependencies['react-streaming']).toBeDefined();
    expect(pkg.dependencies['vike-react']).toBeUndefined();
  });
});
