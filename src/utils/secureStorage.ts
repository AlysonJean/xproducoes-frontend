/**
 * 🔐 SECURE STORAGE - Session & Preferences ONLY
 * 
 * ⚠️ IMPORTANT: Tokens are NO LONGER stored here!
 * Tokens are managed via httpOnly cookies (secure, XSS-proof)
 * 
 * This utility is for non-sensitive data:
 * - UI preferences (theme, sidebar collapse, etc)
 * - Session hints (non-critical)
 * 
 * ✅ Architecture: Cookies (secure default) → Browser manages → Auto-sent in requests
 */

export const secureStorage = {
  set(key: string, value: string) {
    // Only store non-token data
    if (key.includes('Token') || key.includes('token') || key === 'accessToken' || key === 'refreshToken') {
      console.warn(`⚠️ [security] Attempted to store ${key} in localStorage. Tokens must use httpOnly cookies only.`);
      return;
    }
    localStorage.setItem(key, value);
  },
  get(key: string) {
    // Warn if trying to access tokens from storage
    if (key.includes('Token') || key.includes('token') || key === 'accessToken' || key === 'refreshToken') {
      if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
        console.warn(`⚠️ [security] Accessing ${key} from storage. Tokens are in httpOnly cookies.`);
      }
      return null;
    }
    return localStorage.getItem(key);
  },
  remove(key: string) {
    localStorage.removeItem(key);
  },
};
