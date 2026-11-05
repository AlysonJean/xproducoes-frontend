import { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const { apiFetch, addNotification } = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  addNotification: vi.fn(),
}));
vi.mock('@/services/api', () => ({ apiFetch }));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));

import { ModalProvider } from '@/components/modals/ModalContext';
import { ModalManager } from '@/components/modals/ModalManager';
import { ClientForm } from '../ClientFormPage';

// Achado (auditoria ponta a ponta): "Reenviar convite", na janela do convite que abre depois do Novo
// cliente, chamava uma rota que não existia ("Falha ao reenviar convite"). Com a rota, o servidor troca o
// token, e o link do cadastro, que a janela mostrava, deixa de valer. Formulário, janela e modais reais;
// falsos só a API e as notificações. Como na lista de clientes (ClientListPage), o formulário sai da tela
// assim que o cliente é criado: o reenvio acontece com ele já desmontado.
// Tokens curtos de propósito: o gitleaks do CI acusa valor longo depois de "token=".
const LINK_CADASTRO = 'https://site.test/complete-registration?token=t0k3n1';
const LINK_NOVO = 'https://site.test/complete-registration?token=t0k3n2';
const ROTA = '/admin/clients/c1/resend-invite';

function Tela() {
  const [formAberto, setFormAberto] = useState(true);
  return (
    <ModalProvider>
      {formAberto && <ClientForm onSuccess={() => setFormAberto(false)} onCancel={vi.fn()} />}
      <ModalManager />
    </ModalProvider>
  );
}

async function criarClienteEAbrirConvite() {
  apiFetch.mockResolvedValueOnce({ client: { id: 'c1' }, inviteUrl: LINK_CADASTRO, emailSent: true });
  render(<Tela />);
  fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Carla Dias' } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'carla@teste.com' } });
  fireEvent.click(screen.getByRole('button', { name: 'Criar Cliente' }));
  expect(await screen.findByLabelText('Link de convite')).toHaveValue(LINK_CADASTRO);
  expect(screen.queryByRole('button', { name: 'Criar Cliente' })).not.toBeInTheDocument();
  addNotification.mockClear();
}

const chamadasDoReenvio = () => apiFetch.mock.calls.filter(([url]) => url === ROTA);

describe('ClientForm — Reenviar convite na janela do convite', () => {
  beforeEach(() => {
    apiFetch.mockReset();
    addNotification.mockReset();
    localStorage.clear();
  });

  it('chama a rota do cliente e a janela passa a mostrar o link novo, porque o do cadastro deixou de valer', async () => {
    await criarClienteEAbrirConvite();
    apiFetch.mockResolvedValueOnce({ inviteUrl: LINK_NOVO, emailSent: true });

    fireEvent.click(screen.getByRole('button', { name: 'Reenviar convite' }));

    await waitFor(() => expect(screen.getByLabelText('Link de convite')).toHaveValue(LINK_NOVO));
    expect(chamadasDoReenvio()).toEqual([[ROTA, { method: 'POST' }]]);
    expect(addNotification).toHaveBeenCalledTimes(1);
    expect(addNotification).toHaveBeenCalledWith({ type: 'success', title: 'Sucesso', message: 'Convite reenviado. O link anterior deixou de valer.' });
  });

  it('e-mail que não saiu: link novo na janela e aviso de que o anterior deixou de valer e de mandar o novo ao cliente (antes: "Convite reenviado")', async () => {
    await criarClienteEAbrirConvite();
    apiFetch.mockResolvedValueOnce({ inviteUrl: LINK_NOVO, emailSent: false });

    fireEvent.click(screen.getByRole('button', { name: 'Reenviar convite' }));

    await waitFor(() => expect(screen.getByLabelText('Link de convite')).toHaveValue(LINK_NOVO));
    expect(addNotification).toHaveBeenCalledTimes(1);
    expect(addNotification).toHaveBeenCalledWith({
      type: 'warning',
      title: 'Atenção',
      message: 'Novo link gerado, mas o e-mail não foi enviado. O link anterior deixou de valer: copie o novo e mande ao cliente.',
    });
  });

  it('recusa do servidor: mostra o motivo (antes: só "Falha ao reenviar convite"), a janela fica com o link que tinha e o botão volta a funcionar', async () => {
    await criarClienteEAbrirConvite();
    apiFetch.mockRejectedValueOnce(new Error('A conta deste cliente está desativada; o convite não foi enviado.'));

    fireEvent.click(screen.getByRole('button', { name: 'Reenviar convite' }));

    await waitFor(() =>
      expect(addNotification).toHaveBeenCalledWith({ type: 'error', title: 'Erro', message: 'A conta deste cliente está desativada; o convite não foi enviado.' }),
    );
    expect(screen.getByLabelText('Link de convite')).toHaveValue(LINK_CADASTRO);

    apiFetch.mockResolvedValueOnce({ inviteUrl: LINK_NOVO, emailSent: true });
    fireEvent.click(screen.getByRole('button', { name: 'Reenviar convite' }));
    await waitFor(() => expect(screen.getByLabelText('Link de convite')).toHaveValue(LINK_NOVO));
    expect(chamadasDoReenvio()).toHaveLength(2);
  });

  it('dois cliques seguidos mandam um pedido só: cada reenvio troca o token e derrubaria o link do outro', async () => {
    await criarClienteEAbrirConvite();
    let responder: (valor: unknown) => void = () => {};
    apiFetch.mockImplementationOnce(() => new Promise((resolve) => { responder = resolve; }));

    const botao = screen.getByRole('button', { name: 'Reenviar convite' });
    fireEvent.click(botao);
    fireEvent.click(botao);
    expect(chamadasDoReenvio()).toHaveLength(1);

    responder({ inviteUrl: LINK_NOVO, emailSent: true });
    await waitFor(() => expect(screen.getByLabelText('Link de convite')).toHaveValue(LINK_NOVO));
    expect(chamadasDoReenvio()).toHaveLength(1);
  });
});
