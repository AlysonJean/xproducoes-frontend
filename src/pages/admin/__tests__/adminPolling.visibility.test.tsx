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

import WhatsappPage from '../WhatsappPage';
import MonitoringPage from '../MonitoringPage';

// Achado (auditoria ponta a ponta): as telas de WhatsApp e de Monitoramento do painel consultavam a
// cada 30 s mesmo com a aba escondida — cada consulta passa por authenticateWithDB (lê o banco), e
// uma aba esquecida mantinha o Neon (plano free) acordado. Agora pausam com a aba escondida e, ao
// voltar, consultam na hora.

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
  { nome: 'WhatsApp (/whatsapp/status)', Tela: WhatsappPage, consulta: apiFetch },
  { nome: 'Monitoramento (/monitoring/dashboard)', Tela: MonitoringPage, consulta: getDashboard },
];

describe.each(telas)('$nome — polling de 30 s', ({ Tela, consulta }) => {
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
    apiFetch.mockReset().mockResolvedValue({ isReady: true, qrCode: null });
    // Sem os dados do painel, a tela mostra o aviso de erro; aqui só importa quantas vezes consulta.
    getDashboard.mockReset().mockRejectedValue(new Error('sem dados no teste'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('com a aba escondida não consulta; ao voltar, consulta na hora e retoma o ciclo', async () => {
    render(<Tela />);
    await avancar(0);
    expect(consulta).toHaveBeenCalledTimes(1); // carga inicial

    mudarVisibilidade(true);
    await avancar(10 * 60 * 1000); // 10 min com a aba escondida (antes: 20 consultas)
    expect(consulta).toHaveBeenCalledTimes(1);

    mudarVisibilidade(false);
    await avancar(0);
    expect(consulta).toHaveBeenCalledTimes(2); // ao voltar, sem esperar o próximo ciclo

    await avancar(30_000);
    expect(consulta).toHaveBeenCalledTimes(3);
  });

  it('com a aba visível, continua atualizando a cada 30 s', async () => {
    render(<Tela />);
    await avancar(0);
    await avancar(90_000);
    expect(consulta).toHaveBeenCalledTimes(4); // inicial + 3 ciclos
  });
});
