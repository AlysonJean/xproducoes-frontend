import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api, apiFetch } from '../api';

// Auditoria completa (19/11/2026): a falha de rede (TypeError: Failed to fetch) era repetida em qualquer método, contra o
// comentário "POST e afins não repetem aqui". A queda pode vir depois de o servidor gravar: o pedido de orçamento, o
// cadastro e o código por e-mail saíam em dobro. Agora só GET e HEAD repetem; o resto falha de uma vez, numa chamada só.
const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });

describe('apiFetch — falha de rede só repete em GET/HEAD', () => {
  beforeEach(() => {
    // O token CSRF vem pelo axios (api.get), fora do fetch contado aqui.
    vi.spyOn(api, 'get').mockResolvedValue({ data: { csrfToken: 'csrf-1' } });
  });

  afterEach(() => vi.restoreAllMocks());

  it.each(['POST', 'PUT', 'PATCH', 'DELETE'])('%s: falha de rede sobe na hora, depois de um fetch só', async (method) => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));

    // Onda 4 da auditoria de 19/11 (F1-16): a queda de rede chega em português (o TypeError original vai em `cause`).
    await expect(apiFetch('/bookings', { method, body: '{}' })).rejects.toThrow('Sem conexão com o servidor. Confira a internet e tente de novo.');

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('POST com "Network Error" (mensagem, não TypeError): também não repete', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network Error'));

    await expect(apiFetch('/auth/register', { method: 'POST', body: '{}' })).rejects.toThrow('Network Error');

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('GET: a falha de rede passageira é repetida e a resposta chega', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(json({ success: true, data: [{ id: 'k1' }] }));

    await expect(apiFetch('/kits')).resolves.toEqual([{ id: 'k1' }]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('GET: a rede que não volta para nas 3 tentativas e sobe o erro', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(apiFetch('/kits')).rejects.toThrow('Sem conexão com o servidor. Confira a internet e tente de novo.');

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
