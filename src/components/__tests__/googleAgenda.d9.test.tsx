import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// D9 (aprovada em 02/11/2026): a Google Agenda é só do admin. No painel, aviso "Reconecte sua Google
// Agenda" quando o Google deixou de aceitar a permissão; aviso na volta do Google; e, se o Google não
// confirmar o cancelamento ao desconectar, o caminho para remover o acesso. Cliente: sem conectar
// nas preferências e sem o botão de sincronizar na agenda (fica o link "Google Agenda").
const { apiFetch, addNotification } = vi.hoisted(() => ({ apiFetch: vi.fn(), addNotification: vi.fn() }));
vi.mock('../../services/api', () => ({ apiFetch }));
vi.mock('@/services/api', () => ({ apiFetch }));
vi.mock('../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));

import { GoogleCalendarIntegration } from '../GoogleCalendarIntegration';
import { PreferencesTab } from '../../pages/client/profile/PreferencesTab';
import { BookingDetailsModal } from '../../pages/client/ClientCalendarPage';

beforeEach(() => {
  vi.clearAllMocks();
  window.history.replaceState(null, '', '/admin/painel');
});
afterEach(() => {
  window.history.replaceState(null, '', '/');
});

describe('Painel do admin — Google Agenda (D9)', () => {
  it('permissão recusada pelo Google: avisa "Reconecte sua Google Agenda" e o botão reconecta', async () => {
    apiFetch.mockResolvedValue({ url: '' });
    render(<GoogleCalendarIntegration googleCalendarEmail="dono@gmail.com" needsReconnect />);

    expect(screen.getByText(/Reconecte sua Google Agenda/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Desconectar' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Reconectar' }));

    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/google/connect'));
  });

  it('conectada e aceita: mostra a conta e "Desconectar", sem aviso de reconectar', () => {
    render(<GoogleCalendarIntegration googleCalendarEmail="dono@gmail.com" />);

    expect(screen.getByText('Conectado como dono@gmail.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Desconectar' })).toBeInTheDocument();
    expect(screen.queryByText(/Reconecte/)).toBeNull();
  });

  it('desconectar sem a confirmação do Google: avisa como remover o acesso', async () => {
    apiFetch.mockResolvedValue({ revokedAtGoogle: false });
    const onDisconnect = vi.fn();
    render(<GoogleCalendarIntegration googleCalendarEmail="dono@gmail.com" onDisconnect={onDisconnect} />);

    fireEvent.click(screen.getByRole('button', { name: 'Desconectar' }));

    await waitFor(() => expect(onDisconnect).toHaveBeenCalled());
    expect(apiFetch).toHaveBeenCalledWith('/google/disconnect', { method: 'POST' });
    expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({
      type: 'warning',
      message: expect.stringContaining('myaccount.google.com/permissions'),
    }));
  });

  it('desconectar com a confirmação do Google: sem aviso extra', async () => {
    apiFetch.mockResolvedValue({ revokedAtGoogle: true });
    const onDisconnect = vi.fn();
    render(<GoogleCalendarIntegration googleCalendarEmail="dono@gmail.com" onDisconnect={onDisconnect} />);

    fireEvent.click(screen.getByRole('button', { name: 'Desconectar' }));

    await waitFor(() => expect(onDisconnect).toHaveBeenCalled());
    expect(addNotification).not.toHaveBeenCalled();
  });

  it.each([
    ['conectada', 'success'],
    ['erro', 'error'],
  ])('volta do Google com ?google_agenda=%s: aviso %s e o parâmetro sai do endereço', (valor, tipo) => {
    window.history.replaceState(null, '', `/admin/painel?google_agenda=${valor}&aba=1`);
    render(<GoogleCalendarIntegration googleCalendarEmail={null} />);

    expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({ type: tipo }));
    expect(window.location.pathname + window.location.search).toBe('/admin/painel?aba=1');
  });
});

describe('Cliente — sem conexão com a Google Agenda (D9)', () => {
  it('preferências do cliente não oferecem conectar a Google Agenda', () => {
    render(
      <PreferencesTab
        generalPreferences={{} as never}
        setGeneralPreferences={vi.fn()}
        saving={false}
        handleSavePreferences={vi.fn()}
      />,
    );

    expect(screen.queryByText('Google Agenda')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Conectar' })).toBeNull();
  });

  it('agenda do cliente: fica o link "Google Agenda", sai o botão de sincronizar', () => {
    const inicio = new Date('2027-01-10T21:00:00.000Z');
    render(
      <MemoryRouter>
        <BookingDetailsModal
          event={{ title: 'Evento', start: inicio, end: inicio, resource: { id: 'XP-ANA-1', eventDate: inicio.toISOString(), status: 'CONFIRMED', totalPrice: '300' } } as never}
          onClose={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: /Google Agenda/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Sincronizar/ })).toBeNull();
  });
});
