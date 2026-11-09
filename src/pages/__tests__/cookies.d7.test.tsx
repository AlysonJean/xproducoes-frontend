import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen, cleanup, within, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { axe, toHaveNoViolations } from 'jest-axe';
import { CookiesPage } from '../CookiesPage';
import { CookieConsentProvider } from '../../contexts/CookieConsentContext';

// D7 (aprovada em 02/11/2026): "O banner e a página /cookies passam a dizer que o Google pode tratar dados fora do
// Brasil." D8c (aprovada em 02/11/2026), parte 4: a página /cookies lista os cookies de verdade. Antes ela só dizia
// "login, carrinho, proteção contra CSRF" e "Google Analytics", sem nomes, prazos nem a transferência. Os nomes abaixo
// estão escritos à mão de propósito (backend src/config/cookies.ts COOKIE_NAMES, csrfMiddleware.ts CSRF_COOKIE_NAME e
// as constantes do site lidas no último teste), para o teste não repetir o arquivo de dados.

expect.extend(toHaveNoViolations);

const norm = (text: string) => text.replace(/\s+/g, ' ').trim();
const CONSENT_ITEM = 'xproducoes_cookie_consent';

function renderPage() {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={['/cookies']}>
        <CookieConsentProvider>
          <CookiesPage />
        </CookieConsentProvider>
      </MemoryRouter>
    </HelmetProvider>
  );
}

const namesIn = (tableName: string) =>
  within(screen.getByRole('table', { name: tableName }))
    .getAllByRole('rowheader')
    .map((th) => norm(th.textContent ?? ''));

beforeEach(() => window.localStorage.clear());
afterEach(() => cleanup());

