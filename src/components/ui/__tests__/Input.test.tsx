import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Input } from '../Input';

expect.extend(toHaveNoViolations);

// Achado (Fase 3): o botão de mostrar/ocultar senha tinha tabIndex={-1} (inacessível via
// teclado — um usuário que navega só com Tab nunca conseguia alcançá-lo) e nenhum
// aria-label (um leitor de tela só anunciava um ícone sem nome).
describe('Input - toggle de mostrar/ocultar senha é acessível por teclado e leitor de tela', () => {
  it('o botão de alternar senha é alcançável via Tab (não tem mais tabIndex={-1})', async () => {
    const user = userEvent.setup();
    render(<Input label="Senha" type="password" showPasswordToggle name="password" />);

    const input = screen.getByLabelText('Senha');
    const toggleButton = screen.getByRole('button');

    input.focus();
    await user.tab();

    expect(toggleButton).toHaveFocus();
  });

  it('tem um aria-label descritivo que muda conforme o estado (Mostrar/Ocultar)', async () => {
    const user = userEvent.setup();
    render(<Input label="Senha" type="password" showPasswordToggle name="password" />);

    expect(screen.getByRole('button', { name: 'Mostrar senha' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Mostrar senha' }));

    expect(screen.getByRole('button', { name: 'Ocultar senha' })).toBeInTheDocument();
  });

  it('clicar no botão alterna o type do input entre password e text', async () => {
    const user = userEvent.setup();
    render(<Input label="Senha" type="password" showPasswordToggle name="password" />);

    const input = screen.getByLabelText('Senha') as HTMLInputElement;
    expect(input).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: 'Mostrar senha' }));
    expect(input).toHaveAttribute('type', 'text');

    await user.click(screen.getByRole('button', { name: 'Ocultar senha' }));
    expect(input).toHaveAttribute('type', 'password');
  });

  it('não tem violações de acessibilidade detectáveis pelo axe', async () => {
    const { container } = render(
      <Input label="Senha" type="password" showPasswordToggle name="password" />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
