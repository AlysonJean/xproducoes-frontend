import { useState, type ComponentProps } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const { apiFetch, addNotification, getFunctions, onSuccess } = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  addNotification: vi.fn(),
  getFunctions: vi.fn(),
  onSuccess: vi.fn(),
}));
vi.mock('@/services/api', () => ({
  apiFetch,
  collaboratorFunctionsAPI: { getAll: getFunctions },
}));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));

import { ModalProvider } from '@/components/modals/ModalContext';
import { ModalManager } from '@/components/modals/ModalManager';
import { CollaboratorForm } from '../CollaboratorFormPage';

// Achado (revisão antes do deploy): o formulário gravava em /admin/collaborators, rota que o backend
// nunca teve (404 em todo "Salvar") — as rotas reais, só de admin, são POST/PUT /collaborators. E
// sem função personalizada escolhida ia functionId: '', que a validação de id do backend recusa.
//
// D3 (aprovada em 02/11/2026): "Novo colaborador" cria a conta e o perfil juntos, com função, valor e
// telefone; o link de acesso é opcional (caixa marcada por padrão) e aparece na janela do convite para
// copiar, com aviso quando o e-mail não sai. Na edição, apagar a função ou o valor grava vazio (antes o
// campo apagado não ia no pedido, o servidor mantinha o valor antigo e a tela dizia "atualizado").
// Formulário, janela e modais reais; falsos só a API e as notificações. Como na lista de colaboradores
// (AdminCollaboratorsPage), o formulário sai da tela assim que o colaborador é criado.
// Token curto de propósito: o gitleaks do CI acusa valor longo depois de "token=".
const LINK = 'https://site.test/complete-registration?token=t0k3n1';
const AVISO_EMAIL = 'O e-mail com o link não foi enviado. Copie o link e mande ao colaborador, por WhatsApp por exemplo.';

const sentBody = () => JSON.parse(apiFetch.mock.calls[0][1].body as string);

function Tela({ initialData }: { initialData?: ComponentProps<typeof CollaboratorForm>['initialData'] }) {
  const [aberto, setAberto] = useState(true);
  return (
    <ModalProvider>
      {aberto && (
        <CollaboratorForm
          initialData={initialData}
          onSuccess={() => { onSuccess(); setAberto(false); }}
          onCancel={vi.fn()}
        />
      )}
      <ModalManager />
    </ModalProvider>
  );
}

const preencherNovo = () => {
  fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Bia Souza' } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'bia@teste.com' } });
};
const criar = () => fireEvent.click(screen.getByRole('button', { name: 'Criar Colaborador' }));

