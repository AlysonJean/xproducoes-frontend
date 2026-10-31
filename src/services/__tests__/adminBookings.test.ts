import { describe, it, expect, vi, beforeEach } from 'vitest';

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock('../api', () => ({ apiFetch }));

import { fetchAllAdminBookings } from '../adminBookings';

// GET /admin/bookings pagina no banco (padrão 20, máx. 100, ordem por data do evento crescente),
// e o apiFetch descarta o `meta` do envelope. A tela de Reservas chamava sem parâmetros e só via
// as 20 reservas MAIS ANTIGAS — as recentes/futuras ficavam fora da lista.
const page = (n: number, start = 0) => Array.from({ length: n }, (_, i) => ({ id: `b${start + i}` }));

describe('fetchAllAdminBookings', () => {
  beforeEach(() => {
    apiFetch.mockReset();
  });

  it('busca de 100 em 100 até vir uma página incompleta', async () => {
    apiFetch.mockResolvedValueOnce(page(100)).mockResolvedValueOnce(page(100, 100)).mockResolvedValueOnce(page(30, 200));

    const all = await fetchAllAdminBookings();

    expect(all).toHaveLength(230);
    expect(apiFetch.mock.calls.map((c) => c[0])).toEqual([
      '/admin/bookings?page=1&limit=100',
      '/admin/bookings?page=2&limit=100',
      '/admin/bookings?page=3&limit=100',
    ]);
  });

  it('com menos de 100 reservas faz uma chamada só', async () => {
    apiFetch.mockResolvedValueOnce(page(7));
    expect(await fetchAllAdminBookings()).toHaveLength(7);
    expect(apiFetch).toHaveBeenCalledTimes(1);
  });
});
