import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// Pedido de Alyson de 24/11/2026: na Proposta Rápida, "Fechar no valor" (a equipe digita o total e o código divide o
// desconto entre os itens, com a soma exata) e a conferência antes de enviar (dado que falta, outra reserva no dia,
// valor que parece erro).
const { apiFetch, useAuth, addNotification } = vi.hoisted(() => ({ apiFetch: vi.fn(), useAuth: vi.fn(), addNotification: vi.fn() }));
vi.mock('../../../services/api', () => ({ apiFetch }));
vi.mock('@/services/api', () => ({ apiFetch }));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth }));

import AdminQuickProposalPage from '../AdminQuickProposalPage';

const CODIGO = 'XP-BIA-20270418-2000-7Q1';
const BRIEFING = [
  '— Briefing preenchido pelo cliente —',
  'Evento: Aniversário ou 15 anos',
  'A banda tem rider técnico: Sim',
  'Tensão da tomada: Não sei',
  '',
  '— Ciência marcada em 20/11/2026 (texto 2026-11-13) —',
].join('\n');
const PEDIDO = {
  id: CODIGO, status: 'PENDING', eventTitle: 'Aniversário', location: 'Sítio em Betim',
  eventDate: '2027-04-18T23:00:00.000Z', eventEndDate: '2027-04-19T03:00:00.000Z',
  street: 'Rua A', addressNumber: '10', neighborhood: 'Centro', city: 'Betim', state: 'MG', zipCode: '32600-000',
  clientId: null, client: null, clientName: 'Bia Souza', clientContact: '31955554444', clientEmail: 'bia@cliente.test',
  specialRequests: BRIEFING, items: [], contractSummary: null,
};
const SERVICOS = [
  { id: 'svc-dj', name: 'DJ Profissional', price: '300.00', duration: 240, status: 'ACTIVE' },
  { id: 'svc-luz', name: 'Operador de Luz', price: '700.00', duration: 240, status: 'ACTIVE' },
];
const OUTRAS = [
  { id: 'XP-DANIEL-1', eventDate: '2027-04-18T23:30:00.000Z', eventEndDate: '2027-04-19T02:00:00.000Z', status: 'CONFIRMED', clientName: 'Daniel' },
  { id: 'XP-CANCELADA', eventDate: '2027-04-18T23:30:00.000Z', eventEndDate: '2027-04-19T02:00:00.000Z', status: 'CANCELLED', clientName: 'Edu' },
  { id: CODIGO, eventDate: PEDIDO.eventDate, eventEndDate: PEDIDO.eventEndDate, status: 'PENDING', clientName: 'Bia Souza' },
];

const renderPage = () => {
  apiFetch.mockImplementation((path: string, opts?: { method?: string }) => {
    if (path === `/bookings/${encodeURIComponent(CODIGO)}` && !opts?.method) return Promise.resolve(PEDIDO);
    if (path === `/bookings/${encodeURIComponent(CODIGO)}` && opts?.method === 'PUT') return Promise.resolve({ id: CODIGO });
    if (path.startsWith('/bookings?startDate=')) return Promise.resolve(OUTRAS);
    if (path === '/services') return Promise.resolve(SERVICOS);
    return Promise.resolve([]);
  });
  render(
    <MemoryRouter initialEntries={[`/admin/orcamentos/novo?reserva=${encodeURIComponent(CODIGO)}`]}>
      <Routes>
        <Route path="/admin/orcamentos/novo" element={<AdminQuickProposalPage />} />
        <Route path="/admin/reservas/:id" element={<p>Página da reserva</p>} />
      </Routes>
    </MemoryRouter>,
  );
};
const adicionarServicos = async () => {
  fireEvent.click(await screen.findByRole('button', { name: 'Serviços' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Adicionar DJ Profissional' }));
  fireEvent.click(screen.getByRole('button', { name: 'Adicionar Operador de Luz' }));
};
const subtotal = () => screen.getByText('Subtotal estimado').nextElementSibling?.textContent?.replace(/\s/g, ' ');
const fecharEm = (valor: string) => {
  fireEvent.change(screen.getByLabelText('Fechar no valor'), { target: { value: valor } });
  fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }));
};
const quadro = () => screen.getByRole('heading', { name: /Conferência antes de enviar/ }).parentElement as HTMLElement;

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  useAuth.mockReturnValue({ user: { id: 'a1', name: 'Admin', role: 'ADMIN' } });
});

