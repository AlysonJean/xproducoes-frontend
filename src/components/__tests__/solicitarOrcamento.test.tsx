import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

// "Solicitar Orçamento" abria o WhatsApp no topo e na home, e a página de contato nas páginas por
// cidade. O mesmo texto agora leva sempre ao briefing.
vi.mock('../../services/api', () => ({ apiFetch: vi.fn() }));
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: false, user: null, logout: vi.fn() }),
}));
vi.mock('../../hooks/useCart', () => ({ useCart: () => ({ itemCount: 0 }) }));
vi.mock('../../contexts/CompareContext', () => ({ useCompare: () => ({ items: [] }) }));
vi.mock('../../contexts/SettingsContext', () => ({ useSettings: () => ({ companyName: 'X Produções' }) }));
vi.mock('../ui/ThemeToggle', () => ({ ThemeToggle: () => null }));
vi.mock('../ui/ThemedLogo', () => ({ default: () => null }));
vi.mock('../ui/BannerCarousel', () => ({ BannerCarousel: () => null }));
vi.mock('../ui/InteractiveQuiz', () => ({ InteractiveQuiz: () => null }));
vi.mock('../ui/BrandLoader', () => ({ BrandLoader: () => null }));
vi.mock('../../hooks/useRecommendations', () => ({
  useRecommendations: () => ({ recommendations: [], loading: false, error: null }),
}));

import { RequestQuoteButton } from '../RequestQuoteButton';
import { Header } from '../Header';
import { HomePage } from '../../pages/HomePage';
import { CityLandingPage } from '../../pages/CityLandingPage';
import { apiFetch } from '../../services/api';

const renderAt = (element: React.ReactElement, url = '/') =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/" element={element} />
          <Route path="/:seoSlug" element={element} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );

describe('"Solicitar Orçamento" leva sempre ao briefing', () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockResolvedValue([]);
  });

  it('botão do topo do site', () => {
    renderAt(<RequestQuoteButton />);
    expect(screen.getByRole('link', { name: 'Solicitar orçamento' })).toHaveAttribute('href', '/briefing');
  });

  it('menu do celular, que fecha ao tocar', () => {
    renderAt(<Header />);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir menu' }));
    const menu = screen.getByRole('navigation', { name: 'Menu principal' });
    const link = within(menu).getByRole('link', { name: 'Solicitar Orçamento' });
    expect(link).toHaveAttribute('href', '/briefing');

    fireEvent.click(link);
    expect(screen.queryByRole('navigation', { name: 'Menu principal' })).toBeNull();
  });

  it('página inicial', async () => {
    renderAt(<HomePage />);
    expect(await screen.findByRole('link', { name: 'Solicitar Orçamento' })).toHaveAttribute('href', '/briefing');
  });

  it('páginas por cidade', async () => {
    renderAt(<CityLandingPage />, '/aluguel-som-belo-horizonte');
    expect(await screen.findByRole('link', { name: 'Solicitar Orçamento Grátis' })).toHaveAttribute('href', '/briefing');
  });
});
