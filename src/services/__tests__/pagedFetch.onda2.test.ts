import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Onda 2 da auditoria de 19/11 (F7admin2-05, F7admin2-04, F4-09, F6P1-04): as listas do painel que precisam de tudo.
// Com o total da 1ª página, as demais saem em paralelo; sem ele, página a página como antes.
const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock('../api', () => ({ apiFetch }));

import { fetchAllPages, fetchAllAdminClients } from '../pagedFetch';

const itens = (n: number, start = 0) => Array.from({ length: n }, (_, i) => ({ id: `i${start + i}` }));
const envelope = (data: unknown[], total?: number) => ({ data, ...(total === undefined ? {} : { meta: { total } }) });
const path = (page: number) => `/lista?page=${page}&limit=100`;

describe('fetchAllPages', () => {
  beforeEach(() => apiFetch.mockReset());

  it('com o total: pede a 1ª página e as demais todas de uma vez (sem esperar uma pela outra)', async () => {
    let pendentes = 0;
    let maxSimultaneas = 0;
    apiFetch.mockImplementation(async (url: string) => {
      const page = Number(new URL(url, 'http://x').searchParams.get('page'));
      pendentes++;
      maxSimultaneas = Math.max(maxSimultaneas, pendentes);
      await new Promise((r) => setTimeout(r, 5));
      pendentes--;
      return envelope(page < 3 ? itens(100, (page - 1) * 100) : itens(30, 200), 230);
    });

    const all = await fetchAllPages<{ id: string }>(path, 100);

    expect(all).toHaveLength(230);
    expect(apiFetch.mock.calls.map((c) => c[0])).toEqual([path(1), path(2), path(3)]);
    expect(apiFetch.mock.calls.every((c) => c[1]?.envelope === true)).toBe(true);
    expect(maxSimultaneas).toBe(2); // as páginas 2 e 3 juntas
  });

  it('item repetido entre páginas (a lista mudou entre as consultas) entra uma vez só', async () => {
    apiFetch
      .mockResolvedValueOnce(envelope(itens(100), 150))
      .mockResolvedValueOnce(envelope([{ id: 'i99' }, ...itens(50, 100)], 150));
    const all = await fetchAllPages<{ id: string }>(path, 100);
    expect(all).toHaveLength(150);
    expect(new Set(all.map((i) => i.id)).size).toBe(150);
  });

  it('sem o total (lista crua): segue página a página até vir uma incompleta, como antes', async () => {
    apiFetch.mockResolvedValueOnce(itens(100)).mockResolvedValueOnce(itens(100, 100)).mockResolvedValueOnce(itens(7, 200));
    const all = await fetchAllPages<{ id: string }>(path, 100);
    expect(all).toHaveLength(207);
    expect(apiFetch).toHaveBeenCalledTimes(3);
  });

  it('total menor que uma página: uma chamada só', async () => {
    apiFetch.mockResolvedValueOnce(envelope(itens(12), 12));
    expect(await fetchAllPages(path, 100)).toHaveLength(12);
    expect(apiFetch).toHaveBeenCalledTimes(1);
  });

  it('fetchAllAdminClients: de 100 em 100 (o padrão do servidor em produção é 50)', async () => {
    apiFetch.mockResolvedValueOnce(envelope(itens(100), 130)).mockResolvedValueOnce(envelope(itens(30, 100), 130));
    expect(await fetchAllAdminClients()).toHaveLength(130);
    expect(apiFetch.mock.calls.map((c) => c[0])).toEqual(['/admin/clients?page=1&pageSize=100', '/admin/clients?page=2&pageSize=100']);
  });
});

describe('apiFetch com envelope: true', () => {
  afterEach(() => vi.restoreAllMocks());

  it('devolve { data, meta } em vez de só o data; sem a opção, continua só o data', async () => {
    const { apiFetch: realApiFetch } = await vi.importActual<typeof import('../api')>('../api');
    const json = (body: object) => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => json({ success: true, data: [{ id: 'a' }], meta: { total: 9 } }));

    await expect(realApiFetch('/admin/bookings?page=1', { envelope: true })).resolves.toEqual({ data: [{ id: 'a' }], meta: { total: 9 } });
    await expect(realApiFetch('/admin/bookings?page=1')).resolves.toEqual([{ id: 'a' }]);
    // A opção não vai para o fetch.
    expect(vi.mocked(globalThis.fetch).mock.calls.every(([, init]) => !(init && 'envelope' in init))).toBe(true);
  });
});
