import { describe, it, expect, vi, afterEach } from 'vitest';
import { api, collaboratorsAPI } from '../api';

// Achado (revisão antes do deploy): collaboratorsAPI chamava /admin/collaborators*, rotas que o
// backend nunca teve — 404 na escala da reserva (colaboradores disponíveis na data). As rotas reais
// são /collaborators*. (O CRUD por aqui saiu na limpeza de 20/11/2026: nenhuma tela o chamava.)
describe('collaboratorsAPI — rotas reais do backend', () => {
  afterEach(() => vi.restoreAllMocks());

  it('disponíveis na data (escala da reserva) usa GET /collaborators/available', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue({ data: [] });

    await collaboratorsAPI.getAvailable('2026-12-05T20:00:00.000Z');

    expect(get).toHaveBeenCalledWith('/collaborators/available', {
      params: { date: '2026-12-05T20:00:00.000Z', role: undefined },
    });
  });
});
