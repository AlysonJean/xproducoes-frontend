import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

const { apiFetch, useAuth, addNotification } = vi.hoisted(() => ({ apiFetch: vi.fn(), useAuth: vi.fn(), addNotification: vi.fn() }));
vi.mock('../../../services/api', () => ({ apiFetch }));
vi.mock('@/services/api', () => ({ apiFetch }));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth }));
vi.mock('jspdf', () => ({ jsPDF: vi.fn() }));
vi.mock('jspdf-autotable', () => ({ default: vi.fn() }));

import AdminQuickProposalPage from '../AdminQuickProposalPage';

const mesa = { id: 'eq-mesa', name: 'Mesa de Som', dailyPrice: 300 };

const PaginaDaReserva = () => {
  const { pathname } = useLocation();
  return <p>{`Página da reserva ${pathname}`}</p>;
};

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/admin/orcamentos/novo']}>
      <Routes>
        <Route path="/admin/orcamentos/novo" element={<AdminQuickProposalPage />} />
        <Route path="/admin/reservas/:id" element={<PaginaDaReserva />} />
      </Routes>
    </MemoryRouter>,
  );

// O mínimo que a validação da tela exige: um item do catálogo, cliente manual, datas e endereço.
const preencherProposta = async () => {
  fireEvent.click(await screen.findByRole('button', { name: 'Adicionar Mesa de Som' }));
  const campos: Array<[string, string]> = [
    ['Nome Completo *', 'Ana Souza'],
    ['WhatsApp / Celular *', '31988887777'],
    ['Local / Salão *', 'Espaço VIP'],
    ['Início Previsto *', '2027-01-10T18:00'],
    ['Término Previsto *', '2027-01-10T23:00'],
    ['CEP *', '30110-000'],
    ['Rua *', 'Av. Brasil'],
    ['Número *', '123'],
    ['Bairro *', 'Centro'],
    ['Cidade *', 'Belo Horizonte'],
    ['UF *', 'MG'],
  ];
  for (const [label, value] of campos) {
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  }
};

const chamadasPost = () => apiFetch.mock.calls.filter((c) => c[0] === '/bookings' && c[1]?.method === 'POST');

// Achado (revisão antes do deploy): o apiFetch já desembrulha { success, data } e devolve a própria
// reserva, mas a tela lia `.data.id` — toda criação terminava em "Reserva criada mas ID não
// retornado." e o novo clique, com outra Idempotency-Key, gravava a reserva de novo.
describe('AdminQuickProposalPage — gerar link da proposta', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: { id: 'a1', name: 'Admin', role: 'ADMIN' } });
  });

  it('abre a página da reserva criada', async () => {
    // O que o apiFetch devolve para POST /bookings: o `data` do envelope, ou seja, a reserva.
    apiFetch.mockImplementation((url: string, opts?: { method?: string }) => {
      if (url === '/bookings' && opts?.method === 'POST') return Promise.resolve({ id: 'XP-NOVA', status: 'PENDING' });
      return Promise.resolve(url === '/equipments' ? [mesa] : []);
    });
    renderPage();
    await preencherProposta();

    fireEvent.click(screen.getByRole('button', { name: /gerar link da proposta/i }));

    expect(await screen.findByText('Página da reserva /admin/reservas/XP-NOVA')).toBeInTheDocument();
    expect(addNotification).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
  });

  it('tentar de novo o mesmo envio repete a Idempotency-Key; com o formulário alterado, a chave é outra', async () => {
    let tentativas = 0;
    apiFetch.mockImplementation((url: string, opts?: { method?: string }) => {
      if (url === '/bookings' && opts?.method === 'POST') {
        tentativas += 1;
        return tentativas < 3 ? Promise.reject(new Error('Tempo esgotado')) : Promise.resolve({ id: 'XP-NOVA' });
      }
      return Promise.resolve(url === '/equipments' ? [mesa] : []);
    });
    renderPage();
    await preencherProposta();
    const botao = screen.getByRole('button', { name: /gerar link da proposta/i });

    fireEvent.click(botao); // 1ª tentativa: falha
    await waitFor(() => expect(botao).not.toBeDisabled());
    fireEvent.click(botao); // 2ª, mesmo formulário: falha de novo
    await waitFor(() => expect(botao).not.toBeDisabled());
    fireEvent.change(screen.getByLabelText('Número *'), { target: { value: '124' } });
    fireEvent.click(botao); // 3ª, formulário alterado: grava

    await waitFor(() => expect(chamadasPost()).toHaveLength(3));
    const chaves = chamadasPost().map((c) => c[1].headers?.['Idempotency-Key']);
    expect(chaves[0]).toEqual(expect.any(String));
    expect(chaves[1]).toBe(chaves[0]);
    expect(chaves[2]).toEqual(expect.any(String));
    expect(chaves[2]).not.toBe(chaves[0]);
    expect(await screen.findByText('Página da reserva /admin/reservas/XP-NOVA')).toBeInTheDocument();
  });
});
