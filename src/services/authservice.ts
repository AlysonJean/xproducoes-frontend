import { secureStorage } from '../utils/secureStorage';
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
    const refreshToken = secureStorage.get('refreshToken');

    try {
      logDebug('Attempting token refresh...', { url: `${API_BASE_URL}/auth/refresh` });
      
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        // Cookie-first: mantém compatibilidade com instalações legadas que ainda usam body.
        body: JSON.stringify(refreshToken ? { refreshToken } : {}),
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
      
      // Update secure storage
      secureStorage.set('accessToken', accessToken);
      if (data.refreshToken) {
        secureStorage.set('refreshToken', data.refreshToken);
      }
      secureStorage.set('tokenExpiresAt', (Date.now() + 15 * 60 * 1000).toString());

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
    secureStorage.remove('accessToken');
    secureStorage.remove('refreshToken');
    secureStorage.remove('tokenExpiresAt');
    
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
