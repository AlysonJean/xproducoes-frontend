import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock('../../services/api', () => ({ apiFetch }));
vi.mock('../../contexts/SettingsContext', () => ({ useSettings: () => ({ companyName: 'X Produções' }) }));
vi.mock('../ui/ThemedLogo', () => ({ default: () => <span>logo</span> }));
// O rodapé antigo abria um aviso (modal) depois da inscrição; o falso deixa o teste valer também no código antigo.
vi.mock('../modals/ModalContext', () => ({ useModal: () => ({ openModal: vi.fn() }) }));

import { Footer } from '../Footer';
import { newsletterService } from '../../services/newsletterService';

// D8c (aprovada em 02/11/2026), pergunta 5 (ninguém envia newsletter): o formulário "Fique por dentro das novidades"
// saiu do rodapé, junto com a inscrição no servidor. Antes o rodapé pedia o e-mail ("Receba ofertas exclusivas...") e
// gravava a inscrição numa lista que nunca recebia nada e não tinha como sair.
describe('Footer — sem o formulário de newsletter', () => {
  it('não pede e-mail nem tem o botão "Inscrever"', () => {
    const { container } = render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('textbox')).toBeNull();
    expect(container.querySelector('form, input')).toBeNull();
    expect(screen.queryByRole('button', { name: /inscrever/i })).toBeNull();
    expect(screen.queryByText(/fique por dentro das novidades|ofertas exclusivas|newsletter/i)).toBeNull();
    // O resto do rodapé continua.
    expect(screen.getByRole('link', { name: 'Política de Privacidade' })).toHaveAttribute('href', '/privacidade');
    expect(screen.getByRole('button', { name: 'Abrir WhatsApp' })).toBeInTheDocument();
  });

  it('o site não tem mais como inscrever: newsletterService só lê a lista do painel', async () => {
    expect(Object.keys(newsletterService)).toEqual(['getAllSubscribers']);
    apiFetch.mockResolvedValue([]);
    await newsletterService.getAllSubscribers();
    expect(apiFetch).toHaveBeenCalledWith('/newsletter/subscribers');
  });
});
