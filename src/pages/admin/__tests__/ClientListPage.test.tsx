// @vitest-environment jsdom

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, beforeEach, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

// Mocks
vi.mock('@/services/api', () => ({
  apiFetch: vi.fn(),
}));

vi.mock('@/components/admin/AdminLayout', () => ({
  __esModule: true,
  default: ({ children }: any) => <div>{children}</div>,
}));

import { apiFetch } from '@/services/api';
import { NotificationProvider } from '@/contexts/NotificationContext';
import ClientListPage from '../ClientListPage';

const mockClients = [
  { id: 'c1', name: 'Alice', email: 'a@example.com', role: 'CLIENT', createdAt: new Date().toISOString(), totalBookings: 1, totalSpent: 100, status: 'ACTIVE' },
  { id: 'c2', name: 'Bob', email: 'b@example.com', role: 'CLIENT', createdAt: new Date().toISOString(), totalBookings: 2, totalSpent: 200, status: 'INACTIVE' },
];

describe('ClientListPage bulk delete', () => {
  beforeEach(() => {
    (apiFetch as any).mockReset();
  });

  it('allows selecting multiple clients and deleting them', async () => {
    // mock list fetch
    (apiFetch as any).mockImplementation((endpoint: string) => {
      if (endpoint.startsWith('/admin/clients?')) {
        return Promise.resolve({ data: mockClients, meta: { totalItems: 2, totalPages: 1 } });
      }
      return Promise.resolve({});
    });

    render(
      <MemoryRouter>
        <NotificationProvider>
          <ClientListPage />
        </NotificationProvider>
      </MemoryRouter>
    );

    // Wait for rows to appear
  await waitFor(() => screen.getByText('Alice'));

    const checkboxes = screen.getAllByRole('checkbox');
    // First checkbox is select-all, next two are per-row
    await userEvent.click(checkboxes[1]);
    await userEvent.click(checkboxes[2]);

    // Button should show count
  expect(screen.getByText('Excluir (2) selecionados')).toBeTruthy();

    // Mock delete calls
    (apiFetch as any).mockResolvedValue({});

    // Click delete button
    await userEvent.click(screen.getByText(/Excluir \(2\) selecionados/));

    // Confirm dialog should appear
  await waitFor(() => screen.getByText(/Confirmar Exclusão em Massa/));

    // Click confirm (button text 'Excluir selecionados' when not loading)
    await userEvent.click(screen.getByText('Excluir selecionados'));

    // Expect delete calls for each client
    await waitFor(() => {
      expect((apiFetch as any)).toHaveBeenCalledWith('/admin/clients/c1', { method: 'DELETE' });
      expect((apiFetch as any)).toHaveBeenCalledWith('/admin/clients/c2', { method: 'DELETE' });
    });
  });
});
