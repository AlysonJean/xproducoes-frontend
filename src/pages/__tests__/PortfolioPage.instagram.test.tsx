import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, configure, render, screen, cleanup, within, fireEvent, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import { MemoryRouter, Route, Routes, useNavigate, type NavigateFunction } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock('../../services/api', () => ({ apiFetch }));

import { PortfolioPage } from '../PortfolioPage';

// Páginas inteiras: com a suíte toda rodando em paralelo, a primeira renderização passa de 1 s.
configure({ asyncUtilTimeout: 5000 });
vi.setConfig({ testTimeout: 20_000 });

// Pedido do dono de 09/11/2026 (Instagram):
// - /portfolio ganha a seção "Do nosso Instagram" (12 publicações) abaixo dos projetos;
// - mídia de projeto com embedUrl é um vídeo do Instagram: a capa com botão de assistir e o player só depois do clique;
// - a trilha de /portfolio/<slug> usa o título do projeto. Antes ela era montada do endereço e mostrava
//   "Camarote no estadio mineirao" (sem acentos, também no BreadcrumbList do Google).

const IMG = (id: string) => `https://res.cloudinary.com/xprod/image/upload/v1/x-producoes/${id}.jpg`;

const camarote = {
  id: 'pf1',
  title: 'Camarote no Estádio Mineirão',
  slug: 'camarote-no-estadio-mineirao',
  imageUrl: IMG('camarote'),
  description: 'Som e luz no camarote.',
  eventDate: '2026-05-01T00:00:00.000Z',
  isPinned: true,
  sortOrder: 1,
  media: [
    { id: 'm1', portfolioId: 'pf1', url: IMG('camarote'), type: 'IMAGE', isCover: true, sortOrder: 0, embedUrl: null },
    { id: 'm2', portfolioId: 'pf1', url: IMG('foto-2'), type: 'IMAGE', isCover: false, sortOrder: 1, embedUrl: null, filename: 'foto-2.jpg' },
    { id: 'm3', portfolioId: 'pf1', url: 'https://res.cloudinary.com/xprod/video/upload/v1/clip.mp4', type: 'VIDEO', isCover: false, sortOrder: 2, filename: 'clip.mp4' },
  ],
};
const carrossel = {
  id: 'pf2',
  title: 'Festa de 15 anos',
  slug: 'festa-de-15-anos',
  imageUrl: IMG('ig-capa'),
  description: 'Pista e iluminação.',
  eventDate: '2026-10-10T00:00:00.000Z',
  isPinned: false,
  sortOrder: 0,
  media: [
    { id: 'i1', portfolioId: 'pf2', url: IMG('ig-capa'), type: 'IMAGE', isCover: true, sortOrder: 0, embedUrl: null },
    { id: 'i2', portfolioId: 'pf2', url: IMG('ig-video-capa'), type: 'IMAGE', isCover: false, sortOrder: 1, embedUrl: 'https://www.instagram.com/p/CARR1/' },
  ],
};
const reel = {
  id: 'pf3',
  title: 'Montagem do palco',
  slug: 'montagem-do-palco',
  imageUrl: IMG('reel-capa'),
  description: '',
  eventDate: '2026-10-20T00:00:00.000Z',
  isPinned: false,
  sortOrder: -1,
  media: [{ id: 'r1', portfolioId: 'pf3', url: IMG('reel-capa'), type: 'IMAGE', isCover: true, sortOrder: 0, embedUrl: 'https://www.instagram.com/reel/REEL9/' }],
};

const instagramPost = {
  id: 'ig1',
  mediaType: 'IMAGE',
  caption: 'Bastidores da montagem',
  permalink: 'https://www.instagram.com/p/POST1/',
  postedAt: '2026-11-08T15:00:00.000Z',
  imageUrl: IMG('instagram/1'),
  isPinned: false,
  isVideo: false,
};

function mockApi(portfolio: Promise<unknown> | unknown, instagram: unknown = { posts: [], username: null }) {
  apiFetch.mockImplementation((endpoint: string) => {
    if (endpoint === '/portfolio') return portfolio instanceof Promise ? portfolio : Promise.resolve(portfolio);
    if (endpoint.startsWith('/instagram/posts')) return Promise.resolve(instagram);
    return Promise.reject(new Error(`endpoint inesperado: ${endpoint}`));
  });
}

const renderAt = (url: string) =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/portfolio" element={<PortfolioPage />} />
          <Route path="/portfolio/:slug" element={<PortfolioPage />} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>
  );

const trail = () => screen.getByRole('navigation', { name: 'Trilha de navegação' });

