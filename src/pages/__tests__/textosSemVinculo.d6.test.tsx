import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

// D6, parte 1 (aprovada em 02/11/2026): textos que prometiam trazer a proposta para a conta depois do
// cadastro. O cadastro não vincula proposta (linkBookingsToUser não tem chamador no backend), e o site não
// tem nota fiscal. A página da proposta dizia "Rastreie este orçamento em tempo real ... baixar notas
// fiscais" e levava ao /cadastro?bookingId=..., onde a tela virava "Rastrear meu orçamento".
const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock('@/services/api', () => ({ apiFetch, authAPI: { register: vi.fn() } }));
vi.mock('../../services/api', () => ({ apiFetch, authAPI: { register: vi.fn() } }));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));
vi.mock('../../components/ui/GoogleAuthButton', () => ({ default: () => null }));
// PageLayout puxa cabeçalho e rodapé com contextos do app; aqui só o conteúdo importa.
vi.mock('@/components/layouts/PageLayout', () => ({ PageLayout: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('@/components/SEO', () => ({ SEO: () => null }));

import { RegisterPage } from '../RegisterPage';
import ProposalViewPage from '../ProposalViewPage';

const Destino = () => {
  const { pathname, search } = useLocation();
  return <p>{`destino ${pathname}${search}`}</p>;
};

const montar = (rota: string) =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[rota]}>
        <Routes>
          <Route path="/proposta/:id" element={<ProposalViewPage />} />
          <Route path="/cadastro" element={<><RegisterPage /><Destino /></>} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );

const PROMESSAS = [/rastre/i, /notas? fisca/i, /tempo real/i, /acompanhar a proposta/i];
const semPromessas = () => {
  const texto = document.body.textContent ?? '';
  for (const promessa of PROMESSAS) expect(texto).not.toMatch(promessa);
};

beforeEach(() => vi.clearAllMocks());

describe('D6 — sem promessa de vínculo depois do cadastro', () => {
  it('página da proposta sem cliente: convite sem rastreio nem nota fiscal, e o botão leva ao cadastro comum', async () => {
    apiFetch.mockResolvedValue({
      id: 'XP-ANA-1', eventTitle: 'Festa da Ana', eventDate: '2027-01-10T21:00:00Z', totalPrice: 900,
      status: 'PENDING', equipments: [], clientName: 'Ana',
    });
    montar('/proposta/XP-ANA-1');

    fireEvent.click(await screen.findByRole('button', { name: /Criar minha conta/ }));

    expect(await screen.findByText('destino /cadastro')).toBeInTheDocument();
    semPromessas();
  });

  it('cadastro aberto com ?bookingId=: título comum, sem "Rastrear" nem "acompanhar a proposta"', () => {
    montar('/cadastro?bookingId=XP-ANA-1');

    expect(screen.getByRole('heading', { name: 'Criar conta' })).toBeInTheDocument();
    semPromessas();
  });
});
