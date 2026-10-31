import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../contexts/SettingsContext', () => ({ useSettings: () => ({ companyName: 'X Produções' }) }));
vi.mock('../modals/ModalContext', () => ({ useModal: () => ({ openModal: vi.fn() }) }));
vi.mock('../ui/ThemedLogo', () => ({ default: () => <span>logo</span> }));

import { Footer } from '../Footer';

// Auditoria do painel: o campo de e-mail da newsletter no rodapé não tinha id, name nem rótulo
// — aviso repetido de acessibilidade no console e leitor de tela sem nome para o campo.
describe('Footer — campo da newsletter', () => {
  it('tem nome acessível, id e name', () => {
    render(<MemoryRouter><Footer /></MemoryRouter>);
    const input = screen.getByRole('textbox', { name: 'E-mail para receber a newsletter' });
    expect(input).toHaveAttribute('id');
    expect(input).toHaveAttribute('name', 'email');
    expect(input).toHaveAttribute('autocomplete', 'email');
  });
});
