import { useEffect } from 'react';
import { logger } from '../../utils/logger';

// Page opened by backend redirect with fragment #token=...
// ✅ REFACTORED: No longer storing token in localStorage
// Token lives in httpOnly cookie sent by backend
export default function OAuthComplete() {
  useEffect(() => {
    try {
      const hash = window.location.hash.replace(/^#/, '');
      const params = new URLSearchParams(hash);
      const token = params.get('token');
      
      if (token && window.opener && typeof window.opener.postMessage === 'function') {
        // POST token to opener only for client-side notification
        // Token is NOT stored - it's in the cookie
        window.opener.postMessage({ type: 'oauth_complete', token }, window.location.origin);
        window.close();
      } else if (!token && window.opener) {
        // No token, just notify parent to check auth via API
        window.opener.postMessage({ type: 'oauth_complete', token: null }, window.location.origin);
        window.close();
      } else {
        // No opener (shouldn't happen), navigate to dashboard
        // AuthContext will check if user is authenticated
        window.location.href = '/dashboard';
      }
    } catch (e) {
      logger.error('[OAuthComplete] Error:', 'OAuthComplete', e);
      window.close();
    }
  }, []);

  return <div>Processando autenticação...</div>;
}
