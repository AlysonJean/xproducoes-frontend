import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// D2 (aprovada em 02/11/2026): o botão "Entrar com Facebook" sai da tela de login. Achado: com o
// VITE_FACEBOOK_APP_ID definido na Vercel, a tela mostrava o botão (que sempre dava erro) e carregava o
// script da Meta (connect.facebook.net) antes de qualquer consentimento. A CSP do site também deixa de
// liberar o Facebook. O Google continua.
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ loginWithCredentials: vi.fn() }) }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ loginWithCredentials: vi.fn() }) }));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));
vi.mock('../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));
// O botão do Google lê o VITE_GOOGLE_CLIENT_ID ao carregar o módulo; aqui ele vira um marcador.
vi.mock('../../components/ui/GoogleAuthButton', () => ({ default: () => <button type="button">Entrar com Google</button> }));

import { LoginPage } from '../LoginPage';

const scriptsDaMeta = () =>
  [...document.querySelectorAll('script')].filter((s) => /facebook/i.test(s.src) || s.id === 'facebook-jssdk');

afterEach(() => {
  vi.unstubAllEnvs();
  scriptsDaMeta().forEach((s) => s.remove());
});

describe('LoginPage — sem Facebook (D2)', () => {
  it('com VITE_FACEBOOK_APP_ID definido: sem botão do Facebook e sem script da Meta; o Google continua', () => {
    vi.stubEnv('VITE_FACEBOOK_APP_ID', 'fbapp');
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: /Entrar com Google/ })).toBeInTheDocument();
    expect(screen.queryByText(/Facebook/)).not.toBeInTheDocument();
    expect(scriptsDaMeta()).toEqual([]);
  });
});

// A CSP hoje está em modo só de relatório (Content-Security-Policy-Report-Only); vale para os dois.
describe('CSP do site (vercel.json) — sem Facebook (D2)', () => {
  const csp = (() => {
    const vercel = JSON.parse(readFileSync(resolve(__dirname, '../../../vercel.json'), 'utf8')) as {
      headers?: Array<{ headers?: Array<{ key: string; value: string }> }>;
    };
    return (vercel.headers ?? [])
      .flatMap((h) => h.headers ?? [])
      .filter((h) => h.key.toLowerCase().startsWith('content-security-policy'))
      .map((h) => h.value);
  })();

  it('existe uma CSP', () => {
    expect(csp.length).toBeGreaterThan(0);
  });

  it('nenhuma diretiva libera domínio do Facebook (script, frame, connect, img)', () => {
    for (const valor of csp) {
      expect(valor).not.toMatch(/facebook\.(net|com)|fbcdn\.net/);
    }
  });
});
