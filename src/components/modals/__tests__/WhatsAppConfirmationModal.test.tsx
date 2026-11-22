import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const { gaEvent } = vi.hoisted(() => ({ gaEvent: vi.fn() }));
vi.mock('react-ga4', () => ({ default: { event: gaEvent } }));

import { WhatsAppConfirmationModal } from '../WhatsAppConfirmationModal';
import { ConfirmModal } from '../ConfirmModal';

// Achado (auditoria do design system): o ConfirmModal descartava os `children` e o
// WhatsAppConfirmationModal passava `message=""` — o admin confirmava o envio do WhatsApp ao cliente
// sem ver o texto que ia ser enviado.
// P14 (aprovada em 02/11/2026), parte 2: a janela é a da troca de status da ficha. O WhatsApp é uma caixa (marcada
// quando há telefone); sem telefone, só o status muda. O WhatsApp abre sem o evento de conversão do GA (D7): antes, o
// clique do admin contava como conversão de cliente ('whatsapp_click').
describe('Confirmação de envio por WhatsApp', () => {
  let open: MockInstance<typeof window.open>;
  let tab: { location: { href: string }; close: ReturnType<typeof vi.fn>; closed: boolean; opener: unknown };
  const props = {
    isOpen: true,
    onClose: vi.fn(),
    title: 'Confirmar a reserva?',
    confirmText: 'Confirmar',
    message: 'Olá! Sua reserva XP-123 está confirmada para sábado.',
    isSending: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Auditoria do status (21/11/2026), M7: o clique reserva uma aba vazia; o WhatsApp entra nela depois da troca.
    tab = { location: { href: '' }, close: vi.fn(), closed: false, opener: {} };
    open = vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window);
  });
  afterEach(() => {
    open.mockRestore();
  });

  it('mostra a prévia da mensagem antes de confirmar', () => {
    render(<WhatsAppConfirmationModal {...props} onConfirm={vi.fn()} contactNumber="5531999999999" />);

    expect(screen.getByText('Olá! Sua reserva XP-123 está confirmada para sábado.')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Confirmar a reserva?' })).toBeInTheDocument();
    expect(screen.getByLabelText('Avisar o cliente pelo WhatsApp')).toBeChecked();
    expect(screen.getByText('Abre o WhatsApp do número 5531999999999 com a mensagem abaixo.')).toBeInTheDocument();
  });

  // Atualizado de propósito (auditoria do status, 21/11/2026), M7: a troca grava primeiro; a aba abre vazia no clique
  // e recebe o wa.me depois que deu certo.
  it('com telefone e a caixa marcada: reserva a aba no clique, muda o status e leva o wa.me com o texto, sem evento do GA', async () => {
    const onConfirm = vi.fn().mockResolvedValue(true);
    render(<WhatsAppConfirmationModal {...props} onConfirm={onConfirm} contactNumber="5531999999999" />);

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

    expect(open).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledWith('', '_blank');
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(tab.location.href).not.toBe(''));
    const url = new URL(tab.location.href);
    expect(`${url.origin}${url.pathname}`).toBe('https://wa.me/5531999999999');
    expect(url.searchParams.get('text')).toBe(props.message);
    expect(tab.opener).toBeNull();
    expect(gaEvent).not.toHaveBeenCalled();
  });

  it('M7: a troca que falha (onConfirm devolve false) fecha a aba reservada e não leva o WhatsApp', async () => {
    const onConfirm = vi.fn().mockResolvedValue(false);
    render(<WhatsAppConfirmationModal {...props} onConfirm={onConfirm} contactNumber="5531999999999" />);

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

    await waitFor(() => expect(tab.close).toHaveBeenCalled());
    expect(tab.location.href).toBe('');
    expect(open).toHaveBeenCalledTimes(1);
  });

  it('a troca que lança um erro também fecha a aba reservada (nada de aba em branco para trás)', async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error('rede'));
    render(<WhatsAppConfirmationModal {...props} onConfirm={onConfirm} contactNumber="5531999999999" />);

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

    await waitFor(() => expect(tab.close).toHaveBeenCalled());
    expect(tab.location.href).toBe('');
  });

  it('sem a aba (o navegador não abriu): depois da troca, abre o wa.me como antes', async () => {
    open.mockReturnValue(null);
    const onConfirm = vi.fn().mockResolvedValue(true);
    render(<WhatsAppConfirmationModal {...props} onConfirm={onConfirm} contactNumber="5531999999999" />);

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

    await waitFor(() => expect(open).toHaveBeenCalledTimes(2));
    expect(String(open.mock.calls[1][0])).toContain('https://wa.me/5531999999999');
  });

  it('C7: com askReason, pede o motivo antes de mudar o status e o entrega à troca', async () => {
    const onConfirm = vi.fn().mockResolvedValue(true);
    render(<WhatsAppConfirmationModal {...props} title="Cancelar a reserva?" confirmText="Cancelar reserva" askReason onConfirm={onConfirm} contactNumber={null} />);

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar reserva' }));
    expect(await screen.findByText('Escreva o motivo do cancelamento.')).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Motivo do cancelamento'), { target: { value: '  Cliente mudou a data  ' } });
    expect(screen.queryByText('Escreva o motivo do cancelamento.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar reserva' }));
    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith('Cliente mudou a data'));
    expect(open).not.toHaveBeenCalled();
  });

  it('caixa desmarcada: a prévia sai da tela e só muda o status', () => {
    const onConfirm = vi.fn();
    render(<WhatsAppConfirmationModal {...props} onConfirm={onConfirm} contactNumber="5531999999999" />);

    expect(screen.getByLabelText('Prévia da mensagem do WhatsApp')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Avisar o cliente pelo WhatsApp'));
    // Teste de ponta a ponta (21/11/2026): a prévia ficava na tela depois de desmarcar.
    expect(screen.queryByLabelText('Prévia da mensagem do WhatsApp')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

    expect(open).not.toHaveBeenCalled();
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('sem telefone: a caixa fica desligada com "Sem telefone na reserva", sem prévia, e o status muda mesmo assim', () => {
    const onConfirm = vi.fn();
    render(<WhatsAppConfirmationModal {...props} onConfirm={onConfirm} contactNumber={null} />);

    const caixa = screen.getByLabelText('Avisar o cliente pelo WhatsApp');
    expect(caixa).toBeDisabled();
    expect(caixa).not.toBeChecked();
    expect(screen.getByText('Sem telefone na reserva')).toBeInTheDocument();
    expect(screen.queryByLabelText('Prévia da mensagem do WhatsApp')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

    expect(open).not.toHaveBeenCalled();
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('a caixa volta marcada a cada abertura', () => {
    const { rerender } = render(<WhatsAppConfirmationModal {...props} onConfirm={vi.fn()} contactNumber="5531999999999" />);
    fireEvent.click(screen.getByLabelText('Avisar o cliente pelo WhatsApp'));
    expect(screen.getByLabelText('Avisar o cliente pelo WhatsApp')).not.toBeChecked();

    rerender(<WhatsAppConfirmationModal {...props} isOpen={false} onConfirm={vi.fn()} contactNumber="5531999999999" />);
    rerender(<WhatsAppConfirmationModal {...props} onConfirm={vi.fn()} contactNumber="5531999999999" />);

    expect(screen.getByLabelText('Avisar o cliente pelo WhatsApp')).toBeChecked();
  });

  it('ConfirmModal renderiza children e mensagem em ReactNode', () => {
    render(
      <ConfirmModal isOpen onClose={vi.fn()} onConfirm={vi.fn()} message={<strong>Mensagem rica</strong>}>
        <p>Conteúdo extra</p>
      </ConfirmModal>
    );
    expect(screen.getByText('Mensagem rica')).toBeInTheDocument();
    expect(screen.getByText('Conteúdo extra')).toBeInTheDocument();
  });
});
