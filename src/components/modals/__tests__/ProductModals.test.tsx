import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';

const { openWhatsApp } = vi.hoisted(() => ({ openWhatsApp: vi.fn() }));
vi.mock('../../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));
vi.mock('../../../utils/whatsapp', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../utils/whatsapp')>()),
  openWhatsApp,
}));

import { ModalProvider } from '../ModalContext';
import { ModalManager } from '../ModalManager';
import { ZoomableProductPhoto } from '../../ui/ZoomableProductPhoto';
import { AskOnWhatsAppButton } from '../../ui/AskOnWhatsAppButton';

const withModals = (ui: React.ReactNode) =>
  render(
    <ModalProvider>
      {ui}
      <ModalManager />
    </ModalProvider>,
  );

const PHOTO = 'https://res.cloudinary.com/demo/image/upload/v1/caixa.jpg';

// Achado: ImageGalleryModal e WhatsAppModal estavam montados no ModalManager e nunca eram abertos;
// a galeria ainda quebrava ao abrir (função usada antes de ser declarada).
describe('janelas das páginas de produto', () => {
  beforeEach(() => openWhatsApp.mockReset());

  it('tocar na foto abre a galeria com a imagem ampliada e fecha', () => {
    withModals(<ZoomableProductPhoto src={PHOTO} alt="Caixa JBL" />);

    fireEvent.click(screen.getByRole('button', { name: 'Ampliar foto: Caixa JBL' }));
    const dialog = screen.getByRole('dialog', { name: 'Caixa JBL' });
    expect(within(dialog).getByRole('img', { name: 'Caixa JBL' })).toHaveAttribute('src', PHOTO);
    // Uma foto só: sem setas nem contador "1 de 1".
    expect(within(dialog).queryByRole('button', { name: 'Próxima imagem' })).not.toBeInTheDocument();
    expect(within(dialog).queryByText('1 de 1')).not.toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Fechar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('com fotos extras a galeria navega entre elas', () => {
    const extra = 'https://res.cloudinary.com/demo/image/upload/v1/kit-2.png';
    withModals(<ZoomableProductPhoto src={PHOTO} alt="Kit Festa" extraImages={[extra, PHOTO]} />);

    fireEvent.click(screen.getByRole('button', { name: 'Ampliar foto: Kit Festa' }));
    const dialog = screen.getByRole('dialog', { name: 'Kit Festa' });
    expect(within(dialog).getByText('1 de 2')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Próxima imagem' }));
    expect(within(dialog).getByRole('img', { name: 'Kit Festa — foto 2' })).toHaveAttribute('src', extra);
  });

  it('foto de domínio desconhecido aparece sem "Ampliar" (a galeria a recusaria)', () => {
    withModals(<ZoomableProductPhoto src="https://exemplo-malicioso.com/x.jpg" alt="Item" />);
    expect(screen.getByRole('img', { name: 'Item' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ampliar/ })).not.toBeInTheDocument();
  });

  it('"Tirar dúvida no WhatsApp" abre a janela com o item no assunto e envia', () => {
    withModals(<AskOnWhatsAppButton kind="Equipamento" itemName="Caixa JBL" />);

    fireEvent.click(screen.getByRole('button', { name: /Tirar dúvida no WhatsApp/ }));
    const dialog = screen.getByRole('dialog', { name: 'Tirar dúvida no WhatsApp' });
    fireEvent.change(within(dialog).getByLabelText('Sua mensagem'), {
      target: { value: 'Olá! Tenho uma dúvida sobre este item: ela tem bluetooth?' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Abrir WhatsApp' }));

    expect(openWhatsApp).toHaveBeenCalledTimes(1);
    expect(openWhatsApp.mock.calls[0][1]).toBe('*Equipamento: Caixa JBL*\n\nOlá! Tenho uma dúvida sobre este item: ela tem bluetooth?');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
