import { describe, it, expect, vi, beforeEach } from 'vitest';
import { configure, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

// Mesmo arranjo de HomePage.instagram.test.tsx: a página inicial de verdade, com as partes pesadas trocadas por nada.
const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock('../../services/api', () => ({ apiFetch }));
vi.mock('../../contexts/SettingsContext', () => ({ useSettings: () => ({ companyName: 'X Produções', googleReviewUrl: null }) }));
vi.mock('../../components/ui/BannerCarousel', () => ({ BannerCarousel: () => null }));
vi.mock('../../components/ui/InteractiveQuiz', () => ({ InteractiveQuiz: () => null }));
vi.mock('../../components/ui/BrandLoader', () => ({ BrandLoader: () => null }));

import { HomePage } from '../HomePage';

configure({ asyncUtilTimeout: 5000 });
vi.setConfig({ testTimeout: 20_000 });

// Auditoria do orçamento (12/11/2026), O27: o teste da Home não abre mais o WhatsApp; leva ao pedido de orçamento já
// preenchido. O texto da seção dizia "receba uma proposta pré-qualificada diretamente no WhatsApp".
describe('HomePage — o texto do teste rápido (O27)', () => {
  beforeEach(() => {
    apiFetch.mockResolvedValue([]);
  });

  it('diz que o teste continua no pedido de orçamento, sem WhatsApp', async () => {
    render(
      <HelmetProvider>
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      </HelmetProvider>,
    );

    expect(await screen.findByText('Responda a 3 perguntas rápidas e continue o pedido de orçamento com as respostas já preenchidas.')).toBeInTheDocument();
    expect(screen.queryByText(/pré-qualificada diretamente no WhatsApp/)).not.toBeInTheDocument();
    expect(screen.queryByText('Consultoria Express')).not.toBeInTheDocument();
  });
});
