import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { configure, render, screen, cleanup, within, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock('../../services/api', () => ({ apiFetch }));

import { InstagramFeed } from '../InstagramFeed';
import { InstagramVideo } from '../InstagramVideo';
import { INSTAGRAM_URL } from '../../data/site';

// Páginas inteiras: com a suíte toda rodando em paralelo, a primeira renderização passa de 1 s.
configure({ asyncUtilTimeout: 5000 });
vi.setConfig({ testTimeout: 20_000 });

// Pedido do dono de 09/11/2026 (Instagram): as publicações de @x_producoeseventos aparecem no site sozinhas. A seção
// mostra foto, resumo da legenda, data e "Ver no Instagram"; some quando não há publicações ou a busca falha (nunca
// uma caixa de erro no site público); vídeo só carrega o player do Instagram depois do clique, e só a partir de um
// endereço do Instagram.

const IMG = (id: string) => `https://res.cloudinary.com/xprod/image/upload/v1/x-producoes/instagram/${id}.jpg`;
const LONG_CAPTION = `Camarote no Estádio Mineirão 🎉\n${'Som, luz e estrutura completa para o camarote com a equipe técnica do começo ao fim. '.repeat(3)}#portfolioX`;

const photo = {
  id: 'p1',
  mediaType: 'IMAGE',
  caption: 'Casamento no sítio\nSom ambiente e pista',
  permalink: 'https://www.instagram.com/p/FOTO123/',
  postedAt: '2026-11-09T02:30:00.000Z',
  imageUrl: IMG('111'),
  isPinned: false,
  isVideo: false,
};
const reel = {
  id: 'p2',
  mediaType: 'VIDEO',
  caption: LONG_CAPTION,
  permalink: 'https://www.instagram.com/reel/REEL456/',
  postedAt: '2026-11-07T20:00:00.000Z',
  imageUrl: IMG('222'),
  isPinned: true,
  isVideo: true,
};

const renderFeed = (limit = 12, showPortfolioLink = false) =>
  render(
    <MemoryRouter>
      <InstagramFeed limit={limit} showPortfolioLink={showPortfolioLink} />
    </MemoryRouter>
  );

/** Nenhum elemento com src (iframe, img, script) aponta para o Instagram: nada foi pedido a ele. */
const instagramRequests = () =>
  Array.from(document.querySelectorAll('[src]'))
    .map((el) => el.getAttribute('src') ?? '')
    .filter((src) => /instagram\.com/i.test(src));

beforeEach(() => {
  apiFetch.mockReset();
});
afterEach(() => cleanup());

describe('InstagramFeed — publicações do Instagram no site', () => {
  it('mostra foto (cópia no Cloudinary), resumo da legenda, data no horário de Brasília e o link "Ver no Instagram"', async () => {
    apiFetch.mockResolvedValue({ posts: [reel, photo], username: 'x_producoeseventos' });
    renderFeed(12);

    expect(await screen.findByRole('heading', { level: 2, name: 'Do nosso Instagram' })).toBeInTheDocument();
    expect(apiFetch).toHaveBeenCalledWith('/instagram/posts?limit=12');

    const items = await screen.findAllByRole('listitem');
    expect(items).toHaveLength(2);

    const photoCard = within(items[1]);
    const img = photoCard.getByRole('img', { name: 'Casamento no sítio Som ambiente e pista' });
    expect(img.getAttribute('src')).toContain('res.cloudinary.com/xprod/image/upload/');
    expect(img.getAttribute('src')).toContain('x-producoes/instagram/111.jpg');
    expect(photoCard.getByText('Casamento no sítio Som ambiente e pista')).toBeInTheDocument();
    // 02:30 UTC do dia 9 = noite do dia 8 em Belo Horizonte.
    const time = items[1].querySelector('time');
    expect(time?.textContent).toBe('8 de novembro de 2026');
    expect(time?.getAttribute('datetime')).toBe('2026-11-09T02:30:00.000Z');
    const link = photoCard.getByRole('link', { name: /Ver no Instagram/ });
    expect(link).toHaveAttribute('href', 'https://www.instagram.com/p/FOTO123/');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');

    // Legenda longa: só o começo, com reticências (a legenda inteira fica no Instagram).
    const reelText = items[0].querySelector('p')?.textContent ?? '';
    expect(reelText.startsWith('Camarote no Estádio Mineirão 🎉 Som, luz e estrutura')).toBe(true);
    expect(reelText.endsWith('…')).toBe(true);
    expect(Array.from(reelText).length).toBeLessThanOrEqual(121);
    expect(reelText).not.toContain('#portfolioX');

    // Link para o perfil.
    expect(screen.getByRole('link', { name: /Seguir @x_producoeseventos no Instagram/ })).toHaveAttribute('href', INSTAGRAM_URL);
    expect(screen.queryByRole('link', { name: 'Ver mais no Portfólio' })).toBeNull();
  });

  it('enquanto carrega, mostra o esqueleto (sem erro e sem pedir nada ao Instagram)', () => {
    apiFetch.mockReturnValue(new Promise(() => {}));
    const { container } = renderFeed(6);
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(screen.getByText('Carregando as publicações do Instagram…')).toBeInTheDocument();
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThanOrEqual(6);
    expect(instagramRequests()).toEqual([]);
  });

  it('lista vazia: a seção inteira some', async () => {
    apiFetch.mockResolvedValue({ posts: [], username: null });
    const { container } = renderFeed(12);
    await waitFor(() => expect(container.innerHTML).toBe(''));
    expect(screen.queryByRole('heading', { name: 'Do nosso Instagram' })).toBeNull();
  });

  it('busca com erro: a seção some, sem caixa de erro no site público', async () => {
    apiFetch.mockRejectedValue(Object.assign(new Error('HTTP 500: Erro no servidor'), { status: 500 }));
    const { container } = renderFeed(12);
    await waitFor(() => expect(container.innerHTML).toBe(''));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByText(/erro/i)).toBeNull();
  });

  it('vídeo: nada do Instagram antes do clique; depois do clique, exatamente o player oficial da publicação', async () => {
    apiFetch.mockResolvedValue({ posts: [reel], username: 'x_producoeseventos' });
    renderFeed(12);

    const play = await screen.findByRole('button', { name: /^Assistir ao vídeo: Camarote no Estádio Mineirão/ });
    expect(document.querySelector('iframe')).toBeNull();
    expect(instagramRequests()).toEqual([]);
    // A capa é a cópia do Cloudinary.
    expect(play.querySelector('img')?.getAttribute('src')).toContain('x-producoes/instagram/222.jpg');

    fireEvent.click(play);

    const dialog = await screen.findByRole('dialog', { name: 'Vídeo do Instagram' });
    const iframes = document.querySelectorAll('iframe');
    expect(iframes).toHaveLength(1);
    expect(iframes[0].getAttribute('src')).toBe('https://www.instagram.com/reel/REEL456/embed/');
    expect(within(dialog).getByRole('link', { name: 'Abrir no Instagram' })).toHaveAttribute('href', 'https://www.instagram.com/reel/REEL456/');

    // Fechar tira o player da página.
    fireEvent.click(within(dialog).getByRole('button', { name: /fechar/i }));
    await waitFor(() => expect(document.querySelector('iframe')).toBeNull());
  });

  it('publicação com endereço de outro site não aparece (nem link, nem player)', async () => {
    apiFetch.mockResolvedValue({
      posts: [{ ...reel, id: 'x', permalink: 'https://evil.example/reel/REEL456/' }, photo],
      username: 'x_producoeseventos',
    });
    renderFeed(12);
    expect(await screen.findAllByRole('listitem')).toHaveLength(1);
    expect(screen.queryByRole('button', { name: /Assistir ao vídeo/ })).toBeNull();
    expect(document.querySelector('a[href*="evil.example"]')).toBeNull();
  });

  it('bloco da página inicial: 6 publicações e links para o Portfólio e para o perfil', async () => {
    const many = Array.from({ length: 8 }, (_, i) => ({ ...photo, id: `m${i}`, permalink: `https://www.instagram.com/p/M${i}/` }));
    apiFetch.mockResolvedValue({ posts: many, username: 'x_producoeseventos' });
    renderFeed(6, true);
    expect(apiFetch).toHaveBeenCalledWith('/instagram/posts?limit=6');
    expect(await screen.findAllByRole('listitem')).toHaveLength(6);
    expect(screen.getByRole('link', { name: 'Ver mais no Portfólio' })).toHaveAttribute('href', '/portfolio');
    expect(screen.getByRole('link', { name: /Seguir @x_producoeseventos no Instagram/ })).toHaveAttribute('href', INSTAGRAM_URL);
  });
});

describe('InstagramVideo — capa com botão de assistir', () => {
  it('endereço de outro site: só a capa, sem botão e sem player', () => {
    render(<InstagramVideo permalink="https://instagram.com.evil.example/reel/ABC/" imageUrl={IMG('9')} label="Vídeo do evento" />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByRole('img', { name: 'Vídeo do evento' })).toBeInTheDocument();
    expect(document.querySelector('iframe')).toBeNull();
  });
});
