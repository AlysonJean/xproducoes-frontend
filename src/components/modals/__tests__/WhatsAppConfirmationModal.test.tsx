import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WhatsAppConfirmationModal } from '../WhatsAppConfirmationModal';
import { ConfirmModal } from '../ConfirmModal';

// Achado (auditoria do design system): o ConfirmModal descartava os `children` e o
// WhatsAppConfirmationModal passava `message=""` — o admin confirmava o envio do WhatsApp ao cliente
// sem ver o texto que ia ser enviado.
describe('Confirmação de envio por WhatsApp', () => {
  it('mostra a prévia da mensagem antes de confirmar', () => {
    render(
      <WhatsAppConfirmationModal
        isOpen
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        message="Olá! Sua reserva XP-123 está confirmada para sábado."
        contactNumber="31999999999"
        isSending={false}
      />
    );
    expect(screen.getByText('Olá! Sua reserva XP-123 está confirmada para sábado.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar via WhatsApp' })).toBeInTheDocument();
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
