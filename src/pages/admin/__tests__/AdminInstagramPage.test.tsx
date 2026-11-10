import type React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { configure, render, screen, cleanup, within, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const { apiFetch, addNotification } = vi.hoisted(() => ({ apiFetch: vi.fn(), addNotification: vi.fn() }));
vi.mock('../../../services/api', () => ({ apiFetch }));
vi.mock('../../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../../components/admin/AdminLayout', () => {
  const Passthrough = ({ children }: { children: React.ReactNode }) => <>{children}</>;
  return { default: Passthrough, AdminLayout: Passthrough };
});

import { AdminInstagramPage } from '../AdminInstagramPage';

// Páginas inteiras: com a suíte toda rodando em paralelo, a primeira renderização passa de 1 s.
configure({ asyncUtilTimeout: 5000 });
vi.setConfig({ testTimeout: 20_000 });

// Pedido do dono de 09/11/2026 (Instagram): o painel /admin/instagram liga o Instagram (o dono cola o token gerado no
// painel da Meta; o token nunca volta para a tela), mostra a situação da conexão, a hashtag do Portfólio, o
// "Sincronizar agora" e as publicações importadas com ocultar, fixar e virar projeto. As dicas são só sugestões.

// gitleaks: valores de campos com "token" ficam com menos de 10 caracteres.
const TYPED = 'IGtok12';
const SAVED = 'SAVEDtk1';
// Datas da conexão em constantes: os campos têm "token" no nome.
const EXPIRES_AT = '2027-01-08T15:00:00.000Z';
const REFRESHED_AT = '2026-11-09T15:00:00.000Z';

const baseStatus = {
  connected: true,
  status: 'ok',
  username: 'x_producoeseventos',
  accountType: 'BUSINESS',
  tokenExpiresAt: EXPIRES_AT,
  tokenRefreshedAt: REFRESHED_AT,
  refreshError: null,
  lastCheckAt: '2026-11-09T17:17:00.000Z',
  lastSyncAt: '2026-11-09T16:17:00.000Z',
  lastSyncError: null,
  portfolioHashtag: 'portfolioX',
  syncRunning: false,
  counts: { total: 3, visible: 2, hidden: 1, inPortfolio: 1 },
};
const disconnected = {
  ...baseStatus,
  connected: false,
  status: 'disconnected',
  username: null,
  accountType: null,
  tokenExpiresAt: null,
  tokenRefreshedAt: null,
  lastCheckAt: null,
  lastSyncAt: null,
};

const IMG = (id: string) => `https://res.cloudinary.com/xprod/image/upload/v1/x-producoes/instagram/${id}.jpg`;
const postA = {
  id: 'pA',
  igMediaId: '1789001',
  mediaType: 'CAROUSEL_ALBUM',
  caption: 'Casamento no sítio\nSom e luz para 200 convidados #portfolioX',
  permalink: 'https://www.instagram.com/p/AAA1/',
  postedAt: '2026-11-08T15:00:00.000Z',
  imageUrl: IMG('1789001'),
  isHidden: false,
  isPinned: false,
  removedAt: null,
  portfolio: null,
  media: [],
};
const postB = {
  ...postA,
  id: 'pB',
  igMediaId: '1789002',
  mediaType: 'VIDEO',
  caption: 'Montagem do palco',
  permalink: 'https://www.instagram.com/reel/BBB2/',
  postedAt: '2026-11-01T15:00:00.000Z',
  imageUrl: IMG('1789002'),
  isHidden: true,
  isPinned: true,
  portfolio: { id: 'pf9', slug: 'montagem-do-palco', title: 'Montagem do palco' },
};
const postC = {
  ...postA,
  id: 'pC',
  igMediaId: '1789003',
  mediaType: 'IMAGE',
  caption: null,
  permalink: 'https://www.instagram.com/p/CCC3/',
  postedAt: '2026-10-20T15:00:00.000Z',
  imageUrl: IMG('1789003'),
  removedAt: '2026-11-09T10:00:00.000Z',
};

type Route = unknown | ((init?: RequestInit) => unknown);
function mockApi(routes: Record<string, Route>) {
  apiFetch.mockImplementation((endpoint: string, init?: RequestInit) => {
    const route = `${(init?.method || 'GET').toUpperCase()} ${endpoint}`;
    if (!(route in routes)) return Promise.reject(new Error(`rota inesperada no teste: ${route}`));
    try {
      const value = routes[route];
      const out = typeof value === 'function' ? (value as (init?: RequestInit) => unknown)(init) : value;
      return out instanceof Promise ? out : Promise.resolve(out);
    } catch (err) {
      return Promise.reject(err);
    }
  });
}

const callsTo = (method: string, endpoint: string) =>
  apiFetch.mock.calls.filter(([url, init]) => url === endpoint && ((init as RequestInit | undefined)?.method || 'GET') === method);

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/admin/instagram']}>
      <AdminInstagramPage />
    </MemoryRouter>
  );

