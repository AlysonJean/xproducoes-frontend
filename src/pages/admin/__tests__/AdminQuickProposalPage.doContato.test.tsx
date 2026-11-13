import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const { apiFetch, useAuth, addNotification } = vi.hoisted(() => ({ apiFetch: vi.fn(), useAuth: vi.fn(), addNotification: vi.fn() }));
vi.mock('../../../services/api', () => ({ apiFetch }));
vi.mock('@/services/api', () => ({ apiFetch }));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth }));

import AdminQuickProposalPage from '../AdminQuickProposalPage';

// D24 (aprovada em 02/11/2026): "Transformar em proposta", na tela de contatos, abre a Proposta Rápida com os dados do
// formulário pelo estado da navegação. A data informada não vira horário: vai nas observações e num aviso.
const FROM_CONTACT = {
  name: 'Ana Souza', email: 'ana@teste.com', phone: '(31) 98888-7777', subject: 'Orçamento', eventType: 'Casamento',
  eventDate: '20/12/2026', budget: 'R$ 3.000 - R$ 5.000', text: 'Quero som para a festa.',
};

const renderPage = (state?: object) =>
  render(
    <MemoryRouter initialEntries={[{ pathname: '/admin/orcamentos/novo', state }]}>
      <Routes>
        <Route path="/admin/orcamentos/novo" element={<AdminQuickProposalPage />} />
      </Routes>
    </MemoryRouter>,
  );

describe('Proposta Rápida aberta a partir de um contato do site', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: { id: 'a1', name: 'Admin', role: 'ADMIN' } });
    apiFetch.mockImplementation((url: string) =>
      Promise.resolve(url === '/equipments/pricing-rules' ? { equipmentPriceUnit: 'hour', kitPrice: 'PER_EVENT' } : []));
  });

  it('preenche cliente, contato, título e observações, e avisa a data informada sem inventar horário', async () => {
    renderPage({ fromContact: FROM_CONTACT });

    expect(await screen.findByLabelText('Nome Completo *')).toHaveValue('Ana Souza');
    expect(screen.getByLabelText('E-mail')).toHaveValue('ana@teste.com');
    expect(screen.getByLabelText('WhatsApp / Celular *')).toHaveValue('(31) 98888-7777');
    expect(screen.getByLabelText('Título do Evento')).toHaveValue('Casamento — Ana Souza');
    const notas = (screen.getByLabelText(/Observações Internas/) as HTMLTextAreaElement).value;
    expect(notas).toContain('Data informada: 20/12/2026');
    expect(notas).toContain('Mensagem: Quero som para a festa.');
    expect(screen.getByText(/Data informada no contato: 20\/12\/2026/)).toBeInTheDocument();
    expect(screen.getByLabelText('Início Previsto *')).toHaveValue('');
  });

  it('sem o estado, o formulário abre vazio como antes', async () => {
    renderPage();

    expect(await screen.findByLabelText('Nome Completo *')).toHaveValue('');
    expect(screen.getByLabelText('Título do Evento')).toHaveValue('');
    expect(screen.queryByText(/Data informada no contato/)).not.toBeInTheDocument();
  });
});
