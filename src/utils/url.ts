// utilidades de validação e abertura segura de URLs usadas no frontend
export const isIPv4 = (host: string) => /^\d+\.\d+\.\d+\.\d+$/.test(host);
export const isPrivateIPv4 = (ip: string) => {
  const parts = ip.split('.').map((p) => Number(p));
  if (parts.length !== 4 || parts.some(isNaN)) return false;
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
};

export const isSafeWebsite = (url?: string | null) => {
  if (!url) return false;
  if (url.length > 2083) return false;

  try {
    const u = new URL(url);
    if (u.protocol !== 'https:') return false;
  if (u.username || u.password) return false; // rejeitar userinfo@host
    const host = u.hostname;
    if (!host || host === 'localhost') return false;
    if (!/^[a-zA-Z0-9.-]+$/.test(host)) return false;
    if (host.includes(':')) return false;
    if (isIPv4(host)) return false;
    if (isPrivateIPv4(host)) return false;
    return true;
  } catch (e) {
    return false;
  }
};

export const openWebsite = (url?: string | null) => {
  if (!url) return;
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:') return;
    if (u.username || u.password) return;
    if (u.hostname.includes(':')) return;
    if (isIPv4(u.hostname) || isPrivateIPv4(u.hostname)) return;

    const path = encodeURI(`${u.pathname || ''}${u.search || ''}${u.hash || ''}`);
    const safe = `${u.protocol}//${u.hostname}${path}`;
    try {
      window.open(safe, '_blank', 'noopener,noreferrer');
    } catch (err) {
      return;
    }
  } catch (e) {
    return;
  }
};

export default {
  isSafeWebsite,
  openWebsite
};
