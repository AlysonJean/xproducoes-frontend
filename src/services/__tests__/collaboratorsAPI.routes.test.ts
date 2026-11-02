import { describe, it, expect, vi, afterEach } from 'vitest';
import { api, collaboratorsAPI } from '../api';

// Achado (revisão antes do deploy): collaboratorsAPI chamava /admin/collaborators*, rotas que o
// backend nunca teve — 404 na escala da reserva (colaboradores disponíveis na data) e em todo CRUD
// por aqui. As rotas reais são /collaborators*.
describe('collaboratorsAPI — rotas reais do backend', () => {
  afterEach(() => vi.restoreAllMocks());

  it('lista, detalhe, criação, edição e exclusão usam /collaborators', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue({ data: [] });
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: {} });
    const put = vi.spyOn(api, 'put').mockResolvedValue({ data: {} });
    const del = vi.spyOn(api, 'delete').mockResolvedValue({ data: {} });

    await collaboratorsAPI.getAll();
    await collaboratorsAPI.getById('c1');
    await collaboratorsAPI.create({ name: 'Ana' });
    await collaboratorsAPI.update('c1', { status: 'ACTIVE' });
    await collaboratorsAPI.delete('c1');

    expect(get.mock.calls.map((c) => c[0])).toEqual(['/collaborators', '/collaborators/c1']);
    expect(post).toHaveBeenCalledWith('/collaborators', { name: 'Ana' });
    expect(put).toHaveBeenCalledWith('/collaborators/c1', { status: 'ACTIVE' });
    expect(del).toHaveBeenCalledWith('/collaborators/c1');
  });

  it('disponíveis na data (escala da reserva) usa GET /collaborators/available', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue({ data: [] });

    await collaboratorsAPI.getAvailable('2026-12-05T20:00:00.000Z');

    expect(get).toHaveBeenCalledWith('/collaborators/available', {
      params: { date: '2026-12-05T20:00:00.000Z', role: undefined },
    });
  });
});
