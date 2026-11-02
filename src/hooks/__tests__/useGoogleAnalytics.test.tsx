import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useGoogleAnalytics } from '../useGoogleAnalytics';
import { CookieConsentProvider, useCookieConsent } from '../../contexts/CookieConsentContext';

// Achado (auditoria): ReactGA.initialize() (o único ponto que de fato carrega o script do
// GA e passa a gravar cookies) rodava incondicionalmente para todo visitante. Este teste
// prova que agora só roda depois de consent === 'accepted'.
const initializeMock = vi.fn();
const sendMock = vi.fn();
const setMock = vi.fn();
vi.mock('react-ga4', () => ({
  default: {
    initialize: (...args: unknown[]) => initializeMock(...args),
    send: (...args: unknown[]) => sendMock(...args),
    set: (...args: unknown[]) => setMock(...args),
  },
}));

const STORAGE_KEY = 'xproducoes_cookie_consent';

const Probe: React.FC = () => {
  useGoogleAnalytics();
  const { accept } = useCookieConsent();
  return <button onClick={accept}>aceitar-no-teste</button>;
};

const renderProbe = (path = '/') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <CookieConsentProvider>
        <Probe />
      </CookieConsentProvider>
    </MemoryRouter>
  );

describe('useGoogleAnalytics - gate de consentimento', () => {
  beforeEach(() => {
    window.localStorage.clear();
    initializeMock.mockClear();
    vi.stubEnv('VITE_GOOGLE_ANALYTICS_ID', 'G-TEST123');
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it('não chama ReactGA.initialize() sem consentimento, mesmo após o delay', () => {
    renderProbe();

    vi.advanceTimersByTime(5000);

    expect(initializeMock).not.toHaveBeenCalled();
  });

  it('não chama ReactGA.initialize() quando o consentimento foi recusado', () => {
    window.localStorage.setItem(STORAGE_KEY, 'declined');
    renderProbe();

    vi.advanceTimersByTime(5000);

    expect(initializeMock).not.toHaveBeenCalled();
  });

  it('chama ReactGA.initialize() quando o consentimento já estava aceito', () => {
    window.localStorage.setItem(STORAGE_KEY, 'accepted');
    renderProbe();

    vi.advanceTimersByTime(5000);

    expect(initializeMock).toHaveBeenCalledWith('G-TEST123', expect.anything());
  });
});

describe('useGoogleAnalytics - URL enviada ao GA', () => {
  // Achado (revisão antes do deploy): o page_view levava location.pathname + location.search e o
  // `config` do GA4 ainda mandava sozinho outro page_view com a URL completa, então o token e o
  // e-mail dos links de e-mail (redefinir senha, verificar e-mail, convite) iam para o GA.
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem(STORAGE_KEY, 'accepted');
    initializeMock.mockClear();
    sendMock.mockClear();
    setMock.mockClear();
    vi.stubEnv('VITE_GOOGLE_ANALYTICS_ID', 'G-TEST123');
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  // O initialize roda no setTimeout de 3 s e o page_view sai no re-render seguinte (daí o act).
  const renderAndInitialize = (path: string) => {
    renderProbe(path);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
  };

  it('não manda o token nem o e-mail da query string ao GA', () => {
    renderAndInitialize('/cadastro-convite?token=abc123&email=fulano%40exemplo.com');

    const pageLocation = `${window.location.origin}/cadastro-convite`;
    expect(sendMock).toHaveBeenCalledWith({
      hitType: 'pageview',
      page: '/cadastro-convite',
      location: pageLocation,
    });
    expect(setMock).toHaveBeenCalledWith({ page_location: pageLocation });
    // Sem o page_view automático do `config`, que usaria a URL completa da barra.
    expect(initializeMock).toHaveBeenCalledWith('G-TEST123', { gtagOptions: { send_page_view: false } });

    const sentToGa = JSON.stringify([initializeMock.mock.calls, setMock.mock.calls, sendMock.mock.calls]);
    expect(sentToGa).not.toContain('abc123');
    expect(sentToGa).not.toContain('fulano');
  });

  it('mantém só os parâmetros de campanha (utm_*), que o GA4 usa para atribuir a visita', () => {
    renderAndInitialize('/redefinir-senha?utm_source=email&token=abc123');

    expect(sendMock).toHaveBeenCalledWith({
      hitType: 'pageview',
      page: '/redefinir-senha?utm_source=email',
      location: `${window.location.origin}/redefinir-senha?utm_source=email`,
    });
  });
});
