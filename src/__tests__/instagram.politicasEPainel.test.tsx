import type React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { configure, render, screen, cleanup, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock('../services/api', () => ({ apiFetch }));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'a1', name: 'Admin', role: 'ADMIN' }, isAuthenticated: true, isLoading: false }) }));
vi.mock('../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));
vi.mock('../components/admin/AdminLayout', () => {
  const Passthrough = ({ children }: { children: React.ReactNode }) => <>{children}</>;
  return { default: Passthrough, AdminLayout: Passthrough };
});

import vercelConfig from '../../vercel.json';
import { CookiesPage } from '../pages/CookiesPage';
import { CookieConsentProvider } from '../contexts/CookieConsentContext';
import { INSTAGRAM_PLAYER_NOTICE } from '../data/cookiePolicy';
import { PRIVACY_POLICY_SECTIONS, PRIVACY_POLICY_UPDATED_AT } from '../data/privacyPolicy';
import { AdminSidebar } from '../components/admin/AdminSidebar';
import AdminRoutes from '../routes/AdminRoutes';

// Páginas inteiras: com a suíte toda rodando em paralelo, a primeira renderização passa de 1 s.
configure({ asyncUtilTimeout: 5000 });
vi.setConfig({ testTimeout: 20_000 });

// Pedido do dono de 09/11/2026 (Instagram): o player dos vídeos é um iframe da Meta que só carrega depois do clique.
// Ele entra na Política de Cookies, na Política de Privacidade e na lista de frames permitidos da CSP; o painel ganha
// o item "Instagram", ao lado de "Portfólio", e a rota /admin/instagram.

const norm = (text: string) => text.replace(/\s+/g, ' ').trim();

beforeEach(() => {
  apiFetch.mockReset();
  window.localStorage.clear();
});
afterEach(() => cleanup());

describe('Instagram — políticas', () => {
  it('Política de Cookies: seção dos vídeos do Instagram, só depois do clique, com a Meta e os Estados Unidos', () => {
    render(
      <HelmetProvider>
        <MemoryRouter initialEntries={['/cookies']}>
          <CookieConsentProvider>
            <CookiesPage />
          </CookieConsentProvider>
        </MemoryRouter>
      </HelmetProvider>
    );
    const heading = screen.getByRole('heading', { level: 2, name: 'Vídeos do Instagram (só se você clicar)' });
    const section = heading.closest('section') as HTMLElement;
    const text = norm(section.textContent ?? '');
    expect(text).toContain('vê-las não envia nada ao Instagram');
    expect(text).toContain('O player do Instagram só carrega quando você clica para assistir a um vídeo.');
    expect(text).toContain('o Instagram (Meta, nos Estados Unidos) recebe o seu endereço IP e os dados do seu navegador e pode gravar cookies próprios');
    expect(within(section).getByText(INSTAGRAM_PLAYER_NOTICE).tagName).toBe('P');
  });

  it('Política de Privacidade: linha "Meta (Instagram)" nos serviços (Estados Unidos) e a frase do player em Cookies', () => {
    const services = PRIVACY_POLICY_SECTIONS.find((section) => section.id === 'servicos');
    const table = services?.blocks.find((block) => block.kind === 'table');
    expect(table?.kind).toBe('table');
    const rows = table && table.kind === 'table' ? table.rows : [];
    const instagram = rows.find((row) => row[0] === 'Meta (Instagram)');
    expect(instagram).toBeDefined();
    expect(instagram?.[1]).toContain('essa importação não usa dados de quem visita o site');
    expect(instagram?.[1]).toContain('só carrega se você clicar para assistir');
    expect(instagram?.[1]).toContain('pode gravar cookies da Meta');
    expect(instagram?.[2]).toBe('Estados Unidos');
    // A linha do WhatsApp continua igual e separada.
    expect(rows.filter((row) => row[0].startsWith('Meta'))).toHaveLength(2);

    const cookies = PRIVACY_POLICY_SECTIONS.find((section) => section.id === 'cookies');
    expect(cookies?.blocks.some((block) => block.kind === 'paragraph' && block.text === INSTAGRAM_PLAYER_NOTICE)).toBe(true);
    // Mesma versão do dia (o texto novo é de 09/11/2026).
    expect(PRIVACY_POLICY_UPDATED_AT).toBe('09/11/2026');
  });

  it('CSP (Report-Only): frame-src aceita o player do Instagram, além do login do Google', () => {
    const general = vercelConfig.headers.find((rule) => rule.source === '/(.*)');
    const csp = general?.headers.find((header) => header.key === 'Content-Security-Policy-Report-Only')?.value ?? '';
    const frameSrc = csp
      .split(';')
      .map((directive) => directive.trim())
      .find((directive) => directive.startsWith('frame-src '));
    expect(frameSrc?.split(/\s+/)).toEqual(['frame-src', "'self'", 'https://accounts.google.com', 'https://www.instagram.com']);
    // O resto da política não mudou de forma: frame-ancestors continua 'none'.
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp.split(';').filter((d) => d.trim().startsWith('frame-src'))).toHaveLength(1);
  });
});

describe('Instagram — painel', () => {
  it('menu do painel: "Instagram" logo depois de "Portfólio", levando a /admin/instagram', () => {
    apiFetch.mockResolvedValue({ total: 0 });
    render(
      <MemoryRouter initialEntries={['/admin/painel']}>
        <AdminSidebar />
      </MemoryRouter>
    );
    const menu = screen.getByRole('navigation', { name: 'Menu do painel administrativo' });
    const links = within(menu).getAllByRole('link').map((link) => link.getAttribute('href'));
    const portfolio = links.indexOf('/admin/portfolio');
    expect(portfolio).toBeGreaterThan(-1);
    expect(links[portfolio + 1]).toBe('/admin/instagram');
    expect(within(menu).getByRole('link', { name: /Instagram/ })).toHaveTextContent('Fotos e vídeos do Instagram no site');
  });

  it('a rota /admin/instagram abre a tela do Instagram', async () => {
    apiFetch.mockImplementation((endpoint: string) =>
      endpoint === '/admin/instagram/status'
        ? Promise.resolve({ status: 'disconnected', portfolioHashtag: 'portfolioX', counts: { total: 0, visible: 0, hidden: 0, inPortfolio: 0 } })
        : Promise.resolve([])
    );
    render(
      <MemoryRouter initialEntries={['/admin/instagram']}>
        <Routes>
          <Route path="/admin/*" element={<AdminRoutes />} />
        </Routes>
      </MemoryRouter>
    );
    expect(await screen.findByRole('heading', { level: 2, name: 'Conexão com o Instagram' })).toBeInTheDocument();
    expect(apiFetch).toHaveBeenCalledWith('/admin/instagram/status');
    expect(apiFetch).toHaveBeenCalledWith('/admin/instagram/posts');
  });
});
