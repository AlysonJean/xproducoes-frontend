import { describe, it, expect, vi, afterEach } from 'vitest';
import { apiFetch } from '../api';

const FRIENDLY = 'Não conseguimos falar com o servidor agora. Aguarde alguns instantes e tente de novo.';
const HTML_502 = '<!DOCTYPE html><html lang="en"><head><title>502</title><style>@font-face { font-family: "Roobert"; }</style></head><body><h1>Bad Gateway</h1></body></html>';
const html = (status: number) => new Response(HTML_502, { status, headers: { 'Content-Type': 'text/html' } });
const isCsrf = (url: unknown) => String(url).includes('csrf');

describe('apiFetch: página de erro do proxy (502/503/504)', () => {
  afterEach(() => vi.restoreAllMocks());

  it.each([502, 503, 504])('%i em HTML vira mensagem clara, sem tags, código ou nome de fornecedor', async (status) => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => html(status));

    const error = await apiFetch('/dashboard/monthly-revenue?year=2026').catch((e: Error) => e);

    expect((error as Error).message).toBe(FRIENDLY);
    expect((error as Error).message).not.toMatch(/<|Render|Vercel|Gateway|\d{3}/);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('GET repete e segue normalmente se a falha passar', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(html(502))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: [{ month: 1, revenue: 1000 }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }));

    await expect(apiFetch('/dashboard/monthly-revenue?year=2026')).resolves.toEqual([{ month: 1, revenue: 1000 }]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each(['POST', 'PUT', 'PATCH', 'DELETE'])('%s não repete: o pedido pode já ter sido gravado', async (method) => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) =>
      isCsrf(url)
        ? new Response(JSON.stringify({ csrfToken: 'tok' }), { status: 200, headers: { 'Content-Type': 'application/json' } })
        : html(502),
    );

    await expect(apiFetch('/bookings', { method, body: '{}' })).rejects.toThrow(FRIENDLY);

    expect(fetchMock.mock.calls.filter(([url]) => !isCsrf(url))).toHaveLength(1);
  });

  it('mensagem em JSON da API continua igual, sem repetir', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      new Response(JSON.stringify({ success: false, message: 'Ano inválido para consulta.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(apiFetch('/dashboard/monthly-revenue?year=invalid')).rejects.toThrow('Ano inválido para consulta.');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('503 da API com mensagem em JSON mantém a mensagem da API', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      new Response(JSON.stringify({ message: 'Sistema em manutenção.' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(apiFetch('/settings')).rejects.toThrow('Sistema em manutenção.');
  });
});
