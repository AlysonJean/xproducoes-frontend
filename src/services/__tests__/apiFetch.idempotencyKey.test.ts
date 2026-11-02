import { describe, it, expect, vi, afterEach } from 'vitest';
import { api, apiFetch } from '../api';

// A Proposta Rápida (AdminQuickProposalPage) repete a mesma Idempotency-Key ao tentar de novo o
// mesmo envio; isso depende de o apiFetch manter a chave recebida em vez de gerar outra.
describe('apiFetch — Idempotency-Key enviada por quem chama', () => {
  afterEach(() => vi.restoreAllMocks());

  it('mantém a chave recebida e só gera uma quando não vem nenhuma', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: { csrfToken: 'c1' } });
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      new Response(JSON.stringify({ success: true, data: { id: 'b1' } }), { status: 201, headers: { 'Content-Type': 'application/json' } }));

    await expect(apiFetch('/bookings', { method: 'POST', body: '{}', headers: { 'Idempotency-Key': 'envio-1' } }))
      .resolves.toEqual({ id: 'b1' });
    await apiFetch('/bookings', { method: 'POST', body: '{}' });

    const chaveDa = (call: number) =>
      ((fetchMock.mock.calls[call][1] as RequestInit).headers as Record<string, string>)['Idempotency-Key'];
    expect(chaveDa(0)).toBe('envio-1');
    expect(chaveDa(1)).toEqual(expect.any(String));
    expect(chaveDa(1)).not.toBe('envio-1');
  });
});
