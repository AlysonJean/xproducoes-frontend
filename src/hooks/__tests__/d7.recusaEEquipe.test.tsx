// @vitest-environment-options {"url": "https://www.xproducoeseeventos.com.br/"}
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';

// D7 (aprovada em 02/11/2026): "faço a recusa depois do aceite apagar os cookies e recarregar" e "Eu desligo o GA ...
// para a equipe". Antes, recusar depois de aceitar (no banner, em "Gerenciar preferências" na página /cookies ou em
// outra aba) só trocava a escolha guardada: o GA já carregado seguia mandando page view a cada página e os cookies _ga
// ficavam. E quem é da equipe (admin, colaborador, freelancer) era medido nas páginas públicas.
// O endereço do teste é o do site, para os cookies do GA ficarem no domínio do site (.xproducoeseeventos.com.br), como
// o GA4 grava em produção.
const ga = vi.hoisted(() => {
  const state = { isInitialized: false };
  return {
    state,
    initialize: vi.fn(() => {
      state.isInitialized = true;
    }),
    send: vi.fn(),
    set: vi.fn(),
    gtag: vi.fn(),
  };
});
vi.mock('react-ga4', () => ({
  default: {
    get isInitialized() {
      return ga.state.isInitialized;
    },
    initialize: (...args: unknown[]) => ga.initialize(...(args as [])),
    send: (...args: unknown[]) => ga.send(...args),
    set: (...args: unknown[]) => ga.set(...args),
    gtag: (...args: unknown[]) => ga.gtag(...args),
  },
}));

import { useGoogleAnalytics } from '../useGoogleAnalytics';
import { CookieConsentProvider, useCookieConsent } from '../../contexts/CookieConsentContext';
import { AuthContext, type AuthContextType, type AuthUser } from '../../contexts/AuthContext';

const CONSENT_ITEM = 'xproducoes_cookie_consent';
const GA_DISABLE = 'ga-disable-G-TEST123';
const SITE_DOMAIN = '.xproducoeseeventos.com.br';

const Probe: React.FC = () => {
  useGoogleAnalytics();
  const { accept, decline, reset } = useCookieConsent();
  const navigate = useNavigate();
  return (
    <>
      <button onClick={accept}>aceitar</button>
      <button onClick={decline}>recusar</button>
      <button onClick={reset}>gerenciar preferências</button>
      <button onClick={() => navigate('/equipamentos')}>ir para equipamentos</button>
    </>
  );
};

type AuthState = { user?: Partial<AuthUser> | null; isLoading?: boolean };
const authValue = ({ user = null, isLoading = false }: AuthState): AuthContextType => ({
  isAuthenticated: !!user,
  isLoading,
  user: user ? ({ id: 'u1', name: 'Pessoa', email: 'pessoa@teste.com', role: 'CLIENT', ...user } as AuthUser) : null,
  logout: vi.fn(),
  refreshToken: vi.fn(),
  isTokenExpired: () => false,
  setAuthenticatedUser: vi.fn(),
});

// O app de verdade: o consentimento por fora, a sessão (AuthProvider) por dentro, e o hook no meio (App.tsx).
const renderSite = (path = '/', auth: AuthState = {}) => {
  const tree = (state: AuthState) => (
    <MemoryRouter initialEntries={[path]}>
      <CookieConsentProvider>
        <AuthContext.Provider value={authValue(state)}>
          <Probe />
        </AuthContext.Provider>
      </CookieConsentProvider>
    </MemoryRouter>
  );
  const view = render(tree(auth));
  return { ...view, setAuth: (state: AuthState) => view.rerender(tree(state)) };
};

const wait = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });
const pagesSent = () => ga.send.mock.calls.map(([hit]) => (hit as { page?: string }).page);
const gaDisabled = () => (window as unknown as Record<string, unknown>)[GA_DISABLE];
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));

// Como o GA4 grava: _ga e _ga_<id> no domínio do site; e um _ga_ antigo só no endereço www (cookie sem domínio).
const writeGaCookies = () => {
  document.cookie = `_ga=GA1.1.111.222; path=/; domain=${SITE_DOMAIN}`;
  document.cookie = `_ga_TEST123=GS1.1.333; path=/; domain=${SITE_DOMAIN}`;
  document.cookie = '_ga_ANTIGO=GS1.1.444; path=/';
  document.cookie = 'x_session=1; path=/';
};
const clearCookies = () => {
  for (const pair of document.cookie.split(';')) {
    const name = pair.split('=')[0].trim();
    if (!name) continue;
    document.cookie = `${name}=; Max-Age=0; path=/`;
    document.cookie = `${name}=; Max-Age=0; path=/; domain=${SITE_DOMAIN}`;
  }
};
const cookieNames = () => document.cookie.split(';').map((pair) => pair.split('=')[0].trim()).filter(Boolean);

const realLocation = window.location;
let reload: ReturnType<typeof vi.fn>;

beforeEach(() => {
  window.localStorage.clear();
  clearCookies();
  delete (window as unknown as Record<string, unknown>)[GA_DISABLE];
  ga.state.isInitialized = false;
  vi.clearAllMocks();
  vi.stubEnv('VITE_GOOGLE_ANALYTICS_ID', 'G-TEST123');
  vi.useFakeTimers();
  // jsdom não deixa espiar location.reload direto (mesmo arranjo de components/ui/__tests__/ErrorBoundary.test.tsx).
  reload = vi.fn();
  Object.defineProperty(window, 'location', { configurable: true, value: { ...realLocation, reload } });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  Object.defineProperty(window, 'location', { configurable: true, value: realLocation });
});

