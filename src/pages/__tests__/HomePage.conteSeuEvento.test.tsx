import { describe, it, expect, vi, beforeEach } from 'vitest';
import { configure, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

// Mesmo arranjo de HomePage.instagram.test.tsx: a página inicial de verdade, com as partes pesadas trocadas por nada.
const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock('../../services/api', () => ({ apiFetch }));
vi.mock('../../contexts/SettingsContext', () => ({ useSettings: () => ({ companyName: 'X Produções', googleReviewUrl: null }) }));
vi.mock('../../components/ui/BannerCarousel', () => ({ BannerCarousel: () => null }));
vi.mock('../../components/ui/BrandLoader', () => ({ BrandLoader: () => null }));

import { HomePage } from '../HomePage';

configure({ asyncUtilTimeout: 5000 });
vi.setConfig({ testTimeout: 20_000 });

// "Conte seu evento" (pedido de Alyson em 20/11/2026): o teste rápido ("Mapeamento de Necessidades") fazia as mesmas 3
// perguntas do briefing e depois abria o briefing para conferir as mesmas respostas. No lugar, a caixa de texto livre.
// Antes (O27, 12/11/2026) o texto da seção já não falava em WhatsApp; continua sem falar.
describe('HomePage — "Conte seu evento" no lugar do teste rápido', () => {
  beforeEach(() => {
    apiFetch.mockResolvedValue([]);
  });

  it('mostra a caixa de texto com o título e a explicação, e não o teste de 3 perguntas', async () => {
    render(
      <HelmetProvider>
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      </HelmetProvider>,
    );

    expect(await screen.findByRole('heading', { level: 2, name: 'Conte seu evento do seu jeito' })).toBeInTheDocument();
    expect(screen.getByText(/A gente marca as respostas do pedido de orçamento, e você só confere e/)).toBeInTheDocument();
    expect(screen.getByLabelText('Como vai ser o seu evento?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Preencher o pedido/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Prefiro responder passo a passo/ })).toHaveAttribute('href', '/briefing');

    expect(screen.queryByText('Mapeamento de Necessidades')).not.toBeInTheDocument();
    expect(screen.queryByText(/Qual a natureza do evento/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Responda a 3 perguntas rápidas/)).not.toBeInTheDocument();
    expect(screen.queryByText(/pré-qualificada diretamente no WhatsApp/)).not.toBeInTheDocument();
  });
});
