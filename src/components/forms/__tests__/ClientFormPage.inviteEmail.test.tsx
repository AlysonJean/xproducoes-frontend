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

// Achado (auditoria, item C de 05/11/2026): no "Novo cliente", o servidor devolve emailSent (se o e-mail
// do convite saiu), mas a tela ignorava o campo e dizia só "Cliente criado!". Com o envio de e-mail
// falhando (535 desde 31/10), o cliente nunca recebia o convite e ninguém ficava sabendo. Agora, com
// emailSent false, aparece o mesmo tipo de aviso do "Reenviar convite": copie o link e mande ao cliente.
// A janela com o link já abria; ela continua abrindo.
const AVISO_EMAIL = 'Cliente criado, mas o e-mail do convite não foi enviado. Copie o link na janela do convite e mande ao cliente.';

async function criarCliente() {
  const onSuccess = vi.fn();
  render(<ClientForm onSuccess={onSuccess} onCancel={vi.fn()} />);
  fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Carla Dias' } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'carla@teste.com' } });
  fireEvent.click(screen.getByRole('button', { name: 'Criar Cliente' }));
  await waitFor(() => expect(onSuccess).toHaveBeenCalled());
}

describe('ClientForm — aviso quando o e-mail do convite não sai no Novo cliente', () => {
  beforeEach(() => {
    apiFetch.mockReset();
    addNotification.mockReset();
    openModal.mockReset();
    localStorage.clear();
  });

  it('emailSent false: avisa que o e-mail não saiu e abre a janela com o link', async () => {
    apiFetch.mockResolvedValue({ client: { id: 'c1' }, inviteUrl: 'https://site.test/convite', emailSent: false });

    await criarCliente();

    expect(addNotification).toHaveBeenCalledWith({ type: 'success', title: 'Sucesso', message: 'Cliente criado!' });
    expect(addNotification).toHaveBeenCalledWith({ type: 'warning', title: 'Atenção', message: AVISO_EMAIL });
    expect(openModal).toHaveBeenCalled();
  });

  it('emailSent true: sem aviso de e-mail', async () => {
    apiFetch.mockResolvedValue({ client: { id: 'c1' }, inviteUrl: 'https://site.test/convite', emailSent: true });

    await criarCliente();

    expect(addNotification).toHaveBeenCalledTimes(1);
    expect(addNotification).toHaveBeenCalledWith({ type: 'success', title: 'Sucesso', message: 'Cliente criado!' });
  });

  it('servidor que não informa emailSent: a tela não afirma que o e-mail falhou', async () => {
    apiFetch.mockResolvedValue({ client: { id: 'c1' }, inviteUrl: 'https://site.test/convite' });

    await criarCliente();

    expect(addNotification).not.toHaveBeenCalledWith(expect.objectContaining({ message: AVISO_EMAIL }));
  });
});
