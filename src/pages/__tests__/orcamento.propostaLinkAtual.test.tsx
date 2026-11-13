import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

// Auditoria do orçamento (12/11/2026), decisão da dona de 12/11 (o link da proposta mostra sempre a reserva atual):
// - O21/D9: na página pública da proposta e na área do cliente, "Frete a combinar" e "Pedágio à parte" aparecem como
//   "a combinar"/"à parte" (nunca R$ 0,00), com a frase de que o total não os inclui.
// - O11/D6: a área do cliente mostra "Proposta vencida — peça uma nova" e a validade; a página pública, com o link
//   vencido (410), diz que o link venceu.
const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock('@/services/api', () => ({ apiFetch }));
vi.mock('../../services/api', () => ({ apiFetch }));
vi.mock('react-ga4', () => ({ default: { event: vi.fn(), initialize: vi.fn(), send: vi.fn(), set: vi.fn() } }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1', role: 'CLIENT' } }) }));
vi.mock('../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));
vi.mock('../../components/client/BookingChatPanel', () => ({ BookingChatPanel: () => null }));
vi.mock('../../utils/generateBookingProposalPdf', () => ({ generateBookingProposalPdf: vi.fn() }));

import PublicProposalPage from '../PublicProposalPage';
import { BookingDetailsPage } from '../client/BookingDetailsPage';

const texto = () => (document.body.textContent ?? '').replace(/\s/g, ' ');

const linhas = [
  { description: 'Kit Som (4 h incluídas)', quantity: 1, total: 650 },
  { description: 'Frete a combinar', quantity: 1, total: 0, toArrange: 'freight' },
  { description: 'Pedágio à parte', quantity: 1, total: 0, toArrange: 'toll' },
];

const abrirProposta = (resposta: Promise<unknown>) => {
  apiFetch.mockReturnValue(resposta);
  window.history.replaceState(null, '', '/proposta#token=p1.TESTE');
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={['/proposta']}>
        <Routes><Route path="/proposta" element={<PublicProposalPage />} /></Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );
};

const abrirReserva = (reserva: Record<string, unknown>) => {
  apiFetch.mockResolvedValue({
    id: 'XP-ANA-1', status: 'PENDING', eventDate: '2027-12-21T01:00:00.000Z', totalPrice: '650',
    attachments: [], eventCollaborators: [], ...reserva,
  });
  return render(
    <MemoryRouter initialEntries={['/cliente/reservas/XP-ANA-1']}>
      <Routes><Route path="/cliente/reservas/:id" element={<BookingDetailsPage />} /></Routes>
    </MemoryRouter>,
  );
};

beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  window.history.replaceState(null, '', '/');
  document.head.innerHTML = '';
});

describe('página pública da proposta', () => {
  it('O21/D9: "a combinar" e "à parte" no lugar de R$ 0,00, e a frase do total', async () => {
    abrirProposta(Promise.resolve({
      state: 'open', eventTitle: 'Formatura da Ana', eventDate: '2027-12-21T01:00:00.000Z', eventEndDate: '2027-12-21T05:00:00.000Z',
      city: 'Belo Horizonte', neighborhood: 'Savassi', validUntil: '2027-12-15T02:59:59.999Z',
      pricing: { lines: linhas, discount: null, adjustment: 0, total: 650 },
    }));

    await screen.findByRole('heading', { name: 'Formatura da Ana' });
    const itens = screen.getByRole('list', { name: 'Itens da proposta' });
    expect(itens.textContent).toContain('Frete a combinara combinar');
    expect(itens.textContent).toContain('Pedágio à parteà parte');
    expect(itens.textContent?.replace(/\s/g, ' ')).not.toContain('R$ 0,00');
    expect(screen.getByText('O frete (a combinar) e o pedágio (à parte) não estão no total.')).toBeInTheDocument();
  });

  it('sem linha a combinar: nenhuma frase de frete', async () => {
    abrirProposta(Promise.resolve({
      state: 'open', eventTitle: 'Formatura da Ana', eventDate: '2027-12-21T01:00:00.000Z', eventEndDate: '2027-12-21T05:00:00.000Z',
      city: null, neighborhood: null, validUntil: '2027-12-15T02:59:59.999Z',
      pricing: { lines: [linhas[0]], discount: null, adjustment: 0, total: 650 },
    }));

    await screen.findByRole('heading', { name: 'Formatura da Ana' });
    expect(texto()).not.toMatch(/não estão? no total/);
  });

  it('O11/D6: link vencido (410): "Este link venceu ou foi trocado. Peça um novo link à equipe."', async () => {
    abrirProposta(Promise.reject(Object.assign(new Error('falhou'), { status: 410 })));

    expect(await screen.findByText('Este link venceu ou foi trocado. Peça um novo link à equipe.')).toBeInTheDocument();
  });
});

describe('área do cliente (página da reserva)', () => {
  it('O11/D6: proposta vencida: "Proposta vencida — peça uma nova" e a data em que acabou', async () => {
    abrirReserva({ proposal: { sentAt: '2027-12-08T13:30:00.000Z', validUntil: '2027-12-15T02:59:59.999Z', expired: true } });

    expect(await screen.findByText('Proposta vencida — peça uma nova')).toBeInTheDocument();
    expect(screen.queryByText('Proposta enviada — aguardando sua resposta')).toBeNull();
    expect(screen.getByText('A validade da proposta acabou em 14/12/2027. Fale com a equipe para receber uma nova.')).toBeInTheDocument();
  });

  it('O11/D6: proposta ainda valendo: "aguardando sua resposta" e "Proposta válida até"', async () => {
    abrirReserva({ proposal: { sentAt: '2027-12-08T13:30:00.000Z', validUntil: '2999-12-15T02:59:59.999Z', expired: false } });

    expect(await screen.findByText('Proposta enviada — aguardando sua resposta')).toBeInTheDocument();
    expect(screen.getByText('Proposta válida até 14/12/2999.')).toBeInTheDocument();
  });

  it('O21/D9: o resumo financeiro mostra "a combinar"/"à parte" e a frase do total', async () => {
    abrirReserva({
      pricing: {
        lines: linhas.map((l) => ({ ...l, unitPrice: l.total, discount: 0, type: l.toArrange ? 'CUSTOM' : 'KIT', equipmentId: null, serviceId: null, kitId: null })),
        itemsSubtotal: 650, couponDiscount: null, adjustment: 0, total: 650,
      },
    });

    const itens = await screen.findByRole('list', { name: 'Itens da proposta' });
    expect(itens.textContent).toContain('Frete a combinara combinar');
    expect(itens.textContent).toContain('Pedágio à parteà parte');
    expect(itens.textContent?.replace(/\s/g, ' ')).not.toContain('R$ 0,00');
    expect(screen.getByText('O frete (a combinar) e o pedágio (à parte) não estão no total.')).toBeInTheDocument();
  });
});