describe('CollaboratorForm — grava nas rotas reais', () => {
  beforeEach(() => {
    apiFetch.mockReset();
    apiFetch.mockResolvedValue({});
    addNotification.mockReset();
    onSuccess.mockReset();
    getFunctions.mockReset();
    getFunctions.mockResolvedValue({ data: [{ id: 'f1', name: 'Roadie' }] });
    localStorage.clear();
  });

  it('editar (aprovar um cadastro pendente): PUT /collaborators/:id, sem functionId vazio', async () => {
    render(<Tela initialData={{ id: 'c1', name: 'Ana Lima', email: 'ana@teste.com', role: 'DJ', functionId: '', hourlyRate: '80', status: 'PENDING_APPROVAL' }} />);

    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'ACTIVE' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar Alterações' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(apiFetch).toHaveBeenCalledWith('/collaborators/c1', expect.objectContaining({ method: 'PUT' }));
    expect(sentBody()).toEqual({ name: 'Ana Lima', email: 'ana@teste.com', role: 'DJ', hourlyRate: 80, status: 'ACTIVE' });
  });

  it('editar: apagar a função, o valor por hora e o telefone grava vazio (antes: os campos apagados não iam e o valor antigo ficava)', async () => {
    render(<Tela initialData={{ id: 'c1', name: 'Ana Lima', email: 'ana@teste.com', phone: '31988887777', role: 'DJ', functionId: 'f1', hourlyRate: '80.00', status: 'ACTIVE' }} />);
    await screen.findByRole('option', { name: 'Roadie' });

    fireEvent.change(screen.getByLabelText('Função (Personalizada)'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Valor Hora (R$)'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Telefone'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar Alterações' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(sentBody()).toEqual({ name: 'Ana Lima', email: 'ana@teste.com', phone: '', role: 'DJ', functionId: null, hourlyRate: null, status: 'ACTIVE' });
  });

  it('editar quem não tinha valor, função nem telefone: os campos que continuam vazios não vão no pedido', async () => {
    render(<Tela initialData={{ id: 'c1', name: 'Ana Lima', email: 'ana@teste.com', phone: null, role: 'DJ', functionId: null, hourlyRate: null, status: 'ACTIVE' }} />);

    fireEvent.click(screen.getByRole('button', { name: 'Salvar Alterações' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(sentBody()).toEqual({ name: 'Ana Lima', email: 'ana@teste.com', role: 'DJ', status: 'ACTIVE' });
  });

  it('criar: POST /collaborators com telefone, valor e a caixa do link marcada; a janela mostra o link para copiar', async () => {
    apiFetch.mockResolvedValue({ id: 'c9', inviteUrl: LINK, emailSent: true });
    render(<Tela />);

    preencherNovo();
    fireEvent.change(screen.getByLabelText('Telefone'), { target: { value: ' (31) 97777-6666 ' } });
    fireEvent.change(screen.getByLabelText('Valor Hora (R$)'), { target: { value: '45' } });
    expect(screen.getByLabelText('Enviar link de acesso por e-mail')).toBeChecked();
    criar();

    expect(await screen.findByLabelText('Link de convite')).toHaveValue(LINK);
    expect(screen.getByRole('button', { name: 'Copiar' })).toBeInTheDocument();
    expect(apiFetch).toHaveBeenCalledWith('/collaborators', expect.objectContaining({ method: 'POST' }));
    expect(sentBody()).toEqual({
      name: 'Bia Souza', email: 'bia@teste.com', phone: '(31) 97777-6666', role: 'OTHER', hourlyRate: 45, status: 'ACTIVE', sendAccessLink: true,
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(addNotification).toHaveBeenCalledWith({ type: 'success', title: 'Sucesso', message: 'Colaborador criado. O link de acesso foi enviado por e-mail.' });
  });

  it('e-mail que não saiu: a janela mostra o link e avisa para mandar ao colaborador pelo WhatsApp', async () => {
    apiFetch.mockResolvedValue({ id: 'c9', inviteUrl: LINK, emailSent: false });
    render(<Tela />);

    preencherNovo();
    criar();

    expect(await screen.findByLabelText('Link de convite')).toHaveValue(LINK);
    expect(screen.getByRole('alert')).toHaveTextContent(AVISO_EMAIL);
  });

  it('caixa desmarcada: vai sendAccessLink false e não abre janela de link', async () => {
    apiFetch.mockResolvedValue({ id: 'c9', emailSent: false });
    render(<Tela />);

    preencherNovo();
    fireEvent.click(screen.getByLabelText('Enviar link de acesso por e-mail'));
    criar();

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(sentBody()).toEqual({ name: 'Bia Souza', email: 'bia@teste.com', role: 'OTHER', status: 'ACTIVE', sendAccessLink: false });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(addNotification).toHaveBeenCalledWith({
      type: 'success',
      title: 'Sucesso',
      message: 'Colaborador criado, sem link de acesso. Para mandar depois, use “Reenviar link de acesso” na lista.',
    });
  });

  it('e-mail que já tem conta (409): mostra a mensagem do servidor e o formulário continua aberto', async () => {
    apiFetch.mockRejectedValue(new Error('Já existe uma conta com este e-mail.'));
    render(<Tela />);

    preencherNovo();
    criar();

    await waitFor(() => expect(addNotification).toHaveBeenCalledWith({ type: 'error', title: 'Erro', message: 'Já existe uma conta com este e-mail.' }));
    expect(onSuccess).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Criar Colaborador' })).toBeInTheDocument();
  });

  it('editar não mostra a caixa do link (ela é só do cadastro novo)', () => {
    render(<Tela initialData={{ id: 'c1', name: 'Ana Lima', email: 'ana@teste.com', role: 'DJ', status: 'ACTIVE' }} />);

    expect(screen.queryByLabelText('Enviar link de acesso por e-mail')).not.toBeInTheDocument();
  });
});
