import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock('../../../services/api', () => ({ apiFetch }));
vi.mock('@/services/api', () => ({ apiFetch }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1', role: 'CLIENT' } }) }));
vi.mock('../../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));
vi.mock('../../../components/client/BookingChatPanel', () => ({ BookingChatPanel: () => null }));
vi.mock('react-ga4', () => ({ default: { event: vi.fn() } }));

import { BookingDetailsPage } from '../BookingDetailsPage';

const renderPage = async (reserva: object) => {
  apiFetch.mockResolvedValue(reserva);
  render(
    <MemoryRouter initialEntries={['/cliente/reservas/XP-1']}>
      <Routes>
        <Route path="/cliente/reservas/:id" element={<BookingDetailsPage />} />
      </Routes>
    </MemoryRouter>,
  );
  await screen.findByText('Resumo Financeiro');
};

const base = { id: 'XP-1', status: 'PENDING', eventDate: '2026-12-10T22:00:00.000Z', attachments: [], eventCollaborators: [] };

// Auditoria do orçamento (12/11/2026), O3: o botão "Baixar proposta (PDF)" aparecia no pedido ainda sem valor e o PDF
// saía com "Total: R$ 0,00". Sem valor, o botão não aparece (a mesma regra do "Em preparação").
describe('BookingDetailsPage (cliente) — sem valor, sem PDF da proposta (O3)', () => {
  beforeEach(() => apiFetch.mockReset());

  it('pedido do briefing (total zero): "Em preparação" e nenhum botão de PDF', async () => {
    await renderPage({ ...base, totalPrice: '0.00' });

    expect(screen.getByText('Em preparação')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Baixar orçamento/ })).not.toBeInTheDocument();
  });

  it('com valor: o botão do PDF aparece', async () => {
    await renderPage({ ...base, totalPrice: '900.00' });

    expect(screen.getByRole('button', { name: /Baixar orçamento \(PDF\)/ })).toBeInTheDocument();
    expect(screen.queryByText('Em preparação')).not.toBeInTheDocument();
  });
});
