import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// Aceite online (13/11/2026): a ficha do painel ganha o cartão "Contrato" quando a reserva tem contrato
// (contractSummary): GET /admin/bookings/:id/contract com quem aceitou, finalidade, documento (mascarado; o completo a
// pedido), data e hora, IP, navegador, impressão digital, vencimentos e a trilha do aceite; "Baixar contrato (PDF)" e
// "Reenviar e-mail do contrato". Só para admin.
const { bookingAPI, api, apiFetch, quotePdfAPI, contractAPI, addNotification, role } = vi.hoisted(() => ({
  bookingAPI: { getById: vi.fn(), updateStatus: vi.fn(), updateDeliveryStatus: vi.fn(), delete: vi.fn(), confirmWithDetails: vi.fn() },
  api: { post: vi.fn(), delete: vi.fn() },
  apiFetch: vi.fn(),
  quotePdfAPI: { forAdmin: vi.fn() },
  contractAPI: { forAdmin: vi.fn(), downloadForAdmin: vi.fn(), resend: vi.fn() },
  addNotification: vi.fn(),
  role: { current: 'ADMIN' },
}));
vi.mock('../../../services/api', () => ({ bookingAPI, api, apiFetch, quotePdfAPI, contractAPI }));
vi.mock('../../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'a1', name: 'Admin', role: role.current } }) }));
vi.mock('@/hooks/useCollaborators', () => ({ useCollaborators: () => ({ collaborators: [], fetchCollaborators: vi.fn().mockResolvedValue(undefined) }) }));
vi.mock('@/components/forms/AdminBookingForm', () => ({ AdminBookingForm: () => null }));
vi.mock('@/components/bookings/BookingCollaborators', () => ({ BookingCollaborators: () => null }));
vi.mock('@/components/bookings/BookingFinancialSummary', () => ({ BookingFinancialSummary: () => null }));
vi.mock('../../../components/modals/EventManagement', () => ({ EventManagement: () => null }));
vi.mock('react-ga4', () => ({ default: { event: vi.fn() } }));

import BookingDetailPage from '../BookingDetailPage';

const SHA = '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08';
const RESERVA = {
  id: 'XP-ANA-20271220', status: 'PENDING', deliveryStatus: 'PENDING', totalPrice: '1800.00',
  eventDate: '2027-12-21T01:00:00.000Z', eventEndDate: '2027-12-21T07:00:00.000Z', location: 'Espaço VIP',
  clientId: null, client: null, clientName: 'Ana Souza', clientContact: '31988887777', clientEmail: 'ana@cliente.test',
  attachments: [], equipments: [], services: [], eventCollaborators: [],
};
const RESUMO = { state: 'ACCEPTED', acceptedAt: '2027-11-30T13:00:00.000Z', withdrawUntil: null };
// Os nomes combinados com o servidor (state, templateVersion, sha256, acceptedAt, withdrawnAt, withdrawReason, ip,
// userAgent, otpEmail, purpose, party, initialPayment, balance, events); o documento vem com a pontuação.
const META = {
  state: 'ACCEPTED',
  purpose: 'RESALE',
  templateVersion: '2026-11-13',
  sha256: SHA,
  acceptedAt: '2027-11-30T13:00:00.000Z',
  withdrawUntil: null,
  withdrawnAt: null,
  withdrawReason: null,
  ip: '203.0.113.7',
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Safari/604.1',
  otpEmail: 'contato@produtora.test',
  party: {
    personType: 'PJ',
    name: 'Produtora Exemplo Ltda',
    document: '11.222.333/0001-81',
    email: 'contato@produtora.test',
    phone: '31988887777',
    address: { street: 'Rua A', number: '10', neighborhood: 'Savassi', city: 'Belo Horizonte', state: 'MG', zipCode: '30140000' },
    representative: { name: 'Bruno Lima', cpf: '111.444.777-35', role: 'Sócio' },
  },
  initialPayment: { amount: 900, dueDate: '2027-12-03T02:59:59.999Z' },
  balance: { amount: 900, dueDate: '2027-12-19T01:00:00.000Z' },
  events: [
    { type: 'GENERATED', createdAt: '2027-11-30T12:50:00.000Z' },
    { type: 'OTP_SENT', createdAt: '2027-11-30T12:50:05.000Z' },
    { type: 'OTP_REJECTED', createdAt: '2027-11-30T12:55:00.000Z' },
    { type: 'OTP_VERIFIED', createdAt: '2027-11-30T13:00:00.000Z' },
    { type: 'ACCEPTED', createdAt: '2027-11-30T13:00:00.000Z' },
    { type: 'EMAIL_SENT', createdAt: '2027-11-30T13:00:10.000Z' },
  ],
};

const renderFicha = async (reserva: object) => {
  bookingAPI.getById.mockResolvedValue({ data: reserva });
  const utils = render(
    <MemoryRouter initialEntries={['/admin/reservas/XP']}>
      <Routes>
        <Route path="/admin/reservas/:id" element={<BookingDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
  await screen.findByRole('heading', { name: /^Reserva / });
  return utils;
};
const cartao = async () => {
  const titulo = await screen.findByRole('heading', { name: 'Contrato' });
  await screen.findByText('Trilha do aceite');
  return titulo.closest('div.rounded-lg') as HTMLElement;
};
const textoDe = (el: HTMLElement) => (el.textContent ?? '').replace(/\s+/g, ' ');

describe('BookingDetailPage (admin) — cartão Contrato', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    role.current = 'ADMIN';
    contractAPI.forAdmin.mockResolvedValue(META);
  });

  it('quem aceitou, finalidade, documento mascarado (completo a pedido), data, IP, navegador, impressão digital, vencimentos e trilha', async () => {
    await renderFicha({ ...RESERVA, contractSummary: RESUMO });
    const card = await cartao();
    expect(contractAPI.forAdmin).toHaveBeenCalledWith('XP-ANA-20271220');

    const t = textoDe(card);
    expect(t).toContain('Aceito');
    expect(t).toContain('ContratanteProdutora Exemplo Ltda');
    expect(t).toContain('TipoPessoa jurídica');
    expect(t).toContain('Quem aceitouBruno Lima, Sócio (CPF ***.444.777-**)');
    expect(t).toContain('FinalidadeRevenda ou produção do evento de outra pessoa (revendedor)');
    expect(t).toContain('E-mail do códigocontato@produtora.test');
    expect(t).toContain('Aceito em30/11/2027 às 10:00 (Brasília)');
    expect(t).toContain('IP203.0.113.7');
    expect(t).toContain('NavegadorMozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Safari/604.1');
    expect(t).toContain('Versão do modelo2026-11-13');
    expect(t).toContain(SHA);
    expect(t).toContain('Parcela inicialR$ 900,00 até 02/12/2027');
    expect(t).toContain('SaldoR$ 900,00 até 18/12/2027 às 22:00');
    // Documento: mascarado na tela; o completo só a pedido.
    expect(t).toContain('CNPJ11.222.***/****-81');
    expect(t).not.toContain('11.222.333/0001-81');
    const mostrar = within(card).getByRole('button', { name: 'Mostrar completo' });
    expect(mostrar).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(mostrar);
    expect(textoDe(card)).toContain('11.222.333/0001-81');
    expect(textoDe(card)).toContain('CPF 111.444.777-35');
    expect(within(card).getByRole('button', { name: 'Ocultar' })).toHaveAttribute('aria-pressed', 'true');

    const trilha = within(card).getByRole('list');
    expect(within(trilha).getAllByRole('listitem').map((li) => textoDe(li))).toEqual([
      'Contrato gerado30/11/2027 às 09:50',
      'Código enviado30/11/2027 às 09:50',
      'Código recusado30/11/2027 às 09:55',
      'Código conferido30/11/2027 às 10:00',
      'Aceito30/11/2027 às 10:00',
      'E-mail do contrato enviado30/11/2027 às 10:00',
    ]);
  });

  it('"Baixar contrato (PDF)" e "Reenviar e-mail do contrato"', async () => {
    contractAPI.downloadForAdmin.mockResolvedValue(undefined);
    contractAPI.resend.mockResolvedValueOnce({ queued: true }).mockRejectedValueOnce(new Error('O contrato ainda não foi aceito.'));
    await renderFicha({ ...RESERVA, contractSummary: RESUMO });
    const card = await cartao();

    fireEvent.click(within(card).getByRole('button', { name: 'Baixar contrato (PDF)' }));
    await waitFor(() => expect(contractAPI.downloadForAdmin).toHaveBeenCalledWith('XP-ANA-20271220'));

    fireEvent.click(within(card).getByRole('button', { name: 'Reenviar e-mail do contrato' }));
    await waitFor(() => expect(contractAPI.resend).toHaveBeenCalledWith('XP-ANA-20271220'));
    await waitFor(() => expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'success', title: 'E-mail reenviado' })));

    await waitFor(() => expect(within(card).getByRole('button', { name: 'Reenviar e-mail do contrato' })).toBeEnabled());
    fireEvent.click(within(card).getByRole('button', { name: 'Reenviar e-mail do contrato' }));
    await waitFor(() =>
      expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'error', message: 'O contrato ainda não foi aceito.' })),
    );
  });

  it('desistência: data e motivo, sem reenvio; sem contrato ou sem ser admin, nada do cartão', async () => {
    contractAPI.forAdmin.mockResolvedValue({
      ...META,
      state: 'WITHDRAWN',
      withdrawnAt: '2027-12-01T15:00:00.000Z',
      withdrawReason: 'Desistência no prazo de 7 dias',
      events: [...META.events, { type: 'WITHDRAWN', createdAt: '2027-12-01T15:00:00.000Z' }],
    });
    const desistida = await renderFicha({ ...RESERVA, status: 'CANCELLED', contractSummary: { ...RESUMO, state: 'WITHDRAWN' } });
    const card = await cartao();
    expect(textoDe(card)).toContain('Desistência registrada');
    expect(textoDe(card)).toContain('Desistência01/12/2027 às 12:00 (Desistência no prazo de 7 dias)');
    expect(textoDe(card)).toContain('Desistiu01/12/2027 às 12:00');
    expect(within(card).getByRole('button', { name: 'Baixar contrato (PDF)' })).toBeInTheDocument();
    expect(within(card).queryByRole('button', { name: 'Reenviar e-mail do contrato' })).not.toBeInTheDocument();
    desistida.unmount();
    contractAPI.forAdmin.mockClear();

    const semContrato = await renderFicha({ ...RESERVA, contractSummary: null });
    expect(screen.queryByRole('heading', { name: 'Contrato' })).not.toBeInTheDocument();
    semContrato.unmount();

    role.current = 'COLLABORATOR';
    await renderFicha({ ...RESERVA, contractSummary: RESUMO });
    expect(screen.queryByRole('heading', { name: 'Contrato' })).not.toBeInTheDocument();
    expect(contractAPI.forAdmin).not.toHaveBeenCalled();
  });
});
