import type React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { act, render } from '@testing-library/react';

const { apiFetch, getDashboard } = vi.hoisted(() => ({ apiFetch: vi.fn(), getDashboard: vi.fn() }));
vi.mock('../../../services/api', () => ({ apiFetch }));
vi.mock('../../../services/monitoringService', () => ({
  MonitoringService: { getInstance: () => ({ getDashboard, testIntegration: vi.fn() }) },
}));
vi.mock('../../../components/admin/AdminLayout', () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('../../../components/SentryTestButton', () => ({ SentryTestButton: () => null }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { name: 'Admin', role: 'ADMIN' } }) }));
vi.mock('../../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));

import MonitoringPage from '../MonitoringPage';

// Achado (auditoria ponta a ponta): as telas de WhatsApp e de Monitoramento do painel consultavam a
// cada 30 s mesmo com a aba escondida — cada consulta passa por authenticateWithDB (lê o banco), e
// uma aba esquecida mantinha o Neon (plano free) acordado. Agora pausam com a aba escondida e, ao
// voltar, consultam na hora. A tela de WhatsApp saiu na P14 (parte 3); fica a de Monitoramento.

let escondida = false;
const mudarVisibilidade = (hidden: boolean) => {
  escondida = hidden;
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'));
  });
};

const avancar = async (ms: number) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
};

const telas = [
  { nome: 'Monitoramento (/monitoring/dashboard)', Tela: MonitoringPage, consulta: getDashboard },
];

// Onda 2 da auditoria de 19/11 (F7admin2-06): com a aba visível, a consulta a cada 30 s também mantinha o Neon acordado
// (ele só suspende depois de ~5 min sem consultas). Saiu a atualização automática: carrega ao abrir e ao voltar à aba.
describe.each(telas)('$nome — sem atualização automática', ({ Tela, consulta }) => {
  beforeAll(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => escondida });
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => (escondida ? 'hidden' : 'visible'),
    });
  });

  afterAll(() => {
    // Volta aos getters do próprio jsdom (Document.prototype).
    Reflect.deleteProperty(document, 'hidden');
    Reflect.deleteProperty(document, 'visibilityState');
  });

  beforeEach(() => {
    vi.useFakeTimers();
    escondida = false;
    apiFetch.mockReset();
    // Sem os dados do painel, a tela mostra o aviso de erro; aqui só importa quantas vezes consulta.
    getDashboard.mockReset().mockRejectedValue(new Error('sem dados no teste'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('com a aba escondida não consulta; ao voltar, consulta na hora (e só uma vez)', async () => {
    render(<Tela />);
    await avancar(0);
    expect(consulta).toHaveBeenCalledTimes(1); // carga inicial

    mudarVisibilidade(true);
    await avancar(10 * 60 * 1000); // 10 min com a aba escondida (antes: 20 consultas)
    expect(consulta).toHaveBeenCalledTimes(1);

    mudarVisibilidade(false);
    await avancar(0);
    expect(consulta).toHaveBeenCalledTimes(2); // ao voltar, sem esperar

    await avancar(10 * 60 * 1000);
    expect(consulta).toHaveBeenCalledTimes(2);
  });

  it('com a aba visível, 10 min aberta: só a carga inicial (antes: uma consulta a cada 30 s)', async () => {
    render(<Tela />);
    await avancar(0);
    await avancar(10 * 60 * 1000);
    expect(consulta).toHaveBeenCalledTimes(1);
  });
});
