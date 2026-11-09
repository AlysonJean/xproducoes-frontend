import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const { useAuth, clients, deleteClient, addNotification } = vi.hoisted(() => ({
  useAuth: vi.fn(),
  clients: [
    { id: 'c1', name: 'Ana Souza', email: 'ana@t.com', status: 'ACTIVE', totalBookings: 3, totalSpent: 0, createdAt: '2026-08-10T15:00:00.000Z', updatedAt: '2026-08-10T15:00:00.000Z', deletionScheduledAt: null as string | null },
    { id: 'c2', name: 'Bruno Lima', email: 'bruno@t.com', status: 'ACTIVE', totalBookings: 1, totalSpent: 0, createdAt: '2026-08-09T15:00:00.000Z', updatedAt: '2026-08-09T15:00:00.000Z', deletionScheduledAt: '2026-11-09T12:00:00.000Z' as string | null },
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

// D8c (aprovada em 02/11/2026), parte 2: o "Excluir cliente" segue a regra do "Excluir minha conta". Cliente sem
// reservas é apagado; com reservas, anonimizado (antes: recusado com 409); com reserva confirmada por acontecer ou
// pagamento pendente, a exclusão fica agendada, e a lista mostra "Exclusão agendada".
describe('ClientListPage — excluir cliente', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: { id: 'a1', name: 'Admin', role: 'ADMIN' } });
  });

  const renderPage = () => render(<MemoryRouter initialEntries={['/admin/clientes']}><ClientListPage /></MemoryRouter>);
  const confirmDelete = () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Excluir Ana Souza' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Excluir' }));
  };

  it('o aviso de confirmação diz o que acontece: apagado, anonimizado (sem volta) ou agendado', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Excluir Ana Souza' }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/Cliente sem reservas é apagado por completo/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Com reservas, a conta é anonimizada/)).toBeInTheDocument();
    expect(within(dialog).getByText(/a exclusão fica agendada para depois/)).toBeInTheDocument();
    expect(within(dialog).getByText(/A anonimização não pode ser desfeita/)).toBeInTheDocument();
    expect(within(dialog).queryByText(/não pode ser excluído/)).not.toBeInTheDocument();
  });

  it('anonimizado: aviso de sucesso com o texto do servidor', async () => {
    // O que o hook devolve: o data da resposta (o interceptor do axios desembrulha { success, data }).
    deleteClient.mockResolvedValue({ outcome: 'anonymized', message: 'Cliente anonimizado: nome, e-mail, telefone e demais dados pessoais saíram.' });

    confirmDelete();

    await vi.waitFor(() => expect(addNotification).toHaveBeenCalledWith({
      type: 'success',
      title: 'Cliente excluído',
      message: 'Cliente anonimizado: nome, e-mail, telefone e demais dados pessoais saíram.',
    }));
    expect(deleteClient).toHaveBeenCalledWith('c1');
  });

  it('adiado (202): aviso "Exclusão agendada" com a data que o servidor mandou', async () => {
    deleteClient.mockResolvedValue({
      outcome: 'postponed',
      until: '2026-12-20T23:00:00.000Z',
      message: 'Exclusão adiada até 20/12/2026, quando termina o último evento confirmado do cliente.',
    });

    confirmDelete();

    await vi.waitFor(() => expect(addNotification).toHaveBeenCalledWith({
      type: 'warning',
      title: 'Exclusão agendada',
      message: 'Exclusão adiada até 20/12/2026, quando termina o último evento confirmado do cliente.',
    }));
  });

  it('a lista mostra "Exclusão agendada" só no cliente com pedido adiado', () => {
    renderPage();

    const rowOf = (name: string) => screen.getByText(name).closest('tr') as HTMLElement;
    expect(within(rowOf('Bruno Lima')).getByText('Exclusão agendada')).toBeInTheDocument();
    expect(within(rowOf('Ana Souza')).queryByText('Exclusão agendada')).not.toBeInTheDocument();
  });

  it('mostra a mensagem do servidor quando a exclusão é recusada (perfil de conta da equipe com reservas)', async () => {
    deleteClient.mockRejectedValue({
      response: { status: 409, data: { success: false, message: 'Este perfil é de uma conta da equipe e tem 3 reservas. Para não apagar o histórico, ele não é excluído.' } },
    });

    confirmDelete();

    await vi.waitFor(() => expect(addNotification).toHaveBeenCalledWith({
      type: 'error',
      title: 'Erro ao excluir',
      message: 'Este perfil é de uma conta da equipe e tem 3 reservas. Para não apagar o histórico, ele não é excluído.',
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
});
