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
  private refreshSubscribers: ((token: string) => void)[] = [];

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

    const refreshToken = secureStorage.get('refreshToken');
    if (!refreshToken) {
      logDebug('No refresh token found in storage');
      return null;
    }

    this.isRefreshing = true;
    const API_BASE_URL = getApiBaseUrl();

    try {
      logDebug('Attempting token refresh...', { url: `${API_BASE_URL}/auth/refresh` });
      
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        throw new Error(`Refresh API returned ${response.status}`);
      }

      const data = await response.json();
      const accessToken = data.accessToken;
      
      // Update secure storage
      secureStorage.set('accessToken', accessToken);
      if (data.refreshToken) {
        secureStorage.set('refreshToken', data.refreshToken);
      }
      secureStorage.set('tokenExpiresAt', (Date.now() + 15 * 60 * 1000).toString());

      logDebug('Token refreshed successfully');
      
      // Notify subscribers and update state
      window.dispatchEvent(new CustomEvent('auth:refreshed', { detail: { accessToken } }));
      this.onRefreshed(accessToken);
      
      return accessToken;
    } catch (error) {
      logDebug('Critical error during token refresh', { error });
      this.logout();
      return null;
    } finally {
      this.isRefreshing = false;
    }
  }

  private onRefreshed(token: string) {
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