describe('Proposta Rápida — "Fechar no valor"', { timeout: 20000 }, () => {
  it('digitar o total divide o desconto entre os itens, a soma fecha no centavo e é o que vai para a reserva', async () => {
    renderPage();
    await adicionarServicos();
    await waitFor(() => expect(subtotal()).toMatch(/1\.000,00/));
    fecharEm('750');
    await waitFor(() => expect(subtotal()).toMatch(/750,00/));
    expect(screen.getByText(/Desconto R\$\s*75,00 · item R\$\s*225,00/)).toBeInTheDocument();
    expect(screen.getByText(/Desconto R\$\s*175,00 · item R\$\s*525,00/)).toBeInTheDocument();
    expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'success', title: 'Total fechado' }));

    fireEvent.click(screen.getByRole('button', { name: 'Salvar na reserva' }));
    await waitFor(() => expect(apiFetch.mock.calls.some((c) => c[1]?.method === 'PUT')).toBe(true));
    const corpo = JSON.parse(apiFetch.mock.calls.find((c) => c[1]?.method === 'PUT')![1].body as string);
    const soma = corpo.items.reduce((s: number, i: { totalPrice: number }) => s + i.totalPrice, 0);
    expect(Math.round(soma * 100)).toBe(75000);
    expect(corpo.items).toEqual([
      expect.objectContaining({ serviceId: 'svc-dj', unitPrice: 300, discount: 75, totalPrice: 225 }),
      expect.objectContaining({ serviceId: 'svc-luz', unitPrice: 700, discount: 175, totalPrice: 525 }),
    ]);
  });

  it('"Tirar desconto" volta ao preço de tabela; valor inválido ou acima da tabela é recusado', async () => {
    renderPage();
    await adicionarServicos();
    fecharEm('100reias');
    expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'error', title: 'Valor inválido' }));
    fecharEm('1.500');
    expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'warning', message: expect.stringContaining('passa do preço de tabela') }));

    fecharEm('900');
    await waitFor(() => expect(subtotal()).toMatch(/900,00/));
    fireEvent.click(screen.getByRole('button', { name: 'Tirar desconto' }));
    await waitFor(() => expect(subtotal()).toMatch(/1\.000,00/));
    expect(screen.queryByText(/^Desconto R\$/)).not.toBeInTheDocument();
  });
});

describe('Proposta Rápida — conferência antes de enviar', { timeout: 20000 }, () => {
  it('mostra o que falta no briefing e a outra reserva no mesmo horário (sem a cancelada nem a própria)', async () => {
    renderPage();
    await adicionarServicos();
    const conferencia = within(await waitFor(() => quadro()));
    expect(await conferencia.findByText(/Outra reserva no mesmo horário: XP-DANIEL-1, Daniel/)).toBeInTheDocument();
    expect(conferencia.getByText('Tensão da tomada (110V ou 220V) a confirmar com o cliente.')).toBeInTheDocument();
    expect(conferencia.getByText('A banda tem rider técnico: peça o rider antes do evento.')).toBeInTheDocument();
    expect(conferencia.queryByText(/XP-CANCELADA/)).not.toBeInTheDocument();
    expect(conferencia.queryByText(new RegExp(`${CODIGO},`))).not.toBeInTheDocument();
    expect(apiFetch.mock.calls.some((c) => String(c[0]).startsWith('/bookings?startDate='))).toBe(true);
  });

  it('desconto de mais da metade vira alerta de valor suspeito', async () => {
    renderPage();
    await adicionarServicos();
    fecharEm('300');
    expect(await within(quadro()).findByText('Desconto de 70% sobre o preço de tabela: confira se o valor está certo.')).toBeInTheDocument();
  });
});