function breadcrumbNames(): string[] | null {
  for (const script of Array.from(document.head.querySelectorAll('script[type="application/ld+json"]'))) {
    const data = JSON.parse(script.textContent || '{}');
    if (data['@type'] === 'BreadcrumbList') return data.itemListElement.map((item: { name: string }) => item.name);
  }
  return null;
}

beforeEach(() => {
  apiFetch.mockReset();
});
afterEach(() => {
  cleanup();
  document.head.querySelectorAll('script[type="application/ld+json"], meta, title').forEach((el) => el.remove());
});

describe('Portfólio — seção do Instagram', () => {
  it('/portfolio pede 12 publicações e mostra "Do nosso Instagram" abaixo dos projetos, com link para o perfil', async () => {
    mockApi([camarote], { posts: [instagramPost], username: 'x_producoeseventos' });
    renderAt('/portfolio');

    expect(await screen.findByRole('link', { name: /Ver no Instagram/ })).toHaveAttribute('href', 'https://www.instagram.com/p/POST1/');
    expect(apiFetch).toHaveBeenCalledWith('/instagram/posts?limit=12');
    expect(screen.getByRole('heading', { level: 2, name: 'Do nosso Instagram' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Seguir @x_producoeseventos no Instagram/ })).toHaveAttribute(
      'href',
      'https://www.instagram.com/x_producoeseventos'
    );
    // Abaixo dos projetos: o card do projeto vem antes da seção no documento.
    const project = screen.getByRole('heading', { level: 2, name: 'Camarote no Estádio Mineirão' });
    const section = screen.getByRole('heading', { level: 2, name: 'Do nosso Instagram' });
    expect(project.compareDocumentPosition(section) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('sem publicações a seção não aparece e o resto da página continua igual', async () => {
    mockApi([camarote]);
    renderAt('/portfolio');
    expect(await screen.findByRole('heading', { level: 2, name: 'Camarote no Estádio Mineirão' })).toBeInTheDocument();
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/instagram/posts?limit=12'));
    expect(screen.queryByRole('heading', { name: 'Do nosso Instagram' })).toBeNull();
    expect(screen.getByRole('heading', { level: 2, name: /Quer ver o/ })).toBeInTheDocument();
  });
});

describe('Portfólio — trilha de navegação com o título do projeto', () => {
  it('/portfolio: só "Portfólio", com acento, como página atual', async () => {
    mockApi([camarote]);
    renderAt('/portfolio');
    await screen.findByRole('heading', { level: 2, name: 'Camarote no Estádio Mineirão' });
    const current = within(trail()).getByText('Portfólio');
    expect(current).toHaveAttribute('aria-current', 'page');
    expect(within(trail()).queryByText('Portfolio')).toBeNull();
    await waitFor(() => expect(breadcrumbNames()).toEqual(['Início', 'Portfólio']));
  });

  it('/portfolio/camarote-no-estadio-mineirao: enquanto carrega só "Portfólio"; depois "Camarote no Estádio Mineirão", nunca o texto do endereço', async () => {
    let resolvePortfolio: (value: unknown) => void = () => {};
    mockApi(new Promise((resolve) => (resolvePortfolio = resolve)));
    renderAt('/portfolio/camarote-no-estadio-mineirao');

    // Carregando.
    expect(screen.getByText('Carregando portfólio...')).toBeInTheDocument();
    expect(within(trail()).getByRole('link', { name: 'Portfólio' })).toHaveAttribute('href', '/portfolio');
    expect(trail().textContent).not.toMatch(/camarote/i);
    await waitFor(() => expect(breadcrumbNames()).toEqual(['Início', 'Portfólio']));

    // Carregado: título do projeto como página atual.
    resolvePortfolio([camarote]);
    await screen.findByRole('dialog', { name: 'Camarote no Estádio Mineirão' });
    const current = within(trail()).getByText('Camarote no Estádio Mineirão');
    expect(current).toHaveAttribute('aria-current', 'page');
    expect(within(trail()).getByRole('link', { name: 'Portfólio' })).toHaveAttribute('href', '/portfolio');
    expect(trail().textContent).not.toContain('Camarote no estadio mineirao');
    expect(trail().textContent).not.toContain('camarote-no-estadio-mineirao');
    await waitFor(() => expect(breadcrumbNames()).toEqual(['Início', 'Portfólio', 'Camarote no Estádio Mineirão']));
  });

  it('ao ir de um projeto para outro (Voltar/Avançar do navegador), a trilha nunca mostra o título do projeto anterior', async () => {
    const router: { navigate?: NavigateFunction } = {};
    const NavProbe = () => {
      const navigate = useNavigate();
      useEffect(() => {
        router.navigate = navigate;
      }, [navigate]);
      return null;
    };
    let calls = 0;
    apiFetch.mockImplementation((endpoint: string) => {
      if (endpoint === '/portfolio') return ++calls === 1 ? Promise.resolve([camarote, carrossel]) : new Promise(() => {});
      if (endpoint.startsWith('/instagram/posts')) return Promise.resolve({ posts: [], username: null });
      return Promise.reject(new Error(`endpoint inesperado: ${endpoint}`));
    });
    render(
      <HelmetProvider>
        <MemoryRouter initialEntries={['/portfolio/camarote-no-estadio-mineirao']}>
          <NavProbe />
          <Routes>
            <Route path="/portfolio" element={<PortfolioPage />} />
            <Route path="/portfolio/:slug" element={<PortfolioPage />} />
          </Routes>
        </MemoryRouter>
      </HelmetProvider>
    );
    await screen.findByRole('dialog', { name: 'Camarote no Estádio Mineirão' });
    expect(within(trail()).getByText('Camarote no Estádio Mineirão')).toBeInTheDocument();

    // Outro projeto, ainda carregando: o projeto aberto antes continua guardado, mas a trilha fica só em "Portfólio".
    act(() => {
      void router.navigate?.('/portfolio/festa-de-15-anos');
    });
    expect(await screen.findByText('Carregando portfólio...')).toBeInTheDocument();
    expect(within(trail()).getByRole('link', { name: 'Portfólio' })).toHaveAttribute('href', '/portfolio');
    expect(trail().textContent).not.toContain('Camarote no Estádio Mineirão');
    expect(trail().textContent).not.toMatch(/festa/i);
    await waitFor(() => expect(breadcrumbNames()).toEqual(['Início', 'Portfólio']));
  });

  it('endereço de um projeto que não existe: fica só "Portfólio" (sem o texto do endereço)', async () => {
    mockApi([camarote]);
    renderAt('/portfolio/projeto-apagado');
    await screen.findByRole('heading', { level: 2, name: 'Camarote no Estádio Mineirão' });
    expect(within(trail()).getByRole('link', { name: 'Portfólio' })).toBeInTheDocument();
    expect(trail().textContent).not.toMatch(/projeto apagado|projeto-apagado/i);
  });
});

describe('Portfólio — vídeo do Instagram na galeria do projeto', () => {
  it('mídia com embedUrl: capa com botão de assistir, sem player antes do clique; depois, o player da publicação', async () => {
    mockApi([carrossel]);
    renderAt('/portfolio/festa-de-15-anos');
    const dialog = await screen.findByRole('dialog', { name: 'Festa de 15 anos' });

    const play = within(dialog).getByRole('button', { name: 'Assistir ao vídeo: Festa de 15 anos - vídeo 1' });
    expect(play.querySelector('img')?.getAttribute('src')).toContain('x-producoes/ig-video-capa.jpg');
    expect(document.querySelector('iframe')).toBeNull();

    fireEvent.click(play);
    await screen.findByRole('dialog', { name: 'Vídeo do Instagram' });
    const iframes = document.querySelectorAll('iframe');
    expect(iframes).toHaveLength(1);
    expect(iframes[0].getAttribute('src')).toBe('https://www.instagram.com/p/CARR1/embed/');
  });

  it('projeto de um Reel (a capa é o vídeo): a capa do topo vira o botão de assistir', async () => {
    mockApi([reel]);
    renderAt('/portfolio/montagem-do-palco');
    const dialog = await screen.findByRole('dialog', { name: 'Montagem do palco' });
    expect(document.querySelector('iframe')).toBeNull();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Assistir ao vídeo: Montagem do palco' }));
    await screen.findByRole('dialog', { name: 'Vídeo do Instagram' });
    expect(document.querySelector('iframe')?.getAttribute('src')).toBe('https://www.instagram.com/reel/REEL9/embed/');
  });

  it('projetos antigos (sem embedUrl) continuam iguais: capa, fotos com link e vídeo do Cloudinary com controles', async () => {
    mockApi([camarote]);
    renderAt('/portfolio/camarote-no-estadio-mineirao');
    const dialog = await screen.findByRole('dialog', { name: 'Camarote no Estádio Mineirão' });

    expect(within(dialog).queryByRole('button', { name: /Assistir ao vídeo/ })).toBeNull();
    expect(within(dialog).getByRole('img', { name: 'Camarote no Estádio Mineirão' })).toHaveAttribute('src', IMG('camarote'));
    expect(within(dialog).getByRole('link', { name: 'Abrir foto-2.jpg em nova aba' })).toHaveAttribute('href', IMG('foto-2'));
    const video = dialog.querySelector('video');
    expect(video?.getAttribute('src')).toBe('https://res.cloudinary.com/xprod/video/upload/v1/clip.mp4');
    expect(video?.hasAttribute('controls')).toBe(true);
    expect(document.querySelector('iframe')).toBeNull();
  });
});
