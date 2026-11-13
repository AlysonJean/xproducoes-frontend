import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock('../../../services/api', () => ({ apiFetch }));
vi.mock('@/services/api', () => ({ apiFetch }));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'a1', name: 'Admin', role: 'ADMIN' } }) }));
vi.mock('@/components/forms/AdminBookingForm', () => ({ AdminBookingForm: () => null }));

import BookingListPage from '../BookingListPage';

const reserva = (id: string, totalPrice: string) => ({
  id, status: 'PENDING', totalPrice, eventDate: '2027-01-10T18:00:00.000Z', clientName: 'Cliente da lista',
});

// Auditoria do orçamento (12/11/2026), O3: a lista do painel mostrava "R$ 0,00" no pedido do briefing.
describe('BookingListPage — total zero sai "Em preparação" (O3)', () => {
  beforeEach(() => {
    apiFetch.mockReset();
    apiFetch.mockResolvedValue([reserva('XP-BRIEFING', '0.00'), reserva('XP-CARRINHO', '750.00')]);
  });

  it('pedido sem valor: "Em preparação"; pedido com valor: o total', async () => {
    render(<MemoryRouter initialEntries={['/admin/reservas']}><BookingListPage /></MemoryRouter>);
    await screen.findByText(/Mostrando 2 de 2 registros/);

    const linhaSemValor = screen.getByText('XP-BRIEFING', { exact: false }).closest('tr') as HTMLElement;
    const linhaComValor = screen.getByText('XP-CARRINHO', { exact: false }).closest('tr') as HTMLElement;
    // A linha tem também a caixa de status de entrega, com a opção "Em preparação": o valor é o texto fora das opções.
    const valorEmPreparacao = (linha: HTMLElement) =>
      within(linha).queryAllByText('Em preparação').filter((el) => el.tagName !== 'OPTION');
    expect(valorEmPreparacao(linhaSemValor)).toHaveLength(1);
    expect(linhaSemValor.textContent).not.toMatch(/R\$\s*0,00/);
    expect(linhaComValor.textContent).toMatch(/750,00/);
    expect(valorEmPreparacao(linhaComValor)).toHaveLength(0);
  });
});
