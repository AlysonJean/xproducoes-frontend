import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const { collaborators, fetchCollaborators, apiFetch, addNotification } = vi.hoisted(() => ({
  // Como GET /collaborators chega depois do useCollaborators (user com verified, role e isActive; valor por
  // hora como texto).
  collaborators: [
    { id: 'c1', name: 'Ana Lima', email: 'ana@teste.com', role: 'DJ', status: 'ACTIVE', hourlyRate: null, totalEvents: 0, createdAt: '2026-11-06T12:00:00.000Z', user: { verified: false } },
    { id: 'c2', name: 'Bruno Reis', email: 'bruno@teste.com', role: 'SOUND_TECHNICIAN', status: 'ACTIVE', hourlyRate: '45', totalEvents: 2, createdAt: '2026-11-01T12:00:00.000Z', user: { verified: true, role: 'COLLABORATOR', isActive: true } },
    { id: 'c3', name: 'Caio Melo', email: 'caio@teste.com', role: 'OTHER', status: 'ACTIVE', hourlyRate: '30', totalEvents: 0, createdAt: '2026-10-30T12:00:00.000Z', user: { verified: false, role: 'COLLABORATOR', isActive: true } },
    // Perfil que o painel do colaborador cria para o admin que o abre: a conta é de admin.
    { id: 'c4', name: 'Dora Admin', email: 'dora@teste.com', role: 'OTHER', status: 'ACTIVE', hourlyRate: null, totalEvents: 0, createdAt: '2026-10-29T12:00:00.000Z', user: { verified: false, role: 'ADMIN', isActive: true } },
    // Conta desativada: o login recusa mesmo com senha nova.
    { id: 'c5', name: 'Edu Nunes', email: 'edu@teste.com', role: 'OTHER', status: 'INACTIVE', hourlyRate: null, totalEvents: 0, createdAt: '2026-10-28T12:00:00.000Z', user: { verified: false, role: 'COLLABORATOR', isActive: false } },
  ],
  fetchCollaborators: vi.fn(),
  apiFetch: vi.fn(),
  addNotification: vi.fn(),
}));
vi.mock('@/hooks', () => ({
  useCollaborators: () => ({ collaborators, isLoading: false, error: null, fetchCollaborators, deleteCollaborator: vi.fn() }),
}));
vi.mock('@/services/api', () => ({ api: { post: vi.fn() }, apiFetch, collaboratorFunctionsAPI: { getAll: vi.fn() } }));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('@/components/admin/AdminLayout', () => ({
  AdminLayout: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

import { ModalProvider } from '@/components/modals/ModalContext';
import { ModalManager } from '@/components/modals/ModalManager';
import AdminCollaboratorsPage from '../AdminCollaboratorsPage';

// D3 (aprovada em 02/11/2026): o colaborador cadastrado pelo painel só entra depois de criar a senha
// pelo link de acesso. A lista mostra quem ainda não fez isso ("Aguardando ativação") e permite mandar um
// link novo, que aparece na mesma janela do convite para copiar. O valor por hora vazio não aparece mais
// como R$ 0,00. Token curto de propósito: o gitleaks do CI acusa valor longo depois de "token=".
const LINK = 'https://site.test/complete-registration?token=t0k3n2';
const ROTA = '/collaborators/c1/resend-access';
const AVISO_EMAIL = 'O e-mail não foi enviado. O link anterior deixou de valer: copie este link e mande ao colaborador, por WhatsApp por exemplo.';

const renderPage = () =>
  render(
    <MemoryRouter>
      <ModalProvider>
        <AdminCollaboratorsPage />
        <ModalManager />
      </ModalProvider>
    </MemoryRouter>,
  );
const linha = (nome: string) => screen.getByText(nome).closest('tr') as HTMLElement;
const reenviarAna = () => screen.getByRole('button', { name: 'Reenviar link de acesso para Ana Lima' });

describe('AdminCollaboratorsPage — acesso do colaborador (D3)', () => {
  beforeEach(() => {
    apiFetch.mockReset();
    addNotification.mockReset();
  });

  it('conta que ainda não criou a senha: selo "Aguardando ativação" e "Reenviar link de acesso"; conta ativa: nenhum dos dois', () => {
    renderPage();

    expect(within(linha('Ana Lima')).getByText('Aguardando ativação')).toBeInTheDocument();
    expect(within(linha('Ana Lima')).getByRole('button', { name: 'Reenviar link de acesso para Ana Lima' })).toBeInTheDocument();
    expect(within(linha('Caio Melo')).getByText('Aguardando ativação')).toBeInTheDocument();
    expect(within(linha('Bruno Reis')).queryByText('Aguardando ativação')).not.toBeInTheDocument();
    expect(within(linha('Bruno Reis')).queryByRole('button', { name: /Reenviar link de acesso/ })).not.toBeInTheDocument();
  });

  it('perfil de uma conta de admin ou conta desativada: sem selo e sem "Reenviar link de acesso" (o servidor recusaria com 409)', () => {
    renderPage();

    for (const nome of ['Dora Admin', 'Edu Nunes']) {
      expect(within(linha(nome)).queryByText('Aguardando ativação')).not.toBeInTheDocument();
      expect(within(linha(nome)).queryByRole('button', { name: /Reenviar link de acesso/ })).not.toBeInTheDocument();
    }
  });

  it('valor por hora vazio aparece como "—" (antes: R$ 0,00); o definido aparece em reais', () => {
    renderPage();

    expect(within(linha('Ana Lima')).getByText('—')).toBeInTheDocument();
    expect(within(linha('Ana Lima')).queryByText(/R\$\s*0,00/)).not.toBeInTheDocument();
    expect(within(linha('Bruno Reis')).getByText(/R\$\s*45,00/)).toBeInTheDocument();
  });

  it('"Reenviar link de acesso": chama a rota do colaborador e a janela do convite mostra o link novo', async () => {
    apiFetch.mockResolvedValueOnce({ inviteUrl: LINK, emailSent: true });
    renderPage();

    fireEvent.click(reenviarAna());

    expect(await screen.findByLabelText('Link de convite')).toHaveValue(LINK);
    expect(apiFetch).toHaveBeenCalledWith(ROTA, { method: 'POST' });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(addNotification).toHaveBeenCalledWith({
      type: 'success',
      title: 'Link reenviado',
      message: 'Novo link de acesso enviado para ana@teste.com. O link anterior deixou de valer.',
    });
  });

  it('e-mail que não saiu: a janela mostra o link novo e avisa para mandar pelo WhatsApp', async () => {
    apiFetch.mockResolvedValueOnce({ inviteUrl: LINK, emailSent: false });
    renderPage();

    fireEvent.click(reenviarAna());

    expect(await screen.findByLabelText('Link de convite')).toHaveValue(LINK);
    expect(screen.getByRole('alert')).toHaveTextContent(AVISO_EMAIL);
    expect(addNotification).not.toHaveBeenCalled();
  });

  it('conta já ativada (409): mostra a mensagem do servidor e não abre janela', async () => {
    apiFetch.mockRejectedValueOnce(new Error('Este colaborador já ativou o acesso. Para trocar a senha, ele usa "Esqueceu sua senha?" na tela de login.'));
    renderPage();

    fireEvent.click(reenviarAna());

    await waitFor(() => expect(addNotification).toHaveBeenCalledWith({
      type: 'error',
      title: 'Link não reenviado',
      message: 'Este colaborador já ativou o acesso. Para trocar a senha, ele usa "Esqueceu sua senha?" na tela de login.',
    }));
    expect(screen.queryByLabelText('Link de convite')).not.toBeInTheDocument();
  });

  it('um reenvio por vez: com um pedido em andamento, outro clique (na mesma linha ou em outra) não sai', async () => {
    let responder: (valor: unknown) => void = () => {};
    apiFetch.mockReturnValueOnce(new Promise((resolve) => { responder = resolve; }));
    renderPage();

    fireEvent.click(reenviarAna());
    fireEvent.click(reenviarAna());
    fireEvent.click(screen.getByRole('button', { name: 'Reenviar link de acesso para Caio Melo' }));
    responder({ inviteUrl: LINK, emailSent: true });

    expect(await screen.findByLabelText('Link de convite')).toHaveValue(LINK);
    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(apiFetch).toHaveBeenCalledWith(ROTA, { method: 'POST' });
  });

  it('depois de um reenvio que falhou, dá para tentar de novo (a trava do "um por vez" solta no fim)', async () => {
    apiFetch
      .mockRejectedValueOnce(new Error('Não conseguimos falar com o servidor agora. Aguarde alguns instantes e tente de novo.'))
      .mockResolvedValueOnce({ inviteUrl: LINK, emailSent: true });
    renderPage();

    fireEvent.click(reenviarAna());
    await waitFor(() => expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'error', title: 'Link não reenviado' })));
    await waitFor(() => expect(reenviarAna()).not.toBeDisabled());
    fireEvent.click(reenviarAna());

    expect(await screen.findByLabelText('Link de convite')).toHaveValue(LINK);
    expect(apiFetch).toHaveBeenCalledTimes(2);
  });
});
