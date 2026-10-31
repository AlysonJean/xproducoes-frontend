import { describe, it, expect, vi, beforeEach } from 'vitest';

// Fuso da empresa (o filtro de período compara dias locais).
process.env.TZ = 'America/Sao_Paulo';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const { apiFetch, useAuth, XLSX } = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  useAuth: vi.fn(),
  XLSX: {
    utils: { json_to_sheet: vi.fn(() => ({})), book_new: vi.fn(() => ({})), book_append_sheet: vi.fn() },
    writeFile: vi.fn(),
  },
}));
vi.mock('xlsx-js-style', () => ({ default: XLSX, ...XLSX }));
vi.mock('../../../services/api', () => ({ apiFetch }));
vi.mock('@/services/api', () => ({ apiFetch }));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth }));
vi.mock('@/components/forms/AdminBookingForm', () => ({ AdminBookingForm: () => null }));

import BookingListPage from '../BookingListPage';

const booking = (i: number) => ({
  id: `XP-${i}`, status: 'PENDING', totalPrice: '100', eventDate: '2027-01-10T18:00:00.000Z',
  client: { id: `c${i}`, user: { id: `u${i}`, name: `Cliente ${i}`, email: `c${i}@t.com` } },
});

// A tela chamava GET /admin/bookings sem parâmetros: a API devolve só a 1ª página (20, as mais
// antigas por data do evento) e a lista do admin nunca mostrava as demais reservas.
describe('BookingListPage — carrega todas as reservas', () => {
  beforeEach(() => {
    apiFetch.mockReset();
    useAuth.mockReturnValue({ user: { id: 'a1', name: 'Admin', role: 'ADMIN' } });
    apiFetch.mockImplementation((url: string) => {
      const page = Number(new URL(url, 'http://x').searchParams.get('page') || '1');
      if (page === 1) return Promise.resolve(Array.from({ length: 100 }, (_, i) => booking(i)));
      if (page === 2) return Promise.resolve(Array.from({ length: 30 }, (_, i) => booking(100 + i)));
      return Promise.resolve([]);
    });
  });

  it('130 reservas no banco → a lista mostra as 130 (antes: só a 1ª página)', async () => {
    render(<MemoryRouter initialEntries={['/admin/reservas']}><BookingListPage /></MemoryRouter>);
    expect(await screen.findByText(/Mostrando 130 de 130 registros/)).toBeInTheDocument();
  });

  it('período "01/10 a 31/10" pega o evento de 31/10 às 20h e não o de 30/09 às 22h (horário de Brasília)', async () => {
    apiFetch.mockReset();
    apiFetch.mockResolvedValue([
      { ...booking(1), id: 'XP-31-OUT', eventDate: '2026-10-31T23:00:00.000Z' }, // 31/10 20h BRT
      { ...booking(2), id: 'XP-30-SET', eventDate: '2026-10-01T01:00:00.000Z' }, // 30/09 22h BRT
    ]);
    render(<MemoryRouter initialEntries={['/admin/reservas']}><BookingListPage /></MemoryRouter>);
    await screen.findByText(/Mostrando 2 de 2 registros/);

    fireEvent.change(screen.getByLabelText('Data inicial'), { target: { value: '2026-10-01' } });
    fireEvent.change(screen.getByLabelText('Data final'), { target: { value: '2026-10-31' } });

    expect(await screen.findByText(/Mostrando 1 de 2 registros/)).toBeInTheDocument();
    expect(screen.getByText('XP-31-OUT', { exact: false })).toBeInTheDocument();
    expect(screen.queryByText('XP-30-SET', { exact: false })).not.toBeInTheDocument();
  });

  it('"Exportar" gera a planilha só com as reservas filtradas e o período no nome do arquivo', async () => {
    apiFetch.mockReset();
    apiFetch.mockResolvedValue([
      { ...booking(1), id: 'XP-31-OUT', eventDate: '2026-10-31T23:00:00.000Z' },
      { ...booking(2), id: 'XP-30-SET', eventDate: '2026-10-01T01:00:00.000Z' },
    ]);
    render(<MemoryRouter initialEntries={['/admin/reservas']}><BookingListPage /></MemoryRouter>);
    await screen.findByText(/Mostrando 2 de 2 registros/);
    fireEvent.change(screen.getByLabelText('Data inicial'), { target: { value: '2026-10-01' } });
    fireEvent.change(screen.getByLabelText('Data final'), { target: { value: '2026-10-31' } });
    await screen.findByText(/Mostrando 1 de 2 registros/);

    fireEvent.click(screen.getByRole('button', { name: /exportar/i }));

    await vi.waitFor(() => expect(XLSX.writeFile).toHaveBeenCalledWith(expect.anything(), 'reservas_2026-10-01_a_2026-10-31.xlsx'));
    const rows = (XLSX.utils.json_to_sheet.mock.calls[0] as unknown as [Array<Record<string, unknown>>])[0];
    expect(rows.map((r) => r['Código'])).toEqual(['XP-31-OUT']);
  });
});
