import { getApiBaseUrl } from '../utils/apiConfig';
import { logDebug } from '../utils/logger';
import { shouldTrySessionRestore, markSessionRestoreTried } from '../utils/sessionHint';

/**
 * ✅ CENTRALIZED AUTH SERVICE
 * Handles token refresh, session persistence, and logout events
 * to prevent race conditions and redundant logic.
 */

// Decisão de Alyson (12/11/2026, "faça no padrão dos grandes aplicativos"): a sessão tem prazo máximo (30
// dias para cliente, 7 para a equipe). Quando a renovação é recusada (prazo vencido, código
// SESSION_EXPIRED_ABSOLUTE, ou sessão encerrada), a pessoa vai para o login e vê uma vez o motivo. O "Sair"
// normal não mostra o aviso.
const SESSION_EXPIRED_KEY = 'xp_session_expired';
export const SESSION_EXPIRED_MESSAGE = 'Sua sessão expirou por segurança. Entre de novo.';
// A renovação recusada pediu, nesta página, o carregamento de /login (endSession).
let expiredRedirectPending = false;

/** Lê e apaga o aviso de sessão expirada: aparece uma vez só, na página de login que abre depois da recusa. */
export function consumeSessionExpiredNotice(): boolean {
  try {
    const marked = sessionStorage.getItem(SESSION_EXPIRED_KEY) === '1';
    // Achado (revisão): no painel, o evento auth:logout leva à tela de login pelo próprio site um instante antes de
    // chegar a página nova de /login. Apagado nessa tela de passagem, o aviso sumia no carregamento. Ela mostra o
    // aviso e o deixa para a página nova, que o apaga.
    if (marked && !expiredRedirectPending) sessionStorage.removeItem(SESSION_EXPIRED_KEY);
    return marked;
  } catch {
    return false; // sem sessionStorage (modo privado restrito): sem aviso
  }
}

class AuthService {
  private static instance: AuthService;
  private isRefreshing = false;
  private refreshSubscribers: ((token: string | null) => void)[] = [];

  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Refreshes the access token if needed.
   * Handles multiple simultaneous requests by queuing them.
   */
  public async refreshToken(): Promise<string | null> {
    // Sem o sinal de sessão (cookie x_session) não há refresh token para renovar.
    if (!shouldTrySessionRestore()) {
      logDebug('No session hint - skipping token refresh');
      return null;
    }
    markSessionRestoreTried();

    if (this.isRefreshing) {
      logDebug('Token refresh already in progress, queuing request');
      return new Promise((resolve) => {
        this.refreshSubscribers.push((token) => resolve(token));
      });
    }

    this.isRefreshing = true;
    const API_BASE_URL = getApiBaseUrl();

    try {
      logDebug('Attempting token refresh...', { url: `${API_BASE_URL}/auth/refresh` });

      // Autenticação via cookie httpOnly (credentials: 'include' já envia
      // x_refresh_token automaticamente) — não há refresh token em JS para enviar no body.
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          logDebug('Refresh token rejected by API', { status: response.status });
          this.notifyRefreshSubscribers(null);
          this.endSession(true);
          return null;
        }

        throw new Error(`Refresh API returned ${response.status}`);
      }

      // Backend responde { success, data: { accessToken, ... } } — ver
      // backend/src/controllers/authController.ts#refresh (linha ~593).
      const data = await response.json();
      const accessToken = data?.data?.accessToken;

      if (!accessToken) {
        throw new Error('Refresh API did not return access token');
      }

      // Os novos tokens já foram gravados como cookies httpOnly pelo backend
      // (Set-Cookie na resposta) — nada para persistir aqui no cliente.
      logDebug('Token refreshed successfully');
      
      // Notify subscribers and update state
      window.dispatchEvent(new CustomEvent('auth:refreshed', { detail: { accessToken } }));
      this.notifyRefreshSubscribers(accessToken);
      
      return accessToken;
    } catch (error) {
      logDebug('Critical error during token refresh', { error });
      // Em falhas transitórias (rede/cold start), não derrubar sessão imediatamente.
      this.notifyRefreshSubscribers(null);
      return null;
    } finally {
      this.isRefreshing = false;
    }
  }

  private notifyRefreshSubscribers(token: string | null) {
    this.refreshSubscribers.map((callback) => callback(token));
    this.refreshSubscribers = [];
  }

  /**
   * Clears all session data and redirects to login
   */
  public logout() {
    this.endSession(false);
  }

  // expired: a renovação foi recusada; a tela de login mostra o aviso uma vez. O "Sair" normal apaga um
  // aviso que tenha ficado (ex.: a renovação recusada durante o próprio "Sair").
  private endSession(expired: boolean) {
    logDebug('AuthService: Executing global logout');
    // Sessão encerrada: a próxima página não precisa perguntar ao servidor.
    markSessionRestoreTried();
    try {
      if (expired) sessionStorage.setItem(SESSION_EXPIRED_KEY, '1');
      else sessionStorage.removeItem(SESSION_EXPIRED_KEY);
    } catch {
      // sem sessionStorage: sem aviso
    }

    // Notify application
    window.dispatchEvent(new Event('auth:logout'));
    
    // Hard redirect if not on login page
    if (!window.location.pathname.includes('/login')) {
      expiredRedirectPending = expired;
      window.location.href = '/login';
    }
  }
}

export const authService = AuthService.getInstance();
export default authService;
