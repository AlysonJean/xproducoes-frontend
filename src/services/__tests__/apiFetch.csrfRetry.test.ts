import { describe, it, expect, vi, afterEach } from 'vitest';
import { api, apiFetch } from '../api';

// Achado (produção): o cookie CSRF expira após 1h sem uso e o backend gera outro na próxima
// requisição; o apiFetch continuava mandando o token guardado e toda gravação (pagamento,
// status, importação) voltava 403 "CSRF token validation failed. Possible security breach."
// até recarregar a página.
describe('apiFetch — token CSRF vencido', () => {
  afterEach(() => vi.restoreAllMocks());

  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

  it('renova o token e repete a gravação uma vez', async () => {
    const getToken = vi.spyOn(api, 'get')
      .mockResolvedValueOnce({ data: { csrfToken: 'token-velho' } })
      .mockResolvedValueOnce({ data: { csrfToken: 'token-novo' } });
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json(403, { success: false, message: 'CSRF token validation failed. Possible security breach.' }))
      .mockResolvedValueOnce(json(200, { success: true, data: { id: 'b1', paymentStatus: 'PAID' } }));

    const res = await apiFetch('/bookings/b1', { method: 'PUT', body: JSON.stringify({ paymentStatus: 'PAID' }) });

    expect(res).toEqual({ id: 'b1', paymentStatus: 'PAID' });
    expect(getToken).toHaveBeenCalledTimes(2);
    const headersOf = (call: number) => (fetchMock.mock.calls[call][1] as RequestInit).headers as Record<string, string>;
    expect(headersOf(0)['X-CSRF-Token']).toBe('token-velho');
    expect(headersOf(1)['X-CSRF-Token']).toBe('token-novo');
  });

  it('403 que não é de CSRF (ex.: sem permissão) não é repetido', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: { csrfToken: 'qualquer' } });
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(403, { success: false, message: 'Acesso negado.' }));

    await expect(apiFetch('/bookings/b1', { method: 'PUT', body: '{}' })).rejects.toThrow('Acesso negado.');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
