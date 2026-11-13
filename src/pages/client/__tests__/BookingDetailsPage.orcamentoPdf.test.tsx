import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// Orçamento em PDF (13/11/2026): "Baixar orçamento (PDF)" da área do cliente baixa o orçamento que o servidor gera na
// hora (GET /bookings/:id/quote-pdf, quotePdfAPI.forClient), o mesmo do link da proposta e da ficha do painel. Antes o
// PDF era montado aqui no navegador (jsPDF), com outro visual e outra conta.
const { apiFetch, quotePdfAPI, addNotification } = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  quotePdfAPI: { forClient: vi.fn() },
  addNotification: vi.fn(),
}));
vi.mock('../../../services/api', () => ({ apiFetch, quotePdfAPI }));
vi.mock('@/services/api', () => ({ apiFetch, quotePdfAPI }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1', role: 'CLIENT' } }) }));
vi.mock('../../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../../components/client/BookingChatPanel', () => ({ BookingChatPanel: () => null }));
vi.mock('react-ga4', () => ({ default: { event: vi.fn() } }));

import { BookingDetailsPage } from '../BookingDetailsPage';

const RESERVA = { id: 'XP-ANA-1', status: 'PENDING', eventDate: '2027-12-10T22:00:00.000Z', totalPrice: '900.00', attachments: [], eventCollaborators: [] };

const renderPage = async () => {
  apiFetch.mockResolvedValue(RESERVA);
  render(
    <MemoryRouter initialEntries={['/cliente/reservas/XP-ANA-1']}>
      <Routes>
        <Route path="/cliente/reservas/:id" element={<BookingDetailsPage />} />
      </Routes>
    </MemoryRouter>,
  );
  await screen.findByText('Resumo Financeiro');
};

describe('BookingDetailsPage (cliente) — orçamento em PDF do servidor', () => {
  beforeEach(() => vi.clearAllMocks());

  it('"Baixar orçamento (PDF)" pede ao servidor o orçamento desta reserva', async () => {
    quotePdfAPI.forClient.mockResolvedValue(undefined);
    await renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Baixar orçamento (PDF)' }));

    await waitFor(() => expect(quotePdfAPI.forClient).toHaveBeenCalledWith('XP-ANA-1'));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Baixar orçamento (PDF)' })).toBeEnabled());
    expect(addNotification).not.toHaveBeenCalled();
  });

  it('o download falha: aviso de erro, e o botão volta', async () => {
    quotePdfAPI.forClient.mockRejectedValue(Object.assign(new Error('falhou'), { status: 500 }));
    await renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Baixar orçamento (PDF)' }));

    await waitFor(() =>
      expect(addNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error', message: 'Não foi possível baixar o orçamento agora. Tente de novo em alguns minutos.' }),
      ),
    );
    expect(screen.getByRole('button', { name: 'Baixar orçamento (PDF)' })).toBeEnabled();
  });
});
