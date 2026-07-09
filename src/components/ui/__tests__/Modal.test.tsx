import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Modal } from '../Modal';

expect.extend(toHaveNoViolations);

// Achado (Fase 3): o Modal base (usado por ~30 arquivos via BaseModal/StandardComponents)
// não tinha role="dialog"/aria-modal, não prendia o foco dentro dele (Tab escapava para a
// página por trás do overlay) e não devolvia o foco para o elemento que abriu o modal ao
// fechar. Testado aqui diretamente contra o componente real (não uma marcação inline).
describe('Modal - semântica de diálogo, trap de foco e restauração de foco', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('expõe role="dialog", aria-modal="true" e um nome acessível (título)', () => {
    render(
      <Modal isOpen onClose={vi.fn()} title="Confirmar ação">
        <p>Conteúdo</p>
      </Modal>
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleName('Confirmar ação');
  });

  it('usa um nome acessível padrão quando não há título', () => {
    render(
      <Modal isOpen onClose={vi.fn()}>
        <p>Conteúdo sem título</p>
      </Modal>
    );

    expect(screen.getByRole('dialog')).toHaveAccessibleName();
  });

  it('move o foco para dentro do modal ao abrir', async () => {
    render(
      <Modal isOpen onClose={vi.fn()} title="Título">
        <button>Primeiro botão</button>
        <button>Segundo botão</button>
      </Modal>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Fechar' })).toHaveFocus();
    });
  });

  it('restaura o foco para o elemento que abriu o modal, ao fechar', async () => {
    function Harness() {
      const [open, setOpen] = React.useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>Abrir modal</button>
          <Modal isOpen={open} onClose={() => setOpen(false)} title="Título">
            <p>Conteúdo</p>
          </Modal>
        </>
      );
    }

    const user = userEvent.setup();
    render(<Harness />);

    const openButton = screen.getByRole('button', { name: 'Abrir modal' });
    await user.click(openButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(openButton).toHaveFocus();
  });

  it('prende o foco: Tab no último elemento focável volta para o primeiro', async () => {
    render(
      <Modal isOpen onClose={vi.fn()} title="Título">
        <button>Meio</button>
      </Modal>
    );

    const closeButton = screen.getByRole('button', { name: 'Fechar' });
    const middleButton = screen.getByRole('button', { name: 'Meio' });

    await waitFor(() => expect(closeButton).toHaveFocus());

    middleButton.focus();
    fireEvent.keyDown(document, { key: 'Tab' });

    expect(closeButton).toHaveFocus();
  });

  it('prende o foco: Shift+Tab no primeiro elemento focável volta para o último', async () => {
    render(
      <Modal isOpen onClose={vi.fn()} title="Título">
        <button>Meio</button>
      </Modal>
    );

    const closeButton = screen.getByRole('button', { name: 'Fechar' });
    await waitFor(() => expect(closeButton).toHaveFocus());

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });

    const middleButton = screen.getByRole('button', { name: 'Meio' });
    expect(middleButton).toHaveFocus();
  });

  it('Escape ainda fecha o modal (comportamento preexistente preservado)', async () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen onClose={onClose} title="Título">
        <p>Conteúdo</p>
      </Modal>
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('não tem violações de acessibilidade detectáveis pelo axe', async () => {
    const { container } = render(
      <Modal isOpen onClose={vi.fn()} title="Título acessível">
        <p>Conteúdo</p>
        <button>Ação</button>
      </Modal>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
