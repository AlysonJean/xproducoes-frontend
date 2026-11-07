import { describe, it, expect, vi, afterEach } from 'vitest';
import { apiFetch } from '../api';

// P15 (aprovada em 02/11/2026): a página /proposta separa "link inválido" (404), "venceu ou foi trocado" (410) e
// "indisponível" (503) pelo status HTTP, que o erro do apiFetch não trazia. E o pedido sai com referrerPolicy
// "origin": a página tem no-referrer; pela especificação Fetch, o fetch em modo "cors" já manda o Origin com a origem
// do site, e o referrerPolicy garante isso também num navegador que aplicasse o no-referrer ao Origin (sem o Origin,
// a conferência de origem do CSRF recusaria). O Referer leva só a origem; o fragmento nunca vai.
const json = (status: number, body: object) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const isCsrf = (url: unknown) => String(url).includes('csrf');

describe('apiFetch: status do erro e opções do fetch', () => {
  afterEach(() => vi.restoreAllMocks());

  it.each([404, 410, 503])('erro %i: a mensagem da API continua e o status vai junto', async (status) => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) =>
      isCsrf(url) ? json(200, { csrfToken: 'tok' }) : json(status, { success: false, message: 'Mensagem da API.' }),
    );

    const error = await apiFetch('/proposals/view', { method: 'POST', body: '{}' }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe('Mensagem da API.');
    expect((error as { status?: number }).status).toBe(status);
  });

  it('o referrerPolicy e o corpo chegam ao fetch, e o endereço é só o da rota', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) =>
      isCsrf(url) ? json(200, { csrfToken: 'tok' }) : json(200, { success: true, data: { state: 'closed' } }),
    );

    await expect(
      apiFetch('/proposals/view', { method: 'POST', body: JSON.stringify({ token: 'p1.TESTE' }), referrerPolicy: 'origin' }),
    ).resolves.toEqual({ state: 'closed' });

    const call = fetchMock.mock.calls.find(([url]) => String(url).includes('/proposals/view'));
    expect(String(call?.[0])).toMatch(/\/proposals\/view$/);
    expect(call?.[1]).toMatchObject({ method: 'POST', body: JSON.stringify({ token: 'p1.TESTE' }), referrerPolicy: 'origin' });
  });
});