describe('D7 — recusa depois do aceite', () => {
  it('Recusar com o GA carregado: o envio para, o GA recebe a recusa, _ga e _ga_* saem (do site e do www) e a página recarrega uma vez', () => {
    window.localStorage.setItem(CONSENT_ITEM, 'accepted');
    renderSite('/');
    wait(5000);
    expect(pagesSent()).toEqual(['/']);
    writeGaCookies();

    click('recusar');

    expect(gaDisabled()).toBe(true);
    expect(ga.gtag).toHaveBeenCalledWith('consent', 'update', { analytics_storage: 'denied' });
    expect(cookieNames()).toEqual(['x_session']);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem(CONSENT_ITEM)).toBe('declined');

    // Até a página recarregar, nenhuma página nova vai ao GA.
    click('ir para equipamentos');
    wait(5000);
    expect(pagesSent()).toEqual(['/']);
  });

  it('"Gerenciar preferências" (/cookies) depois do aceite: o mesmo, e a página recarrega uma vez só mesmo com uma segunda recusa', () => {
    window.localStorage.setItem(CONSENT_ITEM, 'accepted');
    renderSite('/');
    wait(5000);
    writeGaCookies();

    click('gerenciar preferências');

    expect(gaDisabled()).toBe(true);
    expect(ga.gtag).toHaveBeenCalledWith('consent', 'update', { analytics_storage: 'denied' });
    expect(cookieNames()).toEqual(['x_session']);
    expect(window.localStorage.getItem(CONSENT_ITEM)).toBeNull();
    expect(reload).toHaveBeenCalledTimes(1);

    // Aceitou e recusou de novo antes de a página sair: nada de recarregar duas vezes.
    click('aceitar');
    click('recusar');
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('Recusa feita em outra aba (evento storage): esta aba também para, apaga os cookies e recarrega', () => {
    window.localStorage.setItem(CONSENT_ITEM, 'accepted');
    renderSite('/');
    wait(5000);
    writeGaCookies();

    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: CONSENT_ITEM, newValue: 'declined' }));
    });

    expect(gaDisabled()).toBe(true);
    expect(ga.gtag).toHaveBeenCalledWith('consent', 'update', { analytics_storage: 'denied' });
    expect(cookieNames()).toEqual(['x_session']);
    expect(reload).toHaveBeenCalledTimes(1);
    click('ir para equipamentos');
    wait(5000);
    expect(pagesSent()).toEqual(['/']);
  });

  it('Recusa antes de o GA carregar: nada para recarregar, os cookies saem e o GA não carrega; aceitar de novo volta a medir', () => {
    window.localStorage.setItem(CONSENT_ITEM, 'accepted');
    renderSite('/');
    wait(1000);
    writeGaCookies();

    click('recusar');
    wait(5000);

    expect(ga.initialize).not.toHaveBeenCalled();
    expect(ga.send).not.toHaveBeenCalled();
    expect(ga.gtag).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
    expect(gaDisabled()).toBe(true);
    expect(cookieNames()).toEqual(['x_session']);

    click('aceitar');
    wait(5000);
    expect(ga.initialize).toHaveBeenCalledWith('G-TEST123', { gtagOptions: { send_page_view: false } });
    expect(gaDisabled()).toBe(false);
    expect(pagesSent()).toEqual(['/']);
  });

  it('Com a recusa guardada: o GA não carrega nem manda page view, em nenhuma página', () => {
    window.localStorage.setItem(CONSENT_ITEM, 'declined');
    renderSite('/');
    wait(5000);
    click('ir para equipamentos');
    wait(5000);

    expect(ga.initialize).not.toHaveBeenCalled();
    expect(ga.send).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });
});

describe('D7 — equipe fora do GA também nas páginas públicas', () => {
  beforeEach(() => {
    window.localStorage.setItem(CONSENT_ITEM, 'accepted');
  });

  it.each(['ADMIN', 'COLLABORATOR', 'FREELANCER'])('%s logado numa página pública, com o aceite: o GA nem carrega', (role) => {
    renderSite('/equipamentos', { user: { role } });
    wait(5000);
    click('ir para equipamentos');
    wait(5000);

    expect(ga.initialize).not.toHaveBeenCalled();
    expect(ga.send).not.toHaveBeenCalled();
  });

  it('cliente logado e visitante sem login seguem medidos depois do aceite', () => {
    renderSite('/equipamentos', { user: { role: 'CLIENT' } });
    wait(5000);
    expect(ga.initialize).toHaveBeenCalledWith('G-TEST123', expect.anything());
    expect(pagesSent()).toEqual(['/equipamentos']);
  });

  it('enquanto a sessão está sendo conferida, o GA espera; sessão de admin: não carrega; visitante: carrega', () => {
    const admin = renderSite('/', { isLoading: true });
    wait(10000);
    expect(ga.initialize).not.toHaveBeenCalled();
    admin.setAuth({ isLoading: false, user: { role: 'ADMIN' } });
    wait(5000);
    expect(ga.initialize).not.toHaveBeenCalled();
    admin.unmount();

    const visitante = renderSite('/', { isLoading: true });
    wait(10000);
    expect(ga.initialize).not.toHaveBeenCalled();
    visitante.setAuth({ isLoading: false, user: null });
    wait(5000);
    expect(ga.initialize).toHaveBeenCalledTimes(1);
    expect(pagesSent()).toEqual(['/']);
  });

  it('GA carregado como visitante e a pessoa entra como admin: nenhum page view a mais e o gtag.js fica desligado para os eventos', () => {
    const site = renderSite('/');
    wait(5000);
    expect(pagesSent()).toEqual(['/']);
    expect(gaDisabled()).toBe(false);

    site.setAuth({ user: { role: 'ADMIN' } });
    expect(gaDisabled()).toBe(true);
    click('ir para equipamentos');
    wait(5000);
    expect(pagesSent()).toEqual(['/']);
  });
});
