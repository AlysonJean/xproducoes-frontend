import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock('../../services/api', () => ({ apiFetch }));

import {
  useAdminSummary,
  refreshAdminSummary,
  resetAdminSummaryForTests,
  SUMMARY_CEILING_MS,
  waitingAge,
  formatWaitingAge,
  type AdminSummary,
} from '../adminSummary';

// P3 (aprovada em 02/11/2026): o resumo do painel (número do menu e cartão) consulta ao abrir, ao voltar à aba e ao
// focar a janela, no máximo uma vez por minuto, uma por vez, nunca com a aba escondida e sem nenhum temporizador;
// depois de uma mudança feita no painel, refresh({ force: true }) consulta na hora.

const resumo = (over: Partial<AdminSummary> = {}): AdminSummary => ({
  waitingRequests: 3, oldestWaitingAt: '2026-11-09T09:00:00.000Z', pastEventRequests: 1,
  proposalsAwaitingClient: 0, unreadContacts: 2, ...over,
});

let escondida = false;
const mudarVisibilidade = (hidden: boolean) => {
  escondida = hidden;
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'));
  });
};
const focarJanela = () => {
  act(() => {
    window.dispatchEvent(new Event('focus'));
  });
};
const flush = () => act(async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
});
const avancar = (ms: number) => vi.setSystemTime(Date.now() + ms);
const consultas = () => apiFetch.mock.calls.filter(([url]) => url === '/dashboard/summary').length;

const Consumidor = ({ enabled = true, id = 'resumo' }: { enabled?: boolean; id?: string }) => {
  const summary = useAdminSummary(enabled);
  return <p data-testid={id}>{summary ? `${summary.waitingRequests} pedidos, ${summary.unreadContacts} mensagens` : 'nada'}</p>;
};

beforeEach(() => {
  // Só os relógios que um laço de consulta usaria (e a data); o agendador do React segue de verdade.
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] });
  vi.setSystemTime(new Date('2026-11-10T15:00:00.000Z'));
  resetAdminSummaryForTests();
  apiFetch.mockReset();
  apiFetch.mockResolvedValue(resumo());
  escondida = false;
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (escondida ? 'hidden' : 'visible') });
});
afterEach(() => {
  vi.useRealTimers();
});

