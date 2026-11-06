import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';

// D4 (aprovada em 02/11/2026): cada colaborador vê só o que é dele. Na tela:
// - a aba Privacidade troca as chaves que nada faziam ("Mostrar telefone" etc.) por um texto claro;
// - a agenda do colaborador não mostra mais o cliente (o servidor deixou de mandar) e o local vem do
//   campo certo (location; "venue" não existia na reserva e o local nunca aparecia).
const { getMyEvents, getMyDashboard, getMyProfile, getSettings } = vi.hoisted(() => ({
  getMyEvents: vi.fn(),
  getMyDashboard: vi.fn(),
  getMyProfile: vi.fn(),
  getSettings: vi.fn(),
}));
vi.mock('../../services/api', () => ({
  collaboratorProfileAPI: { getMyEvents, getMyProfile, getSettings, updateSettings: vi.fn(), updateProfile: vi.fn() },
  collaboratorsAPI: { getMyDashboard },
  authAPI: { updateProfile: vi.fn(), changePassword: vi.fn() },
}));
vi.mock('../../components/collaborator/CollaboratorLayout', () => ({
  CollaboratorLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));
vi.mock('../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));
vi.mock('recharts', () => {
  const Stub = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
  return { BarChart: Stub, Bar: Stub, XAxis: Stub, YAxis: Stub, Tooltip: Stub, ResponsiveContainer: Stub, CartesianGrid: Stub };
});

import CollaboratorSettingsPage from '../collaborator/CollaboratorSettingsPage';
import CollaboratorWorkSchedule from '../collaborator/CollaboratorWorkSchedule';

beforeEach(() => {
  vi.clearAllMocks();
  getMyProfile.mockResolvedValue({ data: { data: { phone: '', specialties: [], user: { name: 'Eu', email: 'eu@x.test' } } } });
  getSettings.mockResolvedValue({ data: {} });
  getMyDashboard.mockResolvedValue({ data: { data: { monthlyEarnings: [] } } });
});

describe('Colaborador — D4', () => {
  it('aba Privacidade: texto de quem vê o quê, sem as chaves que nada faziam', async () => {
    render(<MemoryRouter><CollaboratorSettingsPage /></MemoryRouter>);

    fireEvent.click(await screen.findByRole('tab', { name: /Privacidade/ }));

    expect(screen.getByText('Quem vê seus dados')).toBeInTheDocument();
    expect(screen.getByText(/Seu telefone e seu e-mail não aparecem para eles/)).toBeInTheDocument();
    expect(screen.queryByText('Mostrar telefone')).toBeNull();
    expect(screen.queryByText('Mostrar e-mail')).toBeNull();
    expect(screen.queryByRole('button', { name: /Salvar privacidade/ })).toBeNull();
  });

  it('agenda: o evento mostra o local (location) e não mostra cliente', async () => {
    const hoje = new Date();
    hoje.setHours(20, 0, 0, 0);
    getMyEvents.mockResolvedValue({
      data: { data: [{ id: 'ec-eu', status: 'CONFIRMED', totalPayment: 200, booking: { id: 'b1', eventTitle: 'Casamento', eventDate: hoje.toISOString(), status: 'CONFIRMED', location: 'Espaço Jardim' } }] },
    });
    render(<MemoryRouter><CollaboratorWorkSchedule /></MemoryRouter>);

    fireEvent.click(await screen.findByRole('button', { name: /1 evento$/ }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Espaço Jardim')).toBeInTheDocument();
    expect(within(dialog).queryByText('Cliente:')).toBeNull();
  });
});
