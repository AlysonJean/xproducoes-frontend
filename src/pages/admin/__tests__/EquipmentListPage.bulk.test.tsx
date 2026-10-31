import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const { apiFetch, useAuth, addNotification } = vi.hoisted(() => ({ apiFetch: vi.fn(), useAuth: vi.fn(), addNotification: vi.fn() }));
vi.mock('../../../services/api', () => ({ apiFetch }));
vi.mock('@/services/api', () => ({ apiFetch }));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth }));
vi.mock('@/components/forms/EquipmentFormPage', () => ({ EquipmentForm: () => null, default: () => null }));
vi.mock('../../../components/forms/EquipmentFormPage', () => ({ EquipmentForm: () => null, default: () => null }));

import EquipmentListPage from '../EquipmentListPage';

const equipments = [
  { id: 'eq-cabo-1', name: 'Cabo XLR 10m', status: 'ACTIVE', pricePerHour: 5, category: { name: 'Cabos' } },
  { id: 'eq-cabo-2', name: 'Cabo P10 5m', status: 'ACTIVE', pricePerHour: 4, category: { name: 'Cabos' } },
  { id: 'eq-mesa', name: 'Mesa MX-4BT', status: 'ACTIVE', pricePerHour: 30, category: { name: 'Som' } },
];

// Auditoria do painel: "ações em lote — selecionar vários equipamentos e mudar o status de uma
// vez (ex.: 5 cabos em manutenção)". Antes, só um por vez.
describe('EquipmentListPage — status em lote', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: { id: 'a1', name: 'Admin', role: 'ADMIN' } });
    apiFetch.mockImplementation((url: string, opts?: { method?: string }) => {
      if (url === '/equipments/bulk-status' && opts?.method === 'PATCH') return Promise.resolve({ updated: 2 });
      return Promise.resolve(equipments);
    });
  });

  it('seleciona 2 cabos e põe em manutenção numa chamada só', async () => {
    render(<MemoryRouter initialEntries={['/admin/equipamentos']}><EquipmentListPage /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Selecionar Cabo XLR 10m' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Selecionar Cabo P10 5m' }));

    const bar = screen.getByRole('region', { name: 'Ações em lote' });
    expect(within(bar).getByText(/2 selecionado/)).toBeInTheDocument();
    fireEvent.change(within(bar).getByLabelText('Novo status'), { target: { value: 'MAINTENANCE' } });
    fireEvent.click(within(bar).getByRole('button', { name: 'Aplicar' }));

    await vi.waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/equipments/bulk-status', expect.objectContaining({ method: 'PATCH' })));
    const call = apiFetch.mock.calls.find((c) => c[0] === '/equipments/bulk-status');
    expect(JSON.parse(call![1].body)).toEqual({ ids: ['eq-cabo-1', 'eq-cabo-2'], status: 'MAINTENANCE' });
    await vi.waitFor(() => expect(screen.queryByRole('region', { name: 'Ações em lote' })).not.toBeInTheDocument());
    expect(apiFetch.mock.calls.filter((c) => c[0] === '/equipments').length).toBeGreaterThanOrEqual(2); // recarregou a lista
  });

  it('"selecionar todos" marca todos os equipamentos filtrados', async () => {
    render(<MemoryRouter initialEntries={['/admin/equipamentos']}><EquipmentListPage /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Selecionar todos os equipamentos filtrados' }));
    expect(within(screen.getByRole('region', { name: 'Ações em lote' })).getByText(/3 selecionado/)).toBeInTheDocument();
  });
});
