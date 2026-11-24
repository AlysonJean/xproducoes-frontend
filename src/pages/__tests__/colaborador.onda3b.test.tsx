import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';

// Onda 3 da auditoria de 19/11, lote 3b, no site: painel do colaborador com números reais (F9-09), "Total Recebido"
// como soma do que foi pago (F9-10) e a Agenda que não cai se o gráfico falhar (F9-17).
const api = vi.hoisted(() => ({
  getMyDashboard: vi.fn(),
  getMyPayments: vi.fn(),
  getStats: vi.fn(),
  getMyEvents: vi.fn(),
}));
vi.mock('../../services/api', () => ({
  collaboratorsAPI: { getMyDashboard: api.getMyDashboard, getMyPayments: api.getMyPayments },
  collaboratorProfileAPI: { getStats: api.getStats, getMyEvents: api.getMyEvents },
}));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u-eu', name: 'Bruno Técnico', role: 'COLLABORATOR' } }) }));
vi.mock('../../components/collaborator/CollaboratorLayout', () => ({
  CollaboratorLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));
vi.mock('../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));
vi.mock('recharts', () => {
  const Box = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
  return { ResponsiveContainer: Box, BarChart: Box, Bar: Box, XAxis: Box, YAxis: Box, Tooltip: Box, CartesianGrid: Box, ComposedChart: Box, Line: Box, LineChart: Box };
});

import CollaboratorDashboard from '../collaborator/CollaboratorDashboard';
import CollaboratorEarningsPage from '../collaborator/CollaboratorEarningsPage';
import CollaboratorWorkSchedule from '../collaborator/CollaboratorWorkSchedule';

const cartao = (titulo: string) => screen.getByText(titulo).closest('div')?.parentElement?.parentElement as HTMLElement;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('painel do colaborador (F9-09)', () => {
  it('os quatro números são do cálculo único; sem "Taxa de Conclusão" nem "Avaliação Média"; cachê 0 é "A combinar"', async () => {
    api.getMyDashboard.mockResolvedValue({
      data: {
        totalEarnings: 400, totalEvents: 2, completionRate: 100, averageRating: 0,
        stats: { currentMonthEvents: 3, upcomingEvents: 1 },
        upcomingEvents: [{ id: 'b-1', title: 'Casamento Silva', startTime: '2026-12-12T22:00:00.000Z', location: 'BH', totalPayment: 0, status: 'CONFIRMED' }],
        recentActivities: [],
      },
    });
    render(<MemoryRouter><CollaboratorDashboard /></MemoryRouter>);

    expect(await screen.findByText('Cachês dos eventos realizados')).toBeInTheDocument();
    expect(cartao('Cachês dos eventos realizados')).toHaveTextContent(/400,00/);
    expect(cartao('Eventos realizados')).toHaveTextContent('2');
    expect(cartao('Eventos este mês')).toHaveTextContent('3');
    expect(cartao('Próximos 30 dias')).toHaveTextContent('1');
    expect(screen.queryByText('Taxa de Conclusão')).toBeNull();
    expect(screen.queryByText('Avaliação Média')).toBeNull();
    expect(screen.getByText('A combinar')).toBeInTheDocument();
  });
});

describe('Ganhos (F9-10)', () => {
  it('"Total Recebido" é a soma do pago; "Aguardando", pendente + atrasado; a data do pago é a do pagamento', async () => {
    api.getStats.mockResolvedValue({ data: { totalEarnings: 1000, totalEvents: 4, monthlyEarnings: [] } });
    api.getMyPayments.mockResolvedValue({
      data: [
        { id: 'p1', description: 'Evento A', amount: 300, status: 'PAID', dueDate: '2026-11-01T12:00:00.000Z', paymentDate: '2026-11-20T12:00:00.000Z' },
        { id: 'p2', description: 'Evento B', amount: 150, status: 'PENDING', dueDate: '2026-12-01T12:00:00.000Z' },
        { id: 'p3', description: 'Evento C', amount: 50, status: 'OVERDUE', dueDate: '2026-11-05T12:00:00.000Z' },
        { id: 'p4', description: 'Evento D', amount: 80, status: 'CANCELLED', dueDate: '2026-11-06T12:00:00.000Z' },
      ],
    });
    render(<MemoryRouter><CollaboratorEarningsPage /></MemoryRouter>);

    const recebido = (await screen.findByText('Total Recebido')).closest('div')?.parentElement?.parentElement as HTMLElement;
    expect(recebido).toHaveTextContent(/300,00/);
    expect(recebido).not.toHaveTextContent(/800,00/); // antes: 1000 de ganhos menos 200 pendentes
    const aguardando = screen.getByText('Aguardando').closest('div')?.parentElement?.parentElement as HTMLElement;
    expect(aguardando).toHaveTextContent(/200,00/);
    expect(screen.getByText('Evento A').closest('div')?.parentElement).toHaveTextContent('20/11/2026');
  });
});

describe('Agenda (F9-17)', () => {
  it('falha no painel (só o gráfico) não derruba a agenda', async () => {
    api.getMyDashboard.mockRejectedValue(new Error('rede'));
    api.getMyEvents.mockResolvedValue({ data: [{ id: 'ec-1', status: 'CONFIRMED', booking: { id: 'b-1', eventTitle: 'Casamento Silva', eventDate: '2026-12-12T22:00:00.000Z', status: 'CONFIRMED' } }] });
    render(<MemoryRouter><CollaboratorWorkSchedule /></MemoryRouter>);
    expect((await screen.findAllByRole('heading')).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Não conseguimos carregar/)).toBeNull();
    expect(api.getMyEvents).toHaveBeenCalled();
  });

  it('falha nos eventos ainda é erro (com tentar de novo)', async () => {
    api.getMyDashboard.mockResolvedValue({ data: { monthlyEarnings: [] } });
    api.getMyEvents.mockRejectedValue(new Error('rede'));
    render(<MemoryRouter><CollaboratorWorkSchedule /></MemoryRouter>);
    expect(await screen.findByText(/Não conseguimos carregar/)).toBeInTheDocument();
  });
});
