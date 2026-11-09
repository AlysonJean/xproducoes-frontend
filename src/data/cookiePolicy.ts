// D7 (aprovada em 02/11/2026), parte do texto: "O banner e a página /cookies passam a dizer que o Google pode tratar
// dados fora do Brasil." D8c (aprovada em 02/11/2026), parte 4: a página /cookies passa a listar os cookies e o que o
// site guarda no navegador, conferidos no código em 09/11/2026 (antes ela só dizia "login, carrinho, proteção contra
// CSRF" e "Google Analytics", sem nomes nem prazos).
// Uma fonte só para o aviso de cookies, a página /cookies e a Política de Privacidade (src/data/privacyPolicy.ts): a
// frase da transferência é a mesma nos três lugares. Arquivo pequeno de propósito: o aviso de cookies aparece em toda
// página e importa só a frase daqui.

/**
 * LGPD, art. 33, VIII: a transferência para fora do Brasil com base no consentimento exige consentimento específico e
 * em destaque, com aviso prévio de que a operação é internacional. O aviso de cookies mostra esta frase em negrito
 * antes do "Aceitar".
 */
export const GOOGLE_ANALYTICS_TRANSFER_NOTICE =
  'O Google pode tratar os dados do Google Analytics fora do Brasil, inclusive nos Estados Unidos.';

export interface BrowserDataEntry {
  name: string;
  purpose: string;
  duration: string;
}

// Gravados pelo servidor: backend src/config/cookies.ts (COOKIE_NAMES e as durações de accessTokenCookieOptions,
// refreshTokenCookieOptions e sessionHintCookieOptions) e src/middlewares/csrfMiddleware.ts (CSRF_COOKIE_NAME, 1 hora
// renovada a cada requisição). Mudou lá, muda aqui.
export const ESSENTIAL_COOKIES: readonly BrowserDataEntry[] = [
  {
    name: 'x_access_token',
    purpose: 'Mantém você conectado à sua conta. Só o servidor consegue ler.',
    duration: '15 minutos',
  },
  {
    name: 'x_refresh_token',
    purpose: 'Renova o acesso sem pedir a senha de novo. Só o servidor consegue ler.',
    duration: 'Até 7 dias',
  },
  {
    name: 'x_session',
    purpose: 'Avisa o site de que existe uma sessão aberta. Não guarda nenhum dado seu.',
    duration: 'Até 7 dias',
  },
  {
    name: 'X-CSRF-Token',
    purpose: 'Protege os formulários contra envios forjados por outros sites.',
    duration: '1 hora, renovada a cada uso',
  },
];

// Gravados pelo Google Analytics (react-ga4, hooks/useGoogleAnalytics.ts) só depois do "Aceitar". O site não muda a
// validade padrão do Google: 2 anos, renovados a cada visita (cookie_update do gtag), por isso "depois da última visita".
const GA_COOKIE_DURATION = 'Até 2 anos depois da última visita';

export const ANALYTICS_COOKIES: readonly BrowserDataEntry[] = [
  {
    name: '_ga',
    purpose: 'Distingue um visitante de outro, sem o seu nome ou e-mail.',
    duration: GA_COOKIE_DURATION,
  },
  {
    name: '_ga_<código do site>',
    purpose: 'Guarda a visita em andamento.',
    duration: GA_COOKIE_DURATION,
  },
];

const UNTIL_CLEARED = 'Até você limpar os dados do site no navegador';
const UNTIL_TAB_CLOSED = 'Até você fechar a aba';

// localStorage e sessionStorage usados pelo site público e pela área do cliente (as chaves do painel da equipe ficam
// numa frase à parte na página). Cada nome vem de uma constante do código: CookieConsentContext.tsx (STORAGE_KEY),
// ThemeContext.tsx ('theme'), CartContext.tsx (GUEST_CART_KEY), FavoritesContext.tsx (STORAGE_KEY),
// CompareContext.tsx (COMPARE_STORAGE_KEY), pages/client/BriefingPage.tsx (DRAFT_KEY, via hooks/useFormDraft.ts),
// PWAInstallBanner.tsx (DISMISS_KEY), hooks/useAppSettings.ts ('companyName'), hooks/usePerformanceMonitoring.ts
// ('lastPerformanceMetrics'), utils/sessionHint.ts (TRIED_KEY) e components/ui/ErrorBoundary.tsx (RELOAD_GUARD_KEY).
// O teste da página confere as que não dependem de outro item do lote.
export const BROWSER_STORAGE: readonly BrowserDataEntry[] = [
  {
    name: 'xproducoes_cookie_consent',
    purpose: 'Sua escolha sobre os cookies de análise.',
    duration: 'Até você mudar a escolha',
  },
  { name: 'theme', purpose: 'Tema claro ou escuro.', duration: UNTIL_CLEARED },
  {
    name: 'xp_guest_cart_v1',
    purpose: 'Carrinho de quem ainda não entrou na conta.',
    duration: 'Até você enviar o pedido, entrar na conta ou esvaziar o carrinho',
  },
  { name: 'xproducoes-favorites', purpose: 'Itens que você marcou como favoritos.', duration: UNTIL_CLEARED },
  { name: 'xproducoes-compare', purpose: 'Itens que você escolheu para comparar.', duration: UNTIL_CLEARED },
  {
    name: 'briefing-draft',
    purpose: 'Rascunho do formulário de orçamento, com o que você já preencheu.',
    duration: 'Até você enviar o pedido; um rascunho com mais de 7 dias é descartado',
  },
  {
    name: 'xp-pwa-install-dismissed-at',
    purpose: 'Quando você fechou o aviso de instalar o site como aplicativo.',
    duration: UNTIL_CLEARED,
  },
  { name: 'companyName', purpose: 'Nome da empresa mostrado no site.', duration: UNTIL_CLEARED },
  {
    name: 'lastPerformanceMetrics',
    purpose: 'Tempo de carregamento da última página aberta. Fica só no seu aparelho.',
    duration: UNTIL_CLEARED,
  },
  {
    name: 'xp_session_restore_tried',
    purpose: 'Evita tentar reabrir a sessão mais de uma vez.',
    duration: UNTIL_TAB_CLOSED,
  },
  {
    name: 'xp-chunk-reload-attempted',
    purpose: 'Evita recarregar a página sem parar depois de uma atualização do site.',
    duration: UNTIL_TAB_CLOSED,
  },
];
