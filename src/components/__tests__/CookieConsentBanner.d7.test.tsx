import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import CookieConsentBanner from '../CookieConsentBanner';
import { CookieConsentProvider } from '../../contexts/CookieConsentContext';

// D7 (aprovada em 02/11/2026): "O banner e a página /cookies passam a dizer que o Google pode tratar dados fora do
// Brasil." LGPD, art. 33, VIII: o consentimento para a transferência tem de ser específico e em destaque, com o aviso
// antes do "Aceitar". Antes o aviso de cookies não falava da transferência. A troca é só de texto: os botões e os
// handlers continuam os mesmos (os testes do mecanismo seguem em CookieConsentBanner.test.tsx, sem mudança).

// Para o teste dos handlers: o aviso lê o contexto por useCookieConsent; com `override.value` preenchido, ele recebe
// accept/decline espiões. Nos outros testes o contexto é o de verdade (override.value = null).
const override = vi.hoisted(() => ({
  value: null as null | { consent: 'unset'; accept: () => void; decline: () => void; reset: () => void },
}));
vi.mock('../../contexts/CookieConsentContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../contexts/CookieConsentContext')>();
  return {
    ...actual,
    useCookieConsent: () => {
      const real = actual.useCookieConsent();
      return override.value ?? real;
    },
  };
});

const renderBanner = () =>
  render(
    <MemoryRouter>
      <CookieConsentProvider>
        <CookieConsentBanner />
      </CookieConsentProvider>
    </MemoryRouter>
  );

describe('CookieConsentBanner — transferência para fora do Brasil (D7)', () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => {
    override.value = null;
  });

  it('diz em destaque, antes dos botões, que o Google pode tratar os dados fora do Brasil, e liga para /cookies', () => {
    renderBanner();
    const dialog = screen.getByRole('dialog', { name: /consentimento de cookies/i });
    const notice = screen.getByText(
      'O Google pode tratar os dados do Google Analytics fora do Brasil, inclusive nos Estados Unidos.'
    );
    expect(dialog).toContainElement(notice);
    expect(notice.tagName).toBe('STRONG');
    const accept = screen.getByRole('button', { name: 'Aceitar' });
    expect(notice.compareDocumentPosition(accept) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Política de Cookies' })).toHaveAttribute('href', '/cookies');
  });

  it('os botões continuam chamando os mesmos handlers do contexto (Recusar → decline, Aceitar → accept)', async () => {
    const accept = vi.fn();
    const decline = vi.fn();
    override.value = { consent: 'unset', accept, decline, reset: vi.fn() };
    const user = userEvent.setup();
    renderBanner();

    await user.click(screen.getByRole('button', { name: 'Recusar' }));
    expect(decline).toHaveBeenCalledTimes(1);
    expect(accept).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Aceitar' }));
    expect(accept).toHaveBeenCalledTimes(1);
    expect(decline).toHaveBeenCalledTimes(1);
  });
});
