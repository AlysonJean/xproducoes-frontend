import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import type { ReactNode } from 'react';

// D8c (aprovada em 02/11/2026), parte 2: quem entra com o Google e não sabe a senha confirma o "Excluir minha conta"
// pelo link do e-mail (/lgpd/confirmar-exclusao#token=..., 1 hora, uma vez). A página lê o código do "#" só no
// navegador, tira o código da barra de endereço e só chama a API no clique do botão (os filtros de e-mail abrem os
// links sozinhos). A aba Privacidade do colaborador leva à página LGPD.
// O mesmo módulo, importado pelo atalho (a página) e pelo caminho relativo (CollaboratorSettingsPage).
const { apiFetch, getMyProfile, getSettings, apiModule } = vi.hoisted(() => {
  const mocks = { apiFetch: vi.fn(), getMyProfile: vi.fn(), getSettings: vi.fn() };
  const apiModule = () => ({
    apiFetch: mocks.apiFetch,
    collaboratorProfileAPI: { getMyProfile: mocks.getMyProfile, getSettings: mocks.getSettings, updateSettings: vi.fn(), updateProfile: vi.fn(), getMyEvents: vi.fn() },
    collaboratorsAPI: { getMyDashboard: vi.fn() },
    authAPI: { updateProfile: vi.fn(), changePassword: vi.fn() },
  });
  return { ...mocks, apiModule };
});
vi.mock('@/services/api', () => apiModule());
vi.mock('../../services/api', () => apiModule());
vi.mock('../../components/collaborator/CollaboratorLayout', () => ({
  CollaboratorLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));
vi.mock('../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));

import AccountDeletionConfirmPage from '../AccountDeletionConfirmPage';
import CollaboratorSettingsPage from '../collaborator/CollaboratorSettingsPage';
import { isAnalyticsExcludedPath } from '../../utils/analyticsExclusions';

const montar = (hash = '') => {
  window.history.replaceState(null, '', `/lgpd/confirmar-exclusao${hash}`);
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={['/lgpd/confirmar-exclusao']}>
        <Routes>
          <Route path="/lgpd/confirmar-exclusao" element={<AccountDeletionConfirmPage />} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );
};
const httpError = (status: number) => Object.assign(new Error('falhou'), { status });

let logoutEvents = 0;
const onLogout = () => {
  logoutEvents += 1;
};

beforeEach(() => {
  apiFetch.mockReset();
  logoutEvents = 0;
  window.addEventListener('auth:logout', onLogout);
});
afterEach(() => {
  window.removeEventListener('auth:logout', onLogout);
  window.history.replaceState(null, '', '/');
});

describe('/lgpd/confirmar-exclusao', () => {
  it('abrir o link não exclui nada: mostra o botão, não chama a API e tira o código do endereço', async () => {
    montar('#token=d1.ab.cd');

    expect(await screen.findByRole('button', { name: 'Excluir minha conta' })).toBeInTheDocument();
    expect(apiFetch).not.toHaveBeenCalled();
    expect(window.location.hash).toBe('');
    expect(window.location.pathname).toBe('/lgpd/confirmar-exclusao');
  });

  it('confirmar: POST com o código no corpo (origem no Referer); excluída, avisa e sai da conta neste aparelho', async () => {
    apiFetch.mockResolvedValue({ outcome: 'deleted', message: 'Sua conta foi excluída.' });
    const user = userEvent.setup();
    montar('#token=d1.ab.cd');

    await user.click(await screen.findByRole('button', { name: 'Excluir minha conta' }));

    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith('/users/confirm-deletion', {
        method: 'POST',
        body: JSON.stringify({ token: 'd1.ab.cd' }),
        referrerPolicy: 'origin',
      }),
    );
    expect(await screen.findByText(/Sua conta foi excluída\. Se havia reservas contratadas ou pagas/)).toBeInTheDocument();
    expect(logoutEvents).toBe(1);
    expect(screen.queryByRole('button', { name: 'Excluir minha conta' })).not.toBeInTheDocument();
  });

  it('adiada (202): mostra a mensagem do servidor e não sai da conta', async () => {
    apiFetch.mockResolvedValue({ outcome: 'postponed', message: 'Seu pedido foi registrado. A exclusão da conta fica adiada até 20/12/2026.' });
    const user = userEvent.setup();
    montar('#token=d1.ab.cd');

    await user.click(await screen.findByRole('button', { name: 'Excluir minha conta' }));

    expect(await screen.findByText(/fica adiada até 20\/12\/2026/)).toBeInTheDocument();
    expect(logoutEvents).toBe(0);
  });

  it('link vencido ou já usado (400): avisa para pedir outro na página LGPD', async () => {
    apiFetch.mockRejectedValue(httpError(400));
    const user = userEvent.setup();
    montar('#token=d1.velho.xyz');

    await user.click(await screen.findByRole('button', { name: 'Excluir minha conta' }));

    expect(await screen.findByText('Este link venceu ou já foi usado. Peça um novo na página LGPD, com a conta conectada.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Excluir minha conta' })).not.toBeInTheDocument();
  });

  it('falha passageira: avisa e deixa tentar de novo', async () => {
    apiFetch.mockRejectedValueOnce(httpError(503)).mockResolvedValueOnce({ outcome: 'deleted' });
    const user = userEvent.setup();
    montar('#token=d1.ab.cd');

    await user.click(await screen.findByRole('button', { name: 'Excluir minha conta' }));
    expect(await screen.findByText('Não conseguimos confirmar agora. Tente de novo em alguns minutos.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Excluir minha conta' }));
    expect(await screen.findByText(/Sua conta foi excluída/)).toBeInTheDocument();
    expect(apiFetch).toHaveBeenCalledTimes(2);
  });

  it('sem código no endereço: avisa, sem botão e sem chamar a API', async () => {
    montar();

    expect(await screen.findByText('Este link venceu ou já foi usado. Peça um novo na página LGPD, com a conta conectada.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Excluir minha conta' })).not.toBeInTheDocument();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('fica fora do Google Analytics e do Vercel Analytics; a página /lgpd continua contando', () => {
    expect(isAnalyticsExcludedPath('/lgpd/confirmar-exclusao')).toBe(true);
    expect(isAnalyticsExcludedPath('/LGPD/confirmar-exclusao')).toBe(true);
    expect(isAnalyticsExcludedPath('/lgpd')).toBe(false);
  });
});

// A aba Privacidade do colaborador: link para a página LGPD (baixar os dados e excluir a conta).
describe('Colaborador — aba Privacidade', () => {
  it('tem o link para a página LGPD', async () => {
    getMyProfile.mockResolvedValue({ data: { data: { phone: '', specialties: [], user: { name: 'Eu', email: 'eu@x.test' } } } });
    getSettings.mockResolvedValue({ data: {} });
    const user = userEvent.setup();
    render(<MemoryRouter><CollaboratorSettingsPage /></MemoryRouter>);

    await user.click(await screen.findByRole('tab', { name: /Privacidade/ }));

    expect(screen.getByText('Seus dados (LGPD)')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'página LGPD' })).toHaveAttribute('href', '/lgpd');
  });
});
