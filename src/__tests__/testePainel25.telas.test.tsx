// Teste do painel admin de 25/11/2026 (relatório "Teste do painel admin — 25/11/2026"), telas menores:
// - A-15: endereço do painel que não existe mostra "Esta página do painel não existe" (antes, tela em branco);
// - A-08: a tela Funções explica que as funções básicas da escala já vêm prontas (ela dizia 0, a escala oferecia 12);
// - A-01/A-02: o Histórico da ficha mostra o valor recebido e a edição das observações internas (sem o texto);
// - A-05/A-07/A-12: o aviso de erro fica 10 s na tela (antes 5 s, e as recusas pareciam "silenciosas").
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useEffect, type ReactNode } from 'react';

const { bookingAPI, collaboratorFunctionsAPI } = vi.hoisted(() => ({
  bookingAPI: { getAuditHistory: vi.fn() },
  collaboratorFunctionsAPI: { getAll: vi.fn() },
}));
vi.mock('@/services/api', () => ({ bookingAPI, collaboratorFunctionsAPI }));
vi.mock('../services/api', () => ({ bookingAPI, collaboratorFunctionsAPI }));
vi.mock('../components/admin/AdminLayout', () => ({
  AdminLayout: ({ title, children }: { title: string; children: ReactNode }) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

import { AdminNotFoundPage } from '../pages/admin/AdminNotFoundPage';
import { AdminCollaboratorFunctionsPage } from '../pages/admin/AdminCollaboratorFunctionsPage';
import { ProposalHistory } from '../components/bookings/ProposalHistory';
import { NotificationProvider, useNotifications } from '../contexts/NotificationContext';

describe('A-15: página do painel que não existe', () => {
  it('diz que a página não existe e leva de volta ao início ou às reservas', () => {
    render(<MemoryRouter><AdminNotFoundPage /></MemoryRouter>);
    expect(screen.getByText('Esta página do painel não existe')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ir para o início do painel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver reservas' })).toBeInTheDocument();
  });
});

describe('A-08: a tela Funções explica as duas listas', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sem especialidade cadastrada: explica que a escala já usa as funções básicas', async () => {
    collaboratorFunctionsAPI.getAll.mockResolvedValue({ data: [] });
    render(<NotificationProvider><MemoryRouter><AdminCollaboratorFunctionsPage /></MemoryRouter></NotificationProvider>);

    expect(await screen.findByText('Nenhuma especialidade extra cadastrada')).toBeInTheDocument();
    expect(screen.getByTestId('functions-explainer').textContent).toMatch(/As funções básicas da escala \(Fotógrafo, .*\) já vêm prontas/);
    expect(screen.queryByText('Nenhuma função encontrada')).not.toBeInTheDocument();
  });
});

describe('Histórico: valor recebido e observações internas', () => {
  it('mostra "Valor recebido: … → …" e "Observações internas editadas" (sem texto)', async () => {
    bookingAPI.getAuditHistory.mockResolvedValue({
      data: [
        { action: 'PAID_AMOUNT_CHANGED', timestamp: '2026-11-25T15:00:00.000Z', actorName: 'Dono', details: { from: null, to: 500 } },
        { action: 'PAID_AMOUNT_CHANGED', timestamp: '2026-11-25T14:00:00.000Z', actorName: 'Dono', details: { from: 500, to: null } },
        { action: 'INTERNAL_NOTES_CHANGED', timestamp: '2026-11-25T13:00:00.000Z', actorName: 'Dono', details: { from: null, to: null } },
      ],
    });
    render(<ul><ProposalHistory bookingId="XP-1" refreshKey={0} /></ul>);

    expect(await screen.findByText(/^Valor recebido: não informado → R\$\s500,00$/)).toBeInTheDocument();
    expect(screen.getByText(/^Valor recebido: R\$\s500,00 → não informado$/)).toBeInTheDocument();
    expect(screen.getByText('Observações internas editadas')).toBeInTheDocument();
  });
});

describe('A-05/A-07/A-12: tempo dos avisos', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const Disparar = ({ type }: { type: 'error' | 'warning' | 'success' }) => {
    const { addNotification } = useNotifications();
    useEffect(() => {
      addNotification({ type, title: `aviso ${type}`, message: 'texto' });
    }, [addNotification, type]);
    return null;
  };

  it.each([
    ['error', 10_000],
    ['warning', 8_000],
    ['success', 5_000],
  ] as const)('%s fica %i ms', (type, ms) => {
    render(<NotificationProvider><Disparar type={type} /></NotificationProvider>);
    expect(screen.getByText(`aviso ${type}`)).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(ms - 100));
    expect(screen.getByText(`aviso ${type}`)).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(200));
    expect(screen.queryByText(`aviso ${type}`)).not.toBeInTheDocument();
  });
});
