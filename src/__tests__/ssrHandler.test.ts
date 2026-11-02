// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
// @ts-expect-error -- api/ssr.js é JavaScript puro (fora do tsc), sem declaração de tipos
import handler from '../../api/ssr.js';

const { renderPage } = vi.hoisted(() => ({ renderPage: vi.fn() }));
vi.mock('vike/server', () => ({ renderPage }));

const HTML = '<!DOCTYPE html><html><body>página</body></html>';

// O que o Vike devolve para a página única do app (pages/all): status 200 e Cache-Control "no-store".
function vikeResult(statusCode: number, extra: Record<string, unknown> = {}) {
  return {
    httpResponse: {
      statusCode,
      headers: [
        ['Content-Type', 'text/html;charset=utf-8'],
        ['Cache-Control', 'no-store, max-age=0'],
      ],
      body: HTML,
    },
    ...extra,
  };
}

// Imita só o que api/ssr.js usa da resposta da função serverless da Vercel.
function createResponse() {
  const response = {
    statusCode: undefined as number | undefined,
    headers: {} as Record<string, string>,
    body: undefined as unknown,
    setHeader(name: string, value: string) {
      response.headers[name.toLowerCase()] = value;
      return response;
    },
    status(code: number) {
      response.statusCode = code;
      return response;
    },
    send(body: unknown) {
      response.body = body;
      return response;
    },
    end() {
      return response;
    },
  };
  return response;
}

// Achado (auditoria ponta a ponta): o app inteiro é uma única página do Vike (rota "/*"), então o
// Vike respondia 200 para qualquer endereço, inclusive os que o React Router resolve para
// NotFoundPage. renderer/+onRenderHtml.tsx agora devolve pageContext.notFoundRendered, e este
// handler (a entrada de SSR de produção na Vercel) transforma isso em 404.
describe('api/ssr.js — status da resposta', () => {
  beforeEach(() => {
    renderPage.mockReset();
  });

  it('endereço que o app resolveu para NotFoundPage responde 404, com o mesmo HTML e cabeçalhos de página', async () => {
    renderPage.mockResolvedValue(vikeResult(200, { notFoundRendered: true }));
    const response = createResponse();

    await handler({ url: '/pagina-que-nao-existe' }, response);

    expect(renderPage).toHaveBeenCalledWith({ urlOriginal: '/pagina-que-nao-existe' });
    expect(response.statusCode).toBe(404);
    expect(response.body).toBe(HTML);
    expect(response.headers['content-type']).toBe('text/html;charset=utf-8');
    // O HTML do 404 é o mesmo para qualquer visitante: segue a política de cache das páginas
    // (o "no-store" do Vike não é repassado e vale a do vercel.json), como era quando saía 200.
    expect(response.headers['cache-control']).toBeUndefined();
  });

  it('página que existe continua 200', async () => {
    renderPage.mockResolvedValue(vikeResult(200, { notFoundRendered: false }));
    const response = createResponse();

    await handler({ url: '/sobre' }, response);

    expect(response.statusCode).toBe(200);
    expect(response.body).toBe(HTML);
  });

  it('erro do Vike continua 500 e sem cache, mesmo que NotFoundPage tenha aparecido', async () => {
    renderPage.mockResolvedValue(vikeResult(500, { notFoundRendered: true }));
    const response = createResponse();

    await handler({ url: '/pagina-que-nao-existe' }, response);

    expect(response.statusCode).toBe(500);
    expect(response.headers['cache-control']).toBe('no-store, max-age=0');
  });
});