describe('adminSummary — quando consulta', () => {
  it('menu e cartão montados juntos fazem uma consulta só, a GET /dashboard/summary', async () => {
    render(<><Consumidor id="menu" /><Consumidor id="cartao" /></>);
    await flush();

    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(apiFetch).toHaveBeenCalledWith('/dashboard/summary');
    expect(screen.getByTestId('menu')).toHaveTextContent('3 pedidos, 2 mensagens');
    expect(screen.getByTestId('cartao')).toHaveTextContent('3 pedidos, 2 mensagens');
  });

  it('trocar de tela (o menu remonta) antes de 1 minuto não consulta de novo; depois de 1 minuto, consulta', async () => {
    const primeira = render(<Consumidor />);
    await flush();
    primeira.unmount();

    avancar(30_000);
    const segunda = render(<Consumidor />);
    await flush();
    expect(consultas()).toBe(1);
    expect(screen.getByTestId('resumo')).toHaveTextContent('3 pedidos'); // o resumo do módulo, sem consultar
    segunda.unmount();

    avancar(SUMMARY_CEILING_MS);
    render(<Consumidor />);
    await flush();
    expect(consultas()).toBe(2);
  });

  it('voltar à aba ou focar a janela antes de 1 minuto não consulta; depois, as duas coisas juntas fazem uma consulta só', async () => {
    render(<Consumidor />);
    await flush();

    avancar(30_000);
    focarJanela();
    mudarVisibilidade(true);
    mudarVisibilidade(false);
    await flush();
    expect(consultas()).toBe(1);

    avancar(SUMMARY_CEILING_MS);
    mudarVisibilidade(true);
    mudarVisibilidade(false);
    focarJanela();
    await flush();
    expect(consultas()).toBe(2);
  });

  it('aba escondida: não consulta ao montar, nem passado o minuto, nem com force; ao mostrar a aba, consulta', async () => {
    escondida = true;
    render(<Consumidor />);
    await flush();
    avancar(5 * SUMMARY_CEILING_MS);
    focarJanela();
    await refreshAdminSummary({ force: true });
    await flush();
    expect(consultas()).toBe(0);
    expect(screen.getByTestId('resumo')).toHaveTextContent('nada');

    mudarVisibilidade(false);
    await flush();
    expect(consultas()).toBe(1);
  });

  it('force (depois de mudar uma reserva ou um contato) ignora o teto; durante uma consulta, consulta de novo uma vez quando ela acabar', async () => {
    render(<Consumidor />);
    await flush();
    expect(consultas()).toBe(1);

    apiFetch.mockResolvedValueOnce(resumo({ waitingRequests: 2 }));
    await act(() => refreshAdminSummary({ force: true }));
    await flush();
    expect(consultas()).toBe(2);
    expect(screen.getByTestId('resumo')).toHaveTextContent('2 pedidos');

    let responder: (valor: AdminSummary) => void = () => undefined;
    apiFetch.mockImplementationOnce(() => new Promise((resolve) => { responder = resolve; }));
    apiFetch.mockResolvedValueOnce(resumo({ waitingRequests: 0, unreadContacts: 0 }));
    void refreshAdminSummary({ force: true });
    await flush();
    expect(consultas()).toBe(3);
    // Duas mudanças durante a consulta (a resposta pode não ter visto nenhuma das duas): uma consulta a mais, no fim.
    void refreshAdminSummary({ force: true });
    void refreshAdminSummary({ force: true });
    void refreshAdminSummary();
    await flush();
    expect(consultas()).toBe(3);

    await act(async () => {
      responder(resumo({ waitingRequests: 1 }));
    });
    await flush();
    expect(consultas()).toBe(4);
    expect(screen.getByTestId('resumo')).toHaveTextContent('0 pedidos, 0 mensagens');
  });

  it('sem menu ou painel de admin montado, nada consulta (quem não é admin nunca chama a rota)', async () => {
    await refreshAdminSummary({ force: true });
    render(<Consumidor enabled={false} />);
    await flush();
    focarJanela();
    mudarVisibilidade(false);
    await flush();

    expect(consultas()).toBe(0);
    expect(screen.getByTestId('resumo')).toHaveTextContent('nada');
  });

  it('desligado (quem não é admin, ou o usuário ainda carregando) devolve nada, mesmo com o resumo que um admin já consultou', async () => {
    // Revisão: o resumo fica no módulo; quem entra no painel sem ser admin (por exemplo, depois de um admin sair sem
    // recarregar a página) não pode ver os números dele.
    render(<><Consumidor id="admin" /><Consumidor id="outro" enabled={false} /></>);
    await flush();

    expect(screen.getByTestId('admin')).toHaveTextContent('3 pedidos, 2 mensagens');
    expect(screen.getByTestId('outro')).toHaveTextContent('nada');
    expect(consultas()).toBe(1);
  });

  it('depois de sair do painel, voltar à aba ou focar a janela não consulta (os ouvintes saem junto)', async () => {
    const naJanela = { add: vi.spyOn(window, 'addEventListener'), remove: vi.spyOn(window, 'removeEventListener') };
    const noDocumento = { add: vi.spyOn(document, 'addEventListener'), remove: vi.spyOn(document, 'removeEventListener') };
    const tela = render(<><Consumidor id="menu" /><Consumidor id="cartao" /></>);
    await flush();
    tela.unmount();

    // Um ouvinte de cada, mesmo com dois consumidores, e o mesmo sai quando o último consumidor sai.
    for (const [alvo, tipo] of [[naJanela, 'focus'], [noDocumento, 'visibilitychange']] as const) {
      const postos = alvo.add.mock.calls.filter(([t]) => t === tipo).map(([, fn]) => fn);
      expect([tipo, postos.length]).toEqual([tipo, 1]);
      expect(alvo.remove.mock.calls.some(([t, fn]) => t === tipo && fn === postos[0])).toBe(true);
    }
    for (const espiao of [naJanela.add, naJanela.remove, noDocumento.add, noDocumento.remove]) espiao.mockRestore();

    avancar(5 * SUMMARY_CEILING_MS);
    focarJanela();
    mudarVisibilidade(true);
    mudarVisibilidade(false);
    await flush();
    expect(consultas()).toBe(1);
  });

  it('nenhum temporizador: com a tela aberta por 10 minutos, nada consulta sozinho', async () => {
    render(<Consumidor />);
    await flush();

    expect(vi.getTimerCount()).toBe(0);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10 * 60_000);
    });
    expect(consultas()).toBe(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('falha da API ou resposta em outro formato: fica o último resumo (e nada, na primeira vez); o teto vale igual', async () => {
    apiFetch.mockRejectedValueOnce(new Error('500'));
    render(<Consumidor />);
    await flush();
    expect(screen.getByTestId('resumo')).toHaveTextContent('nada');

    avancar(SUMMARY_CEILING_MS);
    focarJanela();
    await flush();
    expect(screen.getByTestId('resumo')).toHaveTextContent('3 pedidos, 2 mensagens');

    avancar(SUMMARY_CEILING_MS);
    apiFetch.mockResolvedValueOnce([]);
    focarJanela();
    await flush();
    avancar(SUMMARY_CEILING_MS);
    apiFetch.mockRejectedValueOnce(new Error('502'));
    focarJanela();
    await flush();
    expect(consultas()).toBe(4);
    expect(screen.getByTestId('resumo')).toHaveTextContent('3 pedidos, 2 mensagens');

    focarJanela(); // logo depois da falha: o teto segura
    await flush();
    expect(consultas()).toBe(4);
  });
});

describe('adminSummary — idade do pedido mais antigo', () => {
  const HORA = 60 * 60 * 1000;
  const agora = Date.parse('2026-11-10T15:00:00.000Z');
  const ha = (ms: number) => new Date(agora - ms).toISOString();

  it.each([
    [2 * HORA, 'muted', 2],
    [4 * HORA, 'muted', 4],
    [4 * HORA + 60_000, 'warning', 4],
    [5 * HORA, 'warning', 5],
    [24 * HORA, 'warning', 24],
    [24 * HORA + 60_000, 'destructive', 24],
    [30 * HORA, 'destructive', 30],
  ] as const)('%d ms → %s (%d h)', (idade, tom, horas) => {
    expect(waitingAge(ha(idade), agora)).toEqual({ tone: tom, hours: horas });
  });

  it('sem data ou com data inválida: sem idade', () => {
    expect(waitingAge(null, agora)).toBeNull();
    expect(waitingAge('não é data', agora)).toBeNull();
  });

  it.each([[0, 'há menos de 1 h'], [5, 'há 5 h'], [47, 'há 47 h'], [48, 'há 2 dias'], [72, 'há 3 dias']])('%d h → %s', (horas, texto) => {
    expect(formatWaitingAge(horas)).toBe(texto);
  });
});
