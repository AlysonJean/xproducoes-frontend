import type React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

// Onda 3 da auditoria do status da reserva (22/11/2026):
// - M10: o card "A receber" do painel (sem pagamento registrado e só com o sinal) leva à lista já filtrada;
// - a área do cliente mostra as etapas da reserva e o próximo passo (clientJourney, ClientBookingJourney).
const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock('../../../services/api', () => ({ apiFetch }));
vi.mock('@/services/api', () => ({ apiFetch }));
vi.mock('../../../components/admin/AdminLayout', () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { name: 'Admin Teste', role: 'ADMIN' } }) }));
vi.mock('../../../components/ReceitaMensalChart', () => ({ ReceitaMensalChart: () => null }));
vi.mock('../../../components/GoogleCalendarIntegration', () => ({ GoogleCalendarIntegration: () => null }));

import AdminDashboardPage from '../AdminDashboardPage';
import { ClientBookingJourney } from '../../../components/bookings/ClientBookingJourney';
import { clientJourney, receivablesText } from '../../../utils/bookingStatus';

const STATS = {
  totalClients: 0, confirmedBookings: 0, totalRevenue: 0, totalEquipments: 0, totalBookings: 0, completedBookings: 0,
  bookingsGrowth: 0, revenueGrowth: 0,
  receivables: { noPaymentCount: 3, noPaymentTotal: 2400.5, partialCount: 2, partialBalance: 900, overdueBalanceCount: 1, total: 3300.5 },
};

const Onde = () => {
  const location = useLocation();
  return <p data-testid="onde">{location.pathname + location.search}</p>;
};

describe('M10: o card "A receber" do painel', () => {
  beforeEach(() => {
    apiFetch.mockReset();
    apiFetch.mockImplementation((url: string) => {
      const path = new URL(url, 'http://x').pathname;
      if (path === '/dashboard/stats') return Promise.resolve(STATS);
      if (path === '/dashboard/live-stats') return Promise.resolve({ todayBookings: 0, todayRevenue: 0, activeUsers: 0 });
      return Promise.resolve([]);
    });
  });

  it('mostra o total, quantas sem pagamento e só com o sinal (e o saldo vencido), e abre a lista filtrada', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/painel']}>
        <Routes>
          <Route path="/admin/painel" element={<AdminDashboardPage />} />
          <Route path="/admin/reservas" element={<Onde />} />
        </Routes>
      </MemoryRouter>,
    );

    const titulo = await screen.findByText('A receber');
    expect(screen.getByText('3 sem pagamento registrado · 2 só com o sinal · 1 com o saldo vencido')).toBeInTheDocument();
    expect(screen.getByText(/R\$\s?3\.300,50/)).toBeInTheDocument();
    fireEvent.click(titulo);
    expect(await screen.findByTestId('onde')).toHaveTextContent('/admin/reservas?pagamento=a-receber');
  });

  it('o resumo sem saldo vencido não fala dele; sem os números, um texto geral', () => {
    expect(receivablesText({ noPaymentCount: 1, partialCount: 0, overdueBalanceCount: 0 })).toBe('1 sem pagamento registrado · 0 só com o sinal');
    expect(receivablesText(undefined)).toBe('Reservas confirmadas com pagamento em aberto');
  });
});

