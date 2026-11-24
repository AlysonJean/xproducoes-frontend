import type React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// Onda 2 da auditoria de 19/11, lote 4b, no site: F6P1-09 (setas do painel), F5-08 (trilha do aceite adulterada), F5-07
// (destaques do contrato), F4-04 (portfólio), F1-08 (precache) e F1-10 (relatório da CSP).
const { apiFetch, contractAPI, addNotification } = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  contractAPI: { forAdmin: vi.fn(), adminPdf: vi.fn(), resend: vi.fn() },
  addNotification: vi.fn(),
}));
vi.mock('../services/api', () => ({ apiFetch, contractAPI }));
vi.mock('@/services/api', () => ({ apiFetch, contractAPI }));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../components/admin/AdminLayout', () => ({ AdminLayout: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ user: { name: 'Admin Teste', role: 'ADMIN' } }) }));
vi.mock('../components/ReceitaMensalChart', () => ({ ReceitaMensalChart: () => null }));
vi.mock('../components/GoogleCalendarIntegration', () => ({ GoogleCalendarIntegration: () => null }));

import AdminDashboardPage from '../pages/admin/AdminDashboardPage';
import { AdminContractCard } from '../components/proposal/AdminContractCard';
import { limitingClausesFromDocument, normalizeAdminContract } from '../components/proposal/contractHelpers';
import { PortfolioForm } from '../components/forms/PortfolioFormPage';
import type { ContractDocument } from '../types/contract';
import type { PortfolioItem } from '../types/types';

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe('F6P1-09: setas do painel', () => {
  const abrir = (stats: object) => {
    apiFetch.mockImplementation((url: string) => {
      const path = new URL(url, 'http://x').pathname;
      if (path === '/dashboard/stats') return Promise.resolve(stats);
      if (path === '/dashboard/live-stats') return Promise.resolve({ todayBookings: 0, todayRevenue: 0, activeUsers: 0 });
      return Promise.resolve([]);
    });
    render(<MemoryRouter initialEntries={['/admin/painel']}><Routes><Route path="/admin/painel" element={<AdminDashboardPage />} /></Routes></MemoryRouter>);
  };
  const base = { totalClients: 0, confirmedBookings: 7, totalRevenue: 50000, totalEquipments: 0, totalBookings: 0, completedBookings: 0 };

  it('as confirmadas não têm mais a seta das reservas criadas (as 591 do histórico davam milhares de %)', async () => {
    abrir({ ...base, bookingsGrowth: 5900, revenueGrowth: 0, currentMonthRevenue: 0 });
    await screen.findByText(/Neste mês:/);
    expect(screen.queryByText('5900%')).not.toBeInTheDocument();
  });

  it('o Faturamento mostra a receita do mês junto da seta; sem receita no mês, sem seta (nada de "-100%" no começo do mês)', async () => {
    abrir({ ...base, bookingsGrowth: 0, revenueGrowth: 25, currentMonthRevenue: 3000 });
    expect(await screen.findByText(/Neste mês: R\$\s?3\.000,00/)).toBeInTheDocument();
    expect(screen.getByText('25%')).toBeInTheDocument();
  });

  it('começo do mês: receita do mês zero, sem seta', async () => {
    abrir({ ...base, bookingsGrowth: 0, revenueGrowth: -100, currentMonthRevenue: 0 });
    expect(await screen.findByText(/Neste mês: R\$\s?0,00/)).toBeInTheDocument();
    expect(screen.queryByText('-100%')).not.toBeInTheDocument();
  });
});

describe('F5-08: trilha do aceite com divergência', () => {
  const contrato = (eventsIntact?: boolean) => ({
    state: 'ACCEPTED', purpose: 'OWN_EVENT', templateVersion: '2026-11-16', sha256: 'abc', acceptedAt: '2026-11-20T15:00:00.000Z',
    party: { personType: 'PF', name: 'Ana Souza', document: '12345678909', email: 'ana@x.test', phone: '31988887777' },
    events: [{ type: 'ACCEPTED', createdAt: '2026-11-20T15:00:00.000Z' }],
    ...(eventsIntact === undefined ? {} : { eventsIntact }),
    withdrawChannel: 'client_area',
  });

  it('normalizeAdminContract lê eventsIntact e withdrawChannel (antes descartava)', () => {
    expect(normalizeAdminContract(contrato(false))).toMatchObject({ eventsIntact: false, withdrawChannel: 'client_area' });
    expect(normalizeAdminContract(contrato()).eventsIntact).toBeNull();
  });

  it('com a cadeia quebrada, o cartão avisa; com ela íntegra, não', async () => {
    contractAPI.forAdmin.mockResolvedValueOnce(contrato(false));
    const { unmount } = render(<AdminContractCard bookingId="XP-1" summary={{ state: 'ACCEPTED', acceptedAt: null, withdrawUntil: null }} />);
    expect(await screen.findByText('Trilha do aceite com divergência')).toBeInTheDocument();
    unmount();

    contractAPI.forAdmin.mockResolvedValueOnce(contrato(true));
    render(<AdminContractCard bookingId="XP-1" summary={{ state: 'ACCEPTED', acceptedAt: null, withdrawUntil: null }} />);
    await screen.findByText('Ana Souza');
    expect(screen.queryByText('Trilha do aceite com divergência')).not.toBeInTheDocument();
  });
});