const rowOf = (text: string) => screen.getByText(text).closest('li') as HTMLElement;

beforeEach(() => {
  apiFetch.mockReset();
  addNotification.mockReset();
  window.localStorage.clear();
  window.sessionStorage.clear();
});
afterEach(() => cleanup());

describe('Painel do Instagram — situação da conexão', () => {
  it('não conectado: explica o que fazer, pede o token e não deixa sincronizar', async () => {
    mockApi({ 'GET /admin/instagram/status': disconnected, 'GET /admin/instagram/posts': { posts: [] } });
    renderPage();

    expect(await screen.findByText('Não conectado')).toBeInTheDocument();
    expect(screen.getByText(/O Instagram ainda não está conectado/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Conectar' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Desconectar' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Sincronizar agora' })).toBeDisabled();
    expect(screen.getByText('Conecte o Instagram para sincronizar.')).toBeInTheDocument();
    expect(await screen.findByText(/Nenhuma publicação importada ainda/)).toBeInTheDocument();
  });

  it('conectado: @conta, tipo da conta, validade da conexão e horários da sincronização', async () => {
    mockApi({ 'GET /admin/instagram/status': baseStatus, 'GET /admin/instagram/posts': { posts: [] } });
    renderPage();

    expect(await screen.findByText('Conectado')).toBeInTheDocument();
    expect(screen.getByText('@x_producoeseventos · conta Empresa')).toBeInTheDocument();
    expect(screen.getByText('08/01/2027')).toBeInTheDocument();
    expect(screen.getByText(/o sistema renova sozinho antes de vencer/)).toBeInTheDocument();
    expect(screen.getByText('09/11/2026 às 14:17')).toBeInTheDocument();
    expect(screen.getByText('09/11/2026 às 13:17')).toBeInTheDocument();
    expect(screen.getByText('3 (2 no site, 1 oculta, 1 no Portfólio)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Desconectar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sincronizar agora' })).toBeEnabled();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('renovação com problema: aviso amarelo, até quando vale e o detalhe técnico', async () => {
    mockApi({
      'GET /admin/instagram/status': { ...baseStatus, status: 'refresh_failing', refreshError: 'HTTP 500 · código 2 · Service temporarily unavailable' },
      'GET /admin/instagram/posts': { posts: [] },
    });
    renderPage();

    expect(await screen.findByText('Conectado, com aviso')).toBeInTheDocument();
    expect(screen.getByText('O sistema não conseguiu renovar a conexão')).toBeInTheDocument();
    expect(screen.getByText(/A conexão continua funcionando até 08\/01\/2027/)).toBeInTheDocument();
    expect(screen.getByText(/gere um token novo no painel da Meta/)).toBeInTheDocument();
    expect(screen.getByText('Detalhe técnico: HTTP 500 · código 2 · Service temporarily unavailable')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sincronizar agora' })).toBeEnabled();
  });

  it('conexão vencida: aviso vermelho, o que já foi importado continua no site e a sincronização fica parada', async () => {
    mockApi({
      'GET /admin/instagram/status': { ...baseStatus, status: 'expired', refreshError: 'HTTP 400 · código 190 · Error validating access token' },
      'GET /admin/instagram/posts': { posts: [] },
    });
    renderPage();

    expect(await screen.findByText('Conexão vencida')).toBeInTheDocument();
    expect(screen.getByText('A conexão com o Instagram venceu ou foi cancelada')).toBeInTheDocument();
    expect(screen.getByText(/As publicações já importadas continuam no site, mas as novas não chegam/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sincronizar agora' })).toBeDisabled();
    expect(screen.getByText('Cole um token novo para voltar a sincronizar.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Trocar token' })).toBeInTheDocument();
  });

  it('erro da última busca aparece em palavras simples, com o detalhe técnico', async () => {
    mockApi({
      'GET /admin/instagram/status': { ...baseStatus, lastSyncError: 'HTTP 403 · código 10 · Permission denied' },
      'GET /admin/instagram/posts': { posts: [] },
    });
    renderPage();
    expect(await screen.findByText('A última busca no Instagram deu erro')).toBeInTheDocument();
    expect(screen.getByText(/O sistema tenta de novo sozinho na próxima hora/)).toBeInTheDocument();
    expect(screen.getByText('Detalhe técnico: HTTP 403 · código 10 · Permission denied')).toBeInTheDocument();
  });
});

describe('Painel do Instagram — token', () => {
  it('envia o token colado, limpa o campo e nunca mostra token (nem o salvo, nem o digitado)', async () => {
    mockApi({
      // Mesmo que o servidor mandasse algo com o token, nada disso chega à tela.
      'GET /admin/instagram/status': { ...disconnected, accessToken: SAVED, accessTokenEnc: 'enc:xyz1' },
      'GET /admin/instagram/posts': { posts: [] },
      'POST /admin/instagram/connection': { ...baseStatus },
    });
    renderPage();

    const input = (await screen.findByLabelText('Token de acesso do Instagram')) as HTMLInputElement;
    expect(input).toHaveAttribute('type', 'password');
    expect(input).toHaveAttribute('autocomplete', 'off');
    expect(input.value).toBe('');

    fireEvent.change(input, { target: { value: `  ${TYPED} ` } });
    fireEvent.click(screen.getByRole('button', { name: 'Conectar' }));

    await waitFor(() => expect(callsTo('POST', '/admin/instagram/connection')).toHaveLength(1));
    expect(callsTo('POST', '/admin/instagram/connection')[0][1]).toMatchObject({
      method: 'POST',
      body: JSON.stringify({ accessToken: TYPED }),
    });
    expect(input.value).toBe('');
    expect(await screen.findByText(/Instagram conectado. A primeira importação começou/)).toBeInTheDocument();
    expect(await screen.findByText('Conectado')).toBeInTheDocument();
    expect(screen.getByLabelText('Trocar o token de acesso')).toHaveValue('');

    const page = document.body.innerHTML;
    for (const secret of [TYPED, SAVED, 'enc:xyz1']) {
      expect(page).not.toContain(secret);
      expect(JSON.stringify({ ...window.localStorage })).not.toContain(secret);
      expect(JSON.stringify({ ...window.sessionStorage })).not.toContain(secret);
    }
    expect(Array.from(document.querySelectorAll('input')).map((el) => el.value)).not.toContain(TYPED);
    expect(JSON.stringify(addNotification.mock.calls)).not.toContain(TYPED);
  });

  it('token recusado: mostra a mensagem do servidor e o campo também fica vazio', async () => {
    mockApi({
      'GET /admin/instagram/status': disconnected,
      'GET /admin/instagram/posts': { posts: [] },
      'POST /admin/instagram/connection': () => {
        throw Object.assign(new Error('Token inválido ou vencido. Gere um novo no painel da Meta.'), { status: 400 });
      },
    });
    renderPage();

    const input = (await screen.findByLabelText('Token de acesso do Instagram')) as HTMLInputElement;
    fireEvent.change(input, { target: { value: TYPED } });
    fireEvent.click(screen.getByRole('button', { name: 'Conectar' }));

    expect(await screen.findByText('Token inválido ou vencido. Gere um novo no painel da Meta.')).toBeInTheDocument();
    expect(input.value).toBe('');
    expect(screen.getByText('Não conectado')).toBeInTheDocument();
    expect(document.body.innerHTML).not.toContain(TYPED);
  });

  it('token com formato recusado pela validação do servidor (400 genérico): frase que diz o que fazer', async () => {
    mockApi({
      'GET /admin/instagram/status': disconnected,
      'GET /admin/instagram/posts': { posts: [] },
      // validateBody do servidor: {message: 'Dados de entrada inválidos', errors: [...]}; o apiFetch mostra só message.
      'POST /admin/instagram/connection': () => {
        throw Object.assign(new Error('Dados de entrada inválidos'), { status: 400 });
      },
    });
    renderPage();

    const input = (await screen.findByLabelText('Token de acesso do Instagram')) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'abc' } });
    fireEvent.click(screen.getByRole('button', { name: 'Conectar' }));

    expect(
      await screen.findByText('Isto não parece um token do Instagram completo. Copie de novo o token inteiro no painel da Meta, sem espaços, e cole aqui.')
    ).toBeInTheDocument();
    expect(screen.queryByText('Dados de entrada inválidos')).toBeNull();
    expect(input.value).toBe('');
  });

  it('"Desconectar" pede confirmação na janela do sistema (não no window.confirm) e chama DELETE', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm');
    let current: unknown = baseStatus;
    mockApi({
      'GET /admin/instagram/status': () => current,
      'GET /admin/instagram/posts': { posts: [] },
      'DELETE /admin/instagram/connection': () => {
        current = disconnected;
        return disconnected;
      },
    });
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Desconectar' }));
    const dialog = await screen.findByRole('dialog', { name: 'Desconectar o Instagram?' });
    expect(within(dialog).getByText(/As publicações já importadas e os projetos do Portfólio continuam no site/)).toBeInTheDocument();
    expect(callsTo('DELETE', '/admin/instagram/connection')).toHaveLength(0);

    fireEvent.click(within(dialog).getByRole('button', { name: 'Desconectar' }));
    await waitFor(() => expect(callsTo('DELETE', '/admin/instagram/connection')).toHaveLength(1));
    expect(await screen.findByText('Não conectado')).toBeInTheDocument();
    expect(confirmSpy).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });
});

describe('Painel do Instagram — hashtag e sincronização', () => {
  it('salva a hashtag sem o # e recusa espaço', async () => {
    mockApi({
      'GET /admin/instagram/status': baseStatus,
      'GET /admin/instagram/posts': { posts: [] },
      'PUT /admin/instagram/settings': (init?: RequestInit) => ({ ...baseStatus, ...JSON.parse(String(init?.body)) }),
    });
    renderPage();

    const input = await screen.findByLabelText('Hashtag (sem o #)');
    expect(input).toHaveValue('portfolioX');

    fireEvent.change(input, { target: { value: 'festa x' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar hashtag' }));
    expect(await screen.findByText(/Use só letras, números e _/)).toBeInTheDocument();
    expect(callsTo('PUT', '/admin/instagram/settings')).toHaveLength(0);

    fireEvent.change(input, { target: { value: '#eventoX' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar hashtag' }));
    await waitFor(() => expect(callsTo('PUT', '/admin/instagram/settings')).toHaveLength(1));
    expect(callsTo('PUT', '/admin/instagram/settings')[0][1]).toMatchObject({ body: JSON.stringify({ portfolioHashtag: 'eventoX' }) });
    await waitFor(() => expect(screen.getByText('Use #eventoX na legenda para mandar a publicação para o Portfólio.')).toBeInTheDocument());
  });

  it('"Sincronizar agora" terminado: diz o que mudou e recarrega a situação e a lista', async () => {
    mockApi({
      'GET /admin/instagram/status': baseStatus,
      'GET /admin/instagram/posts': { posts: [] },
      'POST /admin/instagram/sync': { finished: true, unchanged: false, result: { created: 2, updated: 1, removed: 0, projectsCreated: 1, skipped: 0 } },
    });
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Sincronizar agora' }));
    expect(
      await screen.findByText('Sincronização concluída: 2 publicações novas, 1 legenda atualizada, 1 projeto novo no Portfólio.')
    ).toBeInTheDocument();
    expect(callsTo('POST', '/admin/instagram/sync')).toHaveLength(1);
    await waitFor(() => expect(callsTo('GET', '/admin/instagram/status')).toHaveLength(2));
    expect(callsTo('GET', '/admin/instagram/posts')).toHaveLength(2);
  });

  it('"Sincronizar agora" sem novidades e com publicação adiada', async () => {
    mockApi({
      'GET /admin/instagram/status': baseStatus,
      'GET /admin/instagram/posts': { posts: [] },
      'POST /admin/instagram/sync': { finished: true, unchanged: false, result: { created: 0, updated: 0, removed: 0, projectsCreated: 0, skipped: 1 } },
    });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Sincronizar agora' }));
    expect(
      await screen.findByText(
        'Sincronização concluída: nenhuma novidade no Instagram. 1 publicação ficou para a próxima tentativa, porque a imagem não pôde ser copiada.'
      )
    ).toBeInTheDocument();
  });

  it('resposta 202 (continua em segundo plano) e importação já em andamento', async () => {
    let reply: unknown = { finished: false, message: 'A sincronização continua em segundo plano. Confira de novo em alguns minutos.' };
    mockApi({
      'GET /admin/instagram/status': baseStatus,
      'GET /admin/instagram/posts': { posts: [] },
      'POST /admin/instagram/sync': () => reply,
    });
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Sincronizar agora' }));
    expect(
      await screen.findByText('A importação continua em segundo plano. Atualize a página em alguns minutos para ver as novidades.')
    ).toBeInTheDocument();

    reply = { finished: false, alreadyRunning: true, message: 'Uma sincronização já está em andamento.' };
    fireEvent.click(await screen.findByRole('button', { name: 'Sincronizar agora' }));
    expect(
      await screen.findByText('Já existe uma importação em andamento. Aguarde alguns minutos e atualize a página para ver as novidades.')
    ).toBeInTheDocument();
    expect(screen.queryByText(/continua em segundo plano/)).toBeNull();
  });
});

describe('Painel do Instagram — sincronizar com erro', () => {
  it('400 ou 502 do servidor: mostra a mensagem como erro e relê a situação', async () => {
    let current: unknown = baseStatus;
    let fail = { status: 502, message: 'O Instagram não respondeu a tempo. Tente de novo em alguns minutos.' };
    mockApi({
      'GET /admin/instagram/status': () => current,
      'GET /admin/instagram/posts': { posts: [] },
      'POST /admin/instagram/sync': () => {
        throw Object.assign(new Error(fail.message), { status: fail.status });
      },
    });
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Sincronizar agora' }));
    const alert502 = await screen.findByText('O Instagram não respondeu a tempo. Tente de novo em alguns minutos.');
    expect(alert502.closest('[role="alert"]')).not.toBeNull();
    expect(screen.queryByText(/Sincronização concluída/)).toBeNull();
    await waitFor(() => expect(callsTo('GET', '/admin/instagram/status')).toHaveLength(2));

    // Token recusado na rodada: 400 com a mensagem, e a situação relida mostra a conexão vencida.
    fail = { status: 400, message: 'O token do Instagram venceu ou foi recusado. Cole um token novo.' };
    current = { ...baseStatus, status: 'expired' };
    fireEvent.click(screen.getByRole('button', { name: 'Sincronizar agora' }));
    expect(await screen.findByText('O token do Instagram venceu ou foi recusado. Cole um token novo.')).toBeInTheDocument();
    expect(await screen.findByText('Conexão vencida')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sincronizar agora' })).toBeDisabled();
  });

  it('o navegador desiste de esperar (AbortError): avisa que continua em segundo plano, sem frase em inglês', async () => {
    mockApi({
      'GET /admin/instagram/status': baseStatus,
      'GET /admin/instagram/posts': { posts: [] },
      'POST /admin/instagram/sync': () => {
        throw Object.assign(new Error('signal is aborted without reason'), { name: 'AbortError' });
      },
    });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Sincronizar agora' }));
    expect(
      await screen.findByText('A importação continua em segundo plano. Atualize a página em alguns minutos para ver as novidades.')
    ).toBeInTheDocument();
    expect(screen.queryByText(/aborted/)).toBeNull();
  });
});

describe('Painel do Instagram — publicações importadas', () => {
  it('lista com miniatura, legenda, data, tipo e os selos Oculto, Fixado, No portfólio e Removido do Instagram', async () => {
    mockApi({ 'GET /admin/instagram/status': baseStatus, 'GET /admin/instagram/posts': { posts: [postC, postA, postB] } });
    renderPage();

    await screen.findByText('Montagem do palco');
    const items = within(screen.getByRole('list', { name: 'Publicações importadas' })).getAllByRole('listitem');
    // Fixadas primeiro, depois as mais recentes.
    expect(items.map((li) => li.querySelector('p')?.textContent)).toEqual([
      'Montagem do palco',
      'Casamento no sítio Som e luz para 200 convidados #portfolioX',
      'Sem legenda',
    ]);

    const a = within(rowOf('Casamento no sítio Som e luz para 200 convidados #portfolioX'));
    expect(a.getByText(/Carrossel · 08\/11\/2026/)).toBeInTheDocument();
    expect(a.getByRole('link', { name: 'Ver no Instagram' })).toHaveAttribute('href', 'https://www.instagram.com/p/AAA1/');
    expect(a.queryByText('Oculto')).toBeNull();
    expect(a.getByRole('button', { name: 'Ocultar do site' })).toBeInTheDocument();
    expect(a.getByRole('button', { name: 'Fixar no topo' })).toBeInTheDocument();
    expect(a.getByRole('button', { name: 'Transformar em projeto do Portfólio' })).toBeInTheDocument();
    expect(rowOf('Casamento no sítio Som e luz para 200 convidados #portfolioX').querySelector('img')?.getAttribute('src')).toContain(
      'x-producoes/instagram/1789001.jpg'
    );

    const b = within(rowOf('Montagem do palco'));
    expect(b.getByText(/Vídeo · 01\/11\/2026/)).toBeInTheDocument();
    for (const badge of ['Oculto', 'Fixado', 'No portfólio']) expect(b.getByText(badge)).toBeInTheDocument();
    expect(b.getByRole('button', { name: 'Mostrar' })).toBeInTheDocument();
    expect(b.getByRole('button', { name: 'Desafixar' })).toBeInTheDocument();
    expect(b.getByRole('link', { name: 'Ver projeto' })).toHaveAttribute('href', '/admin/portfolio?editar=pf9');
    expect(b.queryByRole('button', { name: 'Transformar em projeto do Portfólio' })).toBeNull();

    expect(within(rowOf('Sem legenda')).getByText('Removido do Instagram')).toBeInTheDocument();
    // Campos internos não aparecem.
    expect(document.body.textContent).not.toContain('1789001');
  });

  it('"Ocultar do site" e "Mostrar" chamam PATCH com isHidden e atualizam a linha', async () => {
    mockApi({
      'GET /admin/instagram/status': baseStatus,
      'GET /admin/instagram/posts': { posts: [postA] },
      // PATCH devolve data.post (a publicação atualizada).
      'PATCH /admin/instagram/posts/pA': (init?: RequestInit) => ({ post: { ...postA, ...JSON.parse(String(init?.body)) } }),
    });
    renderPage();

    const caption = 'Casamento no sítio Som e luz para 200 convidados #portfolioX';
    await screen.findByText(caption);
    fireEvent.click(within(rowOf(caption)).getByRole('button', { name: 'Ocultar do site' }));
    await waitFor(() => expect(within(rowOf(caption)).getByText('Oculto')).toBeInTheDocument());
    expect(callsTo('PATCH', '/admin/instagram/posts/pA')[0][1]).toMatchObject({ method: 'PATCH', body: JSON.stringify({ isHidden: true }) });
    expect(addNotification).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success', title: 'Publicação oculta', message: 'Ela sai da seção do Instagram no site; no Instagram nada muda.' })
    );
    // Revisão: os números de "Publicações importadas" são lidos de novo depois da ação.
    await waitFor(() => expect(callsTo('GET', '/admin/instagram/status')).toHaveLength(2));

    fireEvent.click(within(rowOf(caption)).getByRole('button', { name: 'Mostrar' }));
    await waitFor(() => expect(within(rowOf(caption)).queryByText('Oculto')).toBeNull());
    expect(callsTo('PATCH', '/admin/instagram/posts/pA')[1][1]).toMatchObject({ body: JSON.stringify({ isHidden: false }) });
  });

  it('ocultar uma publicação que virou projeto: o aviso diz que o projeto do Portfólio continua no site', async () => {
    const linked = { ...postA, portfolio: { id: 'pf12', slug: 'casamento-no-sitio', title: 'Casamento no sítio' } };
    mockApi({
      'GET /admin/instagram/status': baseStatus,
      'GET /admin/instagram/posts': { posts: [linked] },
      'PATCH /admin/instagram/posts/pA': (init?: RequestInit) => ({ post: { ...linked, ...JSON.parse(String(init?.body)) } }),
    });
    renderPage();

    const caption = 'Casamento no sítio Som e luz para 200 convidados #portfolioX';
    await screen.findByText(caption);
    expect(screen.getByText(/Ocultar tira a publicação da seção do Instagram no site/)).toBeInTheDocument();
    fireEvent.click(within(rowOf(caption)).getByRole('button', { name: 'Ocultar do site' }));
    await waitFor(() =>
      expect(addNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Publicação oculta',
          message: 'Ela sai da seção do Instagram no site; no Instagram nada muda. O projeto do Portfólio feito com ela continua no site.',
        })
      )
    );
  });

  it('"Fixar no topo" chama PATCH com isPinned e leva a publicação para o topo da lista', async () => {
    mockApi({
      'GET /admin/instagram/status': baseStatus,
      'GET /admin/instagram/posts': { posts: [postA, postC] },
      'PATCH /admin/instagram/posts/pC': (init?: RequestInit) => ({ post: { ...postC, ...JSON.parse(String(init?.body)) } }),
    });
    renderPage();

    await screen.findByText('Sem legenda');
    const listOrder = () =>
      within(screen.getByRole('list', { name: 'Publicações importadas' }))
        .getAllByRole('listitem')
        .map((li) => li.querySelector('p')?.textContent);
    expect(listOrder()).toEqual(['Casamento no sítio Som e luz para 200 convidados #portfolioX', 'Sem legenda']);

    fireEvent.click(within(rowOf('Sem legenda')).getByRole('button', { name: 'Fixar no topo' }));
    await waitFor(() => expect(within(rowOf('Sem legenda')).getByText('Fixado')).toBeInTheDocument());
    expect(callsTo('PATCH', '/admin/instagram/posts/pC')[0][1]).toMatchObject({ body: JSON.stringify({ isPinned: true }) });
    expect(listOrder()).toEqual(['Sem legenda', 'Casamento no sítio Som e luz para 200 convidados #portfolioX']);
    expect(within(rowOf('Sem legenda')).getByRole('button', { name: 'Desafixar' })).toBeInTheDocument();
  });

  it('"Transformar em projeto do Portfólio" chama POST e troca o botão por "Ver projeto"', async () => {
    mockApi({
      'GET /admin/instagram/status': baseStatus,
      'GET /admin/instagram/posts': { posts: [postA] },
      'POST /admin/instagram/posts/pA/portfolio': { portfolio: { id: 'pf10', slug: 'casamento-no-sitio', title: 'Casamento no sítio' } },
    });
    renderPage();

    const caption = 'Casamento no sítio Som e luz para 200 convidados #portfolioX';
    await screen.findByText(caption);
    fireEvent.click(within(rowOf(caption)).getByRole('button', { name: 'Transformar em projeto do Portfólio' }));

    const link = await within(rowOf(caption)).findByRole('link', { name: 'Ver projeto' });
    expect(link).toHaveAttribute('href', '/admin/portfolio?editar=pf10');
    expect(within(rowOf(caption)).getByText('No portfólio')).toBeInTheDocument();
    expect(callsTo('POST', '/admin/instagram/posts/pA/portfolio')).toHaveLength(1);
    expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'success', title: 'Projeto criado no Portfólio' }));
  });

  it('projeto que já existe (409): recarrega a lista e avisa, sem criar outro', async () => {
    let list: unknown[] = [postA];
    mockApi({
      'GET /admin/instagram/status': baseStatus,
      'GET /admin/instagram/posts': () => ({ posts: list }),
      'POST /admin/instagram/posts/pA/portfolio': () => {
        list = [{ ...postA, portfolio: { id: 'pf11', slug: 'casamento', title: 'Casamento' } }];
        // 409 {success:false, message, data:{portfolio}}: o apiFetch joga Error com a mensagem e o status.
        throw Object.assign(new Error('Esta publicação já virou um projeto do Portfólio.'), { status: 409 });
      },
    });
    renderPage();

    const caption = 'Casamento no sítio Som e luz para 200 convidados #portfolioX';
    await screen.findByText(caption);
    fireEvent.click(within(rowOf(caption)).getByRole('button', { name: 'Transformar em projeto do Portfólio' }));
    expect(await within(rowOf(caption)).findByRole('link', { name: 'Ver projeto' })).toHaveAttribute('href', '/admin/portfolio?editar=pf11');
    expect(callsTo('GET', '/admin/instagram/posts')).toHaveLength(2);
    expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'info', title: 'Este post já tem um projeto' }));
  });
});

