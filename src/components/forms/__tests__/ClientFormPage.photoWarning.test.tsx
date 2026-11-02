import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const { apiFetch, addNotification, openModal } = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  addNotification: vi.fn(),
  openModal: vi.fn(),
}));
vi.mock('@/services/api', () => ({ apiFetch }));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('@/components/modals/ModalContext', () => ({ useModal: () => ({ openModal }) }));

import { ClientForm } from '../ClientFormPage';

// Achado (auditoria ponta a ponta): no "Novo cliente", o servidor cria o cliente mesmo quando a foto
// não sobe e responde 201 com um aviso (data.warning). A tela mostrava só "Cliente criado!", e a falta
// da foto só aparecia depois, na lista.
const AVISO = 'A foto não foi enviada; envie de novo pela edição do cliente.';

async function criarCliente() {
  const onSuccess = vi.fn();
  render(<ClientForm onSuccess={onSuccess} onCancel={vi.fn()} />);
  fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Carla Dias' } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'carla@teste.com' } });
  fireEvent.click(screen.getByRole('button', { name: 'Criar Cliente' }));
  await waitFor(() => expect(onSuccess).toHaveBeenCalled());
}

describe('ClientForm — aviso da foto que não subiu no Novo cliente', () => {
  beforeEach(() => {
    apiFetch.mockReset();
    addNotification.mockReset();
    openModal.mockReset();
    localStorage.clear();
  });

  it('201 com aviso: mostra "Cliente criado!" e o aviso do servidor', async () => {
    apiFetch.mockResolvedValue({ client: { id: 'c1' }, inviteUrl: 'https://site.test/convite', warning: AVISO });

    await criarCliente();

    expect(addNotification).toHaveBeenCalledWith({ type: 'success', title: 'Sucesso', message: 'Cliente criado!' });
    expect(addNotification).toHaveBeenCalledWith({ type: 'warning', title: 'Atenção', message: AVISO });
  });

  it('201 sem aviso: só "Cliente criado!"', async () => {
    apiFetch.mockResolvedValue({ client: { id: 'c1' }, inviteUrl: 'https://site.test/convite' });

    await criarCliente();

    expect(addNotification).toHaveBeenCalledTimes(1);
    expect(addNotification).toHaveBeenCalledWith({ type: 'success', title: 'Sucesso', message: 'Cliente criado!' });
  });
});
