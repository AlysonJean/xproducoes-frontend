import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useGoogleAnalytics } from '../useGoogleAnalytics';
import { CookieConsentProvider, useCookieConsent } from '../../contexts/CookieConsentContext';

// Achado (auditoria): ReactGA.initialize() (o único ponto que de fato carrega o script do
// GA e passa a gravar cookies) rodava incondicionalmente para todo visitante. Este teste
// prova que agora só roda depois de consent === 'accepted'.
const initializeMock = vi.fn();
vi.mock('react-ga4', () => ({
  default: {
    initialize: (...args: unknown[]) => initializeMock(...args),
    send: vi.fn(),
  },
}));

const STORAGE_KEY = 'xproducoes_cookie_consent';

const Probe: React.FC = () => {
  useGoogleAnalytics();
  const { accept } = useCookieConsent();
  return <button onClick={accept}>aceitar-no-teste</button>;
};

const renderProbe = () =>
  render(
    <MemoryRouter>
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

    expect(initializeMock).toHaveBeenCalledWith('G-TEST123');
  });
});
