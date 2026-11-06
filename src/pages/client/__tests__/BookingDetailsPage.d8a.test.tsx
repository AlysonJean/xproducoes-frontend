import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock('../../../services/api', () => ({ apiFetch }));
vi.mock('@/services/api', () => ({ apiFetch }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1', role: 'CLIENT' } }) }));
vi.mock('../../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));
vi.mock('../../../components/client/BookingChatPanel', () => ({ BookingChatPanel: () => null }));
vi.mock('../../../utils/generateBookingProposalPdf', () => ({ generateBookingProposalPdf: vi.fn() }));
vi.mock('react-ga4', () => ({ default: { event: vi.fn() } }));

import { BookingDetailsPage } from '../BookingDetailsPage';
import { formatPrice } from '../../../utils/formatPrice';

// O texto da tela é comparado com os espaços normalizados (o R$ do Intl vem com espaço não separável).
const brl = (n: number) => formatPrice(n).replace(/\s/g, ' ');

const renderPage = async (reserva: object) => {
  apiFetch.mockResolvedValue(reserva);
  render(
    <MemoryRouter initialEntries={['/cliente/reservas/XP-1']}>
      <Routes>
        <Route path="/cliente/reservas/:id" element={<BookingDetailsPage />} />
      </Routes>
    </MemoryRouter>,
  );
  await screen.findByText('Resumo Financeiro');
  return screen.getByText('Resumo Financeiro').closest('div') as HTMLElement;
};

const base = { id: 'XP-1', status: 'CONFIRMED', eventDate: '2026-12-10T22:00:00.000Z', attachments: [], eventCollaborators: [] };

// D8a e P16 (aprovadas em 02/11/2026): a página do cliente mostrava "Equipamentos" (totalPrice) e "Serviços"
// (serviceValue) e somava os dois como texto — o valor chega do banco como "1500.00" — e aparecia
// R$ 15.001.500,00. Agora: as linhas da proposta, o desconto, o ajuste e um Total só, o da API.
describe('BookingDetailsPage (cliente) — um Total só (D8a)', () => {
  beforeEach(() => apiFetch.mockReset());

  it('totalPrice e um serviceValue antigo na resposta: mostra R$ 1.500,00 uma vez, sem somar nem juntar texto', async () => {
    const resumo = await renderPage({ ...base, totalPrice: '1500.00', serviceValue: '1500.00' });

    expect(within(resumo).getByText(brl(1500))).toBeInTheDocument();
    expect(screen.queryByText(/15\.001\.500/)).not.toBeInTheDocument();
    expect(screen.queryByText(/3\.000,00/)).not.toBeInTheDocument();
    expect(within(resumo).queryByText('Serviços:')).not.toBeInTheDocument();
    expect(within(resumo).queryByText('Equipamentos:')).not.toBeInTheDocument();
  });

  it('com o resumo da API: linhas (frete de BH a R$ 0 inclusive), desconto do cupom e o Total da API', async () => {
    const resumo = await renderPage({
      ...base,
      totalPrice: '1350.00',
      equipments: [{ id: 'eq1', name: 'Mesa de Som', pricePerHour: 50 }],
      pricing: {
        lines: [
          { description: 'Mesa de Som (5 h)', quantity: 1, unitPrice: 1200, discount: 0, total: 1200, type: 'EQUIPMENT', equipmentId: 'eq1', serviceId: null, kitId: null },
          { description: 'Técnico', quantity: 1, unitPrice: 300, discount: 0, total: 300, type: 'CUSTOM', equipmentId: null, serviceId: null, kitId: null },
          { description: 'Frete (dentro de BH)', quantity: 1, unitPrice: 0, discount: 0, total: 0, type: 'CUSTOM', equipmentId: null, serviceId: null, kitId: null },
        ],
        itemsSubtotal: 1500,
        couponDiscount: { amount: 150, code: 'PROMO' },
        adjustment: 0,
        total: 1350,
      },
    });

    const itens = within(resumo).getByRole('list', { name: 'Itens da proposta' });
    expect(within(itens).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      `Mesa de Som (5 h)${formatPrice(1200)}`,
      `Técnico${formatPrice(300)}`,
      `Frete (dentro de BH)${formatPrice(0)}`,
    ]);
    expect(within(resumo).getByText('Desconto (PROMO):')).toBeInTheDocument();
    expect(within(resumo).getByText(brl(1350))).toBeInTheDocument();
    expect(within(resumo).queryByText('Ajuste no valor final:')).not.toBeInTheDocument();
    // Com as linhas gravadas, o card de itens não mostra o preço de hoje do catálogo.
    expect(screen.queryByText(`${brl(50)}/h`)).not.toBeInTheDocument();
  });

  it('valor final diferente da soma dos itens: o ajuste aparece e o Total é o valor final', async () => {
    const resumo = await renderPage({
      ...base,
      totalPrice: '2000.00',
      items: [{ description: 'Kit Festa (6 h)', quantity: 1, unitPrice: '720.00', discount: null, totalPrice: '720.00', itemType: 'KIT' }],
    });

    expect(within(resumo).getByText('Ajuste no valor final:')).toBeInTheDocument();
    expect(within(resumo).getByText(`+ ${brl(1280)}`)).toBeInTheDocument();
    expect(within(resumo).getByText(brl(2000))).toBeInTheDocument();
  });

  it('reserva antiga sem itens gravados: os itens só com o nome ("Incluído no Total"), sem o preço de hoje do catálogo', async () => {
    await renderPage({
      ...base,
      totalPrice: '900.00',
      equipments: [{ id: 'eq1', name: 'Mesa de Som', pricePerHour: 50 }],
      services: [{ id: 'sv1', name: 'Montagem', price: 200 }],
    });

    expect(screen.getAllByText('Incluído no Total')).toHaveLength(2);
    expect(screen.queryByText(`${brl(50)}/h`)).not.toBeInTheDocument();
    expect(screen.queryByText(brl(200))).not.toBeInTheDocument();
    expect(screen.getByText(brl(900))).toBeInTheDocument();
  });

  it('pedido ainda sem valor: Total "Em preparação"', async () => {
    const resumo = await renderPage({ ...base, status: 'PENDING', totalPrice: '0' });
    expect(within(resumo).getByText('Em preparação')).toBeInTheDocument();
  });
});
