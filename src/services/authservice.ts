import { getApiBaseUrl } from '../utils/apiConfig';
import { logDebug } from '../utils/logger';

/**
 * ✅ CENTRALIZED AUTH SERVICE
 * Handles token refresh, session persistence, and logout events
 * to prevent race conditions and redundant logic.
 */

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
          this.logout();
          return null;
        }

        throw new Error(`Refresh API returned ${response.status}`);
      }

      const data = await response.json();
      const accessToken = data.accessToken;

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
    logDebug('AuthService: Executing global logout');

    // Notify application
    window.dispatchEvent(new Event('auth:logout'));
    
    // Hard redirect if not on login page
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
  }
}

export const authService = AuthService.getInstance();
export default authService;
