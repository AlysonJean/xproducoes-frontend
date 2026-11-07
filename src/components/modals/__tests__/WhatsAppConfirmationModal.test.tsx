import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

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
    open = vi.spyOn(window, 'open').mockReturnValue({} as Window);
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

  it('com telefone e a caixa marcada: abre o wa.me com o texto, no próprio clique, sem evento do GA, e muda o status', () => {
    const onConfirm = vi.fn();
    render(<WhatsAppConfirmationModal {...props} onConfirm={onConfirm} contactNumber="5531999999999" />);

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

    expect(open).toHaveBeenCalledTimes(1);
    const url = new URL(String(open.mock.calls[0][0]));
    expect(`${url.origin}${url.pathname}`).toBe('https://wa.me/5531999999999');
    expect(url.searchParams.get('text')).toBe(props.message);
    expect(gaEvent).not.toHaveBeenCalled();
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('caixa desmarcada: só muda o status', () => {
    const onConfirm = vi.fn();
    render(<WhatsAppConfirmationModal {...props} onConfirm={onConfirm} contactNumber="5531999999999" />);

    fireEvent.click(screen.getByLabelText('Avisar o cliente pelo WhatsApp'));
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