describe('Painel do Instagram — dicas e passos', () => {
  it('as dicas dizem que são só sugestões e usam a hashtag configurada', async () => {
    mockApi({ 'GET /admin/instagram/status': { ...baseStatus, portfolioHashtag: 'eventoX' }, 'GET /admin/instagram/posts': { posts: [] } });
    renderPage();

    const summary = await screen.findByText('Dicas para as publicações');
    const box = summary.closest('details') as HTMLElement;
    expect(box).not.toBeNull();
    const text = box.textContent ?? '';
    expect(text).toContain('A primeira linha da legenda vira o título do projeto; o resto vira a descrição.');
    expect(text).toContain('Use #eventoX na legenda para mandar a publicação para o Portfólio.');
    expect(text).toContain('No carrossel, coloque as melhores fotos primeiro.');
    expect(text).toContain('Prefira fotos na horizontal e com boa luz.');
    expect(text).toContain('Um vídeo curto da estrutura funcionando');
    expect(text).toContain('São só sugestões; nada impede a publicação.');
  });

  it('"Como conectar" tem os passos curtos e o aviso de nunca mandar o token por chat ou e-mail', async () => {
    mockApi({ 'GET /admin/instagram/status': disconnected, 'GET /admin/instagram/posts': { posts: [] } });
    renderPage();

    const box = (await screen.findByText('Como conectar')).closest('details') as HTMLElement;
    const steps = within(box).getAllByRole('listitem').map((li) => li.textContent);
    // Pedido de 10/11/2026: o passo a passo é o do login unificado da Meta.
    expect(steps).toHaveLength(7);
    expect(steps[0]).toContain('profissional (Empresa ou Criador de conteúdo)');
    expect(steps[1]).toContain('Meta for Developers');
    expect(steps[1]).toContain('login unificado');
    expect(steps[2]).toContain('expiração "Nunca"');
    expect(steps[2]).toContain('só a permissão instagram_basic');
    expect(steps[3]).toContain('@x_producoeseventos');
    expect(steps[4]).toContain('Gerar token');
    expect(steps[5]).toContain('Nunca envie o token por chat ou e-mail.');
    expect(steps[6]).toContain('não precisa de renovação');
  });

  it('token do login unificado (sem data de vencimento): diz que não vence e não mostra "vale até"', async () => {
    mockApi({ 'GET /admin/instagram/status': { ...baseStatus, accountType: null, tokenExpiresAt: null }, 'GET /admin/instagram/posts': { posts: [] } });
    renderPage();

    expect(await screen.findByText('Conectado')).toBeInTheDocument();
    expect(screen.getByText(/O sistema não renova este tipo de token: gerado com a expiração "Nunca", ele não vence/)).toBeInTheDocument();
    expect(screen.queryByText(/o sistema renova sozinho antes de vencer/)).toBeNull();
    expect(screen.getByText('@x_producoeseventos')).toBeInTheDocument();
  });

  it('com data de vencimento (login do Instagram): não mostra a frase do token que não vence', async () => {
    mockApi({ 'GET /admin/instagram/status': baseStatus, 'GET /admin/instagram/posts': { posts: [] } });
    renderPage();

    expect(await screen.findByText('Conectado')).toBeInTheDocument();
    expect(screen.queryByText(/O sistema não renova este tipo de token/)).toBeNull();
  });
});
