import type React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// Onda 2 da auditoria de 19/11: F6P1-05 (a Proposta Rápida oferecia kit e equipamento inativo), F7admin2-04 (a tela de
// Avaliações recebia só as 20 mais recentes) e F7admin2-07 (depois de um erro, "Tentar de novo" não mostrava as mensagens).
const { apiFetch, useAuth, addNotification } = vi.hoisted(() => ({ apiFetch: vi.fn(), useAuth: vi.fn(), addNotification: vi.fn() }));
vi.mock('../../../services/api', () => ({ apiFetch }));
vi.mock('@/services/api', () => ({ apiFetch }));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth }));
vi.mock('../../../components/admin/AdminLayout', () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/components/admin/AdminLayout', () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import AdminQuickProposalPage from '../AdminQuickProposalPage';
import ReviewManagementPage from '../ReviewManagementPage';
import { ContactSubmissionsListPage } from '../ContactSubmissionsListPage';

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  useAuth.mockReturnValue({ user: { id: 'a1', name: 'Admin', role: 'ADMIN' } });
});

describe('F6P1-05: catálogo da Proposta Rápida', () => {
  it('só oferece kit e equipamento ativos (o admin recebe todos os status da API)', async () => {
    apiFetch.mockImplementation((url: string) => {
      if (url === '/equipments/pricing-rules') return Promise.resolve({ equipmentPriceUnit: 'hour', kitPrice: 'PER_EVENT' });
      if (url === '/kits') return Promise.resolve([
        { id: 'k1', name: 'Kit Ativo', price: 100, status: 'ACTIVE' },
        { id: 'k2', name: 'Kit Inativo', price: 100, status: 'INACTIVE' },
        { id: 'k3', name: 'Kit Em Breve', price: 100, status: 'COMING_SOON' },
      ]);
      if (url === '/equipments') return Promise.resolve([
        { id: 'e1', name: 'Caixa Ativa', pricePerHour: 10, status: 'ACTIVE' },
        { id: 'e2', name: 'Caixa em Manutenção', pricePerHour: 10, status: 'MAINTENANCE' },
      ]);
      return Promise.resolve([]);
    });
    render(
      <MemoryRouter initialEntries={['/admin/orcamentos/novo']}>
        <Routes><Route path="/admin/orcamentos/novo" element={<AdminQuickProposalPage />} /></Routes>
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Kits' }));
    expect(await screen.findByRole('button', { name: 'Adicionar Kit Ativo' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Adicionar Kit Inativo' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Adicionar Kit Em Breve' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Equipamentos' }));
    expect(await screen.findByRole('button', { name: 'Adicionar Caixa Ativa' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Adicionar Caixa em Manutenção' })).not.toBeInTheDocument();
  }, 20000);
});

describe('F7admin2-04: tela de Avaliações', () => {
  const avaliacao = (i: number) => ({
    id: `rv-${i}`, rating: 5, comment: `Comentário ${i}`, reported: false, createdAt: '2026-11-01T12:00:00.000Z',
    reviewer: { name: `Pessoa ${i}` }, booking: { equipments: [] },
  });

  it('busca todas as páginas (100 por vez, com o total) e conta todas', async () => {
    apiFetch.mockImplementation((url: string) => {
      if (url === '/reviews?page=1&limit=100') return Promise.resolve({ data: Array.from({ length: 100 }, (_, i) => avaliacao(i)), meta: { total: 120 } });
      if (url === '/reviews?page=2&limit=100') return Promise.resolve({ data: Array.from({ length: 20 }, (_, i) => avaliacao(100 + i)), meta: { total: 120 } });
      return Promise.resolve([]);
    });
    render(<MemoryRouter><ReviewManagementPage /></MemoryRouter>);

    await waitFor(() => expect(apiFetch.mock.calls.map((c) => c[0])).toEqual(['/reviews?page=1&limit=100', '/reviews?page=2&limit=100']));
    expect(await screen.findByText('120')).toBeInTheDocument();
  });
});

describe('F7admin2-07: caixa de contatos', () => {
  it('"Tentar de novo" que dá certo tira o aviso de erro e mostra as mensagens', async () => {
    apiFetch
      .mockRejectedValueOnce(new Error('Falha de rede'))
      .mockResolvedValue([{ id: 'm1', name: 'Joana', email: 'joana@x.test', message: 'Oi', isRead: false, createdAt: '2026-11-01T12:00:00.000Z' }]);
    render(<MemoryRouter><ContactSubmissionsListPage /></MemoryRouter>);

    fireEvent.click(await screen.findByRole('button', { name: 'Tentar de novo' }));

    expect(await screen.findByRole('heading', { name: 'Joana' })).toBeInTheDocument();
    expect(screen.queryByText('Falha de rede')).not.toBeInTheDocument();
  });
});
