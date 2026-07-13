import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import CookieConsentBanner from '../CookieConsentBanner';
import { CookieConsentProvider } from '../../contexts/CookieConsentContext';

// Achado (auditoria): o site inicializava Google Analytics para todo visitante sem
// nenhum consentimento prévio (ver useGoogleAnalytics.ts). Este teste prova o mecanismo
// de consentimento real introduzido: o banner aparece por padrão, some ao decidir, e a
// decisão persiste em localStorage (para useGoogleAnalytics ler e não pedir de novo).
const STORAGE_KEY = 'xproducoes_cookie_consent';

const renderBanner = () =>
  render(
    <MemoryRouter>
      <CookieConsentProvider>
        <CookieConsentBanner />
      </CookieConsentProvider>
    </MemoryRouter>
  );

describe('CookieConsentBanner', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('aparece por padrão quando não há decisão salva', () => {
    renderBanner();
    expect(screen.getByRole('dialog', { name: /consentimento de cookies/i })).toBeInTheDocument();
  });

  it('some e salva "accepted" ao clicar em Aceitar', async () => {
    const user = userEvent.setup();
    renderBanner();

    await user.click(screen.getByRole('button', { name: /aceitar/i }));

    expect(screen.queryByRole('dialog', { name: /consentimento de cookies/i })).not.toBeInTheDocument();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('accepted');
  });

  it('some e salva "declined" ao clicar em Recusar', async () => {
    const user = userEvent.setup();
    renderBanner();

    await user.click(screen.getByRole('button', { name: /recusar/i }));

    expect(screen.queryByRole('dialog', { name: /consentimento de cookies/i })).not.toBeInTheDocument();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('declined');
  });

  it('não aparece quando já existe uma decisão salva', () => {
    window.localStorage.setItem(STORAGE_KEY, 'accepted');
    renderBanner();

    expect(screen.queryByRole('dialog', { name: /consentimento de cookies/i })).not.toBeInTheDocument();
  });
});
