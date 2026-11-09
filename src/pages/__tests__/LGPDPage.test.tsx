import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { LGPDPage } from '../LGPDPage';
import { apiFetch } from '../../services/api';
import { useAuth, type AuthContextType } from '../../contexts/AuthContext';

vi.mock('../../services/api', () => ({
  apiFetch: vi.fn(),
}));

vi.mock('../../contexts/AuthContext', async () => {
  const actual = await vi.importActual<typeof import('../../contexts/AuthContext')>('../../contexts/AuthContext');
  return { ...actual, useAuth: vi.fn() };
});

function renderPage() {
  return render(
    <HelmetProvider>
      <MemoryRouter>
        <LGPDPage />
      </MemoryRouter>
    </HelmetProvider>
  );
}

function makeAuthContext(overrides: Partial<AuthContextType>): AuthContextType {
  return {
    isAuthenticated: true,
    isLoading: false,
    user: { id: 'u1', role: 'CLIENT', name: 'Fulano', email: 'fulano@example.com' },
    logout: vi.fn(),
    refreshToken: vi.fn(),
    isTokenExpired: vi.fn(),
    setAuthenticatedUser: vi.fn(),
    ...overrides,
  };
}

const httpError = (status: number, message: string) => Object.assign(new Error(message), { status });
const norm = (text: string | null | undefined) => (text ?? '').replace(/\s+/g, ' ').trim();

// Respostas do servidor por endereço (o GET do pedido adiado roda ao abrir a página).
let routes: Record<string, (init?: RequestInit) => unknown>;
function serve() {
  vi.mocked(apiFetch).mockImplementation(async (endpoint: string, init?: RequestInit) => {
    const handler = routes[endpoint];
    if (!handler) throw new Error(`endereço não esperado: ${endpoint}`);
    return handler(init) as never;
  });
}

const openModal = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: 'Excluir minha conta' }));
  return screen.findByRole('dialog');
};

