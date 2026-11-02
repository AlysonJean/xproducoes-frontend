import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const { useAuth, clients, deleteClient, addNotification } = vi.hoisted(() => ({
  useAuth: vi.fn(),
  clients: [
    { id: 'c1', name: 'Ana Souza', email: 'ana@t.com', status: 'ACTIVE', totalBookings: 3, totalSpent: 0, createdAt: '2026-08-10T15:00:00.000Z', updatedAt: '2026-08-10T15:00:00.000Z' },
  ],
  deleteClient: vi.fn(),
  addNotification: vi.fn(),
}));
vi.mock('@/hooks', () => ({
  useClients: () => ({ clients, isLoading: false, error: null, fetchClients: vi.fn(), deleteClient, meta: null }),
}));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth }));
vi.mock('@/components/forms/ClientFormPage', () => ({ default: () => null }));

import ClientListPage from '../ClientListPage';

// O backend recusa (409) excluir cliente com reservas; a tela mostrava só "Não foi possível
// excluir o cliente.", sem dizer por quê.
describe('ClientListPage — excluir cliente', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: { id: 'a1', name: 'Admin', role: 'ADMIN' } });
  });

  const confirmDelete = () => {
    render(<MemoryRouter initialEntries={['/admin/clientes']}><ClientListPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Excluir Ana Souza' }));
    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));
  };

  it('mostra a mensagem do servidor quando a exclusão é recusada', async () => {
    deleteClient.mockRejectedValue({
      response: { status: 409, data: { success: false, message: 'Este cliente tem 3 reservas. Para não apagar o histórico, cliente com reservas não pode ser excluído.' } },
    });

    confirmDelete();

    await vi.waitFor(() => expect(addNotification).toHaveBeenCalledWith({
      type: 'error',
      title: 'Erro ao excluir',
      message: 'Este cliente tem 3 reservas. Para não apagar o histórico, cliente com reservas não pode ser excluído.',
    }));
  });

  it('sem mensagem do servidor, mantém o texto genérico', async () => {
    deleteClient.mockRejectedValue(new Error('Network Error'));

    confirmDelete();

    await vi.waitFor(() => expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({
      type: 'error',
      message: 'Não foi possível excluir o cliente.',
    })));
  });

  it('o aviso de confirmação diz que cliente com reservas não pode ser excluído', () => {
    render(<MemoryRouter initialEntries={['/admin/clientes']}><ClientListPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Excluir Ana Souza' }));

    expect(screen.getByText(/Cliente com reservas não pode ser excluído/)).toBeInTheDocument();
  });
});
