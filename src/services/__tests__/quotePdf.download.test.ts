import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api, filenameFromDisposition, quotePdfAPI } from '../api';

// Orçamento em PDF (13/11/2026): o servidor gera o orçamento e o site só baixa. Antes a área do cliente, a ficha do
// painel e a Proposta Rápida montavam cada uma o seu PDF no navegador (jsPDF), e a página da proposta não tinha PDF.
// O pedido passa pelo mesmo caminho do apiFetch (cookies, CSRF, mensagem e status do erro).
const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]); // "%PDF-"
const pdfResponse = (headers: Record<string, string> = {}) =>
  new Response(PDF, { status: 200, headers: { 'Content-Type': 'application/pdf', ...headers } });
const json = (status: number, body: object) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

let clicks: Array<{ href: string; download: string }>;

beforeEach(() => {
  clicks = [];
  vi.spyOn(api, 'get').mockResolvedValue({ data: { csrfToken: 'tok' } });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    clicks.push({ href: this.href, download: this.download });
  });
  Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:http://localhost/orcamento'), revokeObjectURL: vi.fn() });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('orçamento em PDF — download pelo site', () => {
  it('pela página da proposta: POST /proposals/pdf com o código no CORPO, referrerPolicy "origin" e CSRF; o nome vem do servidor', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(pdfResponse({ 'Content-Disposition': 'attachment; filename="orcamento-XP-ANA-1.pdf"' }));

    await quotePdfAPI.fromProposal('p1.TESTE');

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/proposals\/pdf$/);
    expect(String(url)).not.toContain('p1.TESTE');
    expect(init).toMatchObject({ method: 'POST', body: JSON.stringify({ token: 'p1.TESTE' }), referrerPolicy: 'origin', credentials: 'include' });
    expect((init?.headers as Record<string, string>)['X-CSRF-Token']).toBe('tok');
    expect(clicks).toEqual([{ href: 'blob:http://localhost/orcamento', download: 'orcamento-XP-ANA-1.pdf' }]);
    const blob = vi.mocked(URL.createObjectURL).mock.calls[0][0] as Blob;
    expect(blob.type).toBe('application/pdf');
  });

  it('área do cliente e ficha: GET nas rotas da reserva; sem o cabeçalho, o nome orcamento-<código>.pdf', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => pdfResponse());

    await quotePdfAPI.forClient('XP-ANA-20271220-2200-AB1');
    await quotePdfAPI.forAdmin('ckabc1234567890');

    expect(fetchMock.mock.calls.map(([url, init]) => [String(url).replace(/^.*\/api\/v1/, ''), init?.method ?? 'GET'])).toEqual([
      ['/bookings/XP-ANA-20271220-2200-AB1/quote-pdf', 'GET'],
      ['/admin/bookings/ckabc1234567890/quote-pdf', 'GET'],
    ]);
    expect(clicks.map((c) => c.download)).toEqual(['orcamento-XP-ANA-20271220-2200-AB1.pdf', 'orcamento-ckabc123.pdf']);
  });

  it('erro do servidor: a mensagem e o status vão no erro (link vencido, 410), e nada é baixado', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(410, { success: false, error: 'PROPOSAL_GONE', message: 'Este link venceu ou foi trocado. Peça um novo link à equipe.' }));

    const error = await quotePdfAPI.fromProposal('p1.TESTE').catch((e: unknown) => e);

    expect((error as Error).message).toBe('Este link venceu ou foi trocado. Peça um novo link à equipe.');
    expect((error as { status?: number }).status).toBe(410);
    expect(clicks).toEqual([]);
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('o endereço do arquivo é solto depois de um minuto, não na hora (soltar na hora cancela o download)', async () => {
    vi.useFakeTimers();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(pdfResponse());

    await quotePdfAPI.forClient('XP-1');

    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    vi.advanceTimersByTime(60_000);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/orcamento');
  });

  it('nome do arquivo no Content-Disposition', () => {
    expect(filenameFromDisposition('attachment; filename="orcamento-XP-1.pdf"')).toBe('orcamento-XP-1.pdf');
    expect(filenameFromDisposition('attachment; filename=orcamento.pdf')).toBe('orcamento.pdf');
    expect(filenameFromDisposition(null)).toBeNull();
  });
});