describe('F5-07: destaques do contrato a partir do texto do servidor', () => {
  it('pega os blocos marcados de cada cláusula e não repete o que já está nas notas do cancelamento', () => {
    const doc = {
      clauses: [
        { title: '3. Pagamento', blocks: [{ kind: 'item', num: '3.1', text: 'O sinal garante a data.', highlight: true }, { kind: 'item', num: '3.2', text: 'Texto comum.' }] },
        { title: '7. Cancelamento', blocks: [{ kind: 'item', num: '7.1', text: 'Retenção limitada.', highlight: true }] },
        { title: '9. Danos', blocks: [{ kind: 'sub', letter: 'a', text: 'O contratante responde pelos danos.', highlight: true }, { kind: 'event', rows: [] }] },
        { title: '10. Foro', blocks: [{ kind: 'item', num: '10.1', text: 'Foro de BH.' }] },
      ],
    } as unknown as ContractDocument;
    expect(limitingClausesFromDocument(doc, ['Retenção limitada.'])).toEqual([
      { title: '3. Pagamento', texts: ['O sinal garante a data.'] },
      { title: '9. Danos', texts: ['O contratante responde pelos danos.'] },
    ]);
  });
});

describe('F4-04: portfólio — remover mídia existente e definir capa', () => {
  const item = {
    id: 'pf-1', title: 'Casamento', description: 'Festa', eventDate: '2026-10-10T00:00:00.000Z', isPinned: false,
    imageUrl: 'https://res.cloudinary.com/x/a.jpg',
    media: [
      { id: 'm1', url: 'https://res.cloudinary.com/x/a.jpg', type: 'IMAGE' },
      { id: 'm2', url: 'https://res.cloudinary.com/x/b.jpg', type: 'IMAGE' },
      { id: 'm3', url: 'https://res.cloudinary.com/x/c.jpg', type: 'IMAGE' },
    ],
  } as unknown as PortfolioItem;

  it('tirar a capa e uma foto manda removedMediaIds; a nova capa (a que sobrou) vai em imageUrl', async () => {
    apiFetch.mockResolvedValue({ id: 'pf-1' });
    const onSuccess = vi.fn();
    render(<PortfolioForm initialData={item} onSuccess={onSuccess} onCancel={vi.fn()} />);
    const remover = await screen.findAllByRole('button', { name: /Remover/ });
    fireEvent.click(remover[0]); // a capa (m1)
    fireEvent.click((await screen.findAllByRole('button', { name: /Remover/ }))[0]); // m2
    fireEvent.click(screen.getByRole('button', { name: /Salvar|Atualizar/ }));

    await waitFor(() => expect(apiFetch.mock.calls.some((c) => c[1]?.method === 'PUT')).toBe(true));
    const fd = apiFetch.mock.calls.find((c) => c[1]?.method === 'PUT')![1].body as FormData;
    expect(JSON.parse(fd.get('removedMediaIds') as string)).toEqual(['m1', 'm2']);
    expect(fd.get('imageUrl')).toBe('https://res.cloudinary.com/x/c.jpg');
  });
});

describe('F1-08 e F1-10: configuração do site', () => {
  it('o precache do PWA deixa de fora os chunks e as entradas do Vike', () => {
    const vite = readFileSync(resolve(__dirname, '../../vite.config.ts'), 'utf8');
    expect(vite).toMatch(/globIgnores: \['stats\.html', 'assets\/chunks\/\*\*', 'assets\/entries\/\*\*'\]/);
  });

  it('a CSP (Report-Only) manda os relatórios para /api/v1/csp-report', () => {
    const vercel = JSON.parse(readFileSync(resolve(__dirname, '../../vercel.json'), 'utf8')) as { headers: Array<{ source: string; headers: Array<{ key: string; value: string }> }> };
    const csp = vercel.headers.flatMap((h) => h.headers).find((h) => h.key === 'Content-Security-Policy-Report-Only');
    expect(csp?.value).toMatch(/; report-uri \/api\/v1\/csp-report$/);
  });
});
