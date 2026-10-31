import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const { XLSX, useAuth, clients } = vi.hoisted(() => ({
  XLSX: {
    utils: { json_to_sheet: vi.fn(() => ({})), book_new: vi.fn(() => ({})), book_append_sheet: vi.fn() },
    writeFile: vi.fn(),
  },
  useAuth: vi.fn(),
  clients: [
    { id: 'c1', name: 'Ana Souza', email: 'ana@t.com', phone: '31988887777', companyName: 'Ana Eventos', taxId: '12.345.678/0001-90', isVip: true, status: 'ACTIVE', totalBookings: 3, totalSpent: 4500.5, createdAt: '2026-08-10T15:00:00.000Z', updatedAt: '2026-08-10T15:00:00.000Z' },
    { id: 'c2', name: 'Bruno Lima', email: 'bruno@t.com', status: 'INACTIVE', totalBookings: 0, totalSpent: 0, createdAt: '2026-09-01T12:00:00.000Z', updatedAt: '2026-09-01T12:00:00.000Z' },
  ],
}));
vi.mock('xlsx-js-style', () => ({ default: XLSX, ...XLSX }));
vi.mock('@/hooks', () => ({
  useClients: () => ({ clients, isLoading: false, error: null, fetchClients: vi.fn(), deleteClient: vi.fn(), meta: null }),
}));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth }));
vi.mock('@/components/forms/ClientFormPage', () => ({ default: () => null }));

import ClientListPage from '../ClientListPage';

// O botão "Exportar Dados (CSV)" da tela de Clientes existia sem onClick — não fazia nada.
describe('ClientListPage — exportar clientes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: { id: 'a1', name: 'Admin', role: 'ADMIN' } });
  });

  it('gera a planilha com os clientes filtrados', async () => {
    render(<MemoryRouter initialEntries={['/admin/clientes']}><ClientListPage /></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: /exportar/i }));

    await vi.waitFor(() => expect(XLSX.writeFile).toHaveBeenCalledWith(expect.anything(), 'clientes.xlsx'));
    const rows = (XLSX.utils.json_to_sheet.mock.calls[0] as unknown as [Array<Record<string, unknown>>])[0];
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r['Nome'] === 'Ana Souza')).toEqual({
      'Nome': 'Ana Souza',
      'E-mail': 'ana@t.com',
      'Telefone': '31988887777',
      'Empresa': 'Ana Eventos',
      'CPF/CNPJ': '12.345.678/0001-90',
      'Status': 'Ativo',
      'VIP': 'Sim',
      'Reservas': 3,
      'Total gasto (R$)': 4500.5,
      'Cadastrado em': '10/08/2026 12:00',
    });
    expect(rows.find((r) => r['Nome'] === 'Bruno Lima')).toMatchObject({ 'Status': 'Inativo', 'VIP': 'Não', 'Telefone': '', 'Empresa': '' });
  });
});
