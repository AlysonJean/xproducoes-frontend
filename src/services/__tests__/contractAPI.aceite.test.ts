import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api, apiFetch, contractAPI, readApiError } from '../api';
import type { ContractParty } from '../../types/contract';

// Aceite online (13/11/2026): as chamadas do "CONTRATO DA API" (roteiro da leva B). Na página da proposta o código do
// link vai sempre no CORPO (nunca no endereço), com CSRF e referrerPolicy "origin", como no /proposals/view. O erro
// leva o corpo JSON (code, attemptsLeft, fieldErrors, retryAfter), que o aceite lê para dizer o que houve.
const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]); // "%PDF-"
const json = (status: number, body: object, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });
const pdfResponse = (headers: Record<string, string> = {}) =>
  new Response(PDF, { status: 200, headers: { 'Content-Type': 'application/pdf', ...headers } });
const path = (url: unknown) => String(url).replace(/^.*\/api\/v1/, '');

const PARTY: ContractParty = {
  personType: 'PF',
  name: 'Ana Souza',
  document: '52998224725',
  email: 'ana@cliente.test',
  phone: '31988887777',
  address: { street: 'Rua A', number: '10', neighborhood: 'Savassi', city: 'Belo Horizonte', state: 'MG', zipCode: '30140000' },
  purpose: 'OWN_EVENT',
};

let clicks: Array<{ href: string; download: string }>;

beforeEach(() => {
  clicks = [];
  vi.spyOn(api, 'get').mockResolvedValue({ data: { csrfToken: 'tok' } });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    clicks.push({ href: this.href, download: this.download });
  });
  Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:http://localhost/contrato'), revokeObjectURL: vi.fn() });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('contractAPI — página da proposta', () => {
  it('prepare, otp, accept e withdraw: POST com o código no corpo, CSRF e referrerPolicy "origin"', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => json(200, { success: true, data: { ok: true } }));

    await contractAPI.prepare('p1.TESTE', PARTY);
    await contractAPI.sendCode('p1.TESTE', 'ct1');
    await contractAPI.accept('p1.TESTE', { contractId: 'ct1', sha256: 'abc123', code: '123456' });
    await contractAPI.withdraw('p1.TESTE');

    const calls = fetchMock.mock.calls.map(([url, init]) => ({ path: path(url), init: init as RequestInit }));
    expect(calls.map((c) => c.path)).toEqual([
      '/proposals/contract/prepare',
      '/proposals/contract/otp',
      '/proposals/contract/accept',
      '/proposals/contract/withdraw',
    ]);
    calls.forEach(({ path: p, init }) => {
      expect(p).not.toContain('p1.TESTE');
      expect(init).toMatchObject({ method: 'POST', referrerPolicy: 'origin', credentials: 'include' });
      expect((init.headers as Record<string, string>)['X-CSRF-Token']).toBe('tok');
    });
    expect(JSON.parse(calls[0].init.body as string)).toEqual({ token: 'p1.TESTE', party: PARTY });
    expect(JSON.parse(calls[1].init.body as string)).toEqual({ token: 'p1.TESTE', contractId: 'ct1' });
    expect(JSON.parse(calls[2].init.body as string)).toEqual({ token: 'p1.TESTE', contractId: 'ct1', sha256: 'abc123', code: '123456', agreed: true });
    expect(JSON.parse(calls[3].init.body as string)).toEqual({ token: 'p1.TESTE' });
  });

  it('pdf: o arquivo exato preparado (Blob) e o nome do servidor; download baixa o mesmo endereço', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () => pdfResponse({ 'Content-Disposition': 'attachment; filename="contrato-XP-ANA-1.pdf"' }));

    const { blob, filename } = await contractAPI.pdf('p1.TESTE', 'ct1');
    await contractAPI.download('p1.TESTE', 'ct1');

    expect(blob.type).toBe('application/pdf');
    expect(blob.size).toBe(PDF.length);
    expect(filename).toBe('contrato-XP-ANA-1.pdf');
    expect(fetchMock.mock.calls.map(([url]) => path(url))).toEqual(['/proposals/contract/pdf', '/proposals/contract/pdf']);
    expect(JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)).toEqual({ token: 'p1.TESTE', contractId: 'ct1' });
    fetchMock.mock.calls.forEach(([url, init]) => {
      expect(String(url)).not.toContain('p1.TESTE');
      expect(init).toMatchObject({ method: 'POST', referrerPolicy: 'origin' });
      expect(((init as RequestInit).headers as Record<string, string>)['X-CSRF-Token']).toBe('tok');
    });
    expect(clicks).toEqual([{ href: 'blob:http://localhost/contrato', download: 'contrato-XP-ANA-1.pdf' }]);
  });
});

