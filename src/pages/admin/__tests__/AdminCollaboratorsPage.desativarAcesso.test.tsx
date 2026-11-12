import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const { collaborators, fetchCollaborators, api, addNotification } = vi.hoisted(() => ({
  // Como GET /collaborators chega depois do useCollaborators (status do cadastro e a conta em user).
  collaborators: [
    { id: 'c1', name: 'Bruno Reis', email: 'bruno@teste.com', role: 'SOUND_TECHNICIAN', status: 'ACTIVE', hourlyRate: '45', totalEvents: 2, createdAt: '2026-11-01T12:00:00.000Z', user: { verified: true, role: 'COLLABORATOR', isActive: true } },
    // Cadastrado pelo convite: "Pendente", com acesso.
    { id: 'c2', name: 'Gil Rocha', email: 'gil@teste.com', role: 'DJ', status: 'PENDING_APPROVAL', hourlyRate: null, totalEvents: 0, createdAt: '2026-10-31T12:00:00.000Z', user: { verified: true, role: 'COLLABORATOR', isActive: true } },
    // Perfil que o painel do colaborador cria para o admin que o abre: a conta é de admin.
    { id: 'c3', name: 'Dora Admin', email: 'dora@teste.com', role: 'OTHER', status: 'ACTIVE', hourlyRate: null, totalEvents: 0, createdAt: '2026-10-30T12:00:00.000Z', user: { verified: true, role: 'ADMIN', isActive: true } },
    // Acesso desativado.
    { id: 'c4', name: 'Edu Nunes', email: 'edu@teste.com', role: 'OTHER', status: 'INACTIVE', hourlyRate: null, totalEvents: 3, createdAt: '2026-10-29T12:00:00.000Z', user: { verified: true, role: 'COLLABORATOR', isActive: false } },
    // Conta excluída a pedido da pessoa (LGPD): a conta fica desativada e o cadastro, como estava.
    { id: 'c5', name: 'Usuário removido', email: 'removido@dados-removidos.test', role: 'OTHER', status: 'ACTIVE', hourlyRate: null, totalEvents: 1, createdAt: '2026-10-28T12:00:00.000Z', user: { verified: true, role: 'COLLABORATOR', isActive: false } },
  ],
  fetchCollaborators: vi.fn(),
  api: { post: vi.fn() },
  addNotification: vi.fn(),
}));
vi.mock('@/hooks', () => ({
  useCollaborators: () => ({ collaborators, isLoading: false, error: null, fetchCollaborators }),
}));
vi.mock('@/services/api', () => ({ api, apiFetch: vi.fn(), collaboratorFunctionsAPI: { getAll: vi.fn() } }));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('@/components/admin/AdminLayout', () => ({
  AdminLayout: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

import { ModalProvider } from '@/components/modals/ModalContext';
import AdminCollaboratorsPage from '../AdminCollaboratorsPage';

// Decisão de Alyson (12/11/2026), "faça no padrão dos grandes aplicativos": "Remover colaborador" (que apagava a
// pessoa junto com o histórico de eventos e pagamentos) vira "Desativar acesso", como no Slack e no Google Workspace.
// A janela explica o que acontece; se a pessoa está em escalas de eventos que ainda não terminaram, o servidor
// responde 409 com a lista e a janela oferece "Desativar e tirar das escalas futuras". Quem está sem acesso fica na
// lista com o selo "Inativo" e o botão "Reativar"; o filtro separa Ativos, Inativos e Todos.
const EXPLICACAO =
  'A pessoa não consegue mais entrar e as sessões abertas são encerradas. O histórico de eventos e pagamentos fica guardado. Você pode reativar depois.';
const ESCALAS = [
  { bookingId: 'b1', eventTitle: 'Casamento', eventDate: '2026-12-05T23:00:00.000Z' },
  { bookingId: 'b2', eventTitle: null, eventDate: '2026-12-12T01:30:00.000Z' },
];
const conflito = (futureAssignments: unknown[]) =>
  Object.assign(new Error('Request failed with status code 409'), {
    response: { status: 409, data: { success: false, code: 'FUTURE_ASSIGNMENTS', message: 'Esta pessoa está escalada em eventos que ainda não terminaram.', data: { futureAssignments } } },
  });

const renderPage = () =>
  render(
    <MemoryRouter>
      <ModalProvider>
        <AdminCollaboratorsPage />
      </ModalProvider>
    </MemoryRouter>,
  );
const linha = (nome: string) => screen.getByText(nome).closest('tr') as HTMLElement;
const nomesNaLista = () =>
  screen.getAllByRole('row').slice(1).map((tr) => within(tr).queryByText(/^(Bruno Reis|Gil Rocha|Dora Admin|Edu Nunes|Usuário removido)$/)?.textContent);
const janela = () => screen.getByRole('dialog');
const buscasDaLista = () => fetchCollaborators.mock.calls.length;

describe('AdminCollaboratorsPage — "Desativar acesso" no lugar de "Remover" (decisão de 12/11/2026)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('botões: "Desativar acesso" para quem tem acesso, "Reativar" para quem não tem; nada de "Remover"; perfil de admin sem nenhum dos dois', () => {
    renderPage();

    expect(screen.queryByRole('button', { name: /Remover|Excluir/ })).not.toBeInTheDocument();
    for (const nome of ['Bruno Reis', 'Gil Rocha']) {
      const botao = within(linha(nome)).getByRole('button', { name: `Desativar acesso de ${nome}` });
      expect(botao).toHaveAttribute('title', 'Desativar acesso');
      expect(within(linha(nome)).queryByRole('button', { name: /Reativar/ })).not.toBeInTheDocument();
    }
    for (const nome of ['Edu Nunes', 'Usuário removido']) {
      expect(within(linha(nome)).getByRole('button', { name: `Reativar ${nome}` })).toHaveAttribute('title', 'Reativar');
      expect(within(linha(nome)).queryByRole('button', { name: /Desativar acesso/ })).not.toBeInTheDocument();
    }
    expect(within(linha('Dora Admin')).queryByRole('button', { name: /Desativar acesso|Reativar/ })).not.toBeInTheDocument();
  });

  it('selo: "Inativo" só para quem está sem acesso (perfil inativo ou conta desativada); o cadastro pendente aparece "Pendente"', () => {
    renderPage();

    expect(within(linha('Bruno Reis')).getByText('Ativo')).toBeInTheDocument();
    expect(within(linha('Gil Rocha')).getByText('Pendente')).toBeInTheDocument();
    expect(within(linha('Gil Rocha')).queryByText('Inativo')).not.toBeInTheDocument();
    expect(within(linha('Edu Nunes')).getByText('Inativo')).toBeInTheDocument();
    expect(within(linha('Usuário removido')).getByText('Inativo')).toBeInTheDocument();
    expect(within(linha('Usuário removido')).queryByText('Ativo')).not.toBeInTheDocument();
  });

  it('filtro Ativos / Inativos / Todos', () => {
    renderPage();
    const filtro = screen.getByLabelText('Filtrar por status');
    expect(Array.from((filtro as HTMLSelectElement).options).map((o) => o.textContent)).toEqual(['Todos', 'Ativos', 'Inativos']);

    expect(nomesNaLista()).toEqual(['Bruno Reis', 'Gil Rocha', 'Dora Admin', 'Edu Nunes', 'Usuário removido']);
    fireEvent.change(filtro, { target: { value: 'inactive' } });
    expect(nomesNaLista()).toEqual(['Edu Nunes', 'Usuário removido']);
    fireEvent.change(filtro, { target: { value: 'active' } });
    expect(nomesNaLista()).toEqual(['Bruno Reis', 'Gil Rocha', 'Dora Admin']);
    fireEvent.change(filtro, { target: { value: 'all' } });
    expect(nomesNaLista()).toHaveLength(5);
  });

  it('"Desativar acesso": a janela explica o que acontece; confirmar chama a rota, avisa e atualiza a lista', async () => {
    api.post.mockResolvedValueOnce({ data: { cancelledAssignments: 0 } });
    renderPage();
    const antes = buscasDaLista();

    fireEvent.click(screen.getByRole('button', { name: 'Desativar acesso de Bruno Reis' }));

    expect(within(janela()).getByText('Desativar o acesso de Bruno Reis?')).toBeInTheDocument();
    expect(within(janela()).getByText(EXPLICACAO)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
    fireEvent.click(within(janela()).getByRole('button', { name: 'Desativar acesso' }));

    await waitFor(() => expect(addNotification).toHaveBeenCalledWith({
      type: 'success',
      title: 'Acesso desativado',
      message: 'Bruno Reis não consegue mais entrar. O histórico fica guardado.',
    }));
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith('/collaborators/c1/deactivate', {});
    expect(buscasDaLista()).toBe(antes + 1);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('409 com escalas futuras: a janela lista os eventos (título e data de Brasília) e "Desativar e tirar das escalas futuras" manda a confirmação', async () => {
    api.post.mockRejectedValueOnce(conflito(ESCALAS)).mockResolvedValueOnce({ data: { cancelledAssignments: 2 } });
    renderPage();
    const antes = buscasDaLista();

    fireEvent.click(screen.getByRole('button', { name: 'Desativar acesso de Bruno Reis' }));
    fireEvent.click(within(janela()).getByRole('button', { name: 'Desativar acesso' }));

    const lista = await within(janela()).findByRole('list', { name: 'Escalas futuras' });
    expect(within(lista).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'Casamento — 05/12/2026 20:00',
      'Evento sem título — 11/12/2026 22:30',
    ]);
    expect(within(janela()).getByText(/Ao desativar o acesso, ela sai dessas escalas/)).toBeInTheDocument();
    expect(within(janela()).queryByRole('button', { name: 'Desativar acesso' })).not.toBeInTheDocument();
    // Nada mudou ainda: nem aviso de sucesso, nem lista recarregada.
    expect(addNotification).not.toHaveBeenCalled();
    expect(buscasDaLista()).toBe(antes);

    fireEvent.click(within(janela()).getByRole('button', { name: 'Desativar e tirar das escalas futuras' }));

    await waitFor(() => expect(addNotification).toHaveBeenCalledWith({
      type: 'success',
      title: 'Acesso desativado',
      message: 'Bruno Reis não consegue mais entrar e saiu das escalas futuras. O histórico fica guardado.',
    }));
    expect(api.post).toHaveBeenNthCalledWith(1, '/collaborators/c1/deactivate', {});
    expect(api.post).toHaveBeenNthCalledWith(2, '/collaborators/c1/deactivate', { removeFromFutureAssignments: true });
    expect(buscasDaLista()).toBe(antes + 1);
  });

  it('cancelar a janela (também depois do 409) não chama nada; reabrir começa do primeiro passo', async () => {
    api.post.mockRejectedValueOnce(conflito(ESCALAS));
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Desativar acesso de Bruno Reis' }));
    fireEvent.click(within(janela()).getByRole('button', { name: 'Cancelar' }));
    expect(api.post).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Desativar acesso de Bruno Reis' }));
    fireEvent.click(within(janela()).getByRole('button', { name: 'Desativar acesso' }));
    await within(janela()).findByRole('list', { name: 'Escalas futuras' });
    fireEvent.click(within(janela()).getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Desativar acesso de Bruno Reis' }));
    expect(within(janela()).queryByRole('list', { name: 'Escalas futuras' })).not.toBeInTheDocument();
    expect(within(janela()).getByRole('button', { name: 'Desativar acesso' })).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledTimes(1);
  });

  it('outra recusa do servidor: mostra a mensagem dele e não recarrega a lista', async () => {
    api.post.mockRejectedValueOnce(Object.assign(new Error('Request failed with status code 409'), {
      response: { status: 409, data: { success: false, error: 'Este perfil é de uma conta do escritório, não de um colaborador; o acesso dela não muda por aqui.' } },
    }));
    renderPage();
    const antes = buscasDaLista();

    fireEvent.click(screen.getByRole('button', { name: 'Desativar acesso de Gil Rocha' }));
    fireEvent.click(within(janela()).getByRole('button', { name: 'Desativar acesso' }));

    await waitFor(() => expect(addNotification).toHaveBeenCalledWith({
      type: 'error',
      title: 'Acesso não desativado',
      message: 'Este perfil é de uma conta do escritório, não de um colaborador; o acesso dela não muda por aqui.',
    }));
    expect(buscasDaLista()).toBe(antes);
  });

  it('"Reativar": a janela avisa que as escalas não voltam; confirmar chama a rota, avisa e atualiza a lista', async () => {
    api.post.mockResolvedValueOnce({ data: {} });
    renderPage();
    const antes = buscasDaLista();

    fireEvent.click(screen.getByRole('button', { name: 'Reativar Edu Nunes' }));

    expect(within(janela()).getByText('Reativar o acesso de Edu Nunes?')).toBeInTheDocument();
    expect(within(janela()).getByText(/As escalas tiradas quando o acesso foi desativado não voltam/)).toBeInTheDocument();
    fireEvent.click(within(janela()).getByRole('button', { name: 'Reativar' }));

    await waitFor(() => expect(addNotification).toHaveBeenCalledWith({
      type: 'success',
      title: 'Acesso reativado',
      message: 'Edu Nunes já pode entrar de novo, com a mesma senha.',
    }));
    expect(api.post).toHaveBeenCalledWith('/collaborators/c4/reactivate');
    expect(buscasDaLista()).toBe(antes + 1);
  });

  it('"Reativar" recusado (conta excluída a pedido da pessoa): mostra a mensagem do servidor', async () => {
    api.post.mockRejectedValueOnce(Object.assign(new Error('Request failed with status code 409'), {
      response: { status: 409, data: { success: false, error: 'Os dados desta pessoa foram excluídos a pedido dela, e o acesso não volta.' } },
    }));
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Reativar Usuário removido' }));
    fireEvent.click(within(janela()).getByRole('button', { name: 'Reativar' }));

    await waitFor(() => expect(addNotification).toHaveBeenCalledWith({
      type: 'error',
      title: 'Acesso não reativado',
      message: 'Os dados desta pessoa foram excluídos a pedido dela, e o acesso não volta.',
    }));
  });
});
