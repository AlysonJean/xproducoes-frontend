import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { useRef } from 'react';
import CookieConsentBanner from '../CookieConsentBanner';
import PWAInstallBanner from '../PWAInstallBanner';
import { CookieConsentProvider } from '../../contexts/CookieConsentContext';
import { useEspacoFaixaFixa } from '../../hooks/useEspacoFaixaFixa';

// 20/11/2026: as faixas fixas no pé da tela (cookies e "Instale o app") cobriam o rodapé no fim da página, com o
// selo "Desenvolvido por X Soluções Digitais". Enquanto uma faixa aparece, o body ganha embaixo o espaço da altura
// dela (hooks/useEspacoFaixaFixa.ts); quando ela some, o espaço sai.

// O jsdom não calcula layout: a altura de cada faixa vem daqui, pelo aria-label (ou data-altura nos testes do hook).
const alturaPorRotulo: Record<string, number> = { 'Consentimento de cookies': 96, 'Instalar aplicativo': 132.4 };
let observadores: Array<() => void> = [];
class ResizeObserverFalso {
  private readonly aviso: () => void;
  constructor(aviso: ResizeObserverCallback) {
    this.aviso = () => aviso([], this as unknown as ResizeObserver);
  }
  observe() {
    observadores.push(this.aviso);
  }
  unobserve() {}
  disconnect() {
    observadores = observadores.filter((aviso) => aviso !== this.aviso);
  }
}

const espaco = () => document.body.style.paddingBottom;

beforeEach(() => {
  window.localStorage.clear();
  observadores = [];
  vi.stubGlobal('ResizeObserver', ResizeObserverFalso);
  // jsdom não tem matchMedia; o PWAInstallBanner pergunta se o app já está instalado.
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} }));
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    const altura = Number(this.dataset.altura ?? alturaPorRotulo[this.getAttribute('aria-label') ?? ''] ?? 0);
    return { height: altura, width: 0, top: 0, left: 0, right: 0, bottom: altura, x: 0, y: 0, toJSON() {} } as DOMRect;
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  document.body.style.paddingBottom = '';
});

const renderFaixas = () =>
  render(
    <MemoryRouter>
      <CookieConsentProvider>
        <PWAInstallBanner />
        <CookieConsentBanner />
      </CookieConsentProvider>
    </MemoryRouter>
  );

describe('faixas fixas no pé da tela: espaço para não cobrir o rodapé', () => {
  it('aviso de cookies: a página ganha embaixo a altura da faixa, e o espaço sai quando a pessoa responde', async () => {
    const user = userEvent.setup();
    renderFaixas();

    expect(screen.getByRole('dialog', { name: /consentimento de cookies/i })).toBeInTheDocument();
    expect(espaco()).toBe('96px');

    await user.click(screen.getByRole('button', { name: /recusar/i }));

    expect(screen.queryByRole('dialog', { name: /consentimento de cookies/i })).not.toBeInTheDocument();
    expect(espaco()).toBe('');
  });

  it('"Instale o app": espaço da altura da faixa (arredondada para cima), acompanha a mudança de altura e sai ao fechar', async () => {
    window.localStorage.setItem('xproducoes_cookie_consent', 'declined');
    const user = userEvent.setup();
    renderFaixas();
    expect(espaco()).toBe('');

    act(() => {
      window.dispatchEvent(new Event('beforeinstallprompt'));
    });
    const faixa = screen.getByRole('dialog', { name: /instalar aplicativo/i });
    expect(espaco()).toBe('133px');

    // A tela estreitou e os botões desceram para a linha de baixo.
    faixa.dataset.altura = '180';
    act(() => observadores.forEach((aviso) => aviso()));
    expect(espaco()).toBe('180px');

    await user.click(screen.getByRole('button', { name: /fechar/i }));

    expect(screen.queryByRole('dialog', { name: /instalar aplicativo/i })).not.toBeInTheDocument();
    expect(espaco()).toBe('');
  });
});

function FaixaDeTeste({ altura, ativa = true }: { altura: number; ativa?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEspacoFaixaFixa(ref, ativa);
  return <div ref={ref} data-altura={altura} />;
}

describe('useEspacoFaixaFixa', () => {
  it('duas faixas ao mesmo tempo: vale a maior; quando uma some, fica a da outra; sem nenhuma, sem espaço', () => {
    const maior = render(<FaixaDeTeste altura={150} />);
    const menor = render(<FaixaDeTeste altura={90} />);
    expect(espaco()).toBe('150px');

    maior.unmount();
    expect(espaco()).toBe('90px');

    menor.unmount();
    expect(espaco()).toBe('');
  });

  it('faixa escondida não reserva espaço; ao aparecer, reserva', () => {
    const { rerender } = render(<FaixaDeTeste altura={80} ativa={false} />);
    expect(espaco()).toBe('');

    rerender(<FaixaDeTeste altura={80} />);
    expect(espaco()).toBe('80px');

    rerender(<FaixaDeTeste altura={80} ativa={false} />);
    expect(espaco()).toBe('');
  });

  it('navegador sem ResizeObserver: mede a faixa ao aparecer, sem quebrar', () => {
    vi.stubGlobal('ResizeObserver', undefined);
    const { unmount } = render(<FaixaDeTeste altura={70} />);
    expect(espaco()).toBe('70px');

    unmount();
    expect(espaco()).toBe('');
  });
});
