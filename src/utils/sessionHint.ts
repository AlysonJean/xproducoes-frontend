// Sinal de sessão: cookie x_session, que o backend grava junto com os cookies httpOnly de login
// (setAuthCookies) e apaga no logout. Não é credencial — só diz "existe sessão". Sem ele não há
// o que restaurar: pular a tentativa evita GET /auth/profile 401 + POST /auth/refresh 400 a cada
// página aberta por visitante sem login (log poluído e requisições a mais pelo proxy da Vercel).
// Sessões abertas antes do sinal existir ganham uma tentativa por aba (sessionStorage); a
// renovação bem-sucedida já grava o sinal.
const HINT_COOKIE = 'x_session';
const TRIED_KEY = 'xp_session_restore_tried';

export function hasSessionHint(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie.split(';').some((c) => c.trim().startsWith(`${HINT_COOKIE}=`));
}

export function shouldTrySessionRestore(): boolean {
  if (hasSessionHint()) return true;
  try {
    return sessionStorage.getItem(TRIED_KEY) !== '1';
  } catch {
    return true; // sem sessionStorage (modo privado restrito): comportamento antigo
  }
}

export function markSessionRestoreTried(): void {
  if (hasSessionHint()) return;
  try {
    sessionStorage.setItem(TRIED_KEY, '1');
  } catch {
    // sem sessionStorage: nada a marcar
  }
}
