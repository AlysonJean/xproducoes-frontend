import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CEP_RETRY_DELAY_MS, lookupCep } from '../briefing';

// Teste de 17/11/2026: um CEP que existe (30810-310) deu "Não achamos o endereço deste CEP" e na segunda vez completou.
// A falha do serviço tem uma segunda tentativa; o CEP que não existe e o 400 não repetem; a busca cancelada para.
const ENDERECO = { logradouro: 'Rua Flor D Água', bairro: 'Jardim Alvorada', localidade: 'Belo Horizonte', uf: 'MG' };
const ok = (data: unknown) => ({ ok: true, status: 200, json: async () => data });
const status = (code: number) => ({ ok: false, status: code, json: async () => ({}) });
const esperado = { street: 'Rua Flor D Água', neighborhood: 'Jardim Alvorada', city: 'Belo Horizonte', state: 'MG' };

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.useFakeTimers();
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

/** Roda a busca até o fim, passando a espera da segunda tentativa. */
async function buscar(cep = '30810-310', signal?: AbortSignal) {
  const pending = lookupCep(cep, signal);
  await vi.advanceTimersByTimeAsync(CEP_RETRY_DELAY_MS);
  return pending;
}

describe('lookupCep: segunda tentativa quando o ViaCEP falha', () => {
  it.each([
    ['erro de rede', () => Promise.reject(new TypeError('Failed to fetch'))],
    ['503', () => Promise.resolve(status(503))],
    ['429', () => Promise.resolve(status(429))],
    [
      'página de erro que não é JSON',
      () =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => {
            throw new SyntaxError('Unexpected token <');
          },
        }),
    ],
  ])('%s na primeira: tenta de novo e completa o endereço', async (_caso, primeira) => {
    fetchMock.mockImplementationOnce(primeira).mockResolvedValueOnce(ok(ENDERECO));

    expect(await buscar()).toEqual(esperado);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(2, 'https://viacep.com.br/ws/30810310/json/', expect.anything());
  });

  it('a segunda só sai depois da espera', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce(ok(ENDERECO));
    const pending = lookupCep('30810-310');
    await vi.advanceTimersByTimeAsync(CEP_RETRY_DELAY_MS - 1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(await pending).toEqual(esperado);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('falhou nas duas: null (a pessoa preenche à mão), sem uma terceira', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    expect(await buscar()).toBeNull();
    await vi.advanceTimersByTimeAsync(CEP_RETRY_DELAY_MS * 3);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['CEP que não existe ({ erro: true })', ok({ erro: true })],
    ['400 (CEP malformado)', status(400)],
    ['404', status(404)],
  ])('%s: null na primeira, sem repetir', async (_caso, resposta) => {
    fetchMock.mockResolvedValue(resposta);
    expect(await buscar()).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('busca cancelada durante a espera (outro CEP digitado): para na hora, sem a segunda', async () => {
    const controller = new AbortController();
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce(ok(ENDERECO));
    const pending = lookupCep('30810-310', controller.signal);
    await vi.advanceTimersByTimeAsync(CEP_RETRY_DELAY_MS / 2);
    controller.abort();
    expect(await pending).toBeNull();
    await vi.advanceTimersByTimeAsync(CEP_RETRY_DELAY_MS);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('busca cancelada no meio do pedido (AbortError): null, sem a segunda', async () => {
    const controller = new AbortController();
    fetchMock.mockImplementationOnce(() => {
      controller.abort();
      return Promise.reject(new DOMException('aborted', 'AbortError'));
    });
    expect(await buscar('30810-310', controller.signal)).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
