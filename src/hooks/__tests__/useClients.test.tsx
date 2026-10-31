import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const { clientAPI } = vi.hoisted(() => ({ clientAPI: { getAll: vi.fn(), delete: vi.fn() } }));
vi.mock('../../services/api', () => ({ clientAPI }));

import { useClients } from '../useClients';

// GET /admin/clients pagina (em produção, 50 por padrão; máx. 100) e o interceptor do axios
// descarta o `meta`. A tela de Clientes pedia só a 1ª página e filtra no navegador — com cada
// orçamento sem cadastro criando uma conta, os clientes além dos 50 primeiros sumiam da lista.
const page = (n: number, start = 0) => ({ data: Array.from({ length: n }, (_, i) => ({ id: `cli${start + i}`, name: `C${start + i}` })) });

describe('useClients.fetchClients — todas as páginas', () => {
  beforeEach(() => clientAPI.getAll.mockReset());

  it('busca de 100 em 100 até vir uma página incompleta', async () => {
    clientAPI.getAll.mockResolvedValueOnce(page(100)).mockResolvedValueOnce(page(20, 100));
    const { result } = renderHook(() => useClients());

    await act(async () => { await result.current.fetchClients(); });

    expect(result.current.clients).toHaveLength(120);
    expect(clientAPI.getAll.mock.calls.map((c) => c[0])).toEqual([{ page: 1, pageSize: 100 }, { page: 2, pageSize: 100 }]);
  });

  it('repassa os filtros em todas as páginas', async () => {
    clientAPI.getAll.mockResolvedValueOnce(page(3));
    const { result } = renderHook(() => useClients());
    await act(async () => { await result.current.fetchClients({ industry: 'eventos' }); });
    expect(clientAPI.getAll).toHaveBeenCalledWith({ industry: 'eventos', page: 1, pageSize: 100 });
  });
});
