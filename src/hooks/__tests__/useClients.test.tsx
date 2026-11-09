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

// D8c (aprovada em 02/11/2026), parte 2: o "Excluir cliente" pode apagar, anonimizar ou deixar para depois (202). O
// interceptor do axios entrega só o data: { outcome, until, message }.
describe('useClients.deleteClient — resultado do servidor', () => {
  const lista = { data: [{ id: 'c1', name: 'Ana' }, { id: 'c2', name: 'Bia' }] };
  beforeEach(() => {
    clientAPI.getAll.mockReset();
    clientAPI.delete.mockReset();
  });

  it('anonimizado ou apagado: sai da lista e devolve o texto do servidor', async () => {
    clientAPI.getAll.mockResolvedValueOnce(lista);
    clientAPI.delete.mockResolvedValueOnce({ data: { outcome: 'anonymized', message: 'Cliente anonimizado.' } });
    const { result } = renderHook(() => useClients());
    await act(async () => { await result.current.fetchClients(); });

    let resposta: unknown;
    await act(async () => { resposta = await result.current.deleteClient('c1'); });

    expect(resposta).toEqual({ outcome: 'anonymized', message: 'Cliente anonimizado.' });
    expect(result.current.clients.map((c) => c.id)).toEqual(['c2']);
  });

  it('adiado: continua na lista, com a marca de exclusão agendada', async () => {
    clientAPI.getAll.mockResolvedValueOnce(lista);
    clientAPI.delete.mockResolvedValueOnce({ data: { outcome: 'postponed', until: null, message: 'Exclusão adiada.' } });
    const { result } = renderHook(() => useClients());
    await act(async () => { await result.current.fetchClients(); });

    await act(async () => { await result.current.deleteClient('c1'); });

    expect(result.current.clients.map((c) => c.id)).toEqual(['c1', 'c2']);
    expect(result.current.clients[0].deletionScheduledAt).toEqual(expect.any(String));
    expect(result.current.clients[1].deletionScheduledAt).toBeUndefined();
  });
});