describe('D7 e D8c — Política de Cookies', () => {
  it('lista os cookies do servidor com nome, para quê e prazo', () => {
    renderPage();
    expect(namesIn('Cookies necessários')).toEqual(['x_access_token', 'x_refresh_token', 'x_session', 'X-CSRF-Token']);
    const table = screen.getByRole('table', { name: 'Cookies necessários' });
    expect(within(table).getAllByRole('columnheader').map((th) => th.textContent)).toEqual(['Nome', 'Para quê', 'Por quanto tempo']);
    // Revisão: o prazo conferido linha a linha (antes, "Até 7 dias" do x_session escondia um prazo errado do
    // x_refresh_token). Backend config/cookies.ts: 15 min, 7 dias, 7 dias; csrfMiddleware.ts: 1 hora renovada.
    const durationOf = (name: string) => {
      const row = within(table).getByRole('rowheader', { name }).closest('tr') as HTMLElement;
      const cells = within(row).getAllByRole('cell');
      return norm(cells[cells.length - 1].textContent ?? '');
    };
    expect(durationOf('x_access_token')).toBe('15 minutos');
    expect(durationOf('x_refresh_token')).toBe('Até 7 dias');
    expect(durationOf('x_session')).toBe('Até 7 dias');
    expect(durationOf('X-CSRF-Token')).toBe('1 hora, renovada a cada uso');
  });

  it('os cookies do Google Analytics só depois do aceite, com a frase em destaque da transferência (art. 33, VIII)', () => {
    renderPage();
    expect(namesIn('Cookies de análise')).toEqual(['_ga', '_ga_<código do site>']);
    // Revisão: o gtag renova a validade a cada visita (cookie_update padrão); não há teto de 2 anos.
    const gaTable = norm(screen.getByRole('table', { name: 'Cookies de análise' }).textContent ?? '');
    expect(gaTable.match(/Até 2 anos depois da última visita/g)).toHaveLength(2);
    const notice = screen.getByText(/O Google pode tratar os dados do Google Analytics fora do Brasil/);
    expect(norm(notice.textContent ?? '')).toBe(
      'O Google pode tratar os dados do Google Analytics fora do Brasil, inclusive nos Estados Unidos. Ao aceitar, você concorda com essa transferência (LGPD, art. 33, VIII).'
    );
    expect(notice.className).toContain('font-semibold');
    expect(norm(document.body.textContent ?? '')).toContain('só são gravados depois que você clica em "Aceitar" no aviso de cookies');
  });

  it('lista o que o site guarda no navegador (consentimento, tema, carrinho, favoritos, comparação, rascunho do orçamento)', () => {
    renderPage();
    const names = namesIn('Dados guardados no navegador');
    for (const key of [
      CONSENT_ITEM,
      'theme',
      'xp_guest_cart_v1',
      'xproducoes-favorites',
      'xproducoes-compare',
      'briefing-draft',
      'xp-pwa-install-dismissed-at',
      'companyName',
      'lastPerformanceMetrics',
      'xp_session_restore_tried',
      'xp-chunk-reload-attempted',
    ]) {
      expect(names).toContain(key);
    }
    expect(norm(document.body.textContent ?? '')).toContain('No painel da equipe, o site também guarda rascunhos dos formulários');
    // Revisão: o service worker é registrado para todo visitante (App.tsx, hooks/useServiceWorker.ts), não só na equipe.
    expect(norm(document.body.textContent ?? '')).toContain(
      'Em todas as páginas, para abrir mais rápido e funcionar com internet fraca, o site guarda ainda cópias dos próprios arquivos e das fontes de letra.'
    );
  });

  it('diz que o Vercel Analytics e o Sentry não usam cookies, e liga para a Política de Privacidade', () => {
    renderPage();
    const text = norm(document.body.textContent ?? '');
    expect(text).toContain('Vercel Analytics: conta as visitas às páginas, sem cookies.');
    expect(text).toContain('Sentry: recebe os relatórios de erro do site, sem cookies e sem o seu endereço IP.');
    expect(text).toContain('Google Fonts');
    expect(screen.getByRole('link', { name: 'Política de Privacidade' })).toHaveAttribute('href', '/privacidade');
  });

  it('"Gerenciar preferências" continua apagando a escolha salva (o aviso de cookies volta)', () => {
    window.localStorage.setItem(CONSENT_ITEM, 'accepted');
    renderPage();
    expect(screen.getByText('aceita')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Gerenciar preferências' }));
    expect(screen.getByText('ainda não definida')).toBeInTheDocument();
    expect(window.localStorage.getItem(CONSENT_ITEM)).toBeNull();
  });

  it('as chaves listadas são as que o código usa (o teste quebra se alguém trocar uma chave sem atualizar a página)', () => {
    renderPage();
    const names = namesIn('Dados guardados no navegador');
    const constantIn = (file: string, pattern: RegExp) => {
      const match = readFileSync(resolve(process.cwd(), file), 'utf-8').match(pattern);
      expect(match, `${file}: ${pattern}`).not.toBeNull();
      return match![1];
    };
    for (const [file, pattern] of [
      ['src/contexts/CartContext.tsx', /const GUEST_CART_KEY = '([^']+)'/],
      ['src/contexts/FavoritesContext.tsx', /const STORAGE_KEY = '([^']+)'/],
      ['src/contexts/CompareContext.tsx', /const COMPARE_STORAGE_KEY = '([^']+)'/],
      ['src/contexts/ThemeContext.tsx', /localStorage\.setItem\('([^']+)'/],
      ['src/pages/client/BriefingPage.tsx', /const DRAFT_KEY = '([^']+)'/],
      ['src/components/PWAInstallBanner.tsx', /const DISMISS_KEY = '([^']+)'/],
      ['src/utils/sessionHint.ts', /const TRIED_KEY = '([^']+)'/],
      ['src/components/ui/ErrorBoundary.tsx', /const RELOAD_GUARD_KEY = '([^']+)'/],
      ['src/hooks/usePerformanceMonitoring.ts', /localStorage\.setItem\('([^']+)'/],
    ] as const) {
      expect(names).toContain(constantIn(file, pattern));
    }
  });

  it('não tem violações de acessibilidade', async () => {
    const { container } = renderPage();
    expect(await axe(container)).toHaveNoViolations();
  });
});