describe('área do cliente: as etapas da reserva e o próximo passo', () => {
  const NOW = Date.parse('2026-11-22T15:00:00.000Z');
  const etapas = (j: ReturnType<typeof clientJourney>) => j?.steps.map((s) => `${s.label}${s.done ? ' ✓' : ''}`);

  it('pedido sem proposta: estamos montando o orçamento', () => {
    const j = clientJourney({ status: 'PENDING', paymentStatus: null, proposal: null }, NOW);
    expect(etapas(j)).toEqual(['Pedido recebido ✓', 'Proposta enviada', 'Confirmada', 'Concluída']);
    expect(j?.nextStep).toBe('Estamos montando o seu orçamento. A proposta chega por e-mail.');
  });

  it('proposta enviada e válida: aceitar o contrato; vencida: sem próximo passo (a validade já diz)', () => {
    const proposal = { sentAt: '2026-11-20T12:00:00.000Z', validUntil: '2026-11-30T02:59:59.000Z' };
    const j = clientJourney({ status: 'PENDING', paymentStatus: null, proposal }, NOW);
    expect(etapas(j)).toEqual(['Pedido recebido ✓', 'Proposta enviada ✓', 'Contrato aceito', 'Confirmada', 'Concluída']);
    expect(j?.nextStep).toBe('Confira a proposta que chegou por e-mail e responda pelo link dela.');

    const vencida = clientJourney({ status: 'PENDING', paymentStatus: null, proposal: { ...proposal, validUntil: '2026-11-21T02:59:59.000Z' } }, NOW);
    expect(vencida?.nextStep).toBeNull();
  });

  it('contrato aceito: pagar a parcela inicial; com o sinal registrado: a equipe vai confirmar', () => {
    const proposal = { sentAt: '2026-11-20T12:00:00.000Z', validUntil: '2026-11-21T02:59:59.000Z', contractAcceptedAt: '2026-11-20T20:00:00.000Z' };
    const aceito = clientJourney({ status: 'PENDING', paymentStatus: null, proposal }, NOW);
    expect(etapas(aceito)).toEqual(['Pedido recebido ✓', 'Proposta enviada ✓', 'Contrato aceito ✓', 'Sinal recebido', 'Confirmada', 'Concluída']);
    expect(aceito?.nextStep).toBe('Pague a parcela inicial (o PIX está no cartão do contrato) e envie o comprovante. A equipe confirma a reserva depois.');

    const pago = clientJourney({ status: 'PENDING', paymentStatus: 'PARTIAL', proposal }, NOW);
    expect(pago?.steps.find((s) => s.label === 'Sinal recebido')?.done).toBe(true);
    expect(pago?.nextStep).toBe('Recebemos a parcela inicial. A equipe vai confirmar a reserva.');
  });

  it('criada pela equipe já confirmada (sem proposta nem contrato): só as etapas que ela teve', () => {
    const j = clientJourney({ status: 'CONFIRMED', paymentStatus: null, proposal: null }, NOW);
    expect(etapas(j)).toEqual(['Pedido recebido ✓', 'Confirmada ✓', 'Concluída']);
    expect(j?.nextStep).toBe('Reserva confirmada. Perto da data, a equipe fala com você para combinar os detalhes.');
  });

  it('revisão: pedido parado com a data já passada pede para falar com a equipe; concluída já avaliada agradece', () => {
    expect(clientJourney({ status: 'PENDING', paymentStatus: null, proposal: null, eventDate: '2026-11-01T22:00:00.000Z' }, NOW)?.nextStep).toBe(
      'A data do evento já passou. Se ainda quiser o evento, fale com a equipe.',
    );
    expect(clientJourney({ status: 'COMPLETED', paymentStatus: 'PAID', proposal: null, review: { id: 'r1' } }, NOW)?.nextStep).toBe(
      'Evento concluído. Obrigado pela sua avaliação!',
    );
  });

  it('concluída pede a avaliação; rascunho, cancelada e reembolsada não têm trilha', () => {
    expect(clientJourney({ status: 'COMPLETED', paymentStatus: 'PAID', proposal: null }, NOW)?.nextStep).toBe(
      'Evento concluído. Obrigado! Se puder, deixe sua avaliação: ela ajuda muito a equipe.',
    );
    for (const status of ['DRAFT', 'CANCELLED', 'REFUNDED']) expect(clientJourney({ status, paymentStatus: null, proposal: null }, NOW)).toBeNull();
  });

  it('o cartão mostra as etapas (feitas e a fazer) e o próximo passo; na cancelada, nada', () => {
    const { rerender, container } = render(<ClientBookingJourney booking={{ status: 'CONFIRMED', paymentStatus: null, proposal: null }} />);
    expect(screen.getByRole('heading', { name: 'Andamento da reserva' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Etapas da reserva' })).toHaveTextContent('Pedido recebido(feito)Confirmada(feito)Concluída(a fazer)');
    const proximo = screen.getByText((_, el) => el?.tagName === 'P' && Boolean(el.textContent?.startsWith('Próximo passo:')));
    expect(proximo).toHaveTextContent('Próximo passo: Reserva confirmada. Perto da data, a equipe fala com você para combinar os detalhes.');
    // A etapa atual (a primeira a fazer) para o leitor de tela; a lista mantém o papel de lista.
    expect(screen.getByRole('list', { name: 'Etapas da reserva' })).toHaveAttribute('role', 'list');
    expect(screen.getByText('Concluída').closest('li')).toHaveAttribute('aria-current', 'step');
    expect(screen.getByText('Confirmada').closest('li')).not.toHaveAttribute('aria-current');

    rerender(<ClientBookingJourney booking={{ status: 'CANCELLED', paymentStatus: null, proposal: null }} />);
    expect(container).toBeEmptyDOMElement();
  });
});
