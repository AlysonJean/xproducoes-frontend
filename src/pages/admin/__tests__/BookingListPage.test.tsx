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

// Reserva manual (sem conta no site) guarda o nome em clientName; a tabela só olhava a conta e
// mostrava "Cliente Avulso" para todas — inclusive para o histórico importado das agendas.
describe('BookingListPage — nome do cliente de reserva manual', () => {
  it('mostra clientName quando a reserva não tem conta vinculada', async () => {
    useAuth.mockReturnValue({ user: { id: 'a1', name: 'Admin', role: 'ADMIN' } });
    apiFetch.mockReset();
    apiFetch.mockResolvedValue([{ id: 'XP-MANUAL', status: 'COMPLETED', totalPrice: '500', eventDate: '2025-03-08T23:00:00.000Z', clientName: 'Resenha do Morro' }]);
    render(<MemoryRouter initialEntries={['/admin/reservas']}><BookingListPage /></MemoryRouter>);
    expect(await screen.findByText('Resenha do Morro')).toBeInTheDocument();
    expect(screen.queryByText('Cliente Avulso')).not.toBeInTheDocument();
  });
});

// Situação do pagamento (campo novo): filtro na tela e troca direto na linha — o formulário de
// edição exige endereço e kit, que o histórico importado das agendas não tem.
describe('BookingListPage — situação do pagamento', () => {
  const rows = [
    { ...booking(1), id: 'XP-PAGO', paymentStatus: 'PAID' },
    { ...booking(2), id: 'XP-DEVENDO', paymentStatus: 'PENDING' },
    { ...booking(3), id: 'XP-SEM-INFO' },
  ];

  beforeEach(() => {
    useAuth.mockReturnValue({ user: { id: 'a1', name: 'Admin', role: 'ADMIN' } });
    apiFetch.mockReset();
    apiFetch.mockImplementation((url: string) => Promise.resolve(url.startsWith('/admin/bookings') ? rows : {}));
  });

  it('filtra por "Pago" e por "Não informado"', async () => {
    render(<MemoryRouter initialEntries={['/admin/reservas']}><BookingListPage /></MemoryRouter>);
    await screen.findByText(/Mostrando 3 de 3 registros/);

    fireEvent.change(screen.getByLabelText('Filtrar por pagamento'), { target: { value: 'PAID' } });
    expect(await screen.findByText(/Mostrando 1 de 3 registros/)).toBeInTheDocument();
    expect(screen.getByText('XP-PAGO', { exact: false })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Filtrar por pagamento'), { target: { value: 'NONE' } });
    expect(await screen.findByText(/Mostrando 1 de 3 registros/)).toBeInTheDocument();
    expect(screen.getByText('XP-SEM-INFO', { exact: false })).toBeInTheDocument();
  });

  it('trocar na linha grava só o campo (PUT /bookings/:id); "Não informado" manda null', async () => {
    render(<MemoryRouter initialEntries={['/admin/reservas']}><BookingListPage /></MemoryRouter>);
    await screen.findByText(/Mostrando 3 de 3 registros/);

    fireEvent.change(screen.getByLabelText('Pagamento da reserva XP-DEVENDO'), { target: { value: 'PAID' } });
    await vi.waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/bookings/XP-DEVENDO', expect.objectContaining({ method: 'PUT', body: JSON.stringify({ paymentStatus: 'PAID' }) })));
    await vi.waitFor(() => expect((screen.getByLabelText('Pagamento da reserva XP-DEVENDO') as HTMLSelectElement).value).toBe('PAID'));

    fireEvent.change(screen.getByLabelText('Pagamento da reserva XP-PAGO'), { target: { value: '' } });
    await vi.waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/bookings/XP-PAGO', expect.objectContaining({ method: 'PUT', body: JSON.stringify({ paymentStatus: null }) })));
  });
});

// Os seletores de Status e Entrega da tabela só tinham parte dos valores: reserva em rascunho ou com
// entrega concluída (todo o histórico importado) aparecia como "Pendente".
describe('BookingListPage — seletores mostram o valor real', () => {
  it('rascunho e entrega concluída aparecem como tal', async () => {
    useAuth.mockReturnValue({ user: { id: 'a1', name: 'Admin', role: 'ADMIN' } });
    apiFetch.mockReset();
    apiFetch.mockResolvedValue([
      { ...booking(1), id: 'XP-HIST', status: 'COMPLETED', deliveryStatus: 'COMPLETED' },
      { ...booking(2), id: 'XP-CARRINHO', status: 'DRAFT', deliveryStatus: 'PENDING' },
    ]);
    render(<MemoryRouter initialEntries={['/admin/reservas']}><BookingListPage /></MemoryRouter>);
    await screen.findByText(/Mostrando 2 de 2 registros/);

    const value = (label: string) => (screen.getByLabelText(label) as HTMLSelectElement).value;
    expect(value('Entrega da reserva XP-HIST')).toBe('COMPLETED');
    expect(value('Status da reserva XP-HIST')).toBe('COMPLETED');
    expect(value('Status da reserva XP-CARRINHO')).toBe('DRAFT');
  });
});
