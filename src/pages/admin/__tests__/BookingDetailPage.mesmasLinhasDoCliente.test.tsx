import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const { bookingAPI, apiFetch, usuario } = vi.hoisted(() => ({
  bookingAPI: {
    getById: vi.fn(), updateStatus: vi.fn(), updateDeliveryStatus: vi.fn(), delete: vi.fn(), confirmWithDetails: vi.fn(),
    sendProposal: vi.fn(), getAuditHistory: vi.fn(),
  },
  apiFetch: vi.fn(),
  usuario: { id: 'a1', name: 'Admin', role: 'ADMIN' },
}));
vi.mock('../../../services/api', () => ({ bookingAPI, api: { post: vi.fn(), delete: vi.fn() }, apiFetch }));
vi.mock('@/services/api', () => ({ bookingAPI, api: { post: vi.fn(), delete: vi.fn() }, apiFetch }));
vi.mock('../../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: usuario }) }));
vi.mock('@/hooks/useCollaborators', () => ({ useCollaborators: () => ({ collaborators: [], fetchCollaborators: vi.fn().mockResolvedValue(undefined) }) }));
vi.mock('@/components/forms/AdminBookingForm', () => ({ AdminBookingForm: () => null }));
vi.mock('@/components/bookings/BookingCollaborators', () => ({ BookingCollaborators: () => null }));
vi.mock('@/components/bookings/BookingFinancialSummary', () => ({ BookingFinancialSummary: () => null }));
vi.mock('../../../components/modals/EventManagement', () => ({ EventManagement: () => null }));
vi.mock('../../../components/client/BookingChatPanel', () => ({ BookingChatPanel: () => null }));
vi.mock('react-ga4', () => ({ default: { event: vi.fn() } }));

import BookingDetailPage from '../BookingDetailPage';
import { BookingDetailsPage } from '../../client/BookingDetailsPage';

// Auditoria do orçamento (12/11/2026), O14/C4: o cartão "Valor da reserva" da ficha mostra as mesmas linhas que o
// cliente vê. Aqui a MESMA reserva (kit, frete, pedágio ou frete a combinar, equipamento em dobro, cupom e ajuste) é
// aberta na ficha do painel e na página do cliente, e o que as duas escrevem é comparado linha a linha: com o pricing
// que a API manda e sem ele (a conta do site, durante o deploy).
const BASE = {
  id: 'XP-CARLA-20270110', status: 'PENDING', deliveryStatus: 'PENDING',
  eventDate: '2027-01-10T21:00:00.000Z', eventEndDate: '2027-01-11T02:00:00.000Z', location: 'Sítio Bela Vista',
  clientId: 'cli-1', client: { id: 'cli-1', phone: '31955554444', user: { id: 'u1', name: 'Carla Dias', email: 'carla@cliente.test' } },
  clientName: null, clientContact: '(31) 98888-7777', clientEmail: null,
  attachments: [], services: [], equipments: [], eventCollaborators: [],
  kit: { id: 'kit5', name: 'Kit 05', price: 1200, items: [] },
  coupon: { code: 'AMIGO10' },
  proposal: { sentAt: null },
};

const linha = (description: string, total: number, extra: object = {}) => ({
  description, quantity: 1, unitPrice: total, discount: 0, total, type: 'CUSTOM', equipmentId: null, serviceId: null, kitId: null, ...extra,
});

// Com o pricing da API: o servidor marca o pedágio sem preço (toArrange).
const COM_PRICING = {
  ...BASE, totalPrice: '1800.00', discountAmount: '130.00',
  pricing: {
    lines: [
      linha('Kit 05 (4 h incluídas + 1 hora extra de R$ 100,00)', 1300, { type: 'KIT', kitId: 'kit5' }),
      linha('Caixa ativa 15 pol (1 diária)', 300, { quantity: 2, unitPrice: 150, type: 'EQUIPMENT', equipmentId: 'eq1' }),
      linha('Frete (32 km por trecho; até 15 km incluso no kit)', 240),
      linha('Pedágio à parte', 0, { toArrange: 'toll' }),
    ],
    itemsSubtotal: 1840,
    couponDiscount: { amount: 130, code: 'AMIGO10' },
    adjustment: 90,
    total: 1800,
  },
};

// Sem o pricing (resposta antiga): a conta do site pelos itens gravados, com frete a combinar e ajuste para baixo.
const SEM_PRICING = {
  ...BASE, totalPrice: '1300.00', discountAmount: '130.00', pricing: undefined,
  items: [
    { description: 'Kit 05 (4 h incluídas)', quantity: 1, unitPrice: '1200.00', discount: '0.00', totalPrice: '1200.00', itemType: 'KIT', kitId: 'kit5' },
    { description: 'Caixa ativa 15 pol (1 diária)', quantity: 2, unitPrice: '150.00', discount: '0.00', totalPrice: '300.00', itemType: 'EQUIPMENT', equipmentId: 'eq1' },
    { description: 'Frete a combinar', quantity: 1, unitPrice: '0.00', discount: '0.00', totalPrice: '0.00', itemType: 'CUSTOM' },
  ],
};

const texto = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

/** O que um resumo de preço escreve: as linhas, o desconto, o ajuste, o total e a frase do "a combinar". */
const leResumo = (bloco: HTMLElement, rotuloDaLista: string) => {
  const area = within(bloco);
  const linha = (rotulo: RegExp) => texto(area.queryByText(rotulo)?.parentElement);
  return {
    linhas: within(area.getByRole('list', { name: rotuloDaLista })).getAllByRole('listitem').map(texto),
    desconto: linha(/^Desconto/),
    ajuste: linha(/^Ajuste no valor final/),
    total: linha(/^Total:$/),
    nota: texto(area.queryByText(/não (está|estão) no total/)),
  };
};

const naFicha = async (reserva: object) => {
  usuario.role = 'ADMIN';
  bookingAPI.getById.mockResolvedValue({ data: reserva });
  const view = render(
    <MemoryRouter initialEntries={['/admin/reservas/XP']}>
      <Routes><Route path="/admin/reservas/:id" element={<BookingDetailPage />} /></Routes>
    </MemoryRouter>,
  );
  await screen.findByRole('heading', { name: /^Reserva / });
  const resumo = leResumo(screen.getByText('Valor da reserva').closest('.overflow-hidden') as HTMLElement, 'Linhas da proposta');
  view.unmount();
  return resumo;
};

const naPaginaDoCliente = async (reserva: object) => {
  usuario.role = 'CLIENT';
  apiFetch.mockImplementation(async (url: string) => (url === `/bookings/${BASE.id}` ? reserva : {}));
  const view = render(
    <MemoryRouter initialEntries={[`/cliente/reservas/${BASE.id}`]}>
      <Routes><Route path="/cliente/reservas/:id" element={<BookingDetailsPage />} /></Routes>
    </MemoryRouter>,
  );
  const titulo = await screen.findByRole('heading', { name: 'Resumo Financeiro' });
  const resumo = leResumo(titulo.parentElement as HTMLElement, 'Itens da proposta');
  view.unmount();
  return resumo;
};

describe('Ficha do painel e página do cliente — as mesmas linhas para a mesma reserva (O14/C4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    bookingAPI.getAuditHistory.mockResolvedValue({ data: [] });
    apiFetch.mockResolvedValue({});
  });

  it('com o pricing da API: kit, 2× equipamento, frete, pedágio à parte, cupom e ajuste iguais nas duas telas', async () => {
    const ficha = await naFicha(COM_PRICING);
    const cliente = await naPaginaDoCliente(COM_PRICING);

    expect(ficha).toEqual(cliente);
    expect(ficha.linhas).toHaveLength(4);
    expect(ficha.linhas[1]).toMatch(/^2× Caixa ativa 15 pol \(1 diária\)R\$ 300,00$/);
    expect(ficha.linhas[3]).toBe('Pedágio à parteà parte');
    expect(ficha.desconto).toMatch(/^Desconto \(AMIGO10\):− R\$ 130,00$/);
    expect(ficha.ajuste).toMatch(/^Ajuste no valor final:\+ R\$ 90,00$/);
    expect(ficha.total).toMatch(/^Total:R\$ 1\.800,00$/);
    expect(ficha.nota).toBe('O pedágio é cobrado à parte e não está no total.');
  });

  it('sem o pricing (conta do site pelos itens): frete a combinar, cupom e ajuste para baixo iguais nas duas telas', async () => {
    const ficha = await naFicha(SEM_PRICING);
    const cliente = await naPaginaDoCliente(SEM_PRICING);

    expect(ficha).toEqual(cliente);
    expect(ficha.linhas).toEqual([
      expect.stringMatching(/^Kit 05 \(4 h incluídas\)R\$ 1\.200,00$/),
      expect.stringMatching(/^2× Caixa ativa 15 pol \(1 diária\)R\$ 300,00$/),
      'Frete a combinara combinar',
    ]);
    expect(ficha.desconto).toMatch(/^Desconto \(AMIGO10\):− R\$ 130,00$/);
    expect(ficha.ajuste).toMatch(/^Ajuste no valor final:− R\$ 70,00$/);
    expect(ficha.total).toMatch(/^Total:R\$ 1\.300,00$/);
    expect(ficha.nota).toBe('O frete ainda vai ser combinado com a equipe e não está no total.');
  });
});