// Achado (Fase 4): a página de LGPD só orientava "mande um email" — não havia
// autoatendimento real para baixar ou excluir os próprios dados.
// D8c (aprovada em 02/11/2026), parte 2: "Excluir minha conta" pede a senha, diz o que fica guardado, trata o adiamento
// (202, com "Cancelar pedido de exclusão") e fica fora do alcance da equipe. Antes o modal prometia "remover
// permanentemente" e o pedido ia sem senha.
describe('LGPDPage - exportação e exclusão da conta', () => {
  let logoutEvents: number;
  const onLogout = () => {
    logoutEvents += 1;
  };

  beforeEach(() => {
    vi.mocked(apiFetch).mockReset();
    vi.mocked(useAuth).mockReturnValue(makeAuthContext({}));
    routes = { '/users/me/deletion-request': () => ({ requestedAt: null }) };
    serve();
    logoutEvents = 0;
    window.addEventListener('auth:logout', onLogout);

    if (!('createObjectURL' in URL)) {
      Object.defineProperty(URL, 'createObjectURL', { value: vi.fn(), writable: true });
      Object.defineProperty(URL, 'revokeObjectURL', { value: vi.fn(), writable: true });
    } else {
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    }
  });

  afterEach(() => {
    window.removeEventListener('auth:logout', onLogout);
  });

  it('usuário não autenticado vê apenas o texto informativo, sem os botões de autoatendimento', () => {
    vi.mocked(useAuth).mockReturnValue(makeAuthContext({ isAuthenticated: false, user: null }));

    renderPage();

    expect(screen.queryByRole('button', { name: 'Baixar meus dados' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Excluir minha conta' })).not.toBeInTheDocument();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('"Baixar meus dados" chama o endpoint real de exportação', async () => {
    routes['/users/me/data-export'] = () => ({ profile: { id: 'u1' }, bookings: [], reviews: [] });
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Baixar meus dados' }));

    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/users/me/data-export'));
    expect(await screen.findByText(/baixados com sucesso/i)).toBeInTheDocument();
  });

  it('o modal pede a senha e diz o que sai e o que fica guardado (sem "permanentemente")', async () => {
    const user = userEvent.setup();
    renderPage();

    const dialog = await openModal(user);

    expect(within(dialog).getByLabelText('Senha da conta')).toHaveAttribute('type', 'password');
    const text = norm(dialog.textContent);
    expect(text).toContain('a exclusão fica adiada até o fim do evento ou até o pagamento ser acertado');
    // Revisão do D8c: o pedido com comprovante enviado e ainda não conferido também adia (o comprovante não é apagado).
    expect(text).toContain('um comprovante de pagamento que a equipe ainda não conferiu');
    expect(text).toContain('Conta de cliente sem nenhuma reserva: é apagada por completo.');
    expect(text).toContain('saem nome, e-mail, telefone, endereço, foto, preferências, notificações, favoritos, carrinho, login social e sessões');
    expect(text).toContain('A avaliação fica só com as estrelas, sem o comentário e as fotos.');
    expect(text).toContain('data, itens, valores, situação, cupom, comprovante de pagamento e o chat da reserva');
    expect(text).toContain('5 anos contados de 1º de janeiro do ano seguinte ao evento');
    expect(text).toContain('As cópias de segurança somem em até 90 dias.');
    expect(text).not.toMatch(/permanentemente/i);
    expect(within(dialog).getByRole('button', { name: 'Entro com o Google / não sei a senha: receber link por e-mail' })).toBeInTheDocument();
  });

  it('sem senha: avisa e não manda nada', async () => {
    const user = userEvent.setup();
    renderPage();
    const dialog = await openModal(user);

    await user.click(within(dialog).getByRole('button', { name: 'Excluir minha conta' }));

    expect(await within(dialog).findByText('Digite a senha da sua conta.')).toBeInTheDocument();
    expect(apiFetch).not.toHaveBeenCalledWith('/users/me/request-deletion', expect.anything());
  });

  it('com a senha: manda { password }; excluída, mostra a confirmação e sai da conta neste aparelho', async () => {
    routes['/users/me/request-deletion'] = () => ({ outcome: 'deleted', message: 'Sua conta foi excluída.' });
    const user = userEvent.setup();
    renderPage();
    const dialog = await openModal(user);

    await user.type(within(dialog).getByLabelText('Senha da conta'), 'Senha#12');
    await user.click(within(dialog).getByRole('button', { name: 'Excluir minha conta' }));

    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith('/users/me/request-deletion', { method: 'POST', body: JSON.stringify({ password: 'Senha#12' }) }),
    );
    expect(await screen.findByText('Sua conta foi excluída. Você saiu da conta neste aparelho.')).toBeInTheDocument();
    expect(logoutEvents).toBe(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('senha errada (401): mostra o erro no campo, o modal continua e a conta não sai', async () => {
    routes['/users/me/request-deletion'] = () => {
      throw httpError(401, 'Senha incorreta. Nada foi excluído.');
    };
    const user = userEvent.setup();
    renderPage();
    const dialog = await openModal(user);

    await user.type(within(dialog).getByLabelText('Senha da conta'), 'errada');
    await user.click(within(dialog).getByRole('button', { name: 'Excluir minha conta' }));

    expect(await within(dialog).findByText('Senha incorreta. Nada foi excluído.')).toBeInTheDocument();
    // O erro fica no próprio campo (marcado como inválido), não num aviso solto do modal.
    expect(within(dialog).getByLabelText('Senha da conta')).toHaveAttribute('aria-invalid', 'true');
    expect(logoutEvents).toBe(0);
  });

  it('adiada (202): mostra o motivo e a data e oferece "Cancelar pedido de exclusão", que cancela', async () => {
    routes['/users/me/request-deletion'] = () => ({
      outcome: 'postponed',
      message: 'Seu pedido foi registrado. A exclusão da conta fica adiada até 20/12/2026, quando termina o último evento confirmado.',
    });
    routes['/users/me/cancel-deletion'] = () => ({ cancelled: true });
    const user = userEvent.setup();
    renderPage();
    const dialog = await openModal(user);

    await user.type(within(dialog).getByLabelText('Senha da conta'), 'Senha#12');
    await user.click(within(dialog).getByRole('button', { name: 'Excluir minha conta' }));

    expect(await screen.findByText(/fica adiada até 20\/12\/2026/)).toBeInTheDocument();
    expect(logoutEvents).toBe(0);
    expect(screen.queryByRole('button', { name: 'Excluir minha conta' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancelar pedido de exclusão' }));

    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/users/me/cancel-deletion', { method: 'POST' }));
    expect(await screen.findByText('Pedido de exclusão cancelado. A conta continua ativa.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Excluir minha conta' })).toBeInTheDocument();
  });

  it('pedido adiado de antes: ao abrir a página, aparece "Cancelar pedido de exclusão" no lugar do botão de excluir', async () => {
    routes['/users/me/deletion-request'] = () => ({ requestedAt: '2026-11-09T15:00:00.000Z' });
    renderPage();

    expect(await screen.findByRole('button', { name: 'Cancelar pedido de exclusão' })).toBeInTheDocument();
    expect(screen.getByText(/Você pediu a exclusão da conta em 09\/11\/2026/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Excluir minha conta' })).not.toBeInTheDocument();
  });

  it('"receber link por e-mail": pede o link e avisa que vale 1 hora', async () => {
    routes['/users/me/request-deletion/email'] = () => ({ sent: true });
    const user = userEvent.setup();
    renderPage();
    const dialog = await openModal(user);

    await user.click(within(dialog).getByRole('button', { name: 'Entro com o Google / não sei a senha: receber link por e-mail' }));

    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/users/me/request-deletion/email', { method: 'POST' }));
    expect(await within(dialog).findByText(/Ele vale por 1 hora e funciona uma vez só/)).toBeInTheDocument();
  });

  it('403 (conta da equipe): o modal fecha e a mensagem do servidor aparece', async () => {
    routes['/users/me/request-deletion'] = () => {
      throw httpError(403, 'Contas da equipe (administrador, gerente e operador) não se excluem pelo site.');
    };
    const user = userEvent.setup();
    renderPage();
    const dialog = await openModal(user);

    await user.type(within(dialog).getByLabelText('Senha da conta'), 'Senha#12');
    await user.click(within(dialog).getByRole('button', { name: 'Excluir minha conta' }));

    expect(await screen.findByText(/não se excluem pelo site/)).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it.each(['ADMIN', 'MANAGER', 'OPERATOR'])('conta %s: sem o botão de excluir, com o texto do canal de privacidade', (role) => {
    vi.mocked(useAuth).mockReturnValue(makeAuthContext({ user: { id: 'u9', role, name: 'Equipe', email: 'equipe@example.com' } }));
    renderPage();

    expect(screen.getByRole('button', { name: 'Baixar meus dados' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Excluir minha conta' })).not.toBeInTheDocument();
    expect(screen.getByText(/Contas da equipe \(administrador, gerente e operador\) não se excluem pelo site/)).toBeInTheDocument();
    expect(apiFetch).not.toHaveBeenCalledWith('/users/me/deletion-request');
  });
});
