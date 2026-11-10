import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { configure, render, screen, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

// Mesmo arranjo de components/__tests__/solicitarOrcamento.test.tsx: a página inicial de verdade, com as partes
// pesadas (carrossel, quiz, loader animado) trocadas por nada.
const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock('../../services/api', () => ({ apiFetch }));
vi.mock('../../contexts/SettingsContext', () => ({ useSettings: () => ({ companyName: 'X Produções', googleReviewUrl: null }) }));
vi.mock('../../components/ui/BannerCarousel', () => ({ BannerCarousel: () => null }));
vi.mock('../../components/ui/InteractiveQuiz', () => ({ InteractiveQuiz: () => null }));
vi.mock('../../components/ui/BrandLoader', () => ({ BrandLoader: () => null }));

import { HomePage } from '../HomePage';
import { INSTAGRAM_URL } from '../../data/site';

// Páginas inteiras: com a suíte toda rodando em paralelo, a primeira renderização passa de 1 s.
configure({ asyncUtilTimeout: 5000 });
vi.setConfig({ testTimeout: 20_000 });

// Pedido do dono de 09/11/2026 (Instagram): a página inicial ganha um bloco menor, com as 6 publicações mais
// recentes, link para o Portfólio e para o perfil. Sem publicações, o bloco não aparece.

const post = (i: number) => ({
  id: `ig${i}`,
  mediaType: 'IMAGE',
  caption: `Evento ${i}`,
  permalink: `https://www.instagram.com/p/HOME${i}/`,
  postedAt: '2026-11-08T15:00:00.000Z',
  imageUrl: `https://res.cloudinary.com/xprod/image/upload/v1/x-producoes/instagram/${i}.jpg`,
  isPinned: false,
  isVideo: false,
});

function mockApi(instagram: unknown) {
  apiFetch.mockImplementation((endpoint: string) =>
    endpoint.startsWith('/instagram/posts') ? Promise.resolve(instagram) : Promise.resolve([])
  );
}

const renderHome = () =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={['/']}>
        <HomePage />
      </MemoryRouter>
    </HelmetProvider>
  );

beforeEach(() => {
  apiFetch.mockReset();
});
afterEach(() => cleanup());

describe('Página inicial — bloco do Instagram', () => {
  it('pede 6 publicações e mostra o bloco com links para o Portfólio e para o perfil', async () => {
    mockApi({ posts: [1, 2, 3, 4, 5, 6].map(post), username: 'x_producoeseventos' });
    renderHome();

    expect(await screen.findAllByRole('link', { name: /Ver no Instagram/ })).toHaveLength(6);
    expect(apiFetch).toHaveBeenCalledWith('/instagram/posts?limit=6');
    expect(apiFetch.mock.calls.filter(([endpoint]) => String(endpoint).startsWith('/instagram/posts'))).toEqual([
      ['/instagram/posts?limit=6'],
    ]);
    expect(screen.getByRole('heading', { level: 2, name: 'Do nosso Instagram' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver mais no Portfólio' })).toHaveAttribute('href', '/portfolio');
    expect(screen.getByRole('link', { name: /Seguir @x_producoeseventos no Instagram/ })).toHaveAttribute('href', INSTAGRAM_URL);
  });

  it('sem publicações o bloco não aparece', async () => {
    mockApi({ posts: [], username: null });
    renderHome();
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/instagram/posts?limit=6'));
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Do nosso Instagram' })).toBeNull());
    expect(screen.getByRole('link', { name: 'Solicitar Orçamento' })).toHaveAttribute('href', '/briefing');
  });
});
