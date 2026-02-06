import { useEffect } from 'react';

// Page opened by backend redirect with fragment #token=...
export default function OAuthComplete() {
  useEffect(() => {
    try {
      const hash = window.location.hash.replace(/^#/, '');
      const params = new URLSearchParams(hash);
      const token = params.get('token');
      if (token && window.opener && typeof window.opener.postMessage === 'function') {
        window.opener.postMessage({ type: 'oauth_token', token }, window.location.origin);
        window.close();
      } else if (token) {
        // fallback: save to localStorage and navigate
        localStorage.setItem('authToken', token);
        window.location.href = '/dashboard';
      } else {
        window.close();
      }
    } catch (e) {
      window.close();
    }
  }, []);

  return <div>Processando autenticação...</div>;
}