describe('contractAPI — área do cliente e ficha', () => {
  it('rotas da reserva: contrato, PDF (nome contrato-<código>.pdf), desistência e reenvio', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) =>
      String(url).endsWith('.pdf') ? pdfResponse() : json(200, { success: true, data: {} }),
    );

    await contractAPI.forClient('XP-ANA-1');
    await contractAPI.downloadForClient('XP-ANA-1');
    await contractAPI.withdrawForClient('XP-ANA-1');
    await contractAPI.forAdmin('ckabc1234567890');
    await contractAPI.downloadForAdmin('ckabc1234567890');
    await contractAPI.resend('ckabc1234567890');

    expect(fetchMock.mock.calls.map(([url, init]) => [path(url), (init as RequestInit).method ?? 'GET'])).toEqual([
      ['/bookings/XP-ANA-1/contract', 'GET'],
      ['/bookings/XP-ANA-1/contract.pdf', 'GET'],
      ['/bookings/XP-ANA-1/contract/withdraw', 'POST'],
      ['/admin/bookings/ckabc1234567890/contract', 'GET'],
      ['/admin/bookings/ckabc1234567890/contract.pdf', 'GET'],
      ['/admin/bookings/ckabc1234567890/contract/resend', 'POST'],
    ]);
    expect(clicks.map((c) => c.download)).toEqual(['contrato-XP-ANA-1.pdf', 'contrato-ckabc123.pdf']);
    // Desistência e reenvio: corpo "{}" e CSRF, como toda gravação.
    [fetchMock.mock.calls[2], fetchMock.mock.calls[5]].forEach(([, init]) => {
      expect((init as RequestInit).body).toBe('{}');
      expect(((init as RequestInit).headers as Record<string, string>)['X-CSRF-Token']).toBe('tok');
    });
  });

  it('o nome do arquivo que vem do servidor é limpo antes de virar o nome do arquivo salvo', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      pdfResponse({ 'Content-Disposition': 'attachment; filename="../../contrato final.exe"' }),
    );

    await contractAPI.downloadForClient('XP-ANA-1');

    expect(clicks.map((c) => c.download)).toEqual(['contrato-final.exe.pdf']);
  });
});

describe('readApiError — o corpo do erro vai junto', () => {
  it('INVALID_CODE com as tentativas restantes (o corpo do servidor: success, error, code, message)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      json(400, { success: false, error: 'INVALID_CODE', code: 'INVALID_CODE', message: 'Código errado.', attemptsLeft: 2 }),
    );

    const info = readApiError(await apiFetch('/proposals/contract/accept', { method: 'POST', body: '{}' }).catch((e: unknown) => e));

    expect(info).toMatchObject({ status: 400, code: 'INVALID_CODE', message: 'Código errado.', attemptsLeft: 2 });
  });

  it('sem code no corpo (página de erro, outro formato): code e attemptsLeft nulos', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(409, { success: false, message: 'A proposta mudou.' }));

    const info = readApiError(await apiFetch('/proposals/contract/accept', { method: 'POST', body: '{}' }).catch((e: unknown) => e));

    expect(info).toMatchObject({ status: 409, code: null, message: 'A proposta mudou.', attemptsLeft: null, fieldErrors: {} });
  });

  it('erros por campo: fieldErrors com as chaves do corpo ("party.document", "party.address.zipCode"...)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      json(400, {
        code: 'VALIDATION_ERROR',
        message: 'Confira os dados destacados.',
        fieldErrors: { 'party.document': 'CPF inválido.', 'party.address.zipCode': 'Informe o CEP com 8 dígitos.', vazio: '' },
      }),
    );

    const info = readApiError(await apiFetch('/x', { method: 'POST', body: '{}' }).catch((e: unknown) => e));

    expect(info.fieldErrors).toEqual({ 'party.document': 'CPF inválido.', 'party.address.zipCode': 'Informe o CEP com 8 dígitos.' });
  });

  it('429: retryAfter do corpo ou o cabeçalho Retry-After', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    fetchMock.mockResolvedValueOnce(json(429, { code: 'OTP_RATE_LIMIT', message: 'Aguarde.', retryAfter: 42 }, { 'Retry-After': '42' }));
    fetchMock.mockResolvedValueOnce(json(429, { message: 'Aguarde.' }, { 'Retry-After': '30' }));

    const first = readApiError(await apiFetch('/x', { method: 'POST', body: '{}' }).catch((e: unknown) => e));
    const second = readApiError(await apiFetch('/x', { method: 'POST', body: '{}' }).catch((e: unknown) => e));

    expect(first).toMatchObject({ status: 429, retryAfterSeconds: 42, message: 'Aguarde.' });
    expect(second.retryAfterSeconds).toBe(30);
  });
});
